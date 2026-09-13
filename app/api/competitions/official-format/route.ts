import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { buildStandings } from "@/lib/competitions";
import type { Competition, CompetitionMatch, CompetitionTeam, CompetitionType } from "@/lib/competition-types";
import { OFFICIAL_COMPETITION_TEMPLATES, officialTeamCodesForTemplate } from "@/lib/official-competitions";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { CLUB_CLASSES, validateClassDistribution } from "@/lib/club-classes";

const GROUPS = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];
const FORUM_TIEBREAKERS = ["FEWER_NO_SHOWS", "HEAD_TO_HEAD_POINTS", "GOAL_DIFFERENCE", "GOALS_FOR"];

const INAUGURAL_PRESEASON_GROUPS = [
  { name: "Grupo A", teams: ["BMU", "RMA", "ROM", "SAN", "DEP", "MUN", "LIV", "CEL"] },
  { name: "Grupo B", teams: ["RIV", "SLB", "FLA", "JUV", "VAL", "MAR", "PSG", "ARS"] },
  { name: "Grupo C", teams: ["CHE", "OPO", "MCI", "PAR", "MIL", "PSV", "INT", "AJA"] },
  { name: "Grupo D", teams: ["FCB", "IND", "BDO", "ATM", "TOT", "BOC", "NAP", "BLE"] },
];

const INAUGURAL_PRESEASON_ROUNDS: Array<Array<[string, string]>> = [
  [["RMA", "CEL"], ["MUN", "SAN"], ["LIV", "DEP"], ["BMU", "ROM"], ["PSG", "SLB"], ["ARS", "FLA"], ["JUV", "MAR"], ["VAL", "RIV"], ["CHE", "OPO"], ["MCI", "PAR"], ["MIL", "PSV"], ["INT", "AJA"], ["FCB", "IND"], ["BDO", "ATM"], ["TOT", "BOC"], ["NAP", "BLE"]],
  [["SAN", "RMA"], ["DEP", "CEL"], ["ROM", "MUN"], ["BMU", "LIV"], ["FLA", "PSG"], ["MAR", "SLB"], ["RIV", "ARS"], ["VAL", "JUV"], ["PAR", "CHE"], ["PSV", "OPO"], ["AJA", "MCI"], ["INT", "MIL"], ["ATM", "FCB"], ["BOC", "IND"], ["BLE", "BDO"], ["NAP", "TOT"]],
  [["RMA", "DEP"], ["SAN", "ROM"], ["CEL", "BMU"], ["MUN", "LIV"], ["PSG", "MAR"], ["FLA", "RIV"], ["SLB", "VAL"], ["ARS", "JUV"], ["CHE", "PSV"], ["PAR", "AJA"], ["OPO", "INT"], ["MCI", "MIL"], ["FCB", "BOC"], ["ATM", "BLE"], ["IND", "NAP"], ["BDO", "TOT"]],
  [["ROM", "RMA"], ["BMU", "DEP"], ["LIV", "SAN"], ["MUN", "CEL"], ["RIV", "PSG"], ["VAL", "MAR"], ["JUV", "FLA"], ["ARS", "SLB"], ["AJA", "CHE"], ["INT", "PSV"], ["MIL", "PAR"], ["MCI", "OPO"], ["BLE", "FCB"], ["NAP", "BOC"], ["TOT", "ATM"], ["BDO", "IND"]],
  [["RMA", "BMU"], ["ROM", "LIV"], ["DEP", "MUN"], ["SAN", "CEL"], ["PSG", "VAL"], ["RIV", "JUV"], ["MAR", "ARS"], ["FLA", "SLB"], ["CHE", "INT"], ["AJA", "MIL"], ["PSV", "MCI"], ["PAR", "OPO"], ["FCB", "NAP"], ["BLE", "TOT"], ["BOC", "BDO"], ["ATM", "IND"]],
  [["LIV", "RMA"], ["MUN", "BMU"], ["CEL", "ROM"], ["SAN", "DEP"], ["JUV", "PSG"], ["ARS", "VAL"], ["SLB", "RIV"], ["FLA", "MAR"], ["MIL", "CHE"], ["MCI", "INT"], ["OPO", "AJA"], ["PAR", "PSV"], ["TOT", "FCB"], ["BDO", "NAP"], ["IND", "BLE"], ["ATM", "BOC"]],
  [["RMA", "MUN"], ["LIV", "CEL"], ["BMU", "SAN"], ["ROM", "DEP"], ["PSG", "ARS"], ["JUV", "SLB"], ["VAL", "FLA"], ["RIV", "MAR"], ["CHE", "MCI"], ["MIL", "OPO"], ["INT", "PAR"], ["AJA", "PSV"], ["FCB", "BDO"], ["TOT", "IND"], ["NAP", "ATM"], ["BLE", "BOC"]],
];


