"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  GlobalEsmsPlayer,
} from "@/lib/all-players";

import {
  validateOriginalTeamsheet,
  type OriginalCheckerResult,
  type OriginalRosterPlayer,
} from "@/lib/original-sht-checker";

type Props = {
  players:
    GlobalEsmsPlayer[];

  selectedTeam?: string;
};

const LEAGUE_RULES = {
  Max_Skill: 30,
  Min_DF: 2,
  Max_DF: 8,
  Min_MF: 2,
  Max_MF: 8,
  Max_DM: 8,
  Max_AM: 8,
  Min_FW: 0,
  Max_FW: 5,
};

function getSheetPlayerName(
  player: GlobalEsmsPlayer
) {
  return player.name.replace(
    /\s+/g,
    "_"
  );
}

function detectTeamCode(
  content: string
) {
  return (
    String(
      content ?? ""
    )
      .split(/\r?\n/)
      .map(
        (line) =>
          line.trim()
      )
      .find(Boolean)
      ?.toUpperCase() ??
    ""
  );
}

function toOriginalRoster(
  players:
    GlobalEsmsPlayer[],
  teamCode:
    string
): OriginalRosterPlayer[] {
  return players
    .filter(
      (player) =>
        player.teamCode.toUpperCase() ===
        teamCode.toUpperCase()
    )
    .map(
      (player) => ({
        name:
          getSheetPlayerName(
            player
          ),

        st:
          player.st,

        tk:
          player.tk,

        ps:
          player.ps,

        sh:
          player.sh,

        injury:
          player.inj,

        suspension:
          player.sus,
      })
    );
}

