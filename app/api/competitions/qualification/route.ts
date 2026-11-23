import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { buildGroupStandings } from "@/lib/competitions";
import type {
  Competition,
  CompetitionMatch,
  CompetitionQualificationRule,
  CompetitionTeam,
} from "@/lib/competition-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateLeagueCalendar } from "@/lib/league-calendar";

type RuleInput = {
  groupName?: unknown;
  startPosition?: unknown;
  endPosition?: unknown;
  destinationCompetitionId?: unknown;
};

function asPositiveInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeRules(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const input = item as RuleInput;
    return {
      groupName: typeof input.groupName === "string" ? input.groupName.trim() : "",
      startPosition: asPositiveInteger(input.startPosition),
      endPosition: asPositiveInteger(input.endPosition),
      destinationCompetitionId:
        typeof input.destinationCompetitionId === "string"
          ? input.destinationCompetitionId.trim()
          : "",
    };
  });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: unknown;
      competitionId?: unknown;
      rules?: unknown;
    };

    const action = typeof body.action === "string" ? body.action : "";
    const competitionId =
      typeof body.competitionId === "string" ? body.competitionId.trim() : "";

    if (!competitionId || !["save", "apply", "preview", "finalize"].includes(action)) {
      return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
    }

    if (action === "save") {
      return saveRules(competitionId, body.rules);
    }
    if (action === "preview") {
      return applyRules(competitionId, { write: false, finalizeSource: false });
    }
    if (action === "finalize") {
      return applyRules(competitionId, { write: true, finalizeSource: true });
    }

    return applyRules(competitionId, { write: true, finalizeSource: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}

async function saveRules(competitionId: string, rawRules: unknown) {
  const rules = normalizeRules(rawRules);
  const supabase = getSupabaseAdmin();

  const [{ data: source, error: sourceError }, { data: teams, error: teamsError }] =
    await Promise.all([
      supabase
        .from("competitions")
        .select("id,season_id,type")
        .eq("id", competitionId)
        .maybeSingle(),
      supabase
        .from("competition_teams")
        .select("team_code,group_name")
        .eq("competition_id", competitionId),
    ]);

  if (sourceError) throw sourceError;
  if (teamsError) throw teamsError;
  if (!source) {
    return NextResponse.json({ error: "La competición no existe." }, { status: 404 });
  }
  if (!['GROUPS', 'GROUPS_KNOCKOUT'].includes(String(source.type))) {
    return NextResponse.json(
      { error: "Las reglas por grupo solo están disponibles para competiciones con grupos." },
      { status: 409 }
    );
  }

  const groupSizes = new Map<string, number>();
  for (const team of teams ?? []) {
    const name = typeof team.group_name === "string" ? team.group_name.trim() : "";
    if (name) groupSizes.set(name, (groupSizes.get(name) ?? 0) + 1);
  }

  for (const rule of rules) {
    if (
      !rule.groupName ||
      !rule.startPosition ||
      !rule.endPosition ||
      !rule.destinationCompetitionId
    ) {
      return NextResponse.json({ error: "Hay una regla incompleta." }, { status: 400 });
    }
    if (rule.endPosition < rule.startPosition) {
      return NextResponse.json(
        { error: `Rango no válido en ${rule.groupName}.` },
        { status: 400 }
      );
    }
    const size = groupSizes.get(rule.groupName);
    if (!size) {
      return NextResponse.json(
        { error: `El grupo «${rule.groupName}» no existe o no tiene equipos.` },
        { status: 400 }
      );
    }
    if (rule.endPosition > size) {
      return NextResponse.json(
        { error: `${rule.groupName} tiene ${size} equipos; no existe la posición ${rule.endPosition}.` },
        { status: 400 }
      );
    }
    if (rule.destinationCompetitionId === competitionId) {
      return NextResponse.json(
        { error: "La competición de destino debe ser distinta de la competición de origen." },
        { status: 400 }
      );
    }
  }

  for (const [groupName] of groupSizes) {
    const groupRules = rules
      .filter((rule) => rule.groupName === groupName)
      .sort((a, b) => (a.startPosition ?? 0) - (b.startPosition ?? 0));
    for (let index = 1; index < groupRules.length; index += 1) {
      const previous = groupRules[index - 1];
      const current = groupRules[index];
      if ((current.startPosition ?? 0) <= (previous.endPosition ?? 0)) {
        return NextResponse.json(
          { error: `Hay posiciones solapadas en ${groupName}.` },
          { status: 400 }
        );
      }
    }
  }

  const destinationIds = [...new Set(rules.map((rule) => rule.destinationCompetitionId))];
  if (destinationIds.length) {
    const { data: destinations, error: destinationsError } = await supabase
      .from("competitions")
      .select("id,season_id")
      .in("id", destinationIds);
    if (destinationsError) throw destinationsError;

    if ((destinations ?? []).length !== destinationIds.length) {
      return NextResponse.json(
        { error: "Alguna competición de destino ya no existe." },
        { status: 400 }
      );
    }
    if ((destinations ?? []).some((item) => item.season_id !== source.season_id)) {
      return NextResponse.json(
        { error: "Origen y destino deben pertenecer a la misma temporada." },
        { status: 400 }
      );
    }
  }

  const { error: deleteError } = await supabase
    .from("competition_qualification_rules")
    .delete()
    .eq("source_competition_id", competitionId);
  if (deleteError) throw deleteError;

  if (rules.length) {
    const { error: insertError } = await supabase
      .from("competition_qualification_rules")
      .insert(
        rules.map((rule) => ({
          source_competition_id: competitionId,
          group_name: rule.groupName,
          start_position: rule.startPosition,
          end_position: rule.endPosition,
          destination_competition_id: rule.destinationCompetitionId,
        }))
      );
    if (insertError) throw insertError;
  }

  return NextResponse.json({ ok: true });
}

async function applyRules(
  competitionId: string,
  options: { write: boolean; finalizeSource: boolean }
) {
  const supabase = getSupabaseAdmin();

  const [sourceResult, teamsResult, matchesResult, rulesResult] = await Promise.all([
    supabase
      .from("competitions")
      .select("id,season_id,name,slug,type,status,points_win,points_draw,points_loss,home_and_away,created_at,updated_at")
      .eq("id", competitionId)
      .maybeSingle(),
    supabase
      .from("competition_teams")
      .select("id,competition_id,team_code,seed,group_name,created_at")
      .eq("competition_id", competitionId),
    supabase
      .from("matches")
      .select("id,competition_id,round_id,home_team_code,away_team_code,home_score,away_score,status,scheduled_at,played_at,esms_source,home_no_show,away_no_show,stt_home_score,stt_away_score,created_at,updated_at")
      .eq("competition_id", competitionId),
    supabase
      .from("competition_qualification_rules")
      .select("id,source_competition_id,group_name,start_position,end_position,destination_competition_id,created_at,updated_at")
      .eq("source_competition_id", competitionId)
      .order("group_name", { ascending: true })
      .order("start_position", { ascending: true }),
  ]);

  if (sourceResult.error) throw sourceResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (rulesResult.error) throw rulesResult.error;

  const source = sourceResult.data as Competition | null;
  if (!source) {
    return NextResponse.json({ error: "La competición no existe." }, { status: 404 });
  }

  const teams = (teamsResult.data ?? []) as CompetitionTeam[];
  const matches = (matchesResult.data ?? []) as CompetitionMatch[];
  const rules = (rulesResult.data ?? []) as CompetitionQualificationRule[];

  if (!rules.length) {
    return NextResponse.json(
      { error: "Primero debes guardar al menos una regla de clasificación." },
      { status: 409 }
    );
  }

  const groupStandings = buildGroupStandings(source, teams, matches);
  const standingsByGroup = new Map(
    groupStandings.map((group) => [group.groupName, group.standings])
  );

  for (const group of groupStandings) {
    const codes = new Set(group.standings.map((row) => row.teamCode));
    const relevantMatches = matches.filter(
      (match) => codes.has(match.home_team_code) && codes.has(match.away_team_code)
    );
    if (!relevantMatches.length) {
      return NextResponse.json(
        { error: `${group.groupName} todavía no tiene partidos.` },
        { status: 409 }
      );
    }
    const pending = relevantMatches.filter(
      (match) => match.status !== "PLAYED" && match.status !== "CANCELLED"
    );
    if (pending.length) {
      return NextResponse.json(
        { error: `${group.groupName} todavía tiene ${pending.length} partido(s) pendiente(s).` },
        { status: 409 }
      );
    }
  }

  const assignments = new Map<string, string[]>();
  for (const rule of rules) {
    const standings = standingsByGroup.get(rule.group_name);
    if (!standings) {
      return NextResponse.json(
        { error: `No se encuentra la clasificación de ${rule.group_name}.` },
        { status: 409 }
      );
    }
    const selected = standings
      .filter(
        (row) =>
          row.position >= rule.start_position && row.position <= rule.end_position
      )
      .map((row) => row.teamCode);
    const current = assignments.get(rule.destination_competition_id) ?? [];
    assignments.set(
      rule.destination_competition_id,
      [...new Set([...current, ...selected])]
    );
  }

  const preview: Array<{
    destinationCompetitionId: string;
    destinationName: string;
    teamCodes: string[];
    inserted: number;
    pendingInsert: number;
    calendarConflict: boolean;
    nextSeed: number;
    missingCodes: string[];
    replacements: Array<{ id: string; home_team_code: string; away_team_code: string; originalHome: string; originalAway: string }>;
  }> = [];

  for (const [destinationCompetitionId, teamCodes] of assignments) {
    const [{ data: destination, error: destinationError }, existingResult, destinationMatchesResult] =
      await Promise.all([
        supabase
          .from("competitions")
          .select("id,season_id,name")
          .eq("id", destinationCompetitionId)
          .maybeSingle(),
        supabase
          .from("competition_teams")
          .select("team_code,seed")
          .eq("competition_id", destinationCompetitionId),
        supabase
          .from("matches")
          .select("id,round_id,home_team_code,away_team_code,status,home_score,away_score,played_at")
          .eq("competition_id", destinationCompetitionId),
      ]);

    if (destinationError) throw destinationError;
    if (existingResult.error) throw existingResult.error;
    if (destinationMatchesResult.error) throw destinationMatchesResult.error;
    if (!destination || destination.season_id !== source.season_id) {
      return NextResponse.json(
        { error: "Una competición de destino no existe o pertenece a otra temporada." },
        { status: 409 }
      );
    }

    const existing = new Set((existingResult.data ?? []).map((row) => row.team_code));
    const missing = teamCodes.filter((code) => !existing.has(code));

    // Los cuadros oficiales contienen etiquetas de posición, no clubes reales.
    // Se reemplazan únicamente las etiquetas de cuartos (ida y vuelta).
    const destinationMatches = destinationMatchesResult.data ?? [];
    const groupRanks = new Map<string, string>();
    for (const rule of rules.filter((rule) => rule.destination_competition_id === destinationCompetitionId)) {
      const standing = standingsByGroup.get(rule.group_name) ?? [];
      const groupLetter = rule.group_name.match(/(?:Grupo\s+)?([A-D])$/i)?.[1]?.toUpperCase();
      if (!groupLetter) continue;
      for (let rank = rule.start_position; rank <= rule.end_position; rank++) {
        const team = standing.find((row) => row.position === rank)?.teamCode;
        if (team) groupRanks.set(`${rank}º Grupo ${groupLetter}`, team);
      }
    }
    const replacements = destinationMatches.flatMap((match) => {
      const home = groupRanks.get(match.home_team_code);
      const away = groupRanks.get(match.away_team_code);
      if (!home && !away) return [];
      return [{ id: match.id, home_team_code: home ?? match.home_team_code,
        away_team_code: away ?? match.away_team_code,
        originalHome: match.home_team_code, originalAway: match.away_team_code }];
    });
    // Cada plaza de cuartos debe aparecer en dos partidos de rondas distintas:
    // ida y vuelta del MISMO cruce, con localía invertida. No basta con contar
    // dos apariciones: podrían pertenecer a eliminatorias diferentes.
    const placeholderMatches = destinationMatches.filter((match) =>
      groupRanks.has(match.home_team_code) || groupRanks.has(match.away_team_code)
    );
    const slots = [...groupRanks.keys()];
    const matchPairKey = (home: string, away: string) =>
      [home, away].sort().join("::");
    const pairs = new Map<string, typeof destinationMatches>();
    for (const match of placeholderMatches) {
      const key = matchPairKey(match.home_team_code, match.away_team_code);
      pairs.set(key, [...(pairs.get(key) ?? []), match]);
    }
    const validHomeAway = [...pairs.values()].every((legs) =>
      legs.length === 2 &&
      String(legs[0].round_id) !== String(legs[1].round_id) &&
      legs[0].home_team_code === legs[1].away_team_code &&
      legs[0].away_team_code === legs[1].home_team_code
    );
    const validSlots = slots.every((placeholder) =>
      placeholderMatches.filter((match) =>
        match.home_team_code === placeholder || match.away_team_code === placeholder
      ).length === 2
    );
    const safeToReplace = placeholderMatches.every((match) =>
      match.status === "SCHEDULED" && match.home_score == null &&
      match.away_score == null && match.played_at == null
    );
    const calendarConflict = destinationMatches.length > 0 && slots.length > 0 &&
      (placeholderMatches.length === 0 || !validSlots || !validHomeAway || !safeToReplace);
    if (calendarConflict && options.write) {
      return NextResponse.json({ error: `«${destination.name}» tiene cruces incompatibles o ya disputados. No se ha modificado ningún partido.` }, { status: 409 });
    }

    const maxSeed = Math.max(0, ...(existingResult.data ?? []).map((row) => Number(row.seed) || 0));
    preview.push({
      nextSeed: maxSeed + 1,
      missingCodes: missing,
      destinationCompetitionId,
      destinationName: destination.name,
      teamCodes,
      inserted: options.write ? missing.length : 0,
      pendingInsert: missing.length,
      calendarConflict,
      replacements,
    });
  }

  const generatedCalendars: Array<{
    competitionId: string;
    competitionName: string;
    matchesCreated: number;
    roundsCreated: number;
  }> = [];

  // Sustituir etiquetas de posición sin regenerar rondas ni partidos.
  // Validar todos los destinos antes de escribir para evitar conflictos conocidos.
  if (options.write && preview.some((item) => item.calendarConflict)) {
    return NextResponse.json({ error: "Existen cruces incompatibles. No se ha finalizado." }, { status: 409 });
  }

  // Inscribir los equipos antes de actualizar los cruces existentes.
  if (options.write) {
    for (const item of preview) {
      if (!item.missingCodes.length) continue;
      const { error: insertError } = await supabase.from("competition_teams").insert(
        item.missingCodes.map((teamCode, index) => ({
          competition_id: item.destinationCompetitionId,
          team_code: teamCode,
          seed: item.nextSeed + index,
        }))
      );
      if (insertError) throw insertError;
    }
  }

  if (options.write) {
    for (const item of preview) {
      for (const match of item.replacements) {
        const { data, error } = await supabase.from("matches")
          .update({ home_team_code: match.home_team_code, away_team_code: match.away_team_code })
          .eq("id", match.id)
          .eq("home_team_code", match.originalHome)
          .eq("away_team_code", match.originalAway)
          .eq("status", "SCHEDULED")
          .select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("Un cruce ha cambiado durante la clasificación. Revisa el cuadro antes de reintentar.");
      }
    }
  }

  // Al aplicar/finalizar el reparto, las ligas de destino ya tienen su lista definitiva
  // de participantes. Generamos inmediatamente sus calendarios si todavía están vacíos.
  if (options.write) {
    for (const item of preview) {
      const result = await generateLeagueCalendar(supabase, item.destinationCompetitionId);
      if (result.generated) {
        generatedCalendars.push({
          competitionId: item.destinationCompetitionId,
          competitionName: item.destinationName,
          matchesCreated: result.matchesCreated ?? 0,
          roundsCreated: result.roundsCreated ?? 0,
        });
      }
    }
  }

  if (options.finalizeSource) {
    const { error: finalizeError } = await supabase
      .from("competitions")
      .update({ status: "FINISHED" })
      .eq("id", competitionId);
    if (finalizeError) throw finalizeError;
  }

  // Importante: aquí NO se copian matches ni match_player_stats. Las estadísticas
  // de la competición de origen siguen ligadas a sus match_id originales y el destino
  // empieza con sus propios partidos/estadísticas desde cero.
  return NextResponse.json({
    ok: true,
    assignments: preview.map(({ nextSeed: _nextSeed, missingCodes: _missingCodes, replacements: _replacements, ...assignment }) => assignment),
    generatedCalendars,
    finalized: options.finalizeSource,
  });
}
