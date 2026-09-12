"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import type { HomeDashboardData } from "@/lib/home-dashboard";

const POSITIONS = ["GK", "DF", "DM", "MF", "AM", "FW"];

export default function HomeDashboard({ data }: { data: HomeDashboardData }) {
  const defaultCompetition =
    data.competitions.find((competition) => competition.status === "ACTIVE") ??
    data.competitions[0] ??
    null;

  const leagueDefault =
    data.competitions.find(
      (competition) =>
        competition.status === "ACTIVE" && competition.type === "LEAGUE"
    ) ??
    data.competitions.find((competition) => competition.type === "LEAGUE") ??
    defaultCompetition;

  const [resultsCompetitionId, setResultsCompetitionId] = useState(
    defaultCompetition?.id ?? ""
  );
  const [standingsCompetitionId, setStandingsCompetitionId] = useState(
    leagueDefault?.id ?? ""
  );
  const [playersCompetitionId, setPlayersCompetitionId] = useState(
    defaultCompetition?.id ?? ""
  );
  const [position, setPosition] = useState("FW");

  const resultData = data.byCompetition[resultsCompetitionId];
  const standingData = data.byCompetition[standingsCompetitionId];
  const playerData = data.byCompetition[playersCompetitionId];

  const leagueOptions = useMemo(
    () => data.competitions.filter((competition) => competition.type === "LEAGUE"),
    [data.competitions]
  );

  const featured = playerData?.featuredByPosition[position] ?? [];

  return (
    <div className="home-dashboard home-dashboard-real">
      <section className="home-hero">
        <div className="home-hero-glow" />
        <div className="home-hero-copy">
          <div className="home-hero-kicker">Liga de Leyendas</div>
          <h1>
            MANAGER <span>TOOLS</span>
          </h1>
          <h2>La base de datos oficial de la Liga de Leyendas</h2>
          <p>Clubes · Jugadores · Competiciones · Historia · Estadísticas · Y mucho más</p>
          <Link href="/plantillas" className="home-primary-button">
            Explorar la base de datos <span>→</span>
          </Link>
        </div>
        <div className="home-hero-logo home-hero-logo-transparent">
          <Image
            src="/branding/liga-leyendas-logo-oficial-v308.png"
            alt="Liga de Leyendas"
            fill
            sizes="330px"
            className="object-contain"
            priority
          />
        </div>
      </section>

      <section className="home-stat-grid">
        <StatCard icon="clubs" value={data.totals.clubs.toLocaleString("es-ES")} label="Clubes" detail="En la base de datos" href="/plantillas" />
        <StatCard icon="players" value={data.totals.players.toLocaleString("es-ES")} label="Jugadores" detail="Datos actualizados" href="/buscador" />
        <StatCard icon="trophy" value={data.totals.competitions.toLocaleString("es-ES")} label="Competiciones" detail="Todas las ediciones" href="/competiciones" />
        <StatCard icon="market" value={data.totals.movements.toLocaleString("es-ES")} label="Movimientos" detail="Historial de mercado" href="/mercado" />
      </section>

      <section className="home-three-grid home-live-grid">
        <Panel title="Últimos fichajes" href="/mercado">
          <div className="home-list">
            {data.latestTransfers.length ? data.latestTransfers.map((transfer) => (
              <Link href={`/jugadores/${transfer.playerId}`} key={transfer.id} className="home-transfer-row">
                <span className="home-transfer-avatar">
                  {transfer.photoUrl ? (
                    <Image
                      src={transfer.photoUrl}
                      alt={transfer.playerName.replaceAll("_", " ")}
                      fill
                      sizes="38px"
                      className="home-transfer-avatar-image"
                    />
                  ) : (
                    <span>{transfer.playerName.slice(0, 1).toUpperCase()}</span>
                  )}
                </span>
                <div className="home-transfer-main">
                  <strong>{transfer.playerName.replaceAll("_", " ")}</strong>
                  <small>
                    {transfer.movementType === "LOAN" ? "CESIÓN" : transfer.movementType === "LOAN_RETURN" ? "FIN CESIÓN" : "FICHAJE"}
                    {transfer.fromTeamCode ? ` · ${transfer.fromTeamCode}` : ""}
                  </small>
                </div>
                <div className="home-transfer-club">
                  {transfer.toTeamCode ? (
                    <>
                      <Image src={getClubLogo(transfer.toTeamCode)} alt="" width={24} height={24} className="home-small-club-logo" />
                      <span>{getClubName(transfer.toTeamCode)}</span>
                    </>
                  ) : <span>—</span>}
                </div>
                <span className="home-list-arrow">→</span>
              </Link>
            )) : <Empty text="Todavía no hay movimientos registrados." />}
          </div>
        </Panel>

        <Panel title="Competiciones" href="/competiciones">
          <div className="home-list">
            {data.competitions.slice(0, 5).map((competition) => (
              <Link href={`/competiciones/${competition.id}`} key={competition.id} className="home-competition-row">
                <span className="home-mini-badge"><HomeIcon name="trophy" /></span>
                <div>
                  <strong>{competition.name}</strong>
                  <small>{competition.seasonName ?? "Temporada"} · {competition.status === "ACTIVE" ? "En curso" : competition.status === "FINISHED" ? "Finalizada" : "Preparación"}</small>
                </div>
                <span className="home-list-arrow">→</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          title="Últimos resultados"
          href={resultsCompetitionId ? `/competiciones/${resultsCompetitionId}` : "/competiciones"}
          selector={
            <CompetitionSelect
              value={resultsCompetitionId}
              onChange={setResultsCompetitionId}
              options={data.competitions}
            />
          }
        >
          <div className="home-results-list">
            {resultData?.results.length ? resultData.results.map((match) => (
              <Link href={`/partidos/${match.id}`} key={match.id} className="home-result-row">
                <span className="home-result-team home-result-team-home">
                  <span>{getClubName(match.homeTeamCode)}</span>
                  <Image src={getClubLogo(match.homeTeamCode)} alt="" width={25} height={25} />
                </span>
                <strong className="home-result-score">{match.homeScore} - {match.awayScore}</strong>
                <span className="home-result-team">
                  <Image src={getClubLogo(match.awayTeamCode)} alt="" width={25} height={25} />
                  <span>{getClubName(match.awayTeamCode)}</span>
                </span>
              </Link>
            )) : <Empty text="No hay resultados en esta competición." />}
          </div>
        </Panel>
      </section>

      <section className="home-two-grid home-data-grid">
        <Panel
          title="Clasificación"
          href={standingsCompetitionId ? `/competiciones/${standingsCompetitionId}` : "/competiciones"}
          selector={
            <CompetitionSelect
              value={standingsCompetitionId}
              onChange={setStandingsCompetitionId}
              options={leagueOptions}
            />
          }
        >
          <div className="home-standing-table">
            <div className="home-standing-head">
              <span>#</span><span>Club</span><span>J</span><span>G</span><span>E</span><span>P</span><span>DG</span><span>Pts</span>
            </div>
            {standingData?.standings.length ? standingData.standings.map((row) => (
              <Link href={`/clubes/${row.teamCode}/historial`} key={row.teamCode} className="home-standing-row">
                <span className={`home-position home-position-${row.position}`}>{row.position}</span>
                <span className="home-standing-club">
                  <Image src={getClubLogo(row.teamCode)} alt="" width={22} height={22} />
                  <strong>{getClubName(row.teamCode)}</strong>
                </span>
                <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span>
                <span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
                <strong>{row.points}</strong>
              </Link>
            )) : <Empty text="Esta competición no tiene clasificación disponible." />}
          </div>
        </Panel>

        <Panel
          title="Jugadores destacados"
          href={playersCompetitionId ? `/competiciones/${playersCompetitionId}` : "/competiciones"}
          selector={
            <CompetitionSelect
              value={playersCompetitionId}
              onChange={setPlayersCompetitionId}
              options={data.competitions}
            />
          }
        >
          <div className="home-position-tabs">
            {POSITIONS.map((item) => (
              <button
                type="button"
                key={item}
                className={position === item ? "is-active" : ""}
                onClick={() => setPosition(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="home-featured-players">
            {featured.length ? featured.map((player, index) => (
              <Link
                href={player.playerId ? `/jugadores/${player.playerId}` : "/buscador"}
                key={`${player.playerId ?? player.esmsName}-${player.position}`}
                className="home-featured-player"
              >
                <span className="home-featured-rank">{index + 1}</span>
                <span className="home-featured-photo">
                  {player.photoUrl ? (
                    <Image src={player.photoUrl} alt="" fill sizes="38px" className="object-cover" />
                  ) : (
                    <span>{player.displayName.slice(0,1).toUpperCase()}</span>
                  )}
                </span>
                <Image src={getClubLogo(player.teamCode)} alt="" width={20} height={20} className="home-featured-club" />
                <span className="home-featured-name">
                  <strong>{player.displayName}</strong>
                  <small>{getClubName(player.teamCode)} · {player.appearances} PJ</small>
                </span>
                <span className="home-featured-value">
                  <strong>{position === "GK" ? player.saves : position === "DF" || position === "DM" ? player.tackles : player.goals}</strong>
                  <small>{position === "GK" ? "SAV" : position === "DF" || position === "DM" ? "KTK" : "GOL"}</small>
                </span>
              </Link>
            )) : <Empty text={`No hay datos suficientes para ${position}.`} />}
          </div>
        </Panel>
      </section>

      <section className="home-feature-grid home-feature-grid-final">
        <ExactFeatureCard
          href="/plantillas"
          src="/home/explorar-clubes-v306.png"
          alt="Explorar clubes · Consulta todas las plantillas"
        />
        <ExactFeatureCard
          href="/buscador"
          src="/home/buscar-jugadores-v306.png"
          alt="Buscar jugadores · Encuentra y analiza talentos"
        />
        <ExactFeatureCard
          href="/historia"
          src="/home/historial-v306.png"
          alt="Historial · Revive la historia de la liga"
        />
        <ExactFeatureCard
          href="/records"
          src="/home/estadisticas-v306.png"
          alt="Estadísticas · Datos, récords y comparativas"
        />
      </section>

      <footer className="home-footer">
        <div>
          <strong>© 2026 Liga de Leyendas · Manager Tools</strong>
          <small>Base de datos oficial de la comunidad</small>
        </div>
        <span>Hecho por y para managers ♥</span>
      </footer>
    </div>
  );
}

function Panel({
  title,
  href,
  selector,
  children,
}: {
  title: string;
  href: string;
  selector?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="home-panel">
      <div className="home-panel-head">
        <h2>{title}</h2>
        <div className="home-panel-actions">
          {selector}
          <Link href={href}>Ver todos →</Link>
        </div>
      </div>
      {children}
    </section>
  );
}

function CompetitionSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <select
      className="home-competition-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Elegir competición"
    >
      {options.map((competition) => (
        <option key={competition.id} value={competition.id}>{competition.name}</option>
      ))}
    </select>
  );
}

function StatCard({ icon, value, label, detail, href }: { icon: string; value: string; label: string; detail: string; href: string }) {
  return (
    <Link href={href} className="home-stat-card">
      <span className="home-stat-icon"><HomeIcon name={icon} /></span>
      <div><strong>{value}</strong><h3>{label}</h3><p>{detail}</p></div>
      <span className="home-stat-arrow">→</span>
    </Link>
  );
}

function ExactFeatureCard({
  href,
  src,
  alt,
}: {
  href: string;
  src: string;
  alt: string;
}) {
  return (
    <Link href={href} className="home-exact-feature-card" aria-label={alt}>
      <Image
        src={src}
        alt={alt}
        width={2164}
        height={727}
        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw"
        className="home-exact-feature-image"
      />
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="home-empty">{text}</div>;
}

function HomeIcon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "players") return <svg viewBox="0 0 24 24"><circle {...p} cx="12" cy="8" r="3" /><path {...p} d="M5.5 19c.7-4 3-6 6.5-6s5.8 2 6.5 6" /></svg>;
  if (name === "trophy") return <svg viewBox="0 0 24 24"><path {...p} d="M8 4h8v4.5c0 3-1.7 5.5-4 5.5s-4-2.5-4-5.5V4Z" /><path {...p} d="M8 6H5v1.5c0 2 1.2 3.5 3.2 3.8M16 6h3v1.5c0 2-1.2 3.5-3.2 3.8M12 14v3M9 20h6" /></svg>;
  if (name === "market") return <svg viewBox="0 0 24 24"><path {...p} d="M5 8h13M15 5l3 3-3 3M19 16H6M9 13l-3 3 3 3" /></svg>;
  if (name === "stats") return <svg viewBox="0 0 24 24"><path {...p} d="M5 19V9M10 19V5M15 19v-7M20 19V8" /></svg>;
  return <svg viewBox="0 0 24 24"><path {...p} d="M7 5h10l1.5 4L12 19 5.5 9 7 5Z" /><path {...p} d="M8 9h8M12 5.5V16" /></svg>;
}