type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;
type MatchSeed = { home_team_code: string; away_team_code: string; status: "SCHEDULED" };
type CreatedCompetition = { key: string; id: string; name: string; type: CompetitionType };
type SeededTeam = { teamCode: string; groupName?: string };
type PreseasonResolution = { orderedTeams: string[]; intercontinentalTeams: SeededTeam[] };

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function cleanTeams(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item) => typeof item === "string").map((item) => item.trim().toUpperCase()).filter(Boolean)));
}

function pair(home: string, away: string): MatchSeed {
  return { home_team_code: home, away_team_code: away, status: "SCHEDULED" };
}


async function resolveOrderedTeamsFromPreseason(supabase: SupabaseAdmin, preseasonCompetitionId: string): Promise<PreseasonResolution> {
  const [competitionResult, teamsResult, matchesResult] = await Promise.all([
    supabase
      .from("competitions")
      .select("id,season_id,name,slug,type,status,points_win,points_draw,points_loss,home_and_away,created_at,updated_at")
      .eq("id", preseasonCompetitionId)
      .maybeSingle(),
    supabase
      .from("competition_teams")
      .select("id,competition_id,team_code,seed,group_name,created_at")
      .eq("competition_id", preseasonCompetitionId),
    supabase
      .from("matches")
      .select("id,competition_id,round_id,home_team_code,away_team_code,home_score,away_score,status,scheduled_at,played_at,esms_source,home_no_show,away_no_show,stt_home_score,stt_away_score,created_at,updated_at")
      .eq("competition_id", preseasonCompetitionId),
  ]);

  if (competitionResult.error) throw competitionResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (!competitionResult.data) throw new Error("No se encontró la competición de pretemporada.");

  const competition = competitionResult.data as Competition;
  const teams = (teamsResult.data ?? []) as CompetitionTeam[];
  const matches = (matchesResult.data ?? []) as CompetitionMatch[];
  const pending = matches.filter((match) => match.status !== "PLAYED" && match.status !== "CANCELLED");
  if (pending.length) throw new Error(`La pretemporada todavía tiene ${pending.length} partido(s) pendiente(s).`);

  const groupNames = Array.from(new Set(teams.map((team) => team.group_name?.trim()).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  if (groupNames.length !== 4) throw new Error("La pretemporada inaugural debe tener exactamente 4 grupos.");

  const firstDivision: string[] = [];
  const secondDivision: string[] = [];
  const pots: string[][] = [[], [], [], []];

  for (const groupName of groupNames) {
    const groupTeams = teams.filter((team) => team.group_name?.trim() === groupName);
    if (groupTeams.length !== 8) throw new Error(`${groupName} debe tener exactamente 8 equipos.`);
    const groupCodes = new Set(groupTeams.map((team) => team.team_code));
    const groupMatches = matches.filter((match) => groupCodes.has(match.home_team_code) && groupCodes.has(match.away_team_code));
    const standings = buildStandings(competition, groupTeams, groupMatches);
    if (standings.length !== 8) throw new Error(`No se pudo calcular la clasificación completa de ${groupName}.`);
    firstDivision.push(...standings.slice(0, 4).map((row) => row.teamCode));
    secondDivision.push(...standings.slice(4, 8).map((row) => row.teamCode));
    pots[0].push(...standings.slice(0, 2).map((row) => row.teamCode));
    pots[1].push(...standings.slice(2, 4).map((row) => row.teamCode));
    pots[2].push(...standings.slice(4, 6).map((row) => row.teamCode));
    pots[3].push(...standings.slice(6, 8).map((row) => row.teamCode));
  }

  const intercontinentalTeams = GROUPS.flatMap((groupName, groupIndex) =>
    pots.flatMap((pot) => [
      { teamCode: pot[groupIndex * 2], groupName },
      { teamCode: pot[groupIndex * 2 + 1], groupName },
    ])
  );

  if (intercontinentalTeams.some((team) => !team.teamCode)) {
    throw new Error("No se pudieron construir los bombos de la Copa Intercontinental desde la pretemporada.");
  }

  return { orderedTeams: [...firstDivision, ...secondDivision], intercontinentalTeams };
}


async function resolveCopaLeyendasTeamsByClass(supabase: SupabaseAdmin, teamCodes: string[]): Promise<SeededTeam[]> {
  const codes = Array.from(new Set(teamCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)));
  if (codes.length !== 32) {
    throw new Error(`La Copa de Leyendas necesita exactamente 32 equipos; hay ${codes.length}.`);
  }

  const { data, error } = await supabase
    .from("club_metadata")
    .select("team_code,club_class")
    .in("team_code", codes);
  if (error) throw error;

  const classByCode = new Map((data ?? []).map((row) => [String(row.team_code).trim().toUpperCase(), typeof row.club_class === "string" ? row.club_class : null]));
  const rows = codes.map((teamCode) => ({ teamCode, clubClass: classByCode.get(teamCode) ?? null }));
  const validation = validateClassDistribution(rows, 4);

  if (validation.missing.length) {
    throw new Error(`Falta asignar una clase a: ${validation.missing.join(", ")}. Hazlo en Administración → Clubes.`);
  }
  if (validation.invalid.length) {
    throw new Error(`Hay clases no válidas: ${validation.invalid.map((item) => `${item.teamCode} (${item.value})`).join(", ")}. Usa Clase A-H.`);
  }
  if (validation.wrongSizes.length) {
    throw new Error(`Cada clase de la Copa de Leyendas debe tener 4 equipos. Revisa: ${validation.wrongSizes.map((item) => `${item.clubClass} (${item.teams.length})`).join(", ")}.`);
  }

  return CLUB_CLASSES.flatMap((clubClass) =>
    (validation.byClass.get(clubClass) ?? [])
      .slice()
      .sort((a, b) => a.localeCompare(b, "es"))
      .map((teamCode) => ({ teamCode, groupName: clubClass }))
  );
}

async function getOrCreateSeriesId(supabase: SupabaseAdmin, name: string, type: CompetitionType) {
  const { data: existing, error: findError } = await supabase.from("competition_series").select("id").ilike("name", name).limit(1).maybeSingle();
  if (findError) throw findError;
  if (existing?.id) return String(existing.id);

  const { data: created, error: createError } = await supabase.from("competition_series").insert({ name, type }).select("id").single();
  if (!createError && created?.id) return String(created.id);

  const { data: afterConflict, error: conflictError } = await supabase.from("competition_series").select("id").ilike("name", name).limit(1).maybeSingle();
  if (conflictError) throw conflictError;
  if (afterConflict?.id) return String(afterConflict.id);
  throw createError ?? new Error(`No se pudo crear el histórico de ${name}.`);
}


async function seedInauguralPreseason(supabase: SupabaseAdmin, competitionId: string) {
  const teams = INAUGURAL_PRESEASON_GROUPS.flatMap((group) =>
    group.teams.map((teamCode, index) => ({ teamCode, groupName: group.name, localSeed: index + 1 }))
  );
  const { error: teamsError } = await supabase.from("competition_teams").insert(
    teams.map((team, index) => ({
      competition_id: competitionId,
      team_code: team.teamCode,
      seed: index + 1,
      group_name: team.groupName,
    }))
  );
  if (teamsError) throw teamsError;

  await createRoundsAndMatches(
    supabase,
    competitionId,
    INAUGURAL_PRESEASON_ROUNDS.map((matches, index) => ({
      name: `Jornada ${index + 1}`,
      stage: "GROUP",
      matches: matches.map(([home, away]) => pair(home, away)),
    }))
  );
}

async function createCompetition(supabase: SupabaseAdmin, seasonId: string, template: (typeof OFFICIAL_COMPETITION_TEMPLATES)[number], teams: Array<string | SeededTeam>): Promise<CreatedCompetition> {
  const seriesId = await getOrCreateSeriesId(supabase, template.name, template.type);
  const { data, error } = await supabase.from("competitions").insert({
    season_id: seasonId,
    name: template.name,
    slug: slugify(template.name),
    type: template.type,
    series_id: seriesId,
    home_and_away: template.homeAndAway,
    status: "DRAFT",
    standings_tiebreakers: FORUM_TIEBREAKERS,
  }).select("id,name,type").single();
  if (error) throw error;

  if (template.key === "pretemporada-inaugural") {
    await seedInauguralPreseason(supabase, String(data.id));
  } else if (teams.length) {
    const groupSize = template.key === "intercontinental" ? 8 : template.key === "copa-leyendas" ? 4 : 0;
    const groups = template.key === "intercontinental" ? GROUPS : template.key === "copa-leyendas" ? [...CLUB_CLASSES] : [];
    const { error: teamsError } = await supabase.from("competition_teams").insert(teams.map((team, index) => {
      const seeded = typeof team === "string" ? null : team;
      const teamCode = typeof team === "string" ? team : team.teamCode;
      return {
        competition_id: data.id,
        team_code: teamCode,
        seed: index + 1,
        group_name: seeded?.groupName ?? (groupSize ? groups[Math.floor(index / groupSize)] ?? groups.at(-1) : null),
      };
    }));
    if (teamsError) throw teamsError;
  }

  return { key: template.key, id: String(data.id), name: String(data.name), type: data.type as CompetitionType };
}

async function createRoundsAndMatches(supabase: SupabaseAdmin, competitionId: string, rounds: Array<{ name: string; stage: string; matches: MatchSeed[] }>) {
  if (!rounds.length) return;
  const { data: createdRounds, error: roundsError } = await supabase.from("competition_rounds").insert(rounds.map((round, index) => ({
    competition_id: competitionId,
    number: index + 1,
    name: round.name,
    stage: round.stage,
  }))).select("id,number");
  if (roundsError) throw roundsError;

  const roundIdByNumber = new Map((createdRounds ?? []).map((round) => [Number(round.number), String(round.id)]));
  const matchRows = rounds.flatMap((round, index) => {
    const roundId = roundIdByNumber.get(index + 1);
    if (!roundId) throw new Error(`No se pudo resolver ${round.name}.`);
    return round.matches.map((match) => ({ competition_id: competitionId, round_id: roundId, ...match }));
  });
  if (matchRows.length) {
    const { error: matchesError } = await supabase.from("matches").insert(matchRows);
    if (matchesError) throw matchesError;
  }
}

function europeanQuarterFinals(prefix: "1" | "3" | "5") {
  const next = String(Number(prefix) + 1);
  return [pair(`${next}º Grupo B`, `${prefix}º Grupo A`), pair(`${next}º Grupo A`, `${prefix}º Grupo B`), pair(`${next}º Grupo D`, `${prefix}º Grupo C`), pair(`${next}º Grupo C`, `${prefix}º Grupo D`)];
}


function reverseMatches(matches: MatchSeed[]) {
  return matches.map((match) => pair(match.away_team_code, match.home_team_code));
}

function europeanKnockoutRounds(prefix: "1" | "3" | "5") {
  const quarters = europeanQuarterFinals(prefix);
  const semis = [pair("Ganador Cuartos 1", "Ganador Cuartos 2"), pair("Ganador Cuartos 3", "Ganador Cuartos 4")];
  return [
    { name: "Cuartos de final - ida", stage: "QUARTERFINAL", matches: quarters },
    { name: "Cuartos de final - vuelta", stage: "QUARTERFINAL", matches: reverseMatches(quarters) },
    { name: "Semifinales - ida", stage: "SEMIFINAL", matches: semis },
    { name: "Semifinales - vuelta", stage: "SEMIFINAL", matches: reverseMatches(semis) },
    { name: "Final", stage: "FINAL", matches: [pair("Ganador Semifinal 1", "Ganador Semifinal 2")] },
  ];
}

async function createOfficialBrackets(supabase: SupabaseAdmin, created: CreatedCompetition[]) {
  const byKey = new Map(created.map((competition) => [competition.key, competition]));
  const champions = byKey.get("champions");
  if (champions) await createRoundsAndMatches(supabase, champions.id, europeanKnockoutRounds("1"));

  const conference = byKey.get("conference");
  if (conference) await createRoundsAndMatches(supabase, conference.id, europeanKnockoutRounds("3"));

  const intertoto = byKey.get("intertoto");
  if (intertoto) await createRoundsAndMatches(supabase, intertoto.id, europeanKnockoutRounds("5"));

  const recopaLiga = byKey.get("recopa-liga");
  if (recopaLiga) await createRoundsAndMatches(supabase, recopaLiga.id, [{ name: "Final", stage: "FINAL", matches: [pair("Campeón Primera División", "Campeón Copa de Leyendas")] }]);
  const recopaInter = byKey.get("recopa-intercontinental");
  if (recopaInter) await createRoundsAndMatches(supabase, recopaInter.id, [{ name: "Final", stage: "FINAL", matches: [pair("Campeón Champions League", "Campeón Conference League")] }]);
  const mundial = byKey.get("mundial-clubes");
  if (mundial) await createRoundsAndMatches(supabase, mundial.id, [
    { name: "Fase previa", stage: "PRELIMINARY", matches: [pair("Campeón Primera División", "Campeón Copa Intertoto"), pair("Campeón Segunda División", "Campeón Conference League")] },
    { name: "Semifinales", stage: "SEMIFINAL", matches: [pair("Campeón Copa de Leyendas", "Ganador Fase Previa 1"), pair("Campeón Champions League", "Ganador Fase Previa 2")] },
    { name: "Final", stage: "FINAL", matches: [pair("Ganador Semifinal 1", "Ganador Semifinal 2")] },
  ]);
}

async function createQualificationRules(supabase: SupabaseAdmin, created: CreatedCompetition[]) {
  const byKey = new Map(created.map((competition) => [competition.key, competition]));
  const intercontinental = byKey.get("intercontinental");
  if (!intercontinental) return;
  const rows = GROUPS.flatMap((groupName) => [
    { source_competition_id: intercontinental.id, group_name: groupName, start_position: 1, end_position: 2, destination_competition_id: byKey.get("champions")?.id },
    { source_competition_id: intercontinental.id, group_name: groupName, start_position: 3, end_position: 4, destination_competition_id: byKey.get("conference")?.id },
    { source_competition_id: intercontinental.id, group_name: groupName, start_position: 5, end_position: 6, destination_competition_id: byKey.get("intertoto")?.id },
  ]).filter((row): row is { source_competition_id: string; group_name: string; start_position: number; end_position: number; destination_competition_id: string } => Boolean(row.destination_competition_id));
  if (rows.length) {
    const { error } = await supabase.from("competition_qualification_rules").insert(rows);
    if (error) throw error;
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const body = (await request.json()) as { seasonId?: unknown; teams?: unknown; include?: unknown; preseasonCompetitionId?: unknown };
    const seasonId = typeof body.seasonId === "string" ? body.seasonId.trim() : "";
    const preseasonCompetitionId = typeof body.preseasonCompetitionId === "string" ? body.preseasonCompetitionId.trim() : "";
    let teams = cleanTeams(body.teams);
    let preseasonResolution: PreseasonResolution | null = null;
    const include = Array.isArray(body.include) ? new Set(body.include.filter((item) => typeof item === "string")) : null;
    if (!seasonId) return NextResponse.json({ error: "Selecciona una temporada." }, { status: 400 });
    if (!preseasonCompetitionId && teams.length < 32) return NextResponse.json({ error: "El formato oficial necesita 32 equipos ordenados." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: season, error: seasonError } = await supabase.from("seasons").select("id").eq("id", seasonId).maybeSingle();
    if (seasonError) throw seasonError;
    if (!season) return NextResponse.json({ error: "La temporada no existe." }, { status: 404 });

    const { data: seasons, error: seasonsError } = await supabase
      .from("seasons")
      .select("id,name,starts_at")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    if (seasonsError) throw seasonsError;
    const firstSeasonId = seasons?.[0]?.id ? String(seasons[0].id) : seasonId;
    const isFirstSeason = seasonId === firstSeasonId;

    const selectedTemplates = OFFICIAL_COMPETITION_TEMPLATES.filter((template) => {
      if (preseasonCompetitionId && template.key === "pretemporada-inaugural") return false;
      if (!isFirstSeason && template.key === "pretemporada-inaugural") return false;
      if (isFirstSeason && !preseasonCompetitionId && template.key !== "pretemporada-inaugural") return false;
      return !include || include.has(template.key);
    });
    if (!selectedTemplates.length) return NextResponse.json({ error: "Selecciona al menos una plantilla." }, { status: 400 });

    if (preseasonCompetitionId) {
      preseasonResolution = await resolveOrderedTeamsFromPreseason(supabase, preseasonCompetitionId);
      teams = preseasonResolution.orderedTeams;
    }

    const names = selectedTemplates.map((template) => template.name);
    const { data: existing, error: existingError } = await supabase.from("competitions").select("name").eq("season_id", seasonId).in("name", names);
    if (existingError) throw existingError;
    if ((existing ?? []).length) return NextResponse.json({ error: `Ya existen en esta temporada: ${(existing ?? []).map((item) => item.name).join(", ")}.` }, { status: 409 });

    const created: CreatedCompetition[] = [];
    try {
      for (const template of selectedTemplates) {
        let templateTeams: Array<string | SeededTeam>;
        if (template.key === "copa-leyendas") {
          const participants = officialTeamCodesForTemplate(template.teamMode, teams);
          templateTeams = await resolveCopaLeyendasTeamsByClass(supabase, participants);
        } else if (template.key === "intercontinental") {
          // La Copa Intercontinental nace vacía. Sus 32 equipos y sus grupos
          // se asignan exclusivamente cuando se ejecuta el sorteo oficial.
          templateTeams = [];
        } else {
          templateTeams = officialTeamCodesForTemplate(template.teamMode, teams);
        }
        created.push(await createCompetition(supabase, seasonId, template, templateTeams));
      }
      await createOfficialBrackets(supabase, created);
      await createQualificationRules(supabase, created);
      return NextResponse.json({ ok: true, created });
    } catch (error) {
      if (created.length) await supabase.from("competitions").delete().in("id", created.map((competition) => competition.id));
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido." }, { status: 500 });
  }
}

