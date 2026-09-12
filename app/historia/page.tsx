import Image from "next/image";
import Link from "next/link";

import { getClubLogo } from "@/lib/club-logo";
import {
  getLeagueHistoryData,
  type HistoryPlayer,
} from "@/lib/league-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeagueHistoryPage() {
  const data = await getLeagueHistoryData();

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8">
      <section className="app-panel rounded-[28px] p-6 sm:p-8">
        <div className="app-eyebrow">Museo de la liga</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
          Historia & Hall of Fame
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--mt-muted)]">
          El rendimiento histórico ya está normalizado por posición y por
          temporada. Un gran GK, DF, DM, MF, AM o FW puede alcanzar cifras
          comparables aunque sus estadísticas brutas sean muy diferentes.
        </p>
      </section>

      <section>
        <div className="app-eyebrow">Hall of Fame</div>
        <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
          Las grandes leyendas
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--mt-muted)]">
          Rend. = índice medio normalizado de sus temporadas. Pico = mejor
          temporada individual. El índice histórico añade después títulos,
          premios, podios, MVP y longevidad.
        </p>

        <div className="app-panel-soft mt-4 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[9px] font-black uppercase tracking-[0.11em] text-[var(--mt-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Jugador</th>
                  <th className="px-3 py-3 text-right">PJ</th>
                  <th className="px-3 py-3 text-right">G</th>
                  <th className="px-3 py-3 text-right">A</th>
                  <th className="px-3 py-3 text-right">Tít.</th>
                  <th className="px-3 py-3 text-right">Prem.</th>
                  <th className="px-3 py-3 text-right">Rend.</th>
                  <th className="px-3 py-3 text-right">Pico</th>
                  <th className="px-4 py-3 text-right">Índice</th>
                </tr>
              </thead>
              <tbody>
                {data.hallOfFame.map((player, index) => (
                  <tr
                    key={
                      player.playerId ??
                      `${player.teamCode}-${player.playerName}`
                    }
                    className="border-t border-[var(--mt-line)]"
                  >
                    <td className="px-4 py-3 font-black text-[var(--mt-muted)]">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <PlayerCell player={player} />
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-muted)]">
                      {player.appearances}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-muted)]">
                      {player.goals}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-muted)]">
                      {player.assists}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-muted)]">
                      {player.titles}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-gold-dark)]">
                      {player.awards}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-[var(--mt-gold-dark)]">
                      {player.normalizedPerformance.toFixed(1)}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-emerald-700">
                      {player.bestSeasonIndex.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-[var(--mt-gold-dark)]">
                      {player.hallScore.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="app-eyebrow">Normalización</div>
        <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
          Cómo se comparan las posiciones
        </h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="app-panel-soft rounded-2xl p-5">
            <div className="text-sm font-black text-[var(--mt-text)]">
              1. Performance Score bruto
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)]">
              Primero se mantienen exactamente las seis fórmulas posicionales.
              El score bruto de un GK no se compara directamente con el de un
              FW.
            </p>
          </div>

          <div className="app-panel-soft rounded-2xl p-5">
            <div className="text-sm font-black text-[var(--mt-text)]">
              2. Comparación posición + temporada
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)]">
              Cada jugador se compara únicamente con los futbolistas de su
              misma posición durante esa temporada. Se utiliza su posición
              dominante por minutos.
            </p>
          </div>

          <div className="app-panel-soft rounded-2xl p-5">
            <div className="text-sm font-black text-[var(--mt-text)]">
              3. Índice común
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)]">
              La media queda alrededor de 50. Los jugadores que destacan una,
              dos o tres desviaciones sobre su posición suben progresivamente,
              con un pequeño ajuste adicional por percentil.
            </p>
          </div>

          <div className="app-panel-soft rounded-2xl p-5">
            <div className="text-sm font-black text-[var(--mt-text)]">
              4. Escala final
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)]">
              El índice queda limitado entre 20 y 100. Así los mejores de GK,
              DF, DM, MF, AM y FW pueden terminar en rangos semejantes.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="app-eyebrow">Líderes históricos</div>
        <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
          Estadísticas acumuladas
        </h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Leaderboard title="Goles" rows={data.playerLeaders.goals} stat="goals" label="G" />
          <Leaderboard title="Asistencias" rows={data.playerLeaders.assists} stat="assists" label="A" />
          <Leaderboard title="MVP" rows={data.playerLeaders.mom} stat="mom" label="MVP" />
          <Leaderboard title="Partidos" rows={data.playerLeaders.appearances} stat="appearances" label="PJ" />
          <Leaderboard title="Paradas" rows={data.playerLeaders.saves} stat="saves" label="SAV" />
          <Leaderboard title="Tackles" rows={data.playerLeaders.tackles} stat="tackles" label="KTK" />
          <Leaderboard title="Pases clave" rows={data.playerLeaders.keyPasses} stat="keyPasses" label="KPS" />
          <Leaderboard title="Títulos" rows={data.playerLeaders.titles} stat="titles" label="TÍT" />
          <Leaderboard title="Premios" rows={data.playerLeaders.awards} stat="awards" label="PREM" />
        </div>
      </section>
    </div>
  );
}

function PlayerCell({ player }: { player: HistoryPlayer }) {
  const body = (
    <div className="flex items-center gap-3">
      <Image
        src={getClubLogo(player.teamCode)}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
      />
      <div className="min-w-0">
        <div className="truncate font-black text-[var(--mt-text)]">
          {player.playerName.replaceAll("_", " ")}
        </div>
        <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
          {player.teamCode}
        </div>
      </div>
    </div>
  );

  return player.playerId ? (
    <Link href={`/jugadores/${player.playerId}`}>{body}</Link>
  ) : (
    body
  );
}

function Leaderboard({
  title,
  rows,
  stat,
  label,
}: {
  title: string;
  rows: HistoryPlayer[];
  stat:
    | "goals"
    | "assists"
    | "mom"
    | "appearances"
    | "saves"
    | "tackles"
    | "keyPasses"
    | "awards"
    | "titles";
  label: string;
}) {
  return (
    <div className="app-panel-soft rounded-2xl p-5">
      <div className="text-sm font-black text-[var(--mt-text)]">{title}</div>

      <div className="mt-4 space-y-2">
        {rows.map((player, index) => (
          <div
            key={
              player.playerId ??
              `${player.teamCode}-${player.playerName}`
            }
            className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-[var(--mt-surface)] px-3 py-2.5"
          >
            <div className="text-center text-xs font-black text-[var(--mt-muted)]">
              {index + 1}
            </div>
            <PlayerCell player={player} />
            <div className="text-right">
              <div className="font-black text-[var(--mt-text)]">{player[stat]}</div>
              <div className="text-[8px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
