"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type Props = {
  playerId: string;
  playerName: string;
  currentPhotoUrl?: string | null;
};

type ApiResult = {
  ok?: boolean;
  photoUrl?: string | null;
  error?: string;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function cleanPlayerName(value: string) {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export default function PlayerPhotoAdmin({
  playerId,
  playerName,
  currentPhotoUrl = null,
}: Props) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
      if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl);
    };
  }, [originalPreviewUrl, processedPreviewUrl]);

  function resetProcessed() {
    setProcessedBlob(null);
    setProgress(0);
    if (processedPreviewUrl) {
      URL.revokeObjectURL(processedPreviewUrl);
    }
    setProcessedPreviewUrl(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    setError(null);
    resetProcessed();

    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
      setOriginalPreviewUrl(null);
      return;
    }

    if (!ALLOWED_TYPES.has(selected.type)) {
      setError("Solo se permiten archivos JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("La imagen no puede superar los 20 MB.");
      event.target.value = "";
      return;
    }

    if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
    setFile(selected);
    setOriginalPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleRemoveBackground() {
    setMessage(null);
    setError(null);

    if (!file) {
      setError("Selecciona una imagen primero.");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const module = await import("@imgly/background-removal");
      const removeBackground = module.default;

      const blob = await removeBackground(file, {
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) {
            setProgress(Math.round((current / total) * 100));
          }
        },
      });

      if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl);
      setProcessedBlob(blob);
      setProcessedPreviewUrl(URL.createObjectURL(blob));
      setProgress(100);
      setMessage("Fondo eliminado. Revisa el resultado y pulsa Guardar fotografía.");
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "No se pudo eliminar el fondo."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!processedBlob) {
      setError("Primero elimina el fondo de la imagen.");
      return;
    }

    if (!adminPassword) {
      setError("Introduce la contraseña de administrador.");
      return;
    }

    setBusy(true);

    try {
      const pngFile = new File(
        [processedBlob],
        `${playerId}.png`,
        { type: "image/png" }
      );

      const formData = new FormData();
      formData.append("playerId", playerId);
      formData.append("adminPassword", adminPassword);
      formData.append("file", pngFile);

      const response = await fetch("/api/player-photo/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ApiResult;
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la fotografía.");
      }

      setFile(null);
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
      setOriginalPreviewUrl(null);
      resetProcessed();
      setMessage("Fotografía guardada correctamente.");
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setMessage(null);
    setError(null);

    if (!adminPassword) {
      setError("Introduce la contraseña de administrador.");
      return;
    }

    if (!window.confirm("¿Eliminar la fotografía actual del jugador?")) return;

    setBusy(true);
    try {
      const response = await fetch("/api/player-photo/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, adminPassword }),
      });

      const data = (await response.json()) as ApiResult;
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar la fotografía.");
      }

      setMessage("Fotografía eliminada.");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  const previewBox = "relative flex min-h-64 items-end justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900";

  return (
    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
      <div className="mb-4">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
          Administración
        </div>
        <h2 className="mt-1 text-lg font-bold text-white">Foto del jugador</h2>
        <p className="mt-1 text-sm text-slate-400">
          {cleanPlayerName(playerName)}. La eliminación de fondo se realiza gratis en tu navegador antes de subir la imagen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Foto actual</div>
          <div className={previewBox}>
            {currentPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentPhotoUrl} alt={cleanPlayerName(playerName)} className="max-h-72 w-full object-contain object-bottom" />
            ) : (
              <div className="px-4 py-20 text-center text-sm text-slate-500">Sin fotografía</div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Original</div>
          <div className={previewBox}>
            {originalPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={originalPreviewUrl} alt="Vista previa original" className="max-h-72 w-full object-contain" />
            ) : (
              <div className="px-4 py-20 text-center text-sm text-slate-500">Selecciona una imagen</div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sin fondo</div>
          <div className={`${previewBox} bg-[linear-gradient(45deg,#0f172a_25%,transparent_25%),linear-gradient(-45deg,#0f172a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#0f172a_75%),linear-gradient(-45deg,transparent_75%,#0f172a_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]`}>
            {processedPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={processedPreviewUrl} alt="Vista previa sin fondo" className="max-h-72 w-full object-contain object-bottom" />
            ) : (
              <div className="px-4 py-20 text-center text-sm text-slate-500">Aquí aparecerá el PNG transparente</div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleUpload} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">Seleccionar imagen</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={busy || processing} className="block w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">Contraseña de administrador</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoComplete="current-password" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          </div>
        </div>

        {processing && (
          <div className="rounded-xl border border-blue-900 bg-blue-950/30 p-4">
            <div className="mb-2 flex justify-between text-sm text-blue-200"><span>Eliminando fondo…</span><span>{progress}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-xs text-slate-400">La primera vez puede tardar más porque el navegador descarga el modelo de IA.</p>
          </div>
        )}

        {message && <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div>}
        {error && <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleRemoveBackground} disabled={!file || busy || processing} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
            {processing ? "Eliminando fondo…" : "Eliminar fondo gratis"}
          </button>

          <button type="submit" disabled={!processedBlob || busy || processing} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Guardando…" : "Guardar fotografía"}
          </button>

          {currentPhotoUrl && (
            <button type="button" onClick={handleDelete} disabled={busy || processing} className="rounded-xl border border-red-800 bg-red-950/30 px-5 py-3 text-sm font-bold text-red-300 transition hover:bg-red-950/60 disabled:opacity-50">
              Eliminar foto actual
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
