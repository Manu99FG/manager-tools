"use client";

import { useMemo, useState } from "react";

type Series = {
  id: string;
  name: string;
  type: string;
  scope: string;
  league_level: number | null;
  counts_as_league: boolean;
  counts_as_champions: boolean;
  tracks_promotions: boolean;
  promoted_places: number;
};

type Competition = {
  id: string;
  name: string;
  series_id: string | null;
  season: { name: string } | { name: string }[] | null;
};

type Round = {
  id: string;
  competition_id: string;
  number: number;
  name: string;
  stage: string | null;
};

const SCOPES = [
  ["DOMESTIC_LEAGUE", "Liga nacional"],
  ["DOMESTIC_CUP", "Copa nacional"],
  ["CONTINENTAL", "Continental"],
  ["SUPERCUP", "Supercopa"],
  ["OTHER", "Otra"],
] as const;

const STAGES = [
  ["", "Sin definir"],
  ["LEAGUE", "Liga"],
  ["GROUP", "Fase de grupos"],
  ["ROUND_OF_16", "Octavos"],
  ["QUARTERFINAL", "Cuartos"],
  ["SEMIFINAL", "Semifinal"],
  ["FINAL", "Final"],
  ["OTHER", "Otra"],
] as const;

export default function RecordsAdmin({
  initialSeries,
  competitions,
  initialRounds,
}: {
  initialSeries: Series[];
  competitions: Competition[];
  initialRounds: Round[];
}) {
  const [series, setSeries] = useState(initialSeries);
  const [rounds, setRounds] = useState(initialRounds);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const competitionsBySeries = useMemo(() => {
    const map = new Map<string, Competition[]>();
    for (const competition of competitions) {
      if (!competition.series_id) continue;
      const list = map.get(competition.series_id) ?? [];
      list.push(competition);
      map.set(competition.series_id, list);
    }
    return map;
  }, [competitions]);

  function updateSeriesLocal(id: string, patch: Partial<Series>) {
    setSeries((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function saveSeries(item: Series) {
    setSaving(`series:${item.id}`);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/records/series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar.");

      setSeries((current) =>
        current.map((row) => (row.id === item.id ? payload.series : row))
      );
      setMessage(`Configuración guardada: ${item.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setSaving(null);
    }
  }

  async function saveRound(round: Round, stage: string) {
    setSaving(`round:${round.id}`);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/records/round", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: round.id, stage }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar.");

      setRounds((current) =>
        current.map((row) => (row.id === round.id ? payload.round : row))
      );
      setMessage(`Fase guardada: ${round.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-7">
      <section className="app-panel rounded-[26px] p-6 sm:p-8">
        <div className="app-eyebrow">Administración</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
          Configuración de récords
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--mt-muted)]">
          Define qué representa cada competición histórica y marca las fases de copa.
          Los récords usan estos datos en vez de intentar deducirlos por el nombre.
        </p>
      </section>

      {message ? (
        <div className="rounded-[13px] border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-4 py-3 text-sm font-bold text-[var(--mt-gold-dark)]">
          {message}
        </div>
      ) : null}

      <section>
        <div className="app-eyebrow">Competiciones históricas</div>
        <h2 className="mt-1.5 text-2xl font-black text-[var(--mt-text)]">Reglas de competición</h2>

        <div className="mt-4 space-y-4">
          {series.map((item) => {
            const editions = competitionsBySeries.get(item.id) ?? [];
            const isLeague = item.type === "LEAGUE";

            return (
              <article key={item.id} className="app-panel rounded-2xl p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mt-gold-dark)]">
                      {item.type}
                    </div>
                    <h3 className="mt-1 text-xl font-black text-[var(--mt-text)]">{item.name}</h3>
                    <p className="mt-1 text-xs text-[var(--mt-muted)]">
                      {editions.length} edición(es) vinculada(s)
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={saving === `series:${item.id}`}
                    onClick={() => saveSeries(item)}
                    className="rounded-xl bg-[var(--mt-gold)] px-4 py-2.5 text-xs font-black text-[var(--mt-surface)] transition hover:bg-[var(--mt-gold-dark)] disabled:opacity-50"
                  >
                    {saving === `series:${item.id}` ? "Guardando..." : "Guardar"}
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Categoría">
                    <select
                      value={item.scope}
                      onChange={(event) =>
                        updateSeriesLocal(item.id, { scope: event.target.value })
                      }
                      className="input"
                    >
                      {SCOPES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Nivel de liga">
                    <input
                      type="number"
                      min={1}
                      disabled={!isLeague}
                      value={item.league_level ?? ""}
                      onChange={(event) =>
                        updateSeriesLocal(item.id, {
                          league_level: event.target.value
                            ? Number(event.target.value)
                            : null,
                        })
                      }
                      placeholder={isLeague ? "1, 2, 3..." : "No aplica"}
                      className="input"
                    />
                  </Field>

                  <Field label="Plazas de ascenso">
                    <input
                      type="number"
                      min={0}
                      disabled={!item.tracks_promotions}
                      value={item.promoted_places}
                      onChange={(event) =>
                        updateSeriesLocal(item.id, {
                          promoted_places: Number(event.target.value),
                        })
                      }
                      className="input"
                    />
                  </Field>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Toggle
                    label="Cuenta como liga"
                    checked={item.counts_as_league}
                    onChange={(checked) =>
                      updateSeriesLocal(item.id, { counts_as_league: checked })
                    }
                  />
                  <Toggle
                    label="Cuenta como Champions"
                    checked={item.counts_as_champions}
                    onChange={(checked) =>
                      updateSeriesLocal(item.id, { counts_as_champions: checked })
                    }
                  />
                  <Toggle
                    label="Tiene ascensos"
                    checked={item.tracks_promotions}
                    onChange={(checked) =>
                      updateSeriesLocal(item.id, {
                        tracks_promotions: checked,
                        promoted_places: checked ? item.promoted_places : 0,
                      })
                    }
                  />
                </div>

                {editions.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {editions.map((competition) => (
                      <span
                        key={competition.id}
                        className="rounded-full border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-1.5 text-[10px] font-bold text-[var(--mt-muted)]"
                      >
                        {seasonName(competition.season)} · {competition.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="pt-3">
        <div className="app-eyebrow">Copas</div>
        <h2 className="mt-1.5 text-2xl font-black text-[var(--mt-text)]">Fases y finales</h2>
        <p className="mt-1 text-sm text-[var(--mt-muted)]">
          Marca especialmente la jornada FINAL para calcular títulos, finales disputadas y goles en finales.
        </p>

        <div className="mt-4 space-y-5">
          {competitions
            .filter((competition) => {
              const historical = series.find((item) => item.id === competition.series_id);
              return historical && historical.type !== "LEAGUE";
            })
            .map((competition) => {
              const competitionRounds = rounds.filter(
                (round) => round.competition_id === competition.id
              );

              return (
                <article key={competition.id} className="app-panel-soft rounded-2xl p-5">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--mt-muted)]">
                      {seasonName(competition.season)}
                    </div>
                    <h3 className="mt-1 text-lg font-black text-[var(--mt-text)]">
                      {competition.name}
                    </h3>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {competitionRounds.map((round) => (
                      <div
                        key={round.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-black text-[var(--mt-muted)]">
                            JORNADA {round.number}
                          </div>
                          <div className="truncate text-xs font-bold text-[var(--mt-muted)]">
                            {round.name}
                          </div>
                        </div>

                        <select
                          value={round.stage ?? ""}
                          disabled={saving === `round:${round.id}`}
                          onChange={(event) => saveRound(round, event.target.value)}
                          className="rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-2.5 py-2 text-[10px] font-black text-[var(--mt-muted)] outline-none"
                        >
                          {STAGES.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,.08);
          background: #081323;
          padding: .7rem .8rem;
          color: #e2e8f0;
          font-size: .75rem;
          font-weight: 700;
          outline: none;
        }
        .input:disabled {
          opacity: .4;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--mt-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 py-3">
      <span className="text-xs font-black text-[var(--mt-muted)]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-sky-500"
      />
    </label>
  );
}

function seasonName(season: Competition["season"]) {
  if (!season) return "Sin temporada";
  if (Array.isArray(season)) return season[0]?.name ?? "Sin temporada";
  return season.name;
}
