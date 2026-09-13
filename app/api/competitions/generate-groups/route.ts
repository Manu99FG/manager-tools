import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { CLUB_CLASSES, validateClassDistribution } from "@/lib/club-classes";

const BYE = "__BYE__";

type GroupTeamRow = {
  team_code: string;
  seed: number | null;
  group_name: string | null;
};

function shuffled<T>(input: T[]) {
  const copy = [...input];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createRoundRobin(inputTeams: string[]) {
  // Cada grupo parte de un orden aleatorio independiente. De esta forma,
  // aunque todos tengan el mismo numero de equipos, no comparten el mismo
  // patron de jornadas.
  const teams = shuffled(inputTeams);
  if (teams.length % 2 === 1) teams.push(BYE);

  const total = teams.length;
  const rounds: Array<Array<[string, string]>> = [];
  let rotation = [...teams];

  for (let roundIndex = 0; roundIndex < total - 1; roundIndex += 1) {
    const fixtures: Array<[string, string]> = [];

    for (let index = 0; index < total / 2; index += 1) {
      let home = rotation[index];
      let away = rotation[total - 1 - index];

      // Alternamos el primer cruce y, adicionalmente, sorteamos la condicion
      // de local/visitante del resto de cruces.
      if ((roundIndex % 2 === 1 && index === 0) || (index > 0 && randomInt(2) === 1)) {
        [home, away] = [away, home];
      }

      if (home !== BYE && away !== BYE) {
        fixtures.push([home, away]);
      }
    }

    // Tambien se sortea el orden visual de los partidos dentro de la jornada.
    rounds.push(shuffled(fixtures));
    rotation = [rotation[0], rotation[total - 1], ...rotation.slice(1, total - 1)];
  }

  // Finalmente sorteamos el orden de las jornadas. El round-robin sigue
  // conservando exactamente un enfrentamiento entre cada pareja de equipos,
  // pero cada grupo obtiene un calendario distinto.
  return shuffled(rounds);
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  let createdRoundIds: string[] = [];

  try {
    const body = (await request.json()) as { competitionId?: unknown };
    const competitionId =
      typeof body.competitionId === "string" ? body.competitionId.trim() : "";

    if (!competitionId) {
      return NextResponse.json({ error: "Falta competitionId." }, { status: 400 });
    }

    const [competitionResult, teamsResult, matchesResult, roundsResult] = await Promise.all([
      supabase
        .from("competitions")
        .select("id,name,type,home_and_away")
        .eq("id", competitionId)
        .maybeSingle(),
      supabase
        .from("competition_teams")
        .select("team_code,seed,group_name")
        .eq("competition_id", competitionId)
        .order("seed", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId),
      supabase
        .from("competition_rounds")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId),
    ]);

    if (competitionResult.error) throw competitionResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (matchesResult.error) throw matchesResult.error;
    if (roundsResult.error) throw roundsResult.error;

    const competition = competitionResult.data;
    if (!competition) {
      return NextResponse.json({ error: "La competición no existe." }, { status: 404 });
    }

    if (!["GROUPS", "GROUPS_KNOCKOUT"].includes(String(competition.type))) {
      return NextResponse.json(
        { error: "Esta competición no utiliza fase de grupos." },
        { status: 409 }
      );
    }

    const isIntercontinental = String(competition.name ?? "")
      .trim()
      .toLocaleLowerCase("es") === "copa intercontinental";

    if (isIntercontinental) {
      const { data: appliedDraw, error: drawError } = await supabase
        .from("competition_draws")
        .select("id,status")
        .eq("destination_competition_id", competitionId)
        .eq("status", "APPLIED")
        .limit(1)
        .maybeSingle();
      if (drawError) throw drawError;
      if (!appliedDraw) {
        return NextResponse.json(
          { error: "La Copa Intercontinental debe esperar a que termine y se aplique el sorteo antes de generar su calendario." },
          { status: 409 }
        );
      }
    }

    if ((matchesResult.count ?? 0) > 0 || (roundsResult.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Esta competición ya tiene un calendario generado." },
        { status: 409 }
      );
    }

    let teamRows = (teamsResult.data ?? []) as GroupTeamRow[];
    const isCopaLeyendas = String(competition.name ?? "").trim().toLocaleLowerCase("es") === "copa de leyendas";

    if (isCopaLeyendas) {
      const codes = teamRows.map((team) => team.team_code.trim().toUpperCase());
      if (codes.length !== 32) {
        return NextResponse.json({ error: `La Copa de Leyendas necesita exactamente 32 equipos; hay ${codes.length}.` }, { status: 400 });
      }
      const { data: metadata, error: metadataError } = await supabase
        .from("club_metadata")
        .select("team_code,club_class")
        .in("team_code", codes);
      if (metadataError) throw metadataError;
      const classByCode = new Map((metadata ?? []).map((row) => [String(row.team_code).trim().toUpperCase(), typeof row.club_class === "string" ? row.club_class : null]));
      const validation = validateClassDistribution(codes.map((teamCode) => ({ teamCode, clubClass: classByCode.get(teamCode) ?? null })), 4);
      if (validation.missing.length) {
        return NextResponse.json({ error: `Falta asignar una clase a: ${validation.missing.join(", ")}.` }, { status: 400 });
      }
      if (validation.invalid.length) {
        return NextResponse.json({ error: `Hay clases no válidas. Usa Clase A-H.` }, { status: 400 });
      }
      if (validation.wrongSizes.length) {
        return NextResponse.json({ error: `Cada clase debe tener 4 equipos. Revisa: ${validation.wrongSizes.map((item) => `${item.clubClass} (${item.teams.length})`).join(", ")}.` }, { status: 400 });
      }

      const classForTeam = new Map<string, string>();
      for (const clubClass of CLUB_CLASSES) {
        for (const teamCode of validation.byClass.get(clubClass) ?? []) classForTeam.set(teamCode, clubClass);
      }
      for (const team of teamRows) {
        const groupName = classForTeam.get(team.team_code.trim().toUpperCase());
        if (!groupName) continue;
        const { error: updateError } = await supabase
          .from("competition_teams")
          .update({ group_name: groupName })
          .eq("competition_id", competitionId)
          .eq("team_code", team.team_code);
        if (updateError) throw updateError;
        team.group_name = groupName;
      }
    }

    if (teamRows.length < 2) {
      return NextResponse.json(
        { error: "La competición necesita al menos 2 equipos." },
        { status: 400 }
      );
    }

    if (teamRows.some((team) => !team.group_name?.trim())) {
      return NextResponse.json(
        { error: "Todos los equipos deben estar asignados a un grupo antes de generar el calendario." },
        { status: 400 }
      );
    }

    const grouped = new Map<string, string[]>();
    for (const team of teamRows) {
      const groupName = team.group_name!.trim();
      const current = grouped.get(groupName) ?? [];
      current.push(team.team_code);
      grouped.set(groupName, current);
    }

    const groups = [...grouped.entries()].sort(([a], [b]) =>
      a.localeCompare(b, "es", { numeric: true })
    );

    const invalidGroup = groups.find(([, codes]) => codes.length < 2);
    if (invalidGroup) {
      return NextResponse.json(
        { error: `${invalidGroup[0]} necesita al menos 2 equipos para generar partidos.` },
        { status: 400 }
      );
    }


    if (isCopaLeyendas && !competition.home_and_away) {
      const { error: homeAwayError } = await supabase
        .from("competitions")
        .update({ home_and_away: true })
        .eq("id", competitionId);
      if (homeAwayError) throw homeAwayError;
      competition.home_and_away = true;
    }

    const firstLegByGroup = groups.map(([groupName, codes]) => ({
      groupName,
      rounds: createRoundRobin(codes),
    }));

    const firstLegRoundCount = Math.max(
      ...firstLegByGroup.map((group) => group.rounds.length)
    );
    const forceSingleLeg = String(competition.name ?? "")
      .toLocaleLowerCase("es")
      .includes("intercontinental");
    const useHomeAndAway = isCopaLeyendas || (Boolean(competition.home_and_away) && !forceSingleLeg);
    const totalRoundCount = useHomeAndAway
      ? firstLegRoundCount * 2
      : firstLegRoundCount;

    const roundRows = Array.from({ length: totalRoundCount }, (_, index) => ({
      competition_id: competitionId,
      number: index + 1,
      name: `Jornada ${index + 1}`,
      stage: "GROUP",
    }));

    const { data: createdRounds, error: roundsInsertError } = await supabase
      .from("competition_rounds")
      .insert(roundRows)
      .select("id,number");

    if (roundsInsertError) throw roundsInsertError;

    createdRoundIds = (createdRounds ?? []).map((round) => String(round.id));
    const roundIdByNumber = new Map(
      (createdRounds ?? []).map((round) => [Number(round.number), String(round.id)])
    );

    const matchRows: Array<{
      competition_id: string;
      round_id: string;
      home_team_code: string;
      away_team_code: string;
      status: "SCHEDULED";
    }> = [];

    for (const group of firstLegByGroup) {
      group.rounds.forEach((fixtures, localRoundIndex) => {
        const roundNumber = localRoundIndex + 1;
        const roundId = roundIdByNumber.get(roundNumber);
        if (!roundId) throw new Error(`No se pudo resolver la Jornada ${roundNumber}.`);

        for (const [home, away] of fixtures) {
          matchRows.push({
            competition_id: competitionId,
            round_id: roundId,
            home_team_code: home,
            away_team_code: away,
            status: "SCHEDULED",
          });
        }
      });

      if (useHomeAndAway) {
        group.rounds.forEach((fixtures, localRoundIndex) => {
          const roundNumber = firstLegRoundCount + localRoundIndex + 1;
          const roundId = roundIdByNumber.get(roundNumber);
          if (!roundId) throw new Error(`No se pudo resolver la Jornada ${roundNumber}.`);

          for (const [home, away] of fixtures) {
            matchRows.push({
              competition_id: competitionId,
              round_id: roundId,
              home_team_code: away,
              away_team_code: home,
              status: "SCHEDULED",
            });
          }
        });
      }
    }

    if (!matchRows.length) {
      throw new Error("No se pudieron generar partidos para los grupos configurados.");
    }

    const { error: matchesInsertError } = await supabase
      .from("matches")
      .insert(matchRows);

    if (matchesInsertError) throw matchesInsertError;

    if (isCopaLeyendas) {
      const knockoutSeeds = [
        {
          name: "Octavos de final",
          stage: "ROUND_OF_16",
          matches: [
            ["1º Clase A", "2º Clase B"], ["2º Clase A", "1º Clase B"],
            ["1º Clase C", "2º Clase D"], ["2º Clase C", "1º Clase D"],
            ["1º Clase E", "2º Clase F"], ["2º Clase E", "1º Clase F"],
            ["1º Clase G", "2º Clase H"], ["2º Clase G", "1º Clase H"],
          ],
        },
        {
          name: "Cuartos de final",
          stage: "QUARTERFINAL",
          matches: [
            ["Ganador Octavos 1", "Ganador Octavos 2"], ["Ganador Octavos 3", "Ganador Octavos 4"],
            ["Ganador Octavos 5", "Ganador Octavos 6"], ["Ganador Octavos 7", "Ganador Octavos 8"],
          ],
        },
        {
          name: "Semifinales",
          stage: "SEMIFINAL",
          matches: [["Ganador Cuartos 1", "Ganador Cuartos 2"], ["Ganador Cuartos 3", "Ganador Cuartos 4"]],
        },
        {
          name: "Final",
          stage: "FINAL",
          matches: [["Ganador Semifinal 1", "Ganador Semifinal 2"]],
        },
      ] as const;

      const { data: knockoutRounds, error: knockoutRoundsError } = await supabase
        .from("competition_rounds")
        .insert(knockoutSeeds.map((round, index) => ({
          competition_id: competitionId,
          number: totalRoundCount + index + 1,
          name: round.name,
          stage: round.stage,
        })))
        .select("id,number");
      if (knockoutRoundsError) throw knockoutRoundsError;
      createdRoundIds.push(...(knockoutRounds ?? []).map((round) => String(round.id)));

      const knockoutRoundByNumber = new Map((knockoutRounds ?? []).map((round) => [Number(round.number), String(round.id)]));
      const knockoutMatches = knockoutSeeds.flatMap((round, index) => {
        const roundId = knockoutRoundByNumber.get(totalRoundCount + index + 1);
        if (!roundId) throw new Error(`No se pudo crear ${round.name}.`);
        return round.matches.map(([home, away]) => ({
          competition_id: competitionId,
          round_id: roundId,
          home_team_code: home,
          away_team_code: away,
          status: "SCHEDULED" as const,
        }));
      });
      const { error: knockoutMatchesError } = await supabase.from("matches").insert(knockoutMatches);
      if (knockoutMatchesError) throw knockoutMatchesError;
    }

    const { error: statusError } = await supabase
      .from("competitions")
      .update({ status: "ACTIVE" })
      .eq("id", competitionId);

    if (statusError) throw statusError;

    return NextResponse.json({
      ok: true,
      groups: groups.length,
      rounds: totalRoundCount,
      matches: matchRows.length,
    });
  } catch (error) {
    // Si falló después de crear las jornadas, limpiamos el intento incompleto.
    if (createdRoundIds.length) {
      await supabase.from("matches").delete().in("round_id", createdRoundIds);
      await supabase.from("competition_rounds").delete().in("id", createdRoundIds);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
