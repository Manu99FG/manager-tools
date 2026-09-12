"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Props = {
  matchId: string;
  homeTeamCode: string;
  awayTeamCode: string;
};

type UnlinkedPlayer = {
  teamCode: string;
  name: string;
};

type ImportResult = {
  ok?: boolean;
  error?: string;

  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;

  homePlayers?: number;
  awayPlayers?: number;
  playersImported?: number;
  linkedPlayers?: number;

  unlinkedPlayers?:
    UnlinkedPlayer[];

  momPlayers?:
    string[];
};

export default function EsmsMatchImporter({
  matchId,
  homeTeamCode,
  awayTeamCode,
}: Props) {
  const router =
    useRouter();

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<
    ImportResult | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBusy(true);
    setResult(null);
    setError(null);

    try {
      const formData =
        new FormData(
          event.currentTarget
        );

      formData.set(
        "matchId",
        matchId
      );

      const response =
        await fetch(
          "/api/competitions/import-esms",
          {
            method:
              "POST",
            body:
              formData,
          }
        );

      const body =
        (await response.json()) as
          ImportResult;

      if (
        !response.ok
      ) {
        throw new Error(
          body.error ??
            "No se pudo importar el .stt."
        );
      }

      setResult(
        body
      );

      router.refresh();
    } catch (
      importError
    ) {
      setError(
        importError instanceof
          Error
          ? importError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="
        mt-5
        rounded-[13px]
        border
        border-[var(--mt-gold)]
        bg-[var(--mt-surface-soft)]
        p-4
      "
    >
      <div>
        <div
          className="
            text-xs
            font-black
            uppercase
            tracking-[0.18em]
            text-[var(--mt-gold-dark)]
          "
        >
          Importar partido ESMS
        </div>

        <p
          className="
            mt-2
            max-w-3xl
            text-sm
            leading-6
            text-[var(--mt-muted)]
          "
        >
          Selecciona el único
          archivo .stt generado
          por ESMS. Debe contener
          primero{" "}
          <strong className="text-[var(--mt-text)]">
            {homeTeamCode}
          </strong>{" "}
          y después{" "}
          <strong className="text-[var(--mt-text)]">
            {awayTeamCode}
          </strong>.
          El marcador y las
          estadísticas de ambos
          equipos se leen
          directamente del mismo
          archivo.
        </p>
      </div>

      <label
        className="
          mt-4
          block
        "
      >
        <span
          className="
            mb-2
            block
            text-[10px]
            font-black
            uppercase
            tracking-wide
            text-[var(--mt-muted)]
          "
        >
          Archivo .stt del partido
        </span>

        <input
          type="file"
          name="sttFile"
          required
          accept=".stt,text/plain"
          className="
            block
            w-full
            rounded-xl
            border
            border-[var(--mt-line)]
            bg-[var(--mt-surface)]
            p-3
            text-xs
            text-[var(--mt-muted)]
            file:mr-3
            file:rounded-lg
            file:border-0
            file:bg-[var(--mt-surface)]
            file:px-3
            file:py-2
            file:text-xs
            file:font-bold
            file:text-[var(--mt-text)]
          "
        />
      </label>

      {result?.ok ? (
        <div
          className="
            mt-4
            rounded-xl
            border
            border-emerald-500/30
            bg-emerald-500/10
            p-4
          "
        >
          <div
            className="
              text-sm
              font-black
              text-emerald-700
            "
          >
            Importación completada
          </div>

          <div
            className="
              mt-2
              text-sm
              text-emerald-700
            "
          >
            {result.homeTeam}{" "}
            {result.homeScore} -{" "}
            {result.awayScore}{" "}
            {result.awayTeam}
          </div>

          <div
            className="
              mt-2
              text-xs
              leading-5
              text-[var(--mt-muted)]
            "
          >
            {
              result.playersImported ??
              0
            }{" "}
            convocados importados
            ·{" "}
            {
              result.linkedPlayers ??
              0
            }{" "}
            vinculados con la base
            de jugadores.
          </div>

          {(
            result.momPlayers ??
            []
          ).length > 0 ? (
            <div
              className="
                mt-2
                text-xs
                text-[var(--mt-muted)]
              "
            >
              MVP:{" "}
              {result.momPlayers?.join(
                ", "
              )}
            </div>
          ) : null}

          {(
            result.unlinkedPlayers ??
            []
          ).length > 0 ? (
            <div
              className="
                mt-4
                rounded-lg
                border
                border-[var(--mt-gold)]
                bg-[var(--mt-surface-soft)]
                p-3
              "
            >
              <div
                className="
                  text-xs
                  font-black
                  uppercase
                  text-[var(--mt-gold-dark)]
                "
              >
                Jugadores sin vincular
              </div>

              <div
                className="
                  mt-2
                  text-xs
                  leading-5
                  text-[var(--mt-gold-dark)]
                "
              >
                {result.unlinkedPlayers
                  ?.map(
                    (
                      player
                    ) =>
                      `${player.teamCode}: ${player.name}`
                  )
                  .join(
                    " · "
                  )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div
          className="
            mt-4
            rounded-xl
            border
            border-red-500/30
            bg-red-500/10
            p-3
            text-sm
            font-bold
            text-red-700
          "
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          busy
        }
        className="
          mt-4
          rounded-xl
          bg-[var(--mt-gold)]
          px-5
          py-3
          text-sm
          font-black
          text-[var(--mt-surface)]
          transition
          hover:bg-[var(--mt-gold-dark)]
          disabled:cursor-not-allowed
          disabled:opacity-40
        "
      >
        {
          busy
            ? "Importando..."
            : "Importar .stt"
        }
      </button>
    </form>
  );
}
