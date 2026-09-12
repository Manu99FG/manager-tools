"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClubHistoryData, ClubHistoryRecord } from "@/lib/club-history";

type Tab = "overview" | "palmares" | "league" | "results" | "streaks" | "players" | "transfers";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Vista general" },
  { key: "palmares", label: "Palmarés" },
  { key: "league", label: "Posición liga" },
  { key: "results", label: "Resultados" },
  { key: "streaks", label: "Rachas" },
  { key: "players", label: "Jugadores" },
  { key: "transfers", label: "Fichajes" },
];

export default function ClubHistoryTabs({ data }: { data: ClubHistoryData }) {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div>
      <div className="mt-6 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-2">
          {TABS.map((item) => (
            <button key={item.key} type="button" onClick={() => setTab(item.key)} className={["rounded-xl px-4 py-2.5 text-xs font-black transition", tab === item.key ? "bg-[var(--mt-gold)] text-[var(--mt-surface)]" : "text-[var(--mt-muted)] hover:bg-[var(--mt-surface)] hover:text-[var(--mt-text)]"].join(" ")}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        {tab === "overview" && <Section title="Vista general" subtitle="El mejor registro disponible de cada gran apartado."><Grid rows={data.overview.map((x) => [x.label, x.record] as const)} featured /></Section>}
        {tab === "palmares" && <Palmares data={data} />}
        {tab === "league" && <League data={data} />}
        {tab === "results" && <Section title="Resultados" subtitle="Récords de todos los partidos oficiales importados."><Grid rows={[["Mayor victoria", data.results.biggestWin],["Mayor derrota", data.results.biggestLoss],["Partido con marcador más alto", data.results.highestScoring],["Partido de liga con marcador más alto", data.results.highestScoringLeague]]} /></Section>}
        {tab === "streaks" && <Section title="Rachas" subtitle="Máximas secuencias consecutivas registradas."><Grid rows={[["Más partidos ganados seguidos", data.streaks.wins],["Más partidos perdidos seguidos", data.streaks.losses],["Más partidos sin perder seguidos", data.streaks.unbeaten],["Más partidos sin ganar seguidos", data.streaks.winless],["Más partidos sin encajar goles seguidos", data.streaks.cleanSheets],["Más partidos sin marcar goles seguidos", data.streaks.scoreless]]} /></Section>}
        {tab === "players" && <Section title="Jugadores" subtitle="Récords individuales logrados con el club."><Grid rows={[["Más goles totales en una temporada", data.players.goalsSeason],["Más goles en liga en una temporada", data.players.leagueGoalsSeason],["Más goles en un partido", data.players.goalsMatch],["Más goles en un partido de liga", data.players.leagueGoalsMatch],["Más asistencias en una temporada", data.players.assistsSeason],["Más puertas a cero en una temporada", data.players.cleanSheetsSeason],["Más premios MVP en una temporada", data.players.momSeason],["Peor disciplina en una temporada", data.players.disciplineSeason],["Jugador más joven en jugar", data.players.youngestPlayed],["Jugador más viejo en jugar", data.players.oldestPlayed],["Goleador más joven", data.players.youngestScorer],["Goleador más viejo", data.players.oldestScorer]]} /></Section>}
        {tab === "transfers" && <Section title="Fichajes" subtitle="Historial económico del mercado del club."><Grid rows={[["Mayor pago por traspaso", data.transfers.biggestPaid],["Mayor cobro por traspaso", data.transfers.biggestReceived],["Gasto total en fichajes", data.transfers.totalSpent],["Ganancias totales en fichajes", data.transfers.totalReceived]]} /></Section>}
      </div>
      {data.limitations.length > 0 && <details className="mt-6 rounded-[13px] border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] p-4"><summary className="cursor-pointer text-xs font-black text-[var(--mt-gold-dark)]">Datos que todavía necesitan ampliar la base de datos</summary><div className="mt-3 space-y-2 text-xs leading-5 text-[var(--mt-gold-dark)]">{data.limitations.map((x) => <p key={x}>{x}</p>)}</div></details>}
    </div>
  );
}


function Palmares({ data }: { data: ClubHistoryData }) {
  const { summary, groups } = data.palmares;

  return (
    <Section
      title="Palmarés"
      subtitle="Todos los títulos oficiales conquistados por el club en competiciones finalizadas."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TrophyKpi label="Títulos" value={summary.total} />
        <TrophyKpi label="Ligas" value={summary.leagues} />
        <TrophyKpi label="Champions" value={summary.champions} />
        <TrophyKpi label="Copas" value={summary.cups} />
      </div>

      {groups.length ? (
        <div className="mt-5 space-y-3">
          {groups.map((group) => (
            <article
              key={`${group.seriesId ?? "fallback"}:${group.seriesName}`}
              className="overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)]"
            >
              <div className="flex flex-col gap-3 border-b border-[var(--mt-line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">
                      🏆
                    </span>
                    {group.seriesId ? (
                      <Link
                        href={`/competiciones/historico/${group.seriesId}`}
                        className="text-base font-black text-[var(--mt-text)] transition hover:text-[var(--mt-gold-dark)]"
                      >
                        {group.seriesName}
                      </Link>
                    ) : (
                      <div className="text-base font-black text-[var(--mt-text)]">
                        {group.seriesName}
                      </div>
                    )}
                  </div>

                  <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                    {group.scope !== "OTHER" ? group.scope.replaceAll("_", " ") : group.type}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 py-2 text-center">
                  <div className="text-xl font-black text-[var(--mt-gold-dark)]">{group.count}</div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
                    {group.count === 1 ? "título" : "títulos"}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {group.titles.map((title) => (
                  <Link
                    key={title.competitionId}
                    href={`/competiciones/${title.competitionId}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-[var(--mt-surface)]"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-black text-[var(--mt-text)]">
                        {title.season}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[var(--mt-muted)]">
                        {title.competitionName}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-black text-[var(--mt-gold-dark)]">
                      Ver edición →
                    </span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[13px] border border-dashed border-[var(--mt-line)] bg-[var(--mt-surface)] px-5 py-10 text-center">
          <div className="text-3xl" aria-hidden="true">🏆</div>
          <div className="mt-3 text-sm font-black text-[var(--mt-muted)]">
            Todavía no hay títulos registrados.
          </div>
          <div className="mt-1 text-xs text-[var(--mt-muted)]">
            Los títulos aparecerán automáticamente al finalizar las competiciones.
          </div>
        </div>
      )}
    </Section>
  );
}

function TrophyKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[13px] border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] p-4">
      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--mt-gold-dark)]">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black tracking-tight text-[var(--mt-text)]">
        {value}
      </div>
    </div>
  );
}

function League({ data }: { data: ClubHistoryData }) {
  return <Section title="Posición liga" subtitle="Mejor y peor clasificación registrada por edición de liga.">
    <div className="grid gap-3 md:grid-cols-2"><RecordCard label="Mejor posición en liga" record={data.leaguePositions.best} featured /><RecordCard label="Peor posición en liga" record={data.leaguePositions.worst} /></div>
    <div className="mt-5 overflow-x-auto rounded-[13px] border border-[var(--mt-line)]"><table className="w-full min-w-[650px] text-sm"><thead className="bg-[var(--mt-surface)] text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]"><tr><th className="px-4 py-3 text-left">Temporada</th><th className="px-4 py-3 text-left">Liga</th><th className="px-4 py-3 text-center">Pos</th><th className="px-4 py-3 text-center">PJ</th><th className="px-4 py-3 text-center">PTS</th></tr></thead><tbody>{data.leaguePositions.seasons.length ? data.leaguePositions.seasons.map((r) => <tr key={`${r.season}:${r.competition}`} className="border-t border-[var(--mt-line)]"><td className="px-4 py-3 font-bold text-[var(--mt-muted)]">{r.season}</td><td className="px-4 py-3 text-[var(--mt-muted)]">{r.competition}</td><td className="px-4 py-3 text-center font-black text-[var(--mt-text)]">{r.position}º</td><td className="px-4 py-3 text-center text-[var(--mt-muted)]">{r.played}</td><td className="px-4 py-3 text-center font-black text-[var(--mt-gold-dark)]">{r.points}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--mt-muted)]">Todavía no hay temporadas de liga con partidos disputados.</td></tr>}</tbody></table></div>
  </Section>;
}

function Grid({ rows, featured = false }: { rows: readonly (readonly [string, ClubHistoryRecord | null])[]; featured?: boolean }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map(([label, record]) => <RecordCard key={label} label={label} record={record} featured={featured} />)}</div>;
}
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="app-panel rounded-[24px] p-5 sm:p-6"><div className="app-eyebrow">Historial</div><h2 className="mt-1.5 text-2xl font-black text-[var(--mt-text)]">{title}</h2><p className="mt-1 text-sm text-[var(--mt-muted)]">{subtitle}</p><div className="mt-5">{children}</div></section>;
}
function RecordCard({ label, record, featured = false }: { label: string; record: ClubHistoryRecord | null; featured?: boolean }) {
  return <article className={["rounded-2xl border p-4", featured ? "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)]" : "border-[var(--mt-line)] bg-[var(--mt-surface)]"].join(" ")}><div className="text-[10px] font-black uppercase tracking-[0.11em] text-[var(--mt-muted)]">{label}</div>{record ? <><div className="mt-2 text-2xl font-black tracking-tight text-[var(--mt-text)]">{record.value}</div>{record.playerName ? record.playerId ? <Link href={`/jugadores/${record.playerId}`} className="mt-1.5 block text-sm font-black text-[var(--mt-gold-dark)] hover:text-[var(--mt-gold-dark)]">{record.playerName}</Link> : <div className="mt-1.5 text-sm font-black text-[var(--mt-gold-dark)]">{record.playerName}</div> : null}<div className="mt-2 space-y-0.5 text-[11px] text-[var(--mt-muted)]">{record.season && <div>{record.season}</div>}{record.competition && <div>{record.competition}</div>}{record.detail && <div>{record.detail}</div>}</div>{record.matchId && <Link href={`/partidos/${record.matchId}`} className="mt-3 inline-block text-[10px] font-black uppercase tracking-wide text-[var(--mt-gold-dark)] hover:text-[var(--mt-gold-dark)]">Ver partido →</Link>}</> : <div className="mt-3 text-sm font-bold text-[var(--mt-muted)]">Sin datos suficientes</div>}</article>;
}
