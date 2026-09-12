"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import type { CareerPosition, PlayerCareerHistoryData } from "@/lib/player-career-history";
import type { PlayerPalmaresData } from "@/lib/player-palmares";

type Tab = "general" | "temporadas" | "competiciones" | "clubes" | "palmares" | "records";
type StatSource = {
  matches: number; starts: number; minutes: number; goals: number; assists: number; mom: number;
  saves: number; conceded: number; tackles: number; keyPasses: number; shots: number; dp: number;
};

type Metric = { key: string; label: string; value: (row: StatSource) => string | number };

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "general", label: "Vista general" },
  { key: "temporadas", label: "Temporadas" },
  { key: "competiciones", label: "Competiciones" },
  { key: "clubes", label: "Carrera" },
  { key: "palmares", label: "Palmarés" },
  { key: "records", label: "Récords" },
];

const per90 = (value: number, minutes: number) => minutes > 0 ? (value * 90) / minutes : 0;
const pct = (value: number, total: number) => total > 0 ? (value / total) * 100 : 0;
const f1 = (value: number) => value.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function metricsFor(position: CareerPosition | null): Metric[] {
  const base: Metric[] = [
    { key: "matches", label: "PJ", value: r => r.matches },
    { key: "minutes", label: "MIN", value: r => r.minutes.toLocaleString("es-ES") },
  ];

  if (position === "GK") return [
    ...base,
    { key: "saves", label: "SAV", value: r => r.saves },
    { key: "savePct", label: "% SAV", value: r => `${f1(pct(r.saves, r.saves + r.conceded))}%` },
    { key: "saves90", label: "SAV/90", value: r => f1(per90(r.saves, r.minutes)) },
    { key: "con90", label: "GC/90", value: r => f1(per90(r.conceded, r.minutes)) },
    { key: "conceded", label: "GC", value: r => r.conceded },
    { key: "mom", label: "MVP", value: r => r.mom },
  ];

  if (position === "DF") return [
    ...base,
    { key: "tackles", label: "KTK", value: r => r.tackles },
    { key: "tackles90", label: "KTK/90", value: r => f1(per90(r.tackles, r.minutes)) },
    { key: "kps90", label: "KPS/90", value: r => f1(per90(r.keyPasses, r.minutes)) },
    { key: "ga90", label: "G+A/90", value: r => f1(per90(r.goals + r.assists, r.minutes)) },
    { key: "dp", label: "DP", value: r => r.dp },
    { key: "mom", label: "MVP", value: r => r.mom },
  ];

  if (position === "DM") return [
    ...base,
    { key: "tackles90", label: "KTK/90", value: r => f1(per90(r.tackles, r.minutes)) },
    { key: "kps90", label: "KPS/90", value: r => f1(per90(r.keyPasses, r.minutes)) },
    { key: "ass90", label: "A/90", value: r => f1(per90(r.assists, r.minutes)) },
    { key: "impact90", label: "IMP/90", value: r => f1(per90(r.tackles + r.keyPasses + r.goals + r.assists, r.minutes)) },
    { key: "dp", label: "DP", value: r => r.dp },
    { key: "mom", label: "MVP", value: r => r.mom },
  ];

  if (position === "MF") return [
    ...base,
    { key: "kps90", label: "KPS/90", value: r => f1(per90(r.keyPasses, r.minutes)) },
    { key: "ass90", label: "A/90", value: r => f1(per90(r.assists, r.minutes)) },
    { key: "shots90", label: "SHT/90", value: r => f1(per90(r.shots, r.minutes)) },
    { key: "ga90", label: "G+A/90", value: r => f1(per90(r.goals + r.assists, r.minutes)) },
    { key: "goals", label: "G", value: r => r.goals },
    { key: "mom", label: "MVP", value: r => r.mom },
  ];

  if (position === "AM") return [
    ...base,
    { key: "kps90", label: "KPS/90", value: r => f1(per90(r.keyPasses, r.minutes)) },
    { key: "ga90", label: "G+A/90", value: r => f1(per90(r.goals + r.assists, r.minutes)) },
    { key: "shots90", label: "SHT/90", value: r => f1(per90(r.shots, r.minutes)) },
    { key: "conversion", label: "CONV", value: r => `${f1(pct(r.goals, r.shots))}%` },
    { key: "goals", label: "G", value: r => r.goals },
    { key: "assists", label: "A", value: r => r.assists },
  ];

  if (position === "FW") return [
    ...base,
    { key: "goals", label: "G", value: r => r.goals },
    { key: "goals90", label: "G/90", value: r => f1(per90(r.goals, r.minutes)) },
    { key: "ga90", label: "G+A/90", value: r => f1(per90(r.goals + r.assists, r.minutes)) },
    { key: "shots90", label: "SHT/90", value: r => f1(per90(r.shots, r.minutes)) },
    { key: "conversion", label: "CONV", value: r => `${f1(pct(r.goals, r.shots))}%` },
    { key: "mom", label: "MVP", value: r => r.mom },
  ];

  return [...base,
    { key: "goals", label: "G", value: r => r.goals },
    { key: "assists", label: "A", value: r => r.assists },
    { key: "mom", label: "MVP", value: r => r.mom },
    { key: "dp", label: "DP", value: r => r.dp },
  ];
}

