import HomeDashboard from "@/components/HomeDashboard";
import { getHomeDashboardData } from "@/lib/home-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const data = await getHomeDashboardData();
  return <HomeDashboard data={data} />;
}
