"use client";

import { useMemo, useState } from "react";
import { CLUB_CLASSES } from "@/lib/club-classes";

type ClubRow = { teamCode: string; name: string; clubClass: string | null };

export default function ClubClassAdmin({ initialClubs }: { initialClubs: ClubRow[] }) {
  const [clubs, setClubs] = useState(initialClubs);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter((club) => `${club.name} ${club.teamCode} ${club.clubClass ?? ""}`.toLowerCase().includes(q));
  }, [clubs, query]);

  async function saveClub(teamCode: string) {
    const club = clubs.find((row) => row.teamCode === teamCode);
    if (!club) return;
    setSaving(teamCode);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/clubes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode, clubClass: club.clubClass ?? "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar.");
      setMessage(`${club.name}: clase actualizada.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-5 p-4 sm:p-6">
      <section className="app-panel rounded-[28px] p-6 sm:p-8">
        <div className="app-eyebrow">Administración · Clubes</div>
        <h1 className="mt-1.5 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">Clase de los clubes</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--mt-muted)]">
          Define la clase deportiva de cada club. La Copa de Leyendas usa exactamente Clase A-H y cada clase forma un grupo de 4 equipos.
        </p>
      </section>

      <section className="app-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-h-11 flex-1 items-center rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar club, código o clase..."
              className="w-full bg-transparent text-sm font-bold text-[var(--mt-text)] outline-none placeholder:text-[var(--mt-muted)]"
            />
          </label>
          <div className="text-xs font-black uppercase tracking-wide text-[var(--mt-muted)]">{visible.length} clubes</div>
        </div>
        {message ? <div className="mt-3 rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-4 py-3 text-sm font-bold text-[var(--mt-text)]">{message}</div> : null}
        {error ? <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--mt-line)]">
          <div className="grid grid-cols-[90px_minmax(0,1fr)_minmax(180px,320px)_110px] gap-3 bg-[var(--mt-surface-soft)] px-4 py-3 text-[10px] font-black uppercase tracking-[.08em] text-[var(--mt-muted)]">
            <span>Código</span><span>Club</span><span>Clase</span><span>Acción</span>
          </div>
          <div className="divide-y divide-[var(--mt-line)] bg-[var(--mt-surface)]">
            {visible.map((club) => (
              <div key={club.teamCode} className="grid grid-cols-[90px_minmax(0,1fr)_minmax(180px,320px)_110px] items-center gap-3 px-4 py-3">
                <strong className="text-sm text-[var(--mt-gold-dark)]">{club.teamCode}</strong>
                <strong className="min-w-0 truncate text-sm text-[var(--mt-text)]">{club.name}</strong>
                <select
                  value={club.clubClass ?? ""}
                  onChange={(event) => setClubs((current) => current.map((row) => row.teamCode === club.teamCode ? { ...row, clubClass: event.target.value || null } : row))}
                  className="h-10 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 text-sm font-bold text-[var(--mt-text)] outline-none focus:border-[var(--mt-gold)]"
                >
                  <option value="">Sin clase</option>
                  {CLUB_CLASSES.map((clubClass) => <option key={clubClass} value={clubClass}>{clubClass}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => saveClub(club.teamCode)}
                  disabled={saving === club.teamCode}
                  className="h-10 rounded-xl bg-[var(--mt-gold)] px-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[var(--mt-gold-dark)] disabled:opacity-50"
                >
                  {saving === club.teamCode ? "Guardando" : "Guardar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
