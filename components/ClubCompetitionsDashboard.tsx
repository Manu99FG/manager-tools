import Image from "next/image";
import Link from "next/link";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import type { ClubCompetitionsData, ClubCompetitionSummary } from "@/lib/club-competitions";

type View = "current" | "history";
type Query = { season?: string; view?: string; competition?: string };

function fmtDate(value: string | null) {
  if (!value) return "Fecha por definir";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha por definir";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
function statusLabel(status: string) { return status === "FINISHED" ? "Finalizada" : status === "ACTIVE" ? "En curso" : "Borrador"; }
function statusClass(status: string) { return status === "FINISHED" ? "is-finished" : status === "ACTIVE" ? "is-active" : "is-draft"; }
function typeLabel(type: string) {
  if (type === "LEAGUE") return "Liga";
  if (type === "CUP") return "Copa";
  if (type === "SUPERCUP") return "Supercopa";
  if (type === "GROUPS") return "Fase de grupos";
  if (type === "GROUPS_KNOCKOUT") return "Grupos + eliminatorias";
  return type.replaceAll("_", " ");
}

export default function ClubCompetitionsDashboard({ teamCode, data, view, query }: { teamCode: string; data: ClubCompetitionsData; view: View; query: Query }) {
  const base = `/clubes/${teamCode}/competiciones`;
  return (
    <section className="club-comps-v43">
      <nav className="club-comps-v43-subtabs" aria-label="Vistas de competiciones">
        <Link href={`${base}?view=current${data.season ? `&season=${data.season.id}` : ""}`} className={view === "current" ? "is-active" : ""}>Temporada actual</Link>
        <Link href={`${base}?view=history`} className={view === "history" ? "is-active" : ""}>Histórico</Link>
        {view === "current" && data.seasons.length ? (
          <form className="club-comps-v43-season" action={base} method="get">
            <input type="hidden" name="view" value="current" />
            <label>Temporada</label>
            <select name="season" defaultValue={data.season?.id ?? ""}>
              {data.seasons.map((season) => <option value={season.id} key={season.id}>{season.name}</option>)}
            </select>
            <button type="submit">Ver</button>
          </form>
        ) : null}
      </nav>
      {view === "history" ? <HistoryView teamCode={teamCode} data={data} query={query} /> : <CurrentView data={data} />}
    </section>
  );
}

function CurrentView({ data }: { data: ClubCompetitionsData }) {
  const total = data.current.reduce((acc, item) => ({
    played: acc.played + item.played,
    wins: acc.wins + item.wins,
    draws: acc.draws + item.draws,
    losses: acc.losses + item.losses,
    goalsFor: acc.goalsFor + item.goalsFor,
    goalsAgainst: acc.goalsAgainst + item.goalsAgainst,
    points: acc.points + item.points,
  }), { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });

  if (!data.season || !data.current.length) return <div className="club-comps-v43-empty">El club no está inscrito en competiciones de esta temporada.</div>;
  return <>
    <header className="club-comps-v43-title"><div><span>🏆</span><div><h2>Competiciones {data.season.name}</h2><p>Participación del club en todas las competiciones de la temporada.</p></div></div><Link href="/competiciones">Ver todas las competiciones →</Link></header>
    <div className="club-comps-v43-cards">
      {data.current.map((competition) => <CompetitionCard key={competition.id} competition={competition} />)}
    </div>
    <section className="club-comps-v43-panel">
      <header><span>↗</span><strong>Trayectoria de la temporada</strong></header>
      <div className="club-comps-v43-trajectory">
        {data.current.map((competition, index) => <div className="club-comps-v43-path-wrap" key={competition.id}>
          <article className="club-comps-v43-path">
            <span className="club-comps-v43-trophy">🏆</span>
            <div><small>{competition.name}</small><strong>{competition.resultLabel.replace(" *", "")}</strong><em className={statusClass(competition.status)}>{statusLabel(competition.status)}</em></div>
          </article>
          {index < data.current.length - 1 ? <b className="club-comps-v43-arrow">→</b> : null}
        </div>)}
      </div>
    </section>
    <div className="club-comps-v43-bottom">
      <section className="club-comps-v43-panel">
        <header><span>▥</span><strong>Resumen de la temporada (todas las competiciones)</strong></header>
        <div className="club-comps-v43-summary">
          <Mini value={total.played} label="Partidos" /><Mini value={total.wins} label="Victorias" /><Mini value={total.draws} label="Empates" /><Mini value={total.losses} label="Derrotas" /><Mini value={total.goalsFor} label="Goles a favor" /><Mini value={total.goalsAgainst} label="Goles en contra" /><Mini value={total.points} label="Puntos" />
        </div>
      </section>
      <section className="club-comps-v43-panel">
        <header><span>▤</span><strong>Estado de las competiciones</strong></header>
        <div className="club-comps-v43-status-list">
          {data.current.map((competition) => <Link href={`/competiciones/${competition.id}`} key={competition.id}><span>🏆</span><strong>{competition.name}</strong><em className={statusClass(competition.status)}>{statusLabel(competition.status)}</em><b>{competition.resultLabel.replace(" *", "")}</b></Link>)}
        </div>
      </section>
    </div>
    <p className="club-comps-v43-note">ⓘ La información se calcula automáticamente con los resultados registrados de la temporada {data.season.name}.</p>
  </>;
}

function CompetitionCard({ competition }: { competition: ClubCompetitionSummary }) {
  return <article className="club-comps-v43-comp-card">
    <div className="club-comps-v43-comp-head"><span>🏆</span><div><h3>{competition.name}</h3><small>{typeLabel(competition.type)}</small></div></div>
    <em className={`club-comps-v43-status ${statusClass(competition.status)}`}>{statusLabel(competition.status)}</em>
    <strong className="club-comps-v43-result">{competition.resultLabel.replace(" *", "")}</strong>
    <div className="club-comps-v43-card-kpis"><Mini value={competition.played} label="Partidos" /><Mini value={competition.wins} label="Victorias" /><Mini value={competition.losses} label="Derrotas" /></div>
    <div className="club-comps-v43-card-split"><div><strong>{competition.goalsFor}</strong><small>Goles a favor</small></div><div><strong>{competition.goalsAgainst}</strong><small>Goles en contra</small></div></div>
    {competition.qualification ? <div className="club-comps-v43-qualified">✓ Clasificado a <strong>{competition.qualification.destinationName}</strong></div> : null}
    {competition.playoffSummary ? <div className="club-comps-v43-qualified is-playoff">↗ <strong>{competition.playoffSummary}</strong></div> : null}
    {competition.nextMatch ? <Link className="club-comps-v43-next" href={`/partidos/${competition.nextMatch.id}`}><Image src={getClubLogo(competition.nextMatch.opponentCode)} alt="" width={28} height={28}/><div><small>Próximo partido{competition.nextMatch.roundLabel ? ` · ${competition.nextMatch.roundLabel}` : ""}</small><strong>{getClubName(competition.nextMatch.opponentCode)}</strong><em>{fmtDate(competition.nextMatch.date)}</em></div><b>›</b></Link> : <div className="club-comps-v43-next is-empty"><div><small>Próximo partido</small><strong>No hay partido pendiente</strong></div></div>}
    <Link className="club-comps-v43-open" href={`/competiciones/${competition.id}`}>Ver competición <span>→</span></Link>
  </article>;
}

function HistoryView({ teamCode, data, query }: { teamCode: string; data: ClubCompetitionsData; query: Query }) {
  const competitionNames = Array.from(new Set(data.history.map((item) => item.name))).sort((a, b) => a.localeCompare(b, "es"));
  const seasonNames = Array.from(new Set(data.history.map((item) => item.seasonName))).sort((a, b) => b.localeCompare(a, "es", { numeric: true }));
  const selectedCompetition = query.competition ?? "ALL";
  const selectedSeason = query.season ?? "ALL";
  const filtered = data.history.filter((item) => (selectedCompetition === "ALL" || item.name === selectedCompetition) && (selectedSeason === "ALL" || item.seasonName === selectedSeason));
  return <>
    <header className="club-comps-v43-title"><div><span>🏆</span><div><h2>Resumen histórico</h2><p>Participaciones, títulos y mejores actuaciones del club en todas las temporadas.</p></div></div></header>
    <div className="club-comps-v43-history-kpis"><HistoryKpi icon="🏆" value={data.historicalSummary.uniqueCompetitions} label="Competiciones disputadas" /><HistoryKpi icon="▤" value={data.historicalSummary.participations} label="Participaciones totales" /><HistoryKpi icon="🥇" value={data.historicalSummary.titles} label="Títulos" /><HistoryKpi icon="🥈" value={data.historicalSummary.runnerUps} label="Subcampeonatos" /></div>
    <div className="club-comps-v43-history-top">
      <section className="club-comps-v43-panel"><header><span>🏆</span><strong>Palmarés por competición</strong></header><div className="club-comps-v43-palmares-list">
        {data.palmaresByCompetition.map((row) => <article key={row.seriesId ?? row.name}><span>🏆</span><div><strong>{row.name}</strong><small>{row.titleSeasons.length ? row.titleSeasons.join(" · ") : "Sin títulos"}</small></div><b>{row.titles} {row.titles === 1 ? "título" : "títulos"}{row.runnerUps ? <em>{row.runnerUps} sub.</em> : null}</b></article>)}
      </div></section>
      <section className="club-comps-v43-panel"><header><span>★</span><strong>Mejores actuaciones</strong></header><div className="club-comps-v43-best-list">
        <Best label="Mejor clasificación" item={data.best.leaguePosition} value={data.best.leaguePosition?.position ? `${data.best.leaguePosition.position}.º` : "—"}/>
        <Best label="Más puntos en una edición" item={data.best.points} value={data.best.points ? `${data.best.points.points} puntos` : "—"}/>
        <Best label="Más victorias en una edición" item={data.best.wins} value={data.best.wins ? `${data.best.wins.wins} victorias` : "—"}/>
        <Best label="Mayor cantidad de goles a favor" item={data.best.goalsFor} value={data.best.goalsFor ? `${data.best.goalsFor.goalsFor} goles` : "—"}/>
        <Best label="Menos goles en contra" item={data.best.goalsAgainst} value={data.best.goalsAgainst ? `${data.best.goalsAgainst.goalsAgainst} goles` : "—"}/>
        <Best label="Mayor diferencia de goles" item={data.best.goalDifference} value={data.best.goalDifference ? `${data.best.goalDifference.goalDifference > 0 ? "+" : ""}${data.best.goalDifference.goalDifference}` : "—"}/>
      </div></section>
    </div>
    <section className="club-comps-v43-panel club-comps-v43-history-table-card">
      <header><span>▦</span><strong>Participaciones históricas</strong><form action={`/clubes/${teamCode}/competiciones`} method="get"><input type="hidden" name="view" value="history"/><select name="competition" defaultValue={selectedCompetition}><option value="ALL">Todas las competiciones</option>{competitionNames.map((name) => <option key={name} value={name}>{name}</option>)}</select><select name="season" defaultValue={selectedSeason}><option value="ALL">Todas las temporadas</option>{seasonNames.map((name) => <option key={name} value={name}>{name}</option>)}</select><button type="submit">Filtrar</button></form></header>
      <div className="club-comps-v43-table-wrap"><table><thead><tr><th>Temporada</th><th>Competición</th><th>Resultado</th><th>Fase extra</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead><tbody>{filtered.map((item) => <tr key={`${item.id}-${item.seasonName}`}><td>{item.seasonName}</td><td><Link href={`/competiciones/${item.id}`}><span>🏆</span>{item.name}</Link></td><td><strong>{item.resultLabel}</strong></td><td>{item.playoffSummary ? <strong>{item.playoffSummary}</strong> : "—"}</td><td>{item.played}</td><td>{item.wins}</td><td>{item.draws}</td><td>{item.losses}</td><td>{item.goalsFor}</td><td>{item.goalsAgainst}</td><td>{item.goalDifference > 0 ? "+" : ""}{item.goalDifference}</td><td>{item.points}</td></tr>)}</tbody></table></div>
      {!filtered.length ? <p className="club-comps-v43-empty">No hay participaciones para estos filtros.</p> : null}
      <p className="club-comps-v43-table-note">* Competición todavía en curso.</p>
    </section>
    <section className="club-comps-v43-panel"><header><span>▥</span><strong>Evolución por competición</strong></header><div className="club-comps-v43-evolution">
      {competitionNames.map((name) => { const rows = data.history.filter((item) => item.name === name).sort((a,b) => a.seasonName.localeCompare(b.seasonName,"es",{numeric:true})); return <article key={name}><strong>{name}</strong><div>{rows.map((item) => <span key={item.id} title={`${item.seasonName}: ${item.resultLabel}`} className={item.isChampion ? "is-title" : item.isRunnerUp ? "is-final" : item.status === "FINISHED" ? "is-finished" : "is-current"}><i></i><small>{item.seasonName}</small></span>)}</div></article>; })}
    </div></section>
    <p className="club-comps-v43-note">ⓘ El histórico se construye con las competiciones, resultados y series históricas registradas en la Liga de Leyendas.</p>
  </>;
}

function Mini({ value, label }: { value: string | number; label: string }) { return <article className="club-comps-v43-mini"><strong>{value}</strong><small>{label}</small></article>; }
function HistoryKpi({ icon, value, label }: { icon: string; value: number; label: string }) { return <article className="club-comps-v43-history-kpi"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>; }
function Best({ label, item, value }: { label: string; item: ClubCompetitionSummary | null; value: string }) { return <article><span>↗</span><strong>{label}</strong><div><b>{value}</b>{item ? <small>{item.seasonName} · {item.name}</small> : null}</div></article>; }
