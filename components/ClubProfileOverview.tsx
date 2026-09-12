import Image from "next/image";
import Link from "next/link";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import type { ClubOverviewData, ClubOverviewMatch } from "@/lib/club-overview";

export default function ClubProfileOverview({ teamCode, data }: { teamCode: string; data: ClubOverviewData }) {
  return <>
    <section className="club-v33-primary-grid">
      <Panel title="Competiciones de la temporada" icon="trophy" className="club-v33-competitions">
        {data.competitions.length ? data.competitions.map((competition) => (
          <Link href={`/competiciones/${competition.id}`} className="club-v33-competition-row" key={competition.id}>
            <span className="club-v33-competition-icon"><Icon name="trophy" /></span>
            <span><strong>{competition.name}</strong><small>{competition.seasonName} · {competition.status === "FINISHED" ? "Finalizada" : competition.status === "ACTIVE" ? "En juego" : "Próximamente"}</small></span><b>›</b>
          </Link>
        )) : <EmptyMini text="Este club todavía no está inscrito en competiciones de la temporada." />}
      </Panel>
      <Panel title="Últimos partidos" icon="clock" action={<Link href={`/clubes/${teamCode}/partidos`}>Ver todos →</Link>} className="club-v33-results">
        {data.recentMatches.length ? data.recentMatches.map((match) => <ResultRow key={match.id} match={match} teamCode={teamCode} />) : <EmptyMini text="Todavía no hay resultados esta temporada." />}
      </Panel>
      <Panel title="Próximo partido" icon="calendar" className="club-v33-next">{data.nextMatch ? <NextMatch match={data.nextMatch} /> : <EmptyMini text="No hay ningún próximo partido programado." />}</Panel>
    </section>
    <section className="club-v33-secondary-grid">
      <Panel title="Jugadores destacados de la temporada" icon="star" action={<Link href={`/clubes/${teamCode}/plantilla`}>Ver plantilla →</Link>} className="club-v33-featured-panel">
        {data.featured.length ? <div className="club-v33-featured-grid">{data.featured.map((player) => (
          <Link href={player.playerId ? `/jugadores/${player.playerId}` : `/clubes/${teamCode}/plantilla`} key={player.position} className="club-v33-player-card">
            <span className={`club-v33-pos pos-${player.position.toLowerCase()}`}>{player.position}</span>
            <div className="club-v33-player-photo">{player.photoUrl ? <Image src={player.photoUrl} alt="" fill sizes="130px" className="object-cover object-top" /> : <span>{player.displayName.slice(0, 1)}</span>}</div>
            <strong>{player.displayName}</strong><b>{formatScore(player.score)}</b><small>{player.appearances} PJ{player.position === "GK" ? ` · ${player.saves} PAR` : ` · ${player.goals} G · ${player.assists} A`}</small>
          </Link>
        ))}</div> : <EmptyMini text="Los destacados aparecerán cuando haya estadísticas de partidos." />}
      </Panel>
      <Panel title="Palmarés" icon="laurel" className="club-v33-palmares">
        {data.palmares.summary.total > 0 ? <div className="club-v33-trophies"><TrophyStat value={data.palmares.summary.total} label="Títulos"/><TrophyStat value={data.palmares.summary.leagues} label="Ligas"/><TrophyStat value={data.palmares.summary.champions} label="Champions"/><TrophyStat value={data.palmares.summary.cups} label="Copas"/><Link href={`/clubes/${teamCode}/historial`}>Ver palmarés completo →</Link></div> : <div className="club-v33-palmares-empty"><span><Icon name="trophy" /></span><p>Aún no ha conquistado títulos<br/>en la Liga de Leyendas.</p><em>La historia se escribe temporada a temporada.</em></div>}
      </Panel>
    </section>
  </>;
}

function Panel({ title, icon, action, className = "", children }: { title: string; icon: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) { return <article className={`club-v33-panel ${className}`}><header><div><Icon name={icon}/><strong>{title}</strong></div>{action}</header><div className="club-v33-panel-body">{children}</div></article>; }
function ResultRow({ match, teamCode }: { match: ClubOverviewMatch; teamCode: string }) { const home=match.homeTeamCode===teamCode; const own=home?match.homeScore!:match.awayScore!; const opp=home?match.awayScore!:match.homeScore!; const rival=home?match.awayTeamCode:match.homeTeamCode; const result=own>opp?"V":own<opp?"D":"E"; return <Link href={`/partidos/${match.id}`} className="club-v33-result-row"><time>{formatDate(match.date)}</time><span><Image src={getClubLogo(rival)} alt="" width={28} height={28}/><strong>{getClubName(rival)}</strong></span><b>{own} - {opp}</b><em className={`result-${result.toLowerCase()}`}>{result}</em></Link>; }
function NextMatch({ match }: { match: ClubOverviewMatch }) { return <div className="club-v33-next-wrap"><div className="club-v33-next-comp">{match.competitionName}</div><div className="club-v33-next-teams"><Team code={match.homeTeamCode}/><div><small>{formatDate(match.date,true)}</small><strong>{formatTime(match.date)}</strong></div><Team code={match.awayTeamCode}/></div><Link href={`/partidos/${match.id}`}>Ver partido →</Link></div>; }
function Team({code}:{code:string}){return <div className="club-v33-next-team"><Image src={getClubLogo(code)} alt="" width={62} height={62}/><strong>{getClubName(code)}</strong><small>{code}</small></div>}
function TrophyStat({value,label}:{value:number;label:string}){return <div><strong>{value}</strong><small>{label}</small></div>}
function EmptyMini({text}:{text:string}){return <div className="club-v33-empty-mini"><p>{text}</p></div>}
function formatScore(score:number){return score.toFixed(1).replace(".",",")}
function formatDate(value:string|null,long=false){if(!value)return "Sin fecha";const date=new Date(value);return new Intl.DateTimeFormat("es-ES",long?{day:"numeric",month:"short",year:"numeric"}:{day:"2-digit",month:"short"}).format(date)}
function formatTime(value:string|null){if(!value)return "—";return new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit"}).format(new Date(value))}
function Icon({name}:{name:string}){if(name==="calendar")return <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v5M16 3v5M4 10h16"/></svg>;if(name==="clock")return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>;if(name==="star")return <svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3Z"/></svg>;if(name==="laurel")return <svg viewBox="0 0 24 24"><path d="M8 19c-4-2-5-7-3-11M6 16l-3-1M5 12 2 10M6 8 4 5M16 19c4-2 5-7 3-11M18 16l3-1M19 12l3-2M18 8l2-3M9 20h6"/></svg>;return <svg viewBox="0 0 24 24"><path d="M8 4h8v4.5c0 3-1.7 5.5-4 5.5s-4-2.5-4-5.5V4ZM8 6H5v1.5c0 2 1.2 3.5 3.2 3.8M16 6h3v1.5c0 2-1.2 3.5-3.2 3.8M12 14v3M9 20h6M10 17h4"/></svg>}
