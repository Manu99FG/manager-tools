"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";

type Round = {
  id: string;
  number: number;
  name: string;
};

type Match = {
  id: string;
  round_id: string | null;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

type Props = {
  rounds: Round[];
  matches: Match[];
  initialRoundId: string | null;
};

export default function CompetitionRoundSelector({
  rounds,
  matches,
  initialRoundId,
}: Props) {
  const fallbackId =
    initialRoundId ??
    rounds[0]?.id ??
    "";

  const [
    selectedRoundId,
    setSelectedRoundId,
  ] = useState(fallbackId);

  const selectedRound =
    useMemo(
      () =>
        rounds.find(
          (round) =>
            round.id ===
            selectedRoundId
        ) ??
        rounds[0] ??
        null,
      [
        rounds,
        selectedRoundId,
      ]
    );

  const roundMatches =
    useMemo(
      () =>
        selectedRound
          ? matches.filter(
              (match) =>
                match.round_id ===
                selectedRound.id
            )
          : [],
      [
        matches,
        selectedRound,
      ]
    );

  const playedCount =
    roundMatches.filter(
      (match) =>
        match.status ===
          "PLAYED" &&
        match.home_score !==
          null &&
        match.away_score !==
          null
    ).length;

  if (rounds.length === 0) {
    return (
      <div className="app-panel mt-4 rounded-[13px] p-6 text-sm text-[var(--mt-muted)]">
        Todavía no hay jornadas generadas.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="app-panel-soft flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mt-muted)]">
            Seleccionar jornada
          </div>

          <div className="mt-1 text-sm font-black text-[var(--mt-text)]">
            {selectedRound?.name ??
              "Jornada"}
          </div>
        </div>

        <select
          value={selectedRound?.id ?? ""}
          onChange={(event) =>
            setSelectedRoundId(
              event.target.value
            )
          }
          className="
            min-h-11
            w-full
            rounded-xl
            border
            border-[var(--mt-line)]
            bg-[var(--mt-surface)]
            px-3.5
            text-sm
            font-bold
            text-[var(--mt-text)]
            outline-none
            transition
            focus:border-[var(--mt-gold)]

            sm:w-[240px]
          "
        >
          {rounds.map(
            (round) => (
              <option
                key={round.id}
                value={round.id}
              >
                {round.name}
              </option>
            )
          )}
        </select>
      </div>

      {selectedRound ? (
        <div className="app-panel overflow-hidden rounded-2xl">
          <div className="flex flex-col gap-3 border-b border-[var(--mt-line)] bg-[var(--mt-surface)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="app-eyebrow">
                Jornada {selectedRound.number}
              </div>

              <h3 className="mt-1 text-lg font-black text-[var(--mt-text)]">
                {selectedRound.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.10em]">
              <span className="rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-2.5 py-1.5 text-[var(--mt-muted)]">
                {roundMatches.length} partidos
              </span>

              <span className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1.5 text-emerald-700">
                {playedCount} jugados
              </span>
            </div>
          </div>

          {roundMatches.length > 0 ? (
            <div className="grid lg:grid-cols-2">
              {roundMatches.map(
                (match) => {
                  const hasResult =
                    match.status ===
                      "PLAYED" &&
                    match.home_score !==
                      null &&
                    match.away_score !==
                      null;

                  const content = (
                    <div
                      className={[
                        "grid min-h-[76px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3",
                        hasResult
                          ? "transition hover:bg-[var(--mt-surface)]"
                          : "",
                      ].join(
                        " "
                      )}
                    >
                      <Team
                        code={
                          match.home_team_code
                        }
                        align="right"
                      />

                      <div className="min-w-[72px] text-center">
                        <div
                          className={`text-lg font-black ${
                            hasResult
                              ? "text-[var(--mt-text)]"
                              : "text-[var(--mt-muted)]"
                          }`}
                        >
                          {hasResult
                            ? `${match.home_score} - ${match.away_score}`
                            : "vs"}
                        </div>

                        <div
                          className={`mt-1 text-[8px] font-black uppercase tracking-[0.13em] ${
                            hasResult
                              ? "text-[var(--mt-gold-dark)]"
                              : "text-[var(--mt-muted)]"
                          }`}
                        >
                          {hasResult
                            ? "Ver ficha"
                            : "Pendiente"}
                        </div>
                      </div>

                      <Team
                        code={
                          match.away_team_code
                        }
                        align="left"
                      />
                    </div>
                  );

                  return (
                    <div
                      key={match.id}
                      className="
                        border-b
                        border-[var(--mt-line)]

                        lg:odd:border-r
                        lg:odd:border-[var(--mt-line)]

                        lg:[&:nth-last-child(-n+2)]:border-b-0
                      "
                    >
                      {hasResult ? (
                        <Link
                          href={`/partidos/${match.id}`}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="px-5 py-7 text-sm text-[var(--mt-muted)]">
              Esta jornada no tiene partidos.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Team({
  code,
  align,
}: {
  code: string;
  align:
    | "left"
    | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right"
          ? "justify-end"
          : "justify-start"
      }`}
    >
      {align === "right" ? (
        <>
          <span className="hidden truncate text-xs font-bold text-[var(--mt-muted)] sm:inline">
            {getClubName(code)}
          </span>

          <span className="text-xs font-black text-[var(--mt-muted)] sm:hidden">
            {code}
          </span>

          <Image
            src={getClubLogo(code)}
            alt={code}
            width={30}
            height={30}
            className="h-8 w-8 shrink-0 object-contain"
          />
        </>
      ) : (
        <>
          <Image
            src={getClubLogo(code)}
            alt={code}
            width={30}
            height={30}
            className="h-8 w-8 shrink-0 object-contain"
          />

          <span className="hidden truncate text-xs font-bold text-[var(--mt-muted)] sm:inline">
            {getClubName(code)}
          </span>

          <span className="text-xs font-black text-[var(--mt-muted)] sm:hidden">
            {code}
          </span>
        </>
      )}
    </div>
  );
}
