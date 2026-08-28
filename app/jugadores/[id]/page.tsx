import Image from "next/image";
import Link from "next/link";

import type {
  ReactNode,
} from "react";

import {
  notFound,
} from "next/navigation";

import {
  getPlayerPageData,
  getTotalSkillExp,
} from "@/lib/player-history";

import {
  getClubLogo,
} from "@/lib/club-logo";

import {
  getClubName,
} from "@/lib/club-names";

import PlayerProfileCard from "@/components/PlayerProfileCard";
import PlayerPhotoAdmin from "@/components/PlayerPhotoAdmin";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type ChartPoint = {
  label: string;
  value: number;
};

type ChartSeries = {
  label: string;
  points: ChartPoint[];
};

const PROGRESSION_STATS =
  new Set<string>([
    "st",
    "tk",
    "ps",
    "sh",
    "kab",
    "tab",
    "pab",
    "sab",
  ]);

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

function formatShortDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

function eventLabel(
  stat: string
) {
  const labels: Record<
    string,
    string
  > = {
    st: "GK",
    tk: "DF",
    ps: "MF",
    sh: "FW",

    kab: "KAb",
    tab: "TAb",
    pab: "PAb",
    sab: "SAb",

    gam: "Partidos",
    sub: "Suplencias",
    min: "Minutos",
    mom: "MVP",

    sav: "Paradas",
    con: "Goles recibidos",
    ktk: "Entradas",
    kps: "Pases",
    sht: "Disparos",
    gls: "Goles",
    ass: "Asistencias",

    dp: "DP",
    inj: "Lesión",
    sus: "Sanción",
    fit: "Fit",
  };

  return (
    labels[stat] ??
    stat.toUpperCase()
  );
}

function isExpEvent(
  stat: string
) {
  return [
    "kab",
    "tab",
    "pab",
    "sab",
  ].includes(stat);
}

function formatEventValue(
  stat: string,
  value: number
) {
  if (isExpEvent(stat)) {
    return value.toLocaleString(
      "es-ES"
    );
  }

  return String(value);
}

function formatEventDifference(
  stat: string,
  difference: number
) {
  const signed =
    signedValue(difference);

  if (isExpEvent(stat)) {
    return `${signed} EXP`;
  }

  if (
    ["st", "tk", "ps", "sh"].includes(
      stat
    )
  ) {
    return `${signed} MEDIA`;
  }

  return signed;
}

function differenceClass(
  difference: number
) {
  if (
    difference > 0
  ) {
    return "text-emerald-400";
  }

  if (
    difference < 0
  ) {
    return "text-red-400";
  }

  return "text-slate-500";
}

function signedValue(
  value: number
) {
  if (
    value > 0
  ) {
    return `+${value}`;
  }

  return String(value);
}


function getChartBounds(
  values: number[]
) {
  if (
    values.length ===
    0
  ) {
    return {
      min: 0,
      max: 1,
    };
  }

  const minValue =
    Math.min(...values);

  const maxValue =
    Math.max(...values);

  const spread =
    Math.max(
      1,
      maxValue -
        minValue
    );

  /*
   * Para medias pequeñas dejamos
   * al menos 1 punto de margen.
   *
   * Para EXP total dejamos un margen
   * proporcional al salto real.
   */
  const margin =
    maxValue <= 30
      ? 1
      : Math.max(
          50,
          Math.ceil(
            spread *
              0.2
          )
        );

  const min =
    Math.max(
      0,
      minValue -
        margin
    );

  const max =
    maxValue +
    margin;

  return {
    min,
    max:
      max === min
        ? min + 1
        : max,
  };
}

