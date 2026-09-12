import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import ClubProfileNav from "@/components/ClubProfileNav";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import type { ClubOverviewData } from "@/lib/club-overview";

const CLUB_COUNTRIES: Record<string, string> = {
  AJA: "Países Bajos", PSV: "Países Bajos", ARS: "Inglaterra", CHE: "Inglaterra", LIV: "Inglaterra", MCI: "Inglaterra", MUN: "Inglaterra", TOT: "Inglaterra",
  ATM: "España", CEL: "España", DEP: "España", FCB: "España", RMA: "España", VAL: "España", BDO: "Alemania", BLE: "Alemania", BMU: "Alemania",
  BOC: "Argentina", IND: "Argentina", RIV: "Argentina", FLA: "Brasil", SAN: "Brasil", INT: "Italia", JUV: "Italia", MIL: "Italia", NAP: "Italia", PAR: "Italia", ROM: "Italia",
  MAR: "Francia", PSG: "Francia", OPO: "Portugal", SLB: "Portugal",
};

export default function ClubProfileShell({ teamCode, data, children }: { teamCode: string; data: ClubOverviewData; children: ReactNode }) {
  const clubName = getClubName(teamCode);
  const logo = getClubLogo(teamCode);
  const country = CLUB_COUNTRIES[teamCode] ?? "Liga de Leyendas";
  return (
    <main className="club-v33-page">
      <nav className="club-v33-breadcrumb"><Link href="/">Inicio</Link><span>›</span><Link href="/clubes">Clubes</Link><span>›</span><strong>{clubName}</strong></nav>
      <section className="club-v33-hero">
        <div className="club-v33-hero-mark" aria-hidden="true"><Image src={logo} alt="" fill sizes="360px" className="object-contain" /></div>
        <div className="club-v33-hero-identity">
          <div className="club-v33-hero-logo"><Image src={logo} alt={`Escudo de ${clubName}`} width={110} height={110} priority /></div>
          <div><h1>{clubName}</h1><p><strong>{teamCode}</strong><span>•</span>{country}{data.clubClass ? <><span>•</span><em className="club-v33-class-badge">{data.clubClass}</em></> : null}</p><small>{data.season ? `Temporada ${data.season.name}` : "Base histórica de la Liga de Leyendas"}</small></div>
        </div>
        <div className="club-v33-hero-motto"><span>Más que un club,</span><strong>una leyenda.</strong></div>
      </section>
      <ClubProfileNav teamCode={teamCode} />
      <section className="club-v33-metrics">
        <Metric icon="players" value={String(data.roster.players)} label="Jugadores" />
        <Metric icon="age" value={data.roster.averageAge === null ? "—" : data.roster.averageAge.toFixed(1).replace(".", ",")} label="Edad media" />
        <Metric icon="globe" value={String(data.roster.nationalities)} label="Nacionalidades" />
        <Metric icon="trophy" value={String(data.titles)} label="Títulos" />
      </section>
      {children}
    </main>
  );
}

function Metric({ icon, value, label }: { icon: string; value: string; label: string }) {
  return <article className="club-v33-metric"><span><MetricIcon name={icon} /></span><div><strong>{value}</strong><small>{label}</small></div></article>;
}
function MetricIcon({ name }: { name: string }) {
  if (name === "players") return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 14c2.8-.2 5.3 1.3 6 4.5"/></svg>;
  if (name === "globe") return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.3 2.3 3.5 5 3.5 8S14.3 17.7 12 20c-2.3-2.3-3.5-5-3.5-8S9.7 6.3 12 4Z"/></svg>;
  if (name === "age") return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21c.7-5 3.1-7.5 7-7.5s6.3 2.5 7 7.5"/></svg>;
  return <svg viewBox="0 0 24 24"><path d="M8 4h8v4.5c0 3-1.7 5.5-4 5.5s-4-2.5-4-5.5V4ZM8 6H5v1.5c0 2 1.2 3.5 3.2 3.8M16 6h3v1.5c0 2-1.2 3.5-3.2 3.8M12 14v3M9 20h6M10 17h4"/></svg>;
}
