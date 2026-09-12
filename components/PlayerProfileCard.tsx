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
      "bg-yellow-400/15 text-yellow-800 border-yellow-400/25",
    text: "text-yellow-800",
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
      "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)] border-[var(--mt-gold)]",
    text: "text-[var(--mt-gold-dark)]",
    border: "border-[var(--mt-gold)]",
    glow:
      "bg-[var(--mt-surface-soft)]",
    glowSoft:
      "bg-[var(--mt-surface-soft)]",
    glowBottom:
      "from-[var(--mt-surface-soft)]",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(59,130,246,0.20)]",
  },

  DM: {
    label:
      "MEDIOCENTRO DEFENSIVO",
    badge:
      "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)] border-[var(--mt-gold)]",
    text: "text-[var(--mt-gold-dark)]",
    border: "border-[var(--mt-gold)]",
    glow:
      "bg-[var(--mt-surface-soft)]",
    glowSoft:
      "bg-[var(--mt-surface-soft)]",
    glowBottom:
      "from-[var(--mt-surface-soft)]",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(6,182,212,0.20)]",
  },

  MF: {
    label: "CENTROCAMPISTA",
    badge:
      "bg-green-500/15 text-emerald-700 border-green-500/25",
    text: "text-emerald-700",
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
      "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)] border-[var(--mt-gold)]",
    text: "text-[var(--mt-gold-dark)]",
    border: "border-[var(--mt-gold)]",
    glow:
      "bg-[var(--mt-surface-soft)]",
    glowSoft:
      "bg-[var(--mt-surface-soft)]",
    glowBottom:
      "from-[var(--mt-surface-soft)]",
    shadow:
      "drop-shadow-[0_28px_35px_rgba(139,92,246,0.20)]",
  },

  FW: {
    label: "DELANTERO",
    badge:
      "bg-red-500/15 text-red-700 border-red-500/25",
    text: "text-red-700",
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
  st: "text-[var(--mt-gold-dark)]",
  tk: "text-emerald-700",
  ps: "text-[var(--mt-gold-dark)]",
  sh: "text-[var(--mt-gold-dark)]",
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
    return "text-emerald-700";
  }

  if (value < 0) {
    return "text-red-700";
  }

  return "text-[var(--mt-muted)]";
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
        rounded-[6px]
        border
        border-[var(--mt-line)]
        bg-[var(--mt-surface-soft)]
        shadow-sm
      "
    >
      {/* CABECERA FORO */}

      <div
        className="
          flex
          items-center
          justify-between
          gap-4
          border
          border-[var(--mt-line)]
          bg-[linear-gradient(180deg,#75602f_0%,#56410f_100%)]
          px-4
          py-2.5
        "
      >
        <div
          className="
            text-[11px]
            font-black
            uppercase
            tracking-[0.14em]
            text-[var(--mt-text)]
          "
        >
          Ficha oficial del jugador
        </div>

        <div
          className="
            text-[9px]
            font-bold
            uppercase
            tracking-[0.08em]
            text-[var(--mt-muted)]
          "
        >
          Liga de Leyendas
        </div>
      </div>

      <div
        className="
          grid
          grid-cols-1

          xl:grid-cols-[340px_minmax(0,1fr)]
        "
      >
        {/* COLUMNA FOTO */}

        <div
          className="
            relative
            border-b
            border-[var(--mt-line)]
            bg-[var(--mt-surface-soft)]

            xl:border-b-0
            xl:border-r
          "
        >
          <div
            className="
              relative
              min-h-[470px]
              overflow-hidden
              bg-[linear-gradient(180deg,#ece9df_0%,#ded7c4_58%,#cbbd91_100%)]
            "
          >
            <div
              className="
                absolute
                left-5
                top-5
                z-20
              "
            >
              <div
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-[var(--mt-gold)]
                "
              >
                Media principal
              </div>

              <div
                className="
                  mt-1
                  text-6xl
                  font-black
                  leading-none
                  text-[var(--mt-text)]
                "
              >
                {main.rating}
              </div>

              <div
                className="
                  mt-1
                  text-xl
                  font-black
                  uppercase
                  text-[var(--mt-gold)]
                "
              >
                {position}
              </div>

              <div
                className="
                  mt-1
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-[var(--mt-muted)]
                "
              >
                {theme.label}
              </div>
            </div>

            <div
              className="
                absolute
                right-5
                top-5
                z-20
                flex
                items-center
                gap-3
              "
            >
              {flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flagUrl}
                  alt={nationality}
                  width={30}
                  height={22}
                  className="
                    h-[22px]
                    w-[30px]
                    rounded-sm
                    border
                    border-[var(--mt-line)]
                    object-cover
                    shadow-sm
                  "
                />
              ) : (
                <span
                  className="
                    text-[10px]
                    font-black
                    text-[var(--mt-text)]
                  "
                >
                  {nationality}
                </span>
              )}

              <div
                className="
                  relative
                  h-12
                  w-12
                "
              >
                <Image
                  src={clubLogo}
                  alt={clubName}
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
            </div>

            {photoUrl ? (
              <PlayerRender
                src={photoUrl}
                alt={playerName}
                position={position}
                shadowClass="drop-shadow-[0_18px_20px_rgba(0,0,0,0.18)]"
              />
            ) : (
              <div
                className="
                  absolute
                  inset-x-0
                  bottom-14
                  z-10
                  flex
                  justify-center
                "
              >
                <div
                  className="
                    grid
                    h-32
                    w-32
                    place-items-center
                    rounded-full
                    border
                    border-[var(--mt-line)]
                    bg-[var(--mt-surface)]
                    text-4xl
                    font-black
                    text-[var(--mt-gold)]
                  "
                >
                  {position}
                </div>
              </div>
            )}

            <div
              className="
                pointer-events-none
                absolute
                inset-x-0
                bottom-0
                z-20
                h-20
                bg-gradient-to-t
                from-[var(--mt-gold)]
                to-transparent
              "
            />
          </div>

          <div
            className="
              bg-[var(--mt-surface-soft)]
              p-5
            "
          >
            <div
              className="
                truncate
                text-xl
                font-black
                uppercase
                tracking-[0.04em]
                text-[var(--mt-text)]
              "
              title={playerName}
            >
              {playerName}
            </div>

            <div
              className="
                mt-2
                flex
                flex-wrap
                items-center
                gap-2
                text-[10px]
                font-bold
                uppercase
                text-[var(--mt-muted)]
              "
            >
              <span>{current.age} años</span>
              <span>•</span>
              <span>{nationality}</span>
              <span>•</span>
              <span>{current.team_code}</span>
            </div>

            <div
              className="
                mt-4
                grid
                grid-cols-4
                gap-2
              "
            >
              <MiniSkill
                label="ST"
                value={current.st}
                active={position === "GK"}
                activeClass=""
              />

              <MiniSkill
                label="TK"
                value={current.tk}
                active={
                  position === "DF" ||
                  position === "DM"
                }
                activeClass=""
              />

              <MiniSkill
                label="PS"
                value={current.ps}
                active={
                  position === "MF" ||
                  position === "AM"
                }
                activeClass=""
              />

              <MiniSkill
                label="SH"
                value={current.sh}
                active={position === "FW"}
                activeClass=""
              />
            </div>
          </div>
        </div>

        {/* COLUMNA INFORMACIÓN */}

        <div
          className="
            min-w-0
            bg-[var(--mt-surface-soft)]
            p-5

            sm:p-6
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
              className="
                rounded-sm
                border
                border-[var(--mt-line)]
                bg-[var(--mt-gold)]
                px-2
                py-1
                text-[9px]
                font-black
                uppercase
                tracking-[0.08em]
                text-[var(--mt-text)]
              "
            >
              {position}
            </span>

            <span
              className="
                rounded-sm
                border
                border-[var(--mt-line)]
                bg-[var(--mt-surface)]
                px-2
                py-1
                text-[9px]
                font-black
                uppercase
                tracking-[0.08em]
                text-[var(--mt-text)]
              "
            >
              {current.team_code}
            </span>
          </div>

          <h1
            className="
              mt-4
              text-[clamp(1.8rem,4vw,3.6rem)]
              font-black
              uppercase
              leading-none
              tracking-[-0.02em]
              text-[var(--mt-text)]
            "
          >
            » {playerName} «
          </h1>

          <div
            className="
              mt-3
              flex
              flex-wrap
              items-center
              gap-x-3
              gap-y-2
              text-[11px]
              font-bold
              text-[var(--mt-muted)]
            "
          >
            {flagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flagUrl}
                alt={nationality}
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

            <span>{current.age} años</span>
            <span>•</span>
            <span>{clubName}</span>
          </div>

          <div
            className="
              mt-5
              grid
              grid-cols-1
              gap-px
              overflow-hidden
              rounded
              border
              border-[var(--mt-line)]
              bg-[var(--mt-surface)]

              sm:grid-cols-3
            "
          >
            <KpiCard
              label="Partidos"
              value={current.gam.toLocaleString("es-ES")}
            />

            <KpiCard
              label="Minutos"
              value={current.min.toLocaleString("es-ES")}
            />

            <KpiCard
              label="MVP's"
              value={current.mom.toLocaleString("es-ES")}
            />
          </div>

          <section
            className="
              mt-6
              overflow-hidden
              rounded
              border
              border-[var(--mt-line)]
              bg-[var(--mt-surface)]
            "
          >
            <div
              className="
                border
                border-[var(--mt-line)]
                bg-[linear-gradient(180deg,#75602f_0%,#56410f_100%)]
                px-4
                py-2
                text-[10px]
                font-black
                uppercase
                tracking-[0.12em]
                text-[var(--mt-text)]
              "
            >
              Habilidades
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-px
                bg-[var(--mt-line)]

                lg:grid-cols-4
              "
            >
              <SkillBox
                label="ST"
                rating={current.st}
                exp={current.kab}
                color=""
              />

              <SkillBox
                label="TK"
                rating={current.tk}
                exp={current.tab}
                color=""
              />

              <SkillBox
                label="PS"
                rating={current.ps}
                exp={current.pab}
                color=""
              />

              <SkillBox
                label="SH"
                rating={current.sh}
                exp={current.sab}
                color=""
              />
            </div>
          </section>

          <section
            className="
              mt-4
              overflow-hidden
              rounded
              border
              border-[var(--mt-line)]
              bg-[var(--mt-surface)]
            "
          >
            <div
              className="
                border
                border-[var(--mt-line)]
                bg-[linear-gradient(180deg,#75602f_0%,#56410f_100%)]
                px-4
                py-2
                text-[10px]
                font-black
                uppercase
                tracking-[0.12em]
                text-[var(--mt-text)]
              "
            >
              Estadísticas clave · {theme.label}
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-px
                bg-[var(--mt-line)]

                md:grid-cols-4
              "
            >
              {positionStats.map(
                (stat) => (
                  <BottomStat
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
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
}: {
  label: string;
  value: number;
  active: boolean;
  activeClass: string;
}) {
  return (
    <div
      className={`
        rounded
        border
        px-2
        py-2.5
        text-center

        ${
          active
            ? "border-[var(--mt-line)] bg-[var(--mt-gold)]"
            : "border-[var(--mt-line)] bg-[var(--mt-surface)]"
        }
      `}
    >
      <div
        className="
          text-[8px]
          font-black
          uppercase
          tracking-[0.08em]
          text-[var(--mt-muted)]
        "
      >
        {label}
      </div>

      <div
        className="
          mt-1
          text-sm
          font-black
          text-[var(--mt-text)]
        "
      >
        {value}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string;
  difference?: string | null;
  differenceValue?: number;
  valueClass?: string;
}) {
  return (
    <div
      className="
        min-h-[92px]
        bg-[var(--mt-surface-soft)]
        p-4
      "
    >
      <div
        className="
          text-[9px]
          font-black
          uppercase
          tracking-[0.08em]
          text-[var(--mt-gold)]
        "
      >
        {label}
      </div>

      <div
        className="
          mt-3
          text-2xl
          font-black
          text-[var(--mt-text)]
        "
      >
        {value}
      </div>
    </div>
  );
}

function SkillBox({
  label,
  rating,
  exp,
}: {
  label: string;
  rating: number;
  exp: number;
  color: string;
}) {
  return (
    <div
      className="
        bg-[var(--mt-surface)]
        p-4
      "
    >
      <div
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.08em]
          text-[var(--mt-gold)]
        "
      >
        {label}
      </div>

      <div
        className="
          mt-2
          text-3xl
          font-black
          text-[var(--mt-text)]
        "
      >
        {rating}
      </div>

      <div
        className="
          mt-2
          text-[10px]
          text-[var(--mt-muted)]
        "
      >
        EXP {exp.toLocaleString("es-ES")}
      </div>

      <div
        className="
          mt-1
          text-[9px]
          text-[var(--mt-muted)]
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
        bg-[var(--mt-surface)]
        p-4
      "
    >
      <div
        className="
          text-[8px]
          font-black
          uppercase
          tracking-[0.08em]
          text-[var(--mt-muted)]
        "
      >
        {label}
      </div>

      <div
        className="
          mt-2
          text-lg
          font-black
          text-[var(--mt-text)]
        "
      >
        {value}
      </div>
    </div>
  );
}
