import Image from 'next/image';
import Link from 'next/link';
import type { CompetitionType } from '@/lib/competition-types';
import { COMPETITION_FORMAT, roundPhase } from '@/lib/competition-format';
import { getClubLogo } from '@/lib/club-logo';
import { getClubName } from '@/lib/club-names';

type Round = { id: string; number: number; name: string };
type Match = {
  id: string; roundId: string | null; homeTeamCode: string; awayTeamCode: string;
  homeScore: number | null; awayScore: number | null; status: string;
};

export function FormatMark({ type }: { type: CompetitionType }) {
  const groups = type === 'GROUPS' || type === 'GROUPS_KNOCKOUT';
  const knockout = type === 'CUP' || type === 'SUPERCUP' || type === 'GROUPS_KNOCKOUT';
  return <svg className="competition-format-mark" viewBox="0 0 180 92" fill="none" aria-hidden="true">
    {type === 'LEAGUE' ? <>{[0,1,2,3].map(i=><g key={i}><rect x="10" y={8+i*21} width="160" height="15" rx="4"/><path d={`M22 ${15+i*21}h12 M48 ${15+i*21}h75 M142 ${15+i*21}h14`}/></g>)}</> : null}
    {groups ? <>{[0,1,2,3].map(i=><g key={i}><rect x={10+(i%2)*46} y={8+Math.floor(i/2)*42} width="37" height="32" rx="5"/><path d={`M${18+(i%2)*46} ${20+Math.floor(i/2)*42}h20 m-20 9h14`}/></g>)}</> : null}
    {knockout ? <g transform={groups?'translate(100 0) scale(.44 1)':'translate(10 0)'}><path d="M12 15h35v20h43v22h43 M12 77h35V57h43 M12 36h35 M12 56h35 M133 46v22h24"/>{[15,36,56,77].map(y=><circle key={y} cx="12" cy={y} r="4"/>)}<circle cx="158" cy="57" r="7"/></g> : null}
    {groups&&!knockout ? <path d="M120 22h45 M120 42h35 M120 62h45"/> : null}
  </svg>;
}

export function CompetitionFormatBanner({type,groups,rounds}:{type:CompetitionType;groups:number;rounds:number}) {
  const format=COMPETITION_FORMAT[type];
  return <section className={`competition-format-banner format-${type.toLowerCase()}`} aria-label="Formato de competición">
    <FormatMark type={type}/><div><span className="competition-format-eyebrow">Formato de competición</span><h2>{format.label}</h2><p>{format.description}</p>{type === "GROUPS_KNOCKOUT" ? <nav className="competition-phase-links" aria-label="Fases de la competición"><a href="#competition-groups">1. Fase de grupos</a><a href="#competition-knockout">2. Eliminatorias</a></nav> : null}</div>
    <div className="competition-format-facts">{type==='GROUPS'||type==='GROUPS_KNOCKOUT'?<span><b>{groups}</b> grupos</span>:null}<span><b>{rounds}</b> {format.unit.toLowerCase()}</span></div>
  </section>;
}

export default function CompetitionKnockoutView({rounds,matches,mixed=false}:{rounds:Round[];matches:Match[];mixed?:boolean}) {
  const sorted=[...rounds].sort((a,b)=>a.number-b.number);
  const knockoutRounds=mixed?sorted.filter(r=>roundPhase(r.name)==='knockout'):sorted;
  const unknown=mixed?sorted.filter(r=>roundPhase(r.name)==='unknown'):[];
  const knownIds=new Set(rounds.map(r=>r.id));
  const unassigned=matches.filter(m=>!m.roundId||!knownIds.has(m.roundId));
  return <section id="competition-knockout" className="competition-knockout" aria-label="Cuadro por rondas">
    <header className="competition-knockout-heading"><div><span className="competition-format-eyebrow">{mixed?'Segunda fase':'Camino al título'}</span><h2>Cuadro de eliminatorias</h2><p>Partidos organizados por ronda. Consulta cada encuentro para ver su detalle.</p></div><FormatMark type="CUP"/></header>
    {knockoutRounds.length?<div className="competition-bracket" tabIndex={0} role="region" aria-label="Rondas de eliminatorias; desplaza horizontalmente para ver todas">{knockoutRounds.map(round=><RoundColumn key={round.id} round={round} matches={matches}/>)}</div>:<p className="competition-format-empty">{mixed?'Los cruces de eliminatorias aparecerán aquí cuando se publiquen sus rondas.':'Todavía no se han publicado las rondas de esta competición.'}</p>}
    {unknown.length?<details className="competition-unclassified"><summary>Otras rondas publicadas ({unknown.length})</summary><p>Estas rondas todavía no tienen una fase identificable.</p><div className="competition-bracket">{unknown.map(round=><RoundColumn key={round.id} round={round} matches={matches}/>)}</div></details>:null}
    {unassigned.length?<details className="competition-unclassified"><summary>Partidos sin ronda ({unassigned.length})</summary><div className="competition-unassigned-matches">{unassigned.map(match=><MatchCard key={match.id} match={match}/>)}</div></details>:null}
  </section>;
}

  function MatchCard({match}:{match:Match}) {
    const played=match.status==='PLAYED'&&match.homeScore!==null&&match.awayScore!==null;
    const status=match.status==='CANCELLED'?'Cancelado':match.status==='POSTPONED'?'Aplazado':played?'Resultado final':'Pendiente';
    return <Link className="competition-tie" href={`/partidos/${match.id}`}>
      <span className="competition-tie-status">{status}</span>
      {[[match.homeTeamCode,match.homeScore],[match.awayTeamCode,match.awayScore]].map(([code,score],i)=><span className="competition-tie-team" key={`${code}-${i}`}><Image src={getClubLogo(String(code))} alt="" width={24} height={24}/><span>{getClubName(String(code))}</span><b>{played?score:'—'}</b></span>)}
    </Link>;
  }
  function RoundColumn({round,matches}:{round:Round;matches:Match[]}){
    const games=matches.filter(m=>m.roundId===round.id);
    return <section className="competition-round" aria-label={round.name}><header><h3>{round.name}</h3><span>{games.length} {games.length===1?'partido':'partidos'}</span></header><div className="competition-round-matches">{games.length?games.map(match=><MatchCard match={match} key={match.id}/>):<p className="competition-format-empty">Cruces por definir</p>}</div></section>;
  }
