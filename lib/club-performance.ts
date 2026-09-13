import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getPositionPerformanceScore,
  normalizeScoresByPositionAndSeason,
  type EsmsHistoryPosition,
} from "@/lib/performance-score";
import { getPlayerProfile } from "@/lib/esms-player";

type AnyRow = Record<string, any>;

type PlayerSeasonAccumulator = {
  playerId: string;
  position: EsmsHistoryPosition;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  keyPasses: number;
  tackles: number;
  shots: number;
  saves: number;
  conceded: number;
  discipline: number;
  rawScore: number;
};

export type ClubPerformanceRow = {
  playerId: string;
  esmsName: string;
  displayName: string;
  photoUrl: string | null;
  nationality: string | null;
  naturalPosition: EsmsHistoryPosition | null;
  dominantPosition: EsmsHistoryPosition;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  keyPasses: number;
  tackles: number;
  shots: number;
  saves: number;
  conceded: number;
  discipline: number;
  rawScore: number;
  zScore: number;
  percentile: number;
  normalizedIndex: number;
  byPosition: Array<{
    position: EsmsHistoryPosition;
    appearances: number;
    minutes: number;
    rawScore: number;
  }>;
};

export type ClubPerformanceData = {
  season: { id: string; name: string } | null;
  seasons: Array<{ id: string; name: string; isActive: boolean }>;
  rows: ClubPerformanceRow[];
};

const POSITIONS: EsmsHistoryPosition[] = ["GK", "DF", "DM", "MF", "AM", "FW"];

