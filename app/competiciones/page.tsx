import CompetitionsHub from "@/components/CompetitionsHub";
import { getCompetitionCounts, getCompetitions, getSeasons } from "@/lib/competitions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompetitionsPage() {
  const [competitions, seasons, countsByCompetition] = await Promise.all([
    getCompetitions(),
    getSeasons(),
    getCompetitionCounts(),
  ]);

  const items = competitions.map((competition) => {
    const detail = countsByCompetition[competition.id];

    return {
      id: competition.id,
      name: competition.name,
      type: competition.type,
      status: competition.status,
      seasonId: competition.season_id,
      seasonName: competition.season?.name ?? "Sin temporada",
      seasonStartsAt: competition.season?.starts_at ?? null,
      seasonEndsAt: competition.season?.ends_at ?? null,
      teamCount: detail?.teamCount ?? 0,
      roundCount: detail?.roundCount ?? 0,
      matchCount: detail?.matchCount ?? 0,
    };
  });

  return (
    <CompetitionsHub
      competitions={items}
      seasons={seasons.map((season) => ({
        id: season.id,
        name: season.name,
        isActive: season.is_active,
      }))}
    />
  );
}
