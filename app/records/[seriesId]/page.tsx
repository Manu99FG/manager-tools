import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { getCompetitionRecords, type RecordItem } from "@/lib/records";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ seriesId: string }>;
};

export default async function CompetitionRecordsPage({ params }: Props) {
  const { seriesId } = await params;
  const data = await getCompetitionRecords(seriesId);

  if (!data) notFound();

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/records" className="text-xs font-black text-[var(--mt-muted)] hover:text-[var(--mt-text)]">
          ← Récords
        </Link>
        <Link
          href={`/competiciones/historico/${data.series.id}`}
          className="text-xs font-black text-[var(--mt-gold-dark)] hover:text-[var(--mt-gold-dark)]"
        >
          Ver histórico →
        </Link>
      </div>

      <section className="app-panel rounded-[26px] p-6 sm:p-8">
        <div className="app-eyebrow">Récords por competición</div>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-5xl">
          {data.series.name}
        </h1>
        <p className="mt-3 text-sm text-[var(--mt-muted)]">
          Acumulado de todas las temporadas vinculadas a esta competición.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.records.map((record) => (
          <RecordBlock key={record.key} record={record} />
        ))}
      </div>
    </div>
  );
}

function RecordBlock({ record }: { record: RecordItem }) {
  return (
    <article className="app-panel-soft rounded-2xl p-5">
      <h2 className="text-sm font-black text-[var(--mt-text)]">{record.title}</h2>

      {record.holders.length === 0 ? (
        <p className="mt-4 text-xs leading-5 text-[var(--mt-muted)]">
          {record.note ?? "Todavía no hay datos."}
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {record.holders.map((holder, index) => (
            <div
              key={`${record.key}:${index}:${holder.playerId ?? holder.teamCode ?? holder.matchId ?? "holder"}`}
              className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-3"
            >
              <div className="text-2xl font-black text-[var(--mt-gold-dark)]">
                {holder.value}
                {record.unit ? (
                  <span className="ml-1.5 text-[9px] uppercase text-[var(--mt-muted)]">{record.unit}</span>
                ) : null}
              </div>

              {holder.score ? (
                holder.matchId ? (
                  <Link href={`/partidos/${holder.matchId}`} className="mt-1 block text-xs font-black text-[var(--mt-gold-dark)]">
                    {holder.score}
                  </Link>
                ) : (
                  <div className="mt-1 text-xs font-black text-[var(--mt-muted)]">{holder.score}</div>
                )
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  {holder.teamCode ? (
                    <Image
                      src={getClubLogo(holder.teamCode)}
                      alt={holder.teamCode}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  ) : null}

                  <div>
                    {holder.playerName ? (
                      holder.playerId ? (
                        <Link href={`/jugadores/${holder.playerId}`} className="text-xs font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]">
                          {holder.playerName}
                        </Link>
                      ) : (
                        <div className="text-xs font-black text-[var(--mt-muted)]">{holder.playerName}</div>
                      )
                    ) : holder.teamCode ? (
                      <div className="text-xs font-black text-[var(--mt-text)]">{getClubName(holder.teamCode)}</div>
                    ) : null}

                    {holder.seasonName ? (
                      <div className="mt-0.5 text-[10px] text-[var(--mt-muted)]">{holder.seasonName}</div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
