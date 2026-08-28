"use client";

import {
  useMemo,
  useState,
} from "react";

import type { GlobalEsmsPlayer } from "@/lib/all-players";

import {
  getPlayerProfile,
  type EsmsPosition,
} from "@/lib/esms-player";

export type BenchPosition =
  | ""
  | "GK"
  | "DF"
  | "DM"
  | "MF"
  | "AM"
  | "FW";

export type BenchSlot = {
  id: number;
  position: BenchPosition;
  playerKey: string;
};

type Props = {
  teamPlayers: GlobalEsmsPlayer[];

  startersKeys: string[];

  bench: BenchSlot[];

  onChange: (
    bench: BenchSlot[]
  ) => void;
};

const POSITION_COLORS: Record<
  Exclude<BenchPosition, "">,
  string
> = {
  GK: "bg-yellow-400 text-black",
  DF: "bg-blue-500 text-white",
  DM: "bg-cyan-500 text-slate-950",
  MF: "bg-green-500 text-slate-950",
  AM: "bg-violet-500 text-white",
  FW: "bg-red-500 text-white",
};

const NATURAL_POSITION_COLORS: Record<
  EsmsPosition,
  string
> = {
  GK: "text-yellow-400",
  DF: "text-blue-400",
  DM: "text-cyan-400",
  MF: "text-green-400",
  AM: "text-violet-400",
  FW: "text-red-400",
};

