"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getClubLogo } from "@/lib/club-logo";

import type {
  AdminLineupCompetition,
} from "@/lib/admin-lineups";

type Props = {
  competitions:
    AdminLineupCompetition[];
};

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      dateStyle:
        "short",
      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}

export default function AdminLineupsDashboard({
  competitions,
}: Props) {
  const [
    competitionId,
    setCompetitionId,
  ] = useState(
    competitions[0]?.id ??
      ""
  );

  const selectedCompetition =
    useMemo(
      () =>
        competitions.find(
          (competition) =>
            competition.id ===
            competitionId
        ) ?? null,
      [
        competitionId,
        competitions,
      ]
    );

  const competitionRounds =
    selectedCompetition?.rounds ??
    [];

  const [
    roundId,
    setRoundId,
  ] = useState("");

  useEffect(() => {
    if (!selectedCompetition) {
      setRoundId("");
      return;
    }

    const rounds =
      selectedCompetition.rounds ??
      [];

    const firstPendingRound =
      rounds.find(
        (round) =>
          round.totalTeams > 0 &&
          round.pendingCount > 0
      );

    const firstRoundWithMatches =
      rounds.find(
        (round) =>
          round.totalTeams > 0
      );

    const defaultRound =
      firstPendingRound ??
      firstRoundWithMatches ??
      rounds[0];

    setRoundId(
      defaultRound?.id ??
        ""
    );
  }, [
    selectedCompetition,
  ]);

  const selectedRound =
    useMemo(
      () =>
        competitionRounds.find(
          (round) =>
            round.id ===
            roundId
        ) ?? null,
      [
        competitionRounds,
        roundId,
      ]
    );

  if (
    competitions.length ===
    0
  ) {
    return (
      <div className="rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-6 text-sm text-[var(--mt-muted)]">
        No hay competiciones creadas.
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4 sm:p-5 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--mt-muted)]">
            Competición
          </span>

          <select
            value={
              competitionId
            }
            onChange={(
              event
            ) =>
              setCompetitionId(
                event.target.value
              )
            }
            className="min-h-[46px] w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 text-sm font-bold text-[var(--mt-text)] outline-none focus:border-emerald-500"
          >
            {competitions.map(
              (
                competition
              ) => (
                <option
                  key={
                    competition.id
                  }
                  value={
                    competition.id
                  }
                >
                  {
                    competition.name
                  }
                </option>
              )
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--mt-muted)]">
            Jornada
          </span>

          <select
            value={
              roundId
            }
            onChange={(
              event
            ) =>
              setRoundId(
                event.target.value
              )
            }
            disabled={
              competitionRounds.length ===
              0
            }
            className="min-h-[46px] w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 text-sm font-bold text-[var(--mt-text)] outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {competitionRounds.length ? (
              competitionRounds.map(
                (
                  round
                ) => (
                  <option
                    key={
                      round.id
                    }
                    value={
                      round.id
                    }
                  >
                    {
                      round.name
                    }
                    {round.totalTeams >
                    0
                      ? ` · ${round.sentCount}/${round.totalTeams}`
                      : " · sin partidos"}
                  </option>
                )
              )
            ) : (
              <option value="">
                Sin jornadas
              </option>
            )}
          </select>
        </label>
      </section>

      {selectedCompetition &&
      selectedRound ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              label="Jornada"
              value={
                selectedRound.number
              }
            />

            <Kpi
              label="Equipos"
              value={
                selectedRound.totalTeams
              }
            />

            <Kpi
              label="Enviadas"
              value={
                selectedRound.sentCount
              }
            />

            <Kpi
              label="Pendientes"
              value={
                selectedRound.pendingCount
              }
            />
          </section>

          <section className="overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)]">
            <div className="border-b border-[var(--mt-line)] p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--mt-gold-dark)]">
                    {
                      selectedCompetition.name
                    }
                  </div>

                  <h2 className="mt-1 font-black text-[var(--mt-text)]">
                    {
                      selectedRound.name
                    }
                  </h2>

                  <p className="mt-1 text-xs text-[var(--mt-muted)]">
                    {
                      selectedRound.sentCount
                    }{" "}
                    de{" "}
                    {
                      selectedRound.totalTeams
                    }{" "}
                    alineaciones recibidas
                  </p>
                </div>

                <div
                  className={`text-xs font-black ${
                    selectedRound.pendingCount ===
                    0
                      ? "text-emerald-700"
                      : "text-[var(--mt-gold-dark)]"
                  }`}
                >
                  {selectedRound.pendingCount ===
                  0
                    ? "✓ TODAS RECIBIDAS"
                    : `${selectedRound.pendingCount} PENDIENTE${
                        selectedRound.pendingCount ===
                        1
                          ? ""
                          : "S"
                      }`}
                </div>
              </div>
            </div>

            {selectedRound.teams.length ===
            0 ? (
              <div className="p-6 text-sm text-[var(--mt-muted)]">
                Esta jornada no tiene partidos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--mt-line)] bg-[var(--mt-surface)] text-[10px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
                      <th className="px-4 py-3">
                        Equipo
                      </th>

                      <th className="px-4 py-3">
                        Partido
                      </th>

                      <th className="px-4 py-3">
                        Archivo
                      </th>

                      <th className="px-4 py-3">
                        Estado
                      </th>

                      <th className="px-4 py-3">
                        Último envío
                      </th>

                      <th className="px-4 py-3 text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedRound.teams.map(
                      (
                        team
                      ) => (
                        <tr
                          key={`${team.matchId}:${team.teamCode}`}
                          className="border-b border-[var(--mt-line)] last:border-b-0"
                        >
                          <td className="px-4 py-3">
                            <Club
                              code={
                                team.teamCode
                              }
                              name={
                                team.teamName
                              }
                            />
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-black text-[var(--mt-muted)]">
                                {team.isHome
                                  ? "LOCAL"
                                  : "VISITANTE"}
                              </span>

                              <span className="text-[var(--mt-muted)]">
                                ·
                              </span>

                              {team.opponentCode &&
                              team.opponentName ? (
                                <Club
                                  code={
                                    team.opponentCode
                                  }
                                  name={
                                    team.opponentName
                                  }
                                  compact
                                />
                              ) : (
                                <span className="text-[var(--mt-muted)]">
                                  —
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 font-mono text-xs text-[var(--mt-muted)]">
                            {
                              team.fileName
                            }
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black ${
                                team.sent
                                  ? "bg-emerald-500/10 text-emerald-700"
                                  : "bg-red-500/10 text-red-700"
                              }`}
                            >
                              {team.sent
                                ? "ENVIADA"
                                : "PENDIENTE"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs text-[var(--mt-muted)]">
                            {formatDate(
                              team.modified
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {team.sent ? (
                              <a
                                href={`/api/admin/lineups/download?competitionId=${encodeURIComponent(
                                  selectedCompetition.id
                                )}&roundId=${encodeURIComponent(
                                  selectedRound.id
                                )}&teamCode=${encodeURIComponent(
                                  team.teamCode
                                )}`}
                                className="inline-flex min-h-[36px] items-center rounded-lg border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 text-xs font-black text-[var(--mt-gold-dark)] transition hover:bg-[var(--mt-surface-soft)]"
                              >
                                Descargar
                              </a>
                            ) : (
                              <span className="text-xs font-bold text-[var(--mt-muted)]">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : selectedCompetition ? (
        <section className="rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-6 text-sm text-[var(--mt-muted)]">
          Esta competición todavía no tiene jornadas generadas.
        </section>
      ) : null}
    </div>
  );
}

function Club({
  code,
  name,
  compact = false,
}: {
  code: string;
  name: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={
          getClubLogo(
            code
          )
        }
        alt=""
        className={
          compact
            ? "h-6 w-6 object-contain"
            : "h-8 w-8 object-contain"
        }
      />

      <div>
        <div
          className={
            compact
              ? "text-xs font-black text-[var(--mt-muted)]"
              : "text-sm font-black text-[var(--mt-text)]"
          }
        >
          {name}
        </div>

        {!compact ? (
          <div className="text-[10px] font-bold text-[var(--mt-muted)]">
            {code}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value:
    | number
    | string;
}) {
  return (
    <div className="rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4">
      <div className="text-[9px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-[var(--mt-text)]">
        {value}
      </div>
    </div>
  );
}
