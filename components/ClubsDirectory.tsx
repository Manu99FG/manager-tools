"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type ClubDirectoryItem = {
  code: string;
  name: string;
  logo: string;
  country: string;
  competitions: string[];
};

type Props = {
  clubs: ClubDirectoryItem[];
};

export default function ClubsDirectory({ clubs }: Props) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("ALL");
  const [competition, setCompetition] = useState("ALL");
  const [sort, setSort] = useState("name-asc");
  const [view, setView] = useState<"grid" | "list">("grid");

  const countries = useMemo(
    () => Array.from(new Set(clubs.map((club) => club.country))).sort((a, b) => a.localeCompare(b, "es")),
    [clubs],
  );

  const competitions = useMemo(
    () => Array.from(new Set(clubs.flatMap((club) => club.competitions))).sort((a, b) => a.localeCompare(b, "es")),
    [clubs],
  );

  const visibleClubs = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const filtered = clubs.filter((club) => {
      const matchesQuery = !normalized || `${club.name} ${club.code}`.toLocaleLowerCase("es").includes(normalized);
      const matchesCountry = country === "ALL" || club.country === country;
      const matchesCompetition = competition === "ALL" || club.competitions.includes(competition);
      return matchesQuery && matchesCountry && matchesCompetition;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name-desc") return b.name.localeCompare(a.name, "es");
      if (sort === "code-asc") return a.code.localeCompare(b.code, "es");
      return a.name.localeCompare(b.name, "es");
    });
  }, [clubs, query, country, competition, sort]);

  const countryCount = countries.length;

  return (
    <main className="clubs-v32-page">
      <section className="clubs-v32-hero">
        <div className="clubs-v32-hero-copy">
          <div className="clubs-v32-eyebrow">Base histórica</div>
          <h1>Clubes</h1>
          <p>Descubre todos los clubes de la Liga de Leyendas.<br />Accede a su historial completo, plantillas, títulos y récords.</p>
        </div>
        <div className="clubs-v32-hero-legend" aria-hidden="true">
          <span>Más que clubes,</span>
          <strong>leyendas.</strong>
        </div>
        <Image
          src="/branding/llv-emblem.png"
          alt=""
          width={190}
          height={190}
          className="clubs-v32-hero-emblem"
          priority
        />
      </section>

      <section className="clubs-v32-stats" aria-label="Resumen de clubes">
        <Metric icon={<UsersIcon />} value={String(clubs.length)} label="Clubes" />
        <Metric icon={<GlobeIcon />} value={String(countryCount)} label="Países" />
        <Metric icon={<TrophyIcon />} value={String(competitions.length || "—")} label="Competiciones" />
        <Metric icon={<StarIcon />} value="Una sola" label="Leyenda" />
      </section>

      <section className="clubs-v32-toolbar">
        <label className="clubs-v32-search">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar un club..."
            aria-label="Buscar un club"
          />
        </label>

        <select value={country} onChange={(event) => setCountry(event.target.value)} aria-label="Filtrar por país">
          <option value="ALL">País</option>
          {countries.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>

        <select value={competition} onChange={(event) => setCompetition(event.target.value)} aria-label="Filtrar por competición">
          <option value="ALL">Competición</option>
          {competitions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>

        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar clubes">
          <option value="name-asc">Nombre A–Z</option>
          <option value="name-desc">Nombre Z–A</option>
          <option value="code-asc">Código</option>
        </select>

        <div className="clubs-v32-view-toggle" aria-label="Cambiar vista">
          <button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Vista en cuadrícula">
            <GridIcon />
          </button>
          <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="Vista en lista">
            <ListIcon />
          </button>
        </div>
      </section>

      <div className="clubs-v32-result-count">
        <strong>{visibleClubs.length}</strong> {visibleClubs.length === 1 ? "club" : "clubes"}
      </div>

      {visibleClubs.length ? (
        <section className={view === "grid" ? "clubs-v32-grid" : "clubs-v32-list"}>
          {visibleClubs.map((club) => (
            <Link key={club.code} href={`/clubes/${club.code}`} className="clubs-v32-card">
              <div className="clubs-v32-card-watermark" aria-hidden="true">
                <Image src={club.logo} alt="" fill sizes="220px" className="object-contain" />
              </div>
              <div className="clubs-v32-logo-wrap">
                <Image src={club.logo} alt={`Escudo de ${club.name}`} width={76} height={76} className="clubs-v32-logo" />
              </div>
              <div className="clubs-v32-card-copy">
                <h2>{club.name}</h2>
                <span>{club.code}</span>
              </div>
              <span className="clubs-v32-history-button">Ver club <span>→</span></span>
            </Link>
          ))}
        </section>
      ) : (
        <section className="clubs-v32-empty">
          <div className="clubs-v32-empty-icon"><SearchIcon /></div>
          <h2>No hemos encontrado clubes</h2>
          <p>Prueba con otro nombre o cambia los filtros seleccionados.</p>
          <button type="button" onClick={() => { setQuery(""); setCountry("ALL"); setCompetition("ALL"); }}>Limpiar filtros</button>
        </section>
      )}
    </main>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <article className="clubs-v32-metric"><span className="clubs-v32-metric-icon">{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function GridIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" fill="currentColor"/></svg>; }
function ListIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h11M8 12h11M8 18h11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="5" cy="6" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="18" r="1.2" fill="currentColor"/></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6"/><circle cx="17" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 14c2.8-.2 5.3 1.3 6 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>; }
function GlobeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M4 12h16M12 4c2.3 2.2 3.4 4.9 3.4 8S14.3 17.8 12 20c-2.3-2.2-3.4-4.9-3.4-8S9.7 6.2 12 4Z" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function TrophyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4.5c0 3-1.7 5.5-4 5.5s-4-2.5-4-5.5V4ZM8 6H5v1.5c0 2 1.2 3.5 3.2 3.8M16 6h3v1.5c0 2-1.2 3.5-3.2 3.8M12 14v3M9 20h6M10 17h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function StarIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3Z" fill="currentColor"/></svg>; }
