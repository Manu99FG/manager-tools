import ClubMatchesDashboard from "@/components/ClubMatchesDashboard";
import { getClubMatches } from "@/lib/club-matches";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = { season?: string; view?: string; competition?: string; status?: string; venue?: string };

export default async function ClubMatchesPage({ params, searchParams }: { params: Promise<{ teamCode: string }>; searchParams: Promise<Search> }) {
  const [{ teamCode }, query] = await Promise.all([params, searchParams]);
  const code = teamCode.toUpperCase();
  const data = await getClubMatches(code, query.season ?? null);
  const view = query.view === "calendar" ? "calendar" : query.view === "results" ? "results" : "summary";
  return <ClubMatchesDashboard teamCode={code} data={data} view={view} query={query} />;
}
