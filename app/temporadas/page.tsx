import Link from "next/link";

import { getSeasonsWithCounts } from "@/lib/season-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SeasonsPage() {
  const rows = await getSeasonsWithCounts();

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <section className="app-panel rounded-[24px] p-6 sm:p-8">
        <div className="app-eyebrow">Archivo de la liga</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
          Temporadas
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--mt-muted)]">
          Consulta cada temporada como una unidad completa: competiciones,
          campeones, clubes, partidos y líderes individuales.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ season, competitions, finished }) => (
          <Link
            key={season.id}
            href={`/temporadas/${season.id}`}
            className="app-panel-soft group rounded-[13px] p-5 transition hover:-translate-y-0.5 hover:border-[var(--mt-gold)]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mt-gold-dark)]">
                Temporada
              </span>
              {season.is_active ? (
                <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">
                  Activa
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 text-2xl font-black text-[var(--mt-text)]">
              {season.name}
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[var(--mt-line)] pt-4">
              <Stat label="Competiciones" value={competitions} />
              <Stat label="Finalizadas" value={finished} />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--mt-surface)] px-3 py-2.5">
      <div className="text-lg font-black text-[var(--mt-text)]">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-[0.11em] text-[var(--mt-muted)]">
        {label}
      </div>
    </div>
  );
}
