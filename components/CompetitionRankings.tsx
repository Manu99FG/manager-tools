import Image from "next/image";
import Link from "next/link";

import { getClubLogo } from "@/lib/club-logo";

import type {
  CompetitionPlayerRankingRow,
} from "@/lib/competition-rankings";

type Props = {
  rows:
    CompetitionPlayerRankingRow[];
};

type RankingKey =
  | "goals"
  | "assists"
  | "mom"
  | "keyPasses"
  | "tackles"
  | "saves";

const RANKINGS: {
  key: RankingKey;
  title: string;
  short: string;
}[] = [
  {
    key: "goals",
    title: "Goleadores",
    short: "GOL",
  },
  {
    key: "assists",
    title: "Asistencias",
    short: "AST",
  },
  {
    key: "mom",
    title: "MVP",
    short: "MVP",
  },
  {
    key: "keyPasses",
    title: "Pases clave",
    short: "KPS",
  },
  {
    key: "tackles",
    title: "Entradas",
    short: "KTK",
  },
  {
    key: "saves",
    title: "Paradas",
    short: "SAV",
  },
];

export default function CompetitionRankings({
  rows,
}: Props) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section>
      <div>
        <div className="app-eyebrow">
          Rendimiento
        </div>

        <h2 className="mt-1.5 text-xl font-black tracking-tight text-[var(--mt-text)]">
          Rankings individuales
        </h2>

        <p className="mt-1 text-xs leading-5 text-[var(--mt-muted)]">
          Acumulados automáticamente a partir de los partidos .stt importados.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {RANKINGS.map(
          (ranking) => {
            const top =
              [...rows]
                .filter(
                  (row) =>
                    row[
                      ranking.key
                    ] > 0
                )
                .sort(
                  (a, b) =>
                    b[
                      ranking.key
                    ] -
                      a[
                        ranking.key
                      ] ||
                    b.minutes -
                      a.minutes
                )
                .slice(0, 5);

            return (
              <div
                key={ranking.key}
                className="app-panel overflow-hidden rounded-2xl"
              >
                <div className="flex items-center justify-between border-b border-[var(--mt-line)] bg-[var(--mt-surface)] px-5 py-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--mt-gold-dark)]">
                    {ranking.title}
                  </div>

                  <span className="rounded-md border border-[var(--mt-line)] bg-[var(--mt-surface)] px-2 py-1 text-[8px] font-black text-[var(--mt-muted)]">
                    TOP 5
                  </span>
                </div>

                <div className="p-3">
                  {top.length > 0 ? (
                    top.map(
                      (
                        row,
                        index
                      ) => (
                        <div
                          key={
                            row.playerId ??
                            `${row.teamCode}-${row.esmsName}`
                          }
                          className="grid grid-cols-[26px_30px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2.5 py-2.5 transition hover:bg-[var(--mt-surface)]"
                        >
                          <div
                            className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-black ${
                              index === 0
                                ? "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]"
                                : "text-[var(--mt-muted)]"
                            }`}
                          >
                            {index + 1}
                          </div>

                          <Image
                            src={getClubLogo(
                              row.teamCode
                            )}
                            alt={row.teamCode}
                            width={28}
                            height={28}
                            className="h-7 w-7 object-contain"
                          />

                          <div className="min-w-0 truncate text-xs">
                            {row.playerId ? (
                              <Link
                                href={`/jugadores/${row.playerId}`}
                                className="font-black text-[var(--mt-text)] transition hover:text-[var(--mt-gold-dark)]"
                              >
                                {row.esmsName}
                              </Link>
                            ) : (
                              <span className="font-black text-[var(--mt-muted)]">
                                {row.esmsName}
                              </span>
                            )}

                            <div className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                              {row.teamCode}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-lg font-black text-[var(--mt-text)]">
                              {
                                row[
                                  ranking.key
                                ]
                              }
                            </span>

                            <span className="ml-1 text-[8px] font-black text-[var(--mt-muted)]">
                              {ranking.short}
                            </span>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="px-2 py-5 text-xs text-[var(--mt-muted)]">
                      Sin datos todavía.
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}
