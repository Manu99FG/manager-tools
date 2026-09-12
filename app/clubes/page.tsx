import ClubsDirectory from "@/components/ClubsDirectory";
import { getClubCodes } from "@/lib/club-history";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLUB_COUNTRIES: Record<string, string> = {
  AJA: "Países Bajos", PSV: "Países Bajos",
  ARS: "Inglaterra", CHE: "Inglaterra", LIV: "Inglaterra", MCI: "Inglaterra", MUN: "Inglaterra", TOT: "Inglaterra",
  ATM: "España", CEL: "España", DEP: "España", FCB: "España", RMA: "España", VAL: "España",
  BDO: "Alemania", BLE: "Alemania", BMU: "Alemania",
  BOC: "Argentina", IND: "Argentina", RIV: "Argentina",
  FLA: "Brasil", SAN: "Brasil",
  INT: "Italia", JUV: "Italia", MIL: "Italia", NAP: "Italia", PAR: "Italia", ROM: "Italia",
  MAR: "Francia", PSG: "Francia",
  OPO: "Portugal", SLB: "Portugal",
};

type CompetitionRow = { id: string; name: string; status?: string | null };
type MembershipRow = { team_code: string; competition_id: string };

export default async function ClubsPage() {
  const clubs = await getClubCodes();
  const membershipsByClub = new Map<string, string[]>();

  try {
    const supabase = getSupabaseAdmin();
    const [{ data: membershipRows }, { data: competitionRows }] = await Promise.all([
      supabase.from("competition_teams").select("team_code, competition_id"),
      supabase.from("competitions").select("id, name, status"),
    ]);

    const competitionById = new Map(
      ((competitionRows ?? []) as CompetitionRow[]).map((competition) => [competition.id, competition]),
    );

    for (const membership of (membershipRows ?? []) as MembershipRow[]) {
      const competition = competitionById.get(membership.competition_id);
      if (!competition) continue;
      const code = membership.team_code.toUpperCase();
      const names = membershipsByClub.get(code) ?? [];
      if (!names.includes(competition.name)) names.push(competition.name);
      membershipsByClub.set(code, names);
    }
  } catch {
    // La página de clubes puede seguir funcionando aunque los filtros de competición no estén disponibles.
  }

  const directory = clubs.map((code) => {
    const normalized = code.toUpperCase();
    return {
      code: normalized,
      name: getClubName(normalized),
      logo: getClubLogo(normalized),
      country: CLUB_COUNTRIES[normalized] ?? "Otros",
      competitions: membershipsByClub.get(normalized) ?? [],
    };
  });

  return <ClubsDirectory clubs={directory} />;
}