export default function BenchSelector({
  teamPlayers,
  startersKeys,
  bench,
  onChange,
}: Props) {
  const [
    openSlot,
    setOpenSlot,
  ] = useState<number | null>(
    null
  );

  function getPlayerKey(
    player: GlobalEsmsPlayer
  ) {
    return `${player.teamCode}:${player.name}`;
  }

  function updatePosition(
    id: number,
    position: BenchPosition
  ) {
    onChange(
      bench.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              position,
            }
          : slot
      )
    );
  }

  function updatePlayer(
    id: number,
    playerKey: string
  ) {
    onChange(
      bench.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              playerKey,
            }
          : slot
      )
    );

    setOpenSlot(null);
  }

  function removePlayer(
    id: number
  ) {
    onChange(
      bench.map((slot) =>
        slot.id === id
          ? {
              ...slot,
              playerKey: "",
            }
          : slot
      )
    );
  }

  function getAvailablePlayers(
    currentSlot: BenchSlot
  ) {
    const otherBenchPlayers =
      bench
        .filter(
          (slot) =>
            slot.id !==
            currentSlot.id
        )
        .map(
          (slot) =>
            slot.playerKey
        )
        .filter(Boolean);

    return teamPlayers.filter(
      (player) => {
        const key =
          getPlayerKey(
            player
          );

        if (
          startersKeys.includes(
            key
          )
        ) {
          return false;
        }

        if (
          otherBenchPlayers.includes(
            key
          )
        ) {
          return false;
        }

        return true;
      }
    );
  }

  function getPlayer(
    playerKey: string
  ) {
    return teamPlayers.find(
      (player) =>
        getPlayerKey(
          player
        ) === playerKey
    );
  }

  function SkillBox({
    label,
    value,
    highlight = false,
  }: {
    label: string;
    value: number;
    highlight?: boolean;
  }) {
    return (
      <div
        className={`
          min-w-[48px]
          rounded-md
          border
          px-2
          py-1.5
          text-center

          ${
            highlight
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-slate-700 bg-slate-800"
          }
        `}
      >
        <div
          className="
            text-[9px]
            font-bold
            uppercase
            text-slate-500
          "
        >
          {label}
        </div>

        <div
          className={`
            mt-0.5
            text-sm
            font-black

            ${
              highlight
                ? "text-emerald-400"
                : "text-white"
            }
          `}
        >
          {value}
        </div>
      </div>
    );
  }

  function PlayerCard({
    player,
    compact = false,
  }: {
    player: GlobalEsmsPlayer;
    compact?: boolean;
  }) {
    const naturalPosition =
      getPlayerProfile(
        player
      );

    const highest =
      Math.max(
        player.st,
        player.tk,
        player.ps,
        player.sh
      );

    return (
      <div
        className="
          min-w-0
          flex-1
        "
      >
        {/* NOMBRE */}

        <div
          className="
            flex
            min-w-0
            items-center
            gap-2
          "
        >
          <span
            className="
              truncate
              text-sm
              font-bold
              text-white
            "
          >
            {player.name}
          </span>

          <span
            className={`
              shrink-0
              text-xs
              font-bold

              ${
                NATURAL_POSITION_COLORS[
                  naturalPosition
                ]
              }
            `}
          >
            (
            {naturalPosition}
            )
          </span>
        </div>

        {/* MEDIAS */}

        <div
          className={`
            mt-2
            flex
            flex-wrap
            gap-1.5

            ${
              compact
                ? "scale-[0.96] origin-left"
                : ""
            }
          `}
        >
          <SkillBox
            label="St"
            value={player.st}
            highlight={
              player.st === highest
            }
          />

          <SkillBox
            label="Tk"
            value={player.tk}
            highlight={
              player.tk === highest
            }
          />

          <SkillBox
            label="Ps"
            value={player.ps}
            highlight={
              player.ps === highest
            }
          />

          <SkillBox
            label="Sh"
            value={player.sh}
            highlight={
              player.sh === highest
            }
          />

          <SkillBox
            label="Fit"
            value={player.fit}
            highlight={
              player.fit === 100
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* CABECERA */}

      <div
        className="
          border-b-2
          border-blue-500
          pb-3
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
          "
        >
          <h2
            className="
              text-lg
              font-bold
              text-blue-400

              sm:text-xl
            "
          >
            Banquillo
            <span className="ml-2">
              (5 obligatorios)
            </span>
          </h2>

          <span
            className="
              rounded-full
              bg-slate-800
              px-3
              py-1
              text-xs
              font-bold
              text-slate-400
            "
          >
            {
              bench.filter(
                (slot) =>
                  slot.playerKey
              ).length
            }
            /5
          </span>
        </div>
      </div>

      {/* FILAS */}

      <div className="mt-5 space-y-4">
        {bench.map(
          (slot, index) => {
            const selectedPlayer =
              getPlayer(
                slot.playerKey
              );

            const availablePlayers =
              getAvailablePlayers(
                slot
              );

            const isOpen =
              openSlot ===
              slot.id;

            return (
              <div
                key={slot.id}
                className="
                  grid
                  grid-cols-[26px_80px_minmax(0,1fr)]
                  items-start
                  gap-2

                  sm:grid-cols-[32px_80px_minmax(0,1fr)]
                  sm:gap-3
                "
              >
                {/* NÚMERO */}

                <div
                  className="
                    pt-3
                    text-center
                    text-sm
                    font-bold
                    text-white
                  "
                >
                  {index + 1}
                </div>

                {/* POSICIÓN */}

                <select
                  value={
                    slot.position
                  }
                  onChange={(
                    event
                  ) =>
                    updatePosition(
                      slot.id,
                      event.target
                        .value as BenchPosition
                    )
                  }
                  className={`
                    h-10
                    rounded-md
                    border
                    border-slate-700
                    px-2
                    text-sm
                    font-bold
                    outline-none

                    ${
                      slot.position
                        ? POSITION_COLORS[
                            slot.position
                          ]
                        : "bg-slate-800 text-white"
                    }
                  `}
                >
                  <option
                    value=""
                    className="bg-slate-900 text-white"
                  >
                    Pos
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

                {/* SELECTOR JUGADOR */}

                <div
                  className="
                    relative
                    min-w-0
                  "
                >
                  {/* SIN JUGADOR */}

                  {!selectedPlayer && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSlot(
                          isOpen
                            ? null
                            : slot.id
                        )
                      }
                      className="
                        flex
                        min-h-10
                        w-full
                        items-center
                        justify-between
                        rounded-md
                        border
                        border-slate-700
                        bg-slate-800
                        px-3
                        py-2
                        text-left
                        text-sm
                        text-slate-500
                        transition
                        hover:border-slate-600
                      "
                    >
                      <span>
                        Seleccionar jugador...
                      </span>

                      <span className="text-blue-400">
                        ▼
                      </span>
                    </button>
                  )}

                  {/* JUGADOR SELECCIONADO */}

                  {selectedPlayer && (
                    <div
                      className="
                        rounded-lg
                        border
                        border-slate-700
                        bg-slate-900
                        p-3
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenSlot(
                              isOpen
                                ? null
                                : slot.id
                            )
                          }
                          className="
                            min-w-0
                            flex-1
                            text-left
                          "
                        >
                          <PlayerCard
                            player={
                              selectedPlayer
                            }
                            compact
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removePlayer(
                              slot.id
                            )
                          }
                          title="Quitar jugador"
                          className="
                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-md
                            bg-red-500/10
                            text-lg
                            font-bold
                            text-red-400
                            transition
                            hover:bg-red-500
                            hover:text-white
                          "
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DESPLEGABLE PERSONALIZADO */}

                  {isOpen && (
                    <div
                      className="
                        absolute
                        left-0
                        right-0
                        top-full
                        z-[300]
                        mt-2
                        max-h-[420px]
                        overflow-y-auto
                        rounded-lg
                        border
                        border-slate-700
                        bg-slate-950
                        p-2
                        shadow-2xl
                      "
                    >
                      {availablePlayers.length ===
                        0 && (
                        <div
                          className="
                            px-3
                            py-6
                            text-center
                            text-sm
                            text-slate-600
                          "
                        >
                          No hay jugadores disponibles.
                        </div>
                      )}

                      <div className="space-y-2">
                        {availablePlayers.map(
                          (player) => {
                            const key =
                              getPlayerKey(
                                player
                              );

                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  updatePlayer(
                                    slot.id,
                                    key
                                  )
                                }
                                className="
                                  w-full
                                  rounded-lg
                                  border
                                  border-slate-800
                                  bg-slate-900
                                  p-3
                                  text-left
                                  transition

                                  hover:border-blue-500
                                  hover:bg-slate-800
                                "
                              >
                                <PlayerCard
                                  player={
                                    player
                                  }
                                />
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}