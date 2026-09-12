import { notFound } from "next/navigation";

import CompetitionDetailHub from "@/components/CompetitionDetailHub";
import { getCompetitionPageData } from "@/lib/competitions";
import {
  getCompetitionDisplayStatistics,
} from "@/lib/competition-rankings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCompetitionStandingZones } from "@/lib/competition-standing-zones";
import { getCompetitionHistory, getCompetitionHistoryPreview } from "@/lib/competition-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

type PlayerPhotoRow = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
};

export default async function CompetitionPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const rawTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const isHistoryTab = rawTab === "historial" || rawTab === "history";
  const isOverviewTab =
    !rawTab ||
    rawTab === "general" ||
    rawTab === "vista-general" ||
    rawTab === "overview";

  const [data, statistics, standingZones] = await Promise.all([
    getCompetitionPageData(id),
    getCompetitionDisplayStatistics(id),
    getCompetitionStandingZones(id),
  ]);

  const { rankings, disciplineByMatch } = statistics;

  if (!data) notFound();

  const playerIds = Array.from(
    new Set(
      rankings
        .map((row) => row.playerId)
        .filter((value): value is string => Boolean(value))
    )
  );

  const photoById: Record<
    string,
    { fullName: string | null; photoUrl: string | null }
  > = {};

  if (playerIds.length > 0) {
    const supabase = getSupabaseAdmin();
    const chunks: string[][] = [];

    for (let index = 0; index < playerIds.length; index += 100) {
      chunks.push(playerIds.slice(index, index + 100));
    }

    const responses = await Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("players")
          .select("id,full_name,photo_url")
          .in("id", chunk)
      )
    );

    for (const { data: players, error } of responses) {
      if (error) throw error;

      for (const player of (players ?? []) as PlayerPhotoRow[]) {
        photoById[player.id] = {
          fullName: player.full_name,
          photoUrl: player.photo_url,
        };
      }
    }
  }

  const competitionWithSeries = data.competition as typeof data.competition & {
    series_id?: string | null;
  };

  const seriesId = competitionWithSeries.series_id ?? null;

  const competitionHistory =
    seriesId && isHistoryTab
      ? await getCompetitionHistory(seriesId)
      : null;

  const historySource = competitionHistory
    ? competitionHistory.editions
    : seriesId && isOverviewTab
      ? await getCompetitionHistoryPreview(seriesId, 5)
      : [];

  const destinationNames = new Map(
    data.siblingCompetitions.map((item) => [item.id, item.name])
  );
  const qualificationColor = (destinationName: string) => {
    const normalized = destinationName.toLocaleLowerCase("es");
    if (normalized.includes("champions")) return "#2563eb";
    if (normalized.includes("conference")) return "#16a34a";
    if (normalized.includes("intertoto")) return "#f59e0b";
    return "#7c3aed";
  };
  const qualificationZones = data.qualificationRules.map((rule) => {
    const destinationName =
      destinationNames.get(rule.destination_competition_id) ?? "Competición de destino";
    const range =
      rule.start_position === rule.end_position
        ? `${rule.start_position}.º`
        : `${rule.start_position}.º–${rule.end_position}.º`;
    return {
      id: rule.id,
      competitionId: data.competition.id,
      groupName: rule.group_name,
      label: `${range} → ${destinationName}`,
      startPosition: rule.start_position,
      endPosition: rule.end_position,
      color: qualificationColor(destinationName),
      sortOrder: rule.start_position,
      destinationCompetitionId: rule.destination_competition_id,
      destinationName,
    };
  });

  const historyEditions = historySource
    .filter(
      (edition) =>
        edition.status === "FINISHED" &&
        Boolean(edition.championTeamCode)
    )
    .slice(0, 5)
    .map((edition) => ({
      competitionId: edition.competitionId,
      seasonName: edition.seasonName,
      championTeamCode: edition.championTeamCode,
    }));

  return (
    <CompetitionDetailHub
      competition={{
        id: data.competition.id,
        name: data.competition.name,
        type: data.competition.type,
        status: data.competition.status,
        seasonName: data.competition.season?.name ?? "Temporada",
        seasonStartsAt: data.competition.season?.starts_at ?? null,
        seasonEndsAt: data.competition.season?.ends_at ?? null,
        seriesId: competitionWithSeries.series_id ?? null,
        pointsWin: data.competition.points_win,
        pointsDraw: data.competition.points_draw,
        pointsLoss: data.competition.points_loss,
      }}
      teams={data.teams.map((team) => team.team_code)}
      standings={data.standings}
      groupStandings={data.groupStandings}
      rounds={data.rounds.map((round) => ({
        id: round.id,
        number: round.number,
        name: round.name,
        stage: round.stage ?? null,
        startsAt: round.starts_at,
        endsAt: round.ends_at,
      }))}
      matches={data.matches.map((match) => ({
        id: match.id,
        roundId: match.round_id,
        homeTeamCode: match.home_team_code,
        awayTeamCode: match.away_team_code,
        homeScore: match.home_score,
        awayScore: match.away_score,
        homeNoShow: match.home_no_show,
        awayNoShow: match.away_no_show,
        status: match.status,
        scheduledAt: match.scheduled_at,
        playedAt: match.played_at,
        createdAt: match.created_at,
      }))}
      disciplineByMatch={disciplineByMatch}
      standingZones={standingZones}
      qualificationZones={qualificationZones}
      historyEditions={historyEditions}
      competitionHistory={competitionHistory}
      rankings={rankings.map((row) => ({
        ...row,
        displayName:
          (row.playerId ? photoById[row.playerId]?.fullName : null) ??
          row.esmsName.replaceAll("_", " "),
        photoUrl: row.playerId ? photoById[row.playerId]?.photoUrl ?? null : null,
      }))}
    />
  );
}
