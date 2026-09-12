"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = {
  href: string;
  label: string;
  icon: string;
};

const items: Item[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/clubes", label: "Clubes", icon: "clubs" },
  { href: "/buscador", label: "Jugadores", icon: "players" },
  { href: "/competiciones", label: "Competiciones", icon: "trophy" },
  { href: "/mercado", label: "Mercado", icon: "market" },
  { href: "/historia", label: "Historia", icon: "history" },
  { href: "/premios", label: "Premios", icon: "award" },
  { href: "/records", label: "Estadísticas", icon: "stats" },
  { href: "/alineaciones", label: "Alineaciones", icon: "tools" },
];

const secondary: Item[] = [
  { href: "/temporadas", label: "Temporadas", icon: "calendar" },
  { href: "/votaciones", label: "Votaciones", icon: "vote" },
  { href: "/admin", label: "Administración", icon: "admin" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const active = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="mt-topbar">
        <Link href="/" className="mt-mobile-brand">
          <Image
            src="/branding/liga-leyendas-logo-oficial-v308.png"
            alt="Liga de Leyendas"
            width={44}
            height={44}
            className="mt-mobile-logo"
            priority
          />
          <span>
            <strong>Manager Tools</strong>
            <small>Liga de Leyendas</small>
          </span>
        </Link>

        <Link href="/buscador" className="mt-global-search">
          <SearchIcon />
          <span>Buscar jugador, club, competición...</span>
        </Link>

        <div className="mt-top-actions">
          <span className="mt-top-dot">●</span>
          <Link href="/admin" className="mt-profile">
            <span className="mt-avatar">MT</span>
            <span className="mt-profile-copy">
              <strong>Manager Tools</strong>
              <small>Administración</small>
            </span>
          </Link>

          <button
            type="button"
            className="mt-menu-button"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      <aside className={mobileOpen ? "mt-sidebar is-open" : "mt-sidebar"}>
        <Link href="/" className="mt-side-brand">
          <Image
            src="/branding/liga-leyendas-logo-oficial-v308.png"
            alt="Liga de Leyendas"
            width={66}
            height={66}
            className="mt-side-logo"
            priority
          />
          <span className="mt-side-brand-copy">
            <strong>Manager Tools</strong>
            <small>Liga de Leyendas</small>
          </span>
        </Link>

        <nav className="mt-side-nav">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={active(item.href) ? "mt-side-link is-active" : "mt-side-link"}
            >
              <span className="mt-side-icon">
                <NavIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-side-divider" />

        <nav className="mt-side-nav mt-side-nav-secondary">
          {secondary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={active(item.href) ? "mt-side-link is-active" : "mt-side-link"}
            >
              <span className="mt-side-icon">
                <NavIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-side-footer">
          <div className="mt-side-footer-ball">⚽</div>
          <div>
            <strong>Liga de Leyendas</strong>
            <small>Base de datos oficial</small>
          </div>
        </div>
      </aside>
    </>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-ui-icon" aria-hidden="true">
      <circle cx="11" cy="11" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-ui-icon" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-ui-icon" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function NavIcon({ name }: { name: string }) {
  const props = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "home") {
    return <svg viewBox="0 0 24 24"><path {...props} d="m4.5 11 7.5-6 7.5 6v8h-5v-5h-5v5h-5v-8Z" /></svg>;
  }

  if (name === "clubs") {
    return <svg viewBox="0 0 24 24"><path {...props} d="M7 5h10l1.5 4L12 19 5.5 9 7 5Z" /><path {...props} d="M8 9h8M12 5.5V16" /></svg>;
  }

  if (name === "players") {
    return <svg viewBox="0 0 24 24"><circle {...props} cx="12" cy="8" r="3" /><path {...props} d="M5.5 19c.7-4 3-6 6.5-6s5.8 2 6.5 6" /></svg>;
  }

  if (name === "trophy" || name === "award") {
    return <svg viewBox="0 0 24 24"><path {...props} d="M8 4h8v4.5c0 3-1.7 5.5-4 5.5s-4-2.5-4-5.5V4Z" /><path {...props} d="M8 6H5v1.5c0 2 1.2 3.5 3.2 3.8M16 6h3v1.5c0 2-1.2 3.5-3.2 3.8M12 14v3M9 20h6M10 17h4" /></svg>;
  }

  if (name === "market") {
    return <svg viewBox="0 0 24 24"><path {...props} d="M5 8h13M15 5l3 3-3 3M19 16H6M9 13l-3 3 3 3" /></svg>;
  }

  if (name === "history" || name === "calendar") {
    return <svg viewBox="0 0 24 24"><circle {...props} cx="12" cy="12" r="8" /><path {...props} d="M12 7v5l3 2" /></svg>;
  }

  if (name === "stats") {
    return <svg viewBox="0 0 24 24"><path {...props} d="M5 19V9M10 19V5M15 19v-7M20 19V8" /></svg>;
  }

  if (name === "tools" || name === "admin") {
    return <svg viewBox="0 0 24 24"><path {...props} d="m7 17 10-10M7.5 6.5l3 3M13.5 14.5l3 3M5 19l2-2 2 2-2 2H5v-2ZM15 5l2-2 4 4-2 2-4-4Z" /></svg>;
  }

  return <svg viewBox="0 0 24 24"><circle {...props} cx="12" cy="12" r="8" /></svg>;
}


