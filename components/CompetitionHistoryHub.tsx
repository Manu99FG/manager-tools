"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import type {
  CompetitionHistoryData,
  CompetitionHistoryEdition,
  CompetitionHistoryMatchRecord,
  HistoricalTeamRow,
} from "@/lib/competition-history";

type Player = CompetitionHistoryData["players"][number] & {
  displayName: string;
  photoUrl: string | null;
};

type HistoryData = Omit<CompetitionHistoryData, "players"> & {
  players: Player[];
};

type Tab = "palmares" | "clubs" | "players" | "records" | "stats";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "palmares", label: "Palmarés" },
  { key: "clubs", label: "Clasificación histórica" },
  { key: "players", label: "Récords individuales" },
  { key: "records", label: "Récords de equipos" },
  { key: "stats", label: "Estadísticas históricas" },
];

export default function CompetitionHistoryHub({
  data,
}: {
  data: HistoryData;
}) {
  const [tab, setTab] = useState<Tab>("palmares");
  const [editionFilter, setEditionFilter] = useState("ALL");

  const topScorers = useMemo(
    () =>
      [...data.players]
        .filter((row) => row.goals > 0)
        .sort((a, b) => b.goals - a.goals || a.minutes - b.minutes)
        .slice(0, 10),
    [data.players]
  );

  const topAppearances = useMemo(
    () =>
      [...data.players]
        .filter((row) => row.appearances > 0)
        .sort(
          (a, b) =>
            b.appearances - a.appearances ||
            b.minutes - a.minutes
        )
        .slice(0, 10),
    [data.players]
  );

  const topAssists = useMemo(
    () =>
      [...data.players]
        .filter((row) => row.assists > 0)
        .sort((a, b) => b.assists - a.assists || a.minutes - b.minutes)
        .slice(0, 10),
    [data.players]
  );

  const topMvp = useMemo(
    () =>
      [...data.players]
        .filter((row) => row.mom > 0)
        .sort((a, b) => b.mom - a.mom || a.minutes - b.minutes)
        .slice(0, 10),
    [data.players]
  );

  const titleLeaders = [...data.teams]
    .sort((a, b) => b.titles - a.titles || b.points - a.points)
    .slice(0, 10);

  const visibleEditions =
    editionFilter === "ALL"
      ? data.editions
      : data.editions.filter(
          (edition) => edition.competitionId === editionFilter
        );

  const averageGoals =
    data.totals.matches > 0
      ? data.totals.goals / data.totals.matches
      : 0;

  return (
    <div className="v315-history">
      <section className="v315-hero">
        <Image
          src="/competitions/hero-v31.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 1400px"
          className="v315-hero-image"
        />
        <div className="v315-hero-shade" />

        <div className="v315-hero-copy">
          <Link href="/competiciones" className="v315-breadcrumb">
            Competiciones <span>›</span> {data.series.name} <span>›</span> Historial
          </Link>
          <span className="v315-eyebrow">Historial global</span>
          <h1>{data.series.name}</h1>
          <p>
            Todas las ediciones, palmarés, clasificación histórica
            y récords individuales de esta competición.
          </p>
        </div>

        <div className="v315-kpis">
          <HeroKpi value={data.totals.editions} label="EDICIONES" icon="trophy" />
          <HeroKpi
            value={data.totals.completedEditions}
            label="FINALIZADAS"
            icon="flag"
          />
          <HeroKpi value={data.totals.matches} label="PARTIDOS" icon="ball" />
          <HeroKpi value={data.totals.goals} label="GOLES" icon="boots" />
        </div>
      </section>

      <nav className="v315-tabs">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => setTab(item.key)}
            className={tab === item.key ? "is-active" : ""}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "palmares" && (
        <>
          <section className="v315-panel">
            <div className="v315-panel-head">
              <div>
                <h2>Palmarés de la competición</h2>
                <p>Todas las ediciones de {data.series.name}.</p>
              </div>

              <select
                value={editionFilter}
                onChange={(event) => setEditionFilter(event.target.value)}
              >
                <option value="ALL">Todas las ediciones</option>
                {data.editions.map((edition) => (
                  <option
                    key={edition.competitionId}
                    value={edition.competitionId}
                  >
                    {edition.seasonName}
                  </option>
                ))}
              </select>
            </div>

            <EditionTable editions={visibleEditions} />
          </section>

          <div className="v315-two-grid">
            <TitleRanking rows={titleLeaders.slice(0, 8)} />
            <PlayerLeaderboard
              title="Máximos goleadores históricos"
              subtitle={`Jugadores con más goles en ${data.series.name}.`}
              rows={topScorers.slice(0, 5)}
              metric="goals"
              suffix="GOL"
            />
          </div>

          <div className="v315-two-grid">
            <PlayerLeaderboard
              title="Más presencias"
              subtitle="Jugadores con más partidos disputados."
              rows={topAppearances.slice(0, 5)}
              metric="appearances"
              suffix="PJ"
            />

            <div className="v315-record-stack">
              <MatchRecord
                title="Mayor goleada"
                match={data.records.biggestWin}
              />
              <div className="v315-mini-record-grid">
                <PlayerMiniRecord
                  title="Máximo goleador"
                  player={topScorers[0] ?? null}
                  value={
                    topScorers[0]
                      ? `${topScorers[0].goals} goles`
                      : "Sin datos"
                  }
                />
                <ClubMiniRecord
                  title="Club más laureado"
                  row={titleLeaders[0] ?? null}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "clubs" && (
        <section className="v315-panel">
          <div className="v315-panel-head">
            <div>
              <h2>Clasificación histórica</h2>
              <p>Acumulado de todas las ediciones vinculadas.</p>
            </div>
          </div>
          <HistoricalTable rows={data.teams} />
        </section>
      )}

      {tab === "players" && (
        <div className="v315-leader-grid">
          <PlayerLeaderboard
            title="Máximos goleadores"
            subtitle="Goles acumulados."
            rows={topScorers}
            metric="goals"
            suffix="GOL"
          />
          <PlayerLeaderboard
            title="Más asistencias"
            subtitle="Asistencias acumuladas."
            rows={topAssists}
            metric="assists"
            suffix="AST"
          />
          <PlayerLeaderboard
            title="Más MVP"
            subtitle="Premios al mejor del partido."
            rows={topMvp}
            metric="mom"
            suffix="MVP"
          />
          <PlayerLeaderboard
            title="Más presencias"
            subtitle="Partidos disputados."
            rows={topAppearances}
            metric="appearances"
            suffix="PJ"
          />
        </div>
      )}

      {tab === "records" && (
        <div className="v315-record-page">
          <MatchRecord
            title="Mayor goleada"
            match={data.records.biggestWin}
          />
          <MatchRecord
            title="Partido con más goles"
            match={data.records.highestScoringMatch}
          />
          <div className="v315-record-grid">
            <ClubMiniRecord
              title="Más títulos"
              row={titleLeaders[0] ?? null}
            />
            <ClubRecord
              title="Más victorias"
              row={[...data.teams].sort((a,b) => b.won - a.won)[0] ?? null}
              valueKey="won"
              suffix="victorias"
            />
            <ClubRecord
              title="Más goles"
              row={[...data.teams].sort((a,b) => b.goalsFor - a.goalsFor)[0] ?? null}
              valueKey="goalsFor"
              suffix="goles"
            />
            <ClubRecord
              title="Mejor diferencia"
              row={[...data.teams].sort((a,b) => b.goalDifference - a.goalDifference)[0] ?? null}
              valueKey="goalDifference"
              suffix="DG"
            />
          </div>
        </div>
      )}

      {tab === "stats" && (
        <>
          <section className="v315-stat-grid">
            <StatCard title="Ediciones" value={data.totals.editions} subtitle={`${data.totals.completedEditions} finalizadas`} />
            <StatCard title="Partidos" value={data.totals.matches} subtitle="partidos históricos" />
            <StatCard title="Goles" value={data.totals.goals} subtitle={`${averageGoals.toFixed(2)} por partido`} />
            <StatCard title="Clubes" value={data.teams.length} subtitle="equipos participantes" />
          </section>

          <div className="v315-two-grid">
            <TitleRanking rows={titleLeaders} />
            <PlayerLeaderboard
              title="Máximos goleadores históricos"
              subtitle="Goles acumulados."
              rows={topScorers}
              metric="goals"
              suffix="GOL"
            />
          </div>
        </>
      )}
    </div>
  );
}

