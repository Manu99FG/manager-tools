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

import ChangeBuilder, {
  type EsmsChange,
} from "@/components/ChangeBuilder";

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

/* =========================================================
   ORDEN DE POSICIONES
========================================================= */

const POSITION_ORDER: Record<
  EsmsPosition,
  number
> = {
  GK: 1,
  DF: 2,
  DM: 3,
  MF: 4,
  AM: 5,
  FW: 6,
};

/* =========================================================
   COLORES
========================================================= */

const POSITION_COLORS: Record<
  EsmsPosition,
  string
> = {
  GK: "bg-yellow-400 text-black",
  DF: "bg-blue-500 text-white",
  DM: "bg-cyan-500 text-slate-950",
  MF: "bg-green-500 text-slate-950",
  AM: "bg-violet-500 text-white",
  FW: "bg-red-500 text-white",
};

const ASSIGNED_POSITION_COLORS: Record<
  Exclude<AssignedPosition, "">,
  string
> = {
  GK: "bg-yellow-400 text-black",
  DF: "bg-blue-500 text-white",
  DM: "bg-cyan-500 text-slate-950",
  MF: "bg-green-500 text-slate-950",
  AM: "bg-violet-500 text-white",
  FW: "bg-red-500 text-white",
};

/* =========================================================
   BANQUILLO VACÍO
========================================================= */

