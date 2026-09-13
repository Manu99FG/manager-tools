import Image from "next/image";
import Link from "next/link";

import {
  getClubLogo,
} from "@/lib/club-logo";

import {
  getClubName,
} from "@/lib/club-names";

import type {
  PlayerCompetitionSummary,
  PlayerMatchHistoryData,
  PlayerMatchHistoryRow,
} from "@/lib/player-match-history";

type Props = {
  data:
    PlayerMatchHistoryData;
};

function per90(
  value: number,
  minutes: number
) {
  if (
    minutes <= 0
  ) {
    return "0.00";
  }

  return (
    (value /
      minutes) *
    90
  ).toFixed(2);
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

function totalExpDelta(
  row:
    PlayerCompetitionSummary
) {
  return (
    row.kabDelta +
    row.tabDelta +
    row.pabDelta +
    row.sabDelta
  );
}

function signed(
  value: number
) {
  if (
    value > 0
  ) {
    return `+${value}`;
  }

  return String(value);
}

export default function PlayerMatchHistory({
  data,
}: Props) {
  const {
    matches,
    competitions,
    totals,
  } = data;

  if (
    matches.length === 0
  ) {
    return (
      <section className="mt-8">
        <div className="rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-6">
          <div className="text-lg font-black text-[var(--mt-text)]">
            Partidos
          </div>

          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            Todavía no hay partidos .stt vinculados a este jugador.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div>
        <h2 className="text-xl font-black text-[var(--mt-text)]">
          Rendimiento en partidos
        </h2>

        <p className="mt-1 text-sm text-[var(--mt-muted)]">
          Datos partido a partido importados directamente desde los archivos .stt.
        </p>
      </div>

      <div
        className="
          mt-4
          grid
          grid-cols-2
          gap-3
          md:grid-cols-4
          xl:grid-cols-8
        "
      >
        <Kpi
          label="PJ"
          value={
            totals.appearances
          }
        />

        <Kpi
          label="MIN"
          value={
            totals.minutes
          }
        />

        <Kpi
          label="GOL"
          value={
            totals.goals
          }
        />

        <Kpi
          label="AST"
          value={
            totals.assists
          }
        />

        <Kpi
          label="MVP"
          value={
            totals.mom
          }
        />

        <Kpi
          label="G+A / 90"
          value={(
            (
              totals.goals +
              totals.assists
            ) /
            Math.max(
              totals.minutes,
              1
            ) *
            90
          ).toFixed(2)}
        />

        <Kpi
          label="DP"
          value={
            totals.dp
          }
        />

        <Kpi
          label="EXP PARTIDOS"
          value={signed(
            totalExpDelta(
              totals
            )
          )}
          positive={
            totalExpDelta(
              totals
            ) > 0
          }
          negative={
            totalExpDelta(
              totals
            ) < 0
          }
        />
      </div>

      {competitions.length >
      0 ? (
        <div
          className="
            mt-6
            grid
            gap-4
            lg:grid-cols-2
          "
        >
          {competitions.map(
            (
              summary
            ) => (
              <CompetitionCard
                key={
                  summary.competitionId
                }
                summary={
                  summary
                }
              />
            )
          )}
        </div>
      ) : null}

      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[var(--mt-text)]">
            Historial partido a partido
          </h3>

          <div className="text-xs font-bold uppercase text-[var(--mt-muted)]">
            {
              matches.length
            }{" "}
            registros
          </div>
        </div>

        <div
          className="
            mt-4
            overflow-x-auto
            rounded-[13px]
            border
            border-[var(--mt-line)]
            bg-[var(--mt-surface)]
          "
        >
          <table className="w-full min-w-[1320px] text-xs">
            <thead className="border-b border-[var(--mt-line)] bg-[var(--mt-surface)] text-[9px] uppercase tracking-wide text-[var(--mt-muted)]">
              <tr>
                <th className="p-3 text-left">
                  Fecha
                </th>
                <th className="p-3 text-left">
                  Competición
                </th>
                <th className="p-3 text-left">
                  Partido
                </th>
                <th className="p-3 text-center">
                  Rol
                </th>
                <th className="p-3 text-center">
                  Min
                </th>
                <th className="p-3 text-center">
                  MVP
                </th>
                <th className="p-3 text-center">
                  Sav
                </th>
                <th className="p-3 text-center">
                  Con
                </th>
                <th className="p-3 text-center">
                  Ktk
                </th>
                <th className="p-3 text-center">
                  Kps
                </th>
                <th className="p-3 text-center">
                  Sht
                </th>
                <th className="p-3 text-center">
                  Gls
                </th>
                <th className="p-3 text-center">
                  Ass
                </th>
                <th className="p-3 text-center">
                  DP
                </th>
                <th className="p-3 text-center">
                  Inj
                </th>
                <th className="p-3 text-center">
                  ΔKAb
                </th>
                <th className="p-3 text-center">
                  ΔTAb
                </th>
                <th className="p-3 text-center">
                  ΔPAb
                </th>
                <th className="p-3 text-center">
                  ΔSAb
                </th>
                <th className="p-3 text-center">
                  FIT
                </th>
              </tr>
            </thead>

            <tbody>
              {matches.map(
                (
                  row
                ) => (
                  <MatchRow
                    key={
                      row.id
                    }
                    row={
                      row
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CompetitionCard({
  summary,
}: {
  summary:
    PlayerCompetitionSummary;
}) {
  return (
    <div
      className="
        rounded-[13px]
        border
        border-[var(--mt-line)]
        bg-[var(--mt-surface)]
        p-5
      "
    >
      <div
        className="
          flex
          flex-col
          gap-1
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <Link
            href={`/competiciones/${summary.competitionId}`}
            className="font-black text-[var(--mt-text)] transition hover:text-[var(--mt-gold-dark)]"
          >
            {
              summary.competitionName
            }
          </Link>

          {summary.seasonName ? (
            <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
              {
                summary.seasonName
              }
            </div>
          ) : null}
        </div>

        <div className="text-xs font-black text-[var(--mt-muted)]">
          {
            summary.appearances
          }{" "}
          PJ ·{" "}
          {
            summary.minutes
          }{" "}
          MIN
        </div>
      </div>

      <div
        className="
          mt-4
          grid
          grid-cols-3
          gap-2
          sm:grid-cols-6
        "
      >
        <Mini
          label="Goles"
          value={
            summary.goals
          }
        />

        <Mini
          label="Asist."
          value={
            summary.assists
          }
        />

        <Mini
          label="MVP"
          value={
            summary.mom
          }
        />

        <Mini
          label="G+A/90"
          value={per90(
            summary.goals +
              summary.assists,
            summary.minutes
          )}
        />

        <Mini
          label="Kps/90"
          value={per90(
            summary.keyPasses,
            summary.minutes
          )}
        />

        <Mini
          label="Ktk/90"
          value={per90(
            summary.tackles,
            summary.minutes
          )}
        />
      </div>

      <div
        className="
          mt-3
          grid
          grid-cols-2
          gap-2
          sm:grid-cols-4
        "
      >
        <DeltaMini
          label="KAb"
          value={
            summary.kabDelta
          }
        />

        <DeltaMini
          label="TAb"
          value={
            summary.tabDelta
          }
        />

        <DeltaMini
          label="PAb"
          value={
            summary.pabDelta
          }
        />

        <DeltaMini
          label="SAb"
          value={
            summary.sabDelta
          }
        />
      </div>
    </div>
  );
}

function MatchRow({
  row,
}: {
  row:
    PlayerMatchHistoryRow;
}) {
  const role =
    !row.participated
      ? "NJ"
      : row.cameOnAsSub
        ? "SUP"
        : "TIT";

  return (
    <tr className="border-b border-[var(--mt-line)] last:border-0">
      <td className="whitespace-nowrap p-3 text-[var(--mt-muted)]">
        {formatDate(
          row.scheduledAt ??
            row.playedAt
        )}
      </td>

      <td className="p-3">
        <div className="font-bold text-[var(--mt-muted)]">
          {
            row.competitionName
          }
        </div>

        <div className="mt-0.5 text-[9px] uppercase text-[var(--mt-muted)]">
          {row.roundName ??
            "—"}
        </div>
      </td>

      <td className="p-3">
        <Link
          href={`/partidos/${row.matchId}`}
          className="
            inline-flex
            items-center
            gap-2
            font-black
            text-[var(--mt-text)]
            transition
            hover:text-[var(--mt-gold-dark)]
          "
        >
          <TeamBadge
            code={
              row.homeTeamCode
            }
          />

          <span>
            {
              row.homeScore ??
              "-"
            }
          </span>

          <span className="text-[var(--mt-muted)]">
            -
          </span>

          <span>
            {
              row.awayScore ??
              "-"
            }
          </span>

          <TeamBadge
            code={
              row.awayTeamCode
            }
          />
        </Link>
      </td>

      <td className="p-3 text-center">
        <span
          className={[
            "rounded px-2 py-1 text-[9px] font-black",
            role === "TIT"
              ? "bg-emerald-500/10 text-emerald-700"
              : role === "SUP"
                ? "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]"
                : "bg-[var(--mt-surface)] text-[var(--mt-muted)]",
          ].join(" ")}
        >
          {role}
        </span>
      </td>

      <StatCell
        value={
          row.minutes
        }
      />

      <StatCell
        value={
          row.mom
            ? "★"
            : ""
        }
        highlight={
          Boolean(
            row.mom
          )
        }
      />

      <StatCell value={row.saves} />
      <StatCell value={row.conceded} />
      <StatCell value={row.tackles} />
      <StatCell value={row.keyPasses} />
      <StatCell value={row.shots} />

      <StatCell
        value={
          row.goals
        }
        highlight={
          row.goals > 0
        }
      />

      <StatCell
        value={
          row.assists
        }
        highlight={
          row.assists > 0
        }
      />

      <StatCell value={row.dp} />

      <StatCell
        value={
          row.injury
            ? "✚"
            : ""
        }
        danger={
          Boolean(
            row.injury
          )
        }
      />

      <DeltaTableCell value={row.kabDelta} />
      <DeltaTableCell value={row.tabDelta} />
      <DeltaTableCell value={row.pabDelta} />
      <DeltaTableCell value={row.sabDelta} />

      <StatCell
        value={
          row.fitness
        }
      />
    </tr>
  );
}

function TeamBadge({
  code,
}: {
  code: string;
}) {
  return (
    <span
      className="
        inline-flex
        items-center
        gap-1.5
      "
      title={
        getClubName(code)
      }
    >
      <Image
        src={
          getClubLogo(
            code
          )
        }
        alt={code}
        width={22}
        height={22}
        className="h-6 w-6 object-contain"
      />

      <span className="text-[9px] text-[var(--mt-muted)]">
        {code}
      </span>
    </span>
  );
}

function Kpi({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value:
    | string
    | number;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-[var(--mt-line)]
        bg-[var(--mt-surface)]
        p-4
      "
    >
      <div className="text-[9px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
        {label}
      </div>

      <div
        className={[
          "mt-1 text-xl font-black",
          positive
            ? "text-emerald-700"
            : negative
              ? "text-red-700"
              : "text-[var(--mt-text)]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-3 text-center">
      <div className="text-[8px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
        {label}
      </div>

      <div className="mt-1 font-black text-[var(--mt-text)]">
        {value}
      </div>
    </div>
  );
}

function DeltaMini({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-3 text-center">
      <div className="text-[8px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
        Δ{label}
      </div>

      <div
        className={[
          "mt-1 font-black",
          value > 0
            ? "text-emerald-700"
            : value < 0
              ? "text-red-700"
              : "text-[var(--mt-muted)]",
        ].join(" ")}
      >
        {signed(
          value
        )}
      </div>
    </div>
  );
}

function StatCell({
  value,
  highlight = false,
  danger = false,
}: {
  value:
    | string
    | number;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <td
      className={[
        "p-3 text-center font-bold",
        danger
          ? "text-red-700"
          : highlight
            ? "text-[var(--mt-gold-dark)]"
            : "text-[var(--mt-muted)]",
      ].join(" ")}
    >
      {value}
    </td>
  );
}

function DeltaTableCell({
  value,
}: {
  value: number;
}) {
  return (
    <td
      className={[
        "p-3 text-center font-black",
        value > 0
          ? "text-emerald-700"
          : value < 0
            ? "text-red-700"
            : "text-[var(--mt-muted)]",
      ].join(" ")}
    >
      {signed(
        value
      )}
    </td>
  );
}