function n(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function pos(value: unknown): EsmsHistoryPosition | null {
  const normalized = String(value ?? "").trim().toUpperCase() as EsmsHistoryPosition;
  return POSITIONS.includes(normalized) ? normalized : null;
}

/**
 * Normaliza nombres ESMS para enlazar estadísticas antiguas con el jugador
 * canónico actual. Esto resuelve casos como:
 *   Marco_Reus / Marco Reus / marco_reus
 * y también estadísticas antiguas enlazadas a un player_id duplicado.
 */
function normalizePlayerName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function didParticipate(row: AnyRow) {
  return n(row.participated) > 0 || n(row.minutes) > 0;
}


async function loadPlayedMatchesForCompetitions(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  competitionIds: string[],
  teamCode?: string
) {
  const rows: AnyRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from("matches")
      .select("id,competition_id,status,home_team_code,away_team_code")
      .in("competition_id", competitionIds)
      .eq("status", "PLAYED")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (teamCode) {
      query = query.or(
        `home_team_code.eq.${teamCode},away_team_code.eq.${teamCode}`
      );
    }

    const result = await query;
    if (result.error) throw result.error;

    const page = (result.data ?? []) as AnyRow[];
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows;
}

async function loadPlayerStatsForMatches(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  matchIds: string[]
) {
  const stats: AnyRow[] = [];

  for (let index = 0; index < matchIds.length; index += 100) {
    const result = await supabase
      .from("match_player_stats")
      .select(
        "match_id,player_id,team_code,esms_name,participated,minutes,saves,conceded,tackles,key_passes,shots,goals,assists,dp,position_at_match"
      )
      .in("match_id", matchIds.slice(index, index + 100));

    if (result.error) throw result.error;
    stats.push(...(result.data ?? []));
  }

  return stats;
}

export async function getClubPerformance(
  teamCodeInput: string,
  requestedSeasonId?: string | null
): Promise<ClubPerformanceData> {
  const supabase = getSupabaseAdmin();
  const teamCode = teamCodeInput.toUpperCase();

  const seasonsRes = await supabase
    .from("seasons")
    .select("id,name,is_active,created_at")
    .order("created_at", { ascending: false });

  if (seasonsRes.error) throw seasonsRes.error;

  const seasons = ((seasonsRes.data ?? []) as AnyRow[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    isActive: Boolean(row.is_active),
  }));

  const season =
    seasons.find((item) => requestedSeasonId && item.id === requestedSeasonId) ??
    seasons.find((item) => item.isActive) ??
    seasons[0] ??
    null;

  if (!season) return { season: null, seasons, rows: [] };

  const compsRes = await supabase
    .from("competitions")
    .select("id")
    .eq("season_id", season.id);

  if (compsRes.error) throw compsRes.error;

  const competitionIds = ((compsRes.data ?? []) as AnyRow[]).map((row) =>
    String(row.id)
  );

  if (!competitionIds.length) return { season, seasons, rows: [] };

  // Cargamos todos los partidos PLAYED de la temporada con paginación.
  // Esto evita perder encuentros si Supabase alcanza su límite de filas.
  const seasonPlayedMatches = await loadPlayedMatchesForCompetitions(
    supabase,
    competitionIds
  );

  const matchIds = seasonPlayedMatches.map((row) => String(row.id));

  if (!matchIds.length) return { season, seasons, rows: [] };

  const stats = await loadPlayerStatsForMatches(supabase, matchIds);

  // Para la tabla del club usamos una segunda consulta específica:
  // exactamente los partidos PLAYED donde el club fue local o visitante.
  // Así el contador PJ coincide con Partidos/Historial del club.
  const clubPlayedMatches = await loadPlayedMatchesForCompetitions(
    supabase,
    competitionIds,
    teamCode
  );
  const clubPlayedMatchIds = clubPlayedMatches.map((row) => String(row.id));
  const clubStatsRaw = await loadPlayerStatsForMatches(
    supabase,
    clubPlayedMatchIds
  );

  /*
   * Cargamos los jugadores CANÓNICOS de la base.
   *
   * No nos limitamos a los player_id presentes en match_player_stats porque
   * las importaciones antiguas pueden contener IDs duplicados u obsoletos.
   * El esms_name es el puente para reunir toda la carrera del mismo jugador.
   */
  const playersRes = await supabase
    .from("players")
    .select(
      "id,esms_name,full_name,photo_url,nationality,current_team_code"
    );

  if (playersRes.error) throw playersRes.error;

  const players = (playersRes.data ?? []) as AnyRow[];

  const playersById = new Map<string, AnyRow>();
  const playersByName = new Map<string, AnyRow[]>();

  for (const player of players) {
    const id = String(player.id);
    playersById.set(id, player);

    const key = normalizePlayerName(player.esms_name);
    if (!key) continue;

    const list = playersByName.get(key) ?? [];
    list.push(player);
    playersByName.set(key, list);
  }

  /**
   * Resuelve un stat a un jugador canónico.
   *
   * Orden:
   * 1. Nombre ESMS + club actual compatible.
   * 2. player_id si corresponde a uno de los candidatos del mismo nombre.
   * 3. Candidato que todavía tiene club actual.
   * 4. Primer candidato por nombre.
   * 5. player_id directo como último fallback.
   *
   * De este modo, si Marco Reus tiene estadísticas históricas repartidas entre
   * varios player_id, todas terminan asociadas al mismo Marco_Reus actual.
   */
  function resolveCanonicalPlayer(row: AnyRow): AnyRow | null {
    const nameKey = normalizePlayerName(row.esms_name);
    const candidates = nameKey ? playersByName.get(nameKey) ?? [] : [];
    const statTeam = String(row.team_code ?? "").toUpperCase();

    if (candidates.length) {
      const sameCurrentTeam = candidates.find(
        (player) =>
          String(player.current_team_code ?? "").toUpperCase() === statTeam &&
          statTeam !== ""
      );
      if (sameCurrentTeam) return sameCurrentTeam;

      if (row.player_id) {
        const directId = String(row.player_id);
        const sameId = candidates.find(
          (player) => String(player.id) === directId
        );
        if (sameId) return sameId;
      }

      const activeCandidate = candidates.find(
        (player) => Boolean(player.current_team_code)
      );
      if (activeCandidate) return activeCandidate;

      return candidates[0] ?? null;
    }

    if (row.player_id) {
      return playersById.get(String(row.player_id)) ?? null;
    }

    return null;
  }

  /*
   * Plantilla ACTUAL del club.
   *
   * Esto evita que aparezcan rivales como Busquets, Messi, etc. simplemente
   * porque disputaron un partido contra el club.
   */
  const currentRosterIds = new Set(
    players
      .filter(
        (player) =>
          String(player.current_team_code ?? "").toUpperCase() === teamCode
      )
      .map((player) => String(player.id))
  );

  /*
   * Snapshot actual para calcular la POSICIÓN PRINCIPAL.
   *
   * El .stt no aporta una posición de partido fiable, por lo que NO usamos
   * position_at_match para decidir cómo valorar al jugador.
   *
   * La posición principal se obtiene a partir de ST/TK/PS/SH mediante
   * getPlayerProfile(), y esa misma posición se usa para TODOS los partidos
   * de la temporada.
   */
  const allCanonicalPlayerIds = [...playersById.keys()];
  const snapshotRows: AnyRow[] = [];

  for (let index = 0; index < allCanonicalPlayerIds.length; index += 100) {
    const result = await supabase
      .from("latest_player_snapshots")
      .select("player_id,st,tk,ps,sh")
      .in("player_id", allCanonicalPlayerIds.slice(index, index + 100));

    if (result.error) throw result.error;
    snapshotRows.push(...(result.data ?? []));
  }

  const snapshots = new Map(
    snapshotRows.map((row) => [String(row.player_id), row] as const)
  );

  function getPrincipalPosition(playerId: string): EsmsHistoryPosition | null {
    const snapshot = snapshots.get(playerId);
    if (!snapshot) return null;

    return getPlayerProfile({
      st: n(snapshot.st),
      tk: n(snapshot.tk),
      ps: n(snapshot.ps),
      sh: n(snapshot.sh),
    } as any) as EsmsHistoryPosition;
  }

  /*
   * Rendimiento GLOBAL de la temporada.
   *
   * UNA SOLA FUENTE DE VERDAD POR JUGADOR:
   * - posición principal
   * - PJ
   * - minutos
   * - estadísticas
   * - Performance Score
   *
   * Todo se calcula a partir del mismo conjunto de partidos disputados.
   */
  const seasonAccumulators = new Map<string, PlayerSeasonAccumulator>();
  const seasonAppearanceKeys = new Set<string>();

  for (const stat of stats) {
    if (!didParticipate(stat)) continue;

    const player = resolveCanonicalPlayer(stat);
    if (!player) continue;

    const playerId = String(player.id);
    const principalPosition = getPrincipalPosition(playerId);
    if (!principalPosition) continue;

    const accumulator =
      seasonAccumulators.get(playerId) ?? {
        playerId,
        position: principalPosition,
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        keyPasses: 0,
        tackles: 0,
        shots: 0,
        saves: 0,
        conceded: 0,
        discipline: 0,
        rawScore: 0,
      };

    const appearanceKey = `${playerId}::${String(stat.match_id)}`;
    if (!seasonAppearanceKeys.has(appearanceKey)) {
      accumulator.appearances += 1;
      seasonAppearanceKeys.add(appearanceKey);
    }

    accumulator.minutes += n(stat.minutes);
    accumulator.goals += n(stat.goals);
    accumulator.assists += n(stat.assists);
    accumulator.keyPasses += n(stat.key_passes);
    accumulator.tackles += n(stat.tackles);
    accumulator.shots += n(stat.shots);
    accumulator.saves += n(stat.saves);
    accumulator.conceded += n(stat.conceded);
    accumulator.discipline += n(stat.dp);

    accumulator.rawScore += getPositionPerformanceScore({
      position: principalPosition,
      saves: n(stat.saves),
      conceded: n(stat.conceded),
      minutes: n(stat.minutes),
      discipline: n(stat.dp),
      tackles: n(stat.tackles),
      keyPasses: n(stat.key_passes),
      assists: n(stat.assists),
      goals: n(stat.goals),
      shots: n(stat.shots),
    });

    seasonAccumulators.set(playerId, accumulator);
  }

  const principalRows = [...seasonAccumulators.values()];

  const normalized = normalizeScoresByPositionAndSeason(
    principalRows.map((row) => ({
      playerId: row.playerId,
      seasonId: season.id,
      position: row.position,
      rawScore: row.rawScore,
    }))
  );

  const normalizedByPlayer = new Map(
    normalized.map((row) => [row.playerId, row] as const)
  );

  /*
   * Datos del CLUB.
   *
   * Para evitar cualquier incoherencia entre tabla y detalle, aquí volvemos a
   * acumular exclusivamente los partidos del club y usamos ESE MISMO acumulado
   * para PJ, minutos, estadísticas, Score y "Rendimiento por posición".
   */
  const clubAccumulators = new Map<string, PlayerSeasonAccumulator>();
  const clubAppearanceKeys = new Set<string>();

  for (const stat of clubStatsRaw) {
    if (!didParticipate(stat)) continue;
    if (String(stat.team_code ?? "").toUpperCase() !== teamCode) continue;

    const player = resolveCanonicalPlayer(stat);
    if (!player) continue;

    const playerId = String(player.id);
    if (!currentRosterIds.has(playerId)) continue;

    const principalPosition = getPrincipalPosition(playerId);
    if (!principalPosition) continue;

    const accumulator =
      clubAccumulators.get(playerId) ?? {
        playerId,
        position: principalPosition,
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        keyPasses: 0,
        tackles: 0,
        shots: 0,
        saves: 0,
        conceded: 0,
        discipline: 0,
        rawScore: 0,
      };

    const appearanceKey = `${playerId}::${String(stat.match_id)}`;
    if (!clubAppearanceKeys.has(appearanceKey)) {
      accumulator.appearances += 1;
      clubAppearanceKeys.add(appearanceKey);
    }

    accumulator.minutes += n(stat.minutes);
    accumulator.goals += n(stat.goals);
    accumulator.assists += n(stat.assists);
    accumulator.keyPasses += n(stat.key_passes);
    accumulator.tackles += n(stat.tackles);
    accumulator.shots += n(stat.shots);
    accumulator.saves += n(stat.saves);
    accumulator.conceded += n(stat.conceded);
    accumulator.discipline += n(stat.dp);

    accumulator.rawScore += getPositionPerformanceScore({
      position: principalPosition,
      saves: n(stat.saves),
      conceded: n(stat.conceded),
      minutes: n(stat.minutes),
      discipline: n(stat.dp),
      tackles: n(stat.tackles),
      keyPasses: n(stat.key_passes),
      assists: n(stat.assists),
      goals: n(stat.goals),
      shots: n(stat.shots),
    });

    clubAccumulators.set(playerId, accumulator);
  }

  const rows: ClubPerformanceRow[] = [];

  for (const [playerId, total] of clubAccumulators.entries()) {
    const normalizedRow = normalizedByPlayer.get(playerId);
    if (!normalizedRow) continue;

    const player = playersById.get(playerId);
    if (!player) continue;

    const snapshot = snapshots.get(playerId);

    const naturalPosition = getPrincipalPosition(playerId);

    const byPosition = [
      {
        position: total.position,
        appearances: total.appearances,
        minutes: total.minutes,
        rawScore: Math.round(total.rawScore * 10) / 10,
      },
    ];

    rows.push({
      playerId,
      esmsName: String(player.esms_name ?? playerId),
      displayName: String(
        player.full_name ?? player.esms_name ?? playerId
      ).replaceAll("_", " "),
      photoUrl: player.photo_url ? String(player.photo_url) : null,
      nationality: player.nationality
        ? String(player.nationality)
        : null,
      naturalPosition,
      dominantPosition: total.position,
      appearances: total.appearances,
      minutes: total.minutes,
      goals: total.goals,
      assists: total.assists,
      keyPasses: total.keyPasses,
      tackles: total.tackles,
      shots: total.shots,
      saves: total.saves,
      conceded: total.conceded,
      discipline: total.discipline,
      rawScore: Math.round(total.rawScore * 10) / 10,
      zScore: normalizedRow.zScore,
      percentile: normalizedRow.percentile,
      normalizedIndex: normalizedRow.normalizedIndex,
      byPosition,
    });
  }

  rows.sort(
    (a, b) =>
      b.normalizedIndex - a.normalizedIndex ||
      b.minutes - a.minutes
  );

  return { season, seasons, rows };
}