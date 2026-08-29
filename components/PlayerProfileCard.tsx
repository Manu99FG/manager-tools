import Image from "next/image";

import PlayerRender from "@/components/PlayerRender";

import {
  getClubLogo,
} from "@/lib/club-logo";

import {
  getClubName,
} from "@/lib/club-names";

import {
  getPlayerProfile,
  type EsmsPosition,
} from "@/lib/esms-player";

import {
  getFlagUrl,
} from "@/lib/nationalities";

type DatabasePlayer = {
  id: string;
  esms_name: string;
  nationality: string;
};

type PlayerSnapshot = {
  id: string;
  team_code: string;
  snapshot_date: string;

  age: number;
  st: number;
  tk: number;
  ps: number;
  sh: number;
  ag: number;

  kab: number;
  tab: number;
  pab: number;
  sab: number;

  gam: number;
  sub: number;
  min: number;
  mom: number;

  sav: number;
  con: number;
  ktk: number;
  kps: number;
  sht: number;
  gls: number;
  ass: number;

  dp: number;
  inj: number;
  sus: number;
  fit: number;
};

type PlayerProfileCardProps = {
  player: DatabasePlayer;
  current: PlayerSnapshot;
  firstSnapshot?:
    | PlayerSnapshot
    | null;
  photoUrl?: string | null;
};

/* =========================================================
   COLORES POR POSICIÓN
   =========================================================

   La misma identidad visual se usa para:
   - badge de posición
   - media principal
   - halo del render
   - resplandor inferior
   - pequeños detalles de la carta
========================================================= */

const POSITION_THEME: Record<
  EsmsPosition,
  {
    label: string;
    badge: string;
    text: string;
    border: string;
    glow: string;
    glowSoft: string;
    glowBottom: string;
    shadow: string;
  }
> = {
  GK: {
    label: "PORTERO",
    badge:
      "bg-yellow-400/15 text-yellow-300 border-yellow-400/25",
    text: "text-yellow-300",
    border: "border-yellow-400/25",
    glow:
      "bg-yellow-400/30",
    glowSoft:
      "bg-yellow-300/15",
    glowBottom:
      "from-yellow-400/20",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(250,204,21,0.18)]",
  },

  DF: {
    label: "DEFENSA",
    badge:
      "bg-blue-500/15 text-blue-400 border-blue-500/25",
    text: "text-blue-400",
    border: "border-blue-500/25",
    glow:
      "bg-blue-500/30",
    glowSoft:
      "bg-blue-400/15",
    glowBottom:
      "from-blue-500/20",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(59,130,246,0.20)]",
  },

  DM: {
    label:
      "MEDIOCENTRO DEFENSIVO",
    badge:
      "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    text: "text-cyan-300",
    border: "border-cyan-500/25",
    glow:
      "bg-cyan-500/30",
    glowSoft:
      "bg-cyan-400/15",
    glowBottom:
      "from-cyan-500/20",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(6,182,212,0.20)]",
  },

  MF: {
    label: "CENTROCAMPISTA",
    badge:
      "bg-green-500/15 text-green-400 border-green-500/25",
    text: "text-green-400",
    border: "border-green-500/25",
    glow:
      "bg-green-500/30",
    glowSoft:
      "bg-green-400/15",
    glowBottom:
      "from-green-500/20",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(34,197,94,0.20)]",
  },

  AM: {
    label: "MEDIAPUNTA",
    badge:
      "bg-violet-500/15 text-violet-400 border-violet-500/25",
    text: "text-violet-400",
    border: "border-violet-500/25",
    glow:
      "bg-violet-500/30",
    glowSoft:
      "bg-violet-400/15",
    glowBottom:
      "from-violet-500/20",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(139,92,246,0.20)]",
  },

  FW: {
    label: "DELANTERO",
    badge:
      "bg-red-500/15 text-red-400 border-red-500/25",
    text: "text-red-400",
    border: "border-red-500/25",
    glow:
      "bg-red-500/30",
    glowSoft:
      "bg-red-400/15",
    glowBottom:
      "from-red-500/20",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(239,68,68,0.20)]",
  },
};

const SKILL_COLORS = {
  st: "text-blue-400",
  tk: "text-emerald-400",
  ps: "text-violet-400",
  sh: "text-amber-400",
};

