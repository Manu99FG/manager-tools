"use client";

import { useState } from "react";

type Series = {
  id: string;
  name: string;
  type: string;
};

type Competition = {
  id: string;
  name: string;
  type: string;
  status: string;
  series_id: string | null;
  season: {
    id: string;
    name: string;
  } | null;
};

type Props = {
  initialSeries: Series[];
  competitions: Competition[];
};

export default function CompetitionHistoryAdmin({
  initialSeries,
  competitions,
}: Props) {
  const [series, setSeries] =
    useState(initialSeries);
  const [name, setName] =
    useState("");
  const [type, setType] =
    useState("LEAGUE");
  const [busy, setBusy] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  async function createSeries() {
    setMessage(null);
    setError(null);

    if (!name.trim()) {
      setError("Escribe un nombre.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/admin/competition-series",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            type,
          }),
        }
      );

      const data =
        (await response.json()) as {
          series?: Series;
          error?: string;
        };

      if (!response.ok || !data.series) {
        throw new Error(
          data.error ??
            "No se pudo crear el histórico."
        );
      }

      setSeries((current) =>
        [...current, data.series!].sort(
          (a, b) =>
            a.name.localeCompare(b.name)
        )
      );
      setName("");
      setMessage(
        "Histórico creado correctamente."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  async function assign(
    competitionId: string,
    seriesId: string
  ) {
    setMessage(null);
    setError(null);
    setBusy(true);

    try {
      const response = await fetch(
        "/api/admin/competition-series/assign",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            competitionId,
            seriesId:
              seriesId || null,
          }),
        }
      );

      const data =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudo guardar."
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error desconocido."
      );
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-2xl p-5">
        <div className="app-eyebrow">
          Nuevo histórico
        </div>

        <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
          Crear identidad de competición
        </h2>

        <p className="mt-1 text-sm text-[var(--mt-muted)]">
          Ejemplo: Primera División. El histórico se identifica por el nombre;
          el formato puede cambiar entre temporadas.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Primera División"
            className="min-h-11 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3.5 text-sm text-[var(--mt-text)] outline-none focus:border-[var(--mt-gold)]"
          />

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
            className="min-h-11 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3.5 text-sm font-bold text-[var(--mt-text)] outline-none focus:border-[var(--mt-gold)]"
          >
            <option value="LEAGUE">
              Liga
            </option>
            <option value="CUP">
              Copa
            </option>
            <option value="GROUPS">
              Grupos
            </option>
            <option value="GROUPS_KNOCKOUT">
              Grupos + eliminatorias
            </option>
            <option value="SUPERCUP">
              Supercopa
            </option>
          </select>

          <button
            type="button"
            disabled={busy}
            onClick={createSeries}
            className="min-h-11 rounded-xl bg-[var(--mt-gold)] px-5 text-sm font-black text-[var(--mt-text)] transition hover:bg-[var(--mt-gold-dark)] disabled:opacity-50"
          >
            Crear
          </button>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <section>
        <div className="app-eyebrow">
          Ediciones
        </div>

        <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
          Vincular temporadas
        </h2>

        <p className="mt-1 text-sm text-[var(--mt-muted)]">
          Cada competición de temporada puede pertenecer al mismo histórico por nombre,
          aunque cambie de formato entre temporadas.
        </p>

        <div className="mt-4 space-y-3">
          {competitions.map(
            (competition) => {
              const available = series;

              return (
                <div
                  key={competition.id}
                  className="app-panel-soft grid gap-4 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-center"
                >
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mt-muted)]">
                      {competition.season?.name ??
                        "Sin temporada"}
                    </div>

                    <div className="mt-1 text-base font-black text-[var(--mt-text)]">
                      {competition.name}
                    </div>
                  </div>

                  <select
                    value={
                      competition.series_id ??
                      ""
                    }
                    disabled={busy}
                    onChange={(event) =>
                      assign(
                        competition.id,
                        event.target.value
                      )
                    }
                    className="min-h-11 w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3.5 text-sm font-bold text-[var(--mt-text)] outline-none focus:border-[var(--mt-gold)]"
                  >
                    <option value="">
                      Sin histórico
                    </option>

                    {available.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
}
