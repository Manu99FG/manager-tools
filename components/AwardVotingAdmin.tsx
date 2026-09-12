"use client";

import { useState } from "react";

type Season = { id: string; name: string };

type Candidate = {
  id: string;
  poll_id: string;
  player_id: string;
  team_code: string | null;
  sort_order: number;
  nomination_score: number | null;
  nomination_reason: string | null;
  playerName: string;
};

type Poll = {
  id: string;
  season_id: string;
  title: string;
  award_key: string;
  description: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  max_rank: number;
  points_first: number;
  points_second: number;
  points_third: number;
  show_live_results: boolean;
  candidateCount: number;
  ballotCount: number;
  candidates: Candidate[];
};

const AWARDS = [
  ["BALLON_DOR", "Balón de Oro"],
  ["MVP", "Mejor jugador / MVP"],
  ["GK", "Mejor portero"],
  ["DF", "Mejor defensor"],
  ["MF", "Mejor centrocampista"],
  ["FW", "Mejor delantero"],
  ["YOUNG", "Mejor joven (≤21)"],
];

export default function AwardVotingAdmin({
  seasons,
  initialPolls,
}: {
  seasons: Season[];
  initialPolls: Poll[];
}) {
  const [polls, setPolls] = useState(initialPolls);
  const [selectedPollId, setSelectedPollId] = useState(initialPolls[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);

  const [form, setForm] = useState({
    seasonId: seasons[0]?.id ?? "",
    title: "Balón de Oro",
    awardKey: "BALLON_DOR",
    description: "",
    maxRank: 3,
    pointsFirst: 5,
    pointsSecond: 3,
    pointsThird: 1,
  });

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId) ?? null;

  function replacePoll(next: Poll) {
    setPolls((current) =>
      current.map((poll) => (poll.id === next.id ? next : poll))
    );
  }

  async function createPoll() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/votaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo crear.");

      setPolls((current) => [payload.poll, ...current]);
      setSelectedPollId(payload.poll.id);
      setGeneratedTokens([]);
      setMessage(
        `Votación creada. La web ha seleccionado automáticamente ${payload.poll.candidateCount} nominados según su rendimiento.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al crear.");
    } finally {
      setBusy(false);
    }
  }

  async function patchPoll(patch: Record<string, unknown>) {
    if (!selectedPoll) return;
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/votaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedPoll.id, ...patch }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar.");
      replacePoll(payload.poll);
      setMessage("Votación actualizada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateCandidates() {
    if (!selectedPoll) return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/votaciones/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: selectedPoll.id }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron recalcular.");
      }

      replacePoll(payload.poll);
      setMessage(
        `Top ${payload.poll.candidateCount} recalculado con las estadísticas actuales de la temporada.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al recalcular."
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateTokens() {
    if (!selectedPoll) return;

    const raw = window.prompt("¿Cuántos códigos quieres generar?", "20");
    if (!raw) return;

    const count = Number(raw);
    if (!Number.isInteger(count) || count < 1 || count > 200) {
      setMessage("Introduce una cantidad entre 1 y 200.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setGeneratedTokens([]);

    try {
      const response = await fetch("/api/admin/votaciones/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: selectedPoll.id, count }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudieron generar.");

      setGeneratedTokens(payload.tokens ?? []);
      setMessage(
        "Códigos generados. Cópialos ahora: por seguridad no se pueden recuperar después."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al generar.");
    } finally {
      setBusy(false);
    }
  }

  async function copyTokens() {
    await navigator.clipboard.writeText(generatedTokens.join("\n"));
    setMessage("Códigos copiados al portapapeles.");
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-5">
      <section className="app-panel rounded-[28px] p-6 sm:p-8">
        <div className="app-eyebrow">Administración</div>
        <h1 className="mt-1.5 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
          Votaciones y premios
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--mt-muted)]">
          La administración crea el premio, pero no elige los nominados. Manager
          Tools calcula automáticamente los 10 mejores candidatos según el
          rendimiento real de la temporada.
        </p>
      </section>

      {message ? (
        <div className="rounded-[13px] border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-4 py-3 text-sm font-bold text-[var(--mt-gold-dark)]">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="app-panel-soft rounded-2xl p-5">
            <div className="text-sm font-black text-[var(--mt-text)]">Nueva votación</div>
            <div className="mt-1 text-xs leading-5 text-[var(--mt-muted)]">
              Al crearla, la web analiza todos los partidos jugados de esa
              temporada y genera automáticamente el Top 10.
            </div>

            <div className="mt-4 space-y-3">
              <Select
                value={form.seasonId}
                onChange={(value) => setForm({ ...form, seasonId: value })}
                options={seasons.map((season) => [season.id, season.name])}
              />
              <Select
                value={form.awardKey}
                onChange={(value) => {
                  const label =
                    AWARDS.find(([key]) => key === value)?.[1] ?? form.title;
                  setForm({ ...form, awardKey: value, title: label });
                }}
                options={AWARDS}
              />
              <Input
                value={form.title}
                onChange={(value) => setForm({ ...form, title: value })}
                placeholder="Nombre del premio"
              />
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Descripción opcional"
                rows={3}
                className="w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2.5 text-sm text-[var(--mt-text)] outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                  Puestos por papeleta
                  <select
                    value={form.maxRank}
                    onChange={(event) =>
                      setForm({ ...form, maxRank: Number(event.target.value) })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2.5 text-sm text-[var(--mt-text)]"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                  Puntos 1º/2º/3º
                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    {["pointsFirst", "pointsSecond", "pointsThird"].map((key) => (
                      <input
                        key={key}
                        type="number"
                        min="0"
                        value={form[key as keyof typeof form] as number}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            [key]: Number(event.target.value),
                          })
                        }
                        className="min-w-0 rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-2 py-2.5 text-center text-sm font-black text-[var(--mt-text)]"
                      />
                    ))}
                  </div>
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || !form.seasonId || !form.title.trim()}
              onClick={createPoll}
              className="mt-4 w-full rounded-xl bg-[var(--mt-gold)] px-4 py-3 text-sm font-black text-[var(--mt-text)] disabled:opacity-50"
            >
              Crear y calcular Top 10
            </button>
          </div>

          <div className="app-panel-soft rounded-2xl p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.13em] text-[var(--mt-muted)]">
              Votaciones
            </div>
            <div className="space-y-2">
              {polls.map((poll) => (
                <button
                  key={poll.id}
                  type="button"
                  onClick={() => {
                    setSelectedPollId(poll.id);
                    setGeneratedTokens([]);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    poll.id === selectedPollId
                      ? "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)]"
                      : "border-[var(--mt-line)] bg-[var(--mt-surface)]"
                  }`}
                >
                  <div className="font-black text-[var(--mt-text)]">{poll.title}</div>
                  <div className="mt-1 flex gap-3 text-[10px] font-bold uppercase tracking-wider text-[var(--mt-muted)]">
                    <span>{poll.status}</span>
                    <span>{poll.candidateCount} nominados</span>
                    <span>{poll.ballotCount} votos</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          {selectedPoll ? (
            <div className="space-y-5">
              <section className="app-panel-soft rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--mt-gold-dark)]">
                      {selectedPoll.award_key}
                    </div>
                    <h2 className="mt-1 text-2xl font-black text-[var(--mt-text)]">
                      {selectedPoll.title}
                    </h2>
                    <div className="mt-1 text-sm text-[var(--mt-muted)]">
                      {selectedPoll.candidateCount} nominados automáticos ·{" "}
                      {selectedPoll.ballotCount} papeletas
                    </div>
                  </div>

                  <a
                    href={`/votaciones/${selectedPoll.id}`}
                    target="_blank"
                    className="rounded-xl border border-[var(--mt-line)] px-3 py-2 text-xs font-black text-[var(--mt-muted)]"
                  >
                    Ver página pública ↗
                  </a>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {(["DRAFT", "OPEN", "CLOSED"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy}
                      onClick={() => patchPoll({ status })}
                      className={`rounded-xl border px-3 py-3 text-xs font-black ${
                        selectedPoll.status === status
                          ? "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]"
                          : "border-[var(--mt-line)] text-[var(--mt-muted)]"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <label className="mt-4 flex items-center justify-between rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 py-3">
                  <span>
                    <span className="block text-sm font-black text-[var(--mt-text)]">
                      Resultados en directo
                    </span>
                    <span className="text-xs text-[var(--mt-muted)]">
                      Si está desactivado, solo se muestran al cerrar.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedPoll.show_live_results}
                    onChange={(event) =>
                      patchPoll({ showLiveResults: event.target.checked })
                    }
                    className="h-5 w-5"
                  />
                </label>
              </section>

              <section className="app-panel-soft rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[var(--mt-text)]">
                      Top 10 automático
                    </div>
                    <div className="mt-1 text-xs text-[var(--mt-muted)]">
                      La administración no puede añadir ni quitar jugadores.
                      El ranking se calcula con estadísticas de la temporada.
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      selectedPoll.status !== "DRAFT" ||
                      selectedPoll.ballotCount > 0
                    }
                    onClick={regenerateCandidates}
                    className="rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-4 py-2.5 text-xs font-black text-[var(--mt-gold-dark)] disabled:opacity-40"
                  >
                    Recalcular Top 10
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {[...selectedPoll.candidates]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((candidate, index) => (
                      <div
                        key={candidate.id}
                        className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-3"
                      >
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--mt-surface-soft)] text-xs font-black text-[var(--mt-gold-dark)]">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-[var(--mt-text)]">
                            {candidate.playerName.replaceAll("_", " ")}
                          </div>
                          <div className="mt-0.5 truncate text-[10px] font-bold text-[var(--mt-muted)]">
                            {candidate.team_code ?? "—"}
                            {candidate.nomination_reason
                              ? ` · ${candidate.nomination_reason}`
                              : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-[var(--mt-text)]">
                            {candidate.nomination_score !== null
                              ? Number(candidate.nomination_score).toFixed(1)
                              : "—"}
                          </div>
                          <div className="text-[8px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                            score
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </section>

              <section className="app-panel-soft rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[var(--mt-text)]">
                      Códigos para managers
                    </div>
                    <div className="text-xs text-[var(--mt-muted)]">
                      Cada código permite una única papeleta en esta votación.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={generateTokens}
                    className="rounded-xl bg-[var(--mt-gold)] px-4 py-2.5 text-xs font-black text-[var(--mt-text)]"
                  >
                    Generar códigos
                  </button>
                </div>

                {generatedTokens.length ? (
                  <div className="mt-4">
                    <div className="rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] p-3 text-xs font-bold text-[var(--mt-gold-dark)]">
                      Guárdalos ahora. La base de datos solo conserva su hash.
                    </div>
                    <textarea
                      readOnly
                      value={generatedTokens.join("\n")}
                      rows={Math.min(12, generatedTokens.length + 1)}
                      className="mt-3 w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-3 font-mono text-xs text-[var(--mt-muted)]"
                    />
                    <button
                      type="button"
                      onClick={copyTokens}
                      className="mt-2 rounded-xl border border-[var(--mt-line)] px-4 py-2 text-xs font-black text-[var(--mt-text)]"
                    >
                      Copiar todos
                    </button>
                  </div>
                ) : null}
              </section>
            </div>
          ) : (
            <div className="app-panel-soft rounded-[13px] p-8 text-center text-sm text-[var(--mt-muted)]">
              Crea o selecciona una votación.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2.5 text-sm text-[var(--mt-text)] outline-none"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2.5 text-sm font-bold text-[var(--mt-text)] outline-none"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}
