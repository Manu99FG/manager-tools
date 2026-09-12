"use client";

import { useEffect, useMemo, useState } from "react";

import type { DropboxIntegrationSettings } from "@/lib/dropbox";

type FolderEntry = {
  name: string;
  path: string;
  pathLower: string;
};

type BrowserState = {
  mode: "base" | "live";
  path: string;
  folders: FolderEntry[];
  files: FolderEntry[];
  loading: boolean;
  error: string | null;
};

function parentPath(path: string) {
  if (!path || path === "/") return "";
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join("/")}` : "";
}

function formatDate(value: string | null) {
  if (!value) return "Todavía no";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function DropboxIntegrationAdmin({
  initialSettings,
}: {
  initialSettings: DropboxIntegrationSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [baseFolderPath, setBaseFolderPath] = useState(initialSettings.baseFolderPath ?? "");
  const [liveFolderPath, setLiveFolderPath] = useState(initialSettings.liveFolderPath ?? "");
  const [baseFiles, setBaseFiles] = useState<string[]>(initialSettings.baseFiles);
  const [baseFolderFiles, setBaseFolderFiles] = useState<FolderEntry[]>([]);
  const [browser, setBrowser] = useState<BrowserState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const baseFileSet = useMemo(() => new Set(baseFiles), [baseFiles]);

  async function loadFolder(mode: "base" | "live", path: string) {
    setBrowser({ mode, path, folders: [], files: [], loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/integrations/dropbox/folders?path=${encodeURIComponent(path)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo leer la carpeta");
      setBrowser({ mode, path, folders: data.folders ?? [], files: data.files ?? [], loading: false, error: null });
    } catch (error) {
      setBrowser((current) => current ? { ...current, loading: false, error: error instanceof Error ? error.message : "Error" } : null);
    }
  }

  async function loadBaseFiles(path: string) {
    if (!path) {
      setBaseFolderFiles([]);
      return;
    }
    try {
      const response = await fetch(`/api/admin/integrations/dropbox/folders?path=${encodeURIComponent(path)}`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setBaseFolderFiles(data.files ?? []);
    } catch {
      setBaseFolderFiles([]);
    }
  }

  useEffect(() => {
    if (settings.connected && baseFolderPath) void loadBaseFiles(baseFolderPath);
  }, [settings.connected, baseFolderPath]);

  function chooseCurrentFolder() {
    if (!browser) return;
    if (browser.mode === "base") {
      setBaseFolderPath(browser.path || "/");
      setBaseFiles([]);
      setBaseFolderFiles(browser.files);
    } else {
      setLiveFolderPath(browser.path || "/");
    }
    setBrowser(null);
  }

  async function saveSettings() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/integrations/dropbox/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseFolderPath, baseFiles, liveFolderPath }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar");
      setMessage(data.sync?.ok === false ? `Guardado, pero la sincronización falló: ${data.sync.error}` : "Configuración guardada. La carpeta actualizada queda sincronizada automáticamente.");
      const now = new Date().toISOString();
      setSettings((current) => ({
        ...current,
        baseFolderPath: baseFolderPath || null,
        baseFiles,
        liveFolderPath: liveFolderPath || null,
        lastSyncAt: data.sync?.ok ? now : current.lastSyncAt,
        lastSyncStatus: data.sync?.ok ? "OK" : current.lastSyncStatus,
        liveFileCount: data.sync?.ok ? data.sync.count : current.liveFileCount,
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function rebuildPlayersFromBase() {
    if (!window.confirm("¿Reconstruir la base de jugadores desde las Plantillas BASE seleccionadas? Se conservarán los UUID de jugadores que ya existan.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/integrations/dropbox/rebuild-base", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron reconstruir los jugadores");
      const result = data.result;
      setMessage(`Jugadores reconstruidos desde BASE: ${result.created} creados, ${result.updated} actualizados · ${result.parsedPlayers} jugadores · ${result.teams} clubes.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron reconstruir los jugadores");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/integrations/dropbox/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo sincronizar");
      const now = new Date().toISOString();
      setSettings((current) => ({ ...current, lastSyncAt: now, lastSyncStatus: "OK", lastSyncError: null, liveFileCount: data.count }));
      setMessage(`Sincronización correcta. ${data.count} plantillas detectadas.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo sincronizar");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("¿Desconectar Dropbox de esta web?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/integrations/dropbox/disconnect", { method: "POST" });
      if (!response.ok) throw new Error("No se pudo desconectar Dropbox");
      setSettings({
        connected: false,
        accountId: null,
        email: null,
        displayName: null,
        baseFolderPath: null,
        baseFiles: [],
        liveFolderPath: null,
        lastSyncAt: null,
        lastEventAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        liveFileCount: null,
      });
      setBaseFolderPath("");
      setLiveFolderPath("");
      setBaseFiles([]);
      setMessage("Dropbox desconectado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dropbox-admin-stack">
      <section className="dropbox-admin-header app-panel">
        <div>
          <div className="app-eyebrow">Integraciones</div>
          <h2>Dropbox</h2>
          <p>
            Conecta la cuenta Dropbox que alimentará esta instalación. Las plantillas actuales se leen siempre desde la carpeta seleccionada y Dropbox avisará a la web automáticamente cuando haya cambios.
          </p>
        </div>
        <div className={`dropbox-status ${settings.connected ? "is-connected" : ""}`}>
          <span className="dropbox-status-dot" />
          {settings.connected ? "Conectado" : "No conectado"}
        </div>
      </section>

      {!settings.connected ? (
        <section className="app-panel dropbox-connect-card">
          <div>
            <h3>Conectar una cuenta Dropbox</h3>
            <p>El usuario solo tendrá que autorizar Dropbox una vez. No comparte contraseñas, tokens ni carpetas contigo.</p>
          </div>
          <a href="/api/admin/integrations/dropbox/connect" className="app-button-primary">Conectar Dropbox</a>
        </section>
      ) : (
        <>
          <section className="dropbox-account-card app-panel">
            <div>
              <span className="app-eyebrow">Cuenta conectada</span>
              <h3>{settings.displayName || "Dropbox"}</h3>
              <p>{settings.email || settings.accountId}</p>
            </div>
            <button type="button" className="app-button-secondary" onClick={disconnect} disabled={busy}>Desconectar</button>
          </section>

          <section className="dropbox-config-grid">
            <div className="app-panel dropbox-config-card">
              <div className="app-eyebrow">Referencia</div>
              <h3>Plantillas BASE</h3>
              <p>Selecciona la carpeta de referencia y, dentro de ella, las plantillas que quieres conservar como base.</p>
              <div className="dropbox-path-row">
                <code>{baseFolderPath || "Sin seleccionar"}</code>
                <button type="button" className="app-button-secondary" onClick={() => loadFolder("base", baseFolderPath || "")}>Elegir carpeta</button>
              </div>

              {baseFolderFiles.length > 0 ? (
                <div className="dropbox-base-files">
                  <div className="dropbox-base-files-title">Plantillas base seleccionadas</div>
                  <div className="dropbox-file-grid">
                    {baseFolderFiles.map((file) => (
                      <label key={file.path} className="dropbox-file-choice">
                        <input
                          type="checkbox"
                          checked={baseFileSet.has(file.path)}
                          onChange={(event) => setBaseFiles((current) => event.target.checked ? [...new Set([...current, file.path])] : current.filter((value) => value !== file.path))}
                        />
                        <span>{file.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="dropbox-base-rebuild-action">
                <button
                  type="button"
                  className="app-button-primary"
                  onClick={rebuildPlayersFromBase}
                  disabled={busy || !baseFolderPath}
                >
                  Reconstruir jugadores desde BASE
                </button>
                <span>Repuebla la tabla de jugadores a partir de las plantillas BASE sin restaurar partidos ni históricos antiguos.</span>
              </div>
            </div>

            <div className="app-panel dropbox-config-card dropbox-live-card">
              <div className="app-eyebrow">Fuente activa</div>
              <h3>Plantillas siempre actualizadas</h3>
              <p>Esta carpeta pasa a ser la fuente oficial de plantillas de toda la web.</p>
              <div className="dropbox-path-row">
                <code>{liveFolderPath || "Sin seleccionar"}</code>
                <button type="button" className="app-button-secondary" onClick={() => loadFolder("live", liveFolderPath || "")}>Elegir carpeta</button>
              </div>
              <div className="dropbox-auto-sync">
                <span className="dropbox-auto-icon">↻</span>
                <div>
                  <strong>Sincronización automática activa</strong>
                  <span>Los cambios en Dropbox se reflejan sin intervención manual.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="dropbox-sync-card app-panel">
            <div className="dropbox-sync-metrics">
              <div><span>Última sincronización</span><strong>{formatDate(settings.lastSyncAt)}</strong></div>
              <div><span>Último aviso Dropbox</span><strong>{formatDate(settings.lastEventAt)}</strong></div>
              <div><span>Plantillas detectadas</span><strong>{settings.liveFileCount ?? "—"}</strong></div>
              <div><span>Estado</span><strong>{settings.lastSyncStatus || "Pendiente"}</strong></div>
            </div>
            {settings.lastSyncError ? <div className="dropbox-error">{settings.lastSyncError}</div> : null}
            <div className="dropbox-actions">
              <button type="button" className="app-button-secondary" onClick={syncNow} disabled={busy || !liveFolderPath}>Sincronizar ahora</button>
              <button type="button" className="app-button-primary" onClick={saveSettings} disabled={busy}>Guardar configuración</button>
            </div>
          </section>
        </>
      )}

      {message ? <div className="dropbox-message">{message}</div> : null}

      {browser ? (
        <div className="dropbox-browser-backdrop" role="presentation" onMouseDown={() => setBrowser(null)}>
          <section className="dropbox-browser" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dropbox-browser-head">
              <div>
                <span className="app-eyebrow">Dropbox</span>
                <h3>Seleccionar carpeta</h3>
              </div>
              <button type="button" onClick={() => setBrowser(null)}>×</button>
            </div>
            <div className="dropbox-browser-path">{browser.path || "/"}</div>
            <div className="dropbox-browser-toolbar">
              <button type="button" className="app-button-secondary" onClick={() => loadFolder(browser.mode, parentPath(browser.path))} disabled={!browser.path || browser.loading}>↑ Subir</button>
              <button type="button" className="app-button-primary" onClick={chooseCurrentFolder} disabled={browser.loading}>Usar esta carpeta</button>
            </div>
            {browser.loading ? <div className="dropbox-browser-empty">Cargando…</div> : browser.error ? <div className="dropbox-error">{browser.error}</div> : (
              <div className="dropbox-browser-list">
                {browser.folders.map((folder) => (
                  <button key={folder.path} type="button" onClick={() => loadFolder(browser.mode, folder.path)}>
                    <span>📁</span><strong>{folder.name}</strong><span>›</span>
                  </button>
                ))}
                {browser.folders.length === 0 ? <div className="dropbox-browser-empty">No hay subcarpetas.</div> : null}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
