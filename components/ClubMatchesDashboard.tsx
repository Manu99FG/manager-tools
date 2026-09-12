import Image from "next/image";
import Link from "next/link";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import type { ClubMatchItem, ClubMatchesData } from "@/lib/club-matches";

type View = "summary" | "calendar" | "results";

type Props = {
  teamCode: string;
  data: ClubMatchesData;
  view: View;
  query: { season?: string; competition?: string; status?: string; venue?: string };
};

function resultFor(match: ClubMatchItem, teamCode: string) {
  if (match.homeScore == null || match.awayScore == null) return null;
  const home = match.homeTeamCode === teamCode;
  const gf = home ? match.homeScore : match.awayScore;
  const ga = home ? match.awayScore : match.homeScore;
  return gf > ga ? "V" : gf < ga ? "D" : "E";
}

function rivalFor(match: ClubMatchItem, teamCode: string) {
  return match.homeTeamCode === teamCode ? match.awayTeamCode : match.homeTeamCode;
}

function formatDate(value: string | null, short = false) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", short ? { day: "2-digit", month: "2-digit" } : { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function roundLabel(match: ClubMatchItem) {
  if (match.roundName) return match.roundName;
  if (match.roundNumber != null) return `J${match.roundNumber}`;
  return "—";
}

function hrefWith(teamCode: string, view: View, query: Props["query"], extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  params.set("view", view);
  const merged = { ...query, ...extra };
  if (merged.season) params.set("season", merged.season);
  if (merged.competition) params.set("competition", merged.competition);
  if (merged.status) params.set("status", merged.status);
  if (merged.venue) params.set("venue", merged.venue);
  return `/clubes/${teamCode}/partidos?${params.toString()}`;
}

