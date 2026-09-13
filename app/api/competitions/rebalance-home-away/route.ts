import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import {
  assertHomeCountRange,
  assertMaxConsecutiveHome,
  createBalancedLeagueCalendar,
  createBalancedSingleRoundRobin,
  type CalendarRound,
} from "@/lib/calendar-home-balance";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type MatchRow = {
  id: string;
  round_id: string | null;
  home_team_code: string;
  away_team_code: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_no_show: boolean | null;
  away_no_show: boolean | null;
};

type RoundRow = {
  id: string;
  number: number;
  name: string;
  stage: string | null;
};

type TeamRow = {
  team_code: string;
  seed: number | null;
  group_name: string | null;
};

function normalizedName(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("es");
}

function isProtectedMatch(match: MatchRow) {
  return (
    match.status === "PLAYED" ||
    match.home_score !== null ||
    match.away_score !== null ||
    match.home_no_show === true ||
    match.away_no_show === true
  );
}

async function updateMatches(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  updates: Array<{ id: string; home: string; away: string }>
) {
  // Se hacen en pequeños lotes para no disparar cientos de peticiones a la vez.
  for (let index = 0; index < updates.length; index += 20) {
    const chunk = updates.slice(index, index + 20);
    const results = await Promise.all(
      chunk.map((item) =>
        supabase
          .from("matches")
          .update({
            home_team_code: item.home,
            away_team_code: item.away,
          })
          .eq("id", item.id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  }
}

function fixtureCount(rounds: CalendarRound[]) {
  return rounds.reduce((sum, round) => sum + round.length, 0);
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { competitionId?: unknown };
    const competitionId =
      typeof body.competitionId === "string" ? body.competitionId.trim() : "";

    if (!competitionId) {
      return NextResponse.json({ error: "Falta competitionId." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const [competitionResult, teamsResult, roundsResult, matchesResult] =
      await Promise.all([
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
          .from("competition_rounds")
          .select("id,number,name,stage")
          .eq("competition_id", competitionId)
          .order("number", { ascending: true }),
        supabase
          .from("matches")
          .select(
            "id,round_id,home_team_code,away_team_code,status,home_score,away_score,home_no_show,away_no_show"
          )
          .eq("competition_id", competitionId),
      ]);

    if (competitionResult.error) throw competitionResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (roundsResult.error) throw roundsResult.error;
    if (matchesResult.error) throw matchesResult.error;

    const competition = competitionResult.data;
    if (!competition) {
      return NextResponse.json({ error: "La competición no existe." }, { status: 404 });
    }

    const teams = (teamsResult.data ?? []) as TeamRow[];
    const rounds = (roundsResult.data ?? []) as RoundRow[];
    const matches = (matchesResult.data ?? []) as MatchRow[];

    if (!matches.length) {
      return NextResponse.json(
        { error: "La competición todavía no tiene calendario." },
        { status: 409 }
      );
    }

    if (matches.some(isProtectedMatch)) {
      return NextResponse.json(
        {
          error:
            "No se puede reequilibrar un calendario que ya tiene partidos jugados, marcadores o NP. Solo se modifican calendarios todavía vírgenes.",
        },
        { status: 409 }
      );
    }

    const name = normalizedName(competition.name);
    const isIntercontinental = name === "copa intercontinental";
    const isLeague = String(competition.type) === "LEAGUE";

    if (!isLeague && !isIntercontinental) {
      return NextResponse.json(
        {
          error:
            "El reequilibrado automático solo está disponible para ligas regulares y Copa Intercontinental.",
        },
        { status: 409 }
      );
    }

    const updates: Array<{ id: string; home: string; away: string }> = [];

    if (isLeague) {
      const teamCodes = teams.map((team) => team.team_code);
      if (teamCodes.length < 2) {
        return NextResponse.json({ error: "No hay suficientes equipos." }, { status: 400 });
      }

      const generated = createBalancedLeagueCalendar(
        teamCodes,
        Boolean(competition.home_and_away)
      );
      assertMaxConsecutiveHome(generated, 2);

      const regularRounds = rounds.filter(
        (round) =>
          String(round.stage ?? "REGULAR").toUpperCase() === "REGULAR" ||
          /^jornada\s+\d+/i.test(round.name)
      );

      if (regularRounds.length !== generated.length) {
        return NextResponse.json(
          {
            error: `El calendario actual tiene ${regularRounds.length} jornadas regulares y el nuevo sistema necesita ${generated.length}.`,
          },
          { status: 409 }
        );
      }

      for (let roundIndex = 0; roundIndex < regularRounds.length; roundIndex += 1) {
        const round = regularRounds[roundIndex];
        const current = matches
          .filter((match) => match.round_id === round.id)
          .sort((a, b) => a.id.localeCompare(b.id));
        const desired = generated[roundIndex];

        if (current.length !== desired.length) {
          return NextResponse.json(
            {
              error: `${round.name} tiene ${current.length} partidos y debería tener ${desired.length}.`,
            },
            { status: 409 }
          );
        }

        current.forEach((match, index) => {
          const [home, away] = desired[index];
          updates.push({ id: match.id, home, away });
        });
      }
    } else {
      const grouped = new Map<string, string[]>();
      for (const team of teams) {
        const group = team.group_name?.trim();
        if (!group) {
          return NextResponse.json(
            { error: "Todos los equipos deben pertenecer a un grupo." },
            { status: 409 }
          );
        }
        const current = grouped.get(group) ?? [];
        current.push(team.team_code);
        grouped.set(group, current);
      }

      const groupRounds = rounds.filter(
        (round) => String(round.stage ?? "").toUpperCase() === "GROUP"
      );
      if (groupRounds.length !== 7) {
        return NextResponse.json(
          {
            error: `La Copa Intercontinental debe tener 7 jornadas de grupo; actualmente tiene ${groupRounds.length}.`,
          },
          { status: 409 }
        );
      }

      const teamGroup = new Map(
        teams.map((team) => [team.team_code, team.group_name?.trim() ?? ""])
      );

      for (const [groupName, groupTeams] of [...grouped.entries()].sort(([a], [b]) =>
        a.localeCompare(b, "es", { numeric: true })
      )) {
        if (groupTeams.length !== 8) {
          return NextResponse.json(
            {
              error: `${groupName} tiene ${groupTeams.length} equipos. La Copa Intercontinental necesita 8 por grupo.`,
            },
            { status: 409 }
          );
        }

        // Determinista para reparar calendarios existentes: se usa el orden
        // de inscripción/seed y no se vuelve a sortear la composición del grupo.
        const desired = createBalancedSingleRoundRobin(groupTeams);
        assertHomeCountRange(desired, 3, 4);

        for (let roundIndex = 0; roundIndex < groupRounds.length; roundIndex += 1) {
          const round = groupRounds[roundIndex];
          const current = matches
            .filter((match) => {
              if (match.round_id !== round.id) return false;
              return (
                teamGroup.get(match.home_team_code) === groupName &&
                teamGroup.get(match.away_team_code) === groupName
              );
            })
            .sort((a, b) => a.id.localeCompare(b.id));
          const fixtures = desired[roundIndex];

          if (current.length !== fixtures.length) {
            return NextResponse.json(
              {
                error: `${groupName} · ${round.name} tiene ${current.length} partidos y debería tener ${fixtures.length}.`,
              },
              { status: 409 }
            );
          }

          current.forEach((match, index) => {
            const [home, away] = fixtures[index];
            updates.push({ id: match.id, home, away });
          });
        }
      }
    }

    await updateMatches(supabase, updates);

    return NextResponse.json({
      ok: true,
      matchesUpdated: updates.length,
      rule: isLeague
        ? "Máximo 2 jornadas consecutivas como local"
        : "Entre 3 y 4 partidos como local por equipo",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
