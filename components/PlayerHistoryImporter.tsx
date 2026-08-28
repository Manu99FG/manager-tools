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

  newPlayers: number;

  saved: number;

  unchanged: number;

  transfers: number;

  events: number;

  errors: number;

  errorDetails:
    ImportError[];
};

type ImportResponse = {
  ok?: boolean;

  result?:
    ImportResult;

  error?:
    | string
    | {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
};

/* =========================================================
   ERROR
========================================================= */

function formatServerError(
  error:
    ImportResponse["error"]
) {
  if (!error) {
    return "Error desconocido";
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  const parts: string[] =
    [];

  if (
    error.message
  ) {
    parts.push(
      error.message
    );
  }

  if (
    error.details
  ) {
    parts.push(
      `Detalles: ${error.details}`
    );
  }

  if (error.hint) {
    parts.push(
      `Hint: ${error.hint}`
    );
  }

  if (error.code) {
    parts.push(
      `Código: ${error.code}`
    );
  }

  return (
    parts.join(" | ") ||
    "Error desconocido"
  );
}

/* =========================================================
   COMPONENTE
========================================================= */

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

    const startedAt =
      Date.now();

    try {
      const response =
        await fetch(
          "/api/player-history/import",
          {
            method:
              "POST",

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const rawResponse =
        await response.text();

      let data:
        ImportResponse;

      try {
        data =
          JSON.parse(
            rawResponse
          ) as ImportResponse;
      } catch {
        throw new Error(
          `Respuesta no válida del servidor (${response.status}): ${rawResponse.slice(
            0,
            800
          )}`
        );
      }

      if (
        !response.ok
      ) {
        throw new Error(
          formatServerError(
            data.error
          )
        );
      }

      if (!data.ok) {
        throw new Error(
          formatServerError(
            data.error
          )
        );
      }

      if (
        !data.result
      ) {
        throw new Error(
          "El servidor no devolvió el resultado."
        );
      }

      setResult(
        data.result
      );

      const seconds =
        (
          (Date.now() -
            startedAt) /
          1000
        ).toFixed(1);

      console.log(
        `Historial actualizado en ${seconds}s`
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : String(
              caughtError
            )
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
            Compara las plantillas actuales con el último registro.
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
            px-5
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

      {loading && (
        <div
          className="
            mt-5
            rounded-lg
            border
            border-blue-900/50
            bg-blue-950/20
            p-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                h-5
                w-5
                animate-spin
                rounded-full
                border-2
                border-blue-400
                border-t-transparent
              "
            />

            <div>
              <div
                className="
                  text-sm
                  font-bold
                  text-blue-300
                "
              >
                Actualizando historial
              </div>

              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Dropbox → comparación → Supabase
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <>
          <div
            className="
              mt-5
              grid
              grid-cols-2
              gap-3

              md:grid-cols-4

              xl:grid-cols-7
            "
          >
            <Stat
              label="Jugadores"
              value={
                result.total
              }
            />

            <Stat
              label="Nuevos"
              value={
                result.newPlayers
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
              label="Transferencias"
              value={
                result.transfers
              }
            />

            <Stat
              label="Eventos"
              value={
                result.events
              }
            />

            <Stat
              label="Errores"
              value={
                result.errors
              }
            />
          </div>

          {result.errors ===
            0 && (
            <div
              className="
                mt-4
                rounded-lg
                border
                border-emerald-900/50
                bg-emerald-950/20
                px-4
                py-3
                text-sm
                font-medium
                text-emerald-400
              "
            >
              ✓ Historial actualizado correctamente.
            </div>
          )}

          {result
            .errorDetails
            .length >
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
              {result
                .errorDetails
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.team}:${item.player}:${index}`}
                      className="
                        border-b
                        border-red-900/40
                        p-4

                        last:border-b-0
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
          )}
        </>
      )}

      {error && (
        <div
          className="
            mt-5
            rounded-lg
            border
            border-red-900
            bg-red-950/40
            p-4
          "
        >
          <div
            className="
              font-bold
              text-red-400
            "
          >
            Error
          </div>

          <code
            className="
              mt-2
              block
              break-words
              text-sm
              text-red-300
            "
          >
            {error}
          </code>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TARJETA
========================================================= */

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