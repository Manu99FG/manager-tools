import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

export type PlayerMatchHistoryRow = {
  id: string;
  matchId: string;

  playerId: string;
  teamCode: string;
  esmsName: string;

  participated: number;
  cameOnAsSub: number;
  minutes: number;
  mom: number;

  saves: number;
  conceded: number;
  tackles: number;
  keyPasses: number;
  shots: number;
  goals: number;
  assists: number;

  dp: number;
  injury: number;

  kabDelta: number;
  tabDelta: number;
  pabDelta: number;
  sabDelta: number;

  fitness: number;

  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  playedAt: string | null;
  scheduledAt: string | null;

  competitionId: string;
  competitionName: string;
  seasonName: string | null;
  roundName: string | null;
};

export type PlayerCompetitionSummary = {
  competitionId: string;
  competitionName: string;
  seasonName: string | null;

  appearances: number;
  starts: number;
  subAppearances: number;
  minutes: number;
  mom: number;

  saves: number;
  conceded: number;
  tackles: number;
  keyPasses: number;
  shots: number;
  goals: number;
  assists: number;

  dp: number;
  injuries: number;

  kabDelta: number;
  tabDelta: number;
  pabDelta: number;
  sabDelta: number;
};

export type PlayerMatchHistoryData = {
  matches:
    PlayerMatchHistoryRow[];

  competitions:
    PlayerCompetitionSummary[];

  totals:
    PlayerCompetitionSummary;
};

type StatRow = {
  id: string;
  match_id: string;
  player_id: string | null;
  team_code: string;
  esms_name: string;

  participated: number;
  came_on_as_sub: number;
  minutes: number;
  mom: number;

  saves: number;
  conceded: number;
  tackles: number;
  key_passes: number;
  shots: number;
  goals: number;
  assists: number;

  dp: number;
  injury: number;

  kab_delta: number;
  tab_delta: number;
  pab_delta: number;
  sab_delta: number;

  fitness: number;
};

type MatchRow = {
  id: string;
  competition_id: string;
  round_id: string | null;

  home_team_code: string;
  away_team_code: string;

  home_score: number | null;
  away_score: number | null;

  played_at: string | null;
  scheduled_at: string | null;
};

type CompetitionRow = {
  id: string;
  season_id: string;
  name: string;
};

type SeasonRow = {
  id: string;
  name: string;
};

type RoundRow = {
  id: string;
  name: string;
};

function emptySummary(
  competitionId = "ALL",
  competitionName = "Total",
  seasonName:
    string | null = null
): PlayerCompetitionSummary {
  return {
    competitionId,
    competitionName,
    seasonName,

    appearances: 0,
    starts: 0,
    subAppearances: 0,
    minutes: 0,
    mom: 0,

    saves: 0,
    conceded: 0,
    tackles: 0,
    keyPasses: 0,
    shots: 0,
    goals: 0,
    assists: 0,

    dp: 0,
    injuries: 0,

    kabDelta: 0,
    tabDelta: 0,
    pabDelta: 0,
    sabDelta: 0,
  };
}

function addMatchToSummary(
  summary:
    PlayerCompetitionSummary,
  row:
    PlayerMatchHistoryRow
) {
  summary.appearances +=
    row.participated;

  if (
    row.participated
  ) {
    if (
      row.cameOnAsSub
    ) {
      summary.subAppearances +=
        1;
    } else {
      summary.starts +=
        1;
    }
  }

  summary.minutes +=
    row.minutes;

  summary.mom +=
    row.mom;

  summary.saves +=
    row.saves;

  summary.conceded +=
    row.conceded;

  summary.tackles +=
    row.tackles;

  summary.keyPasses +=
    row.keyPasses;

  summary.shots +=
    row.shots;

  summary.goals +=
    row.goals;

  summary.assists +=
    row.assists;

  summary.dp +=
    row.dp;

  summary.injuries +=
    row.injury;

  summary.kabDelta +=
    row.kabDelta;

  summary.tabDelta +=
    row.tabDelta;

  summary.pabDelta +=
    row.pabDelta;

  summary.sabDelta +=
    row.sabDelta;
}

export async function getPlayerMatchHistory(
  playerId: string
): Promise<
  PlayerMatchHistoryData
