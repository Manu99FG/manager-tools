"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

const links = [
  {
    href: "/plantillas",
    label: "Plantillas",
    icon: "🛡️",
  },
  {
    href: "/buscador",
    label: "Buscador",
    icon: "🔎",
  },
  {
    href: "/creador",
    label: "Creador (.sht)",
    icon: "📋",
  },
  {
    href: "/estadisticas",
    label: "Estadísticas",
    icon: "📊",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  /*
   * Al cambiar de página cerramos
   * automáticamente el menú móvil.
   */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ======================================
          HEADER MÓVIL
      ====================================== */}

      <header
        className="
          fixed
          left-0
          right-0
          top-0
          z-50
          flex
          h-16
          items-center
          justify-between
          border-b
          border-slate-800
          bg-slate-950
          px-4

          lg:hidden
        "
      >
        <Link
          href="/plantillas"
          className="
            text-sm
            font-black
            tracking-wider
            text-cyan-400
          "
        >
          MANAGER TOOLS
        </Link>

        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (current) => !current
            )
          }
          aria-label={
            mobileOpen
              ? "Cerrar menú"
              : "Abrir menú"
          }
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-lg
            border
            border-slate-700
            bg-slate-900
            text-xl
            text-white
            transition
            hover:bg-slate-800
          "
        >
          {mobileOpen
            ? "✕"
            : "☰"}
        </button>
      </header>

      {/* ======================================
          OVERLAY
      ====================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() =>
            setMobileOpen(false)
          }
          className="
            fixed
            inset-0
            z-40
            bg-black/60
            backdrop-blur-[2px]

            lg:hidden
          "
        />
      )}

      {/* ======================================
          SIDEBAR
      ====================================== */}

      <aside
        className={`
          fixed
          bottom-0
          left-0
          top-0
          z-50
          w-64
          shrink-0
          border-r
          border-slate-800
          bg-slate-950
          p-4
          transition-transform
          duration-200
          ease-out

          lg:translate-x-0

          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* CABECERA */}

        <div
          className="
            mb-8
            flex
            h-12
            items-center
            justify-between
          "
        >
          <Link
            href="/plantillas"
            className="
              text-sm
              font-black
              tracking-wider
              text-cyan-400
            "
          >
            MANAGER TOOLS
          </Link>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(false)
            }
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-md
              text-lg
              text-slate-400
              transition
              hover:bg-slate-900
              hover:text-white

              lg:hidden
            "
          >
            ✕
          </button>
        </div>

        {/* NAVEGACIÓN */}

        <nav className="space-y-2">
          {links.map((link) => {
            const active =
              pathname ===
                link.href ||
              pathname.startsWith(
                `${link.href}/`
              );

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex
                  items-center
                  gap-3
                  rounded-lg
                  px-4
                  py-3
                  text-sm
                  font-medium
                  transition

                  ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }
                `}
              >
                <span className="text-base">
                  {link.icon}
                </span>

                <span>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* PIE */}

        <div
          className="
            absolute
            bottom-5
            left-4
            text-xs
            text-slate-700
          "
        >
          Evolution Soccer Online
        </div>
      </aside>
    </>
  );
}