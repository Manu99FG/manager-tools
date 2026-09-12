import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { getSeasonPageData, type SeasonPlayerRow } from "@/lib/season-history";
import { getSeasonAwardPolls } from "@/lib/award-voting";
import { getSeasonAwardHistory } from "@/lib/award-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

const TYPE_LABEL: Record<string, string> = {
  LEAGUE: "Liga",
  CUP: "Copa",
  GROUPS: "Grupos",
  GROUPS_KNOCKOUT: "Grupos + eliminatorias",
  SUPERCUP: "Supercopa",
};

export default async function SeasonPage({ params }: Props) {
  const { id } = await params;
  const [data, seasonPolls, seasonAwardHistory] = await Promise.all([
    getSeasonPageData(id),
    getSeasonAwardPolls(id),
    getSeasonAwardHistory(id),
  ]);

  if (!data) notFound();

  const topGoals = top(data.players, "goals");
  const topAssists = top(data.players, "assists");
  const topMom = top(data.players, "mom");

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-7">
      <section className="app-panel relative overflow-hidden rounded-[24px] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--mt-surface-soft)] blur-3xl" />
        <div className="relative">
          <Link href="/temporadas" className="text-xs font-black text-[var(--mt-gold-dark)] hover:text-[var(--mt-gold-dark)]">
            ← Todas las temporadas
          </Link>
          <div className="mt-5 app-eyebrow">Resumen de temporada</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
              {data.season.name}
            </h1>
            {data.season.is_active ? (
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">
                Activa
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Kpi label="Competiciones" value={data.totals.competitions} />
            <Kpi label="Finalizadas" value={data.totals.finishedCompetitions} />
            <Kpi label="Clubes" value={data.totals.clubs} />
            <Kpi label="Partidos" value={data.totals.playedMatches} />
            <Kpi label="Goles" value={data.totals.goals} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Palmarés" title="Campeones de la temporada" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.competitions.map((item) => (
            <Link
              key={item.competition.id}
              href={`/competiciones/${item.competition.id}`}
              className="app-panel-soft rounded-[13px] p-5 transition hover:border-[var(--mt-gold)]"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--mt-muted)]">
                {TYPE_LABEL[item.competition.type] ?? item.competition.type}
              </div>
              <h3 className="mt-1 text-lg font-black text-[var(--mt-text)]">
                {item.competition.name}
              </h3>

              <div className="mt-5 flex items-center gap-3">
                {item.championTeamCode ? (
                  <>
                    <Image
                      src={getClubLogo(item.championTeamCode)}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 object-contain"
                    />
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--mt-gold-dark)]">
                        Campeón
                      </div>
                      <div className="font-black text-[var(--mt-text)]">
                        {getClubName(item.championTeamCode)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-bold text-[var(--mt-muted)]">
                    {item.competition.status === "FINISHED"
                      ? "Campeón no resuelto"
                      : "Competición en curso"}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Rendimiento" title="Clasificaciones de liga" />
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {data.competitions
            .filter((item) => item.competition.type === "LEAGUE")
            .map((item) => (
              <div key={item.competition.id} className="app-panel-soft overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between border-b border-[var(--mt-line)] px-5 py-4">
                  <h3 className="font-black text-[var(--mt-text)]">{item.competition.name}</h3>
                  <Link href={`/competiciones/${item.competition.id}`} className="text-xs font-black text-[var(--mt-gold-dark)]">
                    Ver competición →
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[9px] font-black uppercase tracking-[0.1em] text-[var(--mt-muted)]">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Club</th>
                        <th className="px-3 py-3 text-right">PJ</th>
                        <th className="px-3 py-3 text-right">DG</th>
                        <th className="px-4 py-3 text-right">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.standings.slice(0, 10).map((row) => (
                        <tr key={row.teamCode} className="border-t border-[var(--mt-line)]">
                          <td className="px-4 py-3 font-black text-[var(--mt-muted)]">{row.position}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Image src={getClubLogo(row.teamCode)} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
                              <span className="font-bold text-[var(--mt-text)]">{getClubName(row.teamCode)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-[var(--mt-muted)]">{row.played}</td>
                          <td className="px-3 py-3 text-right text-[var(--mt-muted)]">{row.goalDifference}</td>
                          <td className="px-4 py-3 text-right font-black text-[var(--mt-text)]">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Líderes individuales" title="Los mejores de la temporada" />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Ranking title="Goleadores" short="GOL" rows={topGoals} stat="goals" />
          <Ranking title="Asistencias" short="AST" rows={topAssists} stat="assists" />
          <Ranking title="MVP" short="MVP" rows={topMom} stat="mom" />
        </div>
      </section>

      {seasonAwardHistory.length ? (
        <section>
          <SectionTitle eyebrow="Palmarés oficial" title="Premios de la temporada" />
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {seasonAwardHistory.map((award) => {
              const winner = award.podium[0];

              return (
                <Link
                  key={award.pollId}
                  href={`/votaciones/${award.pollId}`}
                  className="app-panel-soft rounded-[13px] p-5 transition hover:border-[var(--mt-gold)]"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--mt-gold-dark)]">
                    Premio oficial
                  </div>
                  <h3 className="mt-1.5 text-lg font-black text-[var(--mt-text)]">
                    {award.title}
                  </h3>

                  {winner ? (
                    <div className="mt-4 rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 py-3">
                      <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
                        Ganador
                      </div>
                      <div className="mt-0.5 font-black text-[var(--mt-text)]">
                        {winner.playerName.replaceAll("_", " ")}
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-[var(--mt-muted)]">
                        {winner.points} pts · {winner.firstPlaces} primeros puestos
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-1 text-xs font-bold text-[var(--mt-muted)]">
                    {award.podium.slice(1, 3).map((entry) => (
                      <div key={entry.playerId}>
                        {entry.rank}.º {entry.playerName.replaceAll("_", " ")} ·{" "}
                        {entry.points} pts
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <SectionTitle eyebrow="Premios" title="Votaciones de la temporada" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {seasonPolls.length ? (
            seasonPolls.map((poll) => (
              <Link
                key={poll.id}
                href={`/votaciones/${poll.id}`}
                className="app-panel-soft rounded-[13px] p-5 transition hover:border-[var(--mt-gold)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--mt-gold-dark)]">
                    {poll.status === "OPEN"
                      ? "Votación abierta"
                      : poll.status === "CLOSED"
                        ? "Premio decidido"
                        : "Próximamente"}
                  </div>
                  <div className="text-[10px] font-black text-[var(--mt-muted)]">
                    {poll.ballotCount} votos
                  </div>
                </div>
                <h3 className="mt-2 text-lg font-black text-[var(--mt-text)]">
                  {poll.title}
                </h3>
                {poll.winner ? (
                  <div className="mt-4 rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 py-2.5">
                    <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
                      Ganador
                    </div>
                    <div className="mt-0.5 font-black text-[var(--mt-text)]">
                      {poll.winner.playerName.replaceAll("_", " ")}
                    </div>
                  </div>
                ) : null}
              </Link>
            ))
          ) : (
            <div className="app-panel-soft rounded-[13px] p-5 text-sm font-bold text-[var(--mt-muted)]">
              Todavía no hay votaciones creadas para esta temporada.
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Participantes" title="Clubes de la temporada" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {data.clubs.map((teamCode) => (
            <Link
              key={teamCode}
              href={`/clubes/${teamCode}/historial`}
              className="app-panel-soft flex items-center gap-3 rounded-[13px] p-4 transition hover:border-[var(--mt-gold)]"
            >
              <Image src={getClubLogo(teamCode)} alt="" width={38} height={38} className="h-10 w-10 object-contain" />
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-[var(--mt-text)]">{getClubName(teamCode)}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--mt-muted)]">{teamCode}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function top(rows: SeasonPlayerRow[], key: "goals" | "assists" | "mom") {
  return [...rows]
    .filter((row) => row[key] > 0)
    .sort((a, b) => b[key] - a[key] || b.minutes - a.minutes)
    .slice(0, 5);
}

function Ranking({
  title,
  short,
  rows,
  stat,
}: {
  title: string;
  short: string;
  rows: SeasonPlayerRow[];
  stat: "goals" | "assists" | "mom";
}) {
  return (
    <div className="app-panel-soft rounded-2xl p-5">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--mt-gold-dark)]">{title}</div>
      <div className="mt-4 space-y-2">
        {rows.map((row, index) => (
          <div key={row.playerId ?? `${row.teamCode}-${row.esmsName}`} className="flex items-center gap-3 rounded-xl bg-[var(--mt-surface)] px-3 py-2.5">
            <span className="w-5 text-center text-xs font-black text-[var(--mt-muted)]">{index + 1}</span>
            <Image src={getClubLogo(row.teamCode)} alt="" width={26} height={26} className="h-7 w-7 object-contain" />
            <div className="min-w-0 flex-1">
              {row.playerId ? (
                <Link href={`/jugadores/${row.playerId}`} className="truncate font-bold text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]">
                  {row.esmsName.replaceAll("_", " ")}
                </Link>
              ) : (
                <div className="truncate font-bold text-[var(--mt-text)]">{row.esmsName.replaceAll("_", " ")}</div>
              )}
              <div className="text-[9px] font-black uppercase tracking-[0.1em] text-[var(--mt-muted)]">{row.teamCode}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-[var(--mt-text)]">{row[stat]}</div>
              <div className="text-[8px] font-black uppercase tracking-[0.1em] text-[var(--mt-muted)]">{short}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-3 text-center">
      <div className="text-xl font-black text-[var(--mt-text)]">{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.11em] text-[var(--mt-muted)]">{label}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="app-eyebrow">{eyebrow}</div>
      <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">{title}</h2>
    </div>
  );
}
