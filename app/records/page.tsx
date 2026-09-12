import Image from "next/image";
import Link from "next/link";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import { getRecordsData, type RecordItem } from "@/lib/records";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RecordsPage() {
  const data = await getRecordsData();

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8">
      <section className="app-panel relative overflow-hidden rounded-[26px] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--mt-surface-soft)] blur-3xl" />
        <div className="relative">
          <div className="app-eyebrow">Historia de la liga</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-5xl">
            Récords
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--mt-muted)]">
            Mejores marcas históricas calculadas automáticamente a partir de temporadas,
            competiciones, resultados y estadísticas .stt.
          </p>
        </div>
      </section>

      <section>
        <Heading eyebrow="Todas las competiciones" title="Récords globales" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.global.map((record) => (
            <RecordCard key={record.key} record={record} />
          ))}
        </div>
      </section>

      <section>
        <Heading
          eyebrow="Históricos"
          title="Récords por competición"
          description="Cada bloque reúne todas las temporadas vinculadas a la misma competición histórica."
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.competitions.map(({ series, records }) => {
            const available = records.filter((record) => record.available && record.holders.length > 0).length;

            return (
              <Link
                key={series.id}
                href={`/records/${series.id}`}
                className="app-panel group rounded-[13px] p-5 transition hover:-translate-y-0.5 hover:border-[var(--mt-gold)]"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mt-gold-dark)]">
                  {series.type === "LEAGUE" ? "Liga" : "Competición"}
                </div>
                <h2 className="mt-2 text-xl font-black text-[var(--mt-text)]">
                  {series.name}
                </h2>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--mt-muted)]">
                    {available} récords con datos
                  </span>
                  <span className="text-xs font-black text-[var(--mt-gold-dark)] transition group-hover:translate-x-1">
                    Ver récords →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <div className="app-eyebrow">{eyebrow}</div>
      <h2 className="mt-1.5 text-2xl font-black text-[var(--mt-text)]">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-[var(--mt-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

function RecordCard({ record }: { record: RecordItem }) {
  const holder = record.holders[0];

  return (
    <div className="app-panel-soft min-h-[170px] rounded-2xl p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--mt-muted)]">
        Récord
      </div>
      <h3 className="mt-1.5 text-sm font-black leading-5 text-[var(--mt-text)]">
        {record.title}
      </h3>

      {!holder ? (
        <p className="mt-5 text-xs leading-5 text-[var(--mt-muted)]">
          {record.note ?? "Todavía no hay datos."}
        </p>
      ) : (
        <div className="mt-5">
          <div className="text-3xl font-black tracking-tight text-[var(--mt-gold-dark)]">
            {holder.value}
            {record.unit ? (
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[var(--mt-muted)]">
                {record.unit}
              </span>
            ) : null}
          </div>

          <Holder holder={holder} />

          {record.holders.length > 1 ? (
            <div className="mt-2 text-[10px] font-bold text-[var(--mt-muted)]">
              +{record.holders.length - 1} empatado(s)
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Holder({ holder }: { holder: RecordItem["holders"][number] }) {
  if (holder.score) {
    return holder.matchId ? (
      <Link href={`/partidos/${holder.matchId}`} className="mt-2 block text-xs font-black text-[var(--mt-gold-dark)] hover:text-[var(--mt-gold-dark)]">
        {holder.score}
      </Link>
    ) : (
      <div className="mt-2 text-xs font-black text-[var(--mt-muted)]">{holder.score}</div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      {holder.teamCode ? (
        <Image
          src={getClubLogo(holder.teamCode)}
          alt={holder.teamCode}
          width={26}
          height={26}
          className="h-7 w-7 object-contain"
        />
      ) : null}

      <div className="min-w-0">
        {holder.playerName ? (
          holder.playerId ? (
            <Link href={`/jugadores/${holder.playerId}`} className="block truncate text-xs font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]">
              {holder.playerName}
            </Link>
          ) : (
            <div className="truncate text-xs font-black text-[var(--mt-muted)]">
              {holder.playerName}
            </div>
          )
        ) : holder.teamCode ? (
          <div className="truncate text-xs font-black text-[var(--mt-text)]">
            {getClubName(holder.teamCode)}
          </div>
        ) : null}

        {holder.seasonName ? (
          <div className="mt-0.5 text-[10px] text-[var(--mt-muted)]">
            {holder.seasonName}
          </div>
        ) : null}
      </div>
    </div>
  );
}
