"use client";

import Image from "next/image";
import { FormatMark } from "@/components/CompetitionFormatView";
import { COMPETITION_FORMAT } from "@/lib/competition-format";
import Link from "next/link";
import { useMemo, useState } from "react";

type CompetitionItem = {
  id: string;
  name: string;
  type: "LEAGUE" | "CUP" | "GROUPS" | "GROUPS_KNOCKOUT" | "SUPERCUP";
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  seasonId: string;
  seasonName: string;
  seasonStartsAt: string | null;
  seasonEndsAt: string | null;
  teamCount: number;
  roundCount: number;
  matchCount: number;
};

type SeasonOption = {
  id: string;
  name: string;
  isActive: boolean;
};

const TYPE_LABEL = {
  LEAGUE: "LIGA",
  CUP: "ELIMINATORIAS",
  GROUPS: "GRUPOS",
  GROUPS_KNOCKOUT: "GRUPOS + ELIMINATORIAS",
  SUPERCUP: "SUPERCOPA",
} as const;

const STATUS_LABEL = {
  DRAFT: "PREPARACIÓN",
  ACTIVE: "EN CURSO",
  FINISHED: "FINALIZADA",
} as const;

function imageFor(type: CompetitionItem["type"]) {
  if (type === "LEAGUE") return "/competitions/league-v31.jpg";
  if (type === "SUPERCUP") return "/competitions/supercup-v31.jpg";
  return "/competitions/cup-v31.jpg";
}

function formatMonth(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export default function CompetitionsHub({
  competitions,
  seasons,
}: {
  competitions: CompetitionItem[];
  seasons: SeasonOption[];
}) {
  const activeSeason =
    seasons.find((season) => season.isActive) ?? seasons[0] ?? null;

  const [seasonId, setSeasonId] = useState(activeSeason?.id ?? "ALL");
  const [view, setView] = useState<"SEASON" | "ALL">("SEASON");

  const visible = useMemo(() => {
    if (view === "ALL" || seasonId === "ALL") return competitions;
    return competitions.filter((competition) => competition.seasonId === seasonId);
  }, [competitions, seasonId, view]);

  const activeCount = competitions.filter((c) => c.status === "ACTIVE").length;
  const finishedCount = competitions.filter((c) => c.status === "FINISHED").length;

  return (
    <div className="v31-competitions">
      <section className="v31-hero">
        <Image
          src="/competitions/hero-v31.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 1400px"
          className="v31-hero-image"
        />
        <div className="v31-hero-wash" />

        <div className="v31-hero-copy">
          <span className="v31-eyebrow">CENTRO DE COMPETICIÓN</span>
          <h1>Competiciones</h1>
          <p>
            Consulta temporadas, competiciones, clasificaciones, jornadas,
            resultados y rankings desde un mismo lugar.
          </p>
        </div>

        <div className="v31-stats">
          <HeroStat icon="trophy" value={competitions.length} label="TOTALES" />
          <HeroStat icon="sync" value={activeCount} label="EN CURSO" />
          <HeroStat icon="flag" value={finishedCount} label="FINALIZADAS" />
        </div>
      </section>

      <section className="v31-toolbar">
        <div className="v31-tabs">
          <button
            type="button"
            className={view === "SEASON" ? "is-active" : ""}
            onClick={() => setView("SEASON")}
          >
            Temporadas
          </button>
          <button
            type="button"
            className={view === "ALL" ? "is-active" : ""}
            onClick={() => setView("ALL")}
          >
            Todas las competiciones
          </button>
        </div>

        <label className="v31-season-select">
          <CalendarIcon />
          <select
            value={seasonId}
            onChange={(event) => {
              setSeasonId(event.target.value);
              setView(event.target.value === "ALL" ? "ALL" : "SEASON");
            }}
          >
            {activeSeason && (
              <option value={activeSeason.id}>
                Temporada actual · {activeSeason.name}
              </option>
            )}
            {seasons
              .filter((season) => season.id !== activeSeason?.id)
              .map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            <option value="ALL">Todas las temporadas</option>
          </select>
        </label>
      </section>

      {visible.length === 0 ? (
        <div className="v31-empty">No hay competiciones en esta temporada.</div>
      ) : (
        <section className="v31-card-grid">
          {visible.map((competition) => (
            <article className={`v31-card competition-card-${competition.type.toLowerCase()}`} key={competition.id}>
              <div className="v31-card-image">
                <Image
                  src={imageFor(competition.type)}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 33vw"
                  className="v31-card-photo"
                />
                <div className="v31-card-image-shade" />
                <span className="v31-type">{TYPE_LABEL[competition.type]}</span>
                <span className={`v31-status v31-status-${competition.status.toLowerCase()}`}>
                  {STATUS_LABEL[competition.status]}
                </span>
              </div>

              <div className="v31-card-body">
                <div className="competition-card-format"><FormatMark type={competition.type}/><span>{COMPETITION_FORMAT[competition.type].label}</span></div>
                <h2>{competition.name}</h2>
                <p>
                  {COMPETITION_FORMAT[competition.type].description}
                </p>

                <div className="v31-card-meta">
                  <MiniStat
                    value={competition.teamCount}
                    label="EQUIPOS"
                  />
                  <MiniStat
                    value={
                      competition.type === "SUPERCUP"
                        ? competition.matchCount
                        : competition.roundCount
                    }
                    label={
                      (competition.type === "LEAGUE" || competition.type === "GROUPS")
                        ? "JORNADAS"
                        : competition.type === "SUPERCUP"
                          ? "PARTIDO"
                          : "RONDAS"
                    }
                  />
                  <div className="v31-date">
                    <CalendarIcon />
                    <span>
                      {formatMonth(competition.seasonStartsAt) ?? competition.seasonName}
                      {competition.seasonEndsAt && (
                        <>
                          <br />– {formatMonth(competition.seasonEndsAt)}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <Link href={`/competiciones/${competition.id}`} className="v31-open">
                  Ver competición <span>→</span>
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="v31-bottom-banner">
        <Image
          src="/competitions/banner-v31.jpg"
          alt=""
          fill
          sizes="100vw"
          className="v31-bottom-image"
        />
        <div className="v31-bottom-wash" />
        <strong>“MÁS QUE UNA LIGA,<br />UNA COMUNIDAD DE LEYENDAS”</strong>
        <span>ESTRATEGIA · COMPETICIÓN · HISTORIA · LEYENDA</span>
      </section>
    </div>
  );
}

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: "trophy" | "sync" | "flag";
  value: number;
  label: string;
}) {
  return (
    <div className="v31-hero-stat">
      <span className="v31-hero-stat-icon">
        {icon === "trophy" ? <TrophyIcon /> : icon === "sync" ? <SyncIcon /> : <FlagIcon />}
      </span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="v31-mini-stat">
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function TrophyIcon() {
  return <svg viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></svg>;
}
function SyncIcon() {
  return <svg viewBox="0 0 24 24"><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8.5A7 7 0 0 1 18.5 7M5.5 17A7 7 0 0 0 18 15.5"/></svg>;
}
function FlagIcon() {
  return <svg viewBox="0 0 24 24"><path d="M5 21V4M5 5h11l-2 3 2 3H5"/></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24"><path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="M8 12h3M13 12h3M8 16h3"/></svg>;
}