> {
  const supabase =
    getSupabaseAdmin();

  const stats: StatRow[] = [];
  const PAGE_SIZE = 1000;

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {
    const {
      data: statData,
      error: statError,
    } = await supabase
      .from(
        "match_player_stats"
      )
      .select("*")
      .eq(
        "player_id",
        playerId
      )
      .order(
        "id",
        {
          ascending: true,
        }
      )
      .range(
        from,
        from + PAGE_SIZE - 1
      );

    if (statError) {
      throw statError;
    }

    const page =
      (statData ??
        []) as StatRow[];

    stats.push(...page);

    if (
      page.length <
      PAGE_SIZE
    ) {
      break;
    }
  }

  if (
    stats.length === 0
  ) {
    return {
      matches: [],
      competitions: [],
      totals:
        emptySummary(),
    };
  }

  const matchIds =
    Array.from(
      new Set(
        stats.map(
          (row) =>
            row.match_id
        )
      )
    );

  const {
    data: matchData,
    error: matchError,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        competition_id,
        round_id,
        home_team_code,
        away_team_code,
        home_score,
        away_score,
        played_at,
        scheduled_at
      `
    )
    .in(
      "id",
      matchIds
    );

  if (matchError) {
    throw matchError;
  }

  const matches =
    (matchData ??
      []) as MatchRow[];

  const competitionIds =
    Array.from(
      new Set(
        matches.map(
          (match) =>
            match.competition_id
        )
      )
    );

  const roundIds =
    Array.from(
      new Set(
        matches
          .map(
            (match) =>
              match.round_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(value)
          )
      )
    );

  const [
    competitionResult,
    roundResult,
  ] =
    await Promise.all([
      competitionIds.length >
      0
        ? supabase
            .from(
              "competitions"
            )
            .select(
              "id, season_id, name"
            )
            .in(
              "id",
              competitionIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      roundIds.length >
      0
        ? supabase
            .from(
              "competition_rounds"
            )
            .select(
              "id, name"
            )
            .in(
              "id",
              roundIds
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  if (
    competitionResult.error
  ) {
    throw competitionResult.error;
  }

  if (
    roundResult.error
  ) {
    throw roundResult.error;
  }

  const competitions =
    (competitionResult.data ??
      []) as CompetitionRow[];

  const rounds =
    (roundResult.data ??
      []) as RoundRow[];

  const seasonIds =
    Array.from(
      new Set(
        competitions.map(
          (
            competition
          ) =>
            competition.season_id
        )
      )
    );

  const seasonResult =
    seasonIds.length >
    0
      ? await supabase
          .from("seasons")
          .select(
            "id, name"
          )
          .in(
            "id",
            seasonIds
          )
      : {
          data: [],
          error: null,
        };

  if (
    seasonResult.error
  ) {
    throw seasonResult.error;
  }

  const seasons =
    (seasonResult.data ??
      []) as SeasonRow[];

  const matchMap =
    new Map(
      matches.map(
        (match) => [
          match.id,
          match,
        ]
      )
    );

  const competitionMap =
    new Map(
      competitions.map(
        (
          competition
        ) => [
          competition.id,
          competition,
        ]
      )
    );

  const seasonMap =
    new Map(
      seasons.map(
        (season) => [
          season.id,
          season,
        ]
      )
    );

  const roundMap =
    new Map(
      rounds.map(
        (round) => [
          round.id,
          round,
        ]
      )
    );

  const resolved:
    PlayerMatchHistoryRow[] =
    [];

  for (
    const stat of stats
  ) {
    const match =
      matchMap.get(
        stat.match_id
      );

    if (!match) {
      continue;
    }

    const competition =
      competitionMap.get(
        match.competition_id
      );

    if (!competition) {
      continue;
    }

    const season =
      seasonMap.get(
        competition.season_id
      ) ?? null;

    const round =
      match.round_id
        ? roundMap.get(
            match.round_id
          ) ?? null
        : null;

    resolved.push({
      id:
        stat.id,
      matchId:
        stat.match_id,

      playerId:
        playerId,

      teamCode:
        stat.team_code,

      esmsName:
        stat.esms_name,

      participated:
        stat.participated,

      cameOnAsSub:
        stat.came_on_as_sub,

      minutes:
        stat.minutes,

      mom:
        stat.mom,

      saves:
        stat.saves,

      conceded:
        stat.conceded,

      tackles:
        stat.tackles,

      keyPasses:
        stat.key_passes,

      shots:
        stat.shots,

      goals:
        stat.goals,

      assists:
        stat.assists,

      dp:
        stat.dp,

      injury:
        stat.injury,

      kabDelta:
        stat.kab_delta,

      tabDelta:
        stat.tab_delta,

      pabDelta:
        stat.pab_delta,

      sabDelta:
        stat.sab_delta,

      fitness:
        stat.fitness,

      homeTeamCode:
        match.home_team_code,

      awayTeamCode:
        match.away_team_code,

      homeScore:
        match.home_score,

      awayScore:
        match.away_score,

      playedAt:
        match.played_at,

      scheduledAt:
        match.scheduled_at,

      competitionId:
        competition.id,

      competitionName:
        competition.name,

      seasonName:
        season?.name ??
        null,

      roundName:
        round?.name ??
        null,
    });
  }

  resolved.sort(
    (
      a,
      b
    ) => {
      const aDate =
        new Date(
          a.playedAt ??
            a.scheduledAt ??
            0
        ).getTime();

      const bDate =
        new Date(
          b.playedAt ??
            b.scheduledAt ??
            0
        ).getTime();

      return (
        bDate - aDate
      );
    }
  );

  const competitionSummaryMap =
    new Map<
      string,
      PlayerCompetitionSummary
    >();

  const totals =
    emptySummary();

  for (
    const row of
      resolved
  ) {
    let summary =
      competitionSummaryMap.get(
        row.competitionId
      );

    if (!summary) {
      summary =
        emptySummary(
          row.competitionId,
          row.competitionName,
          row.seasonName
        );

      competitionSummaryMap.set(
        row.competitionId,
        summary
      );
    }

    addMatchToSummary(
      summary,
      row
    );

    addMatchToSummary(
      totals,
      row
    );
  }

  const competitionSummaries =
    Array.from(
      competitionSummaryMap.values()
    ).sort(
      (
        a,
        b
      ) =>
        b.minutes -
        a.minutes
    );

  return {
    matches:
      resolved,
    competitions:
      competitionSummaries,
    totals,
  };
}
