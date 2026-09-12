"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  LineupSubmissionCompetition,
} from "@/lib/lineup-submissions";

type Props = {
  competitions:
    LineupSubmissionCompetition[];
};

type SubmitState =
  | {
      kind:
        "idle";
      message:
        "";
    }
  | {
      kind:
        "loading";
      message:
        string;
    }
  | {
      kind:
        "success";
      message:
        string;
    }
  | {
      kind:
        "error";
      message:
        string;
    };

export default function LineupSubmissionForm({
  competitions,
}: Props) {
  const [
    competitionId,
    setCompetitionId,
  ] = useState("");

  const [
    teamCode,
    setTeamCode,
  ] = useState("");

  const [
    file,
    setFile,
  ] = useState<
    File | null
  >(null);

  const [
    state,
    setState,
  ] = useState<SubmitState>({
    kind:
      "idle",
    message:
      "",
  });

  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const selectedCompetition =
    useMemo(
      () =>
        competitions.find(
          (
            competition
          ) =>
            competition.id ===
            competitionId
        ) ??
        null,
      [
        competitionId,
        competitions,
      ]
    );

  const expectedFileName =
    teamCode
      ? `${teamCode}sht.txt`
      : "";

  function resetFile() {
    setFile(
      null
    );

    if (
      inputRef.current
    ) {
      inputRef.current.value =
        "";
    }
  }

  async function handleSubmit() {
    if (
      !competitionId
    ) {
      setState({
        kind:
          "error",
        message:
          "Elige una competición.",
      });

      return;
    }

    if (
      !teamCode
    ) {
      setState({
        kind:
          "error",
        message:
          "Elige un equipo.",
      });

      return;
    }

    if (!file) {
      setState({
        kind:
          "error",
        message:
          "Selecciona el archivo de alineación.",
      });

      return;
    }

    const formData =
      new FormData();

    formData.append(
      "competitionId",
      competitionId
    );

    formData.append(
      "teamCode",
      teamCode
    );

    formData.append(
      "file",
      file
    );

    setState({
      kind:
        "loading",
      message:
        "Comprobando y enviando alineación...",
    });

    try {
      const response =
        await fetch(
          "/api/lineups/submit",
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const payload =
        (await response.json()) as {
          ok?:
            boolean;

          message?:
            string;

          error?:
            string;

          dropboxPath?:
            string;

          fileName?:
            string;

          roundId?:
            string;

          roundNumber?:
            number;

          roundName?:
            string;
        };

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.error ??
            payload.message ??
            "No se pudo enviar la alineación."
        );
      }

      setState({
        kind:
          "success",

        message:
          payload.message ??
          `Alineación ${teamCode} enviada correctamente.`,
      });

      resetFile();
    } catch (
      error
    ) {
      setState({
        kind:
          "error",

        message:
          error instanceof
          Error
            ? error.message
            : "No se pudo enviar la alineación.",
      });
    }
  }

  return (
    <section className="overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)]">
      <div className="border-b border-[var(--mt-line)] p-4 sm:p-5">
        <h2 className="font-black text-[var(--mt-text)]">
          Datos del envío
        </h2>

        <p className="mt-1 text-xs leading-5 text-[var(--mt-muted)]">
          La jornada se asigna automáticamente según el próximo partido pendiente de tu equipo.
        </p>
      </div>

      <div className="grid gap-5 p-4 sm:p-5">
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
            ) => {
              setCompetitionId(
                event.target.value
              );

              setTeamCode(
                ""
              );

              resetFile();

              setState({
                kind:
                  "idle",
                message:
                  "",
              });
            }}
            className="min-h-[46px] w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 text-sm font-bold text-[var(--mt-text)] outline-none focus:border-[var(--mt-gold)]"
          >
            <option value="">
              Elegir competición
            </option>

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
            Equipo
          </span>

          <select
            value={
              teamCode
            }
            disabled={
              !selectedCompetition
            }
            onChange={(
              event
            ) => {
              setTeamCode(
                event.target.value
              );

              resetFile();

              setState({
                kind:
                  "idle",
                message:
                  "",
              });
            }}
            className="min-h-[46px] w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 text-sm font-bold text-[var(--mt-text)] outline-none disabled:cursor-not-allowed disabled:opacity-40 focus:border-[var(--mt-gold)]"
          >
            <option value="">
              {selectedCompetition
                ? "Elegir equipo"
                : "Primero elige competición"}
            </option>

            {selectedCompetition?.teams.map(
              (
                team
              ) => (
                <option
                  key={
                    team.code
                  }
                  value={
                    team.code
                  }
                >
                  {
                    team.name
                  }{" "}
                  ({
                    team.code
                  })
                </option>
              )
            )}
          </select>
        </label>

        <div>
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[var(--mt-muted)]">
            Alineación
          </span>

          <input
            ref={
              inputRef
            }
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(
              event
            ) => {
              const nextFile =
                event.target.files?.[0] ??
                null;

              setFile(
                nextFile
              );

              setState({
                kind:
                  "idle",
                message:
                  "",
              });
            }}
          />

          <button
            type="button"
            disabled={
              !teamCode
            }
            onClick={() =>
              inputRef.current?.click()
            }
            className="min-h-[48px] w-full rounded-xl border border-dashed border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 text-left transition hover:border-[var(--mt-gold)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {file ? (
              <div>
                <div className="text-sm font-black text-[var(--mt-text)]">
                  {
                    file.name
                  }
                </div>

                <div className="mt-1 text-xs text-[var(--mt-muted)]">
                  Se guardará automáticamente en la jornada correspondiente como{" "}
                  <span className="font-bold text-[var(--mt-gold-dark)]">
                    {
                      expectedFileName
                    }
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-black text-[var(--mt-muted)]">
                  Seleccionar archivo
                </div>

                {expectedFileName && (
                  <div className="mt-1 text-xs text-[var(--mt-muted)]">
                    Ejemplo:{" "}
                    {
                      expectedFileName
                    }
                  </div>
                )}
              </div>
            )}
          </button>
        </div>

        {state.kind !==
          "idle" && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
              state.kind ===
              "success"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                : state.kind ===
                    "error"
                  ? "border-red-500/25 bg-red-500/10 text-red-700"
                  : "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]"
            }`}
          >
            {
              state.message
            }
          </div>
        )}

        <button
          type="button"
          disabled={
            state.kind ===
            "loading" ||
            !competitionId ||
            !teamCode ||
            !file
          }
          onClick={() =>
            void handleSubmit()
          }
          className="min-h-[50px] rounded-xl bg-[var(--mt-gold)] px-5 text-sm font-black text-[var(--mt-surface)] transition hover:bg-[var(--mt-gold-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.kind ===
          "loading"
            ? "Comprobando y enviando..."
            : "Comprobar y enviar"}
        </button>
      </div>
    </section>
  );
}
