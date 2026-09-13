"use client";

import Image from "next/image";
import CompetitionKnockoutView, { CompetitionFormatBanner } from "@/components/CompetitionFormatView";
import { COMPETITION_FORMAT, isKnockoutFormat } from "@/lib/competition-format";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { rankStandings } from "@/lib/standings-ranking";

type Competition = {
  id: string;
  name: string;
  type: "LEAGUE" | "CUP" | "GROUPS" | "GROUPS_KNOCKOUT" | "SUPERCUP";
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  seasonName: string;
  seasonStartsAt: string | null;
  seasonEndsAt: string | null;
  seriesId: string | null;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
};

type IntegratedHistoryMatchRecord = {
  matchId: string;
  competitionId: string;
  seasonName: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number;
  awayScore: number;
};

type IntegratedHistoryEdition = {
  competitionId: string;
  seasonName: string;
  status: string;
  championTeamCode: string | null;
  runnerUpTeamCode: string | null;
  thirdTeamCode: string | null;
  topScorer: {
    playerId: string | null;
    esmsName: string;
    teamCode: string;
    value: number;
  } | null;
};

type IntegratedHistoryTeam = {
  teamCode: string;
  editions: number;
  titles: number;
  runnerUp: number;
  thirdPlaces: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type IntegratedHistoryPlayer = {
  playerId: string | null;
  esmsName: string;
  teamCode: string;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  mom: number;
  keyPasses: number;
  tackles: number;
  saves: number;
};

type IntegratedCompetitionHistory = {
  series: {
    id: string;
    name: string;
    type: string;
    created_at: string;
  };
  editions: IntegratedHistoryEdition[];
  teams: IntegratedHistoryTeam[];
  players: IntegratedHistoryPlayer[];
  records: {
    biggestWin: IntegratedHistoryMatchRecord | null;
    highestScoringMatch: IntegratedHistoryMatchRecord | null;
  };
  totals: {
    editions: number;
    completedEditions: number;
    matches: number;
    goals: number;
  };
};

type HistorySubTab = "palmares" | "clubs" | "players" | "records" | "stats";

type OverviewHistoryEdition = {
  competitionId: string;
  seasonName: string;
  championTeamCode: string | null;
};

type StandingZone = {
  id: string;
  competitionId: string;
  label: string;
  startPosition: number;
  endPosition: number;
  color: string;
  sortOrder: number;
};

type GroupQualificationZone = StandingZone & {
  groupName: string;
  destinationCompetitionId: string;
  destinationName: string;
};

type Standing = {
  position: number;
  teamCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  noPresented: number;
  points: number;
};

type GroupStanding = {
  groupName: string;
  standings: Standing[];
};

type Round = {
  id: string;
  number: number;
  name: string;
  stage: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

type Match = {
  id: string;
  roundId: string | null;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  homeNoShow: boolean;
  awayNoShow: boolean;
  status: string;
  scheduledAt: string | null;
  playedAt: string | null;
  createdAt: string;
};

type Ranking = {
  playerId: string | null;
  esmsName: string;
  displayName: string;
  photoUrl: string | null;
  teamCode: string;
  appearances: number;
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
  dominantPosition: string | null;
  hatTricks: number;
  maxAssistsInMatch: number;
  maxAssistsMatchId: string | null;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
};

type Tab =
  | "overview"
  | "standings"
  | "results"
  | "calendar"
  | "scorers"
  | "assists"
  | "keepers"
  | "stats"
  | "history";

const TYPE_LABEL = {
  LEAGUE: "LIGA",
  CUP: "ELIMINATORIAS DIRECTAS",
  GROUPS: "GRUPOS",
  GROUPS_KNOCKOUT: "GRUPOS + ELIMINATORIAS",
  SUPERCUP: "SUPERCOPA",
} as const;

const STATUS_LABEL = {
  DRAFT: "PREPARACIÓN",
  ACTIVE: "EN CURSO",
  FINISHED: "FINALIZADA",
} as const;

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Vista general" },
  { key: "standings", label: "Clasificación" },
  { key: "results", label: "Resultados" },
  { key: "calendar", label: "Calendario" },
  { key: "scorers", label: "Goleadores" },
  { key: "assists", label: "Asistencias" },
  { key: "keepers", label: "Porteros" },
  { key: "stats", label: "Estadísticas" },
  { key: "history", label: "Historial" },
];

const TAB_TO_QUERY: Record<Tab, string> = {
  overview: "general",
  standings: "clasificacion",
  results: "resultados",
  calendar: "calendario",
  scorers: "goleadores",
  assists: "asistencias",
  keepers: "porteros",
  stats: "estadisticas",
  history: "historial",
};

const QUERY_TO_TAB: Record<string, Tab> = {
  general: "overview",
  "vista-general": "overview",
  overview: "overview",
  clasificacion: "standings",
  standings: "standings",
  resultados: "results",
  results: "results",
  calendario: "calendar",
  calendar: "calendar",
  goleadores: "scorers",
  scorers: "scorers",
  asistencias: "assists",
  assists: "assists",
  porteros: "keepers",
  keepers: "keepers",
  estadisticas: "stats",
  stats: "stats",
  historial: "history",
  history: "history",
};

function tabFromQuery(value: string | null): Tab {
  if (!value) return "overview";
  return QUERY_TO_TAB[value.toLowerCase()] ?? "overview";
}

export default function CompetitionDetailHub({
  competition,
  teams,
  standings,
  groupStandings,
  rounds,
  matches,
  rankings,
  disciplineByMatch,
  standingZones,
  qualificationZones,
  historyEditions,
  competitionHistory,
}: {
  competition: Competition;
  teams: string[];
  standings: Standing[];
  groupStandings: GroupStanding[];
  rounds: Round[];
  matches: Match[];
  rankings: Ranking[];
  disciplineByMatch: Record<string, { yellowCards: number; redCards: number }>;
  standingZones: StandingZone[];
  qualificationZones: GroupQualificationZone[];
  historyEditions: OverviewHistoryEdition[];
  competitionHistory: IntegratedCompetitionHistory | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTabState] = useState<Tab>(() =>
    tabFromQuery(searchParams.get("tab"))
  );

  const [roundId, setRoundId] = useState<string>("");
  const [resultsRoundId, setResultsRoundId] = useState<string>("");
  const [resultsClub, setResultsClub] = useState<string>("ALL");
  const [scorerClub, setScorerClub] = useState<string>("ALL");
  const [scorerPosition, setScorerPosition] = useState<string>("ALL");
  const [assistClub, setAssistClub] = useState<string>("ALL");
  const [assistPosition, setAssistPosition] = useState<string>("ALL");
  const [keeperClub, setKeeperClub] = useState<string>("ALL");
  const [keeperMinimum, setKeeperMinimum] = useState<string>("5");
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>("palmares");

  useEffect(() => {
    const rawTab = searchParams.get("tab");
    const nextTab = tabFromQuery(rawTab);
    setTabState((current) => (current === nextTab ? current : nextTab));

    if (!rawTab || !QUERY_TO_TAB[rawTab.toLowerCase()]) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", TAB_TO_QUERY[nextTab]);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  function setTab(nextTab: Tab, mode: "push" | "replace" = "push") {
    setTabState(nextTab);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", TAB_TO_QUERY[nextTab]);

    const nextUrl = `${pathname}?${params.toString()}`;

    if (mode === "replace") {
      router.replace(nextUrl, { scroll: false });
    } else {
      router.push(nextUrl, { scroll: false });
    }
  }

  const playedMatches = useMemo(
    () =>
      matches
        .filter(
          (match) =>
            match.status === "PLAYED" &&
            match.homeScore !== null &&
            match.awayScore !== null
        )
        .sort((a, b) => matchDate(b).localeCompare(matchDate(a))),
    [matches]
  );

  const pendingMatches = useMemo(
    () =>
      matches
        .filter((match) => match.status !== "PLAYED")
        .sort((a, b) => matchDate(a).localeCompare(matchDate(b))),
    [matches]
  );

  const matchesByRound = useMemo(() => {
    const map = new Map<string, Match[]>();

    for (const match of matches) {
      if (!match.roundId) continue;
      const list = map.get(match.roundId) ?? [];
      list.push(match);
      map.set(match.roundId, list);
    }

    return map;
  }, [matches]);

  const nextRound = useMemo(
    () =>
      rounds.find((round) =>
        (matchesByRound.get(round.id) ?? []).some(
          (match) => match.status !== "PLAYED"
        )
      ) ?? rounds[rounds.length - 1] ?? null,
    [rounds, matchesByRound]
  );

  const lastPlayedRound = useMemo(
    () =>
      [...rounds].reverse().find((round) =>
        (matchesByRound.get(round.id) ?? []).some(
          (match) =>
            match.status === "PLAYED" &&
            match.homeScore !== null &&
            match.awayScore !== null
        )
      ) ?? null,
    [rounds, matchesByRound]
  );

  const effectiveResultsRoundId =
    resultsRoundId || lastPlayedRound?.id || "";

  const effectiveResultsRound =
    rounds.find((round) => round.id === effectiveResultsRoundId) ?? null;

  const effectiveResultsMatches = useMemo(
    () =>
      effectiveResultsRoundId
        ? (matchesByRound.get(effectiveResultsRoundId) ?? [])
            .filter(
              (match) =>
                match.status === "PLAYED" &&
                match.homeScore !== null &&
                match.awayScore !== null
            )
            .sort((a, b) => matchDate(a).localeCompare(matchDate(b)))
        : playedMatches.slice(0, 10),
    [effectiveResultsRoundId, matchesByRound, playedMatches]
  );

  const resultsPlayedRounds = useMemo(
    () =>
      [...rounds]
        .filter((round) =>
          (matchesByRound.get(round.id) ?? []).some(
            (match) =>
              match.status === "PLAYED" &&
              match.homeScore !== null &&
              match.awayScore !== null
          )
        )
        .sort((a, b) => b.number - a.number),
    [rounds, matchesByRound]
  );

  const filteredResultsMatches =
    resultsClub === "ALL"
      ? effectiveResultsMatches
      : effectiveResultsMatches.filter(
          (match) =>
            match.homeTeamCode === resultsClub ||
            match.awayTeamCode === resultsClub
        );

  const currentResultsRoundIndex = resultsPlayedRounds.findIndex(
    (round) => round.id === effectiveResultsRoundId
  );

  const previousPlayedRound =
    currentResultsRoundIndex >= 0 &&
    currentResultsRoundIndex < resultsPlayedRounds.length - 1
      ? resultsPlayedRounds[currentResultsRoundIndex + 1]
      : null;

  const previousPlayedRoundMatches = useMemo(
    () =>
      previousPlayedRound
        ? (matchesByRound.get(previousPlayedRound.id) ?? [])
            .filter(
              (match) =>
                match.status === "PLAYED" &&
                match.homeScore !== null &&
                match.awayScore !== null
            )
            .sort((a, b) => matchDate(a).localeCompare(matchDate(b)))
        : [],
    [previousPlayedRound, matchesByRound]
  );

  const resultsRoundGoals = effectiveResultsMatches.reduce(
    (sum, match) => sum + (match.homeScore ?? 0) + (match.awayScore ?? 0),
    0
  );

  const resultsRoundYellows = effectiveResultsMatches.reduce(
    (sum, match) => sum + (disciplineByMatch[match.id]?.yellowCards ?? 0),
    0
  );

  const resultsRoundReds = effectiveResultsMatches.reduce(
    (sum, match) => sum + (disciplineByMatch[match.id]?.redCards ?? 0),
    0
  );

  const overviewBiggestWin = [...playedMatches].sort((a, b) => {
    const marginA = Math.abs((a.homeScore ?? 0) - (a.awayScore ?? 0));
    const marginB = Math.abs((b.homeScore ?? 0) - (b.awayScore ?? 0));
    const goalsA = (a.homeScore ?? 0) + (a.awayScore ?? 0);
    const goalsB = (b.homeScore ?? 0) + (b.awayScore ?? 0);
    return marginB - marginA || goalsB - goalsA;
  })[0] ?? null;

  const overviewBiggestWinLabel = overviewBiggestWin
    ? `${overviewBiggestWin.homeScore ?? 0} - ${overviewBiggestWin.awayScore ?? 0}`
    : "—";

  const highlightedResults = [...effectiveResultsMatches]
    .sort((a, b) => {
      const marginA = Math.abs((a.homeScore ?? 0) - (a.awayScore ?? 0));
      const marginB = Math.abs((b.homeScore ?? 0) - (b.awayScore ?? 0));
      const goalsA = (a.homeScore ?? 0) + (a.awayScore ?? 0);
      const goalsB = (b.homeScore ?? 0) + (b.awayScore ?? 0);
      return marginB - marginA || goalsB - goalsA;
    })
    .slice(0, 3);

  const nextRoundMatches = nextRound
    ? (matchesByRound.get(nextRound.id) ?? []).slice(0, 5)
    : pendingMatches.slice(0, 5);

  const lastRoundMatches = lastPlayedRound
    ? (matchesByRound.get(lastPlayedRound.id) ?? [])
        .filter(
          (match) =>
            match.status === "PLAYED" &&
            match.homeScore !== null &&
            match.awayScore !== null
        )
        .slice(0, 5)
    : playedMatches.slice(0, 5);

  const overviewStats = useMemo(() => {
    const scorers = [...rankings]
      .filter((row) => row.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.minutes - a.minutes)
      .slice(0, 5);

    const assists = [...rankings]
      .filter((row) => row.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.minutes - a.minutes)
      .slice(0, 5);

    const keepers = [...rankings]
      .filter((row) => row.saves > 0 || row.conceded > 0)
      .sort(
        (a, b) =>
          keeperRating(b) - keeperRating(a) ||
          b.saves - a.saves ||
          b.minutes - a.minutes
      )
      .slice(0, 10);

    const totalGoals = playedMatches.reduce(
      (sum, match) => sum + (match.homeScore ?? 0) + (match.awayScore ?? 0),
      0
    );

    const goalAverage =
      playedMatches.length > 0 ? totalGoals / playedMatches.length : 0;

    const leastConceded = [...standings].sort(
      (a, b) => a.goalsAgainst - b.goalsAgainst || b.points - a.points
    )[0];

    const unbeaten = bestUnbeatenRun(teams, playedMatches);
    const biggestWin = getBiggestWin(playedMatches);
    const highestScoringMatch = getHighestScoringMatch(playedMatches);

    const mostWins = [...standings].sort(
      (a, b) => b.won - a.won || b.points - a.points
    )[0] ?? null;

    const mostDraws = [...standings].sort(
      (a, b) => b.drawn - a.drawn || b.points - a.points
    )[0] ?? null;

    const mostLosses = [...standings].sort(
      (a, b) => b.lost - a.lost || a.points - b.points
    )[0] ?? null;

    const bestAttack = [...standings].sort(
      (a, b) => b.goalsFor - a.goalsFor || b.points - a.points
    )[0] ?? null;

    const bestDefense = [...standings].sort(
      (a, b) => a.goalsAgainst - b.goalsAgainst || b.points - a.points
    )[0] ?? null;

    const bestGoalDifference = [...standings].sort(
      (a, b) => b.goalDifference - a.goalDifference || b.points - a.points
    )[0] ?? null;

    const topMom = [...rankings]
      .filter((row) => row.mom > 0)
      .sort((a, b) => b.mom - a.mom || b.minutes - a.minutes)
      .slice(0, 5);

    const topShots = [...rankings]
      .filter((row) => row.shots > 0)
      .sort((a, b) => b.shots - a.shots || b.goals - a.goals)
      .slice(0, 5);

    const topKeyPasses = [...rankings]
      .filter((row) => row.keyPasses > 0)
      .sort((a, b) => b.keyPasses - a.keyPasses || b.assists - a.assists)
      .slice(0, 5);

    const topTackles = [...rankings]
      .filter((row) => row.tackles > 0)
      .sort((a, b) => b.tackles - a.tackles || b.minutes - a.minutes)
      .slice(0, 5);

    const topSaves = [...rankings]
      .filter((row) => row.saves > 0)
      .sort((a, b) => b.saves - a.saves || b.minutes - a.minutes)
      .slice(0, 5);

    const topDiscipline = [...rankings]
      .filter((row) => row.dp > 0)
      .sort((a, b) => b.dp - a.dp || b.minutes - a.minutes)
      .slice(0, 5);

    return {
      scorers,
      assists,
      keepers,
      goalAverage,
      leastConceded,
      unbeaten,
      totalGoals,
      biggestWin,
      highestScoringMatch,
      mostWins,
      mostDraws,
      mostLosses,
      bestAttack,
      bestDefense,
      bestGoalDifference,
      topMom,
      topShots,
      topKeyPasses,
      topTackles,
      topSaves,
      topDiscipline,
    };
  }, [rankings, standings, playedMatches, teams]);

  const {
    scorers,
    assists,
    keepers,
    goalAverage,
    leastConceded,
    unbeaten,
    totalGoals,
    biggestWin,
    highestScoringMatch,
    mostWins,
    mostDraws,
    mostLosses,
    bestAttack,
    bestDefense,
    bestGoalDifference,
    topMom,
    topShots,
    topKeyPasses,
    topTackles,
    topSaves,
    topDiscipline,
  } = overviewStats;

  const scorerRows = useMemo(
    () =>
      [...rankings]
        .filter((row) => row.goals > 0)
        .filter((row) => scorerClub === "ALL" || row.teamCode === scorerClub)
        .filter(
          (row) =>
            scorerPosition === "ALL" ||
            row.dominantPosition === scorerPosition
        )
        .sort(
          (a, b) =>
            b.goals - a.goals ||
            goalsPerAppearance(b) - goalsPerAppearance(a) ||
            a.minutes - b.minutes
        ),
    [rankings, scorerClub, scorerPosition]
  );

  const scorerPositions = ["GK", "DF", "DM", "MF", "AM", "FW"];

  const scorerStats = useMemo(() => {
    const totalCompetitionGoals = rankings.reduce(
      (sum, row) => sum + row.goals,
      0
    );

    const scoringPlayers = rankings.filter((row) => row.goals > 0).length;

    const positionTotals = new Map<string, number>();
    for (const row of rankings) {
      if (!row.dominantPosition || row.goals <= 0) continue;
      positionTotals.set(
        row.dominantPosition,
        (positionTotals.get(row.dominantPosition) ?? 0) + row.goals
      );
    }

    const goalsByPosition = scorerPositions
      .map((position) => ({
        position,
        goals: positionTotals.get(position) ?? 0,
      }))
      .filter((row) => row.goals > 0)
      .sort((a, b) => b.goals - a.goals);

    const maxPositionGoals = Math.max(
      ...goalsByPosition.map((row) => row.goals),
      1
    );

    const bestGoalRates = [...rankings]
      .filter((row) => row.goals > 0 && row.appearances > 0)
      .sort(
        (a, b) =>
          goalsPerAppearance(b) - goalsPerAppearance(a) ||
          b.goals - a.goals
      )
      .slice(0, 5);

    const topHatTricks = [...rankings]
      .filter((row) => row.hatTricks > 0)
      .sort(
        (a, b) =>
          b.hatTricks - a.hatTricks ||
          b.goals - a.goals
      )
      .slice(0, 5);

    return {
      totalCompetitionGoals,
      scoringPlayers,
      goalsByPosition,
      maxPositionGoals,
      bestGoalRates,
      topHatTricks,
    };
  }, [rankings]);

  const {
    totalCompetitionGoals,
    scoringPlayers,
    goalsByPosition,
    maxPositionGoals,
    bestGoalRates,
    topHatTricks,
  } = scorerStats;

  const assistPositions = ["GK", "DF", "DM", "MF", "AM", "FW"];

  const assistRows = useMemo(
    () =>
      [...rankings]
        .filter((row) => row.assists > 0)
        .filter((row) => assistClub === "ALL" || row.teamCode === assistClub)
        .filter(
          (row) =>
            assistPosition === "ALL" ||
            row.dominantPosition === assistPosition
        )
        .sort(
          (a, b) =>
            b.assists - a.assists ||
            assistsPerAppearance(b) - assistsPerAppearance(a) ||
            a.minutes - b.minutes
        ),
    [rankings, assistClub, assistPosition]
  );

  const assistStats = useMemo(() => {
    const totalCompetitionAssists = rankings.reduce(
      (sum, row) => sum + row.assists,
      0
    );

    const assistingPlayers = rankings.filter((row) => row.assists > 0).length;

    const assistAverage =
      playedMatches.length > 0
        ? totalCompetitionAssists / playedMatches.length
        : 0;

    const positionTotals = new Map<string, number>();
    for (const row of rankings) {
      if (!row.dominantPosition || row.assists <= 0) continue;
      positionTotals.set(
        row.dominantPosition,
        (positionTotals.get(row.dominantPosition) ?? 0) + row.assists
      );
    }

    const assistsByPosition = assistPositions
      .map((position) => ({
        position,
        assists: positionTotals.get(position) ?? 0,
      }))
      .filter((row) => row.assists > 0)
      .sort((a, b) => b.assists - a.assists);

    const maxPositionAssists = Math.max(
      ...assistsByPosition.map((row) => row.assists),
      1
    );

    const bestAssistRates = [...rankings]
      .filter(
        (row) =>
          row.assists > 0 &&
          row.appearances > 0 &&
          row.minutes >= 900
      )
      .sort(
        (a, b) =>
          assistsPerAppearance(b) - assistsPerAppearance(a) ||
          b.assists - a.assists
      )
      .slice(0, 5);

    const topSingleMatchAssists = [...rankings]
      .filter((row) => row.maxAssistsInMatch > 0)
      .sort(
        (a, b) =>
          b.maxAssistsInMatch - a.maxAssistsInMatch ||
          b.assists - a.assists
      )
      .slice(0, 2);

    return {
      totalCompetitionAssists,
      assistingPlayers,
      assistAverage,
      assistsByPosition,
      maxPositionAssists,
      bestAssistRates,
      topSingleMatchAssists,
    };
  }, [rankings, playedMatches.length]);

  const {
    totalCompetitionAssists,
    assistingPlayers,
    assistAverage,
    assistsByPosition,
    maxPositionAssists,
    bestAssistRates,
    topSingleMatchAssists,
  } = assistStats;

  const keeperMinimumMatches = Number(keeperMinimum);

  const keeperRows = useMemo(
    () =>
      [...rankings]
        .filter((row) => row.dominantPosition === "GK")
        .filter((row) => row.appearances >= keeperMinimumMatches)
        .filter((row) => keeperClub === "ALL" || row.teamCode === keeperClub)
        .sort(
          (a, b) =>
            keeperSavePercentage(b) - keeperSavePercentage(a) ||
            b.saves - a.saves ||
            a.conceded - b.conceded
        ),
    [rankings, keeperMinimumMatches, keeperClub]
  );

  const keeperStats = useMemo(() => {
    const allKeepers = rankings.filter(
      (row) => row.dominantPosition === "GK"
    );

    const totalKeeperSaves = allKeepers.reduce(
      (sum, row) => sum + row.saves,
      0
    );

    const totalKeeperConceded = allKeepers.reduce(
      (sum, row) => sum + row.conceded,
      0
    );

    const overallSavePercentage =
      totalKeeperSaves + totalKeeperConceded > 0
        ? (totalKeeperSaves / (totalKeeperSaves + totalKeeperConceded)) * 100
        : 0;

    const cleanSheetLeaders = [...allKeepers]
      .filter((row) => row.cleanSheets > 0)
      .sort(
        (a, b) =>
          b.cleanSheets - a.cleanSheets ||
          keeperSavePercentage(b) - keeperSavePercentage(a)
      )
      .slice(0, 8);

    const fewestConceded = [...allKeepers]
      .filter((row) => row.minutes >= 900)
      .sort(
        (a, b) =>
          a.conceded - b.conceded ||
          keeperSavePercentage(b) - keeperSavePercentage(a)
      )
      .slice(0, 5);

    const bestSavePercentages = [...allKeepers]
      .filter((row) => row.minutes >= 900 && row.saves + row.conceded > 0)
      .sort(
        (a, b) =>
          keeperSavePercentage(b) - keeperSavePercentage(a) ||
          b.saves - a.saves
      )
      .slice(0, 5);

    const mostSavesKeeper =
      [...allKeepers].sort((a, b) => b.saves - a.saves)[0] ?? null;

    return {
      allKeepers,
      totalKeeperSaves,
      totalKeeperConceded,
      overallSavePercentage,
      cleanSheetLeaders,
      fewestConceded,
      bestSavePercentages,
      mostSavesKeeper,
      leastConcededKeeper: fewestConceded[0] ?? null,
      cleanSheetKeeper: cleanSheetLeaders[0] ?? null,
      bestSaveKeeper: bestSavePercentages[0] ?? null,
    };
  }, [rankings]);

  const {
    allKeepers,
    totalKeeperSaves,
    totalKeeperConceded,
    overallSavePercentage,
    cleanSheetLeaders,
    fewestConceded,
    bestSavePercentages,
    mostSavesKeeper,
    leastConcededKeeper,
    cleanSheetKeeper,
    bestSaveKeeper,
  } = keeperStats;

  const selectedRoundId = roundId || nextRound?.id || rounds[0]?.id || "";
  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? null;
  const selectedRoundMatches = useMemo(
    () => matchesByRound.get(selectedRoundId) ?? [],
    [matchesByRound, selectedRoundId]
  );
  const selectedRoundIndex = rounds.findIndex((round) => round.id === selectedRoundId);
  const calendarPreviousRound = selectedRoundIndex > 0 ? rounds[selectedRoundIndex - 1] : null;
  const calendarNextRound = selectedRoundIndex >= 0 && selectedRoundIndex < rounds.length - 1 ? rounds[selectedRoundIndex + 1] : null;
  const calendarRoundGoals = selectedRoundMatches.reduce((sum, match) => sum + (match.homeScore ?? 0) + (match.awayScore ?? 0), 0);
  const calendarRoundYellows = selectedRoundMatches.reduce((sum, match) => sum + (disciplineByMatch[match.id]?.yellowCards ?? 0), 0);
  const calendarRoundReds = selectedRoundMatches.reduce((sum, match) => sum + (disciplineByMatch[match.id]?.redCards ?? 0), 0);
  const calendarCompetitionYellows = Object.values(disciplineByMatch).reduce((sum, row) => sum + row.yellowCards, 0);
  const calendarCompetitionReds = Object.values(disciplineByMatch).reduce((sum, row) => sum + row.redCards, 0);
  const calendarNextMatch = selectedRoundMatches.find((match) => match.status !== "PLAYED") ?? null;
  const isKnockout = isKnockoutFormat(competition.type);
  const format = COMPETITION_FORMAT[competition.type];
  const isGroupCompetition = competition.type === "GROUPS" || competition.type === "GROUPS_KNOCKOUT";
  const isSecondDivision = competition.name.toLocaleLowerCase("es").includes("segunda");
  const playoffRounds = isSecondDivision
    ? rounds.filter((round) => ["SEMIFINAL", "FINAL"].includes(String(round.stage ?? "").toUpperCase()) && round.name.toLocaleLowerCase("es").includes("ascenso"))
    : [];
  const playoffRoundIds = new Set(playoffRounds.map((round) => round.id));
  const playoffMatches = matches.filter((match) => match.roundId && playoffRoundIds.has(match.roundId));
  const regularRounds = isSecondDivision
    ? rounds.filter((round) => !playoffRoundIds.has(round.id))
    : rounds;
  const regularSeasonComplete =
    isSecondDivision &&
    regularRounds.length > 0 &&
    regularRounds.every((round) => {
      const roundMatches = matchesByRound.get(round.id) ?? [];
      return (
        roundMatches.length > 0 &&
        roundMatches.every(
          (match) =>
            match.status === "PLAYED" &&
            match.homeScore !== null &&
            match.awayScore !== null
        )
      );
    });
  const playoffReached =
    isSecondDivision &&
    playoffRounds.length > 0 &&
    (regularSeasonComplete ||
      Boolean(nextRound?.id && playoffRoundIds.has(nextRound.id)) ||
      playoffMatches.some((match) => match.status === "PLAYED"));
  const resolveSecondDivisionStandingPlaceholder = (code: string) => {
    const normalized = code.toLocaleLowerCase("es");
    const matchPosition = normalized.match(/^(\d+)[º°]\s+segunda división$/);
    if (!matchPosition) return code;
    const position = Number(matchPosition[1]);
    return standings.find((row) => row.position === position)?.teamCode ?? code;
  };
  const semifinalRound = playoffRounds.find(
    (round) => String(round.stage ?? "").toUpperCase() === "SEMIFINAL"
  );
  const semifinalMatches = semifinalRound
    ? playoffMatches.filter((match) => match.roundId === semifinalRound.id)
    : [];
  const semifinalWinners = semifinalMatches.map((match) => {
    if (match.status !== "PLAYED" || match.homeScore === null || match.awayScore === null) return null;
    const home = resolveSecondDivisionStandingPlaceholder(match.homeTeamCode);
    const away = resolveSecondDivisionStandingPlaceholder(match.awayTeamCode);
    if (match.homeScore > match.awayScore) return home;
    if (match.awayScore > match.homeScore) return away;
    return null;
  });
  const resolvePlayoffPlaceholder = (code: string) => {
    const standingTeam = resolveSecondDivisionStandingPlaceholder(code);
    if (standingTeam !== code) return standingTeam;
    const winnerMatch = code.match(/^Ganador Semifinal (\d+)$/i);
    if (!winnerMatch) return code;
    return semifinalWinners[Number(winnerMatch[1]) - 1] ?? code;
  };
  const resolvedPlayoffMatches = playoffMatches.map((match) => ({
    ...match,
    homeTeamCode: resolvePlayoffPlaceholder(match.homeTeamCode),
    awayTeamCode: resolvePlayoffPlaceholder(match.awayTeamCode),
  }));
  const flattenedGroupStandings = groupStandings.flatMap((group) => group.standings);
  const overviewStandings = isGroupCompetition ? flattenedGroupStandings : standings;
  const groupByTeam = new Map<string, string>();
  for (const group of groupStandings) {
    for (const row of group.standings) groupByTeam.set(row.teamCode, group.groupName);
  }
  const completedRounds = rounds.filter((round) => {
    const roundMatches = matchesByRound.get(round.id) ?? [];
    return roundMatches.length > 0 && roundMatches.every((match) => match.status === "PLAYED");
  }).length;

  return (
    <div className={`v311-detail competition-layout-${competition.type.toLowerCase()}`}>
      <section className="v311-hero">
        <Image
          src={isKnockout ? "/competitions/cup-v31.jpg" : "/competitions/league-v31.jpg"}
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 1400px"
          className="v311-hero-bg"
        />
        <div className="v311-hero-shade" />

        <div className="v311-hero-copy">
          <Link href="/competiciones" className="v311-breadcrumb">
            Competiciones <span>›</span> {competition.name}
          </Link>

          <span className="v311-type">{TYPE_LABEL[competition.type]}</span>
          <h1>{competition.name}</h1>
          <p>
            {format.description}
          </p>

          <div className="v311-hero-meta">
            <HeroMeta value={teams.length} label="Equipos" icon="trophy" />
            <HeroMeta value={rounds.length} label={format.unit} icon="calendar" />
            <HeroMeta
              value={formatSeasonRange(
                competition.seasonStartsAt,
                competition.seasonEndsAt,
                competition.seasonName
              )}
              label=""
              icon="calendar"
              wide
            />
          </div>
        </div>

        <div className="v311-hero-brand">
          <Image
            src="/branding/liga-leyendas-logo-oficial-v308.png"
            alt="Liga de Leyendas"
            width={250}
            height={250}
            className="v311-hero-logo"
          />
          <span>“MÁS QUE UNA LIGA,<br />UNA COMUNIDAD DE LEYENDAS”</span>
        </div>

        <span className={`v311-status v311-status-${competition.status.toLowerCase()}`}>
          {STATUS_LABEL[competition.status]}
        </span>
      </section>

      <nav className="v311-tabs" aria-label="Secciones de la competición">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => setTab(item.key)}
            aria-current={tab === item.key ? "page" : undefined}
            className={tab === item.key ? "is-active" : ""}
          >
            {item.key === "standings" ? format.tab : item.label}
          </button>
        ))}
      </nav>

      {(tab === "overview" || tab === "standings") && <CompetitionFormatBanner type={competition.type} groups={groupStandings.length} rounds={rounds.length} />}
      {tab === "overview" && isKnockout && <CompetitionKnockoutView rounds={rounds} matches={matches} />}
      {tab === "overview" && playoffReached && (
        <section className="v311-second-playoff">
          <div className="v311-second-playoff-head">
            <div>
              <span>Segunda División</span>
              <h2>Playoff de ascenso</h2>
              <p>La fase regular ha terminado. Los equipos clasificados disputan ahora las eliminatorias de ascenso.</p>
            </div>
            <strong>3.º–6.º</strong>
          </div>
          <CompetitionKnockoutView rounds={playoffRounds} matches={resolvedPlayoffMatches} />
        </section>
      )}
      {tab === "overview" && (
        <div className="v3113-overview-page">
          <section className="v3113-hero">
            <Image
              src="/competitions/overview-v3113.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="v3113-hero-image"
            />
            <div className="v3113-hero-shade" />
            <div className="v3113-hero-copy">
              <span>{TYPE_LABEL[competition.type]}</span>
              <strong>{competition.name}</strong>
              <h2>Vista general</h2>
              <p>{competition.seasonName}</p>
            </div>
            <blockquote>
              “EL FÚTBOL<br />
              ES HISTORIA,<br />
              ESTADÍSTICAS<br />
              Y EMOCIÓN”
            </blockquote>
          </section>

          <section className="v3113-kpis">
            <OverviewKpi label="Equipos" value={teams.length} icon="trophy" />
            {isGroupCompetition ? (
              <>
                <OverviewKpi label="Grupos" value={groupStandings.length} detail="en competición" icon="people" />
                <OverviewKpi label="Partidos" value={`${playedMatches.length}/${matches.length}`} detail="disputados" icon="field" />
                <OverviewKpi label="Goles" value={totalGoals} detail={playedMatches.length ? `${goalAverage.toFixed(2)} por partido` : "0 por partido"} icon="ball" />
                <OverviewKpi label="Jornadas" value={`${completedRounds}/${rounds.length}`} detail="completadas" icon="calendar" />
              </>
            ) : (
              <>
                <OverviewKpi label="Partidos" value={playedMatches.length} detail="completados" icon="field" />
                <OverviewKpi label="Goles" value={totalGoals} detail={playedMatches.length ? `${goalAverage.toFixed(2)} por partido` : "0 por partido"} icon="ball" />
                <OverviewKpi label="Amarillas" value={calendarCompetitionYellows} detail={playedMatches.length ? `${(calendarCompetitionYellows / playedMatches.length).toFixed(2)} por partido` : "0 por partido"} icon="yellow" />
                <OverviewKpi label="Rojas" value={calendarCompetitionReds} detail={playedMatches.length ? `${(calendarCompetitionReds / playedMatches.length).toFixed(2)} por partido` : "0 por partido"} icon="red" />
              </>
            )}
          </section>

          {isGroupCompetition && groupStandings.length > 0 ? (
            <section id="competition-groups" className="v3113-group-overview v3113-card">
              <div className="v3113-card-head v3113-group-overview-head">
                <div>
                  <h3>Situación de los grupos</h3>
                  <span>{groupStandings.length} grupos · clasificación actual</span>
                </div>
                <button type="button" onClick={() => setTab("standings")}>Ver clasificación completa →</button>
              </div>
              <div className="v3113-group-grid">
                {groupStandings.map((group) => (
                  <div className="v3113-group-card" key={group.groupName}>
                    <div className="v3113-group-title">
                      <strong>{group.groupName}</strong>
                      <span>{group.standings.length} equipos</span>
                    </div>
                    <div className="v3113-group-table-head">
                      <span>#</span><span>Club</span><span>PJ</span><span>DG</span><span>Pts</span>
                    </div>
                    {group.standings.map((row) => {
                      const zone = qualificationZones.find(
                        (item) =>
                          item.groupName === group.groupName &&
                          row.position >= item.startPosition &&
                          row.position <= item.endPosition
                      );
                      return (
                        <Link
                          href={`/clubes/${row.teamCode}/historial`}
                          className={`v3113-group-row${zone ? " is-qualified-zone" : ""}`}
                          key={`${group.groupName}-${row.teamCode}`}
                          title={zone?.label}
                        >
                          <span
                            className="v3113-group-pos"
                            style={zone ? { backgroundColor: zone.color, color: contrastText(zone.color) } : undefined}
                          >
                            {row.position}
                          </span>
                          <span className="v3113-group-club">
                            <Image src={getClubLogo(row.teamCode)} alt="" width={22} height={22} />
                            <b>{getClubName(row.teamCode)}</b>
                            {zone ? <i className="v3113-group-zone-line" style={{ backgroundColor: zone.color }} /> : null}
                          </span>
                          <span>{row.played}</span>
                          <span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
                          <strong>{row.points}</strong>
                        </Link>
                      );
                    })}
                    {qualificationZones.some((zone) => zone.groupName === group.groupName) ? (
                      <div className="v3113-group-zone-legend">
                        {qualificationZones
                          .filter((zone) => zone.groupName === group.groupName)
                          .map((zone) => (
                            <span key={zone.id}><i style={{ backgroundColor: zone.color }} />{zone.label}</span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : isGroupCompetition ? <section id="competition-groups" className="competition-format-empty">Los grupos aparecerán aquí cuando se asignen sus equipos.</section> : null}

          <div className={`v3113-main-grid ${isGroupCompetition ? "is-groups" : ""}`}>
            <section className="v3113-card v3113-results-card">
              <div className="v3113-card-head">
                <div>
                  <h3>{isKnockout ? "Última ronda" : "Última jornada"}</h3>
                  <span>{effectiveResultsRound?.name ?? "—"}</span>
                </div>
              </div>

              <div className="v3113-results-list">
                {effectiveResultsMatches.length ? (
                  effectiveResultsMatches.map((match) => (
                    <Link
                      href={`/partidos/${match.id}`}
                      className="v3113-result-row"
                      key={match.id}
                    >
                      <span className="v3113-result-team is-home">
                        <Image
                          src={getClubLogo(match.homeTeamCode)}
                          alt=""
                          width={25}
                          height={25}
                        />
                        <b>{getClubName(match.homeTeamCode)}</b>
                      </span>
                      <strong>{match.homeScore} - {match.awayScore}</strong>
                      {isGroupCompetition ? <small className="v3113-group-badge">{groupByTeam.get(match.homeTeamCode) ?? "Grupo"}</small> : null}
                      <span className="v3113-result-team is-away">
                        <Image
                          src={getClubLogo(match.awayTeamCode)}
                          alt=""
                          width={25}
                          height={25}
                        />
                        <b>{getClubName(match.awayTeamCode)}</b>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="v3113-empty">Sin resultados.</p>
                )}
              </div>

              <button
                type="button"
                className="v3113-gold-button"
                onClick={() => setTab("results")}
              >
                Ver todos los resultados →
              </button>
            </section>

            <section className="v3113-center-stack">
              {isKnockout ? (
                <div className="v3113-card competition-format-callout"><h3>Ronda a ronda</h3><p>Consulta los cruces y resultados en el cuadro de eliminatorias.</p><button type="button" className="v3113-gold-button" onClick={() => setTab("standings")}>Ver eliminatorias →</button></div>
              ) : !isGroupCompetition ? (
                <div className="v3113-card">
                  <div className="v3113-card-head">
                    <div><h3>Clasificación (Top 5)</h3></div>
                    <button type="button" onClick={() => setTab("standings")}>Ver completa →</button>
                  </div>
                  <div className="v3113-top-table">
                    <div className="v3113-top-table-head"><span>#</span><span>Club</span><span>PJ</span><span>Pts</span><span>DG</span><span>Forma</span></div>
                    {standings.slice(0, 5).map((row) => {
                      const zone = standingZones.find((item) => row.position >= item.startPosition && row.position <= item.endPosition);
                      return (
                        <Link href={`/clubes/${row.teamCode}/historial`} className="v3113-top-table-row" key={row.teamCode}>
                          <span className="v3113-top-pos" style={zone ? { backgroundColor: zone.color, color: contrastText(zone.color) } : undefined}>{row.position}</span>
                          <span className="v3113-top-club"><Image src={getClubLogo(row.teamCode)} alt="" width={22} height={22} /><b>{getClubName(row.teamCode)}</b></span>
                          <span>{row.played}</span><strong>{row.points}</strong><span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
                          <FormDots teamCode={row.teamCode} matches={playedMatches} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="v3113-card v3113-group-info-card">
                  <div className="v3113-card-head"><div><h3>Fase de grupos</h3><span>Resumen de la competición</span></div></div>
                  <div className="v3113-group-info-list">
                    <div><span>Grupos</span><strong>{groupStandings.length}</strong></div>
                    <div><span>Equipos</span><strong>{teams.length}</strong></div>
                    <div><span>Jornadas</span><strong>{completedRounds} / {rounds.length}</strong></div>
                    <div><span>Partidos pendientes</span><strong>{pendingMatches.length}</strong></div>
                  </div>
                  <button type="button" className="v3113-gold-button" onClick={() => setTab("standings")}>Ver todos los grupos →</button>
                </div>
              )}

              <div className="v3113-card">
                <div className="v3113-card-head">
                  <div>
                    <h3>{isKnockout ? "Próxima ronda" : "Próxima jornada"}</h3>
                    <span>{nextRound?.name ?? "—"}</span>
                  </div>
                </div>

                <div className="v3113-next-list">
                  {nextRoundMatches.length ? (
                    nextRoundMatches.slice(0, 5).map((match) => (
                      <div className="v3113-next-row" key={match.id}>
                        <span>
                          <Image
                            src={getClubLogo(match.homeTeamCode)}
                            alt=""
                            width={22}
                            height={22}
                          />
                          {getClubName(match.homeTeamCode)}
                        </span>
                        <b>VS</b>
                        <span className="is-away">
                          {getClubName(match.awayTeamCode)}
                          <Image
                            src={getClubLogo(match.awayTeamCode)}
                            alt=""
                            width={22}
                            height={22}
                          />
                        </span>
                        <small>{formatCalendarMatchDate(match)}</small>
                      </div>
                    ))
                  ) : (
                    <p className="v3113-empty">No hay próxima jornada.</p>
                  )}
                </div>

                <button
                  type="button"
                  className="v3113-gold-button"
                  onClick={() => setTab("calendar")}
                >
                  Ver calendario completo →
                </button>
              </div>
            </section>

            <section className="v3113-right-stack">
              <OverviewRankingCard
                title="Goleadores"
                button="Ver todos →"
                onClick={() => setTab("scorers")}
                rows={[...rankings]
                  .filter((row) => row.goals > 0)
                  .sort((a, b) => b.goals - a.goals || a.minutes - b.minutes)
                  .slice(0, 5)}
                value={(row) => row.goals}
              />

              <OverviewRankingCard
                title="Asistencias"
                button="Ver todas →"
                onClick={() => setTab("assists")}
                rows={[...rankings]
                  .filter((row) => row.assists > 0)
                  .sort(
                    (a, b) =>
                      b.assists - a.assists || a.minutes - b.minutes
                  )
                  .slice(0, 5)}
                value={(row) => row.assists}
              />
            </section>
          </div>

          <div className="v3113-bottom-grid">
            <section className="v3113-card">
              <div className="v3113-card-head">
                <div><h3>Datos de la temporada</h3></div>
              </div>

              <div className="v3113-season-data">
                <SeasonData
                  value={playedMatches.length}
                  label="partidos jugados"
                  icon="field"
                />
                <SeasonData
                  value={totalGoals}
                  label="goles totales"
                  icon="ball"
                />
                <SeasonData
                  value={goalAverage.toFixed(2)}
                  label="goles por partido"
                  icon="boot"
                />
                <SeasonData
                  value={overviewBiggestWinLabel}
                  label="mayor goleada"
                  icon="target"
                />
                <SeasonData
                  value={calendarCompetitionYellows}
                  label="amarillas"
                  icon="yellow"
                />
                <SeasonData
                  value={calendarCompetitionReds}
                  label="rojas"
                  icon="red"
                />
                <SeasonData
                  value={teams.length}
                  label="equipos"
                  icon="people"
                />
              </div>
            </section>

            <section className="v3113-card">
              <div className="v3113-card-head">
                <div><h3>Mejores rachas</h3></div>
              </div>
              <StreakRanking rows={buildStandingStreaks(overviewStandings, playedMatches)} />
            </section>

            <section className="v3113-card">
              <div className="v3113-card-head">
                <div><h3>Últimos campeones</h3></div>
                {competition.seriesId ? (
                  <button type="button" onClick={() => setTab("history")}>
                    Ver historial →
                  </button>
                ) : null}
              </div>

              <OverviewChampions rows={historyEditions} />
            </section>
          </div>
        </div>
      )}
      {tab === "standings" && (
        isKnockout ? (
          <CompetitionKnockoutView rounds={rounds} matches={matches} />
        ) : competition.type === "LEAGUE" ? (
          <div className="v3111-standings-page">
            <section className="v3111-hero">
              <Image
                src="/competitions/standings-v3111.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="v3111-hero-image"
              />
              <div className="v3111-hero-shade" />
              <div className="v3111-hero-copy">
                <span>{TYPE_LABEL[competition.type]}</span>
                <strong>{competition.name}</strong>
                <h2>Clasificación</h2>
                <p>{competition.seasonName}</p>
              </div>
              <blockquote>“EL ESFUERZO<br />DE HOY,<br />LA LEYENDA<br />DE MAÑANA”</blockquote>
            </section>

            <div className="v3111-layout">
              <section className="v3111-main-card">
                <div className="v3111-card-title">
                  <div>
                    <h2>Clasificación general</h2>
                    <p>
                      {playedMatches.length} partidos disputados · sistema
                      {` ${competition.pointsWin}/${competition.pointsDraw}/${competition.pointsLoss}`}
                    </p>
                  </div>

                  {standingZones.length > 0 ? (
                    <div className="v3111-zone-legend">
                      {standingZones.map((zone) => (
                        <span key={zone.id}>
                          <i style={{ backgroundColor: zone.color }} />
                          {zone.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="v3111-neutral-note">
                      Sin zonas configuradas
                    </span>
                  )}
                </div>

                <StandingsTable
                  rows={standings}
                  matches={playedMatches}
                  zones={standingZones}
                />
              </section>

              <aside className="v3111-side">
                <section className="v3111-side-card">
                  <h3>Resumen de la competición</h3>
                  <StandingSummary
                    label="Partidos jugados"
                    value={playedMatches.length}
                    icon="field"
                  />
                  <StandingSummary
                    label="Goles"
                    value={totalGoals}
                    detail={`${goalAverage.toFixed(2)} por partido`}
                    icon="ball"
                  />
                  <StandingSummary
                    label="Amarillas"
                    value={calendarCompetitionYellows}
                    detail={
                      playedMatches.length
                        ? `${(calendarCompetitionYellows / playedMatches.length).toFixed(2)} por partido`
                        : "0 por partido"
                    }
                    icon="yellow"
                  />
                  <StandingSummary
                    label="Rojas"
                    value={calendarCompetitionReds}
                    detail={
                      playedMatches.length
                        ? `${(calendarCompetitionReds / playedMatches.length).toFixed(2)} por partido`
                        : "0 por partido"
                    }
                    icon="red"
                  />
                </section>

                <section className="v3111-side-card">
                  <h3>Mejores rachas</h3>
                  <StreakRanking
                    rows={buildStandingStreaks(standings, playedMatches)}
                  />
                </section>

                <section className="v3111-side-card">
                  <div className="v3111-side-card-head">
                    <h3>{isKnockout ? "Próxima ronda" : "Próxima jornada"}</h3>
                    <span>{nextRound?.name ?? "—"}</span>
                  </div>
                  <div className="v3111-next-list">
                    {nextRoundMatches.length ? (
                      nextRoundMatches.map((match) => (
                        <div className="v3111-next-row" key={match.id}>
                          <Image
                            src={getClubLogo(match.homeTeamCode)}
                            alt=""
                            width={22}
                            height={22}
                          />
                          <span>{getClubName(match.homeTeamCode)}</span>
                          <b>VS</b>
                          <span>{getClubName(match.awayTeamCode)}</span>
                          <Image
                            src={getClubLogo(match.awayTeamCode)}
                            alt=""
                            width={22}
                            height={22}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="v3111-empty">No hay próxima jornada.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="v3111-calendar-link"
                    onClick={() => setTab("calendar")}
                  >
                    Ver calendario completo →
                  </button>
                </section>
              </aside>
            </div>

            <div className="v3111-split-grid">
              <MiniStandingTable
                title="Clasificación en casa"
                rows={buildSplitStandings(
                  teams,
                  playedMatches,
                  "HOME",
                  competition
                ).slice(0, 5)}
              />
              <MiniStandingTable
                title="Clasificación fuera de casa"
                rows={buildSplitStandings(
                  teams,
                  playedMatches,
                  "AWAY",
                  competition
                ).slice(0, 5)}
              />
            </div>
          </div>
        ) : (competition.type === "GROUPS" || competition.type === "GROUPS_KNOCKOUT") && groupStandings.length > 0 ? (
          <div id="competition-groups" className="v3111-standings-page v3111-groups-standings-page">
            <section className="v3111-hero">
              <Image
                src="/competitions/standings-v3111.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="v3111-hero-image"
              />
              <div className="v3111-hero-shade" />
              <div className="v3111-hero-copy">
                <span>{TYPE_LABEL[competition.type]}</span>
                <strong>{competition.name}</strong>
                <h2>Clasificación por grupos</h2>
                <p>{competition.seasonName}</p>
              </div>
              <blockquote>“CADA PUNTO<br />CUENTA EN<br />EL CAMINO<br />A LA GLORIA”</blockquote>
            </section>

            <section className="v3111-groups-grid">
              {groupStandings.map((group) => {
                const groupCodes = new Set(group.standings.map((row) => row.teamCode));
                const groupMatches = playedMatches.filter(
                  (match) =>
                    groupCodes.has(match.homeTeamCode) &&
                    groupCodes.has(match.awayTeamCode)
                );

                return (
                  <article className="v3111-main-card v3111-group-card" key={group.groupName}>
                    <div className="v3111-card-title">
                      <div>
                        <h2>{group.groupName}</h2>
                        <p>{groupMatches.length} partidos disputados · {group.standings.length} equipos</p>
                      </div>
                      {qualificationZones.some((zone) => zone.groupName === group.groupName) ? (
                        <div className="v3111-zone-legend">
                          {qualificationZones
                            .filter((zone) => zone.groupName === group.groupName)
                            .map((zone) => (
                              <span key={zone.id}><i style={{ backgroundColor: zone.color }} />{zone.label}</span>
                            ))}
                        </div>
                      ) : (
                        <span className="v3111-neutral-note">
                          Sistema {competition.pointsWin}/{competition.pointsDraw}/{competition.pointsLoss}
                        </span>
                      )}
                    </div>
                    <StandingsTable
                      rows={group.standings}
                      matches={groupMatches}
                      zones={qualificationZones.filter((zone) => zone.groupName === group.groupName)}
                    />
                  </article>
                );
              })}
            </section>
          </div>
        ) : (
          <div id="competition-groups"><Panel title="Grupos" large>
            <Empty text="Esta competición todavía no tiene grupos con equipos asignados." />
          </Panel></div>
        )
      )}

      {(tab === "overview" || tab === "standings") && competition.type === "GROUPS_KNOCKOUT" && <CompetitionKnockoutView rounds={rounds} matches={matches} mixed />}

      {tab === "results" && (
        <div className="v3112-results-page">
          <section className="v3112-hero">
            <Image
              src="/competitions/results-v3112.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="v3112-hero-image"
            />
            <div className="v3112-hero-shade" />
            <div className="v3112-hero-copy">
              <span>{TYPE_LABEL[competition.type]}</span>
              <strong>{competition.name}</strong>
              <h2>Resultados</h2>
              <p>{competition.seasonName}</p>
            </div>
            <blockquote>
              “LOS RESULTADOS<br />
              DE HOY,<br />
              LAS LEYENDAS<br />
              DE MAÑANA”
            </blockquote>
          </section>

          <div className="v3112-layout">
            <section className="v3112-main-card">
              <div className="v3112-card-head">
                <div>
                  <h2>Resultados de la temporada</h2>
                  <p>Consulta una jornada concreta o filtra por club.</p>
                </div>

                <div className="v3112-filter-row">
                  <label>
                    <span>Jornada</span>
                    <select
                      value={effectiveResultsRoundId}
                      onChange={(event) =>
                        setResultsRoundId(event.target.value)
                      }
                    >
                      {resultsPlayedRounds.map((round) => (
                        <option value={round.id} key={round.id}>
                          {round.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Club</span>
                    <select
                      value={resultsClub}
                      onChange={(event) => setResultsClub(event.target.value)}
                    >
                      <option value="ALL">Todos los clubes</option>
                      {teams.map((teamCode) => (
                        <option value={teamCode} key={teamCode}>
                          {getClubName(teamCode)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {isGroupCompetition ? (
                <div className="v3126-groups-results">
                  {groupStandings.map((group) => {
                    const groupMatches = filteredResultsMatches.filter(
                      (match) => groupByTeam.get(match.homeTeamCode) === group.groupName
                    );

                    if (resultsClub !== "ALL" && groupMatches.length === 0) return null;

                    return (
                      <section className="v3126-group-results-card" key={`results-${group.groupName}`}>
                        <div className="v3126-group-section-head">
                          <div>
                            <span>Fase de grupos</span>
                            <strong>{group.groupName}</strong>
                          </div>
                          <small>{groupMatches.length} {groupMatches.length === 1 ? "partido" : "partidos"}</small>
                        </div>
                        <ResultsRoundBlock
                          round={effectiveResultsRound}
                          matches={groupMatches}
                        />
                      </section>
                    );
                  })}
                </div>
              ) : (
                <>
                  <ResultsRoundBlock
                    round={effectiveResultsRound}
                    matches={filteredResultsMatches}
                  />

                  {resultsClub === "ALL" && previousPlayedRound ? (
                    <ResultsRoundBlock
                      round={previousPlayedRound}
                      matches={previousPlayedRoundMatches.slice(0, 5)}
                      compact
                    />
                  ) : null}
                </>
              )}
            </section>

            <aside className="v3112-side">
              <section className="v3112-side-card">
                <div className="v3112-side-head">
                  <h3>{isKnockout ? "Última ronda" : "Última jornada"}</h3>
                  <span>{effectiveResultsRound?.name ?? "—"}</span>
                </div>

                <div className="v3112-kpi-grid">
                  <ResultsKpi
                    value={effectiveResultsMatches.length}
                    label="partidos"
                    icon="field"
                  />
                  <ResultsKpi
                    value={resultsRoundGoals}
                    label="goles"
                    detail={
                      effectiveResultsMatches.length
                        ? `${(
                            resultsRoundGoals / effectiveResultsMatches.length
                          ).toFixed(2)} por partido`
                        : "0 por partido"
                    }
                    icon="ball"
                  />
                  <ResultsKpi
                    value={resultsRoundYellows}
                    label="amarillas"
                    detail={
                      effectiveResultsMatches.length
                        ? `${(
                            resultsRoundYellows /
                            effectiveResultsMatches.length
                          ).toFixed(2)} por partido`
                        : "0 por partido"
                    }
                    icon="yellow"
                  />
                  <ResultsKpi
                    value={resultsRoundReds}
                    label="rojas"
                    detail={
                      effectiveResultsMatches.length
                        ? `${(
                            resultsRoundReds / effectiveResultsMatches.length
                          ).toFixed(2)} por partido`
                        : "0 por partido"
                    }
                    icon="red"
                  />
                </div>

                <div className="v3112-dp-note">
                  <b>Disciplina ESMS</b>
                  <span>DP = 1 → amarilla · DP = 10 → roja</span>
                </div>
              </section>

              <section className="v3112-side-card">
                <h3>Resultados destacados</h3>
                <div className="v3112-highlights">
                  {highlightedResults.length ? (
                    highlightedResults.map((match) => (
                      <Link
                        href={`/partidos/${match.id}`}
                        className="v3112-highlight"
                        key={match.id}
                      >
                        <span>
                          {getClubName(match.homeTeamCode)}
                          <Image
                            src={getClubLogo(match.homeTeamCode)}
                            alt=""
                            width={25}
                            height={25}
                          />
                        </span>
                        <strong>
                          {match.homeScore} - {match.awayScore}
                        </strong>
                        <span className="is-away">
                          <Image
                            src={getClubLogo(match.awayTeamCode)}
                            alt=""
                            width={25}
                            height={25}
                          />
                          {getClubName(match.awayTeamCode)}
                        </span>
                        <small>{isGroupCompetition ? `${groupByTeam.get(match.homeTeamCode) ?? "Grupo"} · ` : ""}{resultHighlightText(match)}</small>
                      </Link>
                    ))
                  ) : (
                    <p className="v3112-empty">No hay resultados.</p>
                  )}
                </div>
              </section>

              <section className="v3112-side-card">
                <h3>Todos los resultados</h3>
                <div className="v3112-round-list">
                  {resultsPlayedRounds.slice(0, 6).map((round) => (
                    <button
                      type="button"
                      key={round.id}
                      className={
                        round.id === effectiveResultsRoundId ? "is-active" : ""
                      }
                      onClick={() => {
                        setResultsRoundId(round.id);
                        setResultsClub("ALL");
                      }}
                    >
                      <strong>{round.name}</strong>
                      <span>{formatRoundDates(round) ?? "—"}</span>
                      <b>→</b>
                    </button>
                  ))}
                </div>

                {resultsPlayedRounds.length > 6 ? (
                  <button
                    type="button"
                    className="v3112-all-rounds"
                    onClick={() => setTab("calendar")}
                  >
                    Ver todas las jornadas →
                  </button>
                ) : null}
              </section>
            </aside>
          </div>
        </div>
      )}
      {tab === "calendar" && (
        <div className="v3110-calendar-page">
          <section className="v3110-calendar-hero">
            <Image src="/competitions/calendar-v3110.jpg" alt="" fill priority sizes="100vw" className="v3110-calendar-hero-image" />
            <div className="v3110-calendar-shade" />
            <div className="v3110-calendar-copy">
              <span>{TYPE_LABEL[competition.type]}</span>
              <strong>{competition.name}</strong>
              <h2>Calendario de la competición</h2>
              <p>Consulta todas las jornadas, resultados y próximos partidos.</p>
            </div>
            <blockquote>“CADA JORNADA<br />ESCRIBE UNA<br />NUEVA HISTORIA”</blockquote>
          </section>

          <div className="v3110-toolbar">
            <label><span>Jornada</span><select value={selectedRoundId} onChange={(e)=>setRoundId(e.target.value)}>{rounds.map((round)=><option value={round.id} key={round.id}>{round.name}</option>)}</select></label>
            <div className="v3110-round-nav">
              <button type="button" disabled={!calendarPreviousRound} onClick={()=>calendarPreviousRound&&setRoundId(calendarPreviousRound.id)}>← Anterior</button>
              <strong>{selectedRound?.name ?? "Jornada"}</strong>
              <button type="button" disabled={!calendarNextRound} onClick={()=>calendarNextRound&&setRoundId(calendarNextRound.id)}>Siguiente →</button>
            </div>
          </div>

          <div className="v3110-layout">
            <section className="v3110-main">
              <div className="v3110-heading"><div><h2>{selectedRound?.name ?? "Jornada"}</h2><p>{formatRoundDates(selectedRound)}</p></div><span>{selectedRoundMatches.filter(m=>m.status==="PLAYED").length}/{selectedRoundMatches.length} disputados</span></div>

              {isGroupCompetition ? (
                <div className="v3126-calendar-groups">
                  {groupStandings.map((group) => {
                    const groupMatches = selectedRoundMatches.filter(
                      (match) => groupByTeam.get(match.homeTeamCode) === group.groupName
                    );
                    const playedCount = groupMatches.filter((match) => match.status === "PLAYED").length;

                    return (
                      <section className="v3126-calendar-group" key={`calendar-${group.groupName}`}>
                        <div className="v3126-group-section-head">
                          <div>
                            <span>{selectedRound?.name ?? "Jornada"}</span>
                            <strong>{group.groupName}</strong>
                          </div>
                          <small>{playedCount}/{groupMatches.length} disputados</small>
                        </div>
                        <div className="v3110-fixtures">
                          {groupMatches.length ? groupMatches.map((match)=>{
                            const played=match.status==="PLAYED"&&match.homeScore!==null&&match.awayScore!==null;
                            return <Link href={`/partidos/${match.id}`} className={`v3110-fixture ${played?"is-played":"is-next"}`} key={match.id}>
                              <span className="v3110-date">{formatCalendarMatchDate(match)}</span>
                              <span className="v3110-home"><b>{getClubName(match.homeTeamCode)}</b><Image src={getClubLogo(match.homeTeamCode)} alt="" width={30} height={30}/></span>
                              <strong className="v3110-score">{played?`${match.homeScore} - ${match.awayScore}`:"VS"}</strong>
                              <span className="v3110-away"><Image src={getClubLogo(match.awayTeamCode)} alt="" width={30} height={30}/><b>{getClubName(match.awayTeamCode)}</b></span>
                              <span className={`v3110-status ${played?"done":"next"}`}>{played?"Finalizado":"Próximo"}</span>
                            </Link>
                          }) : <p className="v3126-empty-group">No hay partidos de este grupo en esta jornada.</p>}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="v3110-fixtures">
                  {selectedRoundMatches.map((match)=>{
                    const played=match.status==="PLAYED"&&match.homeScore!==null&&match.awayScore!==null;
                    return <Link href={`/partidos/${match.id}`} className={`v3110-fixture ${played?"is-played":"is-next"}`} key={match.id}>
                      <span className="v3110-date">{formatCalendarMatchDate(match)}</span>
                      <span className="v3110-home"><b>{getClubName(match.homeTeamCode)}</b><Image src={getClubLogo(match.homeTeamCode)} alt="" width={30} height={30}/></span>
                      <strong className="v3110-score">{played?`${match.homeScore} - ${match.awayScore}`:"VS"}</strong>
                      <span className="v3110-away"><Image src={getClubLogo(match.awayTeamCode)} alt="" width={30} height={30}/><b>{getClubName(match.awayTeamCode)}</b></span>
                      <span className={`v3110-status ${played?"done":"next"}`}>{played?"Finalizado":"Próximo"}</span>
                    </Link>
                  })}
                </div>
              )}
            </section>

            <aside className="v3110-side">
              <div className="v3110-card">
                <h3>Información de la jornada</h3>
                <div className="v3110-info-grid">
                  <CalendarInfo value={selectedRoundMatches.length} label="Partidos" />
                  <CalendarInfo value={calendarRoundGoals} label="Goles" />
                  <CalendarInfo value={calendarRoundYellows} label="Amarillas" card="yellow" />
                  <CalendarInfo value={calendarRoundReds} label="Rojas" card="red" />
                </div>
                <div className="v3110-note"><b>Disciplina ESMS</b><span>DP = 1 → amarilla · DP = 10 → roja</span></div>
              </div>

              <div className="v3110-card">
                <h3>Próximo partido</h3>
                {calendarNextMatch ? <Link href="#" className="v3110-next-match">
                  <span>{formatCalendarMatchDate(calendarNextMatch)}</span>
                  <div><Image src={getClubLogo(calendarNextMatch.homeTeamCode)} alt="" width={42} height={42}/><strong>VS</strong><Image src={getClubLogo(calendarNextMatch.awayTeamCode)} alt="" width={42} height={42}/></div>
                  <b>{getClubName(calendarNextMatch.homeTeamCode)} · {getClubName(calendarNextMatch.awayTeamCode)}</b>
                </Link>:<p className="v3110-empty">No quedan partidos pendientes en esta jornada.</p>}
              </div>

              <div className="v3110-card">
                <h3>Resumen de la competición</h3>
                <div className="v3110-summary-row"><span>Jornadas</span><strong>{rounds.length}</strong></div>
                <div className="v3110-summary-row"><span>Partidos disputados</span><strong>{playedMatches.length}</strong></div>
                <div className="v3110-summary-row"><span>Goles</span><strong>{totalGoals}</strong></div>
                <div className="v3110-summary-row"><span>Amarillas</span><strong>{calendarCompetitionYellows}</strong></div>
                <div className="v3110-summary-row"><span>Rojas</span><strong>{calendarCompetitionReds}</strong></div>
              </div>
            </aside>
          </div>
        </div>
      )}
      {tab === "scorers" && (
        <div className="v316-scorers-page">
          <section className="v316-scorers-hero">
            <Image
              src="/competitions/scorers-v316.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="v316-scorers-hero-image"
            />
            <div className="v316-scorers-hero-shade" />
            <div className="v316-scorers-hero-copy">
              <span>{TYPE_LABEL[competition.type]}</span>
              <strong>{competition.name}</strong>
              <h2>Máximos goleadores</h2>
              <p>Los futbolistas más decisivos de la competición.</p>
              <div className="v316-scorers-hero-kpis">
                <MiniHeroStat value={rounds.length} label="Jornadas" />
                <MiniHeroStat value={totalCompetitionGoals} label="Goles totales" />
                <MiniHeroStat value={goalAverage.toFixed(2)} label="Goles / partido" />
              </div>
            </div>
            <blockquote>“LOS GOLES<br />TAMBIÉN HACEN<br />HISTORIA”</blockquote>
          </section>

          <div className="v316-scorers-layout">
            <section className="v316-scorers-main">
              <div className="v316-scorers-head">
                <div>
                  <h2>Clasificación de goleadores</h2>
                  <p>Ranking acumulado de la edición actual.</p>
                </div>
              </div>

              <div className="v316-scorer-filters">
                <label>
                  <span>Posición</span>
                  <select
                    value={scorerPosition}
                    onChange={(event) => setScorerPosition(event.target.value)}
                  >
                    <option value="ALL">Todas las posiciones</option>
                    {scorerPositions.map((position) => (
                      <option value={position} key={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Club</span>
                  <select
                    value={scorerClub}
                    onChange={(event) => setScorerClub(event.target.value)}
                  >
                    <option value="ALL">Todos los clubes</option>
                    {teams
                      .slice()
                      .sort((a, b) =>
                        getClubName(a).localeCompare(getClubName(b))
                      )
                      .map((code) => (
                        <option value={code} key={code}>
                          {getClubName(code)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <ScorerTable rows={scorerRows} />
            </section>

            <aside className="v316-scorers-side">
              <section className="v316-side-card">
                <div className="v316-side-head">
                  <h3>Datos destacados</h3>
                </div>
                <div className="v316-highlight-grid">
                  <ScorerHighlight
                    icon="boot"
                    value={scorerRows[0]?.goals ?? 0}
                    title={scorerRows[0]?.displayName ?? "Sin datos"}
                    subtitle="Máximo goleador"
                  />
                  <ScorerHighlight
                    icon="goal"
                    value={goalAverage.toFixed(2)}
                    title="Promedio"
                    subtitle="Goles por partido"
                  />
                  <ScorerHighlight
                    icon="players"
                    value={scoringPlayers}
                    title="Jugadores"
                    subtitle="Han marcado"
                  />
                  <ScorerHighlight
                    icon="ball"
                    value={totalCompetitionGoals}
                    title="Total"
                    subtitle="Goles anotados"
                  />
                </div>
              </section>

              <section className="v316-side-card">
                <div className="v316-side-head">
                  <h3>Goles por posición</h3>
                </div>
                <div className="v316-position-bars">
                  {goalsByPosition.map((row) => (
                    <div className="v316-position-row" key={row.position}>
                      <span>{row.position}</span>
                      <i>
                        <u
                          style={{
                            width: `${(row.goals / maxPositionGoals) * 100}%`,
                          }}
                        />
                      </i>
                      <strong>{row.goals}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <MiniScorerRanking
                title="Top 5 · Promedio goleador"
                rows={bestGoalRates}
                value={(row) => goalsPerAppearance(row).toFixed(2)}
              />

              <MiniScorerRanking
                title="Más hat-tricks"
                rows={topHatTricks}
                value={(row) => String(row.hatTricks)}
              />
            </aside>
          </div>
        </div>
      )}

      {tab === "assists" && (
        <div className="v317-assists-page">
          <section className="v317-assists-hero">
            <Image
              src="/competitions/assists-v317.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="v317-assists-hero-image"
            />
            <div className="v317-assists-hero-shade" />

            <div className="v317-assists-hero-copy">
              <span>{TYPE_LABEL[competition.type]}</span>
              <strong>{competition.name}</strong>
              <h2>Máximos asistentes</h2>
              <p>La creatividad también gana títulos.</p>

              <div className="v317-assists-hero-kpis">
                <MiniHeroStat value={rounds.length} label="Jornadas" />
                <MiniHeroStat
                  value={totalCompetitionAssists}
                  label="Asistencias totales"
                />
                <MiniHeroStat
                  value={assistAverage.toFixed(2)}
                  label="Asistencias / partido"
                />
              </div>
            </div>

            <blockquote>
              “EL ÚLTIMO PASE
              <br />
              TAMBIÉN ES
              <br />
              ARTE”
            </blockquote>
          </section>

          <div className="v317-assists-layout">
            <section className="v317-assists-main">
              <div className="v317-assists-head">
                <div>
                  <h2>Clasificación de asistentes</h2>
                  <p>Ranking acumulado de la edición actual.</p>
                </div>
              </div>

              <div className="v317-assist-filters">
                <label>
                  <span>Posición</span>
                  <select
                    value={assistPosition}
                    onChange={(event) =>
                      setAssistPosition(event.target.value)
                    }
                  >
                    <option value="ALL">Todas las posiciones</option>
                    {assistPositions.map((position) => (
                      <option value={position} key={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Club</span>
                  <select
                    value={assistClub}
                    onChange={(event) =>
                      setAssistClub(event.target.value)
                    }
                  >
                    <option value="ALL">Todos los clubes</option>
                    {teams
                      .slice()
                      .sort((a, b) =>
                        getClubName(a).localeCompare(getClubName(b))
                      )
                      .map((code) => (
                        <option value={code} key={code}>
                          {getClubName(code)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <AssistTable rows={assistRows} />
            </section>

            <aside className="v317-assists-side">
              <section className="v317-side-card">
                <div className="v317-side-head">
                  <h3>Datos destacados</h3>
                </div>

                <div className="v317-highlight-grid">
                  <AssistHighlight
                    icon="boot"
                    value={assistRows[0]?.assists ?? 0}
                    title={assistRows[0]?.displayName ?? "Sin datos"}
                    subtitle="Máximo asistente"
                  />
                  <AssistHighlight
                    icon="players"
                    value={assistingPlayers}
                    title="Jugadores"
                    subtitle="Han asistido"
                  />
                  <AssistHighlight
                    icon="goal"
                    value={assistAverage.toFixed(2)}
                    title="Promedio"
                    subtitle="Asistencias / partido"
                  />
                  <AssistHighlight
                    icon="ball"
                    value={totalCompetitionAssists}
                    title="Total"
                    subtitle="Asistencias"
                  />
                </div>
              </section>

              <section className="v317-side-card">
                <div className="v317-side-head">
                  <h3>Asistencias por posición</h3>
                </div>

                <div className="v317-position-bars">
                  {assistsByPosition.map((row) => (
                    <div
                      className="v317-position-row"
                      key={row.position}
                    >
                      <span>{positionLabel(row.position)}</span>
                      <i>
                        <u
                          style={{
                            width: `${(row.assists / maxPositionAssists) * 100}%`,
                          }}
                        />
                      </i>
                      <strong>{row.assists}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <MiniAssistRanking
                title="Top 5 · Promedio de asistencias"
                subtitle="mín. 900 minutos"
                rows={bestAssistRates}
                value={(row) =>
                  assistsPerAppearance(row).toFixed(2)
                }
              />

              <section className="v317-side-card">
                <div className="v317-side-head">
                  <h3>Más asistencias en un partido</h3>
                </div>

                <div className="v317-match-assist-records">
                  {topSingleMatchAssists.length ? (
                    topSingleMatchAssists.map((row) => (
                      <Link
                        href={
                          row.maxAssistsMatchId
                            ? `/partidos/${row.maxAssistsMatchId}`
                            : row.playerId
                              ? `/jugadores/${row.playerId}`
                              : "/buscador"
                        }
                        className="v317-match-assist-record"
                        key={`${row.playerId ?? row.esmsName}-max-assists`}
                      >
                        <span className="v317-record-photo">
                          {row.photoUrl ? (
                            <Image
                              src={row.photoUrl}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            row.displayName.slice(0, 1)
                          )}
                        </span>

                        <span>
                          <strong>{row.displayName}</strong>
                          <b>
                            {row.maxAssistsInMatch}{" "}
                            {row.maxAssistsInMatch === 1
                              ? "asistencia"
                              : "asistencias"}
                          </b>
                          <small>{getClubName(row.teamCode)}</small>
                        </span>

                        <Image
                          src={getClubLogo(row.teamCode)}
                          alt=""
                          width={30}
                          height={30}
                        />
                      </Link>
                    ))
                  ) : (
                    <div className="v317-mini-empty">
                      Sin registros todavía.
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {tab === "keepers" && (
        <div className="v318-keepers-page">
          <section className="v318-keepers-hero">
            <Image src="/competitions/keepers-v318.jpg" alt="" fill priority sizes="100vw" className="v318-keepers-hero-image" />
            <div className="v318-keepers-hero-shade" />
            <div className="v318-keepers-hero-copy">
              <span>{TYPE_LABEL[competition.type]}</span>
              <strong>{competition.name}</strong>
              <h2>Última línea, grandes leyendas</h2>
              <p>Paradas que valen títulos.</p>
              <div className="v318-keepers-hero-kpis">
                <MiniHeroStat value={rounds.length} label="Jornadas" />
                <MiniHeroStat value={totalKeeperSaves} label="Paradas" />
                <MiniHeroStat value={totalKeeperConceded} label="Goles encajados" />
                <MiniHeroStat value={`${overallSavePercentage.toFixed(1)}%`} label="% de paradas" />
              </div>
            </div>
            <blockquote>“UN GRAN PORTERO<br />TAMBIÉN GANA<br />PARTIDOS”</blockquote>
          </section>

          <div className="v318-keepers-layout">
            <section className="v318-keepers-main">
              <div className="v318-keepers-head">
                <div>
                  <h2>Clasificación de porteros</h2>
                  <p>Rendimiento acumulado de los guardametas de la edición.</p>
                </div>
              </div>

              <div className="v318-keeper-filters">
                <label>
                  <span>Club</span>
                  <select value={keeperClub} onChange={(event) => setKeeperClub(event.target.value)}>
                    <option value="ALL">Todos los clubes</option>
                    {teams.slice().sort((a, b) => getClubName(a).localeCompare(getClubName(b))).map((code) => (
                      <option value={code} key={code}>{getClubName(code)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Participación mínima</span>
                  <select value={keeperMinimum} onChange={(event) => setKeeperMinimum(event.target.value)}>
                    <option value="0">Sin mínimo</option>
                    <option value="3">Mínimo 3 partidos</option>
                    <option value="5">Mínimo 5 partidos</option>
                    <option value="10">Mínimo 10 partidos</option>
                  </select>
                </label>
              </div>

              <KeeperTable rows={keeperRows} />
            </section>

            <aside className="v318-keepers-side">
              <section className="v318-side-card">
                <div className="v318-side-head"><h3>Datos destacados</h3></div>
                <div className="v318-highlight-grid">
                  <KeeperHighlight icon="hand" value={mostSavesKeeper?.saves ?? 0} title={mostSavesKeeper?.displayName ?? "Sin datos"} subtitle="Más paradas" />
                  <KeeperHighlight icon="ball" value={leastConcededKeeper?.conceded ?? 0} title={leastConcededKeeper?.displayName ?? "Sin datos"} subtitle="Menos goles encajados · mín. 900'" />
                  <KeeperHighlight icon="shield" value={cleanSheetKeeper?.cleanSheets ?? 0} title={cleanSheetKeeper?.displayName ?? "Sin datos"} subtitle="Más porterías a cero" />
                  <KeeperHighlight icon="chart" value={bestSaveKeeper ? `${keeperSavePercentage(bestSaveKeeper).toFixed(1)}%` : "0%"} title={bestSaveKeeper?.displayName ?? "Sin datos"} subtitle="Mejor % de paradas · mín. 900'" />
                </div>
              </section>

              <KeeperBarRanking title="Porterías a cero" rows={cleanSheetLeaders} value={(row) => row.cleanSheets} />
              <KeeperMiniRanking title="Menos goles encajados" subtitle="mín. 900 minutos" rows={fewestConceded} value={(row) => String(row.conceded)} />
              <KeeperMiniRanking title="Mejor porcentaje de paradas" subtitle="mín. 900 minutos" rows={bestSavePercentages} value={(row) => `${keeperSavePercentage(row).toFixed(1)}%`} />
            </aside>
          </div>
        </div>
      )}

      {tab === "stats" && (
        <div className="v319-stats-page">
          <section className="v319-stats-hero">
            <Image src="/competitions/statistics-v319.jpg" alt="" fill priority sizes="100vw" className="v319-stats-hero-image" />
            <div className="v319-stats-hero-shade" />
            <div className="v319-stats-hero-copy">
              <span>{TYPE_LABEL[competition.type]}</span>
              <strong>{competition.name}</strong>
              <h2>Estadísticas de la competición</h2>
              <p>Datos calculados a partir de los archivos de partidos importados (.stt).</p>
            </div>
            <blockquote>“EL FÚTBOL<br />TAMBIÉN SE EXPLICA<br />CON NÚMEROS”</blockquote>
          </section>

          <div className="v319-kpis">
            <StatsKpi label="Partidos disputados" value={playedMatches.length} sub={`${rounds.length} jornadas`} />
            <StatsKpi label="Goles totales" value={totalGoals} sub={`${goalAverage.toFixed(2)} por partido`} />
            <StatsKpi label="Promedio goleador" value={goalAverage.toFixed(2)} sub="goles por partido" />
            <StatsKpi label="Asistencias" value={totalCompetitionAssists} sub={`${assistAverage.toFixed(2)} por partido`} />
            <StatsKpi label="MVP acumulados" value={rankings.reduce((sum, row) => sum + row.mom, 0)} sub="premios individuales" />
            <StatsKpi label="Porterías a cero" value={allKeepers.reduce((sum, row) => sum + row.cleanSheets, 0)} sub="registros de porteros" />
          </div>

          <section className="v319-section">
            <div className="v319-section-title"><div><h2>Rendimiento de equipos</h2><p>Principales métricas de los equipos en la competición.</p></div><span>Datos basados en partidos importados (.stt)</span></div>
            <div className="v319-team-grid">
              <StatsTeamCard title="Mejor ataque" label="GF" rows={[...standings].sort((a,b)=>b.goalsFor-a.goalsFor).slice(0,5)} value={(r)=>r.goalsFor} />
              <StatsTeamCard title="Defensa menos goleada" label="GC" rows={[...standings].sort((a,b)=>a.goalsAgainst-b.goalsAgainst).slice(0,5)} value={(r)=>r.goalsAgainst} />
              <StatsTeamCard title="Más victorias" label="V" rows={[...standings].sort((a,b)=>b.won-a.won).slice(0,5)} value={(r)=>r.won} />
              <StatsTeamCard title="Más porterías a cero" label="PC" rows={statsTeamCleanSheets(allKeepers).slice(0,5)} value={(r)=>r.value} />
              <StatsTeamCard title="Diferencia de goles" label="DG" rows={[...standings].sort((a,b)=>b.goalDifference-a.goalDifference).slice(0,5)} value={(r)=>r.goalDifference} signed />
            </div>
          </section>

          <section className="v319-section">
            <div className="v319-section-title"><div><h2>Rendimiento individual</h2><p>Mejores jugadores de la competición en diferentes métricas.</p></div><span>Datos basados en partidos importados (.stt)</span></div>
            <div className="v319-player-grid">
              <StatsPlayerCard title="Más minutos" label="Min" rows={[...rankings].sort((a,b)=>b.minutes-a.minutes).slice(0,5)} value={(r)=>r.minutes} />
              <StatsPlayerCard title="Goleadores" label="Gol" rows={[...rankings].sort((a,b)=>b.goals-a.goals).slice(0,5)} value={(r)=>r.goals} />
              <StatsPlayerCard title="Asistencias" label="Ast" rows={[...rankings].sort((a,b)=>b.assists-a.assists).slice(0,5)} value={(r)=>r.assists} />
              <StatsPlayerCard title="MVP" label="MVP" rows={[...rankings].sort((a,b)=>b.mom-a.mom).slice(0,5)} value={(r)=>r.mom} />
              <StatsPlayerCard title="Pases clave" label="PC" rows={[...rankings].sort((a,b)=>b.keyPasses-a.keyPasses).slice(0,5)} value={(r)=>r.keyPasses} />
              <StatsPlayerCard title="Entradas" label="Ent" rows={[...rankings].sort((a,b)=>b.tackles-a.tackles).slice(0,5)} value={(r)=>r.tackles} />
              <StatsPlayerCard title="Paradas" label="Par" rows={[...allKeepers].sort((a,b)=>b.saves-a.saves).slice(0,5)} value={(r)=>r.saves} />
            </div>
          </section>

          <div className="v319-footnote"><strong>Estadísticas calculadas automáticamente.</strong><span>Los datos se extraen de los archivos de partidos importados (.stt) de la competición.</span></div>
        </div>
      )}

      {tab === "history" && (
        <div className="v315-history v3116-history-integrated">
          {competitionHistory ? (
            <>
              <section className="v315-hero">
                <Image
                  src="/competitions/hero-v31.jpg"
                  alt=""
                  fill
                  sizes="100vw"
                  className="v315-hero-image"
                />
                <div className="v315-hero-shade" />
                <div className="v315-hero-copy">
                  <span className="v315-eyebrow">ARCHIVO HISTÓRICO</span>
                  <h1>{competitionHistory.series.name}</h1>
                  <p>
                    Todas las ediciones, campeones, clubes, jugadores y récords
                    de esta competición en un único historial.
                  </p>
                </div>

                <div className="v315-kpis">
                  <HistoryKpi value={competitionHistory.totals.editions} label="EDICIONES" />
                  <HistoryKpi value={competitionHistory.totals.completedEditions} label="FINALIZADAS" />
                  <HistoryKpi value={competitionHistory.totals.matches} label="PARTIDOS" />
                  <HistoryKpi value={competitionHistory.totals.goals} label="GOLES" />
                </div>
              </section>

              <nav className="v315-tabs" aria-label="Secciones del historial">
                {[
                  ["palmares", "Palmarés"],
                  ["clubs", "Clubes"],
                  ["players", "Jugadores"],
                  ["records", "Récords"],
                  ["stats", "Estadísticas"],
                ].map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setHistorySubTab(key as HistorySubTab)}
                    className={historySubTab === key ? "is-active" : ""}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {historySubTab === "palmares" && (
                <section className="v315-panel">
                  <div className="v315-panel-head">
                    <div>
                      <h2>Palmarés por edición</h2>
                      <p>Campeón, subcampeón, tercer puesto y máximo goleador de cada temporada.</p>
                    </div>
                  </div>
                  <div className="v3116-editions">
                    {competitionHistory.editions.length ? (
                      competitionHistory.editions.slice().reverse().map((edition) => (
                        <div className="v3116-edition-card" key={edition.competitionId}>
                          <div className="v3116-edition-season">
                            <strong>{edition.seasonName}</strong>
                            <span>{edition.status}</span>
                          </div>
                          <HistoryPodium label="Campeón" teamCode={edition.championTeamCode} place="gold" />
                          <HistoryPodium label="Subcampeón" teamCode={edition.runnerUpTeamCode} place="silver" />
                          <HistoryPodium label="Tercero" teamCode={edition.thirdTeamCode} place="bronze" />
                          <div className="v3116-edition-scorer">
                            <span>Máximo goleador</span>
                            {edition.topScorer ? (
                              <Link href={edition.topScorer.playerId ? `/jugadores/${edition.topScorer.playerId}` : "#"}>
                                <Image src={getClubLogo(edition.topScorer.teamCode)} alt="" width={22} height={22} />
                                <b>{cleanPlayerName(edition.topScorer.esmsName)}</b>
                                <strong>{edition.topScorer.value}</strong>
                              </Link>
                            ) : <b>—</b>}
                          </div>
                        </div>
                      ))
                    ) : <HistoryEmpty text="Todavía no hay ediciones históricas." />}
                  </div>
                </section>
              )}

              {historySubTab === "clubs" && (
                <section className="v315-panel">
                  <div className="v315-panel-head">
                    <div>
                      <h2>Clasificación histórica de clubes</h2>
                      <p>Rendimiento acumulado de todos los clubes en todas las ediciones.</p>
                    </div>
                  </div>
                  <div className="v3116-history-table-wrap">
                    <div className="v3116-club-history-head">
                      <span>#</span><span>Club</span><span>Ed.</span><span>Tít.</span>
                      <span>Sub.</span><span>3º</span><span>PJ</span><span>G</span>
                      <span>E</span><span>P</span><span>GF</span><span>GC</span>
                      <span>DG</span><span>Pts</span>
                    </div>
                    {competitionHistory.teams.map((row, index) => (
                      <Link href={`/clubes/${row.teamCode}/historial`} className="v3116-club-history-row" key={row.teamCode}>
                        <strong>{index + 1}</strong>
                        <span className="v3116-history-club">
                          <Image src={getClubLogo(row.teamCode)} alt="" width={28} height={28} />
                          <b>{getClubName(row.teamCode)}</b>
                        </span>
                        <span>{row.editions}</span><strong>{row.titles}</strong>
                        <span>{row.runnerUp}</span><span>{row.thirdPlaces}</span>
                        <span>{row.played}</span><span>{row.won}</span>
                        <span>{row.drawn}</span><span>{row.lost}</span>
                        <span>{row.goalsFor}</span><span>{row.goalsAgainst}</span>
                        <span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
                        <strong>{row.points}</strong>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {historySubTab === "players" && (
                <section className="v315-panel">
                  <div className="v315-panel-head">
                    <div>
                      <h2>Récords históricos de jugadores</h2>
                      <p>Goles, asistencias, partidos, MVP y acciones acumuladas.</p>
                    </div>
                  </div>
                  <div className="v3116-player-grid">
                    <HistoryPlayerRanking title="Goleadores históricos" rows={competitionHistory.players} field="goals" />
                    <HistoryPlayerRanking title="Máximos asistentes" rows={competitionHistory.players} field="assists" />
                    <HistoryPlayerRanking title="Más partidos" rows={competitionHistory.players} field="appearances" />
                    <HistoryPlayerRanking title="Más MVP" rows={competitionHistory.players} field="mom" />
                    <HistoryPlayerRanking title="Más pases clave" rows={competitionHistory.players} field="keyPasses" />
                    <HistoryPlayerRanking title="Más entradas" rows={competitionHistory.players} field="tackles" />
                  </div>
                </section>
              )}

              {historySubTab === "records" && (
                <section className="v315-panel">
                  <div className="v315-panel-head">
                    <div>
                      <h2>Récords de la competición</h2>
                      <p>Los partidos más destacados de toda la historia.</p>
                    </div>
                  </div>
                  <div className="v3116-record-grid">
                    <HistoryMatchRecord title="Mayor goleada" record={competitionHistory.records.biggestWin} />
                    <HistoryMatchRecord title="Partido con más goles" record={competitionHistory.records.highestScoringMatch} />
                  </div>
                </section>
              )}

              {historySubTab === "stats" && (
                <section className="v315-panel">
                  <div className="v315-panel-head">
                    <div>
                      <h2>Estadísticas históricas</h2>
                      <p>Resumen acumulado de todas las ediciones registradas.</p>
                    </div>
                  </div>
                  <div className="v3116-history-stat-grid">
                    <HistoryStat value={competitionHistory.totals.editions} label="Ediciones" />
                    <HistoryStat value={competitionHistory.totals.completedEditions} label="Finalizadas" />
                    <HistoryStat value={competitionHistory.totals.matches} label="Partidos" />
                    <HistoryStat value={competitionHistory.totals.goals} label="Goles" />
                    <HistoryStat value={competitionHistory.totals.matches ? (competitionHistory.totals.goals / competitionHistory.totals.matches).toFixed(2) : "0.00"} label="Goles / partido" />
                    <HistoryStat value={competitionHistory.teams.length} label="Clubes históricos" />
                    <HistoryStat value={competitionHistory.players.length} label="Jugadores" />
                    <HistoryStat value={competitionHistory.teams.reduce((sum, row) => sum + row.titles, 0)} label="Títulos otorgados" />
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className="v315-panel">
              <HistoryEmpty
                text={
                  competition.seriesId
                    ? "Cargando historial…"
                    : "Esta competición todavía no tiene una serie histórica asociada."
                }
              />
            </section>
          )}
        </div>
      )}

    </div>
  );
}

function Panel({
  title,
  action,
  onAction,
  large = false,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`v311-panel${large ? " v311-panel-large" : ""}`}>
      <div className="v311-panel-head">
        <h2>{title}</h2>
        {action && onAction ? (
          <button type="button" onClick={onAction}>
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RoundTitle({ name, dates }: { name: string; dates: string | null }) {
  return (
    <div className="v311-round-title">
      <strong>{name}</strong>
      {dates ? <span>{dates}</span> : null}
    </div>
  );
}

function MatchList({ matches, results }: { matches: Match[]; results: boolean }) {
  if (!matches.length) return <Empty text="No hay partidos disponibles." />;

  return (
    <div className="v311-match-list">
      {matches.map((match) => {
        const hasResult =
          match.status === "PLAYED" &&
          match.homeScore !== null &&
          match.awayScore !== null;

        const content = (
          <>
            <Team code={match.homeTeamCode} />
            <strong className="v311-score">
              {hasResult && results
                ? `${match.homeScore} - ${match.awayScore}`
                : "-"}
            </strong>
            <Team code={match.awayTeamCode} away />
            <span className="v311-match-time">
              {formatMatchTime(match.scheduledAt)}
            </span>
          </>
        );

        return hasResult ? (
          <Link href={`/partidos/${match.id}`} className="v311-match-row" key={match.id}>
            {content}
          </Link>
        ) : (
          <div className="v311-match-row" key={match.id}>{content}</div>
        );
      })}
    </div>
  );
}

function Team({ code, away = false }: { code: string; away?: boolean }) {
  return (
    <span className={`v311-team${away ? " is-away" : ""}`}>
      {!away && (
        <Image src={getClubLogo(code)} alt="" width={24} height={24} />
      )}
      <span>{getClubName(code)}</span>
      {away && (
        <Image src={getClubLogo(code)} alt="" width={24} height={24} />
      )}
    </span>
  );
}

function StandingsTable({
  rows,
  matches,
  zones = [],
}: {
  rows: Standing[];
  matches: Match[];
  zones?: StandingZone[];
}) {
  return (
    <div className="v3111-table-wrap">
      <div className="v3111-table-head">
        <span>#</span><span>Club</span><span>PJ</span><span>G</span><span>E</span>
        <span>P</span><span>GF</span><span>GC</span><span>DG</span><span title="No presentado">NP</span><span>Pts</span><span>Forma</span>
      </div>

      {rows.map((row) => {
        const zone = zones.find(
          (item) =>
            row.position >= item.startPosition &&
            row.position <= item.endPosition
        );

        return (
          <Link
            href={`/clubes/${row.teamCode}/historial`}
            className="v3111-table-row"
            key={row.teamCode}
          >
            <span
              className={`v3111-position${zone ? " is-zoned" : ""}`}
              style={
                zone
                  ? {
                      backgroundColor: zone.color,
                      color: contrastText(zone.color),
                    }
                  : undefined
              }
              title={zone?.label}
            >
              {row.position}
            </span>

            <span className="v3111-club">
              <Image
                src={getClubLogo(row.teamCode)}
                alt=""
                width={28}
                height={28}
              />
              <strong>{getClubName(row.teamCode)}</strong>
              {zone ? (
                <i
                  className="v3111-zone-line"
                  style={{ backgroundColor: zone.color }}
                  title={zone.label}
                />
              ) : null}
            </span>

            <span>{row.played}</span>
            <span>{row.won}</span>
            <span>{row.drawn}</span>
            <span>{row.lost}</span>
            <span>{row.goalsFor}</span>
            <span>{row.goalsAgainst}</span>
            <span>
              {row.goalDifference > 0
                ? `+${row.goalDifference}`
                : row.goalDifference}
            </span>
            <span
              className={
                row.noPresented > 0
                  ? "v31118-np-value is-active"
                  : "v31118-np-value"
              }
              title="Partidos en los que el club no presentó alineación"
            >
              {row.noPresented}
            </span>
            <strong>{row.points}</strong>
            <FormDots teamCode={row.teamCode} matches={matches} />
          </Link>
        );
      })}
    </div>
  );
}

function FormDots({ teamCode, matches }: { teamCode: string; matches: Match[] }) {
  const recent = matches
    .filter(
      (match) =>
        match.homeTeamCode === teamCode || match.awayTeamCode === teamCode
    )
    .slice(0, 5)
    .reverse();

  return (
    <span className="v311-form">
      {recent.map((match) => {
        const home = match.homeTeamCode === teamCode;
        const gf = home ? match.homeScore ?? 0 : match.awayScore ?? 0;
        const ga = home ? match.awayScore ?? 0 : match.homeScore ?? 0;
        const code = gf > ga ? "V" : gf === ga ? "E" : "D";
        return <i key={match.id} className={`is-${code.toLowerCase()}`}>{code}</i>;
      })}
    </span>
  );
}

function RankingPanel({
  title,
  rows,
  metric,
  action,
}: {
  title: string;
  rows: Ranking[];
  metric: "goals" | "assists";
  action: () => void;
}) {
  return (
    <section className="v311-panel v311-ranking-panel">
      <div className="v311-panel-head">
        <h2>{title}</h2>
        <button type="button" onClick={action}>Ver todos →</button>
      </div>
      <RankingRows rows={rows} metric={metric} />
    </section>
  );
}





function ResultsRoundBlock({
  round,
  matches,
  compact = false,
}: {
  round: Round | null;
  matches: Match[];
  compact?: boolean;
}) {
  return (
    <section className={`v3112-round${compact ? " is-compact" : ""}`}>
      <div className="v3112-round-head">
        <strong>{round?.name ?? "Últimos resultados"}</strong>
        <span>{formatRoundDates(round)}</span>
      </div>

      {matches.length ? (
        <div className="v3112-match-list">
          {matches.map((match) => (
            <Link
              href={`/partidos/${match.id}`}
              className="v3112-match"
              key={match.id}
            >
              <span className="v3112-match-date">
                {formatResultsMatchDate(match)}
              </span>

              <span className="v3112-result-home">
                <Image
                  src={getClubLogo(match.homeTeamCode)}
                  alt=""
                  width={28}
                  height={28}
                />
                <b>{getClubName(match.homeTeamCode)}</b>
              </span>

              <strong className="v3112-result-score">
                {match.homeScore} - {match.awayScore}
              </strong>

              <span className="v3112-result-away">
                <Image
                  src={getClubLogo(match.awayTeamCode)}
                  alt=""
                  width={28}
                  height={28}
                />
                <b>{getClubName(match.awayTeamCode)}</b>
              </span>

              <span className="v3112-detail-btn">Ver detalles</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="v3112-empty">No hay resultados para este filtro.</p>
      )}
    </section>
  );
}

function ResultsKpi({
  value,
  label,
  detail,
  icon,
}: {
  value: number;
  label: string;
  detail?: string;
  icon: "field" | "ball" | "yellow" | "red";
}) {
  return (
    <div className="v3112-kpi">
      <span className={`v3112-kpi-icon is-${icon}`}>
        {icon === "field" ? "▣" : icon === "ball" ? "●" : ""}
      </span>
      <span>
        <strong>{value}</strong>
        <b>{label}</b>
        {detail ? <small>{detail}</small> : null}
      </span>
    </div>
  );
}

function formatResultsMatchDate(match: Match) {
  const value = match.playedAt ?? match.scheduledAt ?? match.createdAt;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function resultHighlightText(match: Match) {
  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  const margin = Math.abs(home - away);
  const total = home + away;

  if (margin >= 4) return "Una de las mayores goleadas de la jornada.";
  if (total >= 6) return "Partido de gran producción ofensiva.";
  if (margin >= 3) return "Victoria contundente.";
  if (home === away) return "Empate muy disputado.";
  return "Uno de los resultados destacados de la jornada.";
}

function cleanPlayerName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const OVERVIEW_KPI_IMAGES = {
  trophy: "/competitions/overview-kpis/teams-v31137.png",
  people: "/competitions/overview-kpis/teams-v31137.png",
  field: "/competitions/overview-kpis/matches-v31137.png",
  calendar: "/competitions/overview-kpis/matches-v31137.png",
  ball: "/competitions/overview-kpis/goals-v31137.png",
  yellow: "/competitions/overview-kpis/yellow-v31137.png",
  red: "/competitions/overview-kpis/red-v31137.png",
} as const;

function HistoryKpi({ value, label }: { value: string | number; label: string }) {
  return <div className="v315-kpi"><span className="v315-kpi-icon">◆</span><strong>{value}</strong><small>{label}</small></div>;
}

function HistoryPodium({ label, teamCode, place }: { label: string; teamCode: string | null; place: "gold" | "silver" | "bronze" }) {
  return (
    <div className={`v3116-podium is-${place}`}>
      <span>{label}</span>
      {teamCode ? (
        <Link href={`/clubes/${teamCode}/historial`}>
          <Image src={getClubLogo(teamCode)} alt="" width={30} height={30} />
          <b>{getClubName(teamCode)}</b>
        </Link>
      ) : <b>—</b>}
    </div>
  );
}

function HistoryPlayerRanking({ title, rows, field }: {
  title: string;
  rows: IntegratedHistoryPlayer[];
  field: "goals" | "assists" | "appearances" | "mom" | "keyPasses" | "tackles";
}) {
  const sorted = [...rows].filter((row) => row[field] > 0).sort((a,b) => b[field] - a[field] || b.minutes - a.minutes).slice(0,10);
  return (
    <section className="v3116-history-ranking">
      <h3>{title}</h3>
      {sorted.length ? sorted.map((row,index) => (
        <Link href={row.playerId ? `/jugadores/${row.playerId}` : "#"} className="v3116-history-player" key={`${title}-${row.playerId ?? row.esmsName}-${row.teamCode}`}>
          <strong>{index + 1}</strong>
          <Image src={getClubLogo(row.teamCode)} alt="" width={24} height={24} />
          <span><b>{cleanPlayerName(row.esmsName)}</b><small>{getClubName(row.teamCode)}</small></span>
          <strong>{row[field]}</strong>
        </Link>
      )) : <HistoryEmpty text="Sin datos." compact />}
    </section>
  );
}

function HistoryMatchRecord({ title, record }: { title: string; record: IntegratedHistoryMatchRecord | null }) {
  return (
    <section className="v3116-match-record">
      <h3>{title}</h3>
      {record ? (
        <>
          <span>{record.seasonName}</span>
          <Link href={`/partidos/${record.matchId}`}>
            <span><Image src={getClubLogo(record.homeTeamCode)} alt="" width={48} height={48} /><b>{getClubName(record.homeTeamCode)}</b></span>
            <strong>{record.homeScore} - {record.awayScore}</strong>
            <span><Image src={getClubLogo(record.awayTeamCode)} alt="" width={48} height={48} /><b>{getClubName(record.awayTeamCode)}</b></span>
          </Link>
        </>
      ) : <HistoryEmpty text="Sin datos." compact />}
    </section>
  );
}

function HistoryStat({ value, label }: { value: string | number; label: string }) {
  return <div className="v3116-history-stat"><strong>{value}</strong><span>{label}</span></div>;
}

function HistoryEmpty({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`v3116-history-empty${compact ? " is-compact" : ""}`}><span>🏆</span><p>{text}</p></div>;
}


function OverviewKpi({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: keyof typeof OVERVIEW_KPI_IMAGES;
}) {
  return (
    <div className="v3113-kpi">
      <span className="v31135-kpi-image">
        <Image
          src={OVERVIEW_KPI_IMAGES[icon]}
          alt=""
          fill
          sizes="44px"
          className="object-cover"
        />
      </span>

      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        {detail ? <b>{detail}</b> : null}
      </span>
    </div>
  );
}

function OverviewRankingCard({
  title,
  button,
  onClick,
  rows,
  value,
}: {
  title: string;
  button: string;
  onClick: () => void;
  rows: Ranking[];
  value: (row: Ranking) => number;
}) {
  return (
    <section className="v3113-card">
      <div className="v3113-card-head">
        <div><h3>{title}</h3></div>
        <button type="button" onClick={onClick}>{button}</button>
      </div>

      <div className="v3113-ranking">
        {rows.length ? (
          rows.map((row, index) => (
            <Link
              href={row.playerId ? `/jugadores/${row.playerId}` : "#"}
              className="v3113-ranking-row"
              key={`${title}-${row.playerId ?? row.esmsName}-${row.teamCode}`}
            >
              <strong>{index + 1}</strong>
              <span className="v3113-ranking-photo">
                {row.photoUrl ? (
                  <Image
                    src={row.photoUrl}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <span>{row.esmsName.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <Image
                src={getClubLogo(row.teamCode)}
                alt=""
                width={22}
                height={22}
              />
              <span>
                <b>{cleanPlayerName(row.esmsName)}</b>
                <small>{getClubName(row.teamCode)}</small>
              </span>
              <strong className="is-value">{value(row)}</strong>
            </Link>
          ))
        ) : (
          <p className="v3113-empty">Sin datos.</p>
        )}
      </div>
    </section>
  );
}

const SEASON_DATA_IMAGES = {
  field: "/competitions/season-data/matches.png",
  ball: "/competitions/season-data/goals.png",
  boot: "/competitions/season-data/average.png",
  target: "/competitions/season-data/biggest-win.png",
  yellow: "/competitions/season-data/yellow-card.png",
  red: "/competitions/season-data/red-card.png",
  people: "/competitions/season-data/teams.png",
} as const;

function SeasonData({
  value,
  label,
  icon,
}: {
  value: string | number;
  label: string;
  icon: keyof typeof SEASON_DATA_IMAGES;
}) {
  return (
    <div className="v3113-season-item">
      <span className="v3113-season-image">
        <Image
          src={SEASON_DATA_IMAGES[icon]}
          alt=""
          fill
          sizes="42px"
          className="object-contain"
        />
      </span>
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

function OverviewChampions({
  rows,
}: {
  rows: OverviewHistoryEdition[];
}) {
  if (!rows.length) {
    return (
      <div className="v31134-history-empty">
        <span>🏆</span>
        <div>
          <b>Aún no hay campeones registrados</b>
          <small>
            Aparecerán aquí cuando una edición de la competición esté finalizada.
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="v3113-champions">
      {rows.slice(0, 5).map((row) => (
        <Link
          href={`/competiciones/${row.competitionId}`}
          className="v3113-champion-row"
          key={row.competitionId}
        >
          <span>{row.seasonName}</span>
          {row.championTeamCode ? (
            <>
              <Image
                src={getClubLogo(row.championTeamCode)}
                alt=""
                width={22}
                height={22}
              />
              <b>{getClubName(row.championTeamCode)}</b>
            </>
          ) : (
            <b>—</b>
          )}
        </Link>
      ))}
    </div>
  );
}

function contrastText(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return "#FFFFFF";

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance >= 155 ? "#181818" : "#FFFFFF";
}

function buildSplitStandings(
  teams: string[],
  matches: Match[],
  side: "HOME" | "AWAY",
  competition: Competition
): Standing[] {
  const table = new Map<string, Omit<Standing, "position" | "goalDifference">>();

  for (const teamCode of teams) {
    table.set(teamCode, {
      teamCode,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      noPresented: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const teamCode =
      side === "HOME" ? match.homeTeamCode : match.awayTeamCode;
    const row = table.get(teamCode);
    if (!row) continue;

    const goalsFor = side === "HOME" ? match.homeScore : match.awayScore;
    const goalsAgainst = side === "HOME" ? match.awayScore : match.homeScore;

    const teamDidNotPresent =
      side === "HOME" ? match.homeNoShow : match.awayNoShow;

    row.played += 1;

    if (teamDidNotPresent) {
      row.noPresented += 1;
    }
    row.goalsFor += goalsFor;
    row.goalsAgainst += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      row.won += 1;
      row.points += competition.pointsWin;
    } else if (goalsFor === goalsAgainst) {
      row.drawn += 1;
      row.points += competition.pointsDraw;
    } else {
      row.lost += 1;
      row.points += competition.pointsLoss;
    }
  }

  const rows = Array.from(table.values()).map((row) => ({
    ...row,
    position: 0,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }));

  return rankStandings(
    rows,
    matches.map((match) => ({
      homeTeamCode: match.homeTeamCode,
      awayTeamCode: match.awayTeamCode,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
    })),
    { win: competition.pointsWin, draw: competition.pointsDraw, loss: competition.pointsLoss }
  ).map((row, index) => ({ ...row, position: index + 1 }));
}

function MiniStandingTable({
  title,
  rows,
}: {
  title: string;
  rows: Standing[];
}) {
  return (
    <section className="v3111-mini-card">
      <h3>{title}</h3>
      <div className="v3111-mini-head">
        <span>#</span><span>Club</span><span>PJ</span><span>G</span>
        <span>E</span><span>P</span><span>GF</span><span>GC</span><span>Pts</span>
      </div>

      {rows.map((row) => (
        <Link
          href={`/clubes/${row.teamCode}/historial`}
          className="v3111-mini-row"
          key={`${title}-${row.teamCode}`}
        >
          <strong>{row.position}</strong>
          <span className="v3111-mini-club">
            <Image
              src={getClubLogo(row.teamCode)}
              alt=""
              width={22}
              height={22}
            />
            <b>{getClubName(row.teamCode)}</b>
          </span>
          <span>{row.played}</span>
          <span>{row.won}</span>
          <span>{row.drawn}</span>
          <span>{row.lost}</span>
          <span>{row.goalsFor}</span>
          <span>{row.goalsAgainst}</span>
          <strong>{row.points}</strong>
        </Link>
      ))}
    </section>
  );
}

function StandingSummary({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: "field" | "ball" | "yellow" | "red";
}) {
  return (
    <div className="v3111-summary">
      <span className={`v3111-summary-icon is-${icon}`}>
        {icon === "field" ? "▣" : icon === "ball" ? "●" : ""}
      </span>
      <span>
        <strong>{value}</strong>
        <b>{label}</b>
        {detail ? <small>{detail}</small> : null}
      </span>
    </div>
  );
}

function buildStandingStreaks(rows: Standing[], matches: Match[]) {
  return rows
    .map((row) => {
      const teamMatches = [...matches]
        .filter(
          (match) =>
            match.homeTeamCode === row.teamCode ||
            match.awayTeamCode === row.teamCode
        )
        .sort((a, b) => matchDate(a).localeCompare(matchDate(b)));

      let bestWin = 0;
      let currentWin = 0;
      let bestUnbeaten = 0;
      let currentUnbeaten = 0;

      for (const match of teamMatches) {
        const home = match.homeTeamCode === row.teamCode;
        const gf = home ? match.homeScore ?? 0 : match.awayScore ?? 0;
        const ga = home ? match.awayScore ?? 0 : match.homeScore ?? 0;

        if (gf > ga) {
          currentWin += 1;
          currentUnbeaten += 1;
        } else if (gf === ga) {
          currentWin = 0;
          currentUnbeaten += 1;
        } else {
          currentWin = 0;
          currentUnbeaten = 0;
        }

        bestWin = Math.max(bestWin, currentWin);
        bestUnbeaten = Math.max(bestUnbeaten, currentUnbeaten);
      }

      return {
        teamCode: row.teamCode,
        bestWin,
        bestUnbeaten,
      };
    })
    .sort(
      (a, b) =>
        b.bestWin - a.bestWin ||
        b.bestUnbeaten - a.bestUnbeaten
    )
    .slice(0, 4);
}

function StreakRanking({
  rows,
}: {
  rows: Array<{
    teamCode: string;
    bestWin: number;
    bestUnbeaten: number;
  }>;
}) {
  return (
    <div className="v3111-streaks">
      {rows.length ? (
        rows.map((row, index) => (
          <div className="v3111-streak-row" key={row.teamCode}>
            <strong>{index + 1}</strong>
            <Image
              src={getClubLogo(row.teamCode)}
              alt=""
              width={25}
              height={25}
            />
            <span>
              <b>{getClubName(row.teamCode)}</b>
              <small>
                {row.bestWin} victorias seguidas · {row.bestUnbeaten} sin perder
              </small>
            </span>
          </div>
        ))
      ) : (
        <p className="v3111-empty">Sin partidos disputados.</p>
      )}
    </div>
  );
}

function CalendarInfo({ value, label, card }: { value:number; label:string; card?:"yellow"|"red" }) {
  return <div className="v3110-info"><span className={card?`v3110-card-dot ${card}`:"v3110-info-icon"}>{card?"":"●"}</span><strong>{value}</strong><small>{label}</small></div>;
}

function formatCalendarMatchDate(match: Match) {
  const value = match.scheduledAt ?? match.playedAt ?? match.createdAt;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Por definir";
  return new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(date);
}

function StatsKpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return <div className="v319-kpi"><span className="v319-kpi-icon"><ChartIcon /></span><span><strong>{value}</strong><b>{label}</b><small>{sub}</small></span></div>;
}

function StatsTeamCard({ title, label, rows, value, signed = false }: { title:string; label:string; rows:any[]; value:(row:any)=>number; signed?:boolean }) {
  return <div className="v319-stat-card">
    <div className="v319-card-title"><strong>{title}</strong></div>
    <div className="v319-table-head"><span>#</span><span>Club</span><span>{label}</span></div>
    {rows.map((row,index)=>{const code=row.teamCode; const val=value(row); return (
      <Link href={`/clubes/${code}/historial`} className="v319-team-row" key={`${title}-${code}`}>
        <span>{index+1}</span><span><Image src={getClubLogo(code)} alt="" width={22} height={22}/><b>{getClubName(code)}</b></span><strong>{signed&&val>0?`+${val}`:val}</strong>
      </Link>
    )})}
  </div>;
}

function StatsPlayerCard({ title, label, rows, value }: { title:string; label:string; rows:Ranking[]; value:(row:Ranking)=>number }) {
  return <div className="v319-stat-card">
    <div className="v319-card-title"><strong>{title}</strong></div>
    <div className="v319-table-head"><span>#</span><span>Jugador</span><span>{label}</span></div>
    {rows.map((row,index)=>(
      <Link href={row.playerId?`/jugadores/${row.playerId}`:"/buscador"} className="v319-player-row" key={`${title}-${row.playerId??row.esmsName}`}>
        <span>{index+1}</span><span><span className="v319-player-photo">{row.photoUrl?<Image src={row.photoUrl} alt="" fill sizes="24px" className="object-cover"/>:row.displayName.slice(0,1)}</span><b>{row.displayName}</b><Image src={getClubLogo(row.teamCode)} alt="" width={18} height={18}/></span><strong>{value(row).toLocaleString("es-ES")}</strong>
      </Link>
    ))}
  </div>;
}

function statsTeamCleanSheets(keepers: Ranking[]) {
  const map=new Map<string,number>();
  for(const row of keepers) map.set(row.teamCode,(map.get(row.teamCode)??0)+row.cleanSheets);
  return Array.from(map.entries()).map(([teamCode,value])=>({teamCode,value})).sort((a,b)=>b.value-a.value);
}


function KeeperTable({ rows }: { rows: Ranking[] }) {
  if (!rows.length) return <Empty text="No hay porteros con estos filtros." />;

  return (
    <div className="v318-keeper-table-wrap">
      <div className="v318-keeper-table-head">
        <span>#</span><span>Jugador</span><span>Club</span><span>PJ</span><span>Min</span>
        <span>Paradas</span><span>Enc.</span><span>P/PJ</span><span>% Paradas</span><span>Media</span>
      </div>
      {rows.map((row, index) => (
        <Link href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"} className="v318-keeper-row" key={`${row.playerId ?? row.esmsName}-keeper`}>
          <strong className="v318-keeper-rank">{index + 1}</strong>
          <span className="v318-keeper-player">
            <span className="v318-keeper-photo">
              {row.photoUrl ? <Image src={row.photoUrl} alt="" fill sizes="44px" className="object-cover" /> : <span>{row.displayName.slice(0, 1).toUpperCase()}</span>}
            </span>
            <strong>{row.displayName}</strong>
          </span>
          <span className="v318-keeper-club">
            <Image src={getClubLogo(row.teamCode)} alt="" width={26} height={26} />
            <span>{getClubName(row.teamCode)}</span>
          </span>
          <span>{row.appearances}</span>
          <span>{row.minutes.toLocaleString("es-ES")}</span>
          <strong>{row.saves}</strong>
          <span>{row.conceded}</span>
          <span>{keeperSavesPerAppearance(row).toFixed(1)}</span>
          <strong className="is-save-pct">{keeperSavePercentage(row).toFixed(1)}%</strong>
          <span>{keeperConcededPerAppearance(row).toFixed(2)}</span>
        </Link>
      ))}
    </div>
  );
}

function KeeperBarRanking({ title, rows, value }: { title: string; rows: Ranking[]; value: (row: Ranking) => number }) {
  const maxValue = Math.max(...rows.map(value), 1);
  return (
    <section className="v318-side-card">
      <div className="v318-side-head"><h3>{title}</h3></div>
      <div className="v318-bar-ranking">
        {rows.length ? rows.map((row) => (
          <Link href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"} className="v318-bar-row" key={`${row.playerId ?? row.esmsName}-${title}`}>
            <span className="v318-bar-name"><span>{row.displayName}</span><Image src={getClubLogo(row.teamCode)} alt="" width={18} height={18} /></span>
            <i><u style={{ width: `${(value(row) / maxValue) * 100}%` }} /></i>
            <strong>{value(row)}</strong>
          </Link>
        )) : <div className="v318-mini-empty">Sin datos</div>}
      </div>
    </section>
  );
}

function KeeperMiniRanking({ title, subtitle, rows, value }: { title: string; subtitle?: string; rows: Ranking[]; value: (row: Ranking) => string }) {
  return (
    <section className="v318-side-card">
      <div className="v318-side-head"><div><h3>{title}</h3>{subtitle ? <p>{subtitle}</p> : null}</div></div>
      <div className="v318-mini-ranking">
        {rows.length ? rows.map((row, index) => (
          <Link href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"} className="v318-mini-ranking-row" key={`${row.playerId ?? row.esmsName}-${title}`}>
            <span>{index + 1}</span>
            <span className="v318-mini-photo">{row.photoUrl ? <Image src={row.photoUrl} alt="" fill sizes="32px" className="object-cover" /> : row.displayName.slice(0, 1)}</span>
            <Image src={getClubLogo(row.teamCode)} alt="" width={20} height={20} />
            <strong>{row.displayName}</strong><b>{value(row)}</b>
          </Link>
        )) : <div className="v318-mini-empty">Sin datos</div>}
      </div>
    </section>
  );
}

function KeeperHighlight({ icon, value, title, subtitle }: { icon: "hand" | "ball" | "shield" | "chart"; value: string | number; title: string; subtitle: string }) {
  return (
    <div className="v318-highlight">
      <span className="v318-highlight-icon">
        {icon === "ball" ? <BallIcon /> : icon === "shield" ? <ShieldIcon /> : icon === "chart" ? <ChartIcon /> : <HandIcon />}
      </span>
      <span><strong>{value}</strong><b>{title}</b><small>{subtitle}</small></span>
    </div>
  );
}

function HandIcon() {
  return <svg viewBox="0 0 24 24"><path d="M7 11V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-3 7-7 7h-1c-3 0-5-1-7-4l-2-3a1.6 1.6 0 0 1 2.5-2l2.5 2Z" /></svg>;
}
function ShieldIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" /></svg>;
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24"><path d="M5 20v-6h3v6H5Zm6 0V9h3v11h-3Zm6 0V4h3v16h-3Z" /></svg>;
}


function AssistTable({ rows }: { rows: Ranking[] }) {
  if (!rows.length) {
    return <Empty text="No hay asistentes con estos filtros." />;
  }

  return (
    <div className="v317-assist-table-wrap">
      <div className="v317-assist-table-head">
        <span>#</span>
        <span>Jugador</span>
        <span>Club</span>
        <span>Pos</span>
        <span>PJ</span>
        <span>Asist.</span>
        <span>Min</span>
        <span>Prom</span>
      </div>

      {rows.map((row, index) => (
        <Link
          href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"}
          className="v317-assist-row"
          key={`${row.playerId ?? row.esmsName}-assist`}
        >
          <strong className="v317-assist-rank">{index + 1}</strong>

          <span className="v317-assist-player">
            <span className="v317-assist-photo">
              {row.photoUrl ? (
                <Image
                  src={row.photoUrl}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                <span>{row.displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            <strong>{row.displayName}</strong>
          </span>

          <span className="v317-assist-club">
            <Image
              src={getClubLogo(row.teamCode)}
              alt=""
              width={26}
              height={26}
            />
            <span>{getClubName(row.teamCode)}</span>
          </span>

          <strong>{row.dominantPosition ?? "—"}</strong>
          <span>{row.appearances}</span>
          <strong className="is-assists">{row.assists}</strong>
          <span>{row.minutes.toLocaleString("es-ES")}</span>
          <strong>{assistsPerAppearance(row).toFixed(2)}</strong>
        </Link>
      ))}
    </div>
  );
}

function MiniAssistRanking({
  title,
  subtitle,
  rows,
  value,
}: {
  title: string;
  subtitle?: string;
  rows: Ranking[];
  value: (row: Ranking) => string;
}) {
  return (
    <section className="v317-side-card">
      <div className="v317-side-head is-stacked">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className="v317-mini-ranking">
        {rows.length ? (
          rows.map((row, index) => (
            <Link
              href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"}
              className="v317-mini-ranking-row"
              key={`${row.playerId ?? row.esmsName}-${title}`}
            >
              <span>{index + 1}</span>

              <span className="v317-mini-photo">
                {row.photoUrl ? (
                  <Image
                    src={row.photoUrl}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  row.displayName.slice(0, 1)
                )}
              </span>

              <Image
                src={getClubLogo(row.teamCode)}
                alt=""
                width={20}
                height={20}
              />

              <strong>{row.displayName}</strong>
              <b>{value(row)}</b>
            </Link>
          ))
        ) : (
          <div className="v317-mini-empty">Sin datos</div>
        )}
      </div>
    </section>
  );
}

function AssistHighlight({
  icon,
  value,
  title,
  subtitle,
}: {
  icon: "boot" | "goal" | "players" | "ball";
  value: string | number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="v317-highlight">
      <span className="v317-highlight-icon">
        {icon === "players" ? (
          <TeamsIcon />
        ) : icon === "ball" ? (
          <BallIcon />
        ) : icon === "goal" ? (
          <GoalIcon />
        ) : (
          <BootIcon />
        )}
      </span>

      <span>
        <strong>{value}</strong>
        <b>{title}</b>
        <small>{subtitle}</small>
      </span>
    </div>
  );
}


function ScorerTable({ rows }: { rows: Ranking[] }) {
  if (!rows.length) {
    return <Empty text="No hay goleadores con estos filtros." />;
  }

  return (
    <div className="v316-scorer-table-wrap">
      <div className="v316-scorer-table-head">
        <span>#</span>
        <span>Jugador</span>
        <span>Club</span>
        <span>Pos</span>
        <span>PJ</span>
        <span>Goles</span>
        <span>Min</span>
        <span>Prom</span>
      </div>

      {rows.map((row, index) => (
        <Link
          href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"}
          className="v316-scorer-row"
          key={`${row.playerId ?? row.esmsName}-scorer`}
        >
          <strong className="v316-scorer-rank">{index + 1}</strong>

          <span className="v316-scorer-player">
            <span className="v316-scorer-photo">
              {row.photoUrl ? (
                <Image
                  src={row.photoUrl}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                <span>{row.displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            <strong>{row.displayName}</strong>
          </span>

          <span className="v316-scorer-club">
            <Image
              src={getClubLogo(row.teamCode)}
              alt=""
              width={26}
              height={26}
            />
            <span>{getClubName(row.teamCode)}</span>
          </span>

          <strong>{row.dominantPosition ?? "—"}</strong>
          <span>{row.appearances}</span>
          <strong className="is-goals">{row.goals}</strong>
          <span>{row.minutes.toLocaleString("es-ES")}</span>
          <strong>{goalsPerAppearance(row).toFixed(2)}</strong>
        </Link>
      ))}
    </div>
  );
}

function MiniScorerRanking({
  title,
  rows,
  value,
}: {
  title: string;
  rows: Ranking[];
  value: (row: Ranking) => string;
}) {
  return (
    <section className="v316-side-card">
      <div className="v316-side-head">
        <h3>{title}</h3>
      </div>
      <div className="v316-mini-ranking">
        {rows.length ? (
          rows.map((row, index) => (
            <Link
              href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"}
              className="v316-mini-ranking-row"
              key={`${row.playerId ?? row.esmsName}-${title}`}
            >
              <span>{index + 1}</span>
              <span className="v316-mini-photo">
                {row.photoUrl ? (
                  <Image src={row.photoUrl} alt="" fill sizes="32px" className="object-cover" />
                ) : (
                  row.displayName.slice(0, 1)
                )}
              </span>
              <Image src={getClubLogo(row.teamCode)} alt="" width={20} height={20} />
              <strong>{row.displayName}</strong>
              <b>{value(row)}</b>
            </Link>
          ))
        ) : (
          <div className="v316-mini-empty">Sin datos</div>
        )}
      </div>
    </section>
  );
}

function ScorerHighlight({
  icon,
  value,
  title,
  subtitle,
}: {
  icon: "boot" | "goal" | "players" | "ball";
  value: string | number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="v316-highlight">
      <span className="v316-highlight-icon">
        {icon === "players" ? (
          <TeamsIcon />
        ) : icon === "ball" ? (
          <BallIcon />
        ) : icon === "goal" ? (
          <GoalIcon />
        ) : (
          <BootIcon />
        )}
      </span>
      <span>
        <strong>{value}</strong>
        <b>{title}</b>
        <small>{subtitle}</small>
      </span>
    </div>
  );
}

function MiniHeroStat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="v316-mini-hero-stat">
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function BootIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 4v8c0 4 3 6 7 6h7v-4l-6-2-2-8H5Z" />
      <path d="M7 8h5M7 11h6" />
    </svg>
  );
}

function GoalIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 20V7h16v13M4 10h16M8 10v10M16 10v10" />
      <path d="m8 10 4 4 4-4M8 15l4 4 4-4" />
    </svg>
  );
}

function RankingFull({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: Ranking[];
  metric: "goals" | "assists" | "saves";
}) {
  return (
    <Panel title={title} large>
      <div className="v311-ranking-full">
        <RankingRows rows={rows.filter((row) => row[metric] > 0).slice(0, 25)} metric={metric} />
      </div>
    </Panel>
  );
}

function RankingRows({
  rows,
  metric,
}: {
  rows: Ranking[];
  metric: "goals" | "assists" | "saves";
}) {
  if (!rows.length) return <Empty text="Todavía no hay datos suficientes." />;

  return (
    <div className="v311-ranking-list">
      {rows.map((row, index) => (
        <Link
          href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"}
          className="v311-ranking-row"
          key={`${row.playerId ?? row.esmsName}-${metric}`}
        >
          <span className="v311-rank">{index + 1}</span>
          <span className="v311-player-photo">
            {row.photoUrl ? (
              <Image src={row.photoUrl} alt="" fill sizes="34px" className="object-cover" />
            ) : (
              <span>{row.displayName.slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <Image src={getClubLogo(row.teamCode)} alt="" width={21} height={21} className="v311-player-club" />
          <span className="v311-player-name">
            <strong>{row.displayName}</strong>
            <small>{getClubName(row.teamCode)}</small>
          </span>
          <strong className="v311-ranking-value">{row[metric]}</strong>
        </Link>
      ))}
    </div>
  );
}

function Highlight({
  title,
  value,
  subtitle,
  logo,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  logo?: string;
  icon?: string;
}) {
  return (
    <div className="v311-highlight">
      <span className="v311-highlight-icon">
        {logo ? (
          <Image src={getClubLogo(logo)} alt="" width={48} height={48} />
        ) : icon === "trophy" ? (
          <TrophyIcon />
        ) : icon === "calendar" ? (
          <CalendarIcon />
        ) : (
          <StadiumIcon />
        )}
      </span>
      <span>
        <small>{title}</small>
        <strong>{value}</strong>
        <em>{subtitle}</em>
      </span>
    </div>
  );
}

function HeroMeta({
  value,
  label,
  icon,
  wide = false,
}: {
  value: number | string;
  label: string;
  icon: string;
  wide?: boolean;
}) {
  return (
    <div className={`v311-hero-meta-card${wide ? " is-wide" : ""}`}>
      {icon === "trophy" ? <TrophyIcon /> : <CalendarIcon />}
      <span>
        <strong>{value}</strong>
        {label ? <small>{label}</small> : null}
      </span>
    </div>
  );
}


function StatKpi({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: "calendar" | "ball" | "trophy" | "teams";
}) {
  return (
    <div className="v314-kpi">
      <span className="v314-kpi-icon">
        {icon === "calendar" ? (
          <CalendarIcon />
        ) : icon === "trophy" ? (
          <TrophyIcon />
        ) : icon === "teams" ? (
          <TeamsIcon />
        ) : (
          <BallIcon />
        )}
      </span>
      <span>
        <small>{title}</small>
        <strong>{value}</strong>
        <em>{subtitle}</em>
      </span>
    </div>
  );
}

function ClubRecord({
  title,
  teamCode,
  value,
}: {
  title: string;
  teamCode?: string;
  value: string;
}) {
  return (
    <div className="v314-record-card">
      <span className="v314-record-logo">
        {teamCode ? (
          <Image src={getClubLogo(teamCode)} alt="" width={52} height={52} />
        ) : (
          <TrophyIcon />
        )}
      </span>
      <span>
        <small>{title}</small>
        <strong>{teamCode ? getClubName(teamCode) : "Sin datos"}</strong>
        <em>{value}</em>
      </span>
    </div>
  );
}

function MatchRecordCard({
  title,
  match,
  value,
}: {
  title: string;
  match: Match | null;
  value: string;
}) {
  return (
    <div className="v314-match-record">
      <small>{title}</small>
      {match ? (
        <>
          <div className="v314-match-record-teams">
            <span>
              <Image src={getClubLogo(match.homeTeamCode)} alt="" width={34} height={34} />
              {getClubName(match.homeTeamCode)}
            </span>
            <strong>{value}</strong>
            <span>
              <Image src={getClubLogo(match.awayTeamCode)} alt="" width={34} height={34} />
              {getClubName(match.awayTeamCode)}
            </span>
          </div>
          <Link href={`/partidos/${match.id}`}>Ver partido →</Link>
        </>
      ) : (
        <div className="v314-no-record">Sin datos</div>
      )}
    </div>
  );
}

function StatLeaderPanel({
  title,
  rows,
  metric,
  suffix,
}: {
  title: string;
  rows: Ranking[];
  metric: "mom" | "shots" | "keyPasses" | "tackles" | "saves" | "dp";
  suffix: string;
}) {
  return (
    <section className="v314-leader-panel">
      <div className="v314-leader-head">
        <h3>{title}</h3>
        <span>{suffix}</span>
      </div>

      {rows.length ? (
        <div className="v314-leader-list">
          {rows.map((row, index) => (
            <Link
              href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"}
              className="v314-leader-row"
              key={`${row.playerId ?? row.esmsName}-${metric}`}
            >
              <span className="v314-leader-rank">{index + 1}</span>
              <span className="v314-leader-photo">
                {row.photoUrl ? (
                  <Image src={row.photoUrl} alt="" fill sizes="38px" className="object-cover" />
                ) : (
                  <span>{row.displayName.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <Image
                src={getClubLogo(row.teamCode)}
                alt=""
                width={22}
                height={22}
                className="v314-leader-club"
              />
              <span className="v314-leader-name">
                <strong>{row.displayName}</strong>
                <small>{getClubName(row.teamCode)}</small>
              </span>
              <strong className="v314-leader-value">{row[metric]}</strong>
            </Link>
          ))}
        </div>
      ) : (
        <div className="v314-leader-empty">Sin datos</div>
      )}
    </section>
  );
}

function TeamsIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M3.5 19c.6-4 2.8-6 5.5-6s4.9 2 5.5 6M14 14c2.6 0 4.4 1.7 5 5" />
    </svg>
  );
}

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="m9.5 9 2.5-2 2.5 2-.8 3h-3.4L9.5 9ZM7 15l3.3-3M17 15l-3.3-3M9 18l-2-3M15 18l2-3" />
    </svg>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="v311-empty">{text}</div>;
}




function keeperSavePercentage(row: Ranking) {
  const total = row.saves + row.conceded;
  return total > 0 ? (row.saves / total) * 100 : 0;
}
function keeperSavesPerAppearance(row: Ranking) {
  return row.appearances > 0 ? row.saves / row.appearances : 0;
}
function keeperConcededPerAppearance(row: Ranking) {
  return row.appearances > 0 ? row.conceded / row.appearances : 0;
}


function assistsPerAppearance(row: Ranking) {
  return row.appearances > 0
    ? row.assists / row.appearances
    : 0;
}

function positionLabel(position: string) {
  const labels: Record<string, string> = {
    GK: "Portero (GK)",
    DF: "Defensa (DF)",
    DM: "Mediocentro defensivo (DM)",
    MF: "Centrocampista (MF)",
    AM: "Mediapunta (AM)",
    FW: "Delantero (FW)",
  };

  return labels[position] ?? position;
}


function goalsPerAppearance(row: Ranking) {
  return row.appearances > 0
    ? row.goals / row.appearances
    : 0;
}

function keeperRating(row: Ranking) {
  return row.saves * 6 - row.conceded * 5 + row.minutes * 0.2;
}

function matchDate(match: Match) {
  return match.playedAt ?? match.scheduledAt ?? match.createdAt;
}

function formatMatchTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRoundDates(round: Round | null) {
  if (!round?.startsAt && !round?.endsAt) return null;
  const format = (value: string) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));

  if (round.startsAt && round.endsAt) {
    return `${format(round.startsAt)} - ${format(round.endsAt)}`;
  }
  return format(round.startsAt ?? round.endsAt ?? "");
}

function formatSeasonRange(start: string | null, end: string | null, fallback: string) {
  if (!start && !end) return fallback;

  const f = (value: string) =>
    new Intl.DateTimeFormat("es-ES", {
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));

  if (start && end) return `${f(start)} – ${f(end)}`;
  return f(start ?? end ?? "");
}

function bestUnbeatenRun(teams: string[], matches: Match[]) {
  let best: { teamCode: string; run: number } | null = null;

  for (const teamCode of teams) {
    const chronological = [...matches]
      .filter(
        (match) =>
          match.homeTeamCode === teamCode || match.awayTeamCode === teamCode
      )
      .sort((a, b) => matchDate(a).localeCompare(matchDate(b)));

    let current = 0;
    let max = 0;

    for (const match of chronological) {
      const home = match.homeTeamCode === teamCode;
      const gf = home ? match.homeScore ?? 0 : match.awayScore ?? 0;
      const ga = home ? match.awayScore ?? 0 : match.homeScore ?? 0;
      if (gf >= ga) {
        current += 1;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    }

    if (!best || max > best.run) best = { teamCode, run: max };
  }

  return best;
}


function getBiggestWin(matches: Match[]): Match | null {
  let best: Match | null = null;
  let bestMargin = -1;

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    const margin = Math.abs(match.homeScore - match.awayScore);
    if (margin > bestMargin) {
      best = match;
      bestMargin = margin;
    } else if (
      margin === bestMargin &&
      best &&
      (match.homeScore + match.awayScore) >
        ((best.homeScore ?? 0) + (best.awayScore ?? 0))
    ) {
      best = match;
    }
  }

  return best;
}

function getHighestScoringMatch(matches: Match[]): Match | null {
  let best: Match | null = null;
  let bestTotal = -1;

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    const total = match.homeScore + match.awayScore;
    if (total > bestTotal) {
      best = match;
      bestTotal = total;
    }
  }

  return best;
}

function TrophyIcon() {
  return <svg viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24"><path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="M8 12h3M13 12h3M8 16h3"/></svg>;
}
function StadiumIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 8c2-2 14-2 16 0v7c-2 3-14 3-16 0V8Z"/><path d="M6 10c2 1 10 1 12 0M8 15h8M10 12v5M14 12v5"/></svg>;
}

