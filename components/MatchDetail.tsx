import Image from "next/image";
import Link from "next/link";

import {
  getClubLogo,
} from "@/lib/club-logo";

import {
  getClubName,
} from "@/lib/club-names";

import type {
  MatchDetailData,
  MatchDetailPlayerStat,
} from "@/lib/match-detail";

type Props = {
  data: MatchDetailData;
};

type TeamTotals = {
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  tackles: number;
  saves: number;
  conceded: number;
  dp: number;
};

function sum(
  stats:
    MatchDetailPlayerStat[],
  key:
    | "goals"
    | "assists"
    | "shots"
    | "key_passes"
    | "tackles"
    | "saves"
    | "conceded"
    | "dp"
) {
  return stats.reduce(
    (
      total,
      row
    ) =>
      total +
      Number(
        row[key] ?? 0
      ),
    0
  );
}

function totals(
  stats:
    MatchDetailPlayerStat[]
): TeamTotals {
  return {
    goals:
      sum(
        stats,
        "goals"
      ),
    assists:
      sum(
        stats,
        "assists"
      ),
    shots:
      sum(
        stats,
        "shots"
      ),
    keyPasses:
      sum(
        stats,
        "key_passes"
      ),
    tackles:
      sum(
        stats,
        "tackles"
      ),
    saves:
      sum(
        stats,
        "saves"
      ),
    conceded:
      sum(
        stats,
        "conceded"
      ),
    dp:
      sum(
        stats,
        "dp"
      ),
  };
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

export default function MatchDetail({
  data,
}: Props) {
  const {
    match,
    competition,
    season,
    round,
    stats,
  } = data;

  const homeStats =
    stats.filter(
      (
        row
      ) =>
        row.team_code.toUpperCase() ===
        match.home_team_code.toUpperCase()
    );

  const awayStats =
    stats.filter(
      (
        row
      ) =>
        row.team_code.toUpperCase() ===
        match.away_team_code.toUpperCase()
    );

  const homeTotals =
    totals(homeStats);

  const awayTotals =
    totals(awayStats);

  const scorers =
    stats
      .filter(
        (
          row
        ) =>
          row.goals > 0
      )
      .sort(
        (
          a,
          b
        ) =>
          b.goals -
          a.goals
      );

  const assisters =
    stats
      .filter(
        (
          row
        ) =>
          row.assists > 0
      )
      .sort(
        (
          a,
          b
        ) =>
          b.assists -
          a.assists
      );

  const moms =
    stats.filter(
      (
        row
      ) =>
        row.mom > 0
    );

  const injuries =
    stats.filter(
      (
        row
      ) =>
        row.injury > 0
    );

  const playedDate =
    formatDate(
      match.played_at ??
        match.scheduled_at
    );

  return (
    <main
      className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        py-8
        sm:px-6
        lg:px-8
      "
    >
      <Link
        href={`/competiciones/${competition.id}`}
        className="
          text-sm
          font-bold
          text-[var(--mt-muted)]
          transition
          hover:text-[var(--mt-text)]
        "
      >
        ← {competition.name}
      </Link>

      <section
        className="
          relative
          mt-5
          overflow-hidden
          rounded-[28px]
          border
          border-[var(--mt-line)]
          bg-[var(--mt-surface)]
          p-5
          sm:p-8
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            top-0
            h-40
            bg-gradient-to-b
            from-[var(--mt-surface-soft)]
            to-transparent
          "
        />

        <div
          className="
            relative
            text-center
          "
        >
          <div
            className="
              text-xs
              font-black
              uppercase
              tracking-[0.2em]
              text-[var(--mt-gold-dark)]
            "
          >
            {season?.name ??
              "Temporada"}
            {round
              ? ` · ${round.name}`
              : ""}
          </div>

          {playedDate ? (
            <div
              className="
                mt-2
                text-xs
                text-[var(--mt-muted)]
              "
            >
              {playedDate}
            </div>
          ) : null}

          <div
            className="
              mx-auto
              mt-8
              grid
              max-w-4xl
              grid-cols-[1fr_auto_1fr]
              items-center
              gap-3
              sm:gap-8
            "
          >
            <TeamHero
              code={
                match.home_team_code
              }
            />

            <div
              className="
                flex
                items-center
                gap-2
                sm:gap-4
              "
            >
              <Score
                value={
                  match.home_score
                }
              />

              <span
                className="
                  text-2xl
                  font-black
                  text-[var(--mt-muted)]
                  sm:text-4xl
                "
              >
                -
              </span>

              <Score
                value={
                  match.away_score
                }
              />
            </div>

            <TeamHero
              code={
                match.away_team_code
              }
            />
          </div>

          <div
            className="
              mt-6
              inline-flex
              rounded-full
              border
              border-[var(--mt-line)]
              bg-[var(--mt-surface)]
              px-4
              py-2
              text-xs
              font-black
              uppercase
              tracking-wide
              text-[var(--mt-muted)]
            "
          >
            {match.status ===
            "PLAYED"
              ? "Finalizado"
              : match.status}
          </div>
        </div>
      </section>

      {stats.length > 0 ? (
        <>
          <section
            className="
              mt-6
              grid
              gap-4
              lg:grid-cols-3
            "
          >
            <HighlightCard
              title="MVP"
              empty="Sin MVP"
            >
              {moms.map(
                (
                  player
                ) => (
                  <PlayerLine
                    key={
                      player.id
                    }
                    player={
                      player
                    }
                    suffix="MVP"
                    important
                  />
                )
              )}
            </HighlightCard>

            <HighlightCard
              title="Goleadores"
              empty="Sin goles individuales"
            >
              {scorers.map(
                (
                  player
                ) => (
                  <PlayerLine
                    key={
                      player.id
                    }
                    player={
                      player
                    }
                    suffix={`×${player.goals}`}
                  />
                )
              )}
            </HighlightCard>

            <HighlightCard
              title="Asistencias"
              empty="Sin asistencias"
            >
              {assisters.map(
                (
                  player
                ) => (
                  <PlayerLine
                    key={
                      player.id
                    }
                    player={
                      player
                    }
                    suffix={`×${player.assists}`}
                  />
                )
              )}
            </HighlightCard>
          </section>

          <section className="mt-8">
            <h2
              className="
                text-xl
                font-black
                text-[var(--mt-text)]
              "
            >
              Estadísticas del partido
            </h2>

            <div
              className="
                mt-4
                rounded-[13px]
                border
                border-[var(--mt-line)]
                bg-[var(--mt-surface)]
                p-4
                sm:p-6
              "
            >
              <TeamStat
                label="Disparos"
                home={
                  homeTotals.shots
                }
                away={
                  awayTotals.shots
                }
              />

              <TeamStat
                label="Pases clave"
                home={
                  homeTotals.keyPasses
                }
                away={
                  awayTotals.keyPasses
                }
              />

              <TeamStat
                label="Entradas"
                home={
                  homeTotals.tackles
                }
                away={
                  awayTotals.tackles
                }
              />

              <TeamStat
                label="Paradas"
                home={
                  homeTotals.saves
                }
                away={
                  awayTotals.saves
                }
              />

              <TeamStat
                label="Asistencias"
                home={
                  homeTotals.assists
                }
                away={
                  awayTotals.assists
                }
              />

              <TeamStat
                label="DP"
                home={
                  homeTotals.dp
                }
                away={
                  awayTotals.dp
                }
                last
              />
            </div>
          </section>

          {injuries.length >
          0 ? (
            <section className="mt-8">
              <h2 className="text-xl font-black text-[var(--mt-text)]">
                Lesiones
              </h2>

              <div
                className="
                  mt-4
                  grid
                  gap-3
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >
                {injuries.map(
                  (
                    player
                  ) => (
                    <div
                      key={
                        player.id
                      }
                      className="
                        rounded-xl
                        border
                        border-red-500/20
                        bg-red-500/10
                        p-4
                      "
                    >
                      <PlayerLine
                        player={
                          player
                        }
                        suffix="Lesionado"
                      />
                    </div>
                  )
                )}
              </div>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-xl font-black text-[var(--mt-text)]">
              Actuaciones individuales
            </h2>

            <p className="mt-1 text-sm text-[var(--mt-muted)]">
              Estadísticas extraídas directamente del archivo .stt.
            </p>

            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <PlayerTable
                teamCode={
                  match.home_team_code
                }
                stats={
                  homeStats
                }
              />

              <PlayerTable
                teamCode={
                  match.away_team_code
                }
                stats={
                  awayStats
                }
              />
            </div>
          </section>
        </>
      ) : (
        <div
          className="
            mt-6
            rounded-[13px]
            border
            border-[var(--mt-line)]
            bg-[var(--mt-surface)]
            p-8
            text-center
            text-sm
            text-[var(--mt-muted)]
          "
        >
          Este partido todavía no
          tiene estadísticas .stt
          importadas.
        </div>
      )}

      {match.esms_source ? (
        <div
          className="
            mt-8
            text-center
            text-[11px]
            text-[var(--mt-muted)]
          "
        >
          Fuente ESMS:{" "}
          {match.esms_source}
        </div>
      ) : null}
    </main>
  );
}

function TeamHero({
  code,
}: {
  code: string;
}) {
  return (
    <div
      className="
        flex
        min-w-0
        flex-col
        items-center
      "
    >
      <Image
        src={
          getClubLogo(code)
        }
        alt={code}
        width={96}
        height={96}
        className="
          h-16
          w-16
          object-contain
          sm:h-24
          sm:w-24
        "
      />

      <div
        className="
          mt-3
          max-w-full
          truncate
          text-sm
          font-black
          text-[var(--mt-text)]
          sm:text-xl
        "
      >
        {getClubName(
          code
        )}
      </div>

      <div
        className="
          mt-1
          text-[10px]
          font-black
          uppercase
          tracking-wider
          text-[var(--mt-muted)]
        "
      >
        {code}
      </div>
    </div>
  );
}

function Score({
  value,
}: {
  value:
    | number
    | null;
}) {
  return (
    <div
      className="
        min-w-[48px]
        text-center
        text-5xl
        font-black
        tracking-[-0.06em]
        text-[var(--mt-text)]
        sm:min-w-[72px]
        sm:text-7xl
      "
    >
      {value ?? "-"}
    </div>
  );
}

function HighlightCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children:
    React.ReactNode;
}) {
  const hasChildren =
    Array.isArray(
      children
    )
      ? children.length >
        0
      : Boolean(children);

  return (
    <div
      className="
        rounded-[13px]
        border
        border-[var(--mt-line)]
        bg-[var(--mt-surface)]
        p-5
      "
    >
      <div
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.18em]
          text-[var(--mt-muted)]
        "
      >
        {title}
      </div>

      <div className="mt-4 space-y-3">
        {hasChildren
          ? children
          : (
            <div className="text-sm text-[var(--mt-muted)]">
              {empty}
            </div>
          )}
      </div>
    </div>
  );
}

