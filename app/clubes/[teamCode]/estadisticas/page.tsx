import ClubStatisticsDashboard from "@/components/ClubStatisticsDashboard";
import { getClubStatistics } from "@/lib/club-statistics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = { season?: string; view?: string; competition?: string; position?: string; q?: string; sort?: string; mode?: string; scope?: string };

export default async function ClubStatsPage({ params, searchParams }: { params: Promise<{ teamCode: string }>; searchParams: Promise<Search> }) {
  const [{ teamCode }, query] = await Promise.all([params, searchParams]);
  const code = teamCode.toUpperCase();
  const data = await getClubStatistics(code, query.season ?? null, query.competition ?? null);
  const view = query.view === "players" ? "players" : query.view === "team" ? "team" : query.view === "competitions" ? "competitions" : query.view === "performance" ? "performance" : query.view === "discipline" ? "discipline" : "summary";
  return <ClubStatisticsDashboard teamCode={code} data={data} view={view} query={query} />;
}
