import Image from "next/image";

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

import {
  getTotalSkillExp,
} from "@/lib/player-history";

import type {
  DatabasePlayer,
  PlayerSnapshot,
} from "@/lib/player-history-types";

type PlayerProfileCardProps = {
  player: DatabasePlayer;

  current: PlayerSnapshot;

  photoUrl?:
    | string
    | null;

  firstSnapshot?:
    | PlayerSnapshot
    | null;
};

const POSITION_STYLES: Record<
  EsmsPosition,
  {
    accent: string;
    accentSoft: string;
    border: string;
    gradient: string;
    label: string;
  }
> = {
  GK: {
    accent: "text-blue-400",
    accentSoft:
      "bg-blue-500/10",
    border:
      "border-blue-500/35",
    gradient:
      "from-blue-500/25 via-blue-500/5 to-transparent",
    label:
      "Portero",
  },

  DF: {
    accent:
      "text-emerald-400",
    accentSoft:
      "bg-emerald-500/10",
    border:
      "border-emerald-500/35",
    gradient:
      "from-emerald-500/25 via-emerald-500/5 to-transparent",
    label:
      "Defensa",
  },

  DM: {
    accent:
      "text-cyan-400",
    accentSoft:
      "bg-cyan-500/10",
    border:
      "border-cyan-500/35",
    gradient:
      "from-cyan-500/25 via-cyan-500/5 to-transparent",
    label:
      "Pivote",
  },

  MF: {
    accent:
      "text-violet-400",
    accentSoft:
      "bg-violet-500/10",
    border:
      "border-violet-500/35",
    gradient:
      "from-violet-500/25 via-violet-500/5 to-transparent",
    label:
      "Centrocampista",
  },

  AM: {
    accent:
      "text-fuchsia-400",
    accentSoft:
      "bg-fuchsia-500/10",
    border:
      "border-fuchsia-500/35",
    gradient:
      "from-fuchsia-500/25 via-fuchsia-500/5 to-transparent",
    label:
      "Mediapunta",
  },

  FW: {
    accent:
      "text-amber-400",
    accentSoft:
      "bg-amber-500/10",
    border:
      "border-amber-500/35",
    gradient:
      "from-amber-500/25 via-amber-500/5 to-transparent",
    label:
      "Delantero",
  },
};

function formatNumber(
  value: number
) {
  return value.toLocaleString(
    "es-ES"
  );
}

function signedValue(
  value: number
) {
  if (
    value > 0
  ) {
    return `+${value}`;
  }

  return String(
    value
  );
}

function getPrimaryData(
  position: EsmsPosition,
  current: PlayerSnapshot
) {
  if (
    position === "GK"
  ) {
    return {
      shortLabel:
        "ST",

      rating:
        current.st,

      exp:
        current.kab,

      totalExp:
        getTotalSkillExp(
          current.st,
          current.kab
        ),
    };
  }

  if (
    position === "DF"
  ) {
    return {
      shortLabel:
        "TK",

      rating:
        current.tk,

      exp:
        current.tab,

      totalExp:
        getTotalSkillExp(
          current.tk,
          current.tab
        ),
    };
  }

  if (
    position === "FW"
  ) {
    return {
      shortLabel:
        "SH",

      rating:
        current.sh,

      exp:
        current.sab,

      totalExp:
        getTotalSkillExp(
          current.sh,
          current.sab
        ),
    };
  }

  return {
    shortLabel:
      "PS",

    rating:
      current.ps,

    exp:
      current.pab,

    totalExp:
      getTotalSkillExp(
        current.ps,
        current.pab
      ),
  };
}

