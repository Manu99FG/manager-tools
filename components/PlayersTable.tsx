"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { EsmsPlayer } from "@/lib/parser-esms";

import {
  getPlayerProfile,
  getTieFallbackPosition,
  hasMainRatingTie,
  type EsmsPosition,
} from "@/lib/esms-player";

import {
  getNationalityFlag,
} from "@/lib/nationalities";

type PlayerSortKey =
  | keyof EsmsPlayer
  | "position";

type SortDirection = "asc" | "desc";

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

export default function PlayersTable({
  players,
  team,
}: {
  players: EsmsPlayer[];
  team: string;
}) {
  const [sortKey, setSortKey] =
    useState<PlayerSortKey | null>(null);

  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  const [positions, setPositions] =
    useState<Record<string, EsmsPosition>>(
      {}
    );

  /*
   * Clave única por equipo + jugador.
   *
   * Así dos jugadores con el mismo nombre
   * pero en equipos distintos no comparten
   * posición almacenada.
   */
  function getPlayerKey(
    player: EsmsPlayer
  ): string {
    return `${team}:${player.name}`;
  }

  /*
   * Carga y conserva la última posición
   * conocida del jugador.
   *
   * Esto sirve para resolver empates
   * de medias principales.
   */
  useEffect(() => {
    const resolved: Record<
      string,
      EsmsPosition
    > = {};

    for (const player of players) {
      const playerKey =
        getPlayerKey(player);

      const storageKey =
        `manager-tools-position:${playerKey}`;

      const previousPosition =
        localStorage.getItem(storageKey) as
          | EsmsPosition
          | null;

      /*
       * Si no existe empate:
       * recalculamos normalmente la posición
       * y la guardamos.
       */
      if (!hasMainRatingTie(player)) {
        const currentPosition =
          getPlayerProfile(player);

        resolved[playerKey] =
          currentPosition;

        localStorage.setItem(
          storageKey,
          currentPosition
        );

        continue;
      }

      /*
       * Si existe empate y ya conocíamos
       * la posición anterior, la conservamos.
       */
      if (previousPosition) {
        resolved[playerKey] =
          previousPosition;

        continue;
      }

      /*
       * Si Manager Tools ve al jugador
       * por primera vez estando ya empatado,
       * utilizamos la regla de respaldo.
       */
      resolved[playerKey] =
        getTieFallbackPosition(player);
    }

    setPositions(resolved);
  }, [players, team]);

  /*
   * Devuelve la posición definitiva
   * que mostraremos en la tabla.
   */
  function resolvePosition(
    player: EsmsPlayer
  ): EsmsPosition {
    const playerKey =
      getPlayerKey(player);

    return (
      positions[playerKey] ??
      getPlayerProfile(player)
    );
  }

  /*
   * Ordenación.
   *
   * Primer clic:
   * ascendente.
   *
   * Segundo clic:
   * descendente.
   */
  function handleSort(
    key: PlayerSortKey
  ) {
    if (sortKey === key) {
      setSortDirection(
        (currentDirection) =>
          currentDirection === "asc"
            ? "desc"
            : "asc"
      );

      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  /*
   * Si no se ha pulsado ninguna columna,
   * conservamos exactamente el orden
   * del archivo ESMS.
   */
  const sortedPlayers = useMemo(() => {
    if (!sortKey) {
      return players;
    }

    return [...players].sort((a, b) => {
      /*
       * Ordenación especial por posición.
       */
      if (sortKey === "position") {
        const positionA =
          resolvePosition(a);

        const positionB =
          resolvePosition(b);

        const result =
          positionOrder[positionA] -
          positionOrder[positionB];

        return sortDirection === "asc"
          ? result
          : -result;
      }

      const aValue = a[sortKey];
      const bValue = b[sortKey];

      /*
       * Columnas numéricas.
       */
      if (
        typeof aValue === "number" &&
        typeof bValue === "number"
      ) {
        return sortDirection === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      /*
       * Texto:
       * Name, Nat, etc.
       */
      const result =
        String(aValue).localeCompare(
          String(bValue),
          "es",
          {
            sensitivity: "base",
          }
        );

      return sortDirection === "asc"
        ? result
        : -result;
    });
  }, [
    players,
    positions,
    sortDirection,
    sortKey,
  ]);

  /*
   * Cabecera reutilizable para columnas
   * ordenables.
   */
  function SortHeader({
    label,
    field,
    align = "center",
  }: {
    label: string;
    field: PlayerSortKey;
    align?: "left" | "center";
  }) {
    const active =
      sortKey === field;

    return (
      <th
        onClick={() =>
          handleSort(field)
        }
        className={`
          cursor-pointer
          select-none
          whitespace-nowrap
          px-3
          py-3
          transition
          hover:bg-slate-700
          ${
            align === "left"
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
              align === "center"
                ? "justify-center"
                : ""
            }
          `}
        >
          <span>
            {label}
          </span>

          {active && (
            <span className="text-xs text-blue-400">
              {sortDirection === "asc"
                ? "▲"
                : "▼"}
            </span>
          )}
        </div>
      </th>
    );
  }

  return (
    <div
      className="
        overflow-x-auto
        rounded-xl
        border
        border-slate-800
      "
    >
      <table className="w-full min-w-max text-sm">
        <thead className="bg-slate-800 text-slate-200">
          <tr>
            <SortHeader
              label="Pos"
              field="position"
              align="left"
            />

            <SortHeader
              label="Name"
              field="name"
              align="left"
            />

            <SortHeader
              label="Age"
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
            (player, index) => {
              const position =
                resolvePosition(player);

              const flag =
                getNationalityFlag(
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
                        ${positionColors[position]}
                      `}
                    >
                      {position}
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
                    {player.name}
                  </td>

                  {/* EDAD */}
                  <td className="p-3 text-center">
                    {player.age}
                  </td>

                  {/* NACIONALIDAD */}
                  <td className="p-3">
                    <div
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        whitespace-nowrap
                      "
                    >
                      <span
                        className="
                          text-lg
                          leading-none
                        "
                      >
                        {flag}
                      </span>

                      <span
                        className="
                          text-xs
                          font-semibold
                          uppercase
                          text-slate-300
                        "
                      >
                        {player.nat}
                      </span>
                    </div>
                  </td>

                  {/* MEDIAS */}
                  <td className="p-3 text-center">
                    {player.st}
                  </td>

                  <td className="p-3 text-center">
                    {player.tk}
                  </td>

                  <td className="p-3 text-center">
                    {player.ps}
                  </td>

                  <td className="p-3 text-center">
                    {player.sh}
                  </td>

                  {/* AGRESIVIDAD */}
                  <td className="p-3 text-center">
                    {player.ag}
                  </td>

                  {/* EXPERIENCIA */}
                  <td className="p-3 text-center">
                    {player.kab}
                  </td>

                  <td className="p-3 text-center">
                    {player.tab}
                  </td>

                  <td className="p-3 text-center">
                    {player.pab}
                  </td>

                  <td className="p-3 text-center">
                    {player.sab}
                  </td>

                  {/* PARTIDOS */}
                  <td className="p-3 text-center">
                    {player.gam}
                  </td>

                  <td className="p-3 text-center">
                    {player.sub}
                  </td>

                  <td className="p-3 text-center">
                    {player.min}
                  </td>

                  <td className="p-3 text-center">
                    {player.mom}
                  </td>

                  {/* PORTEROS */}
                  <td className="p-3 text-center">
                    {player.sav}
                  </td>

                  <td className="p-3 text-center">
                    {player.con}
                  </td>

                  {/* ESTADÍSTICAS */}
                  <td className="p-3 text-center">
                    {player.ktk}
                  </td>

                  <td className="p-3 text-center">
                    {player.kps}
                  </td>

                  <td className="p-3 text-center">
                    {player.sht}
                  </td>

                  <td className="p-3 text-center">
                    {player.gls}
                  </td>

                  <td className="p-3 text-center">
                    {player.ass}
                  </td>

                  {/* DISCIPLINA */}
                  <td className="p-3 text-center">
                    {player.dp}
                  </td>

                  <td className="p-3 text-center">
                    {player.inj}
                  </td>

                  <td className="p-3 text-center">
                    {player.sus}
                  </td>

                  <td className="p-3 text-center">
                    {player.fit}
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