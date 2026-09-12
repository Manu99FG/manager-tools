import ClubCompetitionsDashboard from "@/components/ClubCompetitionsDashboard";
import { getClubCompetitions } from "@/lib/club-competitions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = { view?: string; season?: string; competition?: string };

export default async function ClubCompetitionsPage({ params, searchParams }: { params: Promise<{ teamCode: string }>; searchParams: Promise<Search> }) {
  const [{ teamCode }, query] = await Promise.all([params, searchParams]);
  const code = teamCode.toUpperCase();
  const view = query.view === "history" ? "history" : "current";
  const data = await getClubCompetitions(code, view === "current" ? query.season ?? null : null);
  return <ClubCompetitionsDashboard teamCode={code} data={data} view={view} query={query} />;
}