function createEmptyBench(): BenchSlot[] {
  return [
    {
      id: 1,
      position: "",
      playerKey: "",
    },
    {
      id: 2,
      position: "",
      playerKey: "",
    },
    {
      id: 3,
      position: "",
      playerKey: "",
    },
    {
      id: 4,
      position: "",
      playerKey: "",
    },
    {
      id: 5,
      position: "",
      playerKey: "",
    },
  ];
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function ShtCreator({
  players,
}: {
  players: GlobalEsmsPlayer[];
}) {
  /* =======================================================
     ESTADOS GENERALES
  ======================================================= */

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

  /* =======================================================
     TITULARES
  ======================================================= */

  const [
    assignedPositions,
    setAssignedPositions,
  ] = useState<
    Record<
      string,
      AssignedPosition
    >
  >({});

  /* =======================================================
     BANQUILLO
  ======================================================= */

  const [
    bench,
    setBench,
  ] =
    useState<BenchSlot[]>(
      createEmptyBench()
    );

  /* =======================================================
     CAMBIOS
  ======================================================= */

  const [
    changes,
    setChanges,
  ] = useState<
    EsmsChange[]
  >([]);

  /* =======================================================
     POSICIONES NATURALES
  ======================================================= */

  const [
    positions,
    setPositions,
  ] = useState<
    Record<
      string,
      EsmsPosition
    >
  >({});

  function getPlayerKey(
    player: GlobalEsmsPlayer
  ): string {
    return `${player.teamCode}:${player.name}`;
  }

  useEffect(() => {
    const resolved: Record<
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
        `manager-tools-position:${key}`;

      const previous =
        localStorage.getItem(
          storageKey
        ) as
          | EsmsPosition
          | null;

      if (
        !hasMainRatingTie(
          player
        )
      ) {
        const current =
          getPlayerProfile(
            player
          );

        resolved[key] =
          current;

        localStorage.setItem(
          storageKey,
          current
        );

        continue;
      }

      if (previous) {
        resolved[key] =
          previous;

        continue;
      }

      resolved[key] =
        getTieFallbackPosition(
          player
        );
    }

    setPositions(resolved);
  }, [players]);

  function resolvePosition(
    player: GlobalEsmsPlayer
  ): EsmsPosition {
    return (
      positions[
        getPlayerKey(player)
      ] ??
      getPlayerProfile(player)
    );
  }

  /* =======================================================
     EQUIPOS
  ======================================================= */

  const teams =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      for (
        const player of players
      ) {
        map.set(
          player.teamCode,
          player.teamName
        );
      }

      return Array.from(
        map.entries()
      )
        .map(
          ([code, name]) => ({
            code,
            name,
          })
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es"
          )
        );
    }, [players]);

  /* =======================================================
     JUGADORES DEL EQUIPO
  ======================================================= */

  const teamPlayers =
    useMemo(() => {
      if (!selectedTeam) {
        return [];
      }

      return players
        .filter(
          (player) =>
            player.teamCode ===
            selectedTeam
        )
        .sort((a, b) => {
          const positionA =
            resolvePosition(a);

          const positionB =
            resolvePosition(b);

          const positionDifference =
            POSITION_ORDER[
              positionA
            ] -
            POSITION_ORDER[
              positionB
            ];

          if (
            positionDifference !==
            0
          ) {
            return positionDifference;
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

          return (
            ratingB - ratingA
          );
        });
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
          player.sus === 0 &&
          player.inj === 0
      );
    }, [
      teamPlayers,
      hideUnavailable,
    ]);

  /* =======================================================
     RESET AL CAMBIAR EQUIPO
  ======================================================= */

  useEffect(() => {
    setAssignedPositions(
      {}
    );

    setBench(
      createEmptyBench()
    );

    setChanges([]);

    setActiveTab(
      "starters"
    );
  }, [selectedTeam]);

  /* =======================================================
     ASIGNAR POSICIÓN
  ======================================================= */

  function handleAssignedPosition(
    player: GlobalEsmsPlayer,
    position: AssignedPosition
  ) {
    const key =
      getPlayerKey(player);

    /*
     * Si un jugador entra como titular,
     * desaparece automáticamente del banquillo.
     */
    if (position) {
      setBench(
        (current) =>
          current.map(
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

    setAssignedPositions(
      (current) => ({
        ...current,
        [key]:
          position,
      })
    );
  }

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

  const startersCount =
    selectedStarters.length;

  /* =======================================================
     CLAVES DE TITULARES
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
      return selectedStarters
        .map((player) => {
          const key =
            getPlayerKey(
              player
            );

          const position =
            assignedPositions[
              key
            ];

          if (!position) {
            return null;
          }

          return {
            player,
            position,
          };
        })
        .filter(
          (
            item
          ): item is {
            player: GlobalEsmsPlayer;
            position:
              | "GK"
              | "DF"
              | "DM"
              | "MF"
              | "AM"
              | "FW";
          } =>
            Boolean(item)
        );
    }, [
      selectedStarters,
      assignedPositions,
    ]);

  /* =======================================================
     BANQUILLO
  ======================================================= */

  const completedBench =
    useMemo(() => {
      return bench.filter(
        (slot) =>
          slot.position &&
          slot.playerKey
      );
    }, [bench]);

  const benchCount =
    completedBench.length;

  /* =======================================================
     VALIDACIÓN
  ======================================================= */

  function handleGenerate() {
    if (!selectedTeam) {
      alert(
        "Selecciona un equipo."
      );

      return;
    }

    if (
      startersCount !== 11
    ) {
      alert(
        `Debes tener exactamente 11 titulares. Actualmente tienes ${startersCount}.`
      );

      setActiveTab(
        "starters"
      );

      return;
    }

    const goalkeeperCount =
      selectedStarters.filter(
        (player) =>
          assignedPositions[
            getPlayerKey(
              player
            )
          ] === "GK"
      ).length;

    if (
      goalkeeperCount !== 1
    ) {
      alert(
        `Debes tener exactamente 1 GK titular. Actualmente tienes ${goalkeeperCount}.`
      );

      setActiveTab(
        "starters"
      );

      return;
    }

    if (
      benchCount !== 5
    ) {
      alert(
        `Debes completar los 5 suplentes obligatorios. Actualmente tienes ${benchCount}/5.`
      );

      setActiveTab(
        "subs"
      );

      return;
    }

    const incompleteBench =
      bench.some(
        (slot) =>
          Boolean(
            slot.playerKey
          ) !==
          Boolean(
            slot.position
          )
      );

    if (
      incompleteBench
    ) {
      alert(
        "Cada suplente debe tener jugador y posición."
      );

      setActiveTab(
        "subs"
      );

      return;
    }

    alert(
      `Alineación válida:
11 titulares
5 suplentes
${changes.length} cambios configurados

El siguiente paso será generar el .sht real.`
    );
  }

  /* =======================================================
     MEDIA + EXP
  ======================================================= */

  function formatSkill(
    rating: number,
    exp: number
  ) {
    return (
      <span className="whitespace-nowrap">
        <span
          className={
            rating >= 16
              ? "font-bold text-emerald-400"
              : "text-white"
          }
        >
          {rating}
        </span>

        <span
          className="
            ml-1
            text-[11px]
            text-slate-400
          "
        >
          ({exp})
        </span>
      </span>
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

      <section
        className="
          min-w-0
          border-b
          border-slate-800
          p-3

          sm:p-4

          xl:border-b-0
          xl:border-r
          xl:p-5
        "
      >
        {/* =================================================
            CONTROLES SUPERIORES
        ================================================= */}

        <div
          className="
            grid
            grid-cols-1
            gap-3

            sm:grid-cols-2

            lg:grid-cols-[1.4fr_0.8fr_auto_auto]
          "
        >
          {/* EQUIPO */}

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
              min-w-0
              rounded-lg
              border
              border-slate-700
              bg-slate-800
              px-3
              py-2.5
              text-sm
              text-white
              outline-none
              focus:border-blue-500
            "
          >
            <option value="">
              Equipo
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
                  {team.name}
                </option>
              )
            )}
          </select>

          {/* TÁCTICA INICIAL */}

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
              min-w-0
              rounded-lg
              border
              border-slate-700
              bg-slate-800
              px-3
              py-2.5
              text-sm
              text-white
              outline-none
              focus:border-blue-500
            "
          >
            <option value="N">
              N
            </option>

            <option value="A">
              A
            </option>

            <option value="C">
              C
            </option>

            <option value="D">
              D
            </option>

            <option value="E">
              E
            </option>

            <option value="L">
              L
            </option>

            <option value="P">
              P
            </option>
          </select>

          {/* OCULTAR BAJAS */}

          <label
            className="
              flex
              cursor-pointer
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-slate-700
              bg-slate-800
              px-4
              py-2.5
              text-sm
              text-white
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
            />

            Ocultar bajas
          </label>

          {/* GENERAR */}

          <button
            type="button"
            onClick={
              handleGenerate
            }
            disabled={
              !selectedTeam
            }
            className="
              rounded-lg
              bg-emerald-500
              px-5
              py-2.5
              text-sm
              font-bold
              text-white
              transition

              hover:bg-emerald-400

              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            Generar
          </button>
        </div>

        {/* =================================================
            RESUMEN
        ================================================= */}

        {selectedTeam && (
          <div
            className="
              mt-4
              flex
              flex-wrap
              gap-x-5
              gap-y-2
              text-xs
              text-slate-500

              sm:text-sm
            "
          >
            <span>
              {
                teamPlayers.length
              }{" "}
              jugadores
            </span>

            <span>
              Titulares:{" "}
              <strong
                className={
                  startersCount ===
                  11
                    ? "text-emerald-400"
                    : "text-white"
                }
              >
                {
                  startersCount
                }
                /11
              </strong>
            </span>

            <span>
              Suplentes:{" "}
              <strong
                className={
                  benchCount ===
                  5
                    ? "text-emerald-400"
                    : "text-white"
                }
              >
                {
                  benchCount
                }
                /5
              </strong>
            </span>

            <span>
              Cambios:{" "}
              <strong className="text-white">
                {
                  changes.length
                }
              </strong>
            </span>

            <span>
              Táctica:{" "}
              <strong className="text-white">
                {
                  tacticalStyle
                }
              </strong>
            </span>
          </div>
        )}

        {/* =================================================
            TABLA
        ================================================= */}

        <div
          className="
            mt-4
            w-full
            overflow-x-auto
            rounded-lg
            border
            border-slate-800
          "
        >
          <table
            className="
              w-full
              min-w-[940px]
              text-sm
            "
          >
            <thead
              className="
                bg-slate-800
                text-slate-200
              "
            >
              <tr>
                <th className="px-3 py-3 text-center">
                  Sel.
                </th>

                <th className="px-3 py-3 text-center">
                  Pos
                </th>

                <th className="px-3 py-3 text-left">
                  Nombre
                </th>

                <th className="px-3 py-3 text-center">
                  GK
                </th>

                <th className="px-3 py-3 text-center">
                  DF
                </th>

                <th className="px-3 py-3 text-center">
                  MF
                </th>

                <th className="px-3 py-3 text-center">
                  FW
                </th>

                <th className="px-3 py-3 text-center">
                  Sus
                </th>

                <th className="px-3 py-3 text-center">
                  Inj
                </th>

                <th className="px-3 py-3 text-center">
                  Fit
                </th>
              </tr>
            </thead>

            <tbody>
              {!selectedTeam && (
                <tr>
                  <td
                    colSpan={10}
                    className="
                      px-4
                      py-16
                      text-center
                      text-slate-600
                    "
                  >
                    Selecciona un equipo.
                  </td>
                </tr>
              )}

              {selectedTeam &&
                visiblePlayers.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        10
                      }
                      className="
                        px-4
                        py-16
                        text-center
                        text-slate-600
                      "
                    >
                      No hay jugadores disponibles.
                    </td>
                  </tr>
                )}

              {visiblePlayers.map(
                (player) => {
                  const naturalPosition =
                    resolvePosition(
                      player
                    );

                  const key =
                    getPlayerKey(
                      player
                    );

                  const assigned =
                    assignedPositions[
                      key
                    ] ?? "";

                  return (
                    <tr
                      key={key}
                      className="
                        border-t
                        border-slate-800
                        transition
                        hover:bg-slate-800/50
                      "
                    >
                      {/* SEL */}

                      <td
                        className="
                          px-3
                          py-2
                          text-center
                        "
                      >
                        <select
                          value={
                            assigned
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
                            rounded-md
                            border
                            border-slate-700
                            px-2
                            py-1.5
                            text-sm
                            font-semibold
                            outline-none

                            ${
                              assigned
                                ? ASSIGNED_POSITION_COLORS[
                                    assigned
                                  ]
                                : "bg-slate-900 text-white"
                            }
                          `}
                        >
                          <option
                            value=""
                            className="bg-slate-900 text-white"
                          >
                            -
                          </option>

                          <option
                            value="GK"
                            className="bg-slate-900 text-white"
                          >
                            GK
                          </option>

                          <option
                            value="DF"
                            className="bg-slate-900 text-white"
                          >
                            DF
                          </option>

                          <option
                            value="DM"
                            className="bg-slate-900 text-white"
                          >
                            DM
                          </option>

                          <option
                            value="MF"
                            className="bg-slate-900 text-white"
                          >
                            MF
                          </option>

                          <option
                            value="AM"
                            className="bg-slate-900 text-white"
                          >
                            AM
                          </option>

                          <option
                            value="FW"
                            className="bg-slate-900 text-white"
                          >
                            FW
                          </option>
                        </select>
                      </td>

                      {/* POS NATURAL */}

                      <td className="p-0">
                        <div
                          className={`
                            min-w-16
                            px-4
                            py-3
                            text-center
                            font-bold

                            ${
                              POSITION_COLORS[
                                naturalPosition
                              ]
                            }
                          `}
                        >
                          {
                            naturalPosition
                          }
                        </div>
                      </td>

                      {/* NOMBRE */}

                      <td
                        className="
                          whitespace-nowrap
                          px-3
                          py-3
                          text-white
                        "
                      >
                        <span className="font-medium">
                          {
                            player.name
                          }
                        </span>

                        <span
                          className="
                            ml-2
                            text-xs
                            text-slate-400
                          "
                        >
                          (
                          {
                            player.age
                          }
                          )
                        </span>
                      </td>

                      {/* GK */}

                      <td className="px-3 py-3 text-center">
                        {formatSkill(
                          player.st,
                          player.kab
                        )}
                      </td>

                      {/* DF */}

                      <td className="px-3 py-3 text-center">
                        {formatSkill(
                          player.tk,
                          player.tab
                        )}
                      </td>

                      {/* MF */}

                      <td className="px-3 py-3 text-center">
                        {formatSkill(
                          player.ps,
                          player.pab
                        )}
                      </td>

                      {/* FW */}

                      <td className="px-3 py-3 text-center">
                        {formatSkill(
                          player.sh,
                          player.sab
                        )}
                      </td>

                      {/* SUS */}

                      <td
                        className={`
                          px-3
                          py-3
                          text-center
                          font-semibold

                          ${
                            player.sus >
                            0
                              ? "text-red-400"
                              : "text-slate-400"
                          }
                        `}
                      >
                        {
                          player.sus
                        }
                      </td>

                      {/* INJ */}

                      <td
                        className={`
                          px-3
                          py-3
                          text-center
                          font-semibold

                          ${
                            player.inj >
                            0
                              ? "text-orange-400"
                              : "text-slate-400"
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
                          px-3
                          py-3
                          text-center
                          font-semibold

                          ${
                            player.fit <
                            100
                              ? "text-yellow-400"
                              : "text-white"
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
        </div>
      </section>

      {/* ===================================================
          PANEL DERECHO
      =================================================== */}

      <section
        className="
          min-w-0
          bg-slate-950/50
        "
      >
        {/* =================================================
            PESTAÑAS
        ================================================= */}

        <div
          className="
            grid
            grid-cols-3
            gap-1
            border-b
            border-slate-800
            p-2
          "
        >
          {/* TITULARES */}

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "starters"
              )
            }
            className={`
              rounded-md
              px-3
              py-3
              text-sm
              font-bold
              transition

              ${
                activeTab ===
                "starters"
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }
            `}
          >
            Titulares
          </button>

          {/* SUPLENTES */}

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "subs"
              )
            }
            className={`
              rounded-md
              px-3
              py-3
              text-sm
              font-bold
              transition

              ${
                activeTab ===
                "subs"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }
            `}
          >
            Suplentes
          </button>

          {/* CAMBIOS */}

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "changes"
              )
            }
            className={`
              rounded-md
              px-3
              py-3
              text-sm
              font-bold
              transition

              ${
                activeTab ===
                "changes"
                  ? "bg-violet-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }
            `}
          >
            Cambios
          </button>
        </div>

        {/* =================================================
            TITULARES
        ================================================= */}

        {activeTab ===
          "starters" && (
          <div className="p-5">
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div>
                <h2
                  className="
                    text-xl
                    font-bold
                    text-blue-400
                  "
                >
                  Alineación
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Los jugadores aparecen automáticamente según la posición seleccionada.
                </p>
              </div>

              <span
                className={`
                  shrink-0
                  rounded-full
                  px-3
                  py-1
                  text-xs
                  font-bold

                  ${
                    startersCount ===
                    11
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                  }
                `}
              >
                {
                  startersCount
                }
                /11
              </span>
            </div>

            <div className="mt-5">
              <FootballPitch
                players={
                  pitchPlayers
                }
              />
            </div>
          </div>
        )}

        {/* =================================================
            SUPLENTES
        ================================================= */}

        {activeTab ===
          "subs" && (
          <div className="p-5">
            <BenchSelector
              teamPlayers={
                teamPlayers
              }
              startersKeys={
                startersKeys
              }
              bench={bench}
              onChange={
                setBench
              }
            />
          </div>
        )}

        {/* =================================================
            CAMBIOS
        ================================================= */}

        {activeTab ===
          "changes" && (
          <div className="p-5">
            <ChangeBuilder
              changes={
                changes
              }
              onChange={
                setChanges
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}