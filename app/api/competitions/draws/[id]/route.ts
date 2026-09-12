import { randomInt } from "crypto";
import { NextResponse } from "next/server";

import { buildStandings } from "@/lib/competitions";
import type { Competition, CompetitionMatch, CompetitionTeam } from "@/lib/competition-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const GROUPS = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];

type DrawRow = {
  id: string;
  name: string;
  source_competition_id: string;
  destination_competition_id: string;
  scheduled_at: string;
  status: "SCHEDULED" | "GENERATING" | "GENERATED" | "APPLIED";
  result: DrawResult | null;
  generated_at: string | null;
  reveal_interval_seconds: number;
};

type DrawResult = {
  generatedAt: string;
  pots: Array<{ name: string; teams: string[] }>;
  groups: Record<string, string[]>;
  reveal: Array<{ index: number; pot: string; teamCode: string; groupName: string }>;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

async function readCompetitionBundle(competitionId: string) {
  const supabase = getSupabaseAdmin();
  const [competitionResult, teamsResult, matchesResult] = await Promise.all([
    supabase.from("competitions").select("id,season_id,name,slug,type,status,points_win,points_draw,points_loss,home_and_away,created_at,updated_at").eq("id", competitionId).maybeSingle(),
    supabase.from("competition_teams").select("id,competition_id,team_code,seed,group_name,created_at").eq("competition_id", competitionId),
    supabase.from("matches").select("id,competition_id,round_id,home_team_code,away_team_code,home_score,away_score,status,scheduled_at,played_at,esms_source,home_no_show,away_no_show,stt_home_score,stt_away_score,created_at,updated_at").eq("competition_id", competitionId),
  ]);
  if (competitionResult.error) throw competitionResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (!competitionResult.data) throw new Error("No se encontró la competición origen del sorteo.");
  return {
    competition: competitionResult.data as Competition,
    teams: (teamsResult.data ?? []) as CompetitionTeam[],
    matches: (matchesResult.data ?? []) as CompetitionMatch[],
  };
}

function assertNoPendingMatches(competitionName: string, matches: CompetitionMatch[]) {
  const pending = matches.filter((match) => match.status !== "PLAYED" && match.status !== "CANCELLED");
  if (pending.length) throw new Error(`${competitionName} tiene ${pending.length} partido(s) pendiente(s).`);
}

async function buildPreseasonPots(sourceCompetitionId: string) {
  const { competition, teams, matches } = await readCompetitionBundle(sourceCompetitionId);
  assertNoPendingMatches(competition.name, matches);

  const sourceGroups = Array.from(new Set(teams.map((team) => team.group_name?.trim()).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  if (sourceGroups.length !== 4) throw new Error("El sorteo Intercontinental necesita una pretemporada con 4 grupos o una liga principal de 16 equipos.");
  const pots: string[][] = [[], [], [], []];
  for (const groupName of sourceGroups) {
    const groupTeams = teams.filter((team) => team.group_name?.trim() === groupName);
    if (groupTeams.length !== 8) throw new Error(`${groupName} debe tener exactamente 8 equipos.`);
    const codes = new Set(groupTeams.map((team) => team.team_code));
    const groupMatches = matches.filter((match) => codes.has(match.home_team_code) && codes.has(match.away_team_code));
    const standings = buildStandings(competition, groupTeams, groupMatches);
    pots[0].push(...standings.slice(0, 2).map((row) => row.teamCode));
    pots[1].push(...standings.slice(2, 4).map((row) => row.teamCode));
    pots[2].push(...standings.slice(4, 6).map((row) => row.teamCode));
    pots[3].push(...standings.slice(6, 8).map((row) => row.teamCode));
  }
  return pots;
}

async function buildLeaguePots(sourceCompetitionId: string) {
  const supabase = getSupabaseAdmin();
  const source = await readCompetitionBundle(sourceCompetitionId);
  const sourceName = source.competition.name.toLocaleLowerCase("es");
  const otherName = sourceName.includes("primera") ? "segunda" : sourceName.includes("segunda") ? "primera" : null;
  if (!otherName) return null;

  const { data: otherCompetition, error } = await supabase
    .from("competitions")
    .select("id")
    .eq("season_id", source.competition.season_id)
    .ilike("name", `%${otherName}%`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!otherCompetition?.id) throw new Error(`No se encontró ${otherName === "primera" ? "Primera División" : "Segunda División"} en la misma temporada.`);

  const other = await readCompetitionBundle(String(otherCompetition.id));
  const primera = sourceName.includes("primera") ? source : other;
  const segunda = sourceName.includes("segunda") ? source : other;

  assertNoPendingMatches(primera.competition.name, primera.matches);
  assertNoPendingMatches(segunda.competition.name, segunda.matches);
  if (primera.teams.length !== 16 || segunda.teams.length !== 16) throw new Error("Primera y Segunda deben tener exactamente 16 equipos cada una para generar los bombos intercontinentales.");

  const primeraTable = buildStandings(primera.competition, primera.teams, primera.matches).map((row) => row.teamCode);
  const segundaTable = buildStandings(segunda.competition, segunda.teams, segunda.matches).map((row) => row.teamCode);
  return [0, 1, 2, 3].map((potIndex) => [
    ...primeraTable.slice(potIndex * 4, potIndex * 4 + 4),
    ...segundaTable.slice(potIndex * 4, potIndex * 4 + 4),
  ]);
}

async function buildDrawResult(sourceCompetitionId: string): Promise<DrawResult> {
  const leaguePots = await buildLeaguePots(sourceCompetitionId);
  const pots = leaguePots ?? await buildPreseasonPots(sourceCompetitionId);
  if (pots.some((pot) => pot.length !== 8)) throw new Error("No se pudieron construir los 4 bombos de 8 equipos.");

  const groups: Record<string, string[]> = Object.fromEntries(GROUPS.map((group) => [group, []]));
  const reveal: DrawResult["reveal"] = [];
  const remainingByPot = pots.map((pot) => shuffle(pot));
  const potCountByGroup = new Map<string, number[]>(GROUPS.map((group) => [group, [0, 0, 0, 0]]));

  while (reveal.length < 32) {
    const availableGroups = GROUPS.filter((groupName) => {
      const counts = potCountByGroup.get(groupName) ?? [0, 0, 0, 0];
      return groups[groupName].length < 8 && counts.some((count, potIndex) => count < 2 && remainingByPot[potIndex].length > 0);
    });
    if (!availableGroups.length) throw new Error("No quedan grupos disponibles para completar el sorteo.");

    const groupName = availableGroups[randomInt(availableGroups.length)];
    const counts = potCountByGroup.get(groupName)!;
    const availablePots = counts
      .map((count, potIndex) => ({ count, potIndex }))
      .filter(({ count, potIndex }) => count < 2 && remainingByPot[potIndex].length > 0)
      .map(({ potIndex }) => potIndex);
    if (!availablePots.length) throw new Error(`No quedan bombos disponibles para ${groupName}.`);

    const potIndex = availablePots[randomInt(availablePots.length)];
    const pot = remainingByPot[potIndex];
    const teamIndex = randomInt(pot.length);
    const [teamCode] = pot.splice(teamIndex, 1);

    groups[groupName].push(teamCode);
    counts[potIndex] += 1;
    potCountByGroup.set(groupName, counts);
    reveal.push({ index: reveal.length, pot: `Bombo ${potIndex + 1}`, teamCode, groupName });
  }

  return {
    generatedAt: new Date().toISOString(),
    pots: pots.map((teams, index) => ({ name: `Bombo ${index + 1}`, teams })),
    groups,
    reveal,
  };
}

async function applyDrawResult(draw: DrawRow, result: DrawResult) {
  const supabase = getSupabaseAdmin();
  const [{ data: destination, error: destinationError }, { count: matchCount, error: matchesError }] = await Promise.all([
    supabase.from("competitions").select("id,season_id,name").eq("id", draw.destination_competition_id).maybeSingle(),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", draw.destination_competition_id),
  ]);
  if (destinationError) throw destinationError;
  if (matchesError) throw matchesError;
  if (!destination) throw new Error("No se encontró la Copa Intercontinental destino.");
  if ((matchCount ?? 0) > 0) throw new Error("La Copa Intercontinental ya tiene calendario o partidos y no puede recibir un nuevo sorteo.");

  const rows = GROUPS.flatMap((groupName) =>
    (result.groups[groupName] ?? []).map((teamCode, index) => ({
      competition_id: draw.destination_competition_id,
      team_code: teamCode,
      group_name: groupName,
      seed: GROUPS.indexOf(groupName) * 8 + index + 1,
    }))
  );
  if (rows.length !== 32) throw new Error("El sorteo no contiene los 32 equipos necesarios para la Copa Intercontinental.");

  const { error: clearError } = await supabase.from("competition_teams").delete().eq("competition_id", draw.destination_competition_id);
  if (clearError) throw clearError;
  const { error: insertError } = await supabase.from("competition_teams").insert(rows);
  if (insertError) throw insertError;
}

async function maybeGenerate(draw: DrawRow) {
  if (draw.result || new Date(draw.scheduled_at).getTime() > Date.now()) return draw;
  const supabase = getSupabaseAdmin();
  const { data: locked, error: lockError } = await supabase
    .from("competition_draws")
    .update({ status: "GENERATING" })
    .eq("id", draw.id)
    .eq("status", "SCHEDULED")
    .select("id,source_competition_id")
    .maybeSingle();
  if (lockError) throw lockError;
  if (!locked) {
    const { data: fresh, error: freshError } = await supabase.from("competition_draws").select("*").eq("id", draw.id).single();
    if (freshError) throw freshError;
    return fresh as DrawRow;
  }
  try {
    const result = await buildDrawResult(draw.source_competition_id);
    await applyDrawResult(draw, result);
    const { data: updated, error: updateError } = await supabase
      .from("competition_draws")
      .update({ status: "APPLIED", result, generated_at: result.generatedAt })
      .eq("id", draw.id)
      .select("*")
      .single();
    if (updateError) throw updateError;
    return updated as DrawRow;
  } catch (error) {
    await supabase.from("competition_draws").update({ status: "SCHEDULED" }).eq("id", draw.id);
    throw error;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("competition_draws").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Sorteo no encontrado." }, { status: 404 });
    const draw = await maybeGenerate(data as DrawRow);
    return NextResponse.json({ ok: true, draw, serverNow: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo leer el sorteo." }, { status: 500 });
  }
}

