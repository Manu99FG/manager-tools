import ClubPerformanceDashboard from "@/components/ClubPerformanceDashboard";
import { getClubPerformance } from "@/lib/club-performance";
export const dynamic="force-dynamic"; export const revalidate=0;
export default async function Page({params,searchParams}:{params:Promise<{teamCode:string}>;searchParams:Promise<{season?:string}>}){const [{teamCode},q]=await Promise.all([params,searchParams]);const code=teamCode.toUpperCase();const data=await getClubPerformance(code,q.season??null);return <ClubPerformanceDashboard teamCode={code} data={data}/>}
