import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { Dropbox } from "dropbox";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const INTEGRATION_ID = "primary";
const LEGACY_BASE_FOLDER = "/ESO - Evolution Soccer Online/Plantillas";
const LEGACY_LIVE_FOLDER = "/ESO - Evolution Soccer Online/Plantillas";

export type DropboxIntegrationSettings = {
  connected: boolean;
  accountId: string | null;
  email: string | null;
  displayName: string | null;
  baseFolderPath: string | null;
  baseFiles: string[];
  liveFolderPath: string | null;
  lastSyncAt: string | null;
  lastEventAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  liveFileCount: number | null;
};

type IntegrationRow = {
  id: string;
  account_id: string | null;
  email: string | null;
  display_name: string | null;
  refresh_token_enc: string | null;
  base_folder_path: string | null;
  base_files: unknown;
  live_folder_path: string | null;
  connected_at: string | null;
  updated_at: string | null;
  last_sync_at: string | null;
  last_event_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  live_file_count: number | null;
};

function encryptionKey() {
  const raw = process.env.DROPBOX_TOKEN_ENCRYPTION_KEY ?? process.env.ADMIN_SESSION_SECRET ?? "";
  if (!raw) {
    throw new Error("Falta DROPBOX_TOKEN_ENCRYPTION_KEY (o ADMIN_SESSION_SECRET como respaldo)." );
  }
  return createHash("sha256").update(raw).digest();
}

function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptToken(value: string) {
  const [version, ivRaw, tagRaw, payloadRaw] = value.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !payloadRaw) {
    throw new Error("El token de Dropbox guardado no tiene un formato válido.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivRaw, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function normalizeFiles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function getIntegrationRow(): Promise<IntegrationRow | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("dropbox_integrations")
      .select("*")
      .eq("id", INTEGRATION_ID)
      .maybeSingle();

    if (error) {
      // Antes de ejecutar la migración, mantenemos el modo Dropbox antiguo.
      if ((error as { code?: string }).code === "42P01") return null;
      throw error;
    }

    return (data as IntegrationRow | null) ?? null;
  } catch (error) {
    console.error("No se pudo leer la integración Dropbox:", error);
    return null;
  }
}

export async function getDropboxIntegrationSettings(): Promise<DropboxIntegrationSettings> {
  const row = await getIntegrationRow();
  return {
    connected: Boolean(row?.refresh_token_enc),
    accountId: row?.account_id ?? null,
    email: row?.email ?? null,
    displayName: row?.display_name ?? null,
    baseFolderPath: row?.base_folder_path ?? null,
    baseFiles: normalizeFiles(row?.base_files),
    liveFolderPath: row?.live_folder_path ?? null,
    lastSyncAt: row?.last_sync_at ?? null,
    lastEventAt: row?.last_event_at ?? null,
    lastSyncStatus: row?.last_sync_status ?? null,
    lastSyncError: row?.last_sync_error ?? null,
    liveFileCount: row?.live_file_count ?? null,
  };
}

export async function getDropboxClient() {
  const row = await getIntegrationRow();
  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan DROPBOX_APP_KEY o DROPBOX_APP_SECRET.");
  }

  const refreshToken = row?.refresh_token_enc
    ? decryptToken(row.refresh_token_enc)
    : process.env.DROPBOX_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("Dropbox no está conectado. Ve a Administración → Integraciones.");
  }

  return new Dropbox({ refreshToken, clientId, clientSecret });
}

export async function getDropboxPlantillasFolder(kind: "base" | "live" = "live") {
  const row = await getIntegrationRow();
  if (kind === "base") return row?.base_folder_path || LEGACY_BASE_FOLDER;
  return row?.live_folder_path || LEGACY_LIVE_FOLDER;
}

export async function getDropboxRosterPath(teamCode: string, kind: "base" | "live" = "live") {
  const folder = await getDropboxPlantillasFolder(kind);
  return `${folder.replace(/\/$/, "")}/${teamCode.toUpperCase()}.txt`;
}

export async function saveDropboxOAuthConnection({
  refreshToken,
  accountId,
  email,
  displayName,
}: {
  refreshToken: string;
  accountId: string;
  email: string | null;
  displayName: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("dropbox_integrations").upsert({
    id: INTEGRATION_ID,
    account_id: accountId,
    email,
    display_name: displayName,
    refresh_token_enc: encryptToken(refreshToken),
    connected_at: now,
    updated_at: now,
    last_sync_status: "CONNECTED",
    last_sync_error: null,
  }, { onConflict: "id" });
  if (error) throw error;
}

export async function saveDropboxFolderSettings({
  baseFolderPath,
  baseFiles,
  liveFolderPath,
}: {
  baseFolderPath: string | null;
  baseFiles: string[];
  liveFolderPath: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("dropbox_integrations").update({
    base_folder_path: baseFolderPath,
    base_files: baseFiles,
    live_folder_path: liveFolderPath,
    updated_at: new Date().toISOString(),
    last_sync_status: liveFolderPath ? "READY" : "CONNECTED",
    last_sync_error: null,
  }).eq("id", INTEGRATION_ID);
  if (error) throw error;
}

export async function disconnectDropbox() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("dropbox_integrations").delete().eq("id", INTEGRATION_ID);
  if (error) throw error;
}

function isRosterFileName(name: string) {
  return /^[A-Za-z0-9_-]+\.txt$/i.test(name) && !["ALL.TXT", "SALARIOS.TXT", "POTENCIALES.TXT"].includes(name.toUpperCase());
}

export async function listDropboxFolder(path: string | null) {
  const dbx = await getDropboxClient();
  const normalized = !path || path === "/" ? "" : path;
  let response = await dbx.filesListFolder({ path: normalized, recursive: false });
  const entries = [...response.result.entries];
  while (response.result.has_more) {
    response = await dbx.filesListFolderContinue({ cursor: response.result.cursor });
    entries.push(...response.result.entries);
  }

  return entries.map((entry) => ({
    tag: entry[".tag"],
    name: entry.name,
    path: entry.path_display ?? entry.path_lower ?? "",
    pathLower: entry.path_lower ?? "",
    isRoster: entry[".tag"] === "file" && isRosterFileName(entry.name),
  }));
}

export async function syncDropboxLiveFolderStatus() {
  const row = await getIntegrationRow();
  if (!row?.refresh_token_enc || !row.live_folder_path) {
    return { ok: false, count: 0, error: "Dropbox o la carpeta de plantillas actualizadas no está configurada." };
  }

  const supabase = getSupabaseAdmin();
  try {
    const entries = await listDropboxFolder(row.live_folder_path);
    const count = entries.filter((entry) => entry.isRoster).length;
    const now = new Date().toISOString();
    const { error } = await supabase.from("dropbox_integrations").update({
      last_sync_at: now,
      last_sync_status: "OK",
      last_sync_error: null,
      live_file_count: count,
      updated_at: now,
    }).eq("id", INTEGRATION_ID);
    if (error) throw error;
    return { ok: true, count, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error sincronizando Dropbox";
    await supabase.from("dropbox_integrations").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: "ERROR",
      last_sync_error: message,
      updated_at: new Date().toISOString(),
    }).eq("id", INTEGRATION_ID);
    return { ok: false, count: 0, error: message };
  }
}

export async function markDropboxWebhookEvent() {
  const supabase = getSupabaseAdmin();
  await supabase.from("dropbox_integrations").update({
    last_event_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", INTEGRATION_ID);
}
