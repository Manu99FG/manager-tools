"use client";

import { useMemo, useState } from "react";

type Candidate = {
  id: string;
  playerName: string;
  team_code: string | null;
};

export default function AwardBallot({
  pollId,
  candidates,
  maxRank,
}: {
  pollId: string;
  candidates: Candidate[];
  maxRank: number;
}) {
  const [token, setToken] = useState("");
  const [choices, setChoices] = useState<string[]>(
    Array.from({ length: maxRank }, () => "")
  );
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const duplicate = useMemo(() => {
    const selected = choices.filter(Boolean);
    return new Set(selected).size !== selected.length;
  }, [choices]);

  function setChoice(index: number, value: string) {
    setChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? value : choice
      )
    );
  }

  async function submit() {
    if (!token.trim()) {
      setMessage("Introduce tu código de votación.");
      return;
    }

    if (!choices[0]) {
      setMessage("Debes elegir al menos al primer clasificado.");
      return;
    }

    const firstEmpty = choices.findIndex((choice) => !choice);
    if (
      firstEmpty !== -1 &&
      choices.slice(firstEmpty + 1).some(Boolean)
    ) {
      setMessage("No puedes dejar huecos entre posiciones.");
      return;
    }

    if (duplicate) {
      setMessage("No puedes elegir dos veces al mismo jugador.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payloadChoices = choices
        .filter(Boolean)
        .map((candidateId, index) => ({
          candidateId,
          rank: index + 1,
        }));

      const response = await fetch(`/api/votaciones/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          choices: payloadChoices,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo registrar el voto.");
      }

      setDone(true);
      setMessage("Tu voto ha quedado registrado correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo registrar el voto."
      );
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[13px] border border-emerald-400/20 bg-emerald-400/[0.07] p-5">
        <div className="text-sm font-black text-emerald-700">
          ✓ Voto registrado
        </div>
        <p className="mt-1 text-sm text-[var(--mt-muted)]">
          El código ha quedado consumido y no puede volver a utilizarse en esta
          votación.
        </p>
      </div>
    );
  }

  return (
    <div className="app-panel-soft rounded-2xl p-5 sm:p-6">
      <div className="app-eyebrow">Tu papeleta</div>
      <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
        Ordena tus candidatos
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)]">
        Puedes votar hasta {maxRank} candidato{maxRank === 1 ? "" : "s"}. Cada
        código solo permite una papeleta.
      </p>

      <div className="mt-5 space-y-3">
        {choices.map((choice, index) => (
          <label key={index} className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--mt-muted)]">
              {index + 1}.ª elección
            </span>
            <select
              value={choice}
              onChange={(event) => setChoice(index, event.target.value)}
              className="w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-3 text-sm font-bold text-[var(--mt-text)] outline-none"
            >
              <option value="">— Seleccionar —</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.playerName.replaceAll("_", " ")}
                  {candidate.team_code ? ` · ${candidate.team_code}` : ""}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--mt-muted)]">
          Código de manager
        </span>
        <input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Ej. MT-ABCD-1234"
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-3 text-sm font-black uppercase tracking-wider text-[var(--mt-text)] outline-none"
        />
      </label>

      {message ? (
        <div className="mt-4 rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-4 py-3 text-sm font-bold text-[var(--mt-gold-dark)]">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={saving || duplicate || candidates.length === 0}
        className="mt-5 w-full rounded-xl bg-[var(--mt-gold)] px-4 py-3 text-sm font-black text-[var(--mt-text)] transition hover:bg-[var(--mt-gold-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Registrando..." : "Confirmar voto"}
      </button>
    </div>
  );
}
