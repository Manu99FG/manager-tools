import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import ClubProfileShell from "@/components/ClubProfileShell";
import { getClubCodes } from "@/lib/club-history";
import { getClubOverview } from "@/lib/club-overview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClubLayout({ children, params }: { children: ReactNode; params: Promise<{ teamCode: string }> }) {
  const { teamCode: rawCode } = await params;
  const teamCode = rawCode.toUpperCase();
  const codes = await getClubCodes();
  if (!codes.includes(teamCode)) notFound();
  const data = await getClubOverview(teamCode);
  return <ClubProfileShell teamCode={teamCode} data={data}>{children}</ClubProfileShell>;
}
