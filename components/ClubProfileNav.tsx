"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["Vista general", "", "shield"],
  ["Plantilla", "plantilla", "players"],
  ["Estadísticas", "estadisticas", "stats"],
  ["Partidos", "partidos", "calendar"],
  ["Competiciones", "competiciones", "trophy"],
  ["Historial", "historial", "clock"],
  ["Récords", "records", "star"],
  ["Rendimiento", "rendimiento", "stats"],
] as const;

export default function ClubProfileNav({ teamCode }: { teamCode: string }) {
  const pathname = usePathname();
  const base = `/clubes/${teamCode}`;
  return (
    <nav className="club-v33-tabs" aria-label="Secciones del club">
      {TABS.map(([label, segment, icon]) => {
        const href = segment ? `${base}/${segment}` : base;
        const active = segment ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
        return (
          <Link key={segment || "overview"} href={href} className={active ? "is-active" : ""}>
            <TabIcon name={icon} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({ name }: { name: string }) {
  if (name === "players") return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 14c2.8-.2 5.3 1.3 6 4.5"/></svg>;
  if (name === "calendar") return <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v5M16 3v5M4 10h16"/></svg>;
  if (name === "clock") return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>;
  if (name === "stats") return <svg viewBox="0 0 24 24"><path d="M5 19V9M10 19V5M15 19v-7M20 19V3"/></svg>;
  if (name === "shield") return <svg viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.8-2.9 8-7 10-4.1-2-7-5.2-7-10V6l7-3Z"/><path d="m9.5 12 1.7 1.7 3.5-4"/></svg>;
  if (name === "star") return <svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3Z"/></svg>;
  return <svg viewBox="0 0 24 24"><path d="M8 4h8v4.5c0 3-1.7 5.5-4 5.5s-4-2.5-4-5.5V4ZM8 6H5v1.5c0 2 1.2 3.5 3.2 3.8M16 6h3v1.5c0 2-1.2 3.5-3.2 3.8M12 14v3M9 20h6M10 17h4"/></svg>;
}
