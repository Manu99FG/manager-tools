import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { ClubStatisticsData, ClubStatsPlayer, ClubStatsCompetition } from "@/lib/club-statistics";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";

type Query = { season?: string; view?: string; competition?: string; position?: string; q?: string; sort?: string; mode?: string; scope?: string };

export default function ClubStatisticsDashboard({ teamCode, data, view = "summary", query = {} }: { teamCode: string; data: ClubStatisticsData; view?: "summary" | "players" | "team" | "competitions" | "performance" | "discipline"; query?: Query }) {
  if (view === "players") return <PlayerStatistics teamCode={teamCode} data={data} query={query} />;
  if (view === "team") return <TeamStatistics teamCode={teamCode} data={data} />;
  if (view === "competitions") return <CompetitionByCompetition teamCode={teamCode} data={data} />;
  if (view === "performance") return <PerformanceStatistics teamCode={teamCode} data={data} query={query} />;
  if (view === "discipline") return <DisciplineStatistics teamCode={teamCode} data={data} />;
  return <SummaryStatistics teamCode={teamCode} data={data} />;
}

function StatsNav({ teamCode, data, active }: { teamCode: string; data: ClubStatisticsData; active: "summary" | "players" | "team" | "competitions" | "performance" | "discipline" }) {
  const base = `/clubes/${teamCode}/estadisticas`;
  const season = data.season?.id ? `season=${encodeURIComponent(data.season.id)}` : "";
  const summaryHref = season ? `${base}?${season}` : base;
  const playersHref = `${base}?${[season, "view=players"].filter(Boolean).join("&")}`;
  const teamHref = `${base}?${[season, "view=team"].filter(Boolean).join("&")}`;
  return <div className="club-stats-v35-toolbar">
    <div className="club-stats-v35-subtabs">
      <Link href={summaryHref} className={active === "summary" ? "is-active" : ""}>Resumen</Link>
      <Link href={playersHref} className={active === "players" ? "is-active" : ""}>Estadísticas de jugadores</Link>
      <Link href={teamHref} className={active === "team" ? "is-active" : ""}>Estadísticas de equipo</Link><Link href={`${base}?${[season, "view=competitions"].filter(Boolean).join("&")}`} className={active === "competitions" ? "is-active" : ""}>Competición por competición</Link><Link href={`${base}?${[season, "view=performance"].filter(Boolean).join("&")}`} className={active === "performance" ? "is-active" : ""}>Rendimiento</Link><Link href={`${base}?${[season, "view=discipline"].filter(Boolean).join("&")}`} className={active === "discipline" ? "is-active" : ""}>Disciplina</Link>
    </div>
    <form action={base} className="club-stats-v35-season">
      {active === "players" ? <input type="hidden" name="view" value="players" /> : active === "team" ? <input type="hidden" name="view" value="team" /> : active === "competitions" ? <input type="hidden" name="view" value="competitions" /> : active === "performance" ? <input type="hidden" name="view" value="performance" /> : active === "discipline" ? <input type="hidden" name="view" value="discipline" /> : null}
      <label htmlFor="season">Temporada</label>
      <select id="season" name="season" defaultValue={data.season?.id ?? ""}>{data.seasons.map((season)=><option value={season.id} key={season.id}>{season.name}</option>)}</select>
      <button type="submit">Ver</button>
    </form>
  </div>;
}

function SummaryStatistics({ teamCode, data }: { teamCode: string; data: ClubStatisticsData }) {
  const { team, players } = data;
  const scorers = rank(players, "goals");
  const assists = rank(players, "assists");
  const minutes = rank(players, "minutes");
  const keepers = [...players].filter((p) => p.saves > 0 || p.cleanSheets > 0).sort((a,b) => b.cleanSheets-a.cleanSheets || b.saves-a.saves).slice(0,5);
  const shotEfficiency = team.shots ? (team.goalsFor / team.shots) * 100 : 0;
  const savePct = team.saves + team.goalsAgainst ? (team.saves / (team.saves + team.goalsAgainst)) * 100 : 0;
  const winPct = team.played ? (team.wins / team.played) * 100 : 0;
  const gpg = team.played ? team.goalsFor / team.played : 0;
  const gapg = team.played ? team.goalsAgainst / team.played : 0;
  return <section className="club-stats-v35">
    <StatsNav teamCode={teamCode} data={data} active="summary" />

    <div className="club-stats-v35-kpis">
      <Kpi icon="goal" value={team.goalsFor} label="Goles a favor" note={team.played ? `${fmt(gpg)} por partido` : "Sin partidos"}/>
      <Kpi icon="shield" value={team.goalsAgainst} label="Goles en contra" note={team.played ? `${fmt(gapg)} por partido` : "Sin partidos"}/>
      <Kpi icon="trophy" value={team.wins} label="Victorias" note={`${pct(winPct)}%`}/>
      <Kpi icon="equal" value={team.draws} label="Empates" note={team.played ? `${pct((team.draws/team.played)*100)}%` : "0%"}/>
      <Kpi icon="cross" value={team.losses} label="Derrotas" note={team.played ? `${pct((team.losses/team.played)*100)}%` : "0%"}/>
      <Kpi icon="shot" value={team.shots} label="Tiros" note={team.played ? `${fmt(team.shots/team.played)} por partido` : "Sin partidos"}/>
      <Kpi icon="tackle" value={team.tackles} label="Entradas" note={team.played ? `${fmt(team.tackles/team.played)} por partido` : "Sin partidos"}/>
      <Kpi icon="pass" value={team.keyPasses} label="Pases clave" note={team.played ? `${fmt(team.keyPasses/team.played)} por partido` : "Sin partidos"}/>
    </div>

    <div className="club-stats-v35-leader-grid">
      <Leaderboard title="Goleadores" icon="ball" players={scorers} value={(p)=>p.goals} valueLabel="Goles" extra={(p)=>`${p.appearances} PJ · ${p.minutes} min`} />
      <Leaderboard title="Asistencias" icon="key" players={assists} value={(p)=>p.assists} valueLabel="Asist." extra={(p)=>`${p.appearances} PJ · ${p.minutes} min`} />
      <Leaderboard title="Minutos jugados" icon="clock" players={minutes} value={(p)=>p.minutes} valueLabel="Minutos" extra={(p)=>`${p.appearances} PJ`} />
    </div>

    <div className="club-stats-v35-bottom-grid">
      <Leaderboard title="Porterías a cero" icon="glove" players={keepers} value={(p)=>p.cleanSheets} valueLabel="PC" extra={(p)=>`${p.saves} paradas · ${p.appearances} PJ`} compact />
      <article className="club-stats-v35-card club-stats-v35-discipline"><Header title="Tarjetas" icon="cards"/><div><StatLine label="Tarjetas amarillas" value={String(team.yellowCards)}/><StatLine label="Tarjetas rojas" value={String(team.redCards)}/><StatLine label="Puntos disciplinarios" value={String(team.discipline)}/></div></article>
      <article className="club-stats-v35-card club-stats-v35-performance"><Header title="Rendimiento del equipo" icon="chart"/><div><Progress label="Eficacia de cara a gol" value={shotEfficiency}/><Progress label="Eficacia de portería" value={savePct}/><Progress label="Partidos ganados" value={winPct}/><Progress label="Goles por partido" value={Math.min(100,gpg*25)} display={fmt(gpg)}/><Progress label="Pases clave / partido" value={Math.min(100,(team.played?team.keyPasses/team.played:0)*5)} display={team.played?fmt(team.keyPasses/team.played):"0"}/></div></article>
      <article className="club-stats-v35-card club-stats-v35-form"><Header title="Forma (últimos 5 partidos)" icon="trend"/><div className="club-stats-v35-form-box"><div className="club-stats-v35-form-badges">{data.form.length?data.form.map((f)=><Link href={`/partidos/${f.matchId}`} className={`is-${f.result.toLowerCase()}`} key={f.matchId}>{f.result}</Link>):<span className="club-stats-v35-no-form">Sin resultados</span>}</div><StatLine label="Goles a favor" value={String(data.form.reduce((s,m)=>s+m.gf,0))}/><StatLine label="Goles en contra" value={String(data.form.reduce((s,m)=>s+m.ga,0))}/><StatLine label="Balance" value={`${data.form.filter(x=>x.result==="V").length}V · ${data.form.filter(x=>x.result==="E").length}E · ${data.form.filter(x=>x.result==="D").length}D`}/></div></article>
    </div>

    <article className="club-stats-v35-analysis"><div><span>“</span><div><strong>Análisis de la temporada</strong><p>{analysisText(team.played, team.goalsFor, team.goalsAgainst, team.wins, scorers[0], assists[0])}</p></div></div><em>{data.season ? `Temporada ${data.season.name}` : "Liga de Leyendas"}</em></article>
  </section>;
}


