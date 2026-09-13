import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createBalancedLeagueCalendar } from "@/lib/calendar-home-balance";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

export type GenerateLeagueCalendarResult = {
  generated: boolean;
  reason?: "NOT_LEAGUE" | "NOT_ENOUGH_TEAMS" | "ALREADY_GENERATED";
  roundsCreated?: number;
  matchesCreated?: number;
};

/**
 * Genera el calendario completo de una liga usando los participantes ya inscritos.
 * Es idempotente respecto a partidos existentes: si la competición ya tiene partidos,
 * no vuelve a generar nada.
 */
export async function generateLeagueCalendar(
  supabase: SupabaseAdmin,
  competitionId: string
): Promise<GenerateLeagueCalendarResult> {
  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .select("id,name,type,home_and_away")
    .eq("id", competitionId)
    .single();

  if (competitionError) throw competitionError;
  if (competition.type !== "LEAGUE") {
    return { generated: false, reason: "NOT_LEAGUE" };
  }

  const { data: teamRows, error: teamsError } = await supabase
    .from("competition_teams")
    .select("team_code,seed")
    .eq("competition_id", competitionId)
    .order("seed", { ascending: true });

  if (teamsError) throw teamsError;

  const teams = (teamRows ?? []).map((row) => String(row.team_code));
  if (teams.length < 2) {
    return { generated: false, reason: "NOT_ENOUGH_TEAMS" };
  }

  const { count, error: existingError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", competitionId);

  if (existingError) throw existingError;
  if ((count ?? 0) > 0) {
    return { generated: false, reason: "ALREADY_GENERATED" };
  }

  // Regla global de liga: máximo 2 jornadas consecutivas como local.
  // En ida y vuelta, la segunda vuelta se genera en orden inverso para
  // evitar una tercera localía consecutiva en el cambio de vuelta.
  const allRounds = createBalancedLeagueCalendar(
    teams,
    Boolean(competition.home_and_away)
  );

  const isSecondDivision = String(competition.name ?? "")
    .toLocaleLowerCase("es")
    .includes("segunda");

  const playoffRounds = isSecondDivision
    ? [
        { name: "Playoff de ascenso - semifinales", stage: "SEMIFINAL" },
        { name: "Playoff de ascenso - final", stage: "FINAL" },
      ]
    : [];

  const roundRows = [
    ...allRounds.map((_, roundIndex) => {
      const roundNumber = roundIndex + 1;
      return {
        competition_id: competitionId,
        number: roundNumber,
        name: `Jornada ${roundNumber}`,
        stage: "REGULAR",
      };
    }),
    ...playoffRounds.map((round, index) => ({
      competition_id: competitionId,
      number: allRounds.length + index + 1,
      name: round.name,
      stage: round.stage,
    })),
  ];

  const { data: createdRounds, error: roundsError } = await supabase
    .from("competition_rounds")
    .insert(roundRows)
    .select("id,number");

  if (roundsError) throw roundsError;

  const roundIdByNumber = new Map(
    (createdRounds ?? []).map((round) => [Number(round.number), String(round.id)])
  );

  const matchRows = allRounds.flatMap((fixtures, roundIndex) => {
    const roundNumber = roundIndex + 1;
    const roundId = roundIdByNumber.get(roundNumber);

    if (!roundId) {
      throw new Error(`No se pudo resolver la Jornada ${roundNumber}.`);
    }

    return fixtures.map(([home, away]) => ({
      competition_id: competitionId,
      round_id: roundId,
      home_team_code: home,
      away_team_code: away,
      status: "SCHEDULED",
    }));
  });

  if (isSecondDivision) {
    const semifinalRoundId = roundIdByNumber.get(allRounds.length + 1);
    const finalRoundId = roundIdByNumber.get(allRounds.length + 2);
    if (!semifinalRoundId || !finalRoundId) {
      throw new Error("No se pudo crear el playoff de ascenso dentro de Segunda División.");
    }

    matchRows.push(
      {
        competition_id: competitionId,
        round_id: semifinalRoundId,
        home_team_code: "3º Segunda División",
        away_team_code: "6º Segunda División",
        status: "SCHEDULED",
      },
      {
        competition_id: competitionId,
        round_id: semifinalRoundId,
        home_team_code: "4º Segunda División",
        away_team_code: "5º Segunda División",
        status: "SCHEDULED",
      },
      {
        competition_id: competitionId,
        round_id: finalRoundId,
        home_team_code: "Ganador Semifinal 1",
        away_team_code: "Ganador Semifinal 2",
        status: "SCHEDULED",
      }
    );
  }

  if (matchRows.length > 0) {
    const { error: matchesError } = await supabase.from("matches").insert(matchRows);
    if (matchesError) throw matchesError;
  }

  const { error: statusError } = await supabase
    .from("competitions")
    .update({ status: "ACTIVE" })
    .eq("id", competitionId);

  if (statusError) throw statusError;

  return {
    generated: true,
    roundsCreated: roundRows.length,
    matchesCreated: matchRows.length,
  };
}
