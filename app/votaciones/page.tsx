import Link from "next/link";

import { getAwardPolls } from "@/lib/award-voting";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VotingListPage() {
  const polls = await getAwardPolls();

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <section className="app-panel rounded-[24px] p-6 sm:p-8">
        <div className="app-eyebrow">Premios de la liga</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
          Votaciones
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--mt-muted)]">
          Los premios importantes los deciden los managers. Las estadísticas
          sirven de contexto, pero no asignan automáticamente el ganador.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {polls.map((poll) => (
          <Link
            key={poll.id}
            href={`/votaciones/${poll.id}`}
            className="app-panel-soft rounded-[13px] p-5 transition hover:-translate-y-0.5 hover:border-[var(--mt-gold)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--mt-gold-dark)]">
                {poll.seasonName}
              </div>
              <Status status={poll.status} />
            </div>

            <h2 className="mt-3 text-xl font-black text-[var(--mt-text)]">{poll.title}</h2>

            {poll.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-[var(--mt-muted)]">
                {poll.description}
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[var(--mt-line)] pt-4">
              <Mini label="Candidatos" value={poll.candidateCount} />
              <Mini
                label={poll.status === "CLOSED" ? "Papeletas" : "Estado"}
                value={
                  poll.status === "CLOSED" ? poll.ballotCount : poll.status === "OPEN" ? "Votar" : "Próximamente"
                }
              />
            </div>

            {poll.winner ? (
              <div className="mt-3 rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 py-2.5">
                <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
                  Ganador
                </div>
                <div className="mt-0.5 font-black text-[var(--mt-text)]">
                  {poll.winner.playerName.replaceAll("_", " ")}
                </div>
              </div>
            ) : null}
          </Link>
        ))}
      </section>
    </div>
  );
}

function Status({ status }: { status: "DRAFT" | "OPEN" | "CLOSED" }) {
  const label =
    status === "OPEN" ? "Abierta" : status === "CLOSED" ? "Cerrada" : "Próxima";

  return (
    <span className="rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
      {label}
    </span>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-[var(--mt-surface)] px-3 py-2.5">
      <div className="text-sm font-black text-[var(--mt-text)]">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
        {label}
      </div>
    </div>
  );
}
