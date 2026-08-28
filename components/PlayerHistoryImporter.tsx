"use client";

import { useState } from "react";

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
  errorDetails: ImportError[];
};

type ImportResponse = {
  ok?: boolean;

  result?: ImportResult;

  error?:
    | string
    | {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
};

function formatServerError(
  error: ImportResponse["error"]
): string {
  if (!error) {
    return "Error desconocido";
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  const parts: string[] = [];

  if (error.message) {
    parts.push(
      error.message
    );
  }

  if (error.details) {
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

  if (parts.length > 0) {
    return parts.join(
      " | "
    );
  }

  try {
    return JSON.stringify(
      error
    );
  } catch {
    return "Error desconocido";
  }
}

export default function PlayerHistoryImporter() {
  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState<ImportResult | null>(
      null
    );

  const [error, setError] =
    useState("");

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

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const rawResponse =
        await response.text();

      let data: ImportResponse;

      try {
        data =
          JSON.parse(
            rawResponse
          ) as ImportResponse;
      } catch {
        throw new Error(
          `El servidor devolvió una respuesta no válida (${response.status}): ${rawResponse.slice(
            0,
            1000
          )}`
        );
      }

      if (!response.ok) {
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

      if (!data.result) {
        throw new Error(
          "El servidor no devolvió el resultado de la importación."
        );
      }

      setResult(
        data.result
      );
    } catch (
      caughtError
    ) {
      console.error(
        caughtError
      );

      setError(
        caughtError instanceof Error
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
                h-4
                w-4
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
                  font-semibold
                  text-blue-300
                "
              >
                Actualizando historial...
              </div>

              <div
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Leyendo plantillas y comparando jugadores.
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
                {result
                  .errorDetails
                  .map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={`${item.team}:${item.player}:${index}`}
                        className="p-4"
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
              whitespace-pre-wrap
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