export default function ManualShtChecker({
  players,
  selectedTeam,
}: Props) {
  const [
    content,
    setContent,
  ] = useState("");

  const [
    fileName,
    setFileName,
  ] = useState<
    string | null
  >(null);

  const [
    result,
    setResult,
  ] = useState<
    OriginalCheckerResult | null
  >(null);

  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const detectedTeam =
    useMemo(
      () =>
        detectTeamCode(
          content
        ),
      [content]
    );

  async function handleFile(
    file: File
  ) {
    const buffer =
      await file.arrayBuffer();

    const text =
      new TextDecoder(
        "windows-1252"
      ).decode(
        buffer
      );

    setContent(
      text
    );

    setFileName(
      file.name
    );

    setResult(
      null
    );
  }

  function handleCheck() {
    if (
      !content.trim()
    ) {
      setResult({
        valid: false,
        error: {
          code:
            "OPEN_TEAMSHEET",
          message:
            "Error. Failed to open teamsheet",
          line:
            null,
          explanation:
            "Pega una alineación o importa un archivo antes de comprobar.",
        },
        teamsheet:
          null,
      });

      return;
    }

    const teamCode =
      detectTeamCode(
        content
      );

    const roster =
      toOriginalRoster(
        players,
        teamCode
      );

    setResult(
      validateOriginalTeamsheet({
        teamsheetText:
          content,

        roster,

        league:
          LEAGUE_RULES,
      })
    );
  }

  function handleClear() {
    setContent("");
    setFileName(null);
    setResult(null);

    if (
      inputRef.current
    ) {
      inputRef.current.value =
        "";
    }
  }

  return (
    <div>
      <div
        className="
          rounded-[13px]
          border
          border-[var(--mt-line)]
          bg-[var(--mt-surface)]
          p-4
        "
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-black text-[var(--mt-text)]">
              Comprobador original
            </h2>

            <p className="mt-1 text-xs leading-5 text-[var(--mt-muted)]">
              Importa tu archivo ABREVIATURAsht.txt o pega su contenido. La validación reproduce el código del checker original que has facilitado.
            </p>
          </div>

          {fileName && (
            <div className="rounded-lg border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 py-1.5 text-xs font-bold text-[var(--mt-gold-dark)]">
              {fileName}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={
              inputRef
            }
            type="file"
            accept=".txt,.sht,text/plain"
            className="hidden"
            onChange={(
              event
            ) => {
              const file =
                event.target.files?.[0];

              if (file) {
                void handleFile(
                  file
                );
              }
            }}
          />

          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            className="
              rounded-lg
              border
              border-[var(--mt-line)]
              bg-[var(--mt-surface)]
              px-3
              py-2
              text-xs
              font-bold
              text-[var(--mt-text)]
              transition
              hover:bg-[var(--mt-surface-soft)]
            "
          >
            Importar archivo
          </button>

          <button
            type="button"
            onClick={
              handleCheck
            }
            className="
              rounded-lg
              bg-[var(--mt-gold)]
              px-4
              py-2
              text-xs
              font-black
              text-[var(--mt-text)]
              transition
              hover:bg-[var(--mt-gold-dark)]
            "
          >
            Comprobar alineación
          </button>

          <button
            type="button"
            onClick={
              handleClear
            }
            className="
              rounded-lg
              border
              border-[var(--mt-line)]
              px-3
              py-2
              text-xs
              font-bold
              text-[var(--mt-muted)]
              hover:bg-[var(--mt-surface-soft)]
              hover:text-[var(--mt-muted)]
            "
          >
            Limpiar
          </button>
        </div>

        <textarea
          value={
            content
          }
          onChange={(
            event
          ) => {
            setContent(
              event.target.value
            );

            setFileName(
              null
            );

            setResult(
              null
            );
          }}
          spellCheck={
            false
          }
          placeholder={`CEL
N
GK Portero
DF Defensa_1
...
PK: Delantero_1
TACTIC A IF SCORE <= -1`}
          className="
            mt-4
            min-h-[360px]
            w-full
            resize-y
            rounded-xl
            border
            border-[var(--mt-line)]
            bg-[var(--mt-surface)]
            p-4
            font-mono
            text-xs
            leading-6
            text-[var(--mt-text)]
            outline-none
            focus:border-[var(--mt-gold)]
          "
        />

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
          {detectedTeam && (
            <span className="rounded bg-[var(--mt-surface)] px-2 py-1">
              Equipo detectado:{" "}
              {
                detectedTeam
              }
            </span>
          )}

          {selectedTeam &&
            detectedTeam &&
            selectedTeam !==
              detectedTeam && (
              <span className="rounded bg-[var(--mt-surface-soft)] px-2 py-1 text-[var(--mt-gold-dark)]">
                Creador:{" "}
                {
                  selectedTeam
                }
              </span>
            )}
        </div>
      </div>

      {result && (
        <div
          className={`
            mt-4
            overflow-hidden
            rounded-2xl
            border

            ${
              result.valid
                ? "border-emerald-500/25 bg-emerald-500/5"
                : "border-red-500/25 bg-red-500/5"
            }
          `}
        >
          {result.valid ? (
            <div className="p-5">
              <div className="text-sm font-black text-emerald-700">
                ✓ ALINEACIÓN VÁLIDA
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Info
                  label="Equipo"
                  value={
                    result.teamsheet.team
                  }
                />

                <Info
                  label="Táctica"
                  value={
                    result.teamsheet.tactic
                  }
                />

                <Info
                  label="Titulares"
                  value={
                    String(
                      result.teamsheet.starters.length
                    )
                  }
                />

                <Info
                  label="Suplentes"
                  value={
                    String(
                      result.teamsheet.substitutes.length
                    )
                  }
                />
              </div>

              <div className="mt-4 text-xs text-[var(--mt-muted)]">
                PK:{" "}
                <span className="font-bold text-[var(--mt-text)]">
                  {
                    result.teamsheet.penaltyTaker
                  }
                </span>
                {" · "}
                Órdenes:{" "}
                <span className="font-bold text-[var(--mt-text)]">
                  {
                    result.teamsheet.orders.length
                  }
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-black text-red-700">
                  ERROR
                </span>

                <span className="rounded-lg bg-[var(--mt-surface)] px-3 py-1.5 font-mono text-[10px] font-bold text-[var(--mt-muted)]">
                  {
                    result.error.code
                  }
                </span>

                {result.error.line !==
                  null && (
                  <span className="text-xs font-bold text-[var(--mt-muted)]">
                    Línea{" "}
                    {
                      result.error.line
                    }
                  </span>
                )}
              </div>

              <pre className="mt-4 whitespace-pre-wrap font-sans text-sm font-bold leading-6 text-red-700">
                {
                  result.error.message
                }
              </pre>

              {result.error.explanation && (
                <p className="mt-3 text-xs leading-5 text-[var(--mt-muted)]">
                  {
                    result.error.explanation
                  }
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-3">
      <div className="text-[9px] font-black uppercase tracking-wide text-[var(--mt-muted)]">
        {label}
      </div>

      <div className="mt-1 font-black text-[var(--mt-text)]">
        {value}
      </div>
    </div>
  );
}