function EditionTable({
  editions,
}: {
  editions: CompetitionHistoryEdition[];
}) {
  if (!editions.length) {
    return <div className="v315-empty">No hay ediciones disponibles.</div>;
  }

  return (
    <div className="v315-table-wrap">
      <div className="v315-edition-head">
        <span>Temporada</span>
        <span>Campeón</span>
        <span>Subcampeón</span>
        <span>Tercer clasificado</span>
        <span>Máximo goleador</span>
        <span />
      </div>

      {editions.map((edition) => (
        <div className="v315-edition-row" key={edition.competitionId}>
          <strong>{edition.seasonName}</strong>
          <TeamCell code={edition.championTeamCode} />
          <TeamCell code={edition.runnerUpTeamCode} />
          <TeamCell code={edition.thirdTeamCode} />

          <span className="v315-edition-scorer">
            {edition.topScorer ? (
              <>
                <Image
                  src={getClubLogo(edition.topScorer.teamCode)}
                  alt=""
                  width={23}
                  height={23}
                />
                <span>
                  <strong>{edition.topScorer.esmsName.replaceAll("_", " ")}</strong>
                  <em>{edition.topScorer.value}</em>
                </span>
              </>
            ) : (
              "—"
            )}
          </span>

          <Link href={`/competiciones/${edition.competitionId}`} className="v315-view">
            Ver
          </Link>
        </div>
      ))}
    </div>
  );
}

