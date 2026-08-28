"use client";

import {
  useState,
} from "react";

type ImportError = {
  player: string;
  team: string;
  error: string;
};

type ImportResult = {
  total: number;
  saved: number;
  unchanged: number;
  errors: number;

  errorDetails:
    ImportError[];
};

export default function PlayerHistoryImporter() {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    result,
    setResult,
  ] =
    useState<ImportResult | null>(
      null
    );

  const [
    error,
    setError,
  ] = useState("");

  async function handleImport() {
    setLoading(true);

    setError("");

    setResult(null);

    try {
      const response =
        await fetch(
          "/api/player-history/import",
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ??
            "Error importando el historial"
        );
      }

      setResult(
        data.result
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Error desconocido"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        rounded-xl
        border
        border-slate-800
        bg-slate-900
        p-5
      "
    >
      <div
        className="
          flex
          flex-col
          gap-4

          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <h2
            className="
              text-lg
              font-bold
              text-white
            "
          >
            Historial de jugadores
          </h2>

          <p
            className="
              mt-1
              text-sm
              text-slate-400
            "
          >
            Guarda el estado actual de todas las plantillas.
          </p>
        </div>

        <button
          type="button"
          onClick={
            handleImport
          }
          disabled={
            loading
          }
          className="
            rounded-lg
            bg-blue-500
            px-4
            py-2.5
            text-sm
            font-bold
            text-white
            transition

            hover:bg-blue-400

            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {loading
            ? "Actualizando..."
            : "Actualizar historial"}
        </button>
      </div>

      {result && (
        <>
          <div
            className="
              mt-5
              grid
              grid-cols-2
              gap-3

              sm:grid-cols-4
            "
          >
            <Stat
              label="Jugadores"
              value={
                result.total
              }
            />

            <Stat
              label="Actualizados"
              value={
                result.saved
              }
            />

            <Stat
              label="Sin cambios"
              value={
                result.unchanged
              }
            />

            <Stat
              label="Errores"
              value={
                result.errors
              }
            />
          </div>

          {result.errorDetails
            ?.length >
            0 && (
            <div
              className="
                mt-6
                overflow-hidden
                rounded-xl
                border
                border-red-900/60
                bg-red-950/20
              "
            >
              <div
                className="
                  border-b
                  border-red-900/60
                  px-4
                  py-3
                "
              >
                <h3
                  className="
                    font-bold
                    text-red-400
                  "
                >
                  Errores de importación
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-red-300/60
                  "
                >
                  Mostrando los primeros{" "}
                  {
                    result
                      .errorDetails
                      .length
                  }{" "}
                  errores.
                </p>
              </div>

              <div
                className="
                  divide-y
                  divide-red-900/40
                "
              >
                {result.errorDetails.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.team}:${item.player}:${index}`}
                      className="
                        p-4
                      "
                    >
                      <div
                        className="
                          font-semibold
                          text-white
                        "
                      >
                        {
                          item.player
                        }

                        <span
                          className="
                            ml-2
                            text-xs
                            text-slate-500
                          "
                        >
                          {
                            item.team
                          }
                        </span>
                      </div>

                      <code
                        className="
                          mt-2
                          block
                          whitespace-pre-wrap
                          break-words
                          text-xs
                          text-red-300
                        "
                      >
                        {
                          item.error
                        }
                      </code>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div
          className="
            mt-4
            rounded-lg
            border
            border-red-900
            bg-red-950/40
            p-3
            text-sm
            text-red-400
          "
        >
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className="
        rounded-lg
        border
        border-slate-800
        bg-slate-950
        p-3
      "
    >
      <div
        className="
          text-xs
          text-slate-500
        "
      >
        {label}
      </div>

      <div
        className="
          mt-1
          text-xl
          font-bold
          text-white
        "
      >
        {value}
      </div>
    </div>
  );
}