import { buildStandings } from "@/lib/competitions";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Row = Record<string, unknown>;

export type PlayerPalmaresTitle = {
  competitionId: string;
  competitionName: string;
  competitionType: string;
  seasonId: string | null;
  seasonName: string;
  seriesId: string | null;
  seriesName: string;
  scope: string;
  teamCode: string;
  countsAsLeague: boolean;
  countsAsChampions: boolean;
};

export type PlayerPalmaresGroup = {
  key: string;
  seriesId: string | null;
  seriesName: string;
  competitionType: string;
  scope: string;
  count: number;
  titles: PlayerPalmaresTitle[];
};

export type PlayerPalmaresData = {
  summary: {
    total: number;
    leagues: number;
    champions: number;
    cups: number;
  };
  groups: PlayerPalmaresGroup[];
  titles: PlayerPalmaresTitle[];
  participationRule: string;
};

function n(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function s(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function seasonName(competition: Row) {
  const season = competition.season;
  if (season && typeof season === "object" && !Array.isArray(season)) {
    return s(season as Row, "name") ?? "Temporada";
  }
  if (Array.isArray(season) && season[0] && typeof season[0] === "object") {
    return s(season[0] as Row, "name") ?? "Temporada";
  }
  return "Temporada";
}

function didParticipate(stat: Row) {
  return n(stat, "participated", "gam") > 0 || n(stat, "min", "minutes") > 0;
}

async function loadInChunks(
  table: string,
  ids: string[],
  column = "id",
  select = "*",
  chunkSize = 150
) {
  const supabase = getSupabaseAdmin();
  const rows: Row[] = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const result = await supabase
      .from(table)
      .select(select)
      .in(column, ids.slice(i, i + chunkSize));

    if (result.error) throw result.error;
    rows.push(...((result.data ?? []) as unknown as Row[]));
  }

  return rows;
}

export async function getPlayerPalmares(playerId: string): Promise<PlayerPalmaresData> {
  const supabase = getSupabaseAdmin();
  const participationRule =
    "Solo se cuentan títulos de competiciones en las que el jugador disputó al menos un partido con el equipo campeón.";

  const stats: Row[] = [];
  const PAGE_SIZE = 1000;

  for (let from = 0; ; from += PAGE_SIZE) {
    const statsResult = await supabase
      .from("match_player_stats")
      .select("*")
      .eq("player_id", playerId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (statsResult.error) throw statsResult.error;

    const page = (statsResult.data ?? []) as unknown as Row[];
    stats.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  const participatedStats = stats.filter(didParticipate);

  const empty: PlayerPalmaresData = {
    summary: { total: 0, leagues: 0, champions: 0, cups: 0 },
    groups: [],
    titles: [],
    participationRule,
  };

  if (!participatedStats.length) return empty;

  const playerMatchIds = Array.from(
    new Set(participatedStats.map((row) => s(row, "match_id")).filter(Boolean))
  ) as string[];

  const playerMatches = await loadInChunks("matches", playerMatchIds);
  const playerMatchById = new Map(
    playerMatches.map((match) => [String(match.id), match])
  );

  const participation = new Map<string, Set<string>>();

  for (const stat of participatedStats) {
    const matchId = s(stat, "match_id");
    const match = matchId ? playerMatchById.get(matchId) : undefined;
    if (!match) continue;

    const competitionId = s(match, "competition_id");
    const teamCode = s(stat, "team_code");
    if (!competitionId || !teamCode) continue;

    const teams = participation.get(competitionId) ?? new Set<string>();
    teams.add(teamCode.toUpperCase());
    participation.set(competitionId, teams);
  }

  const competitionIds = [...participation.keys()];
  if (!competitionIds.length) return empty;

  const competitions = await loadInChunks(
    "competitions",
    competitionIds,
    "id",
    "*, season:seasons(*)",
    100
  );

  const finishedCompetitions = competitions.filter(
    (competition) => s(competition, "status") === "FINISHED"
  );

  if (!finishedCompetitions.length) return empty;

  const finishedIds = finishedCompetitions.map((competition) => String(competition.id));

  const [allMatches, allTeams, rounds] = await Promise.all([
    loadInChunks("matches", finishedIds, "competition_id"),
    loadInChunks("competition_teams", finishedIds, "competition_id"),
    loadInChunks("competition_rounds", finishedIds, "competition_id"),
  ]);

  const seriesIds = Array.from(
    new Set(
      finishedCompetitions
        .map((competition) => s(competition, "series_id"))
        .filter(Boolean)
    )
  ) as string[];

  const seriesRows = seriesIds.length
    ? await loadInChunks("competition_series", seriesIds)
    : [];

  const seriesById = new Map(seriesRows.map((series) => [String(series.id), series]));

  const matchesByCompetition = new Map<string, Row[]>();
  for (const match of allMatches) {
    const competitionId = s(match, "competition_id");
    if (!competitionId) continue;
    const rows = matchesByCompetition.get(competitionId) ?? [];
    rows.push(match);
    matchesByCompetition.set(competitionId, rows);
  }

  const teamsByCompetition = new Map<string, Row[]>();
  for (const team of allTeams) {
    const competitionId = s(team, "competition_id");
    if (!competitionId) continue;
    const rows = teamsByCompetition.get(competitionId) ?? [];
    rows.push(team);
    teamsByCompetition.set(competitionId, rows);
  }

  const roundsByCompetition = new Map<string, Row[]>();
  for (const round of rounds) {
    const competitionId = s(round, "competition_id");
    if (!competitionId) continue;
    const rows = roundsByCompetition.get(competitionId) ?? [];
    rows.push(round);
    roundsByCompetition.set(competitionId, rows);
  }

  const titles: PlayerPalmaresTitle[] = [];

  for (const competition of finishedCompetitions) {
    const competitionId = String(competition.id);
    const playerTeams = participation.get(competitionId);
    if (!playerTeams?.size) continue;

    const type = s(competition, "type") ?? "OTHER";
    let champion: string | null = null;

    if (type === "LEAGUE") {
      const standings = buildStandings(
        competition as never,
        (teamsByCompetition.get(competitionId) ?? []) as never,
        (matchesByCompetition.get(competitionId) ?? []) as never
      );

      champion = standings[0]?.teamCode ?? null;
    } else {
      const competitionRounds = roundsByCompetition.get(competitionId) ?? [];
      const finalRoundIds = new Set(
        competitionRounds
          .filter((round) => s(round, "stage") === "FINAL")
          .map((round) => String(round.id))
      );

      const finalMatches = (matchesByCompetition.get(competitionId) ?? [])
        .filter(
          (match) =>
            finalRoundIds.has(String(match.round_id)) &&
            s(match, "status") === "PLAYED" &&
            match.home_score !== null &&
            match.home_score !== undefined &&
            match.away_score !== null &&
            match.away_score !== undefined
        )
        .sort((a, b) => {
          const roundA = competitionRounds.find(
            (round) => String(round.id) === String(a.round_id)
          );
          const roundB = competitionRounds.find(
            (round) => String(round.id) === String(b.round_id)
          );

          const byRound = n(roundA ?? {}, "number") - n(roundB ?? {}, "number");
          if (byRound !== 0) return byRound;

          return String(a.created_at ?? "").localeCompare(
            String(b.created_at ?? "")
          );
        });

      const final = finalMatches.at(-1);

      if (final) {
        const home = s(final, "home_team_code");
        const away = s(final, "away_team_code");
        const homeScore = n(final, "home_score");
        const awayScore = n(final, "away_score");

        if (home && away && homeScore !== awayScore) {
          champion = homeScore > awayScore ? home : away;
        }
      }
    }

    if (!champion) continue;

    const normalizedChampion = champion.toUpperCase();

    // Important: the player must have played FOR the champion in this competition.
    if (!playerTeams.has(normalizedChampion)) continue;

    const seriesId = s(competition, "series_id");
    const series = seriesId ? seriesById.get(seriesId) : undefined;

    titles.push({
      competitionId,
      competitionName: s(competition, "name") ?? "Competición",
      competitionType: type,
      seasonId: s(competition, "season_id"),
      seasonName: seasonName(competition),
      seriesId,
      seriesName:
        (series ? s(series, "name") : null) ??
        s(competition, "name") ??
        "Competición",
      scope: (series ? s(series, "scope") : null) ?? "OTHER",
      teamCode: normalizedChampion,
      countsAsLeague: Boolean(series?.counts_as_league) || type === "LEAGUE",
      countsAsChampions: Boolean(series?.counts_as_champions),
    });
  }

  titles.sort(
    (a, b) =>
      a.seasonName.localeCompare(b.seasonName, "es", {
        numeric: true,
        sensitivity: "base",
      }) ||
      a.seriesName.localeCompare(b.seriesName, "es", {
        sensitivity: "base",
      })
  );

  const groupMap = new Map<string, PlayerPalmaresGroup>();

  for (const title of titles) {
    const key =
      title.seriesId ??
      `fallback:${title.competitionType}:${title.seriesName}`;

    const group = groupMap.get(key) ?? {
      key,
      seriesId: title.seriesId,
      seriesName: title.seriesName,
      competitionType: title.competitionType,
      scope: title.scope,
      count: 0,
      titles: [],
    };

    group.count += 1;
    group.titles.push(title);
    groupMap.set(key, group);
  }

  const groups = [...groupMap.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.seriesName.localeCompare(b.seriesName, "es", {
        sensitivity: "base",
      })
  );

  return {
    summary: {
      total: titles.length,
      leagues: titles.filter((title) => title.countsAsLeague).length,
      champions: titles.filter((title) => title.countsAsChampions).length,
      cups: titles.filter((title) => title.scope === "DOMESTIC_CUP").length,
    },
    groups,
    titles,
    participationRule,
  };
}
