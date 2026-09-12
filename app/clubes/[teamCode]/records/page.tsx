import Link from "next/link";
import { getClubHistory, type ClubHistoryRecord } from "@/lib/club-history";
import { getClubName } from "@/lib/club-names";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RecordKey =
  | "Mejor posición en liga"
  | "Mayor victoria"
  | "Mayor racha de victorias"
  | "Récord goleador de temporada"
  | "Más asistencias en una temporada"
  | "Fichaje más caro";

const META: Record<RecordKey, { icon: string; tone: string }> = {
  "Mejor posición en liga": { icon: "▥", tone: "league" },
  "Mayor victoria": { icon: "⚽", tone: "win" },
  "Mayor racha de victorias": { icon: "🔥", tone: "streak" },
  "Récord goleador de temporada": { icon: "◎", tone: "goals" },
  "Más asistencias en una temporada": { icon: "👟", tone: "assists" },
  "Fichaje más caro": { icon: "◉", tone: "transfer" },
};

export default async function ClubRecordsPage({
  params,
}: {
  params: Promise<{ teamCode: string }>;
}) {
  const { teamCode } = await params;
  const code = teamCode.toUpperCase();
  const data = await getClubHistory(code);
  const clubName = getClubName(code);

  return (
    <section className="club-r46-page">
      <header className="club-r46-heading">
        <div className="club-r46-heading-icon" aria-hidden="true">☆</div>
        <div>
          <h2>Récords del club</h2>
          <p>Las mejores marcas históricas del {clubName} en competiciones oficiales.</p>
        </div>
      </header>

      <div className="club-r46-grid">
        {data.overview.map((row) => {
          const label = row.label as RecordKey;
          const meta = META[label] ?? { icon: "★", tone: "default" };
          return (
            <RecordCard
              key={row.label}
              label={row.label}
              record={row.record}
              icon={meta.icon}
              tone={meta.tone}
            />
          );
        })}
      </div>

      <p className="club-r46-note">
        <span aria-hidden="true">ⓘ</span>
        Estos récords se calculan únicamente con partidos oficiales y fichajes registrados en la Liga de Leyendas.
      </p>
    </section>
  );
}

function RecordCard({
  label,
  record,
  icon,
  tone,
}: {
  label: string;
  record: ClubHistoryRecord | null;
  icon: string;
  tone: string;
}) {
  return (
    <article className={`club-r46-card is-${tone}`}>
      <div className="club-r46-card-title">
        <span className="club-r46-card-icon" aria-hidden="true">{icon}</span>
        <h3>{label}</h3>
      </div>

      {record ? (
        <>
          <strong className="club-r46-value">{record.value}</strong>
          {(record.season || record.competition) && (
            <p className="club-r46-meta">
              {[record.season, record.competition].filter(Boolean).join(" · ")}
            </p>
          )}

          <div className="club-r46-detail">
            {record.playerName && <strong>{record.playerName}</strong>}
            {record.detail && <span>{record.detail}</span>}
            {!record.playerName && !record.detail && <span>Récord histórico del club</span>}
          </div>

          {(record.matchId || record.playerId) && (
            <div className="club-r46-linkrow">
              {record.matchId && <Link href={`/partidos/${record.matchId}`}>Ver partido →</Link>}
              {record.playerId && <Link href={`/jugadores/${record.playerId}`}>Ver jugador →</Link>}
            </div>
          )}
        </>
      ) : (
        <div className="club-r46-empty">
          <strong>—</strong>
          <span>Sin datos suficientes</span>
        </div>
      )}
    </article>
  );
}
