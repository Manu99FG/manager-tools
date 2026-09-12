import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getDropboxClient,
  getDropboxIntegrationSettings,
  listDropboxFolder,
} from "@/lib/dropbox";
import { parseEsmsPlantilla } from "@/lib/parser-esms";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function playerKey(name: string, nationality: string) {
  return `${normalize(name)}::${normalize(nationality)}`;
}

function teamCodeFromPath(path: string) {
  const filename = path.split("/").filter(Boolean).pop() ?? "";
  return filename.replace(/\.txt$/i, "").toUpperCase();
}

function isRosterPath(path: string) {
  const code = teamCodeFromPath(path);
  return /^[A-Z0-9_-]{2,12}$/.test(code) && !["ALL", "SALARIOS", "POTENCIALES"].includes(code);
}

export type BasePlayersRebuildResult = {
  files: number;
  teams: number;
  parsedPlayers: number;
  created: number;
  updated: number;
  skipped: number;
};

/**
 * Reconstruye la tabla `players` a partir de las plantillas BASE configuradas
 * en Administración → Integraciones → Dropbox.
 *
 * No borra históricos ni snapshots. Si un jugador ya existe en la misma
 * plantilla, se conserva su UUID y se actualiza su equipo/propietario.
 */
export async function rebuildPlayersFromBase(): Promise<BasePlayersRebuildResult> {
  const settings = await getDropboxIntegrationSettings();
  if (!settings.connected) {
    throw new Error("Dropbox no está conectado.");
  }
  if (!settings.baseFolderPath) {
    throw new Error("Selecciona primero la carpeta de Plantillas BASE.");
  }

  let rosterPaths = settings.baseFiles.filter(isRosterPath);

  // Si no se han marcado archivos concretos, usamos todas las plantillas válidas
  // de la carpeta BASE para que una instalación nueva pueda reconstruirse con un clic.
  if (rosterPaths.length === 0) {
    const entries = await listDropboxFolder(settings.baseFolderPath);
    rosterPaths = entries
      .filter((entry) => entry.tag === "file" && entry.isRoster)
      .map((entry) => entry.path);
  }

  rosterPaths = [...new Set(rosterPaths)];
  if (rosterPaths.length === 0) {
    throw new Error("No hay plantillas ESMS válidas en la carpeta BASE seleccionada.");
  }

  const dbx = await getDropboxClient();
  const parsedRows: Array<{
    esms_name: string;
    nationality: string;
    current_team_code: string;
    owner_team_code: string;
    origin_team_code: string;
  }> = [];

  let skipped = 0;
  for (const path of rosterPaths) {
    const teamCode = teamCodeFromPath(path);
    if (!teamCode) continue;

    const response = await dbx.filesDownload({ path });
    const blob = response.result.fileBlob;
    if (!blob) {
      skipped += 1;
      continue;
    }

    const players = parseEsmsPlantilla(await blob.text());
    if (players.length === 0) {
      skipped += 1;
      continue;
    }

    for (const player of players) {
      parsedRows.push({
        esms_name: player.name,
        nationality: player.nat,
        current_team_code: teamCode,
        owner_team_code: teamCode,
        origin_team_code: teamCode,
      });
    }
  }

  const unique = new Map<string, (typeof parsedRows)[number]>();
  for (const row of parsedRows) {
    const key = playerKey(row.esms_name, row.nationality);
    const previous = unique.get(key);
    if (previous && previous.current_team_code !== row.current_team_code) {
      throw new Error(
        `Identidad ambigua en las Plantillas BASE: ${row.esms_name} (${row.nationality}) aparece en ${previous.current_team_code} y ${row.current_team_code}.`
      );
    }
    unique.set(key, row);
  }
  const rows = [...unique.values()];

  const supabase = getSupabaseAdmin();
  const { data: existingData, error: existingError } = await supabase
    .from("players")
    .select("id,esms_name,nationality,current_team_code,owner_team_code,origin_team_code");
  if (existingError) throw existingError;

  const existing = new Map<string, any>();
  for (const player of existingData ?? []) {
    existing.set(playerKey(player.esms_name, player.nationality), player);
  }

  const now = new Date().toISOString();
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; row: Record<string, unknown> }> = [];

  for (const row of rows) {
    const current = existing.get(playerKey(row.esms_name, row.nationality));
    if (!current) {
      inserts.push({ ...row, created_at: now, updated_at: now });
      continue;
    }

    // La BASE define el club de origen histórico. No debe devolver al jugador
    // a ese club si actualmente ya juega en otro equipo.
    if (current.origin_team_code !== row.origin_team_code) {
      updates.push({
        id: current.id,
        row: {
          origin_team_code: row.origin_team_code,
          updated_at: now,
        },
      });
    }
  }

  if (inserts.length > 0) {
    // Lotes pequeños para evitar payloads demasiado grandes en instalaciones con
    // plantillas extensas.
    for (let index = 0; index < inserts.length; index += 250) {
      const { error } = await supabase.from("players").insert(inserts.slice(index, index + 250));
      if (error) throw error;
    }
  }

  for (const update of updates) {
    const { error } = await supabase.from("players").update(update.row).eq("id", update.id);
    if (error) throw error;
  }

  return {
    files: rosterPaths.length,
    teams: new Set(rows.map((row) => row.current_team_code)).size,
    parsedPlayers: rows.length,
    created: inserts.length,
    updated: updates.length,
    skipped,
  };
}
