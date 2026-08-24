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

type PlayerSortKey =
  | keyof EsmsPlayer
  | "position";

type SortDirection = "asc" | "desc";

const positionOrder: Record<EsmsPosition, number> = {
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

  const [positions, setPositions] = useState<
    Record<string, EsmsPosition>
  >({});

  function getPlayerKey(player: EsmsPlayer) {
    return `${team}:${player.name}`;
  }

  useEffect(() => {
    const resolved: Record<
      string,
      EsmsPosition
    > = {};

    for (const player of players) {
      const playerKey = getPlayerKey(player);

      const storageKey =
        `manager-tools-position:${playerKey}`;

      const previous =
        localStorage.getItem(storageKey) as
          | EsmsPosition
          | null;

      if (!hasMainRatingTie(player)) {
        const current =
          getPlayerProfile(player);

        resolved[playerKey] = current;

        localStorage.setItem(
          storageKey,
          current
        );

        continue;
      }

      if (previous) {
        resolved[playerKey] = previous;
        continue;
      }

      resolved[playerKey] =
        getTieFallbackPosition(player);
    }

    setPositions(resolved);
  }, [players, team]);

  function resolvePosition(
    player: EsmsPlayer
  ): EsmsPosition {
    const key = getPlayerKey(player);

    return (
      positions[key] ??
      getPlayerProfile(player)
    );
  }

  function handleSort(key: PlayerSortKey) {
    if (sortKey === key) {
      setSortDirection((direction) =>
        direction === "asc"
          ? "desc"
          : "asc"
      );

      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  const sortedPlayers = useMemo(() => {
    if (!sortKey) {
      return players;
    }

    return [...players].sort((a, b) => {
      if (sortKey === "position") {
        const aPosition =
          resolvePosition(a);

        const bPosition =
          resolvePosition(b);

        const result =
          positionOrder[aPosition] -
          positionOrder[bPosition];

        return sortDirection === "asc"
          ? result
          : -result;
      }

      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (
        typeof aValue === "number" &&
        typeof bValue === "number"
      ) {
        return sortDirection === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

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

  function SortHeader({
    label,
    field,
  }: {
    label: string;
    field: PlayerSortKey;
  }) {
    const active = sortKey === field;

    return (
      <th
        onClick={() => handleSort(field)}
        className="
          cursor-pointer
          select-none
          whitespace-nowrap
          px-3
          py-3
          text-center
          hover:bg-slate-700
        "
      >
        {label}

        {active && (
          <span className="ml-2 text-xs text-blue-400">
            {sortDirection === "asc"
              ? "▲"
              : "▼"}
          </span>
        )}
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
      <table className="min-w-max text-sm">
        <thead className="bg-slate-800 text-slate-200">
          <tr>
            <SortHeader
              label="Pos"
              field="position"
            />

            <SortHeader
              label="Name"
              field="name"
            />

            <SortHeader
              label="Age"
              field="age"
            />

            <SortHeader
              label="Nat"
              field="nat"
            />

            <SortHeader label="St" field="st" />
            <SortHeader label="Tk" field="tk" />
            <SortHeader label="Ps" field="ps" />
            <SortHeader label="Sh" field="sh" />

            <SortHeader label="Ag" field="ag" />

            <SortHeader label="KAb" field="kab" />
            <SortHeader label="TAb" field="tab" />
            <SortHeader label="PAb" field="pab" />
            <SortHeader label="SAb" field="sab" />

            <SortHeader label="Gam" field="gam" />
            <SortHeader label="Sub" field="sub" />
            <SortHeader label="Min" field="min" />
            <SortHeader label="Mom" field="mom" />

            <SortHeader label="Sav" field="sav" />
            <SortHeader label="Con" field="con" />

            <SortHeader label="Ktk" field="ktk" />
            <SortHeader label="Kps" field="kps" />
            <SortHeader label="Sht" field="sht" />

            <SortHeader label="Gls" field="gls" />
            <SortHeader label="Ass" field="ass" />

            <SortHeader label="DP" field="dp" />
            <SortHeader label="Inj" field="inj" />
            <SortHeader label="Sus" field="sus" />
            <SortHeader label="Fit" field="fit" />
          </tr>
        </thead>

        <tbody>
          {sortedPlayers.map(
            (player, index) => {
              const position =
                resolvePosition(player);

              return (
                <tr
                  key={`${player.name}-${index}`}
                  className="
                    border-t
                    border-slate-800
                    hover:bg-slate-900
                  "
                >
                  <td className="p-2">
                    <div
                      className={`
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

                  <td className="whitespace-nowrap p-3 font-medium text-white">
                    {player.name}
                  </td>

                  {[
                    player.age,
                    player.nat.toUpperCase(),

                    player.st,
                    player.tk,
                    player.ps,
                    player.sh,

                    player.ag,

                    player.kab,
                    player.tab,
                    player.pab,
                    player.sab,

                    player.gam,
                    player.sub,
                    player.min,
                    player.mom,

                    player.sav,
                    player.con,

                    player.ktk,
                    player.kps,
                    player.sht,

                    player.gls,
                    player.ass,

                    player.dp,
                    player.inj,
                    player.sus,
                    player.fit,
                  ].map((value, valueIndex) => (
                    <td
                      key={valueIndex}
                      className="p-3 text-center"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
}