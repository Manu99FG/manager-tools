"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  GlobalEsmsPlayer,
} from "@/lib/all-players";

import {
  getPlayerProfile,
  getTieFallbackPosition,
  hasMainRatingTie,
  type EsmsPosition,
} from "@/lib/esms-player";

import FootballPitch from "@/components/FootballPitch";

import BenchSelector, {
  type BenchSlot,
} from "@/components/BenchSelector";

import StrategyBuilder, {
  type Strategy,
} from "@/components/StrategyBuilder";

import PlayerNameLink from "@/components/PlayerNameLink";

/* =========================================================
   TIPOS
========================================================= */

type AssignedPosition =
  | ""
  | "GK"
  | "DF"
  | "DM"
  | "MF"
  | "AM"
  | "FW";

type CreatorTab =
  | "starters"
  | "subs"
  | "changes";

type TacticalStyle =
  | "N"
  | "A"
  | "C"
  | "D"
  | "E"
  | "L"
  | "P";

type Props = {
  players: GlobalEsmsPlayer[];
};

/* =========================================================
   CONSTANTES
========================================================= */

const ASSIGNED_POSITIONS: {
  value: AssignedPosition;
  label: string;
}[] = [
  {
    value: "",
    label: "-",
  },
  {
    value: "GK",
    label: "GK",
  },
  {
    value: "DF",
    label: "DF",
  },
  {
    value: "DM",
    label: "DM",
  },
  {
    value: "MF",
    label: "MF",
  },
  {
    value: "AM",
    label: "AM",
  },
  {
    value: "FW",
    label: "FW",
  },
];

const TACTICS: {
  value: TacticalStyle;
  label: string;
}[] = [
  {
    value: "N",
    label: "N - Normal",
  },
  {
    value: "A",
    label: "A - Ataque",
  },
  {
    value: "D",
    label: "D - Defensa",
  },
  {
    value: "C",
    label: "C - Contraataque",
  },
  {
    value: "L",
    label: "L - Juego largo",
  },
  {
    value: "P",
    label: "P - Pases",
  },
  {
    value: "E",
    label: "E - Europea",
  },
];

const POSITION_ORDER: Record<
  EsmsPosition,
  number
> = {
  GK: 0,
  DF: 1,
  DM: 2,
  MF: 3,
  AM: 4,
  FW: 5,
};

/* =========================================================
   HELPERS
========================================================= */

function getPlayerKey(
  player: GlobalEsmsPlayer
) {
  return `${player.teamCode}:${player.name}`;
}

function createEmptyBench(): BenchSlot[] {
  return Array.from(
    {
      length: 5,
    },
    (_, index) => ({
      id: index + 1,
      position: "",
      playerKey: "",
    })
  );
}

function getPositionStorageKey(
  player: GlobalEsmsPlayer
) {
  return `manager-tools-position:${player.teamCode}:${player.name}`;
}

function getPositionClass(
  position:
    | EsmsPosition
    | AssignedPosition
) {
  switch (position) {
    case "GK":
      return `
        border-yellow-500/40
        bg-yellow-500/10
        text-yellow-300
      `;

    case "DF":
      return `
        border-blue-500/40
        bg-blue-500/10
        text-blue-300
      `;

    case "DM":
      return `
        border-cyan-500/40
        bg-cyan-500/10
        text-cyan-300
      `;

    case "MF":
      return `
        border-emerald-500/40
        bg-emerald-500/10
        text-emerald-300
      `;

    case "AM":
      return `
        border-violet-500/40
        bg-violet-500/10
        text-violet-300
      `;

    case "FW":
      return `
        border-red-500/40
        bg-red-500/10
        text-red-300
      `;

    default:
      return `
        border-slate-700
        bg-slate-800
        text-slate-300
      `;
  }
}

