"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside
      className="
        min-h-screen
        w-64
        shrink-0
        border-r
        border-slate-800
        bg-slate-950
        p-4
      "
    >
      <h1 className="mb-8 text-xl font-black text-white">
        MANAGER TOOLS
      </h1>

      <nav className="space-y-2">
        {links.map((link) => {
          const active =
            pathname === link.href ||
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
                transition

                ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }
              `}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}