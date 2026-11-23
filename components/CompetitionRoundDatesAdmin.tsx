"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompetitionRound } from "@/lib/competition-types";

type Draft = { startsAt: string; endsAt: string };
const fromRounds = (rounds: CompetitionRound[]): Record<string, Draft> =>
  Object.fromEntries(rounds.map((round) => [round.id, { startsAt: round.starts_at ?? "", endsAt: round.ends_at ?? "" }]));

export default function CompetitionRoundDatesAdmin({ competitionId, rounds }: { competitionId: string; rounds: CompetitionRound[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => fromRounds(rounds));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [globalFeedback, setGlobalFeedback] = useState("");

  // Refresh the form after server navigation, without erasing unsaved edits.
  useEffect(() => {
    setDrafts((current) => {
      const next = fromRounds(rounds);
      for (const round of rounds) {
        const previous = current[round.id];
        if (previous && feedback[round.id] !== "Fechas guardadas." &&
          (previous.startsAt !== (round.starts_at ?? "") || previous.endsAt !== (round.ends_at ?? ""))) {
          next[round.id] = previous;
        }
      }
      return next;
    });
    // Updates from the server are authoritative after a successful save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds]);

  const ordered = useMemo(() => [...rounds].sort((a, b) => a.number - b.number), [rounds]);
  const invalid = (id: string) => {
    const draft = drafts[id];
    return Boolean(draft?.startsAt && draft?.endsAt && draft.startsAt > draft.endsAt);
  };
  const changed = (round: CompetitionRound) => {
    const draft = drafts[round.id];
    return Boolean(draft && (draft.startsAt !== (round.starts_at ?? "") || draft.endsAt !== (round.ends_at ?? "")));
  };
  const pending = ordered.filter(changed);
  const update = (id: string, field: keyof Draft, value: string) => {
    setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], [field]: value } }));
    setFeedback((previous) => ({ ...previous, [id]: "" }));
    setGlobalFeedback("");
  };

  async function persist(round: CompetitionRound) {
    const draft = drafts[round.id];
    if (!draft || invalid(round.id)) throw new Error("La fecha inicial no puede superar la final.");
    const response = await fetch("/api/admin/competition-round-dates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitionId, roundId: round.id, startsAt: draft.startsAt || null, endsAt: draft.endsAt || null }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Error al guardar.");
  }

  async function save(selected: CompetitionRound[]) {
    if (saving || selected.length === 0) return;
    if (selected.some((round) => invalid(round.id))) {
      setGlobalFeedback("Corrige los intervalos inválidos antes de guardar.");
      return;
    }
    setSaving(true);
    setGlobalFeedback("");
    let success = 0;
    for (const round of selected) {
      try {
        await persist(round);
        success += 1;
        setFeedback((previous) => ({ ...previous, [round.id]: "Fechas guardadas." }));
      } catch (error) {
        setFeedback((previous) => ({ ...previous, [round.id]: error instanceof Error ? error.message : "Error al guardar." }));
      }
    }
    setGlobalFeedback(`${success} de ${selected.length} ronda(s) guardada(s).${success < selected.length ? " Revisa los errores indicados y vuelve a intentar." : ""}`);
    setSaving(false);
    if (success) router.refresh();
  }

  return (
    <section className="manage-comp-card" style={{ marginTop: 20 }}>
      <div className="manage-comp-section-head"><div><span>Calendario</span><h2>Fechas de las rondas</h2></div></div>
      <p>Modifica las fechas sin regenerar partidos ni alterar resultados. Deja ambos campos vacíos para quitar las fechas. Las fechas de los partidos individuales no se modifican.</p>
      {rounds.length === 0 ? <p>No hay rondas creadas.</p> : <>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {ordered.map((round, index) => {
            const draft = drafts[round.id] ?? { startsAt: "", endsAt: "" };
            const previous = ordered[index - 1];
            const previousEnd = previous ? drafts[previous.id]?.endsAt : "";
            const overlaps = Boolean(previousEnd && draft.startsAt && draft.startsAt < previousEnd);
            return <div key={round.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 12, padding: 12, border: "1px solid #E9E8E5", borderRadius: 8 }}>
              <strong style={{ minWidth: 150 }}>{round.name}</strong>
              <label>Desde <input type="date" value={draft.startsAt} disabled={saving} aria-invalid={invalid(round.id)} onChange={(event) => update(round.id, "startsAt", event.target.value)} /></label>
              <label>Hasta <input type="date" value={draft.endsAt} disabled={saving} aria-invalid={invalid(round.id)} onChange={(event) => update(round.id, "endsAt", event.target.value)} /></label>
              <button type="button" disabled={saving || !changed(round) || invalid(round.id)} onClick={() => void save([round])}>Guardar</button>
              {invalid(round.id) ? <small role="alert">La fecha inicial supera la final.</small> : null}
              {overlaps ? <small style={{ color: "#9A7425" }}>Aviso: se solapa con la ronda anterior.</small> : null}
              {feedback[round.id] ? <small role="status">{feedback[round.id]}</small> : null}
            </div>;
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <button type="button" disabled={saving || !pending.length || pending.some((round) => invalid(round.id))} onClick={() => void save(pending)}>{saving ? "Guardando…" : `Guardar cambios (${pending.length})`}</button>
          {globalFeedback ? <small role="status">{globalFeedback}</small> : null}
        </div>
      </>}
    </section>
  );
}
