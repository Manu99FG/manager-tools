import Image from "next/image";
import Link from "next/link";

import {
  getClubLogo,
} from "@/lib/club-logo";

import {
  getClubName,
} from "@/lib/club-names";

import type {
  AvailabilityData,
  PlayerAvailabilityRow,
} from "@/lib/player-availability";

type Props = {
  data:
    AvailabilityData;
};

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

export default function AvailabilityDashboard({
  data,
}: Props) {
  const {
    totals,
    unavailable,
    teams,
    recentInjuries,
  } = data;

  return (
    <div>
      <section
        className="
          grid
          grid-cols-2
          gap-3
          lg:grid-cols-5
        "
      >
        <Kpi
          label="Jugadores"
          value={
            totals.players
          }
        />

        <Kpi
          label="Disponibles"
          value={
            totals.available
          }
        />

        <Kpi
          label="Bajas"
          value={
            totals.unavailable
          }
          danger={
            totals.unavailable >
            0
          }
        />

        <Kpi
          label="Lesionados"
          value={
            totals.injured
          }
          danger={
            totals.injured >
            0
          }
        />

        <Kpi
          label="Sancionados"
          value={
            totals.suspended
          }
          warning={
            totals.suspended >
            0
          }
        />
      </section>

      <section className="mt-8">
        <div>
          <h2 className="text-xl font-black text-[var(--mt-text)]">
            Bajas actuales
          </h2>

          <p className="mt-1 text-sm text-[var(--mt-muted)]">
            Basado en los valores INJ y SUS del último snapshot de cada jugador.
          </p>
        </div>

        {unavailable.length ===
        0 ? (
          <div
            className="
              mt-4
              rounded-[13px]
              border
              border-emerald-500/20
              bg-emerald-500/5
              p-6
              text-sm
              font-bold
              text-emerald-700
            "
          >
            No hay jugadores lesionados o sancionados actualmente.
          </div>
        ) : (
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
            <table className="w-full min-w-[850px] text-sm">
              <thead className="border-b border-[var(--mt-line)] bg-[var(--mt-surface)] text-[10px] uppercase tracking-wide text-[var(--mt-muted)]">
                <tr>
                  <th className="p-3 text-left">
                    Jugador
                  </th>

                  <th className="p-3 text-left">
                    Equipo
                  </th>

                  <th className="p-3 text-center">
                    Estado
                  </th>

                  <th className="p-3 text-center">
                    INJ
                  </th>

                  <th className="p-3 text-center">
                    SUS
                  </th>

                  <th className="p-3 text-center">
                    DP
                  </th>

                  <th className="p-3 text-center">
                    FIT
                  </th>

                  <th className="p-3 text-center">
                    Snapshot
                  </th>
                </tr>
              </thead>

              <tbody>
                {unavailable.map(
                  (
                    player
                  ) => (
                    <UnavailableRow
                      key={
                        player.playerId
                      }
                      player={
                        player
                      }
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-black text-[var(--mt-text)]">
          Bajas por equipo
        </h2>

        <div
          className="
            mt-4
            grid
            gap-3
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4
          "
        >
          {teams.map(
            (
              team
            ) => (
              <div
                key={
                  team.teamCode
                }
                className="
                  rounded-[13px]
                  border
                  border-[var(--mt-line)]
                  bg-[var(--mt-surface)]
                  p-4
                "
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={getClubLogo(
                      team.teamCode
                    )}
                    alt={
                      team.teamCode
                    }
                    width={38}
                    height={38}
                    className="h-10 w-10 object-contain"
                  />

                  <div className="min-w-0">
                    <div className="truncate font-black text-[var(--mt-text)]">
                      {getClubName(
                        team.teamCode
                      )}
                    </div>

                    <div className="text-[10px] font-black uppercase text-[var(--mt-muted)]">
                      {
                        team.teamCode
                      }
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Small
                    label="Bajas"
                    value={
                      team.unavailable
                    }
                  />

                  <Small
                    label="INJ"
                    value={
                      team.injured
                    }
                  />

                  <Small
                    label="SUS"
                    value={
                      team.suspended
                    }
                  />
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <section className="mt-10">
        <div>
          <h2 className="text-xl font-black text-[var(--mt-text)]">
            Lesiones detectadas en .stt
          </h2>

          <p className="mt-1 text-sm text-[var(--mt-muted)]">
            Registro de jugadores cuyo último historial incluye una lesión detectada en un partido importado.
          </p>
        </div>

        {recentInjuries.length ===
        0 ? (
          <div className="mt-4 rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-6 text-sm text-[var(--mt-muted)]">
            Todavía no hay lesiones detectadas en archivos .stt.
          </div>
        ) : (
          <div
            className="
              mt-4
              grid
              gap-3
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {recentInjuries
              .slice(
                0,
                18
              )
              .map(
                (
                  player
                ) => (
                  <div
                    key={
                      player.playerId
                    }
                    className="
                      rounded-[13px]
                      border
                      border-red-500/15
                      bg-red-500/5
                      p-4
                    "
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Image
                          src={getClubLogo(
                            player.teamCode
                          )}
                          alt={
                            player.teamCode
                          }
                          width={28}
                          height={28}
                          className="h-8 w-8 shrink-0 object-contain"
                        />

                        <div className="min-w-0">
                          <Link
                            href={`/jugadores/${player.playerId}`}
                            className="block truncate font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]"
                          >
                            {
                              player.esmsName
                            }
                          </Link>

                          <div className="text-[10px] uppercase text-[var(--mt-muted)]">
                            {
                              player.teamCode
                            }
                          </div>
                        </div>
                      </div>

                      {player.recentInjuryMatchId ? (
                        <Link
                          href={`/partidos/${player.recentInjuryMatchId}`}
                          className="
                            shrink-0
                            rounded-lg
                            bg-[var(--mt-surface)]
                            px-2
                            py-1
                            text-[9px]
                            font-black
                            uppercase
                            text-[var(--mt-gold-dark)]
                            hover:bg-[var(--mt-surface-soft)]
                          "
                        >
                          Partido
                        </Link>
                      ) : null}
                    </div>

                    <div className="mt-3 text-xs text-[var(--mt-muted)]">
                      Detectada:{" "}
                      {formatDate(
                        player.recentInjuryAt
                      )}
                    </div>

                    <div className="mt-2 text-xs font-black text-red-700">
                      {player.injuryMatches >
                      0
                        ? `${player.injuryMatches} partido(s) de lesión pendientes`
                        : "Lesión detectada · ya no figura como baja actual"}
                    </div>
                  </div>
                )
              )}
          </div>
        )}
      </section>
    </div>
  );
}

function UnavailableRow({
  player,
}: {
  player:
    PlayerAvailabilityRow;
}) {
  return (
    <tr className="border-b border-[var(--mt-line)] last:border-0">
      <td className="p-3">
        <Link
          href={`/jugadores/${player.playerId}`}
          className="font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]"
        >
          {
            player.esmsName
          }
        </Link>
      </td>

      <td className="p-3">
        <div className="flex items-center gap-2">
          <Image
            src={getClubLogo(
              player.teamCode
            )}
            alt={
              player.teamCode
            }
            width={26}
            height={26}
            className="h-7 w-7 object-contain"
          />

          <span className="font-bold text-[var(--mt-muted)]">
            {getClubName(
              player.teamCode
            )}
          </span>
        </div>
      </td>

      <td className="p-3 text-center">
        <StatusBadge
          player={
            player
          }
        />
      </td>

      <td className="p-3 text-center font-black text-red-700">
        {
          player.injuryMatches
        }
      </td>

      <td className="p-3 text-center font-black text-[var(--mt-gold-dark)]">
        {
          player.suspensionMatches
        }
      </td>

      <td className="p-3 text-center font-black text-[var(--mt-muted)]">
        {
          player.disciplinaryPoints
        }
      </td>

      <td className="p-3 text-center font-black text-[var(--mt-muted)]">
        {
          player.fitness
        }
      </td>

      <td className="whitespace-nowrap p-3 text-center text-xs text-[var(--mt-muted)]">
        {formatDate(
          player.snapshotDate
        )}
      </td>
    </tr>
  );
}

function StatusBadge({
  player,
}: {
  player:
    PlayerAvailabilityRow;
}) {
  if (
    player.injuryMatches >
      0 &&
    player.suspensionMatches >
      0
  ) {
    return (
      <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-red-700">
        INJ + SUS
      </span>
    );
  }

  if (
    player.injuryMatches >
    0
  ) {
    return (
      <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-red-700">
        Lesionado
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[var(--mt-surface-soft)] px-2.5 py-1 text-[9px] font-black uppercase text-[var(--mt-gold-dark)]">
      Sancionado
    </span>
  );
}

function Kpi({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className="
        rounded-[13px]
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
          "mt-1 text-2xl font-black",
          danger
            ? "text-red-700"
            : warning
              ? "text-[var(--mt-gold-dark)]"
              : "text-[var(--mt-text)]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function Small({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-2 text-center">
      <div className="text-[8px] font-black uppercase text-[var(--mt-muted)]">
        {label}
      </div>

      <div className="mt-1 font-black text-[var(--mt-text)]">
        {value}
      </div>
    </div>
  );
}
