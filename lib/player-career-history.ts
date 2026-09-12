import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Row = Record<string, unknown>;

export type CareerPosition = "GK" | "DF" | "DM" | "MF" | "AM" | "FW";

export type PlayerCareerSeason = {
  seasonId: string;
  seasonName: string;
  teamCodes: string[];
  position: CareerPosition | null;
  matches: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  mom: number;
  saves: number;
  conceded: number;
  tackles: number;
  keyPasses: number;
  shots: number;
  dp: number;
};

export type PlayerCareerCompetition = PlayerCareerSeason & {
  competitionId: string;
  competitionName: string;
  competitionType: string;
};

export type PlayerCareerClub = {
  teamCode: string;
  firstSeen: string | null;
  lastSeen: string | null;
  position: CareerPosition | null;
  matches: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  mom: number;
  saves: number;
  conceded: number;
  tackles: number;
  keyPasses: number;
  shots: number;
  dp: number;
};

export type PlayerCareerRecord = {
  label: string;
  value: string;
  detail: string | null;
  matchId: string | null;
};

export type PlayerCareerHistoryData = {
  position: CareerPosition | null;
  totals: {
    matches: number;
    starts: number;
    minutes: number;
    goals: number;
    assists: number;
    mom: number;
    saves: number;
    conceded: number;
    tackles: number;
    keyPasses: number;
    shots: number;
    dp: number;
  };
  seasons: PlayerCareerSeason[];
  competitions: PlayerCareerCompetition[];
  clubs: PlayerCareerClub[];
  records: PlayerCareerRecord[];
};

type PositionCounter = Partial<Record<CareerPosition, number>>;
const POSITION_ORDER: CareerPosition[] = ["GK", "DF", "DM", "MF", "AM", "FW"];

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

function normalizePosition(value: unknown): CareerPosition | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return POSITION_ORDER.includes(normalized as CareerPosition) ? (normalized as CareerPosition) : null;
}

function addPosition(counter: PositionCounter, stat: Row) {
  const position = normalizePosition(stat.position_at_match);
  if (!position) return;
  counter[position] = (counter[position] ?? 0) + Math.max(1, n(stat, "min", "minutes"));
}

