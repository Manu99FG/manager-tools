import {
  notFound,
} from "next/navigation";

import {
  getPlayerPageData,
} from "@/lib/player-history";

import {
  getPlayerProfile,
} from "@/lib/esms-player";

export const dynamic =
  "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

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

function eventLabel(
  stat: string
) {
  const labels:
    Record<
      string,
      string
    > = {
      st: "St",
      tk: "Tk",
      ps: "Ps",
      sh: "Sh",

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

    const position =
      getPlayerProfile({
        name:
          player.esms_name,

        age:
          current.age,

        nat:
          player.nationality,

        st:
          current.st,

        tk:
          current.tk,

        ps:
          current.ps,

        sh:
          current.sh,

        ag:
          current.ag,

        kab:
          current.kab,

        tab:
          current.tab,

        pab:
          current.pab,

        sab:
          current.sab,

        gam:
          current.gam,

        sub:
          current.sub,

        min:
          current.min,

        mom:
          current.mom,

        sav:
          current.sav,

        con:
          current.con,

        ktk:
          current.ktk,

        kps:
          current.kps,

        sht:
          current.sht,

        gls:
          current.gls,

        ass:
          current.ass,

        dp:
          current.dp,

        inj:
          current.inj,

        sus:
          current.sus,

        fit:
          current.fit,

        rawLine:
          "",
      });

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
        {/* CABECERA */}

        <div
          className="
            rounded-xl
            border
            border-slate-800
            bg-slate-900
            p-5

            sm:p-6
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3

              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >
            <div>
              <h1
                className="
                  text-3xl
                  font-bold
                  text-white
                "
              >
                {
                  player.esms_name
                }
              </h1>

              <div
                className="
                  mt-2
                  flex
                  flex-wrap
                  gap-2
                  text-sm
                  text-slate-400
                "
              >
                <span>
                  {
                    player.nationality.toUpperCase()
                  }
                </span>

                <span>•</span>

                <span>
                  {
                    current.age
                  }{" "}
                  años
                </span>

                <span>•</span>

                <span>
                  {
                    position
                  }
                </span>

                <span>•</span>

                <span>
                  {
                    current.team_code
                  }
                </span>
              </div>
            </div>

            <div
              className="
                text-sm
                text-slate-500
              "
            >
              {
                snapshots.length
              }{" "}
              registros
            </div>
          </div>
        </div>

        {/* MEDIAS */}

        <section className="mt-6">
          <h2
            className="
              mb-3
              text-lg
              font-bold
              text-white
            "
          >
            Nivel actual
          </h2>

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
            />

            <SkillCard
              label="DF"
              rating={
                current.tk
              }
              exp={
                current.tab
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
            />

            <SkillCard
              label="FW"
              rating={
                current.sh
              }
              exp={
                current.sab
              }
            />
          </div>
        </section>

        {/* ESTADÍSTICAS */}

        <section className="mt-8">
          <h2
            className="
              mb-3
              text-lg
              font-bold
              text-white
            "
          >
            Estadísticas actuales
          </h2>

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
              value={
                current.gam
              }
            />

            <StatCard
              label="Minutos"
              value={
                current.min
              }
            />

            <StatCard
              label="Goles"
              value={
                current.gls
              }
            />

            <StatCard
              label="Asistencias"
              value={
                current.ass
              }
            />

            <StatCard
              label="MVP"
              value={
                current.mom
              }
            />

            <StatCard
              label="Disparos"
              value={
                current.sht
              }
            />
          </div>
        </section>

        {/* TRANSFERENCIAS */}

        <section className="mt-8">
          <h2
            className="
              mb-3
              text-lg
              font-bold
              text-white
            "
          >
            Transferencias
          </h2>

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
              <div
                className="
                  p-6
                  text-sm
                  text-slate-500
                "
              >
                Todavía no hay transferencias registradas.
              </div>
            ) : (
              transfers.map(
                (
                  transfer
                ) => (
                  <div
                    key={
                      transfer.id
                    }
                    className="
                      flex
                      flex-col
                      gap-1
                      border-b
                      border-slate-800
                      px-4
                      py-4

                      last:border-b-0

                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div
                      className="
                        font-semibold
                        text-white
                      "
                    >
                      {transfer.from_team_code ??
                        "Sin club"}{" "}
                      →{" "}
                      {
                        transfer.to_team_code
                      }
                    </div>

                    <div
                      className="
                        text-xs
                        text-slate-500
                      "
                    >
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

        {/* EVOLUCIÓN */}

        <section className="mt-8">
          <h2
            className="
              mb-3
              text-lg
              font-bold
              text-white
            "
          >
            Evolución
          </h2>

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
              <div
                className="
                  p-6
                  text-sm
                  text-slate-500
                "
              >
                Todavía no hay cambios registrados.
              </div>
            ) : (
              events.map(
                (event) => {
                  const oldNumber =
                    Number(
                      event.old_value
                    );

                  const newNumber =
                    Number(
                      event.new_value
                    );

                  const difference =
                    newNumber -
                    oldNumber;

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

                        sm:grid-cols-[150px_1fr_auto]
                        sm:items-center
                      "
                    >
                      <div
                        className="
                          text-xs
                          text-slate-500
                        "
                      >
                        {formatDate(
                          event.created_at
                        )}
                      </div>

                      <div>
                        <span
                          className="
                            font-semibold
                            text-white
                          "
                        >
                          {eventLabel(
                            event.stat
                          )}
                        </span>

                        <span
                          className="
                            ml-3
                            text-sm
                            text-slate-400
                          "
                        >
                          {
                            event.old_value
                          }{" "}
                          →{" "}
                          {
                            event.new_value
                          }
                        </span>
                      </div>

                      <div
                        className={
                          difference >
                          0
                            ? "font-bold text-emerald-400"
                            : difference <
                                0
                              ? "font-bold text-red-400"
                              : "text-slate-500"
                        }
                      >
                        {difference >
                        0
                          ? "+"
                          : ""}
                        {
                          difference
                        }
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* SNAPSHOTS */}

        <section className="mt-8">
          <h2
            className="
              mb-3
              text-lg
              font-bold
              text-white
            "
          >
            Historial completo
          </h2>

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
                min-w-[950px]
                text-sm
              "
            >
              <thead
                className="
                  bg-slate-800
                  text-slate-300
                "
              >
                <tr>
                  <th className="px-3 py-3 text-left">
                    Fecha
                  </th>

                  <th className="px-3 py-3">
                    Equipo
                  </th>

                  <th className="px-3 py-3">
                    Edad
                  </th>

                  <th className="px-3 py-3">
                    St
                  </th>

                  <th className="px-3 py-3">
                    Tk
                  </th>

                  <th className="px-3 py-3">
                    Ps
                  </th>

                  <th className="px-3 py-3">
                    Sh
                  </th>

                  <th className="px-3 py-3">
                    Min
                  </th>

                  <th className="px-3 py-3">
                    Gls
                  </th>

                  <th className="px-3 py-3">
                    Ass
                  </th>

                  <th className="px-3 py-3">
                    Fit
                  </th>
                </tr>
              </thead>

              <tbody>
                {snapshots.map(
                  (
                    snapshot
                  ) => (
                    <tr
                      key={
                        snapshot.id
                      }
                      className="
                        border-t
                        border-slate-800
                        bg-slate-900
                        text-center
                        text-white
                      "
                    >
                      <td
                        className="
                          px-3
                          py-3
                          text-left
                        "
                      >
                        {formatDate(
                          snapshot.snapshot_date
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

                      <td className="px-3 py-3">
                        {
                          snapshot.st
                        }{" "}
                        (
                        {
                          snapshot.kab
                        }
                        )
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.tk
                        }{" "}
                        (
                        {
                          snapshot.tab
                        }
                        )
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.ps
                        }{" "}
                        (
                        {
                          snapshot.pab
                        }
                        )
                      </td>

                      <td className="px-3 py-3">
                        {
                          snapshot.sh
                        }{" "}
                        (
                        {
                          snapshot.sab
                        }
                        )
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
  } catch {
    notFound();
  }
}

function SkillCard({
  label,
  rating,
  exp,
}: {
  label: string;
  rating: number;
  exp: number;
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
          text-xs
          font-bold
          uppercase
          tracking-wide
          text-slate-500
        "
      >
        {label}
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
          className="
            text-3xl
            font-bold
            text-white
          "
        >
          {rating}
        </span>

        <span
          className="
            text-sm
            text-slate-400
          "
        >
          ({exp})
        </span>
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
      <div
        className="
          text-xs
          text-slate-500
        "
      >
        {label}
      </div>

      <div
        className="
          mt-1
          text-xl
          font-bold
          text-white
        "
      >
        {value}
      </div>
    </div>
  );
}