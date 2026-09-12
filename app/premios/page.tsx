import Link from "next/link";

import { getGlobalAwardHistory } from "@/lib/award-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AwardsHistoryPage() {
  const { polls, ranking } = await getGlobalAwardHistory();

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-7">
      <section className="app-panel rounded-[24px] p-6 sm:p-8">
        <div className="app-eyebrow">Historia de la liga</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
          Palmarés de premios
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--mt-muted)]">
          Historial definitivo de los premios decididos por votación. Una vez
          cerrada una votación, su podio queda congelado permanentemente.
        </p>
      </section>

      <section>
        <div className="app-eyebrow">Ranking histórico</div>
        <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
          Jugadores más premiados
        </h2>

        <div className="app-panel-soft mt-4 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[9px] font-black uppercase tracking-[0.11em] text-[var(--mt-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Jugador</th>
                  <th className="px-3 py-3 text-right">Premios</th>
                  <th className="px-3 py-3 text-right">Podios</th>
                  <th className="px-4 py-3 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0, 50).map((player, index) => (
                  <tr
                    key={player.playerId}
                    className="border-t border-[var(--mt-line)]"
                  >
                    <td className="px-4 py-3 font-black text-[var(--mt-muted)]">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/jugadores/${player.playerId}`}
                        className="font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]"
                      >
                        {player.playerName.replaceAll("_", " ")}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right font-black text-[var(--mt-gold-dark)]">
                      {player.wins}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-muted)]">
                      {player.podiums}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--mt-muted)]">
                      {player.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ranking.length === 0 ? (
            <div className="p-6 text-center text-sm font-bold text-[var(--mt-muted)]">
              Todavía no hay premios cerrados.
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <div className="app-eyebrow">Archivo</div>
        <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
          Premios decididos
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {polls.map((poll) => {
            const winner = poll.podium[0];

            return (
              <Link
                key={poll.pollId}
                href={`/votaciones/${poll.pollId}`}
                className="app-panel-soft rounded-[13px] p-5 transition hover:border-[var(--mt-gold)]"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--mt-gold-dark)]">
                  {poll.seasonName}
                </div>
                <h3 className="mt-1.5 text-lg font-black text-[var(--mt-text)]">
                  {poll.title}
                </h3>

                {winner ? (
                  <div className="mt-4 rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
                      Ganador
                    </div>
                    <div className="mt-0.5 font-black text-[var(--mt-text)]">
                      {winner.playerName.replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-[var(--mt-muted)]">
                      {winner.points} puntos · {winner.firstPlaces} primeros puestos
                    </div>
                  </div>
                ) : null}

                {poll.podium.length > 1 ? (
                  <div className="mt-3 space-y-1 text-xs font-bold text-[var(--mt-muted)]">
                    {poll.podium.slice(1, 3).map((entry) => (
                      <div key={entry.playerId}>
                        {entry.rank}.º {entry.playerName.replaceAll("_", " ")} ·{" "}
                        {entry.points} pts
                      </div>
                    ))}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