function getRatingClass(
  value: number
) {
  if (value >= 16) {
    return "font-bold text-emerald-400";
  }

  return "text-slate-300";
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function ShtCreator({
  players,
}: Props) {
  const [
    selectedTeam,
    setSelectedTeam,
  ] = useState("");

  const [
    tacticalStyle,
    setTacticalStyle,
  ] =
    useState<TacticalStyle>(
      "N"
    );

  const [
    hideUnavailable,
    setHideUnavailable,
  ] = useState(false);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<CreatorTab>(
      "starters"
    );

  const [
    assignedPositions,
    setAssignedPositions,
  ] = useState<
    Record<
      string,
      AssignedPosition
    >
  >({});

  const [
    bench,
    setBench,
  ] =
    useState<BenchSlot[]>(
      createEmptyBench()
    );

  const [
    strategies,
    setStrategies,
  ] =
    useState<Strategy[]>([]);

  const [
    positions,
    setPositions,
  ] = useState<
    Record<
      string,
      EsmsPosition
    >
  >({});

  /* =======================================================
     POSICIONES NATURALES
  ======================================================= */

  useEffect(() => {
    const nextPositions: Record<
      string,
      EsmsPosition
    > = {};

    for (
      const player of players
    ) {
      const key =
        getPlayerKey(
          player
        );

      const storageKey =
        getPositionStorageKey(
          player
        );

      const calculated =
        getPlayerProfile(
          player
        );

      if (
        typeof window ===
        "undefined"
      ) {
        nextPositions[key] =
          calculated;

        continue;
      }

      if (
        hasMainRatingTie(
          player
        )
      ) {
        const saved =
          window.localStorage.getItem(
            storageKey
          ) as EsmsPosition | null;

        if (
          saved &&
          [
            "GK",
            "DF",
            "DM",
            "MF",
            "AM",
            "FW",
          ].includes(
            saved
          )
        ) {
          nextPositions[key] =
            saved;
        } else {
          const fallback =
            getTieFallbackPosition(
              player
            );

          nextPositions[key] =
            fallback;

          window.localStorage.setItem(
            storageKey,
            fallback
          );
        }
      } else {
        nextPositions[key] =
          calculated;

        window.localStorage.setItem(
          storageKey,
          calculated
        );
      }
    }

    setPositions(
      nextPositions
    );
  }, [players]);

  /* =======================================================
     EQUIPOS
  ======================================================= */

  const teams =
    useMemo(() => {
      const teamMap =
        new Map<
          string,
          string
        >();

      for (
        const player of players
      ) {
        if (
          !teamMap.has(
            player.teamCode
          )
        ) {
          teamMap.set(
            player.teamCode,
            player.teamName
          );
        }
      }

      return Array.from(
        teamMap.entries()
      )
        .map(
          ([
            code,
            name,
          ]) => ({
            code,
            name,
          })
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name
            )
        );
    }, [players]);

  /* =======================================================
     RESOLVER POSICIÓN NATURAL
  ======================================================= */

  function resolvePosition(
    player: GlobalEsmsPlayer
  ): EsmsPosition {
    return (
      positions[
        getPlayerKey(
          player
        )
      ] ??
      getPlayerProfile(
        player
      )
    );
  }

  /* =======================================================
     JUGADORES DEL EQUIPO
  ======================================================= */

  const teamPlayers =
    useMemo(() => {
      if (
        !selectedTeam
      ) {
        return [];
      }

      return players
        .filter(
          (player) =>
            player.teamCode ===
            selectedTeam
        )
        .sort(
          (a, b) => {
            const positionA =
              positions[
                getPlayerKey(
                  a
                )
              ] ??
              getPlayerProfile(
                a
              );

            const positionB =
              positions[
                getPlayerKey(
                  b
                )
              ] ??
              getPlayerProfile(
                b
              );

            const order =
              POSITION_ORDER[
                positionA
              ] -
              POSITION_ORDER[
                positionB
              ];

            if (
              order !== 0
            ) {
              return order;
            }

            const ratingA =
              Math.max(
                a.st,
                a.tk,
                a.ps,
                a.sh
              );

            const ratingB =
              Math.max(
                b.st,
                b.tk,
                b.ps,
                b.sh
              );

            if (
              ratingA !==
              ratingB
            ) {
              return (
                ratingB -
                ratingA
              );
            }

            return a.name.localeCompare(
              b.name
            );
          }
        );
    }, [
      players,
      selectedTeam,
      positions,
    ]);

  /* =======================================================
     OCULTAR BAJAS
  ======================================================= */

  const visiblePlayers =
    useMemo(() => {
      if (
        !hideUnavailable
      ) {
        return teamPlayers;
      }

      return teamPlayers.filter(
        (player) =>
          player.sus <= 0 &&
          player.inj <= 0
      );
    }, [
      teamPlayers,
      hideUnavailable,
    ]);

  /* =======================================================
     REINICIAR AL CAMBIAR EQUIPO
  ======================================================= */

  useEffect(() => {
    setAssignedPositions(
      {}
    );

    setBench(
      createEmptyBench()
    );

    setStrategies([]);

    setActiveTab(
      "starters"
    );
  }, [selectedTeam]);

  /* =======================================================
     TITULARES
  ======================================================= */

  const selectedStarters =
    useMemo(() => {
      return teamPlayers.filter(
        (player) => {
          const key =
            getPlayerKey(
              player
            );

          return Boolean(
            assignedPositions[
              key
            ]
          );
        }
      );
    }, [
      teamPlayers,
      assignedPositions,
    ]);

  /* =======================================================
     ERROR CORREGIDO:
     BenchSelector espera string[]
  ======================================================= */

  const startersKeys =
    useMemo(() => {
      return selectedStarters.map(
        (player) =>
          getPlayerKey(
            player
          )
      );
    }, [
      selectedStarters,
    ]);

  /* =======================================================
     CAMPO
  ======================================================= */

  const pitchPlayers =
    useMemo(() => {
      return selectedStarters.map(
        (player) => {
          const key =
            getPlayerKey(
              player
            );

          const assignedPosition =
            assignedPositions[
              key
            ];

          return {
            player,
            position:
              assignedPosition as Exclude<
                AssignedPosition,
                ""
              >,
          };
        }
      );
    }, [
      selectedStarters,
      assignedPositions,
    ]);

  /* =======================================================
     BANQUILLO COMPLETO
  ======================================================= */

  const completedBench =
    useMemo(() => {
      return bench.filter(
        (slot) =>
          slot.position !==
            "" &&
          slot.playerKey !==
            ""
      );
    }, [bench]);

  /* =======================================================
     ASIGNAR POSICIÓN
  ======================================================= */

  function handleAssignedPosition(
    player:
      GlobalEsmsPlayer,
    position:
      AssignedPosition
  ) {
    const key =
      getPlayerKey(
        player
      );

    setAssignedPositions(
      (previous) => ({
        ...previous,

        [key]:
          position,
      })
    );

    if (
      position !== ""
    ) {
      setBench(
        (previous) =>
          previous.map(
            (slot) =>
              slot.playerKey ===
              key
                ? {
                    ...slot,
                    playerKey:
                      "",
                  }
                : slot
          )
      );
    }
  }

  /* =======================================================
     GENERAR
  ======================================================= */

  function handleGenerate() {
    if (
      !selectedTeam
    ) {
      alert(
        "Selecciona un equipo."
      );

      return;
    }

    if (
      selectedStarters.length !==
      11
    ) {
      alert(
        `Debes seleccionar exactamente 11 titulares. Actualmente tienes ${selectedStarters.length}.`
      );

      return;
    }

    const goalkeeperCount =
      pitchPlayers.filter(
        (item) =>
          item.position ===
          "GK"
      ).length;

    if (
      goalkeeperCount !==
      1
    ) {
      alert(
        "Debes seleccionar exactamente 1 portero titular."
      );

      return;
    }

    if (
      completedBench.length !==
      5
    ) {
      alert(
        `Debes completar los 5 jugadores del banquillo. Actualmente tienes ${completedBench.length}.`
      );

      return;
    }

    alert(
      `Alineación válida.\n\nEquipo: ${selectedTeam}\nTáctica: ${tacticalStyle}\nTitulares: ${selectedStarters.length}\nSuplentes: ${completedBench.length}\nEstrategias: ${strategies.length}\n\nEl siguiente paso será generar el archivo .sht real.`
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        grid
        min-h-[720px]
        grid-cols-1
        overflow-hidden
        rounded-xl
        border
        border-slate-800
        bg-slate-900

        xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,1fr)]
      "
    >
      {/* ===================================================
          PANEL IZQUIERDO
      =================================================== */}

      <div
        className="
          min-w-0
          border-b
          border-slate-800

          xl:border-b-0
          xl:border-r
        "
      >
        {/* CONTROLES */}

        <div
          className="
            border-b
            border-slate-800
            p-4
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-3

              sm:grid-cols-2

              lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_auto_auto]
              lg:items-end
            "
          >
            {/* EQUIPO */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-slate-500
                "
              >
                Equipo
              </label>

              <select
                value={
                  selectedTeam
                }
                onChange={(
                  event
                ) =>
                  setSelectedTeam(
                    event.target
                      .value
                  )
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-700
                  bg-slate-950
                  px-3
                  py-2.5
                  text-sm
                  text-white
                  outline-none

                  focus:border-blue-500
                "
              >
                <option value="">
                  Selecciona un equipo
                </option>

                {teams.map(
                  (team) => (
                    <option
                      key={
                        team.code
                      }
                      value={
                        team.code
                      }
                    >
                      {
                        team.name
                      }{" "}
                      (
                      {
                        team.code
                      }
                      )
                    </option>
                  )
                )}
              </select>
            </div>

            {/* TÁCTICA */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-slate-500
                "
              >
                Táctica inicial
              </label>

              <select
                value={
                  tacticalStyle
                }
                onChange={(
                  event
                ) =>
                  setTacticalStyle(
                    event.target
                      .value as TacticalStyle
                  )
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-700
                  bg-slate-950
                  px-3
                  py-2.5
                  text-sm
                  text-white
                  outline-none

                  focus:border-blue-500
                "
              >
                {TACTICS.map(
                  (tactic) => (
                    <option
                      key={
                        tactic.value
                      }
                      value={
                        tactic.value
                      }
                    >
                      {
                        tactic.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* OCULTAR BAJAS */}

            <label
              className="
                flex
                min-h-[42px]
                cursor-pointer
                items-center
                gap-2
                rounded-lg
                border
                border-slate-700
                bg-slate-950
                px-3
                text-sm
                text-slate-300
              "
            >
              <input
                type="checkbox"
                checked={
                  hideUnavailable
                }
                onChange={(
                  event
                ) =>
                  setHideUnavailable(
                    event.target
                      .checked
                  )
                }
                className="
                  h-4
                  w-4
                  accent-blue-500
                "
              />

              Ocultar bajas
            </label>

            {/* GENERAR */}

            <button
              type="button"
              onClick={
                handleGenerate
              }
              className="
                min-h-[42px]
                rounded-lg
                bg-blue-600
                px-5
                text-sm
                font-bold
                text-white
                transition

                hover:bg-blue-500
              "
            >
              Generar
            </button>
          </div>
        </div>

        {/* SIN EQUIPO */}

        {!selectedTeam && (
          <div
            className="
              flex
              min-h-[500px]
              items-center
              justify-center
              p-8
              text-center
            "
          >
            <div>
              <div
                className="
                  text-lg
                  font-bold
                  text-white
                "
              >
                Selecciona un equipo
              </div>

              <p
                className="
                  mt-2
                  max-w-md
                  text-sm
                  text-slate-500
                "
              >
                Selecciona una plantilla
                para comenzar a crear
                la alineación.
              </p>
            </div>
          </div>
        )}

        {/* PLANTILLA */}

        {selectedTeam && (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[940px]
                border-collapse
              "
            >
              <thead
                className="
                  bg-slate-950/80
                "
              >
                <tr
                  className="
                    border-b
                    border-slate-800
                  "
                >
                  <TableHeader>
                    Sel.
                  </TableHeader>

                  <TableHeader>
                    Pos
                  </TableHeader>

                  <TableHeader
                    align="left"
                  >
                    Nombre
                  </TableHeader>

                  <TableHeader>
                    GK
                  </TableHeader>

                  <TableHeader>
                    DF
                  </TableHeader>

                  <TableHeader>
                    MF
                  </TableHeader>

                  <TableHeader>
                    FW
                  </TableHeader>

                  <TableHeader>
                    Sus
                  </TableHeader>

                  <TableHeader>
                    Inj
                  </TableHeader>

                  <TableHeader>
                    Fit
                  </TableHeader>
                </tr>
              </thead>

              <tbody>
                {visiblePlayers.map(
                  (player) => {
                    const key =
                      getPlayerKey(
                        player
                      );

                    const naturalPosition =
                      resolvePosition(
                        player
                      );

                    const assignedPosition =
                      assignedPositions[
                        key
                      ] ?? "";

                    return (
                      <tr
                        key={
                          key
                        }
                        className="
                          border-b
                          border-slate-800/70
                          transition

                          hover:bg-slate-800/40
                        "
                      >
                        {/* SELECCIÓN */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                          "
                        >
                          <select
                            value={
                              assignedPosition
                            }
                            onChange={(
                              event
                            ) =>
                              handleAssignedPosition(
                                player,
                                event
                                  .target
                                  .value as AssignedPosition
                              )
                            }
                            className={`
                              w-[68px]
                              rounded-md
                              border
                              px-2
                              py-1.5
                              text-xs
                              font-bold
                              outline-none

                              ${getPositionClass(
                                assignedPosition
                              )}
                            `}
                          >
                            {ASSIGNED_POSITIONS.map(
                              (
                                option
                              ) => (
                                <option
                                  key={
                                    option.value ||
                                    "none"
                                  }
                                  value={
                                    option.value
                                  }
                                  className="
                                    bg-slate-950
                                    text-white
                                  "
                                >
                                  {
                                    option.label
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        {/* POSICIÓN NATURAL */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                          "
                        >
                          <span
                            className={`
                              inline-flex
                              min-w-[42px]
                              items-center
                              justify-center
                              rounded-md
                              border
                              px-2
                              py-1
                              text-xs
                              font-bold

                              ${getPositionClass(
                                naturalPosition
                              )}
                            `}
                          >
                            {
                              naturalPosition
                            }
                          </span>
                        </td>

                        {/* NOMBRE CLICABLE */}

                        <td
                          className="
                            px-3
                            py-2
                            text-left
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              gap-1
                            "
                          >
                            <PlayerNameLink
                              playerId={
                                player.playerId
                              }
                              name={
                                player.name
                              }
                              className="
                                font-semibold
                                text-slate-100
                              "
                            />

                            <span
                              className="
                                text-xs
                                text-slate-500
                              "
                            >
                              (
                              {
                                player.age
                              }
                              )
                            </span>
                          </div>
                        </td>

                        {/* GK */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                            text-sm
                          "
                        >
                          <span
                            className={
                              getRatingClass(
                                player.st
                              )
                            }
                          >
                            {
                              player.st
                            }
                          </span>

                          <span
                            className="
                              ml-1
                              text-xs
                              text-slate-500
                            "
                          >
                            (
                            {
                              player.kab
                            }
                            )
                          </span>
                        </td>

                        {/* DF */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                            text-sm
                          "
                        >
                          <span
                            className={
                              getRatingClass(
                                player.tk
                              )
                            }
                          >
                            {
                              player.tk
                            }
                          </span>

                          <span
                            className="
                              ml-1
                              text-xs
                              text-slate-500
                            "
                          >
                            (
                            {
                              player.tab
                            }
                            )
                          </span>
                        </td>

                        {/* MF */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                            text-sm
                          "
                        >
                          <span
                            className={
                              getRatingClass(
                                player.ps
                              )
                            }
                          >
                            {
                              player.ps
                            }
                          </span>

                          <span
                            className="
                              ml-1
                              text-xs
                              text-slate-500
                            "
                          >
                            (
                            {
                              player.pab
                            }
                            )
                          </span>
                        </td>

                        {/* FW */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                            text-sm
                          "
                        >
                          <span
                            className={
                              getRatingClass(
                                player.sh
                              )
                            }
                          >
                            {
                              player.sh
                            }
                          </span>

                          <span
                            className="
                              ml-1
                              text-xs
                              text-slate-500
                            "
                          >
                            (
                            {
                              player.sab
                            }
                            )
                          </span>
                        </td>

                        {/* SUSPENSIÓN */}

                        <td
                          className={`
                            px-2
                            py-2
                            text-center
                            text-sm
                            font-semibold

                            ${
                              player.sus >
                              0
                                ? "text-red-400"
                                : "text-slate-500"
                            }
                          `}
                        >
                          {
                            player.sus
                          }
                        </td>

                        {/* LESIÓN */}

                        <td
                          className={`
                            px-2
                            py-2
                            text-center
                            text-sm
                            font-semibold

                            ${
                              player.inj >
                              0
                                ? "text-red-400"
                                : "text-slate-500"
                            }
                          `}
                        >
                          {
                            player.inj
                          }
                        </td>

                        {/* FIT */}

                        <td
                          className={`
                            px-2
                            py-2
                            text-center
                            text-sm
                            font-bold

                            ${
                              player.fit >=
                              90
                                ? "text-emerald-400"
                                : player.fit >=
                                    75
                                  ? "text-yellow-300"
                                  : "text-red-400"
                            }
                          `}
                        >
                          {
                            player.fit
                          }
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>

            {visiblePlayers.length ===
              0 && (
              <div
                className="
                  p-8
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                No hay jugadores
                disponibles con los
                filtros actuales.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================
          PANEL DERECHO
      =================================================== */}

      <div
        className="
          min-w-0
          bg-slate-950/30
        "
      >
        {/* TABS */}

        <div
          className="
            grid
            grid-cols-3
            border-b
            border-slate-800
          "
        >
          <TabButton
            active={
              activeTab ===
              "starters"
            }
            activeClass="
              border-blue-500
              bg-blue-500/10
              text-blue-300
            "
            onClick={() =>
              setActiveTab(
                "starters"
              )
            }
          >
            Titulares
          </TabButton>

          <TabButton
            active={
              activeTab ===
              "subs"
            }
            activeClass="
              border-emerald-500
              bg-emerald-500/10
              text-emerald-300
            "
            onClick={() =>
              setActiveTab(
                "subs"
              )
            }
          >
            Suplentes
          </TabButton>

          <TabButton
            active={
              activeTab ===
              "changes"
            }
            activeClass="
              border-violet-500
              bg-violet-500/10
              text-violet-300
            "
            onClick={() =>
              setActiveTab(
                "changes"
              )
            }
          >
            Cambios
          </TabButton>
        </div>

        {/* CONTENIDO */}

        <div
          className="
            p-4

            sm:p-5
          "
        >
          {!selectedTeam && (
            <div
              className="
                flex
                min-h-[500px]
                items-center
                justify-center
                text-center
              "
            >
              <div>
                <div
                  className="
                    text-lg
                    font-bold
                    text-slate-300
                  "
                >
                  Creador de alineaciones
                </div>

                <p
                  className="
                    mt-2
                    text-sm
                    text-slate-600
                  "
                >
                  Selecciona un equipo
                  para comenzar.
                </p>
              </div>
            </div>
          )}

          {selectedTeam &&
            activeTab ===
              "starters" && (
              <>
                <div
                  className="
                    mb-4
                    flex
                    flex-wrap
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <div>
                    <h2
                      className="
                        font-bold
                        text-white
                      "
                    >
                      Titulares
                    </h2>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      Selecciona 11
                      jugadores y asigna
                      su posición.
                    </p>
                  </div>

                  <div
                    className={`
                      rounded-lg
                      border
                      px-3
                      py-1.5
                      text-sm
                      font-bold

                      ${
                        selectedStarters.length ===
                        11
                          ? `
                            border-emerald-500/40
                            bg-emerald-500/10
                            text-emerald-400
                          `
                          : `
                            border-slate-700
                            bg-slate-900
                            text-slate-400
                          `
                      }
                    `}
                  >
                    {
                      selectedStarters.length
                    }
                    /11
                  </div>
                </div>

                <FootballPitch
                  players={
                    pitchPlayers
                  }
                />
              </>
            )}

          {selectedTeam &&
            activeTab ===
              "subs" && (
              <BenchSelector
                teamPlayers={
                  teamPlayers
                }
                startersKeys={
                  startersKeys
                }
                bench={
                  bench
                }
                onChange={
                  setBench
                }
              />
            )}

          {selectedTeam &&
            activeTab ===
              "changes" && (
              <StrategyBuilder
                strategies={
                  strategies
                }
                onChange={
                  setStrategies
                }
              />
            )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TABLE HEADER
========================================================= */

function TableHeader({
  children,
  align = "center",
}: {
  children:
    React.ReactNode;

  align?:
    | "left"
    | "center";
}) {
  return (
    <th
      className={`
        whitespace-nowrap
        px-2
        py-3
        text-xs
        font-semibold
        uppercase
        tracking-wide
        text-slate-500

        ${
          align === "left"
            ? "text-left"
            : "text-center"
        }
      `}
    >
      {children}
    </th>
  );
}

/* =========================================================
   TAB
========================================================= */

function TabButton({
  children,
  active,
  activeClass,
  onClick,
}: {
  children:
    React.ReactNode;

  active: boolean;

  activeClass: string;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        border-b-2
        px-2
        py-4
        text-sm
        font-bold
        transition

        ${
          active
            ? activeClass
            : `
              border-transparent
              text-slate-500

              hover:bg-slate-900
              hover:text-slate-300
            `
        }
      `}
    >
      {children}
    </button>
  );
}