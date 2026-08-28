"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PlayerNameLink from "@/components/PlayerNameLink";

import type {
  EsmsPlayer,
} from "@/lib/parser-esms";

import {
  getPlayerProfile,
  getTieFallbackPosition,
  hasMainRatingTie,
  type EsmsPosition,
} from "@/lib/esms-player";

import {
  getFlagUrl,
} from "@/lib/nationalities";

/* =========================================================
   TIPO DE JUGADOR CON HISTORIAL
========================================================= */

type PlayerWithHistory =
  EsmsPlayer & {
    playerId:
      | string
      | null;
  };

/* =========================================================
   ORDENACIÓN
========================================================= */

type PlayerSortKey =
  | keyof EsmsPlayer
  | "position";

type SortDirection =
  | "asc"
  | "desc";

/*
 * Orden de las posiciones ESMS.
 */
const positionOrder: Record<
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

/*
 * Color visual de cada posición.
 */
const positionColors: Record<
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

/* =========================================================
   COMPONENTE
========================================================= */

export default function PlayersTable({
  players,
  team,
}: {
  players: PlayerWithHistory[];
  team: string;
}) {
  const [
    sortKey,
    setSortKey,
  ] =
    useState<PlayerSortKey | null>(
      null
    );

  const [
    sortDirection,
    setSortDirection,
  ] =
    useState<SortDirection>(
      "asc"
    );

  const [
    positions,
    setPositions,
  ] = useState<
    Record<
      string,
      EsmsPosition
    >
  >({});

  /*
   * Crea una clave única por:
   *
   * equipo + jugador
   *
   * Ejemplo:
   *
   * RMA:Vinicius_Jr
   * FCB:Lamine_Yamal
   */
  function getPlayerKey(
    player: EsmsPlayer
  ): string {
    return `${team}:${player.name}`;
  }

  /*
   * Recuperamos la posición anterior
   * del jugador desde localStorage.
   *
   * Esto permite conservar la posición
   * cuando dos medias principales
   * terminan empatadas.
   */
  useEffect(() => {
    const resolved: Record<
      string,
      EsmsPosition
    > = {};

    for (
      const player of players
    ) {
      const playerKey =
        getPlayerKey(
          player
        );

      const storageKey =
        `manager-tools-position:${playerKey}`;

      const previousPosition =
        localStorage.getItem(
          storageKey
        ) as EsmsPosition | null;

      /*
       * Si NO hay empate de medias,
       * calculamos normalmente
       * la posición.
       */
      if (
        !hasMainRatingTie(
          player
        )
      ) {
        const currentPosition =
          getPlayerProfile(
            player
          );

        resolved[playerKey] =
          currentPosition;

        localStorage.setItem(
          storageKey,
          currentPosition
        );

        continue;
      }

      /*
       * Si hay empate y ya conocemos
       * la posición anterior,
       * conservamos esa posición.
       */
      if (
        previousPosition
      ) {
        resolved[playerKey] =
          previousPosition;

        continue;
      }

      /*
       * Si vemos al jugador por primera
       * vez estando empatado,
       * usamos el fallback ESMS.
       */
      resolved[playerKey] =
        getTieFallbackPosition(
          player
        );
    }

    setPositions(
      resolved
    );
  }, [
    players,
    team,
  ]);

  /*
   * Obtiene la posición definitiva
   * que debe mostrar la tabla.
   */
  function resolvePosition(
    player: EsmsPlayer
  ): EsmsPosition {
    const playerKey =
      getPlayerKey(
        player
      );

    return (
      positions[
        playerKey
      ] ??
      getPlayerProfile(
        player
      )
    );
  }

  /*
   * Control de ordenación.
   *
   * Primer clic:
   * ASC
   *
   * Segundo clic:
   * DESC
   */
  function handleSort(
    key: PlayerSortKey
  ) {
    if (
      sortKey === key
    ) {
      setSortDirection(
        (
          currentDirection
        ) =>
          currentDirection ===
          "asc"
            ? "desc"
            : "asc"
      );

      return;
    }

    setSortKey(
      key
    );

    setSortDirection(
      "asc"
    );
  }

  /*
   * Lista de jugadores ordenada.
   *
   * Si no hemos pulsado ninguna
   * cabecera, mantenemos exactamente
   * el orden del archivo ESMS.
   */
  const sortedPlayers =
    useMemo(() => {
      if (
        !sortKey
      ) {
        return players;
      }

      return [
        ...players,
      ].sort(
        (
          a,
          b
        ) => {
          /*
           * Ordenación por posición.
           */
          if (
            sortKey ===
            "position"
          ) {
            const positionA =
              resolvePosition(
                a
              );

            const positionB =
              resolvePosition(
                b
              );

            const result =
              positionOrder[
                positionA
              ] -
              positionOrder[
                positionB
              ];

            return sortDirection ===
              "asc"
              ? result
              : -result;
          }

          const aValue =
            a[
              sortKey
            ];

          const bValue =
            b[
              sortKey
            ];

          /*
           * Valores numéricos.
           */
          if (
            typeof aValue ===
              "number" &&
            typeof bValue ===
              "number"
          ) {
            return sortDirection ===
              "asc"
              ? aValue -
                  bValue
              : bValue -
                  aValue;
          }

          /*
           * Valores de texto.
           *
           * Name
           * Nat
           * etc.
           */
          const result =
            String(
              aValue
            ).localeCompare(
              String(
                bValue
              ),
              "es",
              {
                sensitivity:
                  "base",
              }
            );

          return sortDirection ===
            "asc"
            ? result
            : -result;
        }
      );
    }, [
      players,
      positions,
      sortDirection,
      sortKey,
    ]);

  /*
   * Cabecera reutilizable
   * para todas las columnas
   * ordenables.
   */
  function SortHeader({
    label,
    field,
    align = "center",
  }: {
    label: string;
    field: PlayerSortKey;
    align?:
      | "left"
      | "center";
  }) {
    const active =
      sortKey === field;

    return (
      <th
        onClick={() =>
          handleSort(
            field
          )
        }
        title={`Ordenar por ${label}`}
        className={`
          cursor-pointer
          select-none
          whitespace-nowrap
          px-3
          py-3
          transition
          hover:bg-slate-700

          ${
            align ===
            "left"
              ? "text-left"
              : "text-center"
          }
        `}
      >
        <div
          className={`
            flex
            items-center
            gap-2

            ${
              align ===
              "center"
                ? "justify-center"
                : ""
            }
          `}
        >
          <span>
            {label}
          </span>

          {active && (
            <span
              className="
                text-xs
                text-blue-400
              "
            >
              {sortDirection ===
              "asc"
                ? "▲"
                : "▼"}
            </span>
          )}
        </div>
      </th>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
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
          min-w-max
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
            <SortHeader
              label="Pos"
              field="position"
              align="left"
            />

            <SortHeader
              label="Nombre"
              field="name"
              align="left"
            />

            <SortHeader
              label="Edad"
              field="age"
            />

            <SortHeader
              label="Nat"
              field="nat"
            />

            <SortHeader
              label="St"
              field="st"
            />

            <SortHeader
              label="Tk"
              field="tk"
            />

            <SortHeader
              label="Ps"
              field="ps"
            />

            <SortHeader
              label="Sh"
              field="sh"
            />

            <SortHeader
              label="Ag"
              field="ag"
            />

            <SortHeader
              label="KAb"
              field="kab"
            />

            <SortHeader
              label="TAb"
              field="tab"
            />

            <SortHeader
              label="PAb"
              field="pab"
            />

            <SortHeader
              label="SAb"
              field="sab"
            />

            <SortHeader
              label="Gam"
              field="gam"
            />

            <SortHeader
              label="Sub"
              field="sub"
            />

            <SortHeader
              label="Min"
              field="min"
            />

            <SortHeader
              label="Mom"
              field="mom"
            />

            <SortHeader
              label="Sav"
              field="sav"
            />

            <SortHeader
              label="Con"
              field="con"
            />

            <SortHeader
              label="Ktk"
              field="ktk"
            />

            <SortHeader
              label="Kps"
              field="kps"
            />

            <SortHeader
              label="Sht"
              field="sht"
            />

            <SortHeader
              label="Gls"
              field="gls"
            />

            <SortHeader
              label="Ass"
              field="ass"
            />

            <SortHeader
              label="DP"
              field="dp"
            />

            <SortHeader
              label="Inj"
              field="inj"
            />

            <SortHeader
              label="Sus"
              field="sus"
            />

            <SortHeader
              label="Fit"
              field="fit"
            />
          </tr>
        </thead>

        <tbody>
          {sortedPlayers.map(
            (
              player,
              index
            ) => {
              const position =
                resolvePosition(
                  player
                );

              const flagUrl =
                getFlagUrl(
                  player.nat
                );

              return (
                <tr
                  key={`${player.name}-${index}`}
                  className="
                    border-t
                    border-slate-800
                    transition
                    hover:bg-slate-900
                  "
                >
                  {/* POSICIÓN */}

                  <td className="p-2">
                    <div
                      className={`
                        min-w-12
                        rounded-md
                        px-3
                        py-1
                        text-center
                        text-xs
                        font-black

                        ${
                          positionColors[
                            position
                          ]
                        }
                      `}
                    >
                      {
                        position
                      }
                    </div>
                  </td>

                  {/* NOMBRE */}

                  <td
                    className="
                      whitespace-nowrap
                      p-3
                      font-medium
                      text-white
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
                        text-white
                        transition
                        hover:text-blue-400
                      "
                    />
                  </td>

                  {/* EDAD */}

                  <td
                    className="
                      p-3
                      text-center
                    "
                  >
                    {
                      player.age
                    }
                  </td>

                  {/* NACIONALIDAD */}

                  <td
                    className="
                      p-3
                      text-center
                    "
                    title={
                      player.nat.toUpperCase()
                    }
                  >
                    <div
                      className="
                        flex
                        min-w-8
                        items-center
                        justify-center
                      "
                    >
                      {flagUrl ? (
                        <img
                          src={
                            flagUrl
                          }
                          alt={
                            player.nat
                          }
                          width={
                            24
                          }
                          height={
                            18
                          }
                          loading="lazy"
                          className="
                            h-[18px]
                            w-6
                            rounded-sm
                            object-cover
                          "
                        />
                      ) : (
                        <span
                          className="
                            text-xs
                            font-bold
                            uppercase
                            text-slate-500
                          "
                        >
                          {
                            player.nat
                          }
                        </span>
                      )}
                    </div>
                  </td>

                  {/* MEDIAS */}

                  <td className="p-3 text-center">
                    {
                      player.st
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.tk
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.ps
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.sh
                    }
                  </td>

                  {/* AGRESIVIDAD */}

                  <td className="p-3 text-center">
                    {
                      player.ag
                    }
                  </td>

                  {/* EXPERIENCIA */}

                  <td className="p-3 text-center">
                    {
                      player.kab
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.tab
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.pab
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.sab
                    }
                  </td>

                  {/* PARTIDOS */}

                  <td className="p-3 text-center">
                    {
                      player.gam
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.sub
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.min
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.mom
                    }
                  </td>

                  {/* PORTEROS */}

                  <td className="p-3 text-center">
                    {
                      player.sav
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.con
                    }
                  </td>

                  {/* ESTADÍSTICAS */}

                  <td className="p-3 text-center">
                    {
                      player.ktk
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.kps
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.sht
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.gls
                    }
                  </td>

                  <td className="p-3 text-center">
                    {
                      player.ass
                    }
                  </td>

                  {/* DISCIPLINA */}

                  <td className="p-3 text-center">
                    {
                      player.dp
                    }
                  </td>

                  <td
                    className={`
                      p-3
                      text-center

                      ${
                        player.inj >
                        0
                          ? "font-bold text-red-400"
                          : ""
                      }
                    `}
                  >
                    {
                      player.inj
                    }
                  </td>

                  <td
                    className={`
                      p-3
                      text-center

                      ${
                        player.sus >
                        0
                          ? "font-bold text-red-400"
                          : ""
                      }
                    `}
                  >
                    {
                      player.sus
                    }
                  </td>

                  <td
                    className={`
                      p-3
                      text-center
                      font-semibold

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
    </div>
  );
}