export default function ClubMatchesDashboard({ teamCode, data, view, query }: Props) {
  const competitionFilter = query.competition ?? "ALL";
  const statusFilter = query.status ?? "ALL";
  const venueFilter = query.venue ?? "ALL";

  const filtered = data.matches.filter((m) => {
    if (competitionFilter !== "ALL" && m.competitionId !== competitionFilter) return false;
    if (statusFilter === "PLAYED" && m.status !== "PLAYED") return false;
    if (statusFilter === "UPCOMING" && m.status === "PLAYED") return false;
    if (venueFilter === "HOME" && m.homeTeamCode !== teamCode) return false;
    if (venueFilter === "AWAY" && m.awayTeamCode !== teamCode) return false;
    return true;
  });

  const sortedAll = [...filtered].sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
  const resultMatches = [...filtered].filter((m) => m.status === "PLAYED").sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));

  return (
    <section className="club-matches-v42">
      <div className="club-matches-v42-subtabs">
        <Link className={view === "summary" ? "is-active" : ""} href={hrefWith(teamCode, "summary", query)}>Resumen</Link>
        <Link className={view === "calendar" ? "is-active" : ""} href={hrefWith(teamCode, "calendar", query)}>Calendario</Link>
        <Link className={view === "results" ? "is-active" : ""} href={hrefWith(teamCode, "results", query)}>Resultados</Link>
        <form className="club-matches-v42-season">
          <input type="hidden" name="view" value={view} />
          <select name="season" defaultValue={data.season?.id ?? ""} aria-label="Temporada">
            {data.seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="submit">Aplicar</button>
        </form>
      </div>

      {view === "summary" ? <Summary teamCode={teamCode} data={data} /> : null}

      <section className="club-matches-v42-table-card">
        <header>
          <div><span>▣</span><strong>{view === "results" ? "Resultados de la temporada" : view === "calendar" ? "Calendario de la temporada" : "Todos los partidos de la temporada"}</strong></div>
          <form className="club-matches-v42-filters">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="season" value={data.season?.id ?? ""} />
            <select name="competition" defaultValue={competitionFilter} aria-label="Competición">
              <option value="ALL">Todas las competiciones</option>
              {data.competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="status" defaultValue={statusFilter} aria-label="Estado">
              <option value="ALL">Todos</option>
              <option value="PLAYED">Jugados</option>
              <option value="UPCOMING">Pendientes</option>
            </select>
            <select name="venue" defaultValue={venueFilter} aria-label="Localía">
              <option value="ALL">Local y fuera</option>
              <option value="HOME">En casa</option>
              <option value="AWAY">Fuera</option>
            </select>
            <button type="submit">Filtrar</button>
          </form>
        </header>
        <MatchesTable teamCode={teamCode} matches={view === "results" ? resultMatches : sortedAll} />
      </section>
    </section>
  );
}

function Summary({ teamCode, data }: { teamCode: string; data: ClubMatchesData }) {
  const nextFive = data.upcoming.slice(0, 5);
  const gd = data.stats.goalDifference;
  return <>
    <div className="club-matches-v42-top">
      <article className="club-matches-v42-card club-matches-v42-next">
        <header><div><span>▣</span><strong>Próximo partido</strong></div>{data.nextMatch ? <small>{data.nextMatch.competitionName} · {roundLabel(data.nextMatch)}</small> : null}</header>
        {data.nextMatch ? <div className="club-matches-v42-next-body">
          <div className="club-matches-v42-team"><Image src={getClubLogo(data.nextMatch.homeTeamCode)} alt="" width={58} height={58}/><strong>{getClubName(data.nextMatch.homeTeamCode)}</strong><small>{data.nextMatch.homeTeamCode}</small></div>
          <div className="club-matches-v42-next-time"><b>-</b><time>{formatDate(data.nextMatch.date)}<strong>{formatTime(data.nextMatch.date)}</strong></time></div>
          <div className="club-matches-v42-team"><Image src={getClubLogo(data.nextMatch.awayTeamCode)} alt="" width={58} height={58}/><strong>{getClubName(data.nextMatch.awayTeamCode)}</strong><small>{data.nextMatch.awayTeamCode}</small></div>
          <Link href={`/partidos/${data.nextMatch.id}`}>Ver previa del partido →</Link>
        </div> : <p className="club-matches-v42-empty">No hay un próximo partido programado.</p>}
      </article>

      <article className="club-matches-v42-card">
        <header><div><span>◷</span><strong>Últimos resultados</strong></div><Link href={`/clubes/${teamCode}/partidos?view=results`}>Ver todos →</Link></header>
        <div className="club-matches-v42-list">
          {data.recent.length ? data.recent.map((m) => <CompactMatch key={m.id} match={m} teamCode={teamCode} />) : <p className="club-matches-v42-empty">Todavía no hay resultados.</p>}
        </div>
      </article>

      <article className="club-matches-v42-card">
        <header><div><span>▣</span><strong>Próximos partidos</strong></div><Link href={`/clubes/${teamCode}/partidos?view=calendar`}>Ver todos →</Link></header>
        <div className="club-matches-v42-upcoming-list">
          {nextFive.length ? nextFive.map((m) => {
            const rival = rivalFor(m, teamCode);
            return <Link href={`/partidos/${m.id}`} key={m.id}><time>{formatDate(m.date, true)}</time><Image src={getClubLogo(rival)} alt="" width={26} height={26}/><span><strong>{getClubName(rival)}</strong><small>{m.competitionName} · {roundLabel(m)}</small></span><b>{formatTime(m.date)}</b><em>{m.homeTeamCode === teamCode ? "⌂" : "↗"}</em></Link>;
          }) : <p className="club-matches-v42-empty">No hay partidos pendientes.</p>}
        </div>
      </article>
    </div>

    <section className="club-matches-v42-season-summary">
      <header><div><span>▥</span><strong>Resumen de la temporada {data.season?.name ?? ""}</strong></div></header>
      <div>
        <Stat value={data.stats.played} label="Partidos" />
        <Stat value={data.stats.won} label="Victorias" />
        <Stat value={data.stats.drawn} label="Empates" />
        <Stat value={data.stats.lost} label="Derrotas" />
        <Stat value={data.stats.goalsFor} label="Goles a favor" />
        <Stat value={data.stats.goalsAgainst} label="Goles en contra" />
        <Stat value={`${gd >= 0 ? "+" : ""}${gd}`} label="Diferencia de goles" />
        <Stat value={data.stats.points} label="Puntos" />
      </div>
    </section>
  </>;
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return <article><strong>{value}</strong><small>{label}</small></article>;
}

function CompactMatch({ match, teamCode }: { match: ClubMatchItem; teamCode: string }) {
  const rival = rivalFor(match, teamCode);
  const home = match.homeTeamCode === teamCode;
  const gf = home ? match.homeScore : match.awayScore;
  const ga = home ? match.awayScore : match.homeScore;
  const result = resultFor(match, teamCode);
  return <Link href={`/partidos/${match.id}`}><time>{formatDate(match.date, true)}</time><Image src={getClubLogo(rival)} alt="" width={26} height={26}/><span><strong>{getClubName(rival)}</strong><small>{match.competitionName} · {roundLabel(match)}</small></span><b>{gf} - {ga}</b><em className={`is-${result?.toLowerCase()}`}>{result}</em></Link>;
}

function MatchesTable({ teamCode, matches }: { teamCode: string; matches: ClubMatchItem[] }) {
  if (!matches.length) return <p className="club-matches-v42-empty">No hay partidos que coincidan con los filtros seleccionados.</p>;
  return <div className="club-matches-v42-table-wrap"><table><thead><tr><th>Fecha</th><th>Competición</th><th>Jornada / Ronda</th><th>Local</th><th>Resultado</th><th>Visitante</th><th>Estado</th><th>Ver</th></tr></thead><tbody>{matches.map((m) => <tr key={m.id}><td>{formatDate(m.date, true)}</td><td>{m.competitionName}</td><td>{roundLabel(m)}</td><td><TeamCell code={m.homeTeamCode}/></td><td className="club-matches-v42-score">{m.status === "PLAYED" ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : formatTime(m.date)}</td><td><TeamCell code={m.awayTeamCode}/></td><td><span className={`club-matches-v42-status is-${m.status === "PLAYED" ? "played" : "next"}`}>{m.status === "PLAYED" ? "Jugado" : "Próximo"}</span></td><td><Link className="club-matches-v42-open" href={`/partidos/${m.id}`}>▣</Link></td></tr>)}</tbody></table></div>;
}

function TeamCell({ code }: { code: string }) {
  return <span className="club-matches-v42-teamcell"><Image src={getClubLogo(code)} alt="" width={22} height={22}/><strong>{getClubName(code)}</strong></span>;
}
