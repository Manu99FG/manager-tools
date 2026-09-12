import ClubHistoryDashboard from "@/components/ClubHistoryDashboard";
import { getClubHistoryDashboard } from "@/lib/club-history-dashboard";
export const dynamic="force-dynamic"; export const revalidate=0;
export default async function ClubHistoryPage({params}:{params:Promise<{teamCode:string}>}){const {teamCode}=await params;const data=await getClubHistoryDashboard(teamCode.toUpperCase());return <ClubHistoryDashboard data={data}/>;}