function TeamStatistics({ teamCode, data }: { teamCode: string; data: ClubStatisticsData }) {
  const { team, matches } = data;
  const points = team.wins * 3 + team.draws;
  const cleanSheets = matches.filter((m) => m.ga === 0).length;
  const concedingMatches = matches.filter((m) => m.ga > 0).length;
  const gfPerGame = team.played ? team.goalsFor / team.played : 0;
  const gaPerGame = team.played ? team.goalsAgainst / team.played : 0;
  const yellowPerGame = team.played ? team.yellowCards / team.played : 0;
  const redPerGame = team.played ? team.redCards / team.played : 0;
  const disciplinePerGame = team.played ? team.discipline / team.played : 0;
  const home = summarizeMatches(matches.filter((m) => m.home));
  const away = summarizeMatches(matches.filter((m) => !m.home));
  const competitions = data.competitions.map((competition) => ({ competition, stats: summarizeMatches(matches.filter((m) => m.competitionId === competition.id)) })).filter((row) => row.stats.played > 0);
  const streaks = calculateStreaks(matches);
  const lastTen = [...matches].slice(-10).reverse();
  const cumulative = cumulativeGoalDifference(matches);
  const maxAbs = Math.max(1, ...cumulative.map((x) => Math.abs(x.value)));
  const winPct = team.played ? (team.wins / team.played) * 100 : 0;
  const drawPct = team.played ? (team.draws / team.played) * 100 : 0;
  const lossPct = Math.max(0, 100 - winPct - drawPct);

  return <section className="club-stats-v35 club-team-stats-v38">
    <StatsNav teamCode={teamCode} data={data} active="team" />

    <div className="club-team-stats-v38-kpis">
      <TeamKpi icon="▣" value={team.played} label="Partidos jugados" />
      <TeamKpi icon="🏆" value={team.wins} label="Victorias" note={team.played ? `${pct(winPct)}%` : "0%"} tone="win" />
      <TeamKpi icon="=" value={team.draws} label="Empates" note={team.played ? `${pct(drawPct)}%` : "0%"} />
      <TeamKpi icon="×" value={team.losses} label="Derrotas" note={team.played ? `${pct(lossPct)}%` : "0%"} tone="loss" />
      <TeamKpi icon="⚽" value={team.goalsFor} label="Goles a favor" note={`${fmt(gfPerGame)} por partido`} />
      <TeamKpi icon="◎" value={team.goalsAgainst} label="Goles en contra" note={`${fmt(gaPerGame)} por partido`} tone="loss" />
    </div>

    <div className="club-team-stats-v38-main">
      <article className="club-team-stats-v38-card club-team-stats-v38-results">
        <TeamHeader title="Resultados" icon="✦" />
        <div className="club-team-stats-v38-donut-wrap">
          <div className="club-team-stats-v38-donut" style={{background:`conic-gradient(#34a853 0 ${winPct}%, var(--mt-muted) ${winPct}% ${winPct+drawPct}%, #e14b52 ${winPct+drawPct}% 100%)`}}><div><strong>{points}</strong><span>Puntos</span></div></div>
          <div className="club-team-stats-v38-legend"><p><i className="is-win"/>Victorias <b>{team.wins}</b></p><p><i className="is-draw"/>Empates <b>{team.draws}</b></p><p><i className="is-loss"/>Derrotas <b>{team.losses}</b></p></div>
        </div>
      </article>

      <article className="club-team-stats-v38-card">
        <TeamHeader title="Goles" icon="⚽" />
        <div className="club-team-stats-v38-bars"><MetricBar label="Goles a favor" value={team.goalsFor} max={Math.max(team.goalsFor, team.goalsAgainst,1)} tone="blue"/><MetricBar label="Goles en contra" value={team.goalsAgainst} max={Math.max(team.goalsFor, team.goalsAgainst,1)} tone="red"/><MetricBar label="Diferencia de goles" value={team.goalsFor-team.goalsAgainst} max={Math.max(Math.abs(team.goalsFor-team.goalsAgainst),1)} tone="green" signed/><div className="club-team-stats-v38-dual"><div><strong>{fmt(gfPerGame)}</strong><span>Goles por partido</span></div><div><strong>{fmt(gaPerGame)}</strong><span>GC por partido</span></div></div></div>
      </article>

      <article className="club-team-stats-v38-card">
        <TeamHeader title="Porterías a cero" icon="✋" />
        <div className="club-team-stats-v38-clean"><div className="club-team-stats-v38-ring" style={{'--ring': `${team.played ? cleanSheets/team.played*100 : 0}%`} as CSSProperties}><div><strong>{team.played ? pct(cleanSheets/team.played*100) : 0}%</strong><span>{cleanSheets}/{team.played}</span></div></div><div><p><strong>{cleanSheets}</strong><span>Porterías a cero</span></p><p><strong>{concedingMatches}</strong><span>Partidos encajando</span></p></div></div>
      </article>
    </div>

    <div className="club-team-stats-v38-mid">
      <article className="club-team-stats-v38-card club-team-stats-v38-cumulative">
        <TeamHeader title="Diferencia de goles acumulada" icon="↗" />
        <div className="club-team-stats-v38-spark">{cumulative.length ? cumulative.map((item,i)=><div key={item.matchId} className="club-team-stats-v38-spark-col"><i style={{height:`${Math.max(6,Math.abs(item.value)/maxAbs*76)}%`}} className={item.value>=0?"is-pos":"is-neg"}/><small>{i+1}</small></div>) : <span className="club-team-stats-v38-empty">Sin partidos</span>}</div>
      </article>

      <article className="club-team-stats-v38-card">
        <TeamHeader title="Disciplina" icon="▮" />
        <div className="club-team-stats-v38-discipline"><div><span className="is-yellow"/><strong>{team.yellowCards}</strong><small>{fmt(yellowPerGame)} por partido</small></div><div><span className="is-red"/><strong>{team.redCards}</strong><small>{fmt(redPerGame)} por partido</small></div><p><span>Puntos disciplinarios</span><b>{team.discipline}</b></p><p><span>DP por partido</span><b>{fmt(disciplinePerGame)}</b></p></div>
      </article>

      <article className="club-team-stats-v38-card">
        <TeamHeader title="Máximas rachas" icon="✦" />
        <div className="club-team-stats-v38-streaks"><StatLine label="Victorias consecutivas" value={String(streaks.wins)}/><StatLine label="Sin perder" value={String(streaks.unbeaten)}/><StatLine label="Sin ganar" value={String(streaks.winless)}/><StatLine label="Derrotas consecutivas" value={String(streaks.losses)}/></div>
      </article>
    </div>

    <div className="club-team-stats-v38-bottom">
      <article className="club-team-stats-v38-card">
        <TeamHeader title="Resultados en casa / fuera" icon="⌂" />
        <div className="club-team-stats-v38-table-wrap"><table><thead><tr><th></th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead><tbody><SummaryRow label="En casa" s={home}/><SummaryRow label="Fuera" s={away}/></tbody></table></div>
      </article>
      <article className="club-team-stats-v38-card">
        <TeamHeader title="Últimos 10 partidos" icon="▤" />
        <div className="club-team-stats-v38-last">{lastTen.length ? lastTen.map((m)=><Link href={`/partidos/${m.matchId}`} key={m.matchId}><span className={`is-${m.result.toLowerCase()}`}>{m.result}</span><b>{m.home ? "vs" : "@"} {m.opponentCode}</b><em>{m.gf}-{m.ga}</em></Link>) : <span className="club-team-stats-v38-empty">Sin partidos disputados.</span>}</div>
      </article>
    </div>

    <article className="club-team-stats-v38-card club-team-stats-v38-competitions">
      <TeamHeader title="Estadísticas por competición" icon="▣" />
      <div className="club-team-stats-v38-table-wrap"><table><thead><tr><th>Competición</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>GF</th><th>GC</th><th>DG</th><th>G/PJ</th><th>GC/PJ</th><th>PC</th><th>Pts</th></tr></thead><tbody>{competitions.length ? competitions.map(({competition,stats})=><tr key={competition.id}><td>{competition.name}</td><td>{stats.played}</td><td>{stats.wins}</td><td>{stats.draws}</td><td>{stats.losses}</td><td>{stats.gf}</td><td>{stats.ga}</td><td>{signed(stats.gf-stats.ga)}</td><td>{fmt(stats.played?stats.gf/stats.played:0)}</td><td>{fmt(stats.played?stats.ga/stats.played:0)}</td><td>{stats.cleanSheets}</td><td>{stats.points}</td></tr>) : <tr><td colSpan={12} className="club-team-stats-v38-empty">Sin estadísticas de competición.</td></tr>}<tr className="is-total"><td>Total</td><td>{team.played}</td><td>{team.wins}</td><td>{team.draws}</td><td>{team.losses}</td><td>{team.goalsFor}</td><td>{team.goalsAgainst}</td><td>{signed(team.goalsFor-team.goalsAgainst)}</td><td>{fmt(gfPerGame)}</td><td>{fmt(gaPerGame)}</td><td>{cleanSheets}</td><td>{points}</td></tr></tbody></table></div>
    </article>

    <p className="club-team-stats-v38-note">ⓘ Estadísticas calculadas únicamente con partidos y datos oficiales ESMS{data.season ? ` de la temporada ${data.season.name}` : ""}.</p>
  </section>;
}