function PlayerLine({
  player,
  suffix,
  important = false,
}: {
  player:
    MatchDetailPlayerStat;
  suffix?: string;
  important?: boolean;
}) {
  const content = (
    <span
      className={
        important
          ? "font-black text-[var(--mt-text)]"
          : "font-bold text-[var(--mt-text)]"
      }
    >
      {
        player.esms_name
      }
    </span>
  );

  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
      "
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-2
        "
      >
        <Image
          src={
            getClubLogo(
              player.team_code
            )
          }
          alt={
            player.team_code
          }
          width={24}
          height={24}
          className="h-6 w-6 shrink-0 object-contain"
        />

        <div className="min-w-0 truncate text-sm">
          {player.player_id ? (
            <Link
              href={`/jugadores/${player.player_id}`}
              className="hover:text-[var(--mt-gold-dark)]"
            >
              {content}
            </Link>
          ) : (
            content
          )}
        </div>
      </div>

      {suffix ? (
        <span
          className="
            shrink-0
            text-xs
            font-black
            text-[var(--mt-gold-dark)]
          "
        >
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function TeamStat({
  label,
  home,
  away,
  last = false,
}: {
  label: string;
  home: number;
  away: number;
  last?: boolean;
}) {
  const total =
    home + away;

  const homeWidth =
    total > 0
      ? (home /
          total) *
        100
      : 50;

  const awayWidth =
    total > 0
      ? (away /
          total) *
        100
      : 50;

  return (
    <div
      className={
        last
          ? "py-4"
          : "border-b border-[var(--mt-line)] py-4"
      }
    >
      <div
        className="
          grid
          grid-cols-[52px_1fr_52px]
          items-center
          gap-3
        "
      >
        <div className="text-center text-lg font-black text-[var(--mt-text)]">
          {home}
        </div>

        <div>
          <div className="text-center text-xs font-black uppercase tracking-wide text-[var(--mt-muted)]">
            {label}
          </div>

          <div
            className="
              mt-2
              flex
              h-1.5
              overflow-hidden
              rounded-full
              bg-[var(--mt-surface)]
            "
          >
            <div
              className="bg-[var(--mt-gold)]"
              style={{
                width:
                  `${homeWidth}%`,
              }}
            />

            <div
              className="bg-[var(--mt-gold)]"
              style={{
                width:
                  `${awayWidth}%`,
              }}
            />
          </div>
        </div>

        <div className="text-center text-lg font-black text-[var(--mt-text)]">
          {away}
        </div>
      </div>
    </div>
  );
}

function PlayerTable({
  teamCode,
  stats,
}: {
  teamCode: string;
  stats:
    MatchDetailPlayerStat[];
}) {
  return (
    <div
      className="
        overflow-hidden
        rounded-[13px]
        border
        border-[var(--mt-line)]
        bg-[var(--mt-surface)]
      "
    >
      <div
        className="
          flex
          items-center
          gap-3
          border-b
          border-[var(--mt-line)]
          p-4
        "
      >
        <Image
          src={
            getClubLogo(
              teamCode
            )
          }
          alt={teamCode}
          width={34}
          height={34}
          className="h-9 w-9 object-contain"
        />

        <div>
          <div className="font-black text-[var(--mt-text)]">
            {getClubName(
              teamCode
            )}
          </div>

          <div className="text-[10px] font-bold uppercase text-[var(--mt-muted)]">
            {teamCode}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-xs">
          <thead className="border-b border-[var(--mt-line)] bg-[var(--mt-surface)] text-[9px] uppercase tracking-wide text-[var(--mt-muted)]">
            <tr>
              <th className="p-3 text-left">
                Jugador
              </th>
              <th className="p-3 text-center">
                Min
              </th>
              <th className="p-3 text-center">
                MVP
              </th>
              <th className="p-3 text-center">
                Sav
              </th>
              <th className="p-3 text-center">
                Con
              </th>
              <th className="p-3 text-center">
                Ktk
              </th>
              <th className="p-3 text-center">
                Kps
              </th>
              <th className="p-3 text-center">
                Sht
              </th>
              <th className="p-3 text-center">
                Gls
              </th>
              <th className="p-3 text-center">
                Ass
              </th>
              <th className="p-3 text-center">
                DP
              </th>
              <th className="p-3 text-center">
                Inj
              </th>
              <th className="p-3 text-center">
                ΔKAb
              </th>
              <th className="p-3 text-center">
                ΔTAb
              </th>
              <th className="p-3 text-center">
                ΔPAb
              </th>
              <th className="p-3 text-center">
                ΔSAb
              </th>
              <th className="p-3 text-center">
                FIT
              </th>
            </tr>
          </thead>

          <tbody>
            {stats.map(
              (
                player
              ) => (
                <tr
                  key={
                    player.id
                  }
                  className="
                    border-b
                    border-[var(--mt-line)]
                    last:border-0
                  "
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          player.participated
                            ? "h-2 w-2 rounded-full bg-[var(--mt-gold)]"
                            : "h-2 w-2 rounded-full bg-[var(--mt-surface)]"
                        }
                      />

                      {player.player_id ? (
                        <Link
                          href={`/jugadores/${player.player_id}`}
                          className="font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]"
                        >
                          {player.esms_name}
                        </Link>
                      ) : (
                        <span className="font-black text-[var(--mt-muted)]">
                          {player.esms_name}
                        </span>
                      )}

                      {player.came_on_as_sub ? (
                        <span className="rounded bg-[var(--mt-surface)] px-1.5 py-0.5 text-[8px] font-black uppercase text-[var(--mt-muted)]">
                          SUP
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <Cell value={player.minutes} />
                  <Cell value={player.mom ? "★" : ""} highlight={Boolean(player.mom)} />
                  <Cell value={player.saves} />
                  <Cell value={player.conceded} />
                  <Cell value={player.tackles} />
                  <Cell value={player.key_passes} />
                  <Cell value={player.shots} />
                  <Cell value={player.goals} highlight={player.goals > 0} />
                  <Cell value={player.assists} highlight={player.assists > 0} />
                  <Cell value={player.dp} />
                  <Cell value={player.injury ? "✚" : ""} danger={Boolean(player.injury)} />
                  <DeltaCell value={player.kab_delta} />
                  <DeltaCell value={player.tab_delta} />
                  <DeltaCell value={player.pab_delta} />
                  <DeltaCell value={player.sab_delta} />
                  <Cell value={player.fitness} />
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({
  value,
  highlight = false,
  danger = false,
}: {
  value:
    | number
    | string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <td
      className={[
        "p-3 text-center font-bold",
        danger
          ? "text-red-700"
          : highlight
            ? "text-[var(--mt-gold-dark)]"
            : "text-[var(--mt-muted)]",
      ].join(" ")}
    >
      {value}
    </td>
  );
}

function DeltaCell({
  value,
}: {
  value: number;
}) {
  return (
    <td
      className={[
        "p-3 text-center font-black",
        value > 0
          ? "text-emerald-700"
          : value < 0
            ? "text-red-700"
            : "text-[var(--mt-muted)]",
      ].join(" ")}
    >
      {value > 0
        ? `+${value}`
        : value}
    </td>
  );
}