export default async function PlayerPage({
  params,
}: Props) {
  const {
    id,
  } = await params;

  try {
    const {
      player,
      snapshots,
      transfers,
      events,
    } =
      await getPlayerPageData(
        id
      );

    const current =
      snapshots[0];

    if (!current) {
      notFound();
    }

    const playerWithPhoto =
      player as typeof player & {
        photo_url?: string | null;
        photo_path?: string | null;
      };

    const photoUrl =
      playerWithPhoto.photo_url ??
      null;

    const first =
      snapshots[
        snapshots.length -
          1
      ];

    const chronological =
      [...snapshots].reverse();

    const deltas = {
      st: current.st - first.st,
      tk: current.tk - first.tk,
      ps: current.ps - first.ps,
      sh: current.sh - first.sh,

      kab:
        getTotalSkillExp(current.st, current.kab) -
        getTotalSkillExp(first.st, first.kab),

      tab:
        getTotalSkillExp(current.tk, current.tab) -
        getTotalSkillExp(first.tk, first.tab),

      pab:
        getTotalSkillExp(current.ps, current.pab) -
        getTotalSkillExp(first.ps, first.pab),

      sab:
        getTotalSkillExp(current.sh, current.sab) -
        getTotalSkillExp(first.sh, first.sab),
    };

    const progressionEvents =
      events.filter(
        (event) =>
          PROGRESSION_STATS.has(
            event.stat
          )
      );

    const progressions =
      progressionEvents.filter(
        (event) =>
          Number(
            event.new_value
          ) >
          Number(
            event.old_value
          )
      );

    const regressions =
      progressionEvents.filter(
        (event) =>
          Number(
            event.new_value
          ) <
          Number(
            event.old_value
          )
      );

    const ratingSeries: ChartSeries[] =
      [
        {
          label: "GK",
          points:
            chronological.map(
              (snapshot) => ({
                label:
                  formatShortDate(
                    snapshot.snapshot_date
                  ),
                value:
                  snapshot.st,
              })
            ),
        },

        {
          label: "DF",
          points:
            chronological.map(
              (snapshot) => ({
                label:
                  formatShortDate(
                    snapshot.snapshot_date
                  ),
                value:
                  snapshot.tk,
              })
            ),
        },

        {
          label: "MF",
          points:
            chronological.map(
              (snapshot) => ({
                label:
                  formatShortDate(
                    snapshot.snapshot_date
                  ),
                value:
                  snapshot.ps,
              })
            ),
        },

        {
          label: "FW",
          points:
            chronological.map(
              (snapshot) => ({
                label:
                  formatShortDate(
                    snapshot.snapshot_date
                  ),
                value:
                  snapshot.sh,
              })
            ),
        },
      ];

    const ratingCharts =
      ratingSeries.map(
        (serie) => {
          const values =
            serie.points.map(
              (point) =>
                point.value
            );

          const bounds =
            getChartBounds(
              values
            );

          const labels: Record<
            string,
            {
              stat: string;
              role: string;
            }
          > = {
            GK: {
              stat: "St",
              role: "Portero",
            },
            DF: {
              stat: "Tk",
              role: "Defensa",
            },
            MF: {
              stat: "Ps",
              role: "Medio",
            },
            FW: {
              stat: "Sh",
              role: "Delantero",
            },
          };

          const meta =
            labels[
              serie.label
            ];

          const currentValue =
            serie.points[
              serie.points.length -
                1
            ]?.value ?? 0;

          const firstValue =
            serie.points[0]
              ?.value ?? 0;

          const difference =
            currentValue -
            firstValue;

          return {
            key:
              serie.label,

            title:
              `${serie.label} (${meta?.stat ?? ""})`,

            subtitle:
              `${meta?.role ?? ""} · Actual ${currentValue} · ${
                difference === 0
                  ? "sin cambios"
                  : `${signedValue(
                      difference
                    )} desde el primer registro`
              }`,

            series: [
              serie,
            ],

            minValue:
              bounds.min,

            maxValue:
              bounds.max,
          };
        }
      );

    const expSeries: ChartSeries[] =
      [
        {
          label: "KAb",
          points: chronological.map(
            (snapshot) => ({
              label: formatShortDate(
                snapshot.snapshot_date
              ),
              value: getTotalSkillExp(
                snapshot.st,
                snapshot.kab
              ),
            })
          ),
        },
        {
          label: "TAb",
          points: chronological.map(
            (snapshot) => ({
              label: formatShortDate(
                snapshot.snapshot_date
              ),
              value: getTotalSkillExp(
                snapshot.tk,
                snapshot.tab
              ),
            })
          ),
        },
        {
          label: "PAb",
          points: chronological.map(
            (snapshot) => ({
              label: formatShortDate(
                snapshot.snapshot_date
              ),
              value: getTotalSkillExp(
                snapshot.ps,
                snapshot.pab
              ),
            })
          ),
        },
        {
          label: "SAb",
          points: chronological.map(
            (snapshot) => ({
              label: formatShortDate(
                snapshot.snapshot_date
              ),
              value: getTotalSkillExp(
                snapshot.sh,
                snapshot.sab
              ),
            })
          ),
        },
      ];

    const expCharts =
      [
        {
          key: "KAb",
          title: "KAb (GK)",
          subtitle: "Experiencia total de portero",
          ratingKey: "st",
          expKey: "kab",
        },
        {
          key: "TAb",
          title: "TAb (DF)",
          subtitle: "Experiencia total de defensa",
          ratingKey: "tk",
          expKey: "tab",
        },
        {
          key: "PAb",
          title: "PAb (MF)",
          subtitle: "Experiencia total de medio",
          ratingKey: "ps",
          expKey: "pab",
        },
        {
          key: "SAb",
          title: "SAb (FW)",
          subtitle: "Experiencia total de delantero",
          ratingKey: "sh",
          expKey: "sab",
        },
      ].map(
        (config) => {
          const serie =
            expSeries.find(
              (item) =>
                item.label ===
                config.key
            );

          const points =
            serie?.points ?? [];

          const values =
            points.map(
              (point) =>
                point.value
            );

          const bounds =
            getChartBounds(
              values
            );

          const currentValue =
            points[
              points.length -
                1
            ]?.value ?? 0;

          const firstValue =
            points[0]
              ?.value ?? 0;

          const difference =
            currentValue -
            firstValue;

          return {
            key:
              config.key,

            title:
              config.title,

            subtitle:
              `${config.subtitle} · Actual ${currentValue.toLocaleString(
                "es-ES"
              )} · ${
                difference === 0
                  ? "sin cambios"
                  : `${difference > 0 ? "+" : ""}${difference.toLocaleString(
                      "es-ES"
                    )} EXP`
              }`,

            series:
              serie
                ? [serie]
                : [],

            minValue:
              bounds.min,

            maxValue:
              bounds.max,
          };
        }
      );


    return (
      <main
        className="
          mx-auto
          w-full
          max-w-7xl
          p-4

          sm:p-6
        "
      >
        <div className="mb-5">
          <Link
            href="/buscador"
            className="
              inline-flex
              rounded-lg
              bg-slate-800
              px-4
              py-2
              text-sm
              font-semibold
              text-white
              transition

              hover:bg-slate-700
            "
          >
            ← Volver al Buscador
          </Link>
        </div>

        {/* CARTA / CABECERA DEL JUGADOR */}

        <PlayerProfileCard
          player={
            player
          }
          current={
            current
          }
          firstSnapshot={
            first
          }
          photoUrl={photoUrl}
        />

        <PlayerPhotoAdmin
          playerId={player.id}
          playerName={player.esms_name}
          currentPhotoUrl={photoUrl}
        />

        {/* NIVEL ACTUAL */}

        <section className="mt-8">
          <SectionTitle
            title="Nivel actual"
            subtitle="Media principal y experiencia"
          />

          <div
            className="
              grid
              grid-cols-2
              gap-3

              md:grid-cols-4
            "
          >
            <SkillCard
              label="GK"
              rating={
                current.st
              }
              exp={
                current.kab
              }
              difference={
                deltas.st
              }
            />

            <SkillCard
              label="DF"
              rating={
                current.tk
              }
              exp={
                current.tab
              }
              difference={
                deltas.tk
              }
            />

            <SkillCard
              label="MF"
              rating={
                current.ps
              }
              exp={
                current.pab
              }
              difference={
                deltas.ps
              }
            />

            <SkillCard
              label="FW"
              rating={
                current.sh
              }
              exp={
                current.sab
              }
              difference={
                deltas.sh
              }
            />
          </div>
        </section>

        {/* EVOLUCIÓN GENERAL */}

        <section className="mt-8">
          <SectionTitle
            title="Evolución general"
            subtitle={
              snapshots.length >
              1
                ? `Desde ${formatDate(
                    first.snapshot_date
                  )} hasta ${formatDate(
                    current.snapshot_date
                  )}`
                : "Solo existe un registro"
            }
          />

          <div
            className="
              grid
              grid-cols-2
              gap-3

              sm:grid-cols-4

              lg:grid-cols-8
            "
          >
            <EvolutionCard
              label="GK"
              value={deltas.st}
            />

            <EvolutionCard
              label="KAb"
              value={deltas.kab}
            />

            <EvolutionCard
              label="DF"
              value={deltas.tk}
            />

            <EvolutionCard
              label="TAb"
              value={deltas.tab}
            />

            <EvolutionCard
              label="MF"
              value={deltas.ps}
            />

            <EvolutionCard
              label="PAb"
              value={deltas.pab}
            />

            <EvolutionCard
              label="FW"
              value={deltas.sh}
            />

            <EvolutionCard
              label="SAb"
              value={deltas.sab}
            />
          </div>
        </section>

        {/* GRÁFICAS */}

        <section className="mt-8">
          <SectionTitle
            title="Gráficas de evolución"
            subtitle="Seguimiento cronológico del jugador"
          />

          {snapshots.length <
          2 ? (
            <EmptyStateBox>
              La gráfica aparecerá cuando el jugador tenga al menos dos snapshots.
            </EmptyStateBox>
          ) : (
            <div className="space-y-4">
              <div
                className="
                  grid
                  grid-cols-1
                  gap-4

                  xl:grid-cols-2
                "
              >
                {ratingCharts.map(
                  (chart) => (
                    <EvolutionChart
                      key={
                        chart.key
                      }
                      title={
                        chart.title
                      }
                      subtitle={
                        chart.subtitle
                      }
                      series={
                        chart.series
                      }
                      minValue={
                        chart.minValue
                      }
                      maxValue={
                        chart.maxValue
                      }
                    />
                  )
                )}
              </div>

              <div>
                <SectionTitle
                  title="Evolución de EXP"
                  subtitle="Cada experiencia tiene su propio gráfico para que los saltos sean visibles"
                />

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-4

                    xl:grid-cols-2
                  "
                >
                  {expCharts.map(
                    (chart) => (
                      <EvolutionChart
                        key={
                          chart.key
                        }
                        title={
                          chart.title
                        }
                        subtitle={
                          chart.subtitle
                        }
                        series={
                          chart.series
                        }
                        minValue={
                          chart.minValue
                        }
                        maxValue={
                          chart.maxValue
                        }
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ESTADÍSTICAS */}

        <section className="mt-8">
          <SectionTitle
            title="Estadísticas actuales"
            subtitle="Último snapshot registrado"
          />

          <div
            className="
              grid
              grid-cols-2
              gap-3

              sm:grid-cols-3

              lg:grid-cols-6
            "
          >
            <StatCard
              label="Partidos"
              value={current.gam}
            />

            <StatCard
              label="Suplencias"
              value={current.sub}
            />

            <StatCard
              label="Minutos"
              value={current.min}
            />

            <StatCard
              label="MVP"
              value={current.mom}
            />

            <StatCard
              label="Goles"
              value={current.gls}
            />

            <StatCard
              label="Asistencias"
              value={current.ass}
            />

            <StatCard
              label="Disparos"
              value={current.sht}
            />

            <StatCard
              label="Entradas"
              value={current.ktk}
            />

            <StatCard
              label="Pases"
              value={current.kps}
            />

            <StatCard
              label="Paradas"
              value={current.sav}
            />

            <StatCard
              label="Goles recibidos"
              value={current.con}
            />

            <StatCard
              label="DP"
              value={current.dp}
            />
          </div>
        </section>

        {/* PROGRESIÓN */}

        <section className="mt-8">
          <SectionTitle
            title="Progresiones y regresiones"
            subtitle="Cambios de medias y experiencia"
          />

          <div
            className="
              mb-4
              grid
              grid-cols-2
              gap-3
            "
          >
            <SummaryCard
              label="Progresiones"
              value={
                progressions.length
              }
              positive
            />

            <SummaryCard
              label="Regresiones"
              value={
                regressions.length
              }
            />
          </div>

          <div
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-800
              bg-slate-900
            "
          >
            {progressionEvents.length ===
            0 ? (
              <EmptyState>
                No hay progresiones o regresiones registradas.
              </EmptyState>
            ) : (
              progressionEvents.map(
                (event) => {
                  const oldValue =
                    Number(
                      event.old_value
                    );

                  const newValue =
                    Number(
                      event.new_value
                    );

                  const difference =
                    newValue -
                    oldValue;

                  return (
                    <div
                      key={
                        event.id
                      }
                      className="
                        grid
                        grid-cols-[85px_1fr_auto]
                        items-center
                        gap-3
                        border-b
                        border-slate-800
                        px-4
                        py-4

                        last:border-b-0

                        sm:grid-cols-[120px_150px_1fr_auto]
                      "
                    >
                      <div className="text-xs text-slate-500">
                        {formatDate(
                          event.created_at
                        )}
                      </div>

                      <div className="font-bold text-white">
                        {eventLabel(
                          event.stat
                        )}
                      </div>

                      <div
                        className="
                          hidden
                          text-sm
                          text-slate-400

                          sm:block
                        "
                      >
                        {
                          event.old_value
                        }{" "}
                        →{" "}
                        {
                          event.new_value
                        }
                      </div>

                      <div
                        className={`
                          text-right
                          font-black
                          ${differenceClass(
                            difference
                          )}
                        `}
                      >
                        {signedValue(
                          difference
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* CLUBES */}

        <section className="mt-8">
          <SectionTitle
            title="Historial de clubes"
            subtitle="Movimientos detectados entre plantillas"
          />

          <div
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-800
              bg-slate-900
            "
          >
            {transfers.length ===
            0 ? (
              <EmptyState>
                Todavía no hay transferencias registradas.
              </EmptyState>
            ) : (
              transfers.map(
                (transfer) => (
                  <div
                    key={
                      transfer.id
                    }
                    className="
                      grid
                      grid-cols-1
                      gap-4
                      border-b
                      border-slate-800
                      p-4

                      last:border-b-0

                      sm:grid-cols-[1fr_auto_1fr_auto]
                      sm:items-center
                    "
                  >
                    <TeamTransfer
                      teamCode={
                        transfer.from_team_code
                      }
                    />

                    <div className="text-xl font-black text-blue-400">
                      →
                    </div>

                    <TeamTransfer
                      teamCode={
                        transfer.to_team_code
                      }
                    />

                    <div className="text-xs text-slate-500">
                      {formatDate(
                        transfer.transfer_date
                      )}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </section>

        {/* ACTIVIDAD */}

        <section className="mt-8">
          <SectionTitle
            title="Actividad reciente"
            subtitle="Todos los cambios detectados"
          />

          <div
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-800
              bg-slate-900
            "
          >
            {events.length ===
            0 ? (
              <EmptyState>
                Todavía no hay cambios registrados.
              </EmptyState>
            ) : (
              events.map(
                (event) => {
                  const oldValue =
                    Number(
                      event.old_value
                    );

                  const newValue =
                    Number(
                      event.new_value
                    );

                  const difference =
                    newValue -
                    oldValue;

                  return (
                    <div
                      key={
                        event.id
                      }
                      className="
                        grid
                        grid-cols-1
                        gap-2
                        border-b
                        border-slate-800
                        px-4
                        py-4

                        last:border-b-0

                        sm:grid-cols-[130px_180px_1fr_auto]
                        sm:items-center
                      "
                    >
                      <div className="text-xs text-slate-500">
                        {formatDate(
                          event.created_at
                        )}
                      </div>

                      <div className="font-semibold text-white">
                        {eventLabel(
                          event.stat
                        )}
                      </div>

                      <div className="text-sm text-slate-400">
                        {
                          event.old_value
                        }{" "}
                        →{" "}
                        {
                          event.new_value
                        }
                      </div>

                      <div
                        className={`
                          font-bold
                          ${differenceClass(
                            difference
                          )}
                        `}
                      >
                        {signedValue(
                          difference
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* HISTORIAL */}

        <section className="mt-8">
          <SectionTitle
            title="Historial completo"
            subtitle="Todos los snapshots guardados"
          />

          <div
            className="
              overflow-x-auto
              rounded-xl
              border
              border-slate-800
            "
          >
            <table
              className="
                w-full
                min-w-[1150px]
                text-sm
              "
            >
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <HistoryHeader>
                    Fecha
                  </HistoryHeader>

                  <HistoryHeader>
                    Equipo
                  </HistoryHeader>

                  <HistoryHeader>
                    Edad
                  </HistoryHeader>

                  <HistoryHeader>
                    GK
                  </HistoryHeader>

                  <HistoryHeader>
                    DF
                  </HistoryHeader>

                  <HistoryHeader>
                    MF
                  </HistoryHeader>

                  <HistoryHeader>
                    FW
                  </HistoryHeader>

                  <HistoryHeader>
                    Gam
                  </HistoryHeader>

                  <HistoryHeader>
                    Min
                  </HistoryHeader>

                  <HistoryHeader>
                    Gls
                  </HistoryHeader>

                  <HistoryHeader>
                    Ass
                  </HistoryHeader>

                  <HistoryHeader>
                    Fit
                  </HistoryHeader>
                </tr>
              </thead>

              <tbody>
                {snapshots.map(
                  (
                    snapshot,
                    index
                  ) => (
                    <tr
                      key={
                        snapshot.id
                      }
                      className={`
                        border-t
                        border-slate-800
                        text-center
                        text-white

                        ${
                          index === 0
                            ? "bg-blue-500/5"
                            : "bg-slate-900"
                        }
                      `}
                    >
                      <td
                        className="
                          whitespace-nowrap
                          px-3
                          py-3
                          text-left
                        "
                      >
                        {formatDate(
                          snapshot.snapshot_date
                        )}

                        {index === 0 && (
                          <span
                            className="
                              ml-2
                              rounded
                              bg-blue-500/15
                              px-2
                              py-1
                              text-[10px]
                              font-bold
                              uppercase
                              text-blue-400
                            "
                          >
                            Actual
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.team_code
                        }
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.age
                        }
                      </td>

                      <SkillHistoryCell
                        rating={
                          snapshot.st
                        }
                        exp={
                          snapshot.kab
                        }
                      />

                      <SkillHistoryCell
                        rating={
                          snapshot.tk
                        }
                        exp={
                          snapshot.tab
                        }
                      />

                      <SkillHistoryCell
                        rating={
                          snapshot.ps
                        }
                        exp={
                          snapshot.pab
                        }
                      />

                      <SkillHistoryCell
                        rating={
                          snapshot.sh
                        }
                        exp={
                          snapshot.sab
                        }
                      />

                      <td className="px-3 py-3">
                        {
                          snapshot.gam
                        }
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.min
                        }
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.gls
                        }
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.ass
                        }
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.fit
                        }
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  } catch (
    error
  ) {
    console.error(
      "Error cargando ficha de jugador:",
      error
    );

    notFound();
  }
}

/* =========================================================
   COLORES DE HABILIDADES

   St  / KAb = azul
   Tk  / TAb = verde
   Ps  / PAb = violeta
   Sh  / SAb = ámbar
========================================================= */

function getSeriesColorClass(
  label: string
) {
  const normalized =
    label.toUpperCase();

  if (
    normalized === "GK" ||
    normalized === "KAB"
  ) {
    return "text-blue-400";
  }

  if (
    normalized === "DF" ||
    normalized === "TAB"
  ) {
    return "text-emerald-400";
  }

  if (
    normalized === "MF" ||
    normalized === "PAB"
  ) {
    return "text-violet-400";
  }

  if (
    normalized === "FW" ||
    normalized === "SAB"
  ) {
    return "text-amber-400";
  }

  return "text-slate-300";
}

/* =========================================================
   GRÁFICA
========================================================= */

function EvolutionChart({
  title,
  subtitle,
  series,
  minValue,
  maxValue,
}: {
  title: string;
  subtitle: string;
  series: ChartSeries[];
  minValue?: number;
  maxValue?: number;
}) {
  const width =
    760;

  const height =
    300;

  const padding =
    42;

  const allValues =
    series.flatMap(
      (serie) =>
        serie.points.map(
          (point) =>
            point.value
        )
    );

  const min =
    minValue ??
    Math.min(
      ...allValues
    );

  const max =
    maxValue ??
    Math.max(
      ...allValues
    );

  const range =
    Math.max(
      1,
      max - min
    );

  const labels =
    series[0]?.points ??
    [];

  function xPosition(
    index: number,
    total: number
  ) {
    if (
      total <= 1
    ) {
      return width / 2;
    }

    return (
      padding +
      (index /
        (total - 1)) *
        (width -
          padding * 2)
    );
  }

  function yPosition(
    value: number
  ) {
    return (
      padding +
      (1 -
        (value - min) /
          range) *
        (height -
          padding * 2)
    );
  }

  const dashStyles = [
    undefined,
    "10 5",
    "4 4",
    "12 4 3 4",
  ];

  return (
    <div
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-800
        bg-slate-900
      "
    >
      <div
        className="
          border-b
          border-slate-800
          px-5
          py-4
        "
      >
        <h3 className="font-bold text-white">
          {
            title
          }
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {
            subtitle
          }
        </p>
      </div>

      <div
        className="
          flex
          flex-wrap
          gap-2
          px-5
          pt-4
        "
      >
        {series.map(
          (
            serie
          ) => (
            <div
              key={
                serie.label
              }
              className="
                flex
                items-center
                gap-2
                rounded-md
                bg-slate-950
                px-3
                py-1
                text-xs
                font-bold
                text-slate-300
              "
            >
              <span
                className={
                  getSeriesColorClass(
                    serie.label
                  )
                }
              >
                ●
              </span>

              {
                serie.label
              }
            </div>
          )
        )}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="
            w-full
            min-w-[680px]
          "
        >
          {[0, 1, 2, 3, 4].map(
            (step) => {
              const ratio =
                step / 4;

              const y =
                padding +
                ratio *
                  (height -
                    padding *
                      2);

              const value =
                Math.round(
                  max -
                    ratio *
                      range
                );

              return (
                <g
                  key={
                    step
                  }
                >
                  <line
                    x1={
                      padding
                    }
                    y1={
                      y
                    }
                    x2={
                      width -
                      padding
                    }
                    y2={
                      y
                    }
                    stroke="currentColor"
                    strokeOpacity="0.12"
                    className="text-slate-400"
                  />

                  <text
                    x="8"
                    y={
                      y + 4
                    }
                    className="
                      fill-slate-500
                      text-[10px]
                    "
                  >
                    {
                      value
                    }
                  </text>
                </g>
              );
            }
          )}

          {series.map(
            (
              serie,
              seriesIndex
            ) => {
              const points =
                serie.points
                  .map(
                    (
                      point,
                      index
                    ) =>
                      `${xPosition(
                        index,
                        serie.points.length
                      )},${yPosition(
                        point.value
                      )}`
                  )
                  .join(" ");

              return (
                <polyline
                  key={
                    serie.label
                  }
                  points={
                    points
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={
                    dashStyles[
                      seriesIndex
                    ]
                  }
                  className={
                    getSeriesColorClass(
                      serie.label
                    )
                  }
                  vectorEffect="non-scaling-stroke"
                />
              );
            }
          )}

          {series.map(
            (
              serie
            ) =>
              serie.points.map(
                (
                  point,
                  index
                ) => (
                  <circle
                    key={`${serie.label}-${index}`}
                    cx={
                      xPosition(
                        index,
                        serie.points.length
                      )
                    }
                    cy={
                      yPosition(
                        point.value
                      )
                    }
                    r="4"
                    fill="currentColor"
                    className={
                    getSeriesColorClass(
                      serie.label
                    )
                  }
                  >
                    <title>
                      {`${serie.label} · ${point.label}: ${point.value}`}
                    </title>
                  </circle>
                )
              )
          )}

          {labels.map(
            (
              point,
              index
            ) => {
              const interval =
                Math.max(
                  1,
                  Math.ceil(
                    labels.length /
                      6
                  )
                );

              const visible =
                index === 0 ||
                index ===
                  labels.length -
                    1 ||
                index %
                  interval ===
                  0;

              if (
                !visible
              ) {
                return null;
              }

              return (
                <text
                  key={`${point.label}-${index}`}
                  x={
                    xPosition(
                      index,
                      labels.length
                    )
                  }
                  y={
                    height -
                    8
                  }
                  textAnchor="middle"
                  className="
                    fill-slate-500
                    text-[10px]
                  "
                >
                  {
                    point.label
                  }
                </text>
              );
            }
          )}
        </svg>
      </div>

      <div
        className="
          border-t
          border-slate-800
          px-5
          py-3
          text-xs
          text-slate-500
        "
      >
        Sitúa el cursor sobre un punto para consultar su valor exacto.
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTES
========================================================= */

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h2
        className="
          text-lg
          font-bold
          text-white

          sm:text-xl
        "
      >
        {
          title
        }
      </h2>

      {subtitle && (
        <p
          className="
            mt-1
            text-xs
            text-slate-500

            sm:text-sm
          "
        >
          {
            subtitle
          }
        </p>
      )}
    </div>
  );
}

function HeaderCounter({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-950
        p-3
        text-center
      "
    >
      <div className="text-xl font-black text-white">
        {
          value
        }
      </div>

      <div
        className="
          mt-1
          text-[10px]
          font-bold
          uppercase
          text-slate-500
        "
      >
        {
          label
        }
      </div>
    </div>
  );
}

function SkillCard({
  label,
  rating,
  exp,
  difference,
}: {
  label: string;
  rating: number;
  exp: number;
  difference: number;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-900
        p-5
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
        "
      >
        <span className="text-xs font-bold text-slate-500">
          {
            label
          }
        </span>

        {difference !==
          0 && (
          <span
            className={`
              text-xs
              font-black
              ${differenceClass(
                difference
              )}
            `}
          >
            {signedValue(
              difference
            )}
          </span>
        )}
      </div>

      <div
        className="
          mt-2
          flex
          items-baseline
          gap-2
        "
      >
        <span
          className={`
            text-3xl
            font-black

            ${
              rating >= 16
                ? "text-emerald-400"
                : "text-white"
            }
          `}
        >
          {
            rating
          }
        </span>

        <span className="text-sm text-slate-400">
          ({exp})
        </span>
      </div>
    </div>
  );
}

function EvolutionCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-900
        p-4
        text-center
      "
    >
      <div className="text-xs font-bold text-slate-500">
        {
          label
        }
      </div>

      <div
        className={`
          mt-2
          text-xl
          font-black
          ${differenceClass(
            value
          )}
        `}
      >
        {signedValue(
          value
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-900
        p-4
      "
    >
      <div className="text-xs text-slate-500">
        {
          label
        }
      </div>

      <div className="mt-1 text-xl font-bold text-white">
        {
          value
        }
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-900
        p-4
      "
    >
      <div className="text-xs text-slate-500">
        {
          label
        }
      </div>

      <div
        className={`
          mt-1
          text-2xl
          font-black

          ${
            positive
              ? "text-emerald-400"
              : "text-red-400"
          }
        `}
      >
        {
          value
        }
      </div>
    </div>
  );
}

function TeamTransfer({
  teamCode,
}: {
  teamCode:
    | string
    | null;
}) {
  if (!teamCode) {
    return (
      <div className="font-semibold text-slate-500">
        Sin club
      </div>
    );
  }

  const name =
    getClubName(
      teamCode
    );

  const logo =
    getClubLogo(
      teamCode
    );

  return (
    <div className="flex items-center gap-3">
      <div
        className="
          relative
          h-10
          w-10
          shrink-0
        "
      >
        <Image
          src={
            logo
          }
          alt={
            name
          }
          fill
          sizes="40px"
          className="object-contain"
        />
      </div>

      <div>
        <div className="text-sm font-bold text-white">
          {
            name
          }
        </div>

        <div className="text-xs text-slate-500">
          {
            teamCode
          }
        </div>
      </div>
    </div>
  );
}

function EmptyStateBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-900
        p-6
        text-sm
        text-slate-500
      "
    >
      {
        children
      }
    </div>
  );
}

function EmptyState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="p-6 text-sm text-slate-500">
      {
        children
      }
    </div>
  );
}

function HistoryHeader({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th
      className="
        whitespace-nowrap
        px-3
        py-3
        text-center
        text-xs
        font-bold
      "
    >
      {
        children
      }
    </th>
  );
}

function SkillHistoryCell({
  rating,
  exp,
}: {
  rating: number;
  exp: number;
}) {
  return (
    <td className="px-3 py-3">
      <span
        className={
          rating >= 16
            ? "font-bold text-emerald-400"
            : ""
        }
      >
        {
          rating
        }
      </span>

      <span className="text-slate-500">
        {" "}
        ({exp})
      </span>
    </td>
  );
}