type MatchSummary = { played:number; wins:number; draws:number; losses:number; gf:number; ga:number; points:number; cleanSheets:number };
function summarizeMatches(matches: ClubStatisticsData["matches"]): MatchSummary { return matches.reduce((s,m)=>{s.played++;s.gf+=m.gf;s.ga+=m.ga;s.cleanSheets+=m.ga===0?1:0;if(m.result==="V"){s.wins++;s.points+=3}else if(m.result==="E"){s.draws++;s.points++}else s.losses++;return s},{played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,cleanSheets:0}); }
function calculateStreaks(matches: ClubStatisticsData["matches"]){let wins=0,losses=0,unbeaten=0,winless=0,cw=0,cl=0,cu=0,cn=0;for(const m of matches){cw=m.result==="V"?cw+1:0;cl=m.result==="D"?cl+1:0;cu=m.result!=="D"?cu+1:0;cn=m.result!=="V"?cn+1:0;wins=Math.max(wins,cw);losses=Math.max(losses,cl);unbeaten=Math.max(unbeaten,cu);winless=Math.max(winless,cn)}return{wins,losses,unbeaten,winless}}
function cumulativeGoalDifference(matches: ClubStatisticsData["matches"]){let value=0;return matches.map(m=>({matchId:m.matchId,value:value+=m.gf-m.ga}))}
function signed(v:number){return v>0?`+${v}`:String(v)}
function TeamKpi({icon,value,label,note,tone}:{icon:string;value:number|string;label:string;note?:string;tone?:"win"|"loss"}){return <article className={tone?`is-${tone}`:""}><span>{icon}</span><div><strong>{value}</strong><b>{label}</b>{note?<small>{note}</small>:null}</div></article>}
function TeamHeader({title,icon}:{title:string;icon:string}){return <header><div><span>{icon}</span><strong>{title}</strong></div></header>}
function MetricBar({label,value,max,tone,signed:showSign=false}:{label:string;value:number;max:number;tone:string;signed?:boolean}){return <div className="club-team-stats-v38-bar"><p><span>{label}</span><b>{showSign?signed(value):value}</b></p><i><em className={`is-${tone}`} style={{width:`${Math.min(100,Math.abs(value)/Math.max(1,max)*100)}%`}}/></i></div>}
function SummaryRow({label,s}:{label:string;s:MatchSummary}){return <tr><td>{label}</td><td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td><td>{s.gf}</td><td>{s.ga}</td><td>{signed(s.gf-s.ga)}</td><td>{s.points}</td></tr>}


function CompetitionByCompetition({ teamCode, data }: { teamCode: string; data: ClubStatisticsData }) {
  const competitionRows = data.competitions.map((competition) => {
    const matches = data.matches.filter((match) => match.competitionId === competition.id);
    const stats = summarizeCompetition(matches, competition);
    const table = data.competitionTables.find((entry) => entry.competitionId === competition.id && entry.rows.some((row) => row.teamCode === teamCode));
    const standing = table?.rows.find((row) => row.teamCode === teamCode) ?? null;
    return { competition, matches, stats, table, standing };
  }).filter((row) => row.stats.played > 0 || row.standing);

  const primary = competitionRows.find((row) => row.table) ?? competitionRows[0] ?? null;
  const cupRows = competitionRows.filter((row) => row.competition.id !== primary?.competition.id && !row.table).slice(0, 2);
  const fallbackRows = competitionRows.filter((row) => row.competition.id !== primary?.competition.id).slice(0, 2);
  const secondaryRows = cupRows.length ? cupRows : fallbackRows;
  const maxGoals = Math.max(1, ...competitionRows.flatMap((row) => [row.stats.gf, row.stats.ga]));
  const primaryEvolution = primary ? competitionEvolution(primary.matches, primary.competition) : [];
  const maxEvolution = Math.max(1, ...primaryEvolution.flatMap((item) => [Math.abs(item.points), Math.abs(item.gd)]));
  const recent = primary ? [...primary.matches].slice(-5).reverse() : [];
  const tableRows = primary?.table ? standingWindow(primary.table.rows, teamCode) : [];

  return <section className="club-stats-v35 club-comp-stats-v39">
    <StatsNav teamCode={teamCode} data={data} active="competitions" />

    <article className="club-comp-stats-v39-intro"><div><span>▣</span><div><h2>Competición por competición</h2><p>Rendimiento del club en cada competición de {data.season ? `la temporada ${data.season.name}` : "la temporada"}.</p></div></div></article>

    <div className="club-comp-stats-v39-cards">
      {competitionRows.length ? competitionRows.map(({competition,stats,standing,table}) => <article key={competition.id} className="club-comp-stats-v39-comp-card">
        <header><span className={`is-${competition.type.toLowerCase()}`}>🏆</span><div><strong>{competition.name}</strong><small>{competitionTypeLabel(competition.type)}{table?.groupName ? ` · ${table.groupName}` : ""}</small></div></header>
        <div className="club-comp-stats-v39-card-metrics"><div><b>{stats.played}</b><span>Partidos</span></div><div><b>{stats.wins}</b><span>V</span></div><div><b>{stats.draws}</b><span>E</span></div><div><b>{stats.losses}</b><span>D</span></div><div><b>{stats.gf} - {stats.ga}</b><span>Goles</span></div><div><b>{signed(stats.gf-stats.ga)}</b><span>D. goles</span></div></div>
        <footer>{standing ? <><strong>{standing.position}º</strong><span>de {table?.rows.length ?? 0} · {standing.points} pts</span></> : <><strong>{stats.points} pts</strong><span>{pct(stats.played ? stats.wins/stats.played*100 : 0)}% victorias</span></>}</footer>
      </article>) : <div className="club-comp-stats-v39-empty">Todavía no hay partidos jugados en las competiciones de esta temporada.</div>}
    </div>

    {primary ? <div className="club-comp-stats-v39-main-grid">
      <article className="club-comp-stats-v39-panel club-comp-stats-v39-standing"><PanelHead icon="▥" title={primary.table ? `Clasificación · ${primary.competition.name}${primary.table.groupName ? ` · ${primary.table.groupName}` : ""}` : `Balance · ${primary.competition.name}`} />
        {primary.table ? <div className="club-comp-stats-v39-table-wrap"><table><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead><tbody>{tableRows.map((row)=><tr key={row.teamCode} className={row.teamCode===teamCode?"is-club":""}><td>{row.position}</td><td><span className="club-comp-stats-v39-team"><Image src={getClubLogo(row.teamCode)} alt="" width={20} height={20}/><b>{getClubName(row.teamCode)}</b></span></td><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{signed(row.goalDifference)}</td><td><b>{row.points}</b></td></tr>)}</tbody></table></div> : <CompetitionBalance stats={primary.stats} />}
        <footer><Link href={`/competiciones/${primary.competition.id}`}>Ver competición completa →</Link></footer>
      </article>

      <article className="club-comp-stats-v39-panel"><PanelHead icon="⌁" title="Evolución en la competición" /><div className="club-comp-stats-v39-evolution"><div className="club-comp-stats-v39-evolution-legend"><span><i className="is-points"/>Puntos</span><span><i className="is-gd"/>Diferencia de goles</span></div><div className="club-comp-stats-v39-evolution-chart">{primaryEvolution.length ? primaryEvolution.map((item,index)=><div className="club-comp-stats-v39-evo-col" key={`${item.matchId}-${index}`}><i className="is-points" style={{height:`${Math.max(4,Math.abs(item.points)/maxEvolution*100)}%`}}/><i className={`is-gd ${item.gd<0?"is-negative":""}`} style={{height:`${Math.max(4,Math.abs(item.gd)/maxEvolution*100)}%`}}/><small>{index+1}</small></div>) : <span className="club-comp-stats-v39-no-data">Sin datos</span>}</div></div></article>

      <article className="club-comp-stats-v39-panel"><PanelHead icon="▣" title="Resultados recientes" /><div className="club-comp-stats-v39-results">{recent.length?recent.map((match)=><Link href={`/partidos/${match.matchId}`} key={match.matchId}><time>{shortDate(match.date)}</time><span><Image src={getClubLogo(match.opponentCode)} alt="" width={22} height={22}/><b>{getClubName(match.opponentCode)}</b></span><strong>{match.gf} - {match.ga}</strong><em className={`is-${match.result.toLowerCase()}`}>{match.result}</em></Link>):<span className="club-comp-stats-v39-no-data">Sin resultados</span>}</div></article>
    </div> : null}

    <div className="club-comp-stats-v39-second-grid">
      {secondaryRows.map(({competition,matches})=><article className="club-comp-stats-v39-panel" key={`matches-${competition.id}`}><PanelHead icon="🏆" title={competition.name} /><div className="club-comp-stats-v39-cup-list">{[...matches].slice(-6).reverse().map((match)=><Link href={`/partidos/${match.matchId}`} key={match.matchId}><span><Image src={getClubLogo(match.opponentCode)} alt="" width={22} height={22}/><b>{getClubName(match.opponentCode)}</b></span><strong>{match.gf} - {match.ga}</strong><em className={`is-${match.result.toLowerCase()}`}>{match.result}</em></Link>)}</div><footer><Link href={`/competiciones/${competition.id}`}>Ver todos →</Link></footer></article>)}
      <article className="club-comp-stats-v39-panel club-comp-stats-v39-comparison"><PanelHead icon="▦" title="Resumen por competición" /><div>{competitionRows.map(({competition,stats})=><div className="club-comp-stats-v39-compare-row" key={`bar-${competition.id}`}><span>{competition.name}</span><div><i className="is-gf" style={{width:`${stats.gf/maxGoals*100}%`}}/><b>{stats.gf}</b></div><div><i className="is-ga" style={{width:`${stats.ga/maxGoals*100}%`}}/><b>{stats.ga}</b></div></div>)}</div><footer className="club-comp-stats-v39-legend"><span><i className="is-gf"/>Goles a favor</span><span><i className="is-ga"/>Goles en contra</span></footer></article>
    </div>

    <article className="club-comp-stats-v39-panel club-comp-stats-v39-detail"><PanelHead icon="▦" title="Estadísticas detalladas por competición" /><div className="club-comp-stats-v39-table-wrap"><table><thead><tr><th>Competición</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th><th>G/PJ</th><th>GC/PJ</th><th>% Victorias</th><th>Pos.</th></tr></thead><tbody>{competitionRows.map(({competition,stats,standing,table})=><tr key={`detail-${competition.id}`}><td><Link href={`/competiciones/${competition.id}`}>{competition.name}</Link>{table?.groupName?<small>{table.groupName}</small>:null}</td><td>{stats.played}</td><td>{stats.wins}</td><td>{stats.draws}</td><td>{stats.losses}</td><td>{stats.gf}</td><td>{stats.ga}</td><td>{signed(stats.gf-stats.ga)}</td><td>{stats.points}</td><td>{fmt(stats.played?stats.gf/stats.played:0)}</td><td>{fmt(stats.played?stats.ga/stats.played:0)}</td><td>{pct(stats.played?stats.wins/stats.played*100:0)}%</td><td>{standing?`${standing.position}º / ${table?.rows.length??0}`:"—"}</td></tr>)}</tbody></table></div></article>

    <p className="club-comp-stats-v39-note">ⓘ Las estadísticas se calculan automáticamente a partir de los resultados oficiales registrados para {data.season ? `la temporada ${data.season.name}` : "la temporada seleccionada"}.</p>
  </section>;
}

