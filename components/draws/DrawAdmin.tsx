"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CompetitionOption = { id: string; name: string; type: string; seasonName: string };

type Props = { competitions: CompetitionOption[] };

type ApiResponse = { ok?: boolean; id?: string; error?: string };

export default function DrawAdmin({ competitions }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(null); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/competitions/draws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          sourceCompetitionId: form.get("sourceCompetitionId"),
          destinationCompetitionId: form.get("destinationCompetitionId"),
          scheduledAt: form.get("scheduledAt"),
          revealIntervalSeconds: form.get("revealIntervalSeconds"),
        }),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(data.error ?? "No se pudo crear el sorteo.");
      setMessage(`Sorteo creado. Página pública: /sorteos/${data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error desconocido.");
    } finally { setBusy(false); }
  }

  return <main className="draw-admin-page">
    <section className="draw-admin-card">
      <span>Sorteos</span>
      <h1>Programar sorteo Intercontinental</h1>
      <p>El resultado no se calcula hasta que llega la fecha exacta. Para la primera temporada puedes usar la Pretemporada Inaugural. Desde la segunda, elige Primera o Segunda: la web usará automáticamente las dos ligas de esa temporada para formar los bombos.</p>
      {message ? <div className="admin-comp-notice is-success">{message}</div> : null}
      {error ? <div className="admin-comp-notice is-error">{error}</div> : null}
      <form onSubmit={submit} className="draw-admin-form">
        <label><span>Nombre</span><input name="name" defaultValue="Sorteo Copa Intercontinental" required /></label>
        <label><span>Origen de bombos</span><select name="sourceCompetitionId" required><option value="">Seleccionar pretemporada, Primera o Segunda</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name} · {competition.seasonName}</option>)}</select><small>Si eliges Primera o Segunda, los bombos salen de ambas divisiones: 1.º-4.º de Primera + 1.º-4.º de Segunda, 5.º-8.º de ambas, 9.º-12.º de ambas y 13.º-16.º de ambas.</small></label>
        <label><span>Copa Intercontinental destino</span><select name="destinationCompetitionId" required><option value="">Seleccionar</option>{competitions.filter((competition) => competition.name.trim().toLocaleLowerCase("es") === "copa intercontinental").map((competition) => <option key={competition.id} value={competition.id}>{competition.name} · {competition.seasonName}</option>)}</select></label>
        <label><span>Fecha y hora exacta</span><input name="scheduledAt" type="datetime-local" required /></label>
        <label><span>Segundos entre bolas</span><input name="revealIntervalSeconds" type="number" min="2" max="60" defaultValue="8" /></label>
        <button disabled={busy}>{busy ? "Creando..." : "Programar sorteo real"}</button>
      </form>
    </section>
  </main>;
}