export default function PlayerCareerHistory({ data, palmares }: { data: PlayerCareerHistoryData; palmares: PlayerPalmaresData }) {
  const [tab, setTab] = useState<Tab>("general");

  return (
    <section className="mt-8 overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)]">
      <div className="border-b border-[var(--mt-line)] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--mt-gold-dark)]">Historial del jugador</div>
          {data.position ? <span className="rounded-md bg-[var(--mt-surface-soft)] px-2 py-1 text-[10px] font-black text-[var(--mt-gold-dark)]">{data.position}</span> : null}
        </div>
        <h2 className="mt-1 text-xl font-black text-[var(--mt-text)] sm:text-2xl">Carrera completa</h2>
        <p className="mt-1 text-sm text-[var(--mt-muted)]">Estadísticas adaptadas a la posición del jugador y calculadas desde los partidos oficiales.</p>
      </div>

      <div className="overflow-x-auto border-b border-[var(--mt-line)] px-3 pt-3">
        <div className="flex min-w-max gap-1">
          {tabs.map((item) => (
            <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`rounded-t-xl px-4 py-3 text-xs font-black transition ${tab === item.key ? "bg-[var(--mt-surface)] text-[var(--mt-text)]" : "text-[var(--mt-muted)] hover:text-[var(--mt-muted)]"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {tab === "general" && <General data={data} />}
        {tab === "temporadas" && <SeasonTable data={data} />}
        {tab === "competiciones" && <CompetitionTable data={data} />}
        {tab === "clubes" && <Career data={data} />}
        {tab === "palmares" && <Palmares data={palmares} />}
        {tab === "records" && <Records data={data} />}
      </div>
    </section>
  );
}

function General({ data }: { data: PlayerCareerHistoryData }) {
  const metrics = metricsFor(data.position);
  const items = [...metrics, { key: "clubs", label: "CLUBES", value: () => data.clubs.length }];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-9">
      {items.map((metric) => (
        <div key={metric.key} className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4">
          <div className="text-[10px] font-black uppercase tracking-wide text-[var(--mt-muted)]">{metric.label}</div>
          <div className="mt-1 text-2xl font-black text-[var(--mt-text)]">{metric.value(data.totals)}</div>
        </div>
      ))}
    </div>
  );
}

function SeasonTable({ data }: { data: PlayerCareerHistoryData }) {
  if (!data.seasons.length) return <Empty />;
  return <StatsTable rows={data.seasons.map((r) => ({ name: r.seasonName, teams: r.teamCodes.join(" · "), ...r }))} fallbackPosition={data.position} />;
}

function CompetitionTable({ data }: { data: PlayerCareerHistoryData }) {
  if (!data.competitions.length) return <Empty />;
  return <StatsTable rows={data.competitions.map((r) => ({ name: r.competitionName, teams: `${r.seasonName} · ${r.teamCodes.join(" · ")}`, ...r }))} fallbackPosition={data.position} />;
}

function StatsTable({ rows, fallbackPosition }: { rows: Array<Record<string, unknown>>; fallbackPosition: CareerPosition | null }) {
  const metrics = metricsFor(fallbackPosition);
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--mt-line)]">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="bg-[var(--mt-surface)] text-[10px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
          <tr>
            <th className="px-4 py-3 text-left">Periodo</th><th className="px-4 py-3 text-left">Club</th><th className="px-3 py-3 text-center">Pos</th>
            {metrics.map(m => <th key={m.key} className="px-3 py-3 text-center">{m.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowPosition = (row.position as CareerPosition | null) ?? fallbackPosition;
            const source = row as unknown as StatSource;
            return (
              <tr key={`${String(row.name)}-${index}`} className="border-t border-[var(--mt-line)] text-[var(--mt-muted)]">
                <td className="px-4 py-3 font-black text-[var(--mt-text)]">{String(row.name)}</td>
                <td className="px-4 py-3 text-xs text-[var(--mt-muted)]">{String(row.teams || "—")}</td>
                <td className="px-3 py-3 text-center"><span className="rounded bg-[var(--mt-surface)] px-2 py-1 text-[10px] font-black text-[var(--mt-muted)]">{rowPosition ?? "—"}</span></td>
                {metrics.map((metric, i) => <td key={`${metric.key}-${i}`} className="px-3 py-3 text-center font-bold">{metric.value(source)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Career({ data }: { data: PlayerCareerHistoryData }) {
  if (!data.clubs.length) return <Empty />;
  return (
    <div className="space-y-3">
      {data.clubs.map((club, index) => {
        const metrics = metricsFor(club.position ?? data.position).slice(0, 6);
        return (
          <div key={club.teamCode} className="flex flex-col gap-4 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4 xl:flex-row xl:items-center">
            <div className="flex items-center gap-4 xl:w-72">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--mt-surface)] p-2">
                <Image src={getClubLogo(club.teamCode)} alt={getClubName(club.teamCode)} width={40} height={40} className="h-9 w-9 object-contain" />
              </div>
              <div><div className="text-[10px] font-black uppercase text-[var(--mt-muted)]">Etapa {index + 1} · {club.position ?? data.position ?? "—"}</div><div className="font-black text-[var(--mt-text)]">{getClubName(club.teamCode)}</div><div className="text-xs text-[var(--mt-muted)]">{club.teamCode}</div></div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {metrics.map(metric => <div key={metric.key} className="rounded-lg bg-[var(--mt-surface)] p-2 text-center"><div className="text-[9px] font-black text-[var(--mt-muted)]">{metric.label}</div><div className="font-black text-[var(--mt-text)]">{metric.value(club)}</div></div>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function Palmares({ data }: { data: PlayerPalmaresData }) {
  const { summary, groups } = data;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PalmaresKpi label="Títulos" value={summary.total} />
        <PalmaresKpi label="Ligas" value={summary.leagues} />
        <PalmaresKpi label="Champions" value={summary.champions} />
        <PalmaresKpi label="Copas" value={summary.cups} />
      </div>

      <div className="mt-3 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 py-3 text-xs leading-5 text-[var(--mt-muted)]">
        {data.participationRule}
      </div>

      {groups.length ? (
        <div className="mt-4 space-y-3">
          {groups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)]"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[var(--mt-line)] px-4 py-3">
                <div className="min-w-0">
                  {group.seriesId ? (
                    <Link
                      href={`/competiciones/historico/${group.seriesId}`}
                      className="truncate text-sm font-black text-[var(--mt-text)] transition hover:text-[var(--mt-gold-dark)]"
                    >
                      🏆 {group.seriesName}
                    </Link>
                  ) : (
                    <div className="truncate text-sm font-black text-[var(--mt-text)]">
                      🏆 {group.seriesName}
                    </div>
                  )}

                  <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                    {group.scope !== "OTHER"
                      ? group.scope.replaceAll("_", " ")
                      : group.competitionType}
                  </div>
                </div>

                <div className="shrink-0 rounded-lg border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 py-2 text-center">
                  <div className="text-xl font-black text-[var(--mt-gold-dark)]">
                    {group.count}
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
                    {group.count === 1 ? "título" : "títulos"}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-800">
                {group.titles.map((title) => (
                  <Link
                    key={title.competitionId}
                    href={`/competiciones/${title.competitionId}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-[var(--mt-surface)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-8 w-8 shrink-0">
                        <Image
                          src={getClubLogo(title.teamCode)}
                          alt={getClubName(title.teamCode)}
                          fill
                          sizes="32px"
                          className="object-contain"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-black text-[var(--mt-text)]">
                          {title.seasonName}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-[var(--mt-muted)]">
                          {title.competitionName} · {getClubName(title.teamCode)}
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 text-xs font-black text-[var(--mt-gold-dark)]">
                      Ver edición →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--mt-line)] bg-[var(--mt-surface)] px-5 py-10 text-center">
          <div className="text-3xl" aria-hidden="true">🏆</div>
          <div className="mt-3 text-sm font-black text-[var(--mt-muted)]">
            Todavía no hay títulos registrados.
          </div>
          <div className="mt-1 text-xs text-[var(--mt-muted)]">
            Aparecerán automáticamente cuando el jugador haya participado con un equipo campeón.
          </div>
        </div>
      )}
    </div>
  );
}

function PalmaresKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] p-4">
      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--mt-gold-dark)]">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black tracking-tight text-[var(--mt-text)]">
        {value}
      </div>
    </div>
  );
}

function Records({ data }: { data: PlayerCareerHistoryData }) {
  if (!data.records.length) return <Empty />;
  return (
    <div>
      <div className="mb-4">
        <div className="text-sm font-black text-[var(--mt-text)]">
          Récords {data.position ? `de ${data.position}` : "personales"}
        </div>
        <div className="mt-1 text-xs text-[var(--mt-muted)]">
          Los récords se adaptan automáticamente a la posición principal del jugador.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.records.map((record) => {
          const content = (
            <>
              <div className="text-[10px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
                {record.label}
              </div>
              <div className="mt-2 text-2xl font-black text-[var(--mt-text)]">{record.value}</div>
              {record.detail ? (
                <div className="mt-1 text-xs text-[var(--mt-muted)]">{record.detail}</div>
              ) : null}
            </>
          );

          return record.matchId ? (
            <Link
              key={record.label}
              href={`/partidos/${record.matchId}`}
              className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4 transition hover:border-[var(--mt-gold)]"
            >
              {content}
            </Link>
          ) : (
            <div
              key={record.label}
              className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Empty() { return <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-6 text-sm text-[var(--mt-muted)]">Todavía no hay partidos oficiales suficientes para mostrar este apartado.</div>; }