type CompetitionSummary = { played:number; wins:number; draws:number; losses:number; gf:number; ga:number; points:number };
function summarizeCompetition(matches: ClubStatisticsData["matches"], competition: ClubStatsCompetition): CompetitionSummary { return matches.reduce((s,m)=>{s.played++;s.gf+=m.gf;s.ga+=m.ga;if(m.result==="V"){s.wins++;s.points+=competition.pointsWin}else if(m.result==="E"){s.draws++;s.points+=competition.pointsDraw}else{s.losses++;s.points+=competition.pointsLoss}return s},{played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0}); }
function competitionEvolution(matches: ClubStatisticsData["matches"], competition: ClubStatsCompetition){let points=0,gd=0;return matches.map((m)=>{points+=m.result==="V"?competition.pointsWin:m.result==="E"?competition.pointsDraw:competition.pointsLoss;gd+=m.gf-m.ga;return{matchId:m.matchId,points,gd}})}
function competitionTypeLabel(type:ClubStatsCompetition["type"]){return type==="LEAGUE"?"Liga":type==="CUP"?"Copa":type==="SUPERCUP"?"Supercopa":type==="GROUPS"?"Fase de grupos":"Grupos + eliminatorias"}
function standingWindow(rows: ClubStatisticsData["competitionTables"][number]["rows"], teamCode:string){if(rows.length<=7)return rows;const index=Math.max(0,rows.findIndex(r=>r.teamCode===teamCode));const start=Math.max(0,Math.min(index-2,rows.length-5));const window=rows.slice(start,start+5);if(!window.some(r=>r.teamCode===teamCode))return [...rows.slice(0,4),rows[index]].filter(Boolean);return window}
function shortDate(value:string){if(!value)return"—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("es-ES",{day:"2-digit",month:"short"}).replace(".","")}
function PanelHead({icon,title}:{icon:string;title:string}){return <header><div><span>{icon}</span><strong>{title}</strong></div></header>}
function CompetitionBalance({stats}:{stats:CompetitionSummary}){return <div className="club-comp-stats-v39-balance"><div><strong>{stats.points}</strong><span>Puntos</span></div><div><strong>{stats.wins}</strong><span>Victorias</span></div><div><strong>{stats.draws}</strong><span>Empates</span></div><div><strong>{stats.losses}</strong><span>Derrotas</span></div><div><strong>{stats.gf}</strong><span>GF</span></div><div><strong>{stats.ga}</strong><span>GC</span></div></div>}


function PerformanceStatistics({ teamCode, data, query }: { teamCode: string; data: ClubStatisticsData; query: Query }) {
  const scope = query.scope === "home" ? "home" : query.scope === "away" ? "away" : "total";
  const scopedMatches = scope === "home" ? data.matches.filter((m) => m.home) : scope === "away" ? data.matches.filter((m) => !m.home) : data.matches;
  const stats = summarizePerformanceMatches(scopedMatches, data.competitions);
  const home = summarizePerformanceMatches(data.matches.filter((m) => m.home), data.competitions);
  const away = summarizePerformanceMatches(data.matches.filter((m) => !m.home), data.competitions);
  const total = summarizePerformanceMatches(data.matches, data.competitions);
  const winPct = stats.played ? stats.wins / stats.played * 100 : 0;
  const drawPct = stats.played ? stats.draws / stats.played * 100 : 0;
  const lossPct = stats.played ? stats.losses / stats.played * 100 : 0;
  const pointsPerGame = stats.played ? stats.points / stats.played : 0;
  const gfPerGame = stats.played ? stats.gf / stats.played : 0;
  const gaPerGame = stats.played ? stats.ga / stats.played : 0;
  const cleanSheetPct = stats.played ? stats.cleanSheets / stats.played * 100 : 0;
  const scoringMatches = scopedMatches.filter((m) => m.gf > 0).length;
  const blankMatches = scopedMatches.filter((m) => m.gf === 0).length;
  const concedingMatches = scopedMatches.filter((m) => m.ga > 0).length;
  const unbeatenMatches = scopedMatches.filter((m) => m.result !== "D").length;
  const streaks = calculateStreaks(scopedMatches);
  const lastTen = [...scopedMatches].slice(-10).reverse();
  const cumulative = cumulativePerformance(scopedMatches, data.competitions);
  const maxPoints = Math.max(1, ...cumulative.map((x) => x.points));
  const maxGoals = Math.max(1, ...cumulative.map((x) => Math.max(x.gf, x.ga)));
  const competitionRows = data.competitions.map((competition) => ({ competition, stats: summarizeCompetitionPerformance(scopedMatches.filter((m)=>m.competitionId===competition.id), competition) })).filter((row)=>row.stats.played>0);
  const base = `/clubes/${teamCode}/estadisticas`;
  const scopeHref = (value: "total"|"home"|"away") => { const qs = new URLSearchParams(); if(data.season?.id) qs.set("season", data.season.id); qs.set("view","performance"); if(value!=="total") qs.set("scope",value); return `${base}?${qs.toString()}`; };

  return <section className="club-stats-v35 club-performance-v40">
    <StatsNav teamCode={teamCode} data={data} active="performance" />

    <article className="club-performance-v40-intro"><div><span>▥</span><div><h2>Rendimiento</h2><p>Análisis del rendimiento competitivo del equipo{data.season ? ` en la temporada ${data.season.name}` : ""}, calculado únicamente con resultados oficiales.</p></div></div><nav><Link href={scopeHref("total")} className={scope==="total"?"is-active":""}>Total</Link><Link href={scopeHref("home")} className={scope==="home"?"is-active":""}>Casa</Link><Link href={scopeHref("away")} className={scope==="away"?"is-active":""}>Fuera</Link></nav></article>

    <div className="club-performance-v40-kpis">
      <PerfKpi icon="▣" value={stats.played} label="Partidos jugados"/>
      <PerfKpi icon="🏆" value={stats.wins} label="Victorias" note={`${pct(winPct)}%`} tone="win"/>
      <PerfKpi icon="=" value={stats.draws} label="Empates" note={`${pct(drawPct)}%`}/>
      <PerfKpi icon="×" value={stats.losses} label="Derrotas" note={`${pct(lossPct)}%`} tone="loss"/>
      <PerfKpi icon="⚽" value={stats.gf} label="Goles a favor" note={`${fmt(gfPerGame)} por partido`}/>
      <PerfKpi icon="◎" value={stats.ga} label="Goles en contra" note={`${fmt(gaPerGame)} por partido`} tone="loss"/>
      <PerfKpi icon="★" value={stats.points} label="Puntos" note={`${fmt(pointsPerGame)} por partido`} tone="gold"/>
    </div>

    <div className="club-performance-v40-top">
      <article className="club-performance-v40-card"><PerfHead icon="✦" title="Rendimiento por tipo de partido"/><div className="club-performance-v40-triple">
        <PerfDonut title="Total" summary={total}/><PerfDonut title="En casa" summary={home}/><PerfDonut title="Fuera" summary={away}/>
      </div></article>
      <article className="club-performance-v40-card"><PerfHead icon="↗" title="Evolución del rendimiento"/><div className="club-performance-v40-evolution"><div className="club-performance-v40-legend"><span><i className="is-points"/>Puntos acumulados</span><span><i className="is-gf"/>GF acumulados</span><span><i className="is-ga"/>GC acumulados</span></div><div className="club-performance-v40-chart">{cumulative.length?cumulative.map((item,index)=><div className="club-performance-v40-col" key={item.matchId}><i className="is-points" style={{height:`${Math.max(4,item.points/maxPoints*100)}%`}}/><i className="is-gf" style={{height:`${Math.max(4,item.gf/maxGoals*100)}%`}}/><i className="is-ga" style={{height:`${Math.max(4,item.ga/maxGoals*100)}%`}}/><small>{index+1}</small></div>):<span className="club-performance-v40-empty">Sin partidos</span>}</div></div></article>
      <article className="club-performance-v40-card"><PerfHead icon="◉" title="Indicadores de rendimiento"/><div className="club-performance-v40-indicators"><PerfRing value={winPct} label="Victorias"/><PerfRing value={cleanSheetPct} label="Porterías a cero"/><PerfRing value={stats.played?unbeatenMatches/stats.played*100:0} label="Sin perder"/><PerfRing value={stats.played?scoringMatches/stats.played*100:0} label="Partidos marcando"/></div></article>
    </div>

    <div className="club-performance-v40-mid">
      <article className="club-performance-v40-card"><PerfHead icon="⌁" title="Rachas del equipo"/><div className="club-performance-v40-streaks"><StatLine label="Victorias consecutivas" value={String(streaks.wins)}/><StatLine label="Sin perder" value={String(streaks.unbeaten)}/><StatLine label="Sin ganar" value={String(streaks.winless)}/><StatLine label="Derrotas consecutivas" value={String(streaks.losses)}/></div></article>
      <article className="club-performance-v40-card"><PerfHead icon="⚽" title="Producción ofensiva / defensiva"/><div className="club-performance-v40-balance"><MetricBar label="Goles a favor" value={stats.gf} max={Math.max(stats.gf,stats.ga,1)} tone="blue"/><MetricBar label="Goles en contra" value={stats.ga} max={Math.max(stats.gf,stats.ga,1)} tone="red"/><MetricBar label="Diferencia de goles" value={stats.gf-stats.ga} max={Math.max(Math.abs(stats.gf-stats.ga),1)} tone="green" signed/><div className="club-performance-v40-mini"><div><b>{scoringMatches}</b><span>Partidos marcando</span></div><div><b>{blankMatches}</b><span>Sin marcar</span></div><div><b>{stats.cleanSheets}</b><span>Porterías a cero</span></div><div><b>{concedingMatches}</b><span>Encajando</span></div></div></div></article>
      <article className="club-performance-v40-card"><PerfHead icon="✋" title="Solidez defensiva"/><div className="club-performance-v40-clean"><div className="club-performance-v40-big-ring" style={{'--ring':`${cleanSheetPct}%`} as CSSProperties}><div><strong>{pct(cleanSheetPct)}%</strong><span>{stats.cleanSheets}/{stats.played}</span></div></div><div><p><strong>{fmt(gaPerGame)}</strong><span>GC por partido</span></p><p><strong>{stats.ga}</strong><span>Goles encajados</span></p><p><strong>{stats.gf-stats.ga>0?`+${stats.gf-stats.ga}`:stats.gf-stats.ga}</strong><span>Diferencia</span></p></div></div></article>
    </div>

    <div className="club-performance-v40-bottom">
      <article className="club-performance-v40-card"><PerfHead icon="▦" title="Rendimiento por competición"/><div className="club-performance-v40-table"><table><thead><tr><th>Competición</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th><th>P/PJ</th></tr></thead><tbody>{competitionRows.length?competitionRows.map(({competition,stats})=><tr key={competition.id}><td><Link href={`/competiciones/${competition.id}`}>{competition.name}</Link></td><td>{stats.played}</td><td>{stats.wins}</td><td>{stats.draws}</td><td>{stats.losses}</td><td>{stats.gf}</td><td>{stats.ga}</td><td>{signed(stats.gf-stats.ga)}</td><td>{stats.points}</td><td>{fmt(stats.played?stats.points/stats.played:0)}</td></tr>):<tr><td colSpan={10} className="club-performance-v40-empty">Sin datos</td></tr>}</tbody></table></div></article>
      <article className="club-performance-v40-card"><PerfHead icon="▤" title="Últimos 10 partidos"/><div className="club-performance-v40-last">{lastTen.length?lastTen.map((m)=><Link href={`/partidos/${m.matchId}`} key={m.matchId}><span className={`is-${m.result.toLowerCase()}`}>{m.result}</span><time>{shortDate(m.date)}</time><b>{m.home?"vs":"@"} {getClubName(m.opponentCode)}</b><strong>{m.gf} - {m.ga}</strong><em>{m.competitionName}</em></Link>):<span className="club-performance-v40-empty">Sin partidos disputados.</span>}</div></article>
    </div>

    <p className="club-performance-v40-note">ⓘ Rendimiento calculado a partir de resultados oficiales de partidos. No se muestran métricas que ESMS no registra, como posesión, tipos de gol o distribución por minutos.</p>
  </section>;
}

function DisciplineStatistics({ teamCode, data }: { teamCode: string; data: ClubStatisticsData }) {
  const players = [...data.players];
  const totalYellow = players.reduce((s,p)=>s+p.yellowCards,0);
  const totalRed = players.reduce((s,p)=>s+p.redCards,0);
  const totalCards = totalYellow + totalRed;
  const bookedPlayers = players.filter((p)=>p.yellowCards>0 || p.redCards>0).length;
  const disciplinePoints = players.reduce((s,p)=>s+p.discipline,0);
  const mostBooked = players.filter((p)=>p.yellowCards>0 || p.redCards>0 || p.discipline>0)
    .sort((a,b)=>(b.yellowCards+b.redCards)-(a.yellowCards+a.redCards) || b.redCards-a.redCards || b.discipline-a.discipline).slice(0,8);
  const byCompetition = data.competitions.map((competition)=>{
    const matchIds = new Set(data.matches.filter((m)=>m.competitionId===competition.id).map((m)=>m.matchId));
    let yellow=0, red=0, dp=0;
    for(const p of players){
      yellow += p.disciplineByCompetition?.[competition.id]?.yellow ?? 0;
      red += p.disciplineByCompetition?.[competition.id]?.red ?? 0;
      dp += p.disciplineByCompetition?.[competition.id]?.dp ?? 0;
    }
    const played = matchIds.size;
    return {competition, played, yellow, red, dp};
  }).filter((r)=>r.played>0 || r.yellow>0 || r.red>0 || r.dp>0);
  const matchRows = [...data.matches].map((m)=>({
    ...m, yellow:m.yellowCards ?? 0, red:m.redCards ?? 0, dp:m.discipline ?? 0, total:(m.yellowCards ?? 0)+(m.redCards ?? 0)
  }));
  const topMatches = [...matchRows].sort((a,b)=>b.total-a.total || b.dp-a.dp || b.date.localeCompare(a.date)).slice(0,6);
  const lastTen = [...matchRows].slice(-10).reverse();
  let y=0,r=0;
  const evolution = matchRows.map((m,index)=>{y+=m.yellow;r+=m.red;return {index:index+1,yellow:y,red:r,matchId:m.matchId}});
  const maxEvo = Math.max(1,totalYellow,totalRed);
  const yellowPct = totalCards ? totalYellow/totalCards*100 : 0;
  const redPct = totalCards ? totalRed/totalCards*100 : 0;
  return <section className="club-stats-v35 club-discipline-v41">
    <StatsNav teamCode={teamCode} data={data} active="discipline" />
    <article className="club-discipline-v41-intro"><div><span>◉</span><div><h2>Disciplina</h2><p>Tarjetas y puntos disciplinarios calculados a partir de los archivos .stt{data.season?` de la temporada ${data.season.name}`:""}.</p></div></div><small>DP = 1 → amarilla · DP = 10 → roja</small></article>
    <div className="club-discipline-v41-kpis">
      <DiscKpi tone="yellow" icon="▮" value={totalYellow} label="Tarjetas amarillas" note={data.team.played?`${fmt(totalYellow/data.team.played)} por partido`:"0 por partido"}/>
      <DiscKpi tone="red" icon="▮" value={totalRed} label="Tarjetas rojas" note={data.team.played?`${fmt(totalRed/data.team.played)} por partido`:"0 por partido"}/>
      <DiscKpi icon="▤" value={totalCards} label="Total de tarjetas" note={data.team.played?`${fmt(totalCards/data.team.played)} por partido`:"0 por partido"}/>
      <DiscKpi icon="♟" value={bookedPlayers} label="Jugadores amonestados" note={players.length?`${pct(bookedPlayers/players.length*100)}% de los utilizados`:"0%"}/>
      <DiscKpi tone="gold" icon="DP" value={disciplinePoints} label="Puntos disciplinarios" note={data.team.played?`${fmt(disciplinePoints/data.team.played)} por partido`:"0 por partido"}/>
    </div>
    <div className="club-discipline-v41-top">
      <article className="club-discipline-v41-card"><DiscHead title="Tipo de disciplina" icon="▣"/><div className="club-discipline-v41-donut-wrap"><div className="club-discipline-v41-donut" style={{background:`conic-gradient(#f3b71a 0 ${yellowPct}%,#e33f4a ${yellowPct}% 100%)`}}><div><strong>{totalCards}</strong><span>Tarjetas</span></div></div><div className="club-discipline-v41-legend"><p><i className="is-yellow"/><span>Amarillas</span><b>{totalYellow}</b><small>{pct(yellowPct)}%</small></p><p><i className="is-red"/><span>Rojas</span><b>{totalRed}</b><small>{pct(redPct)}%</small></p><p><i className="is-dp"/><span>DP</span><b>{disciplinePoints}</b><small>Acumulado</small></p></div></div></article>
      <article className="club-discipline-v41-card"><DiscHead title="Disciplina por competición" icon="▦"/><div className="club-discipline-v41-table"><table><thead><tr><th>Competición</th><th>PJ</th><th>TA</th><th>TR</th><th>Total</th><th>DP</th><th>T/PJ</th></tr></thead><tbody>{byCompetition.length?byCompetition.map(({competition,played,yellow,red,dp})=><tr key={competition.id}><td><Link href={`/competiciones/${competition.id}`}>{competition.name}</Link></td><td>{played}</td><td>{yellow}</td><td>{red}</td><td>{yellow+red}</td><td>{dp}</td><td>{played?fmt((yellow+red)/played):"0"}</td></tr>):<tr><td colSpan={7}>Sin datos</td></tr>}</tbody></table></div></article>
      <article className="club-discipline-v41-card"><DiscHead title="Evolución de tarjetas" icon="↗"/><div className="club-discipline-v41-evolution"><div className="club-discipline-v41-evo-legend"><span><i className="is-yellow"/>Amarillas</span><span><i className="is-red"/>Rojas</span></div><div className="club-discipline-v41-evo-chart">{evolution.length?evolution.map((item)=><div key={item.matchId}><i className="is-yellow" style={{height:`${Math.max(3,item.yellow/maxEvo*100)}%`}}/><i className="is-red" style={{height:`${Math.max(3,item.red/maxEvo*100)}%`}}/><small>{item.index}</small></div>):<span>Sin partidos</span>}</div></div></article>
    </div>
    <div className="club-discipline-v41-mid">
      <article className="club-discipline-v41-card"><DiscHead title="Jugadores más amonestados" icon="♟"/><div className="club-discipline-v41-table"><table><thead><tr><th>#</th><th>Jugador</th><th>TA</th><th>TR</th><th>Total</th><th>DP</th></tr></thead><tbody>{mostBooked.length?mostBooked.map((p,i)=><tr key={p.playerId??p.esmsName}><td>{i+1}</td><td><PlayerCell player={p}/></td><td>{p.yellowCards}</td><td>{p.redCards}</td><td><b>{p.yellowCards+p.redCards}</b></td><td>{p.discipline}</td></tr>):<tr><td colSpan={6}>Sin tarjetas</td></tr>}</tbody></table></div></article>
      <article className="club-discipline-v41-card"><DiscHead title="Partidos con más tarjetas" icon="▤"/><div className="club-discipline-v41-match-list">{topMatches.length?topMatches.map((m)=><Link href={`/partidos/${m.matchId}`} key={m.matchId}><time>{shortDate(m.date)}</time><b>{m.home?"vs":"@"} {getClubName(m.opponentCode)}</b><span>{m.gf}-{m.ga}</span><em>🟨 {m.yellow}</em><em>🟥 {m.red}</em><strong>{m.total}</strong></Link>):<span className="club-discipline-v41-empty">Sin partidos</span>}</div></article>
      <article className="club-discipline-v41-card"><DiscHead title="Resumen disciplinario" icon="◆"/><div className="club-discipline-v41-summary"><StatLine label="Jugadores con amarilla" value={String(players.filter(p=>p.yellowCards>0).length)}/><StatLine label="Jugadores con roja" value={String(players.filter(p=>p.redCards>0).length)}/><StatLine label="Partidos con tarjetas" value={String(matchRows.filter(m=>m.total>0).length)}/><StatLine label="Partidos sin tarjetas" value={String(matchRows.filter(m=>m.total===0).length)}/><StatLine label="Máximo de tarjetas en un partido" value={String(topMatches[0]?.total??0)}/></div></article>
    </div>
    <article className="club-discipline-v41-card"><DiscHead title="Últimos 10 partidos" icon="◷"/><div className="club-discipline-v41-last"><table><thead><tr><th>Fecha</th><th>Rival</th><th>Resultado</th><th>Competición</th><th>TA</th><th>TR</th><th>DP</th></tr></thead><tbody>{lastTen.length?lastTen.map((m)=><tr key={m.matchId}><td>{shortDate(m.date)}</td><td><Link href={`/partidos/${m.matchId}`}>{m.home?"vs":"@"} {getClubName(m.opponentCode)}</Link></td><td><b>{m.gf}-{m.ga}</b></td><td>{m.competitionName}</td><td>{m.yellow}</td><td>{m.red}</td><td>{m.dp}</td></tr>):<tr><td colSpan={7}>Sin partidos</td></tr>}</tbody></table></div></article>
    <p className="club-discipline-v41-note">ⓘ Las tarjetas se derivan partido a partido del campo DP del .stt: 1 DP = amarilla y 10 DP = roja. No se muestran sanciones por acumulación porque su reglamento puede variar entre competiciones.</p>
  </section>;
}
function DiscKpi({icon,value,label,note,tone}:{icon:string;value:number|string;label:string;note:string;tone?:"yellow"|"red"|"gold"}){return <article className={tone?`is-${tone}`:""}><span>{icon}</span><div><strong>{value}</strong><b>{label}</b><small>{note}</small></div></article>}
function DiscHead({title,icon}:{title:string;icon:string}){return <header><div><span>{icon}</span><strong>{title}</strong></div></header>}

function summarizePerformanceMatches(matches: ClubStatisticsData["matches"], competitions: ClubStatsCompetition[]): MatchSummary { const map=new Map(competitions.map((c)=>[c.id,c])); return matches.reduce((s,m)=>{const c=map.get(m.competitionId);s.played++;s.gf+=m.gf;s.ga+=m.ga;s.cleanSheets+=m.ga===0?1:0;if(m.result==="V"){s.wins++;s.points+=c?.pointsWin??3}else if(m.result==="E"){s.draws++;s.points+=c?.pointsDraw??1}else{s.losses++;s.points+=c?.pointsLoss??0}return s},{played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,cleanSheets:0}); }
function cumulativePerformance(matches: ClubStatisticsData["matches"], competitions: ClubStatsCompetition[]){const map=new Map(competitions.map((c)=>[c.id,c]));let points=0,gf=0,ga=0;return matches.map((m)=>{const c=map.get(m.competitionId);points+=m.result==="V"?(c?.pointsWin??3):m.result==="E"?(c?.pointsDraw??1):(c?.pointsLoss??0);gf+=m.gf;ga+=m.ga;return{matchId:m.matchId,points,gf,ga}})}
function summarizeCompetitionPerformance(matches: ClubStatisticsData["matches"], competition: ClubStatsCompetition){return matches.reduce((s,m)=>{s.played++;s.gf+=m.gf;s.ga+=m.ga;if(m.result==="V"){s.wins++;s.points+=competition.pointsWin}else if(m.result==="E"){s.draws++;s.points+=competition.pointsDraw}else{s.losses++;s.points+=competition.pointsLoss}return s},{played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0})}
function PerfKpi({icon,value,label,note,tone}:{icon:string;value:number|string;label:string;note?:string;tone?:"win"|"loss"|"gold"}){return <article className={tone?`is-${tone}`:""}><span>{icon}</span><div><strong>{value}</strong><b>{label}</b>{note?<small>{note}</small>:null}</div></article>}
function PerfHead({icon,title}:{icon:string;title:string}){return <header><div><span>{icon}</span><strong>{title}</strong></div></header>}
function PerfDonut({title,summary}:{title:string;summary:MatchSummary}){const w=summary.played?summary.wins/summary.played*100:0,d=summary.played?summary.draws/summary.played*100:0;return <div className="club-performance-v40-donut-item"><div className="club-performance-v40-donut" style={{background:`conic-gradient(#39a85a 0 ${w}%,var(--mt-muted) ${w}% ${w+d}%,#e04e57 ${w+d}% 100%)`}}><div><strong>{pct(w)}%</strong><span>Victorias</span></div></div><b>{title}</b><small>{summary.wins}V · {summary.draws}E · {summary.losses}D</small></div>}
function PerfRing({value,label}:{value:number;label:string}){return <div><div className="club-performance-v40-small-ring" style={{'--ring':`${Math.max(0,Math.min(100,value))}%`} as CSSProperties}><strong>{pct(value)}%</strong></div><span>{label}</span></div>}

function PlayerStatistics({ teamCode, data, query }: { teamCode: string; data: ClubStatisticsData; query: Query }) {
  const q = (query.q ?? "").trim().toLowerCase();
  const pos = (query.position ?? "ALL").toUpperCase();
  const sort = query.sort ?? "minutes";
  const per90 = query.mode === "per90";
  let rows = [...data.players];
  if (q) rows = rows.filter((p) => `${p.displayName} ${p.esmsName}`.toLowerCase().includes(q));
  if (pos !== "ALL") rows = rows.filter((p) => normalizePosition(p.position) === pos);
  rows.sort(playerSorter(sort));

  const base = `/clubes/${teamCode}/estadisticas`;
  const shared = new URLSearchParams();
  if (data.season?.id) shared.set("season", data.season.id);
  shared.set("view", "players");
  if (data.selectedCompetitionId) shared.set("competition", data.selectedCompetitionId);
  if (query.position) shared.set("position", query.position);
  if (query.q) shared.set("q", query.q);
  if (query.sort) shared.set("sort", query.sort);

  const used = data.players.length;
  const totalGoals = data.players.reduce((s,p)=>s+p.goals,0);
  const totalAssists = data.players.reduce((s,p)=>s+p.assists,0);
  const totalMinutes = data.players.reduce((s,p)=>s+p.minutes,0);
  const totalYellow = data.players.reduce((s,p)=>s+p.yellowCards,0);
  const totalRed = data.players.reduce((s,p)=>s+p.redCards,0);
  const scorers = [...data.players].sort((a,b)=>b.goals-a.goals || rate90(b.goals,b.minutes)-rate90(a.goals,a.minutes) || b.minutes-a.minutes).slice(0,5);
  const assistants = [...data.players].sort((a,b)=>b.assists-a.assists || rate90(b.assists,b.minutes)-rate90(a.assists,a.minutes) || b.minutes-a.minutes).slice(0,5);
  const minuteLeaders = [...data.players].sort((a,b)=>b.minutes-a.minutes).slice(0,5);
  const keepers = [...data.players].filter(p=>normalizePosition(p.position)==="GK" || p.saves>0).sort((a,b)=>b.cleanSheets-a.cleanSheets || b.saves-a.saves).slice(0,5);
  const discipline = [...data.players].filter(p=>p.yellowCards>0 || p.redCards>0 || p.discipline>0).sort((a,b)=>b.redCards-a.redCards || b.yellowCards-a.yellowCards || b.discipline-a.discipline).slice(0,5);
  const mvp = [...data.players].sort((a,b)=>b.mom-a.mom || b.goals+b.assists-(a.goals+a.assists) || b.minutes-a.minutes).slice(0,5);
  const possibleMinutes = Math.max(0, data.team.played * 90);

  return <section className="club-stats-v35 club-player-stats-v37">
    <StatsNav teamCode={teamCode} data={data} active="players" />

    <div className="club-player-stats-v37-kpis">
      <PlayerKpi icon="♟" value={used} label="Jugadores utilizados" />
      <PlayerKpi icon="⚽" value={totalGoals} label="Goles totales" />
      <PlayerKpi icon="◆" value={totalAssists} label="Asistencias totales" />
      <PlayerKpi icon="◷" value={formatInt(totalMinutes)} label="Minutos jugados" />
      <PlayerKpi icon="▮" value={totalYellow} label="Tarjetas amarillas" tone="yellow" />
      <PlayerKpi icon="▮" value={totalRed} label="Tarjetas rojas" tone="red" />
    </div>

    <div className="club-player-stats-v37-rankings">
      <StatRanking title="Máximos goleadores" icon="⚽" players={scorers} columns={["Goles","PJ","Min","G/90"]} values={(p)=>[p.goals,p.appearances,formatInt(p.minutes),rate90(p.goals,p.minutes).toFixed(2).replace(".",",")]} />
      <StatRanking title="Máximos asistentes" icon="◆" players={assistants} columns={["Asis.","PJ","Min","A/90"]} values={(p)=>[p.assists,p.appearances,formatInt(p.minutes),rate90(p.assists,p.minutes).toFixed(2).replace(".",",")]} />
      <StatRanking title="Más minutos jugados" icon="◷" players={minuteLeaders} columns={["Min","PJ","% equipo"]} values={(p)=>[formatInt(p.minutes),p.appearances,possibleMinutes?`${Math.round((p.minutes/possibleMinutes)*100)}%`:"—"]} />
      <StatRanking title="Porterías a cero (porteros)" icon="✋" players={keepers} columns={["PC","PJ","Min","Enc/PJ"]} values={(p)=>[p.cleanSheets,p.appearances,formatInt(p.minutes),p.appearances?(p.conceded/p.appearances).toFixed(2).replace(".",","):"—"]} />
      <StatRanking title="Disciplina" icon="🟨" players={discipline} columns={["Amar.","Rojas","DP"]} values={(p)=>[p.yellowCards,p.redCards,p.discipline]} />
      <StatRanking title="MVP del partido" icon="★" players={mvp} columns={["MVP","PJ","G+A"]} values={(p)=>[p.mom,p.appearances,p.goals+p.assists]} />
    </div>

    <article className="club-player-stats-v37-detail">
      <header><div><span>▦</span><strong>Estadísticas detalladas</strong></div><small>Datos acumulados desde los archivos .stt</small></header>
      <form action={base} className="club-player-stats-v37-filters">
        <input type="hidden" name="season" value={data.season?.id ?? ""} /><input type="hidden" name="view" value="players" />
        <label><span>⌕</span><input name="q" defaultValue={query.q ?? ""} placeholder="Buscar jugador..." /></label>
        <select name="position" defaultValue={query.position ?? "ALL"}><option value="ALL">Todas las posiciones</option><option value="GK">GK</option><option value="DF">DF</option><option value="DM">DM</option><option value="MF">MF</option><option value="AM">AM</option><option value="FW">FW</option></select>
        <select name="competition" defaultValue={data.selectedCompetitionId ?? ""}><option value="">Todas las competiciones</option>{data.competitions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="sort" defaultValue={sort}><option value="minutes">Más minutos</option><option value="goals">Más goles</option><option value="assists">Más asistencias</option><option value="appearances">Más partidos</option><option value="mom">Más MVP</option><option value="tackles">Más entradas</option><option value="keyPasses">Más pases clave</option><option value="shots">Más tiros</option></select>
        <button type="submit">Aplicar</button>
        <div className="club-player-stats-v37-mode"><Link className={!per90?"is-active":""} href={`${base}?${withMode(shared,"total")}`}>Total</Link><Link className={per90?"is-active":""} href={`${base}?${withMode(shared,"per90")}`}>Por 90 min</Link></div>
      </form>
      <div className="club-player-stats-v37-table"><table><thead><tr><th>#</th><th>Jugador</th><th>Pos</th><th>PJ</th><th>Tit</th><th>Min</th><th>G</th><th>A</th><th>Par</th><th>Enc</th><th>Ent</th><th>PC</th><th>Tir</th><th>MVP</th><th>DP</th><th>🟨</th><th>🟥</th></tr></thead><tbody>{rows.length?rows.map((p,i)=><PlayerStatsRowV37 key={p.playerId??p.esmsName} player={p} rank={i+1} per90={per90}/>):<tr><td colSpan={17} className="club-player-stats-v36-empty">No hay datos con estos filtros.</td></tr>}</tbody></table></div>
      <footer><span>{data.season?`Temporada ${data.season.name}`:"Sin temporada"}{data.selectedCompetitionId?` · ${data.competitions.find(c=>c.id===data.selectedCompetitionId)?.name??"Competición"}`:" · Todas las competiciones"}</span><span>{rows.length} jugadores con estadísticas</span></footer>
    </article>
  </section>;
}

function StatRanking({title,icon,players,columns,values}:{title:string;icon:string;players:ClubStatsPlayer[];columns:string[];values:(p:ClubStatsPlayer)=>(string|number)[]}){
  return <article className="club-player-stats-v37-ranking"><header><div><span>{icon}</span><strong>{title}</strong></div><small>Top 5</small></header><div className="club-player-stats-v37-ranking-table"><table><thead><tr><th>#</th><th>Jugador</th>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{players.length?players.map((p,i)=><tr key={`${title}-${p.playerId??p.esmsName}`}><td>{i+1}</td><td><PlayerCell player={p}/></td>{values(p).map((v,j)=><td key={j}><b>{v}</b></td>)}</tr>):<tr><td colSpan={columns.length+2} className="club-player-stats-v36-empty">Sin datos</td></tr>}</tbody></table></div></article>
}

function PlayerStatsRowV37({player,rank,per90}:{player:ClubStatsPlayer;rank:number;per90:boolean}){
  const scale=(v:number)=>per90?rate90(v,player.minutes):v;
  const content=<><span className="club-player-stats-v36-avatar">{player.photoUrl?<Image src={player.photoUrl} alt="" fill sizes="28px" className="object-cover object-top"/>:player.displayName.slice(0,1)}</span><strong>{player.displayName}</strong></>;
  const pos=normalizePosition(player.position);
  return <tr><td>{rank}</td><td className="is-player">{player.playerId?<Link href={`/jugadores/${player.playerId}`}>{content}</Link>:<span>{content}</span>}</td><td><span className={`club-player-stats-v36-pos is-${pos.toLowerCase()}`}>{pos}</span></td><td>{player.appearances}</td><td>{player.starts}</td><td>{per90?"90":formatInt(player.minutes)}</td><td>{displayRate(scale(player.goals),per90)}</td><td>{displayRate(scale(player.assists),per90)}</td><td>{displayRate(scale(player.saves),per90)}</td><td>{displayRate(scale(player.conceded),per90)}</td><td>{displayRate(scale(player.tackles),per90)}</td><td>{displayRate(scale(player.keyPasses),per90)}</td><td>{displayRate(scale(player.shots),per90)}</td><td>{displayRate(scale(player.mom),per90)}</td><td>{displayRate(scale(player.discipline),per90)}</td><td>{displayRate(scale(player.yellowCards),per90)}</td><td>{displayRate(scale(player.redCards),per90)}</td></tr>;
}
function rate90(value:number,minutes:number){return minutes>0?(value*90)/minutes:0}

function PlayerStatsRow({ player, rank, per90 }: { player: ClubStatsPlayer; rank: number; per90: boolean }) {
  const scale = (value:number) => per90 ? per90Value(value, player.minutes) : value;
  const playerCell = <><span className="club-player-stats-v36-avatar">{player.photoUrl?<Image src={player.photoUrl} alt="" fill sizes="30px" className="object-cover object-top"/>:player.displayName.slice(0,1)}</span><strong>{player.displayName}</strong></>;
  const position = normalizePosition(player.position);
  return <tr>
    <td>{rank}</td><td className="is-player">{player.playerId?<Link href={`/jugadores/${player.playerId}`}>{playerCell}</Link>:<span>{playerCell}</span>}</td>
    <td><span className={`club-player-stats-v36-pos is-${position.toLowerCase()}`}>{position}</span></td><td>{player.age ?? "—"}</td><td>{player.nationality ?? "—"}</td>
    <td>{player.appearances}</td><td>{per90 ? "90" : formatInt(player.minutes)}</td><td>{displayRate(scale(player.goals),per90)}</td><td>{displayRate(scale(player.assists),per90)}</td>
    <td>{player.st ?? "—"}</td><td>{player.tk ?? "—"}</td><td>{player.ps ?? "—"}</td><td>{player.sh ?? "—"}</td>
    <td>{displayRate(scale(player.saves),per90)}</td><td>{displayRate(scale(player.conceded),per90)}</td><td>{displayRate(scale(player.tackles),per90)}</td><td>{displayRate(scale(player.keyPasses),per90)}</td><td>{displayRate(scale(player.shots),per90)}</td><td>{displayRate(scale(player.mom),per90)}</td>
    <td>{displayRate(scale(player.discipline),per90)}</td><td>{displayRate(scale(player.yellowCards),per90)}</td><td>{displayRate(scale(player.redCards),per90)}</td><td><span className={fitClass(player.fit)}>{player.fit ?? "—"}</span></td>
  </tr>;
}

function playerSorter(sort:string){return (a:ClubStatsPlayer,b:ClubStatsPlayer)=>{const key = (["goals","assists","appearances","mom","tackles","keyPasses","shots"] as const).find(k=>k===sort) ?? "minutes";return b[key]-a[key] || b.minutes-a.minutes || a.displayName.localeCompare(b.displayName,"es")}}
function normalizePosition(pos:string){const p=pos.toUpperCase();if(p.includes("GK"))return "GK";if(p.includes("DM"))return "DM";if(p.includes("AM"))return "AM";if(p.includes("DF"))return "DF";if(p.includes("FW"))return "FW";return "MF"}
function per90Value(value:number,minutes:number){return minutes>0 ? (value*90)/minutes : 0}
function displayRate(value:number,per90:boolean){return per90 ? value.toFixed(2).replace(".",",") : String(Math.round(value*100)/100).replace(".",",")}
function withMode(params:URLSearchParams,mode:"total"|"per90"){const p=new URLSearchParams(params);if(mode==="per90")p.set("mode","per90");else p.delete("mode");return p.toString()}
function formatInt(value:number){return new Intl.NumberFormat("es-ES").format(value)}
function fitClass(value:number|null){if(value===null)return "club-player-stats-v36-fit";if(value>=95)return "club-player-stats-v36-fit is-great";if(value>=90)return "club-player-stats-v36-fit is-good";if(value>=80)return "club-player-stats-v36-fit is-warn";return "club-player-stats-v36-fit is-bad"}
function PlayerKpi({icon,value,label,tone}:{icon:string;value:number|string;label:string;tone?:string}){return <article className={tone?`is-${tone}`:""}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>}

function rank(players: ClubStatsPlayer[], key: "goals"|"assists"|"minutes") { return [...players].sort((a,b)=>b[key]-a[key] || b.minutes-a.minutes).slice(0,5); }
function Kpi({icon,value,label,note}:{icon:string;value:number;label:string;note:string}){return <article><Icon name={icon}/><div><strong>{value}</strong><span>{label}</span><small>{note}</small></div></article>}
function Leaderboard({title,icon,players,value,valueLabel,extra,compact=false}:{title:string;icon:string;players:ClubStatsPlayer[];value:(p:ClubStatsPlayer)=>number;valueLabel:string;extra:(p:ClubStatsPlayer)=>string;compact?:boolean}){return <article className={`club-stats-v35-card club-stats-v35-leaders ${compact?"is-compact":""}`}><Header title={title} icon={icon}/><div className="club-stats-v35-table-wrap"><table><thead><tr><th>#</th><th>Jugador</th><th>{valueLabel}</th><th>Detalle</th></tr></thead><tbody>{players.length?players.map((p,i)=><tr key={`${p.playerId??p.esmsName}-${title}`}><td>{i+1}</td><td><PlayerCell player={p}/></td><td><b>{value(p)}</b></td><td>{extra(p)}</td></tr>):<tr><td colSpan={4} className="club-stats-v35-empty">Sin datos todavía</td></tr>}</tbody></table></div></article>}
function PlayerCell({player}:{player:ClubStatsPlayer}){const content=<><span className="club-stats-v35-avatar">{player.photoUrl?<Image src={player.photoUrl} alt="" fill sizes="32px" className="object-cover object-top"/>:player.displayName.slice(0,1)}</span><strong>{player.displayName}</strong></>;return player.playerId?<Link href={`/jugadores/${player.playerId}`} className="club-stats-v35-player">{content}</Link>:<span className="club-stats-v35-player">{content}</span>}
function Header({title,icon}:{title:string;icon:string}){return <header><div><Icon name={icon}/><strong>{title}</strong></div><span>Temporada</span></header>}
function StatLine({label,value}:{label:string;value:string}){return <p className="club-stats-v35-statline"><span>{label}</span><b>{value}</b></p>}
function Progress({label,value,display}:{label:string;value:number;display?:string}){const safe=Math.max(0,Math.min(100,value));return <div className="club-stats-v35-progress"><p><span>{label}</span><b>{display??`${pct(value)}%`}</b></p><i><em style={{width:`${safe}%`}}/></i></div>}
function fmt(value:number){return value.toFixed(2).replace(/\.00$/," ").replace(/(\.\d)0$/,"$1").replace(".",",").trim()}
function pct(value:number){return Math.round(value)}
function analysisText(played:number,gf:number,ga:number,wins:number,scorer?:ClubStatsPlayer,assistant?:ClubStatsPlayer){if(!played)return "Todavía no hay partidos disputados en esta temporada, por lo que el panel se completará automáticamente cuando se importen resultados y estadísticas ESMS.";const balance=gf>ga?"balance goleador positivo":gf<ga?"más goles encajados que anotados":"balance goleador igualado";const leader=scorer?` ${scorer.displayName} lidera el apartado goleador con ${scorer.goals} goles.`:"";const assist=assistant&&assistant.assists>0?` ${assistant.displayName} es el máximo asistente con ${assistant.assists}.`:"";return `El equipo ha disputado ${played} partidos, con ${wins} victorias y un ${balance} (${gf}-${ga}).${leader}${assist}`}
function Icon({name}:{name:string}){return <span className={`club-stats-v35-icon icon-${name}`} aria-hidden="true">{name==="goal"?"⚽":name==="shield"?"◎":name==="trophy"?"🏆":name==="equal"?"=":name==="cross"?"×":name==="shot"?"◉":name==="tackle"?"◆":name==="pass"?"↗":name==="ball"?"⚽":name==="key"?"◆":name==="clock"?"◷":name==="glove"?"✋":name==="cards"?"▮":name==="chart"?"↗":"⌁"}</span>}