type PositionStat = {
  label: string;
  value: string;
};

function formatDecimal(
  value: number
) {
  return value.toLocaleString(
    "es-ES",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function per90(
  value: number,
  minutes: number
) {
  if (
    minutes <= 0
  ) {
    return "0,00";
  }

  return formatDecimal(
    (
      value /
      minutes
    ) * 90
  );
}

function percentage(
  numerator: number,
  denominator: number
) {
  if (
    denominator <= 0
  ) {
    return "0,0 %";
  }

  return `${(
    (
      numerator /
      denominator
    ) *
    100
  ).toLocaleString(
    "es-ES",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }
  )} %`;
}

function getPositionStats(
  position: EsmsPosition,
  player: PlayerSnapshot
): PositionStat[] {
  switch (
    position
  ) {
    case "GK":
      return [
        {
          label:
            "PARADAS",
          value:
            player.sav.toLocaleString(
              "es-ES"
            ),
        },
        {
          label:
            "% PARADAS",
          value:
            percentage(
              player.sav,
              player.sav +
                player.con
            ),
        },
        {
          label:
            "PARADAS / 90",
          value:
            per90(
              player.sav,
              player.min
            ),
        },
        {
          label:
            "ENCAJADOS / 90",
          value:
            per90(
              player.con,
              player.min
            ),
        },
      ];

    case "DF":
      return [
        {
          label:
            "ENTRADAS / 90",
          value:
            per90(
              player.ktk,
              player.min
            ),
        },
        {
          label:
            "ENTRADAS",
          value:
            player.ktk.toLocaleString(
              "es-ES"
            ),
        },
        {
          label:
            "PASES CLAVE / 90",
          value:
            per90(
              player.kps,
              player.min
            ),
        },
        {
          label:
            "G+A / 90",
          value:
            per90(
              player.gls +
                player.ass,
              player.min
            ),
        },
      ];

    case "DM":
      return [
        {
          label:
            "ENTRADAS / 90",
          value:
            per90(
              player.ktk,
              player.min
            ),
        },
        {
          label:
            "PASES CLAVE / 90",
          value:
            per90(
              player.kps,
              player.min
            ),
        },
        {
          label:
            "ASIST. / 90",
          value:
            per90(
              player.ass,
              player.min
            ),
        },
        {
          label:
            "IMPACTO / 90",
          value:
            per90(
              player.ktk +
                player.kps,
              player.min
            ),
        },
      ];

    case "MF":
      return [
        {
          label:
            "PASES CLAVE / 90",
          value:
            per90(
              player.kps,
              player.min
            ),
        },
        {
          label:
            "ASIST. / 90",
          value:
            per90(
              player.ass,
              player.min
            ),
        },
        {
          label:
            "TIROS / 90",
          value:
            per90(
              player.sht,
              player.min
            ),
        },
        {
          label:
            "G+A / 90",
          value:
            per90(
              player.gls +
                player.ass,
              player.min
            ),
        },
      ];

    case "AM":
      return [
        {
          label:
            "PASES CLAVE / 90",
          value:
            per90(
              player.kps,
              player.min
            ),
        },
        {
          label:
            "G+A / 90",
          value:
            per90(
              player.gls +
                player.ass,
              player.min
            ),
        },
        {
          label:
            "TIROS / 90",
          value:
            per90(
              player.sht,
              player.min
            ),
        },
        {
          label:
            "CONVERSIÓN",
          value:
            percentage(
              player.gls,
              player.sht
            ),
        },
      ];

    case "FW":
      return [
        {
          label:
            "GOLES / 90",
          value:
            per90(
              player.gls,
              player.min
            ),
        },
        {
          label:
            "G+A / 90",
          value:
            per90(
              player.gls +
                player.ass,
              player.min
            ),
        },
        {
          label:
            "TIROS / 90",
          value:
            per90(
              player.sht,
              player.min
            ),
        },
        {
          label:
            "CONVERSIÓN",
          value:
            percentage(
              player.gls,
              player.sht
            ),
        },
      ];
  }
}

function cleanPlayerName(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signedValue(
  value: number
) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function differenceClass(
  value: number
) {
  if (value > 0) {
    return "text-emerald-400";
  }

  if (value < 0) {
    return "text-red-400";
  }

  return "text-slate-500";
}

function getTotalSkillExp(
  rating: number,
  exp: number
) {
  return rating * 1000 + exp;
}

function createEsmsPlayer(
  player: DatabasePlayer,
  current: PlayerSnapshot
) {
  return {
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
    rawLine: "",
  };
}

function getMainSkill(
  position: EsmsPosition,
  current: PlayerSnapshot
) {
  if (position === "GK") {
    return {
      label: "ST",
      rating:
        current.st,
      exp:
        current.kab,
    };
  }

  if (position === "DF") {
    return {
      label: "TK",
      rating:
        current.tk,
      exp:
        current.tab,
    };
  }

  if (
    position === "DM" ||
    position === "MF" ||
    position === "AM"
  ) {
    return {
      label: "PS",
      rating:
        current.ps,
      exp:
        current.pab,
    };
  }

  return {
    label: "SH",
    rating:
      current.sh,
    exp:
      current.sab,
  };
}

function getMainSkillFromSnapshot(
  position: EsmsPosition,
  snapshot: PlayerSnapshot
) {
  if (position === "GK") {
    return {
      rating:
        snapshot.st,
      exp:
        snapshot.kab,
    };
  }

  if (position === "DF") {
    return {
      rating:
        snapshot.tk,
      exp:
        snapshot.tab,
    };
  }

  if (
    position === "DM" ||
    position === "MF" ||
    position === "AM"
  ) {
    return {
      rating:
        snapshot.ps,
      exp:
        snapshot.pab,
    };
  }

  return {
    rating:
      snapshot.sh,
    exp:
      snapshot.sab,
  };
}

export default function PlayerProfileCard({
  player,
  current,
  firstSnapshot = null,
  photoUrl = null,
}: PlayerProfileCardProps) {
  const position =
    getPlayerProfile(
      createEsmsPlayer(
        player,
        current
      )
    );

  const theme =
    POSITION_THEME[
      position
    ];

  const positionStats =
    getPositionStats(
      position,
      current
    );

  const main =
    getMainSkill(
      position,
      current
    );

  const playerName =
    cleanPlayerName(
      player.esms_name
    );

  const nationality =
    player.nationality.toUpperCase();

  const flagUrl =
    getFlagUrl(
      player.nationality
    );

  const clubLogo =
    getClubLogo(
      current.team_code
    );

  const clubName =
    getClubName(
      current.team_code
    );

  return (
    <section
      className="
        overflow-hidden
        rounded-[28px]
        border
        border-blue-500/35
        bg-[#030a1d]
        shadow-2xl
        shadow-black/30
      "
    >
      <div
        className="
          grid
          grid-cols-1

          xl:grid-cols-[390px_minmax(0,1fr)]
          2xl:grid-cols-[430px_minmax(0,1fr)]
        "
      >
        {/* =====================================================
            COLUMNA IZQUIERDA / CARTA RENDER
        ====================================================== */}

        <div
          className="
            relative
            overflow-hidden
            border-b
            border-blue-500/25

            xl:border-b-0
            xl:border-r
          "
        >
          {/* ZONA SUPERIOR DEL RENDER */}

          <div
            className="
              relative
              min-h-[540px]
              overflow-hidden
              bg-[#07152f]

              sm:min-h-[600px]
              xl:min-h-[590px]
            "
          >
            {/* Fondo oscuro base */}
            <div
              className="
                absolute
                inset-0
                bg-gradient-to-b
                from-white/[0.025]
                via-transparent
                to-black/20
              "
            />

            {/* Halo principal según posición */}
            <div
              className={`
                pointer-events-none
                absolute
                -bottom-20
                left-1/2
                h-[460px]
                w-[460px]
                -translate-x-1/2
                rounded-full
                blur-[95px]
                ${theme.glow}
              `}
            />

            {/* Segundo halo detrás de cabeza/torso */}
            <div
              className={`
                pointer-events-none
                absolute
                bottom-[18%]
                left-1/2
                h-[300px]
                w-[300px]
                -translate-x-1/2
                rounded-full
                blur-[80px]
                ${theme.glowSoft}
              `}
            />

            {/* Luz inferior del mismo color */}
            <div
              className={`
                pointer-events-none
                absolute
                inset-x-0
                bottom-0
                h-52
                bg-gradient-to-t
                ${theme.glowBottom}
                via-transparent
                to-transparent
              `}
            />

            {/* Textura / viñeta */}
            <div
              className="
                pointer-events-none
                absolute
                inset-0
                bg-[radial-gradient(circle_at_50%_58%,transparent_0%,transparent_34%,rgba(0,0,0,0.20)_76%,rgba(0,0,0,0.48)_100%)]
              "
            />

            {/* CABECERA */}
            <div
              className="
                absolute
                inset-x-0
                top-0
                z-30
                flex
                items-start
                justify-between
                gap-4
                p-6
              "
            >
              <div>
                <div
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.34em]
                    text-blue-200/45
                  "
                >
                  Manager Tools
                </div>

                <div
                  className="
                    mt-7
                    text-7xl
                    font-black
                    leading-none
                    tracking-tight
                    text-white

                    sm:text-8xl
                  "
                >
                  {
                    main.rating
                  }
                </div>

                <div
                  className={`
                    mt-2
                    text-2xl
                    font-black
                    ${theme.text}
                  `}
                >
                  {
                    position
                  }
                </div>

                <div
                  className="
                    mt-2
                    max-w-[160px]
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-slate-400
                  "
                >
                  {
                    theme.label
                  }
                </div>
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                {flagUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      flagUrl
                    }
                    alt={
                      nationality
                    }
                    width={30}
                    height={22}
                    className="
                      h-[22px]
                      w-[30px]
                      rounded-sm
                      object-cover
                      shadow-lg
                    "
                  />
                ) : (
                  <span
                    className="
                      text-xs
                      font-black
                      text-slate-300
                    "
                  >
                    {
                      nationality
                    }
                  </span>
                )}

                <div
                  className="
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                  "
                >
                  <Image
                    src={
                      clubLogo
                    }
                    alt={
                      clubName
                    }
                    width={56}
                    height={56}
                    className="
                      h-full
                      w-full
                      object-contain
                      drop-shadow-[0_5px_10px_rgba(0,0,0,0.45)]
                    "
                  />
                </div>
              </div>
            </div>

            {/* RENDER DEL JUGADOR */}
            {photoUrl ? (
              <PlayerRender
                src={photoUrl}
                alt={playerName}
                position={position}
                shadowClass={theme.shadow}
              />
            ) : (
              <div
                className="
                  absolute
                  inset-x-0
                  bottom-0
                  z-20
                  flex
                  h-[70%]
                  items-center
                  justify-center
                "
              >
                <div
                  className={`
                    flex
                    h-36
                    w-36
                    items-center
                    justify-center
                    rounded-full
                    border
                    bg-slate-950/45
                    text-5xl
                    font-black
                    text-slate-700
                    backdrop-blur-sm
                    ${theme.border}
                  `}
                >
                  {
                    position
                  }
                </div>
              </div>
            )}

            {/* Sombra para integrar los pies del render */}
            <div
              className="
                pointer-events-none
                absolute
                inset-x-0
                bottom-0
                z-20
                h-24
                bg-gradient-to-t
                from-[#020718]
                via-[#020718]/65
                to-transparent
              "
            />
          </div>

          {/* PIE DE LA CARTA */}

          <div
            className="
              relative
              z-30
              bg-[#020718]
              p-5
            "
          >
            <div
              className="
                truncate
                text-2xl
                font-black
                uppercase
                tracking-tight
                text-white
              "
              title={
                playerName
              }
            >
              {
                playerName
              }
            </div>

            <div
              className="
                mt-2
                flex
                flex-wrap
                items-center
                gap-2
                text-xs
                text-slate-400
              "
            >
              <span>
                {
                  current.age
                } años
              </span>

              <span>•</span>

              {flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    flagUrl
                  }
                  alt={
                    nationality
                  }
                  width={20}
                  height={15}
                  className="
                    h-[15px]
                    w-5
                    rounded-sm
                    object-cover
                  "
                />
              ) : null}

              <span>
                {
                  nationality
                }
              </span>

              <span>•</span>

              <span>
                {
                  current.team_code
                }
              </span>
            </div>

            <div
              className="
                mt-5
                grid
                grid-cols-4
                gap-2
              "
            >
              <MiniSkill
                label="ST"
                value={
                  current.st
                }
                active={
                  position ===
                  "GK"
                }
                activeClass={
                  theme.border
                }
              />

              <MiniSkill
                label="TK"
                value={
                  current.tk
                }
                active={
                  position ===
                    "DF" ||
                  position ===
                    "DM"
                }
                activeClass={
                  theme.border
                }
              />

              <MiniSkill
                label="PS"
                value={
                  current.ps
                }
                active={
                  position ===
                    "MF" ||
                  position ===
                    "AM"
                }
                activeClass={
                  theme.border
                }
              />

              <MiniSkill
                label="SH"
                value={
                  current.sh
                }
                active={
                  position ===
                  "FW"
                }
                activeClass={
                  theme.border
                }
              />
            </div>
          </div>
        </div>

        {/* =====================================================
            COLUMNA DERECHA
        ====================================================== */}

        <div
          className="
            min-w-0
            bg-[#030a1d]
            p-6

            sm:p-8
          "
        >
          {/* CABECERA DERECHA */}

          <div
            className="
              min-w-0
              w-full
            "
          >
            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <span
                className={`
                  rounded-full
                  border
                  px-3
                  py-1
                  text-xs
                  font-black
                  ${theme.badge}
                `}
              >
                {position}
              </span>

              <span
                className="
                  rounded-full
                  bg-slate-800/60
                  px-3
                  py-1
                  text-xs
                  font-black
                  text-slate-400
                "
              >
                {current.team_code}
              </span>
            </div>

            {/*
              NOMBRE
              Intentamos mantenerlo siempre en una sola línea.
              Usamos un tamaño responsivo más contenido para que
              nombres largos como M TER STEGEN entren sin cortarse.
            */}
            <h1
              className="
                mt-5
                w-full
                min-w-0
                overflow-hidden
                whitespace-nowrap
                text-[clamp(1.75rem,4.2vw,4rem)]
                font-black
                uppercase
                leading-none
                tracking-[-0.045em]
                text-white

                xl:text-[clamp(1.8rem,3.1vw,3.5rem)]
                2xl:text-[clamp(2rem,3.25vw,4rem)]
              "
            >
              {playerName}
            </h1>

            {/*
              INFORMACIÓN DEL JUGADOR
              Solo bandera + edad + equipo.
            */}
            <div
              className="
                mt-4
                flex
                flex-wrap
                items-center
                gap-x-3
                gap-y-2
                text-sm
                text-slate-300
              "
            >
              {flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flagUrl}
                  alt={nationality}
                  title={nationality}
                  width={24}
                  height={18}
                  className="
                    h-[18px]
                    w-6
                    rounded-sm
                    object-cover
                  "
                />
              ) : null}

              <span>
                {current.age} años
              </span>

              <span>
                {clubName}
              </span>
            </div>

            {/*
              INFORMACIONES PRINCIPALES
              En tarjetas como el resto de estadísticas:
              PARTIDOS | MINUTOS | MVP'S
            */}
            <div
              className="
                mt-5
                grid
                grid-cols-1
                gap-3

                sm:grid-cols-3
              "
            >
              <KpiCard
                label="PARTIDOS"
                value={current.gam.toLocaleString(
                  "es-ES"
                )}
              />

              <KpiCard
                label="MINUTOS"
                value={current.min.toLocaleString(
                  "es-ES"
                )}
              />

              <KpiCard
                label="MVP'S"
                value={current.mom.toLocaleString(
                  "es-ES"
                )}
              />
            </div>
          </div>

          {/* HABILIDADES */}

          <section
            className="
              mt-10
              rounded-2xl
              border
              border-slate-800
              bg-[#071027]
              p-5
            "
          >
            <div
              className="
                text-xs
                font-black
                uppercase
                tracking-[0.18em]
                text-slate-500
              "
            >
              Habilidades
            </div>

            <div
              className="
                mt-5
                grid
                grid-cols-1
                gap-3

                sm:grid-cols-2
                lg:grid-cols-4
              "
            >
              <SkillBox
                label="ST"
                rating={
                  current.st
                }
                exp={
                  current.kab
                }
                color={
                  SKILL_COLORS.st
                }
              />

              <SkillBox
                label="TK"
                rating={
                  current.tk
                }
                exp={
                  current.tab
                }
                color={
                  SKILL_COLORS.tk
                }
              />

              <SkillBox
                label="PS"
                rating={
                  current.ps
                }
                exp={
                  current.pab
                }
                color={
                  SKILL_COLORS.ps
                }
              />

              <SkillBox
                label="SH"
                rating={
                  current.sh
                }
                exp={
                  current.sab
                }
                color={
                  SKILL_COLORS.sh
                }
              />
            </div>
          </section>

          {/* ESTADÍSTICAS CLAVE POR POSICIÓN */}

          <section
            className="
              mt-4
            "
          >
            <div
              className="
                mb-3
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-slate-500
                "
              >
                Estadísticas clave · {
                  POSITION_THEME[
                    position
                  ].label
                }
              </div>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-3

                md:grid-cols-4
              "
            >
              {positionStats.map(
                (
                  stat
                ) => (
                  <BottomStat
                    key={
                      stat.label
                    }
                    label={
                      stat.label
                    }
                    value={
                      stat.value
                    }
                  />
                )
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function MiniSkill({
  label,
  value,
  active,
  activeClass,
}: {
  label: string;
  value: number;
  active: boolean;
  activeClass: string;
}) {
  return (
    <div
      className={`
        rounded-lg
        border
        bg-slate-950/55
        px-2
        py-3
        text-center

        ${
          active
            ? activeClass
            : "border-slate-800"
        }
      `}
    >
      <div
        className="
          text-[9px]
          font-black
          uppercase
          text-slate-500
        "
      >
        {
          label
        }
      </div>

      <div
        className="
          mt-1
          text-sm
          font-black
          text-white
        "
      >
        {
          value
        }
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  difference = null,
  differenceValue = 0,
  valueClass =
    "text-white",
}: {
  label: string;
  value: string;
  difference?:
    | string
    | null;
  differenceValue?: number;
  valueClass?: string;
}) {
  return (
    <div
      className="
        min-h-[122px]
        rounded-2xl
        border
        border-slate-800
        bg-[#071027]
        p-4
      "
    >
      <div
        className="
          min-h-8
          text-[10px]
          font-black
          uppercase
          leading-4
          tracking-wide
          text-slate-500
        "
      >
        {
          label
        }
      </div>

      <div
        className={`
          mt-2
          text-2xl
          font-black
          ${valueClass}
        `}
      >
        {
          value
        }
      </div>

      {difference && (
        <div
          className={`
            mt-1
            text-xs
            font-black
            ${differenceClass(
              differenceValue
            )}
          `}
        >
          {
            difference
          }
        </div>
      )}
    </div>
  );
}

function SkillBox({
  label,
  rating,
  exp,
  color,
}: {
  label: string;
  rating: number;
  exp: number;
  color: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-[#050d20]
        p-4
      "
    >
      <div
        className={`
          text-xs
          font-black
          ${color}
        `}
      >
        {
          label
        }
      </div>

      <div
        className="
          mt-3
          text-3xl
          font-black
          text-white
        "
      >
        {
          rating
        }
      </div>

      <div
        className="
          mt-2
          text-xs
          text-slate-500
        "
      >
        EXP {exp}
      </div>

      <div
        className="
          mt-1
          text-[10px]
          text-slate-600
        "
      >
        Total{" "}
        {getTotalSkillExp(
          rating,
          exp
        ).toLocaleString(
          "es-ES"
        )}
      </div>
    </div>
  );
}

function BottomStat({
  label,
  value,
}: {
  label: string;
  value:
    | number
    | string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-[#071027]
        p-4
      "
    >
      <div
        className="
          text-[9px]
          font-black
          uppercase
          tracking-wide
          text-slate-500
        "
      >
        {
          label
        }
      </div>

      <div
        className="
          mt-2
          text-lg
          font-black
          text-white
        "
      >
        {
          value
        }
      </div>
    </div>
  );
}