function HistoricalTable({ rows }: { rows: HistoricalTeamRow[] }) {
  return (
    <div className="v315-table-wrap">
      <div className="v315-history-head">
        <span>#</span><span>Club</span><span>ED</span><span>TIT</span>
        <span>2.º</span><span>3.º</span><span>PJ</span><span>G</span>
        <span>E</span><span>P</span><span>GF</span><span>GC</span>
        <span>DG</span><span>PTS</span>
      </div>

      {rows.map((row, index) => (
        <Link
          href={`/clubes/${row.teamCode}/historial`}
          className="v315-history-row"
          key={row.teamCode}
        >
          <strong>{index + 1}</strong>
          <span className="v315-history-club">
            <Image src={getClubLogo(row.teamCode)} alt="" width={27} height={27} />
            <strong>{getClubName(row.teamCode)}</strong>
          </span>
          <span>{row.editions}</span>
          <strong className="is-gold">{row.titles}</strong>
          <span>{row.runnerUp}</span><span>{row.thirdPlaces}</span>
          <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span>
          <span>{row.lost}</span><span>{row.goalsFor}</span><span>{row.goalsAgainst}</span>
          <span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
          <strong>{row.points}</strong>
        </Link>
      ))}
    </div>
  );
}

function TitleRanking({ rows }: { rows: HistoricalTeamRow[] }) {
  const max = Math.max(...rows.map((row) => row.titles), 1);

  return (
    <section className="v315-panel">
      <div className="v315-panel-head">
        <div>
          <h2>Títulos por club</h2>
          <p>Clubes con más títulos en la competición.</p>
        </div>
      </div>
      <div className="v315-bar-list">
        {rows.map((row, index) => (
          <Link href={`/clubes/${row.teamCode}/historial`} className="v315-bar-row" key={row.teamCode}>
            <span>{index + 1}</span>
            <Image src={getClubLogo(row.teamCode)} alt="" width={25} height={25} />
            <strong>{getClubName(row.teamCode)}</strong>
            <b>{row.titles}</b>
            <i><u style={{ width: `${(row.titles / max) * 100}%` }} /></i>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PlayerLeaderboard({
  title,
  subtitle,
  rows,
  metric,
  suffix,
}: {
  title: string;
  subtitle: string;
  rows: Player[];
  metric: "goals" | "assists" | "mom" | "appearances";
  suffix: string;
}) {
  const max = Math.max(...rows.map((row) => row[metric]), 1);

  return (
    <section className="v315-panel">
      <div className="v315-panel-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="v315-player-list">
        {rows.map((row, index) => (
          <Link
            href={row.playerId ? `/jugadores/${row.playerId}` : "/buscador"}
            className="v315-player-row"
            key={`${row.playerId ?? row.esmsName}-${metric}`}
          >
            <span className="v315-rank">{index + 1}</span>
            <span className="v315-photo">
              {row.photoUrl ? (
                <Image src={row.photoUrl} alt="" fill sizes="36px" className="object-cover" />
              ) : (
                <span>{row.displayName.slice(0,1).toUpperCase()}</span>
              )}
            </span>
            <span className="v315-player-name">
              <strong>{row.displayName}</strong>
              <small>{getClubName(row.teamCode)}</small>
            </span>
            <strong className="v315-player-value">{row[metric]}</strong>
            <span className="v315-progress"><i style={{ width: `${(row[metric] / max) * 100}%` }} /></span>
            <em>{suffix}</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MatchRecord({
  title,
  match,
}: {
  title: string;
  match: CompetitionHistoryMatchRecord | null;
}) {
  return (
    <section className="v315-panel v315-match-record">
      <div className="v315-panel-head">
        <div>
          <h2>{title}</h2>
          <p>{match?.seasonName ?? "Sin datos disponibles"}</p>
        </div>
      </div>

      {match ? (
        <Link href={`/partidos/${match.matchId}`} className="v315-match-record-body">
          <TeamBig code={match.homeTeamCode} />
          <strong>{match.homeScore} - {match.awayScore}</strong>
          <TeamBig code={match.awayTeamCode} />
        </Link>
      ) : (
        <div className="v315-empty">Sin datos todavía.</div>
      )}
    </section>
  );
}

function PlayerMiniRecord({
  title,
  player,
  value,
}: {
  title: string;
  player: Player | null;
  value: string;
}) {
  return (
    <div className="v315-mini-record">
      <small>{title}</small>
      {player ? (
        <Link href={player.playerId ? `/jugadores/${player.playerId}` : "/buscador"}>
          <span className="v315-mini-photo">
            {player.photoUrl ? (
              <Image src={player.photoUrl} alt="" fill sizes="42px" className="object-cover" />
            ) : (
              player.displayName.slice(0,1)
            )}
          </span>
          <span><strong>{player.displayName}</strong><em>{value}</em></span>
        </Link>
      ) : <strong>Sin datos</strong>}
    </div>
  );
}

function ClubMiniRecord({
  title,
  row,
}: {
  title: string;
  row: HistoricalTeamRow | null;
}) {
  return (
    <div className="v315-mini-record">
      <small>{title}</small>
      {row ? (
        <Link href={`/clubes/${row.teamCode}/historial`}>
          <Image src={getClubLogo(row.teamCode)} alt="" width={42} height={42} />
          <span><strong>{getClubName(row.teamCode)}</strong><em>{row.titles} títulos</em></span>
        </Link>
      ) : <strong>Sin datos</strong>}
    </div>
  );
}

function ClubRecord({
  title,
  row,
  valueKey,
  suffix,
}: {
  title: string;
  row: HistoricalTeamRow | null;
  valueKey: "won" | "goalsFor" | "goalDifference";
  suffix: string;
}) {
  return (
    <div className="v315-club-record">
      <small>{title}</small>
      {row ? (
        <>
          <Image src={getClubLogo(row.teamCode)} alt="" width={54} height={54} />
          <strong>{getClubName(row.teamCode)}</strong>
          <em>
            {valueKey === "goalDifference" && row[valueKey] > 0 ? "+" : ""}
            {row[valueKey]} {suffix}
          </em>
        </>
      ) : <strong>Sin datos</strong>}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle: string;
}) {
  return (
    <div className="v315-stat-card">
      <small>{title}</small>
      <strong>{value.toLocaleString("es-ES")}</strong>
      <em>{subtitle}</em>
    </div>
  );
}

function TeamCell({ code }: { code: string | null }) {
  if (!code) return <span className="v315-muted">—</span>;

  return (
    <span className="v315-team-cell">
      <Image src={getClubLogo(code)} alt="" width={24} height={24} />
      <strong>{getClubName(code)}</strong>
    </span>
  );
}

function TeamBig({ code }: { code: string }) {
  return (
    <span className="v315-team-big">
      <Image src={getClubLogo(code)} alt="" width={52} height={52} />
      <strong>{getClubName(code)}</strong>
    </span>
  );
}

function HeroKpi({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: "trophy" | "flag" | "ball" | "boots";
}) {
  return (
    <div className="v315-kpi">
      <span className="v315-kpi-icon">
        {icon === "trophy" ? <TrophyIcon /> : icon === "flag" ? <FlagIcon /> : icon === "ball" ? <BallIcon /> : <BootsIcon />}
      </span>
      <strong>{value.toLocaleString("es-ES")}</strong>
      <small>{label}</small>
    </div>
  );
}

function TrophyIcon(){return <svg viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></svg>}
function FlagIcon(){return <svg viewBox="0 0 24 24"><path d="M5 21V4M5 5h11l-2 3 2 3H5"/></svg>}
function BallIcon(){return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m9.5 9 2.5-2 2.5 2-.8 3h-3.4L9.5 9ZM7 15l3.3-3M17 15l-3.3-3"/></svg>}
function BootsIcon(){return <svg viewBox="0 0 24 24"><path d="M5 5v8c0 3 2 5 5 5h4M12 6v6c0 3 2 5 5 5h2M5 11l5 1M12 10l5 1"/></svg>}