export default function PlayerProfileCard({
  player,
  current,
  photoUrl = null,
  firstSnapshot = null,
}: PlayerProfileCardProps) {
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

  const style =
    POSITION_STYLES[
      position
    ];

  const primary =
    getPrimaryData(
      position,
      current
    );

  const firstPrimary =
    firstSnapshot
      ? getPrimaryData(
          position,
          firstSnapshot
        )
      : null;

  const ratingDifference =
    firstPrimary
      ? primary.rating -
        firstPrimary.rating
      : 0;

  const expDifference =
    firstPrimary
      ? primary.totalExp -
        firstPrimary.totalExp
      : 0;

  const teamCode =
    current.team_code;

  const clubName =
    getClubName(
      teamCode
    );

  const clubLogo =
    getClubLogo(
      teamCode
    );

  const flagUrl =
    getFlagUrl(
      player.nationality
    );

  return (
    <section
      className={`
        relative
        overflow-hidden
        rounded-[28px]
        border
        ${style.border}
        bg-slate-950
      `}
    >
      <div
        className={`
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-br
          ${style.gradient}
        `}
      />

      <div
        className="
          relative
          grid
          grid-cols-1

          xl:grid-cols-[390px_minmax(0,1fr)]
        "
      >
        {/* CARTA */}

        <div
          className={`
            relative
            min-h-[560px]
            overflow-hidden
            border-b
            ${style.border}

            xl:min-h-[620px]
            xl:border-b-0
            xl:border-r
          `}
        >
          <div
            className={`
              absolute
              inset-0
              bg-gradient-to-br
              ${style.gradient}
            `}
          />

          <div
            className="
              absolute
              left-6
              top-6
              z-20
              text-[10px]
              font-black
              uppercase
              tracking-[0.34em]
              text-white/30
            "
          >
            Manager Tools
          </div>

          {/* RATING */}

          <div
            className="
              absolute
              left-6
              top-14
              z-20
            "
          >
            <div
              className="
                text-7xl
                font-black
                leading-none
                text-white
              "
            >
              {
                primary.rating
              }
            </div>

            <div
              className={`
                mt-1
                text-2xl
                font-black
                ${style.accent}
              `}
            >
              {
                position
              }
            </div>

            <div
              className="
                mt-1
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              {
                style.label
              }
            </div>
          </div>

          {/* BANDERA + CLUB */}

          <div
            className="
              absolute
              right-6
              top-7
              z-20
              flex
              items-center
              gap-3
            "
          >
            {flagUrl && (
              <img
                src={
                  flagUrl
                }
                alt={
                  player.nationality
                }
                width={30}
                height={22}
                className="
                  h-[22px]
                  w-[30px]
                  rounded
                  object-cover
                "
              />
            )}

            <div
              className="
                relative
                h-12
                w-12
              "
            >
              <Image
                src={
                  clubLogo
                }
                alt={
                  clubName
                }
                fill
                sizes="48px"
                className="
                  object-contain
                "
              />
            </div>
          </div>

          {/* FOTO */}

          <div
            className="
              absolute
              inset-x-0
              bottom-[165px]
              top-[95px]
              z-10
              flex
              items-end
              justify-center
            "
          >
            {photoUrl ? (
              <img
                src={
                  photoUrl
                }
                alt={
                  player.esms_name
                }
                className="
                  h-full
                  w-full
                  object-contain
                  object-bottom
                  drop-shadow-[0_25px_35px_rgba(0,0,0,0.65)]
                "
              />
            ) : (
              <div
                className="
                  flex
                  h-full
                  w-full
                  items-end
                  justify-center
                "
              >
                <div
                  className="
                    relative
                    h-[80%]
                    w-[65%]
                    max-w-[250px]
                  "
                >
                  <div
                    className={`
                      absolute
                      left-1/2
                      top-6
                      h-28
                      w-28
                      -translate-x-1/2
                      rounded-full
                      ${style.accentSoft}
                      ring-1
                      ring-white/10
                    `}
                  />

                  <div
                    className={`
                      absolute
                      bottom-0
                      left-1/2
                      h-[67%]
                      w-full
                      -translate-x-1/2
                      rounded-t-[45%]
                      ${style.accentSoft}
                      ring-1
                      ring-white/10
                    `}
                  />

                  <div
                    className="
                      absolute
                      inset-x-0
                      bottom-8
                      text-center
                      text-xs
                      font-bold
                      uppercase
                      tracking-widest
                      text-white/25
                    "
                  >
                    Foto pendiente
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PIE */}

          <div
            className="
              absolute
              inset-x-0
              bottom-0
              z-20
              border-t
              border-white/10
              bg-slate-950/90
              p-5
              backdrop-blur-xl
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
            >
              {
                player.esms_name
              }
            </div>

            <div
              className="
                mt-1
                flex
                flex-wrap
                items-center
                gap-x-3
                text-xs
                text-slate-400
              "
            >
              <span>
                {
                  current.age
                } años
              </span>

              <span>
                •
              </span>

              <span>
                {
                  player.nationality.toUpperCase()
                }
              </span>

              <span>
                •
              </span>

              <span>
                {
                  teamCode
                }
              </span>
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
                value={
                  current.st
                }
                active={
                  primary.shortLabel ===
                  "ST"
                }
              />

              <MiniSkill
                label="TK"
                value={
                  current.tk
                }
                active={
                  primary.shortLabel ===
                  "TK"
                }
              />

              <MiniSkill
                label="PS"
                value={
                  current.ps
                }
                active={
                  primary.shortLabel ===
                  "PS"
                }
              />

              <MiniSkill
                label="SH"
                value={
                  current.sh
                }
                active={
                  primary.shortLabel ===
                  "SH"
                }
              />
            </div>
          </div>
        </div>

        {/* INFORMACIÓN */}

        <div
          className="
            relative
            p-5

            sm:p-7

            xl:p-8
          "
        >
          <div
            className="
              flex
              flex-col
              gap-6

              lg:flex-row
              lg:items-start
              lg:justify-between
            "
          >
            <div className="min-w-0">
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
                    px-3
                    py-1
                    text-xs
                    font-black
                    ${style.accentSoft}
                    ${style.accent}
                  `}
                >
                  {
                    position
                  }
                </span>

                <span
                  className="
                    rounded-full
                    bg-white/5
                    px-3
                    py-1
                    text-xs
                    font-bold
                    text-slate-400
                  "
                >
                  {
                    teamCode
                  }
                </span>
              </div>

              <h1
                className="
                  mt-4
                  break-words
                  text-3xl
                  font-black
                  uppercase
                  tracking-tight
                  text-white

                  sm:text-4xl

                  lg:text-5xl
                "
              >
                {
                  player.esms_name
                }
              </h1>

              <div
                className="
                  mt-4
                  flex
                  flex-wrap
                  items-center
                  gap-4
                  text-sm
                  text-slate-400
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  {flagUrl && (
                    <img
                      src={
                        flagUrl
                      }
                      alt={
                        player.nationality
                      }
                      width={24}
                      height={18}
                      className="
                        h-[18px]
                        w-6
                        rounded-sm
                        object-cover
                      "
                    />
                  )}

                  <span>
                    {
                      player.nationality.toUpperCase()
                    }
                  </span>
                </div>

                <span>
                  {
                    current.age
                  } años
                </span>

                <span>
                  {
                    clubName
                  }
                </span>
              </div>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-3

                sm:grid-cols-4

                lg:min-w-[470px]
              "
            >
              <MetricCard
                label="Media"
                value={
                  primary.rating
                }
                difference={
                  ratingDifference
                }
                suffix="MEDIA"
                accentClass={
                  style.accent
                }
              />

              <MetricCard
                label={`EXP total (${primary.shortLabel})`}
                value={
                  formatNumber(
                    primary.totalExp
                  )
                }
                difference={
                  expDifference
                }
                suffix="EXP"
                accentClass={
                  style.accent
                }
              />

              <MetricCard
                label="Partidos"
                value={
                  current.gam
                }
              />

              <MetricCard
                label="MVP"
                value={
                  current.mom
                }
              />
            </div>
          </div>

          <div
            className="
              mt-8
              rounded-2xl
              border
              border-white/5
              bg-white/[0.025]
              p-5
            "
          >
            <div
              className="
                mb-4
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
                grid
                grid-cols-2
                gap-3

                sm:grid-cols-4
              "
            >
              <MainSkillBox
                label="ST"
                rating={
                  current.st
                }
                exp={
                  current.kab
                }
                totalExp={
                  getTotalSkillExp(
                    current.st,
                    current.kab
                  )
                }
                colorClass="text-blue-400"
              />

              <MainSkillBox
                label="TK"
                rating={
                  current.tk
                }
                exp={
                  current.tab
                }
                totalExp={
                  getTotalSkillExp(
                    current.tk,
                    current.tab
                  )
                }
                colorClass="text-emerald-400"
              />

              <MainSkillBox
                label="PS"
                rating={
                  current.ps
                }
                exp={
                  current.pab
                }
                totalExp={
                  getTotalSkillExp(
                    current.ps,
                    current.pab
                  )
                }
                colorClass="text-violet-400"
              />

              <MainSkillBox
                label="SH"
                rating={
                  current.sh
                }
                exp={
                  current.sab
                }
                totalExp={
                  getTotalSkillExp(
                    current.sh,
                    current.sab
                  )
                }
                colorClass="text-amber-400"
              />
            </div>
          </div>

          <div
            className="
              mt-4
              grid
              grid-cols-2
              gap-3

              sm:grid-cols-4
            "
          >
            <SmallStat
              label="Minutos"
              value={
                current.min
              }
            />

            <SmallStat
              label="Goles"
              value={
                current.gls
              }
            />

            <SmallStat
              label="Asistencias"
              value={
                current.ass
              }
            />

            <SmallStat
              label="Fit"
              value={
                current.fit
              }
            />
          </div>
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
}) {
  return (
    <div
      className={`
        rounded-lg
        border
        px-2
        py-2
        text-center

        ${
          active
            ? "border-white/20 bg-white/10"
            : "border-white/5 bg-black/10"
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
          mt-0.5
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

function MetricCard({
  label,
  value,
  difference,
  suffix,
  accentClass =
    "text-white",
}: {
  label: string;

  value:
    | number
    | string;

  difference?: number;

  suffix?: string;

  accentClass?: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/5
        bg-white/[0.025]
        p-4
      "
    >
      <div
        className="
          text-[10px]
          font-black
          uppercase
          tracking-wider
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
          ${accentClass}
        `}
      >
        {
          value
        }
      </div>

      {difference !==
        undefined &&
        difference !== 0 && (
          <div
            className={`
              mt-1
              text-xs
              font-black

              ${
                difference > 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            `}
          >
            {
              signedValue(
                difference
              )
            }{" "}
            {
              suffix
            }
          </div>
        )}
    </div>
  );
}

function MainSkillBox({
  label,
  rating,
  exp,
  totalExp,
  colorClass,
}: {
  label: string;
  rating: number;
  exp: number;
  totalExp: number;
  colorClass: string;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-white/5
        bg-black/10
        p-4
      "
    >
      <div
        className={`
          text-xs
          font-black
          ${colorClass}
        `}
      >
        {
          label
        }
      </div>

      <div
        className="
          mt-2
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
          mt-1
          text-xs
          text-slate-500
        "
      >
        EXP{" "}
        {
          exp
        }
      </div>

      <div
        className="
          mt-1
          text-[10px]
          font-semibold
          text-slate-600
        "
      >
        Total{" "}
        {
          formatNumber(
            totalExp
          )
        }
      </div>
    </div>
  );
}

function SmallStat({
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
        border-white/5
        bg-white/[0.02]
        px-4
        py-3
      "
    >
      <div
        className="
          text-[10px]
          font-bold
          uppercase
          text-slate-600
        "
      >
        {
          label
        }
      </div>

      <div
        className="
          mt-1
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