function dominantPosition(counter: PositionCounter, fallback: CareerPosition | null) {
  let best: CareerPosition | null = null;
  let bestValue = -1;
  for (const position of POSITION_ORDER) {
    const value = counter[position] ?? 0;
    if (value > bestValue) {
      best = value > 0 ? position : best;
      bestValue = value;
    }
  }
  return best ?? fallback;
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

function emptyAggregate(seasonId: string, name: string): PlayerCareerSeason {
  return {
    seasonId,
    seasonName: name,
    teamCodes: [],
    position: null,
    matches: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    mom: 0,
    saves: 0,
    conceded: 0,
    tackles: 0,
    keyPasses: 0,
    shots: 0,
    dp: 0,
  };
}

function addStats(target: PlayerCareerSeason, stat: Row) {
  const minutes = n(stat, "min", "minutes");
  target.matches += n(stat, "participated", "gam") > 0 || minutes > 0 ? 1 : 0;
  target.starts += n(stat, "came_on_sub", "sub") > 0 ? 0 : minutes > 0 ? 1 : 0;
  target.minutes += minutes;
  target.goals += n(stat, "gls", "goals");
  target.assists += n(stat, "ass", "assists");
  target.mom += n(stat, "mom");
  target.saves += n(stat, "sav", "saves");
  target.conceded += n(stat, "con", "conceded");
  target.tackles += n(stat, "ktk", "tackles");
  target.keyPasses += n(stat, "kps", "key_passes");
  target.shots += n(stat, "sht", "shots");
  target.dp += n(stat, "dp");
  const team = s(stat, "team_code");
  if (team && !target.teamCodes.includes(team)) target.teamCodes.push(team);
}

export async function getPlayerCareerHistory(
  playerId: string,
  fallbackPosition: CareerPosition | null = null
): Promise<PlayerCareerHistoryData> {
  const supabase = getSupabaseAdmin();

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

    const page = (statsResult.data ?? []) as Row[];
    stats.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  if (stats.length === 0) {
    return {
      position: fallbackPosition,
      totals: {
        matches: 0, starts: 0, minutes: 0, goals: 0, assists: 0, mom: 0,
        saves: 0, conceded: 0, tackles: 0, keyPasses: 0, shots: 0, dp: 0,
      },
      seasons: [], competitions: [], clubs: [], records: [],
    };
  }

  const matchIds = Array.from(new Set(stats.map((row) => s(row, "match_id")).filter(Boolean))) as string[];
  const matches: Row[] = [];
  for (let i = 0; i < matchIds.length; i += 150) {
    const result = await supabase.from("matches").select("*").in("id", matchIds.slice(i, i + 150));
    if (result.error) throw result.error;
    matches.push(...((result.data ?? []) as Row[]));
  }

  const competitionIds = Array.from(new Set(matches.map((row) => s(row, "competition_id")).filter(Boolean))) as string[];
  const competitions: Row[] = [];
  for (let i = 0; i < competitionIds.length; i += 100) {
    const result = await supabase
      .from("competitions")
      .select("*, season:seasons(*)")
      .in("id", competitionIds.slice(i, i + 100));
    if (result.error) throw result.error;
    competitions.push(...((result.data ?? []) as Row[]));
  }

  const matchById = new Map(matches.map((row) => [String(row.id), row]));
  const competitionById = new Map(competitions.map((row) => [String(row.id), row]));
  const bySeason = new Map<string, PlayerCareerSeason>();
  const byCompetition = new Map<string, PlayerCareerCompetition>();
  const byClub = new Map<string, PlayerCareerClub>();
  const overallPositions: PositionCounter = {};
  const seasonPositions = new Map<string, PositionCounter>();
  const competitionPositions = new Map<string, PositionCounter>();
  const clubPositions = new Map<string, PositionCounter>();

  let maxGoals = -1;
  let maxAssists = -1;
  let maxMom = -1;
  let maxMinutes = -1;
  let goalsRecord: PlayerCareerRecord | null = null;
  let assistsRecord: PlayerCareerRecord | null = null;
  let momRecord: PlayerCareerRecord | null = null;
  let minutesRecord: PlayerCareerRecord | null = null;

  for (const stat of stats) {
    const matchId = s(stat, "match_id");
    const match = matchId ? matchById.get(matchId) : undefined;
    if (!match) continue;
    const competition = competitionById.get(String(match.competition_id));
    if (!competition) continue;

    const seasonId = String(competition.season_id ?? "unknown");
    const sName = seasonName(competition);
    const competitionId = String(competition.id);
    const cName = s(competition, "name") ?? "Competición";
    const cType = s(competition, "type") ?? "OTHER";

    const season = bySeason.get(seasonId) ?? emptyAggregate(seasonId, sName);
    addStats(season, stat);
    bySeason.set(seasonId, season);

    const comp = byCompetition.get(competitionId) ?? {
      ...emptyAggregate(seasonId, sName),
      competitionId,
      competitionName: cName,
      competitionType: cType,
    };
    addStats(comp, stat);
    byCompetition.set(competitionId, comp);

    const team = s(stat, "team_code") ?? "SIN";
    const date = s(match, "played_at", "match_date", "created_at");
    const club = byClub.get(team) ?? {
      teamCode: team,
      firstSeen: date,
      lastSeen: date,
      position: null,
      matches: 0,
      starts: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      mom: 0,
      saves: 0,
      conceded: 0,
      tackles: 0,
      keyPasses: 0,
      shots: 0,
      dp: 0,
    };
    const minutes = n(stat, "min", "minutes");
    if (n(stat, "participated", "gam") > 0 || minutes > 0) club.matches += 1;
    club.starts += n(stat, "came_on_sub", "sub") > 0 ? 0 : minutes > 0 ? 1 : 0;
    club.minutes += minutes;
    club.goals += n(stat, "gls", "goals");
    club.assists += n(stat, "ass", "assists");
    club.mom += n(stat, "mom");
    club.saves += n(stat, "sav", "saves");
    club.conceded += n(stat, "con", "conceded");
    club.tackles += n(stat, "ktk", "tackles");
    club.keyPasses += n(stat, "kps", "key_passes");
    club.shots += n(stat, "sht", "shots");
    club.dp += n(stat, "dp");
    if (date && (!club.firstSeen || date < club.firstSeen)) club.firstSeen = date;
    if (date && (!club.lastSeen || date > club.lastSeen)) club.lastSeen = date;
    byClub.set(team, club);

    addPosition(overallPositions, stat);
    const seasonCounter = seasonPositions.get(seasonId) ?? {};
    addPosition(seasonCounter, stat);
    seasonPositions.set(seasonId, seasonCounter);
    const compCounter = competitionPositions.get(competitionId) ?? {};
    addPosition(compCounter, stat);
    competitionPositions.set(competitionId, compCounter);
    const clubCounter = clubPositions.get(team) ?? {};
    addPosition(clubCounter, stat);
    clubPositions.set(team, clubCounter);

    const goals = n(stat, "gls", "goals");
    const assists = n(stat, "ass", "assists");
    const mom = n(stat, "mom");
    const rival = s(match, "home_team_code") === team ? s(match, "away_team_code") : s(match, "home_team_code");
    const detail = `${cName} · ${sName}${rival ? ` · vs ${rival}` : ""}`;

    if (goals > maxGoals) {
      maxGoals = goals;
      goalsRecord = { label: "Más goles en un partido", value: `${goals} goles`, detail, matchId };
    }
    if (assists > maxAssists) {
      maxAssists = assists;
      assistsRecord = { label: "Más asistencias en un partido", value: `${assists} asistencias`, detail, matchId };
    }
    if (mom > maxMom) {
      maxMom = mom;
      momRecord = { label: "Más MVP en un partido", value: `${mom} MVP`, detail, matchId };
    }
    if (minutes > maxMinutes) {
      maxMinutes = minutes;
      minutesRecord = { label: "Más minutos en un partido", value: `${minutes} min`, detail, matchId };
    }
  }

  const position = dominantPosition(overallPositions, fallbackPosition);
  for (const [id, row] of bySeason) row.position = dominantPosition(seasonPositions.get(id) ?? {}, position);
  for (const [id, row] of byCompetition) row.position = dominantPosition(competitionPositions.get(id) ?? {}, position);
  for (const [team, row] of byClub) row.position = dominantPosition(clubPositions.get(team) ?? {}, position);

  const seasons = [...bySeason.values()].sort((a, b) => b.seasonName.localeCompare(a.seasonName, "es", { numeric: true }));
  const competitionRows = [...byCompetition.values()].sort((a, b) => b.seasonName.localeCompare(a.seasonName, "es", { numeric: true }) || a.competitionName.localeCompare(b.competitionName));
  const clubs = [...byClub.values()].sort((a, b) => (a.firstSeen ?? "").localeCompare(b.firstSeen ?? ""));

  const totals = seasons.reduce(
    (acc, row) => ({
      matches: acc.matches + row.matches,
      starts: acc.starts + row.starts,
      minutes: acc.minutes + row.minutes,
      goals: acc.goals + row.goals,
      assists: acc.assists + row.assists,
      mom: acc.mom + row.mom,
      saves: acc.saves + row.saves,
      conceded: acc.conceded + row.conceded,
      tackles: acc.tackles + row.tackles,
      keyPasses: acc.keyPasses + row.keyPasses,
      shots: acc.shots + row.shots,
      dp: acc.dp + row.dp,
    }),
    { matches: 0, starts: 0, minutes: 0, goals: 0, assists: 0, mom: 0, saves: 0, conceded: 0, tackles: 0, keyPasses: 0, shots: 0, dp: 0 }
  );

  const format1 = (value: number) =>
    value.toLocaleString("es-ES", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  const per90 = (value: number, minutes: number) =>
    minutes > 0 ? (value * 90) / minutes : 0;

  const percentage = (value: number, total: number) =>
    total > 0 ? (value / total) * 100 : 0;

  const bestSeasonValue = (
    label: string,
    value: (row: PlayerCareerSeason) => number,
    render: (value: number) => string,
    eligible: (row: PlayerCareerSeason) => boolean = () => true
  ): PlayerCareerRecord | null => {
    const candidates = seasons.filter(eligible);
    if (!candidates.length) return null;

    const row = [...candidates].sort((a, b) => value(b) - value(a))[0];
    const result = value(row);

    return result > 0
      ? {
          label,
          value: render(result),
          detail: row.seasonName,
          matchId: null,
        }
      : null;
  };

  const lowestSeasonValue = (
    label: string,
    value: (row: PlayerCareerSeason) => number,
    render: (value: number) => string,
    eligible: (row: PlayerCareerSeason) => boolean
  ): PlayerCareerRecord | null => {
    const candidates = seasons.filter(eligible);
    if (!candidates.length) return null;

    const row = [...candidates].sort((a, b) => value(a) - value(b))[0];
    const result = value(row);

    return {
      label,
      value: render(result),
      detail: row.seasonName,
      matchId: null,
    };
  };

  const matchRecord = (
    field: "goals" | "assists" | "mom" | "minutes" | "saves" | "tackles" | "keyPasses" | "shots",
    label: string,
    suffix: string
  ): PlayerCareerRecord | null => {
    let bestValue = -1;
    let best: PlayerCareerRecord | null = null;

    for (const stat of stats) {
      const matchId = s(stat, "match_id");
      const match = matchId ? matchById.get(matchId) : undefined;
      if (!match) continue;

      const competition = competitionById.get(String(match.competition_id));
      if (!competition) continue;

      const team = s(stat, "team_code") ?? "SIN";
      const rival =
        s(match, "home_team_code") === team
          ? s(match, "away_team_code")
          : s(match, "home_team_code");

      const raw =
        field === "goals"
          ? n(stat, "gls", "goals")
          : field === "assists"
            ? n(stat, "ass", "assists")
            : field === "minutes"
              ? n(stat, "min", "minutes")
              : field === "saves"
                ? n(stat, "sav", "saves")
                : field === "tackles"
                  ? n(stat, "ktk", "tackles")
                  : field === "keyPasses"
                    ? n(stat, "kps", "key_passes")
                    : field === "shots"
                      ? n(stat, "sht", "shots")
                      : n(stat, "mom");

      if (raw <= bestValue) continue;

      const cName = s(competition, "name") ?? "Competición";
      const sName = seasonName(competition);
      const detail = `${cName} · ${sName}${rival ? ` · vs ${rival}` : ""}`;

      bestValue = raw;
      best = {
        label,
        value: `${raw} ${suffix}`,
        detail,
        matchId,
      };
    }

    return best && bestValue > 0 ? best : null;
  };

  const commonRecords: PlayerCareerRecord[] = [
    bestSeasonValue(
      "Más MVP en una temporada",
      row => row.mom,
      value => `${value} MVP`
    ),
    bestSeasonValue(
      "Más partidos en una temporada",
      row => row.matches,
      value => `${value} partidos`
    ),
  ].filter(Boolean) as PlayerCareerRecord[];

  let positionRecords: PlayerCareerRecord[] = [];

  if (position === "GK") {
    positionRecords = [
      bestSeasonValue("Más paradas en una temporada", row => row.saves, value => `${value} paradas`),
      bestSeasonValue(
        "Mejor % de paradas en una temporada",
        row => percentage(row.saves, row.saves + row.conceded),
        value => `${format1(value)}%`,
        row => row.saves + row.conceded > 0
      ),
      bestSeasonValue(
        "Más paradas por 90 en una temporada",
        row => per90(row.saves, row.minutes),
        value => `${format1(value)} SAV/90`,
        row => row.minutes > 0 && row.saves > 0
      ),
      lowestSeasonValue(
        "Menos goles encajados por 90",
        row => per90(row.conceded, row.minutes),
        value => `${format1(value)} GC/90`,
        row => row.minutes > 0
      ),
      matchRecord("saves", "Más paradas en un partido", "paradas"),
      matchRecord("mom", "Más MVP en un partido", "MVP"),
    ].filter(Boolean) as PlayerCareerRecord[];
  } else if (position === "DF") {
    positionRecords = [
      bestSeasonValue("Más entradas en una temporada", row => row.tackles, value => `${value} entradas`),
      bestSeasonValue(
        "Más entradas por 90 en una temporada",
        row => per90(row.tackles, row.minutes),
        value => `${format1(value)} KTK/90`,
        row => row.minutes > 0 && row.tackles > 0
      ),
      bestSeasonValue("Más pases clave en una temporada", row => row.keyPasses, value => `${value} pases clave`),
      bestSeasonValue(
        "Mejor G+A por 90 en una temporada",
        row => per90(row.goals + row.assists, row.minutes),
        value => `${format1(value)} G+A/90`,
        row => row.minutes > 0 && row.goals + row.assists > 0
      ),
      matchRecord("tackles", "Más entradas en un partido", "entradas"),
      matchRecord("keyPasses", "Más pases clave en un partido", "pases clave"),
    ].filter(Boolean) as PlayerCareerRecord[];
  } else if (position === "DM") {
    positionRecords = [
      bestSeasonValue("Más entradas en una temporada", row => row.tackles, value => `${value} entradas`),
      bestSeasonValue("Más pases clave en una temporada", row => row.keyPasses, value => `${value} pases clave`),
      bestSeasonValue("Más asistencias en una temporada", row => row.assists, value => `${value} asistencias`),
      bestSeasonValue(
        "Mayor impacto por 90 en una temporada",
        row => per90(row.tackles + row.keyPasses + row.goals + row.assists, row.minutes),
        value => `${format1(value)} IMP/90`,
        row => row.minutes > 0
      ),
      matchRecord("tackles", "Más entradas en un partido", "entradas"),
      matchRecord("keyPasses", "Más pases clave en un partido", "pases clave"),
    ].filter(Boolean) as PlayerCareerRecord[];
  } else if (position === "MF") {
    positionRecords = [
      bestSeasonValue("Más pases clave en una temporada", row => row.keyPasses, value => `${value} pases clave`),
      bestSeasonValue("Más asistencias en una temporada", row => row.assists, value => `${value} asistencias`),
      bestSeasonValue(
        "Mejor G+A por 90 en una temporada",
        row => per90(row.goals + row.assists, row.minutes),
        value => `${format1(value)} G+A/90`,
        row => row.minutes > 0 && row.goals + row.assists > 0
      ),
      bestSeasonValue(
        "Más disparos por 90 en una temporada",
        row => per90(row.shots, row.minutes),
        value => `${format1(value)} SHT/90`,
        row => row.minutes > 0 && row.shots > 0
      ),
      matchRecord("keyPasses", "Más pases clave en un partido", "pases clave"),
      matchRecord("assists", "Más asistencias en un partido", "asistencias"),
    ].filter(Boolean) as PlayerCareerRecord[];
  } else if (position === "AM") {
    positionRecords = [
      bestSeasonValue("Más goles en una temporada", row => row.goals, value => `${value} goles`),
      bestSeasonValue("Más asistencias en una temporada", row => row.assists, value => `${value} asistencias`),
      bestSeasonValue("Más pases clave en una temporada", row => row.keyPasses, value => `${value} pases clave`),
      bestSeasonValue(
        "Mejor G+A por 90 en una temporada",
        row => per90(row.goals + row.assists, row.minutes),
        value => `${format1(value)} G+A/90`,
        row => row.minutes > 0 && row.goals + row.assists > 0
      ),
      bestSeasonValue(
        "Mejor conversión en una temporada",
        row => percentage(row.goals, row.shots),
        value => `${format1(value)}%`,
        row => row.shots > 0
      ),
      matchRecord("goals", "Más goles en un partido", "goles"),
      matchRecord("assists", "Más asistencias en un partido", "asistencias"),
    ].filter(Boolean) as PlayerCareerRecord[];
  } else if (position === "FW") {
    positionRecords = [
      bestSeasonValue("Más goles en una temporada", row => row.goals, value => `${value} goles`),
      bestSeasonValue(
        "Más goles por 90 en una temporada",
        row => per90(row.goals, row.minutes),
        value => `${format1(value)} G/90`,
        row => row.minutes > 0 && row.goals > 0
      ),
      bestSeasonValue(
        "Mejor G+A por 90 en una temporada",
        row => per90(row.goals + row.assists, row.minutes),
        value => `${format1(value)} G+A/90`,
        row => row.minutes > 0 && row.goals + row.assists > 0
      ),
      bestSeasonValue(
        "Mejor conversión en una temporada",
        row => percentage(row.goals, row.shots),
        value => `${format1(value)}%`,
        row => row.shots > 0
      ),
      matchRecord("goals", "Más goles en un partido", "goles"),
      matchRecord("shots", "Más disparos en un partido", "disparos"),
    ].filter(Boolean) as PlayerCareerRecord[];
  } else {
    positionRecords = [
      bestSeasonValue("Más goles en una temporada", row => row.goals, value => `${value} goles`),
      bestSeasonValue("Más asistencias en una temporada", row => row.assists, value => `${value} asistencias`),
      matchRecord("goals", "Más goles en un partido", "goles"),
      matchRecord("assists", "Más asistencias en un partido", "asistencias"),
    ].filter(Boolean) as PlayerCareerRecord[];
  }

  const records = [...positionRecords, ...commonRecords];
  return { position, totals, seasons, competitions: competitionRows, clubs, records };
}
