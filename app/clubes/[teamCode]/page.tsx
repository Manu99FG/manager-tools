import ClubProfileOverview from "@/components/ClubProfileOverview";
import { getClubOverview } from "@/lib/club-overview";
export const dynamic = "force-dynamic"; export const revalidate = 0;
export default async function ClubProfilePage({ params }: { params: Promise<{ teamCode: string }> }) { const {teamCode}=await params; const code=teamCode.toUpperCase(); const data=await getClubOverview(code); return <ClubProfileOverview teamCode={code} data={data}/>; }
