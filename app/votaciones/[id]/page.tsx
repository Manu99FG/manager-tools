import Link from "next/link";
import { notFound } from "next/navigation";

import AwardBallot from "@/components/AwardBallot";
import { getAwardPollDetail } from "@/lib/award-voting";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VotingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poll = await getAwardPollDetail(id);

  if (!poll) notFound();

  const points = [
    poll.points_first,
    poll.points_second,
    poll.points_third,
  ].slice(0, poll.max_rank);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <section className="app-panel rounded-[24px] p-6 sm:p-8">
        <Link
          href="/votaciones"
          className="text-xs font-black text-[var(--mt-gold-dark)] hover:text-[var(--mt-gold-dark)]"
        >
          ← Todas las votaciones
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
            {poll.seasonName}
          </span>
          <span className="rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
            {poll.status === "OPEN"
              ? "Votación abierta"
              : poll.status === "CLOSED"
                ? "Votación cerrada"
                : "Próximamente"}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
          {poll.title}
        </h1>

        {poll.description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--mt-muted)]">
            {poll.description}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {points.map((value, index) => (
            <span
              key={index}
              className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2 text-xs font-black text-[var(--mt-muted)]"
            >
              {index + 1}.º = {value} pts
            </span>
          ))}
          <span className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2 text-xs font-black text-[var(--mt-muted)]">
            {poll.ballotCount} papeletas
          </span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="app-panel-soft rounded-2xl p-5">
          <div className="app-eyebrow">Candidatos</div>
          <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
            {poll.candidateCount} nominados
          </h2>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {poll.candidates.map((candidate) => (
              <Link
                key={candidate.id}
                href={`/jugadores/${candidate.player_id}`}
                className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-3 transition hover:border-[var(--mt-gold)]"
              >
                <div className="font-black text-[var(--mt-text)]">
                  {candidate.playerName.replaceAll("_", " ")}
                </div>
                <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                  {candidate.team_code ?? "Sin club"}
                </div>
                {candidate.nomination_reason ? (
                  <div className="mt-2 text-[10px] font-bold leading-4 text-[var(--mt-muted)]">
                    {candidate.nomination_reason}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        </section>

        {poll.status === "OPEN" ? (
          <AwardBallot
            pollId={poll.id}
            candidates={poll.candidates}
            maxRank={poll.max_rank}
          />
        ) : (
          <div className="app-panel-soft rounded-2xl p-5">
            <div className="text-sm font-black text-[var(--mt-text)]">
              {poll.status === "CLOSED"
                ? "La votación ha terminado."
                : "La votación todavía no está abierta."}
            </div>
            <p className="mt-2 text-sm text-[var(--mt-muted)]">
              {poll.status === "CLOSED"
                ? "Consulta el resultado debajo."
                : "El administrador abrirá la votación cuando esté preparada."}
            </p>
          </div>
        )}
      </div>

      {poll.canShowResults ? (
        <section className="app-panel rounded-2xl overflow-hidden">
          <div className="border-b border-[var(--mt-line)] px-5 py-4">
            <div className="app-eyebrow">Resultado</div>
            <h2 className="mt-1 text-xl font-black text-[var(--mt-text)]">
              Clasificación de la votación
            </h2>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {poll.results.map((result, index) => (
              <div
                key={result.candidateId}
                className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4"
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-xl font-black ${
                    index === 0
                      ? "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]"
                      : "bg-[var(--mt-surface)] text-[var(--mt-muted)]"
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <Link
                    href={`/jugadores/${result.playerId}`}
                    className="font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]"
                  >
                    {result.playerName.replaceAll("_", " ")}
                  </Link>
                  <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                    {result.teamCode ?? "—"} · {result.votes} selecciones ·{" "}
                    {result.firstPlaces} primeros puestos
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-[var(--mt-text)]">
                    {result.points}
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                    puntos
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] px-5 py-4 text-sm font-bold text-[var(--mt-muted)]">
          Los resultados permanecen ocultos hasta el cierre de la votación.
        </div>
      )}
    </div>
  );
}
