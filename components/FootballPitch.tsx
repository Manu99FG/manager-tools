"use client";

import type { GlobalEsmsPlayer } from "@/lib/all-players";

/* =========================================================
   TIPOS
========================================================= */

type AssignedPosition =
  | "GK"
  | "DF"
  | "DM"
  | "MF"
  | "AM"
  | "FW";

type PitchPlayer = {
  player: GlobalEsmsPlayer;
  position: AssignedPosition;
};

type Props = {
  players: PitchPlayer[];
};

/* =========================================================
   COLORES DE POSICIÓN
========================================================= */

const POSITION_COLORS: Record<
  AssignedPosition,
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

export default function FootballPitch({
  players,
}: Props) {
  /* =======================================================
     AGRUPAR JUGADORES POR POSICIÓN
  ======================================================= */

  const grouped = {
    GK: players.filter(
      (item) => item.position === "GK"
    ),

    DF: players.filter(
      (item) => item.position === "DF"
    ),

    DM: players.filter(
      (item) => item.position === "DM"
    ),

    MF: players.filter(
      (item) => item.position === "MF"
    ),

    AM: players.filter(
      (item) => item.position === "AM"
    ),

    FW: players.filter(
      (item) => item.position === "FW"
    ),
  };

  /* =======================================================
     MEDIA MÁS ALTA
  ======================================================= */

  function getHighestRating(
    player: GlobalEsmsPlayer
  ) {
    return Math.max(
      player.st,
      player.tk,
      player.ps,
      player.sh
    );
  }

  /* =======================================================
     COLOR DE MEDIA
  ======================================================= */

  function ratingClass(
    rating: number,
    player: GlobalEsmsPlayer
  ) {
    const highest =
      getHighestRating(player);

    if (rating === highest) {
      return "font-black text-emerald-400";
    }

    return "font-semibold text-white";
  }

  /* =======================================================
     TOOLTIP
  ======================================================= */

  function renderTooltip(
    player: GlobalEsmsPlayer
  ) {
    return (
      <div
        className="
          pointer-events-none
          absolute
          bottom-full
          left-1/2
          z-[200]
          mb-3
          hidden
          w-[210px]
          -translate-x-1/2
          rounded-lg
          border
          border-slate-700
          bg-slate-950
          px-3
          py-2
          shadow-2xl

          group-hover:block
        "
      >
        {/* FLECHA */}

        <div
          className="
            absolute
            -bottom-[6px]
            left-1/2
            h-3
            w-3
            -translate-x-1/2
            rotate-45
            border-b
            border-r
            border-slate-700
            bg-slate-950
          "
        />

        {/* NOMBRE */}

        <div
          className="
            relative
            z-10
            mb-2
            overflow-hidden
            text-ellipsis
            whitespace-nowrap
            border-b
            border-slate-800
            pb-2
            text-left
            text-xs
            font-bold
            text-white
          "
        >
          {player.name}
        </div>

        {/* MEDIAS */}

        <div
          className="
            relative
            z-10
            grid
            grid-cols-5
            gap-2
          "
        >
          {/* ST */}

          <div className="text-center">
            <div
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              ST
            </div>

            <div
              className={`
                mt-0.5
                text-sm

                ${ratingClass(
                  player.st,
                  player
                )}
              `}
            >
              {player.st}
            </div>
          </div>

          {/* TK */}

          <div className="text-center">
            <div
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              TK
            </div>

            <div
              className={`
                mt-0.5
                text-sm

                ${ratingClass(
                  player.tk,
                  player
                )}
              `}
            >
              {player.tk}
            </div>
          </div>

          {/* PS */}

          <div className="text-center">
            <div
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              PS
            </div>

            <div
              className={`
                mt-0.5
                text-sm

                ${ratingClass(
                  player.ps,
                  player
                )}
              `}
            >
              {player.ps}
            </div>
          </div>

          {/* SH */}

          <div className="text-center">
            <div
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              SH
            </div>

            <div
              className={`
                mt-0.5
                text-sm

                ${ratingClass(
                  player.sh,
                  player
                )}
              `}
            >
              {player.sh}
            </div>
          </div>

          {/* FIT */}

          <div className="text-center">
            <div
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              FIT
            </div>

            <div
              className={`
                mt-0.5
                text-sm
                font-black

                ${
                  player.fit < 100
                    ? "text-yellow-400"
                    : "text-white"
                }
              `}
            >
              {player.fit}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDERIZAR LÍNEA DE JUGADORES
  ======================================================= */

  function renderLine(
    linePlayers: PitchPlayer[],
    top: string
  ) {
    if (linePlayers.length === 0) {
      return null;
    }

    return (
      <div
        className="
          absolute
          left-0
          right-0
          z-20
          flex
          items-center
          justify-evenly
          px-6
        "
        style={{ top }}
      >
        {linePlayers.map(
          ({ player, position }) => (
            <div
              key={`${player.teamCode}-${player.name}-${position}`}
              className="
                group
                relative
                flex
                w-[110px]
                flex-col
                items-center
                text-center
              "
            >
              {/* TOOLTIP */}

              {renderTooltip(player)}

              {/* CÍRCULO DE POSICIÓN */}

              <div
                className={`
                  relative
                  z-20
                  flex
                  h-10
                  min-w-10
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  border-white
                  px-2
                  text-xs
                  font-black
                  shadow-lg
                  transition-transform
                  duration-150

                  group-hover:scale-110

                  ${POSITION_COLORS[position]}
                `}
              >
                {position}
              </div>

              {/* NOMBRE DEL JUGADOR */}

              <div
                className="
                  relative
                  z-20
                  mt-1
                  w-full
                  truncate
                  px-1
                  text-center
                  text-[11px]
                  font-bold
                  text-white
                  drop-shadow-md
                "
                title={player.name}
              >
                {player.name}
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  /* =======================================================
     CAMPO
  ======================================================= */

  return (
    <div
      className="
        relative
        mx-auto
        aspect-[68/105]
        w-full
        max-w-[620px]
        rounded-xl
        border-2
        border-white/70
        bg-green-700
        shadow-xl
      "
    >
      {/* ===================================================
          DIBUJO DEL CAMPO
      =================================================== */}

      <div
        className="
          absolute
          inset-0
          z-0
          overflow-hidden
          rounded-[10px]
        "
      >
        {/* FONDO */}

        <div
          className="
            absolute
            inset-0
            bg-green-700
          "
        />

        {/* FRANJAS DEL CÉSPED */}

        <div
          className="
            absolute
            left-0
            top-0
            h-full
            w-1/6
            bg-white/[0.025]
          "
        />

        <div
          className="
            absolute
            left-1/3
            top-0
            h-full
            w-1/6
            bg-white/[0.025]
          "
        />

        <div
          className="
            absolute
            left-2/3
            top-0
            h-full
            w-1/6
            bg-white/[0.025]
          "
        />

        {/* LÍNEA CENTRAL */}

        <div
          className="
            absolute
            left-0
            right-0
            top-1/2
            border-t-2
            border-white/60
          "
        />

        {/* CÍRCULO CENTRAL */}

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-28
            w-28
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            border-2
            border-white/60
          "
        />

        {/* PUNTO CENTRAL */}

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-2
            w-2
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white
          "
        />

        {/* =================================================
            ÁREA SUPERIOR
        ================================================= */}

        <div
          className="
            absolute
            left-1/2
            top-0
            h-[16%]
            w-[56%]
            -translate-x-1/2
            border-b-2
            border-l-2
            border-r-2
            border-white/60
          "
        />

        {/* ÁREA PEQUEÑA SUPERIOR */}

        <div
          className="
            absolute
            left-1/2
            top-0
            h-[7%]
            w-[28%]
            -translate-x-1/2
            border-b-2
            border-l-2
            border-r-2
            border-white/60
          "
        />

        {/* PUNTO DE PENALTI SUPERIOR */}

        <div
          className="
            absolute
            left-1/2
            top-[11%]
            h-1.5
            w-1.5
            -translate-x-1/2
            rounded-full
            bg-white/80
          "
        />

        {/* =================================================
            ÁREA INFERIOR
        ================================================= */}

        <div
          className="
            absolute
            bottom-0
            left-1/2
            h-[16%]
            w-[56%]
            -translate-x-1/2
            border-l-2
            border-r-2
            border-t-2
            border-white/60
          "
        />

        {/* ÁREA PEQUEÑA INFERIOR */}

        <div
          className="
            absolute
            bottom-0
            left-1/2
            h-[7%]
            w-[28%]
            -translate-x-1/2
            border-l-2
            border-r-2
            border-t-2
            border-white/60
          "
        />

        {/* PUNTO DE PENALTI INFERIOR */}

        <div
          className="
            absolute
            bottom-[11%]
            left-1/2
            h-1.5
            w-1.5
            -translate-x-1/2
            rounded-full
            bg-white/80
          "
        />
      </div>

      {/* ===================================================
          JUGADORES
      =================================================== */}

      {renderLine(
        grouped.FW,
        "8%"
      )}

      {renderLine(
        grouped.AM,
        "24%"
      )}

      {renderLine(
        grouped.MF,
        "40%"
      )}

      {renderLine(
        grouped.DM,
        "56%"
      )}

      {renderLine(
        grouped.DF,
        "72%"
      )}

      {renderLine(
        grouped.GK,
        "87%"
      )}
    </div>
  );
}