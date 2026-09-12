import Link from "next/link";

import type { HistoricalAwardResult } from "@/lib/award-history";

export default function PlayerAwards({
  awards,
}: {
  awards: HistoricalAwardResult[];
}) {
  if (awards.length === 0) return null;

  const wins = awards.filter((award) => award.rank === 1);
  const podiums = awards.filter((award) => award.rank <= 3);

  return (
    <section className="app-panel rounded-2xl overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--mt-line)] px-5 py-4">
        <div>
          <div className="app-eyebrow">Palmarés individual</div>
          <h2 className="mt-1 text-xl font-black text-[var(--mt-text)]">
            Premios y podios
          </h2>
        </div>

        <div className="flex gap-2">
          <Kpi label="Premios" value={wins.length} />
          <Kpi label="Podios" value={podiums.length} />
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {awards.map((award) => (
          <Link
            key={`${award.pollId}-${award.rank}`}
            href={`/votaciones/${award.pollId}`}
            className={`rounded-[13px] border p-4 transition hover:border-[var(--mt-gold)] ${
              award.rank === 1
                ? "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)]"
                : "border-[var(--mt-line)] bg-[var(--mt-surface)]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div
                className={`text-[10px] font-black uppercase tracking-[0.13em] ${
                  award.rank === 1 ? "text-[var(--mt-gold-dark)]" : "text-[var(--mt-muted)]"
                }`}
              >
                {award.rank === 1
                  ? "Ganador"
                  : award.rank === 2
                    ? "2.º puesto"
                    : "3.º puesto"}
              </div>
              <div className="text-[10px] font-black text-[var(--mt-muted)]">
                {award.points} pts
              </div>
            </div>

            <div className="mt-2 font-black text-[var(--mt-text)]">{award.title}</div>
            <div className="mt-1 text-xs font-bold text-[var(--mt-muted)]">
              {award.seasonName}
              {award.teamCode ? ` · ${award.teamCode}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2 text-center">
      <div className="text-base font-black text-[var(--mt-text)]">{value}</div>
      <div className="text-[8px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
        {label}
      </div>
    </div>
  );
}
