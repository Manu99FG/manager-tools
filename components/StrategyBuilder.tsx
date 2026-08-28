"use client";

import { useMemo, useState } from "react";

/* =========================================================
   TIPOS
========================================================= */

export type StrategyTactic =
  | "A"
  | "C"
  | "D"
  | "E"
  | "L"
  | "N"
  | "P";

type Comparator =
  | ""
  | "="
  | "<="
  | ">=";

export type Strategy = {
  id: number;

  tactic: StrategyTactic;

  minuteOperator: Comparator;
  minuteValue: string;

  scoreOperator: Comparator;
  scoreValue: string;

  yellowCard: string;

  redCard: string;

  injury: string;
};

/* =========================================================
   OPCIONES
========================================================= */

const TACTICS: StrategyTactic[] = [
  "A",
  "C",
  "D",
  "E",
  "L",
  "N",
  "P",
];

const COMPARATORS: Comparator[] = [
  "",
  "=",
  "<=",
  ">=",
];

const POSITIONS = [
  "GK",
  "DF",
  "DM",
  "MF",
  "AM",
  "FW",
];

/*
 * Para tarjeta / lesión:
 *
 * GK
 * DF
 * DM
 * MF
 * AM
 * FW
 *
 * OGK
 * ODF
 * ODM
 * OMF
 * OAM
 * OFW
 *
 * 1 ... 16
 */
const EVENT_OPTIONS = [
  ...POSITIONS,

  ...POSITIONS.map(
    (position) =>
      `O${position}`
  ),

  ...Array.from(
    { length: 16 },
    (_, index) =>
      String(index + 1)
  ),
];

/* =========================================================
   PROPS
========================================================= */

type Props = {
  strategies: Strategy[];

  onChange: (
    strategies: Strategy[]
  ) => void;
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function StrategyBuilder({
  strategies,
  onChange,
}: Props) {
  const [
    tactic,
    setTactic,
  ] =
    useState<StrategyTactic>(
      "N"
    );

  const [
    minuteOperator,
    setMinuteOperator,
  ] =
    useState<Comparator>("");

  const [
    minuteValue,
    setMinuteValue,
  ] = useState("");

  const [
    scoreOperator,
    setScoreOperator,
  ] =
    useState<Comparator>("");

  const [
    scoreValue,
    setScoreValue,
  ] = useState("");

  const [
    yellowCard,
    setYellowCard,
  ] = useState("");

  const [
    redCard,
    setRedCard,
  ] = useState("");

  const [
    injury,
    setInjury,
  ] = useState("");

  /* =======================================================
     VALIDACIONES DE CONDICIONES
  ======================================================= */

  const minuteComplete =
    Boolean(
      minuteOperator &&
        minuteValue
    );

  const scoreComplete =
    Boolean(
      scoreOperator &&
        scoreValue
    );

  const yellowComplete =
    Boolean(yellowCard);

  const redComplete =
    Boolean(redCard);

  const injuryComplete =
    Boolean(injury);

  /*
   * Si alguien elige operador pero
   * no valor, la condición está
   * incompleta.
   */
  const minuteIncomplete =
    Boolean(
      minuteOperator &&
        !minuteValue
    ) ||
    Boolean(
      !minuteOperator &&
        minuteValue
    );

  const scoreIncomplete =
    Boolean(
      scoreOperator &&
        !scoreValue
    ) ||
    Boolean(
      !scoreOperator &&
        scoreValue
    );

  /*
   * Necesitamos como mínimo
   * UNA condición SI completa.
   */
  const hasCompleteCondition =
    minuteComplete ||
    scoreComplete ||
    yellowComplete ||
    redComplete ||
    injuryComplete;

  const canAdd =
    hasCompleteCondition &&
    !minuteIncomplete &&
    !scoreIncomplete;

  /* =======================================================
     MINUTOS
  ======================================================= */

  const minuteOptions =
    useMemo(
      () =>
        Array.from(
          { length: 99 },
          (_, index) =>
            index + 1
        ),
      []
    );

  /* =======================================================
     MARCADOR
  ======================================================= */

  const scoreOptions =
    useMemo(
      () =>
        Array.from(
          { length: 11 },
          (_, index) =>
            index - 5
        ),
      []
    );

  /* =======================================================
     AÑADIR ESTRATEGIA
  ======================================================= */

  function addStrategy() {
    if (!canAdd) {
      return;
    }

    const strategy: Strategy = {
      id: Date.now(),

      tactic,

      minuteOperator,
      minuteValue,

      scoreOperator,
      scoreValue,

      yellowCard,
      redCard,
      injury,
    };

    onChange([
      ...strategies,
      strategy,
    ]);

    /*
     * Después de guardar,
     * mantenemos la táctica
     * pero limpiamos condiciones.
     */
    setMinuteOperator("");
    setMinuteValue("");

    setScoreOperator("");
    setScoreValue("");

    setYellowCard("");
    setRedCard("");
    setInjury("");
  }

  /* =======================================================
     ELIMINAR
  ======================================================= */

  function removeStrategy(
    id: number
  ) {
    onChange(
      strategies.filter(
        (strategy) =>
          strategy.id !== id
      )
    );
  }

  /* =======================================================
     TEXTO DE ESTRATEGIA
  ======================================================= */

  function getStrategyLabel(
    strategy: Strategy
  ) {
    const conditions: string[] =
      [];

    if (
      strategy.minuteOperator &&
      strategy.minuteValue
    ) {
      conditions.push(
        `Min ${strategy.minuteOperator} ${strategy.minuteValue}`
      );
    }

    if (
      strategy.scoreOperator &&
      strategy.scoreValue
    ) {
      conditions.push(
        `Marcador ${strategy.scoreOperator} ${Number(
          strategy.scoreValue
        ) > 0
          ? `+${strategy.scoreValue}`
          : strategy.scoreValue}`
      );
    }

    if (strategy.yellowCard) {
      conditions.push(
        `Amarilla ${strategy.yellowCard}`
      );
    }

    if (strategy.redCard) {
      conditions.push(
        `Roja ${strategy.redCard}`
      );
    }

    if (strategy.injury) {
      conditions.push(
        `Lesión ${strategy.injury}`
      );
    }

    return `Táctica ${
      strategy.tactic
    } si ${conditions.join(
      " y "
    )}`;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="w-full">
      {/* CABECERA */}

      <div
        className="
          border-b-2
          border-blue-500
          pb-3
        "
      >
        <h2
          className="
            text-xl
            font-bold
            text-blue-400
          "
        >
          Cambio de táctica
        </h2>
      </div>

      {/* FORMULARIO */}

      <div
        className="
          mt-5
          space-y-3
        "
      >
        {/* CAMBIAR TÁCTICA */}

        <div
          className="
            grid
            grid-cols-1
            gap-2

            sm:grid-cols-[260px_minmax(0,1fr)]
            sm:items-center
          "
        >
          <label
            className="
              text-sm
              font-medium
              text-white
            "
          >
            Cambiar táctica a:
          </label>

          <select
            value={tactic}
            onChange={(event) =>
              setTactic(
                event.target
                  .value as StrategyTactic
              )
            }
            className="
              h-10
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
              outline-none
              focus:border-blue-500
            "
          >
            {TACTICS.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>
        </div>

        {/* SI MINUTO */}

        <div
          className="
            grid
            grid-cols-1
            gap-2

            sm:grid-cols-[170px_180px_minmax(120px,1fr)]
            sm:items-center
          "
        >
          <label className="text-sm text-white">
            Si minuto:
          </label>

          <select
            value={
              minuteOperator
            }
            onChange={(event) =>
              setMinuteOperator(
                event.target
                  .value as Comparator
              )
            }
            className="
              h-10
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
            "
          >
            <option value="">
              Sin filtro
            </option>

            <option value="=">
              =
            </option>

            <option value="<=">
              &lt;=
            </option>

            <option value=">=">
              &gt;=
            </option>
          </select>

          <select
            value={minuteValue}
            onChange={(event) =>
              setMinuteValue(
                event.target
                  .value
              )
            }
            className="
              h-10
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
            "
          >
            <option value="">
              -
            </option>

            {minuteOptions.map(
              (minute) => (
                <option
                  key={minute}
                  value={minute}
                >
                  {minute}
                </option>
              )
            )}
          </select>
        </div>

        {/* SI MARCADOR */}

        <div
          className="
            grid
            grid-cols-1
            gap-2

            sm:grid-cols-[170px_180px_minmax(120px,1fr)]
            sm:items-center
          "
        >
          <label className="text-sm text-white">
            Si marcador:
          </label>

          <select
            value={
              scoreOperator
            }
            onChange={(event) =>
              setScoreOperator(
                event.target
                  .value as Comparator
              )
            }
            className="
              h-10
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
            "
          >
            <option value="">
              Sin filtro
            </option>

            <option value="=">
              =
            </option>

            <option value="<=">
              &lt;=
            </option>

            <option value=">=">
              &gt;=
            </option>
          </select>

          <select
            value={scoreValue}
            onChange={(event) =>
              setScoreValue(
                event.target
                  .value
              )
            }
            className="
              h-10
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
            "
          >
            <option value="">
              -
            </option>

            {scoreOptions.map(
              (score) => (
                <option
                  key={score}
                  value={score}
                >
                  {score > 0
                    ? `+${score}`
                    : score}
                </option>
              )
            )}
          </select>
        </div>

        {/* AMARILLA */}

        <div
          className="
            grid
            grid-cols-1
            gap-2

            sm:grid-cols-[260px_minmax(0,1fr)]
            sm:items-center
          "
        >
          <label className="text-sm text-white">
            Si cartulina amarilla:
          </label>

          <select
            value={yellowCard}
            onChange={(event) =>
              setYellowCard(
                event.target
                  .value
              )
            }
            className="
              h-10
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
            "
          >
            <option value="">
              -
            </option>

            {EVENT_OPTIONS.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              )
            )}
          </select>
        </div>

        {/* ROJA */}

        <div
          className="
            grid
            grid-cols-1
            gap-2

            sm:grid-cols-[260px_minmax(0,1fr)]
            sm:items-center
          "
        >
          <label className="text-sm text-white">
            Si cartulina roja:
          </label>

          <select
            value={redCard}
            onChange={(event) =>
              setRedCard(
                event.target
                  .value
              )
            }
            className="
              h-10
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
            "
          >
            <option value="">
              -
            </option>

            {EVENT_OPTIONS.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              )
            )}
          </select>
        </div>

        {/* LESIÓN */}

        <div
          className="
            grid
            grid-cols-1
            gap-2

            sm:grid-cols-[260px_minmax(0,1fr)]
            sm:items-center
          "
        >
          <label className="text-sm text-white">
            Si lesión:
          </label>

          <select
            value={injury}
            onChange={(event) =>
              setInjury(
                event.target
                  .value
              )
            }
            className="
              h-10
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
            "
          >
            <option value="">
              -
            </option>

            {EVENT_OPTIONS.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              )
            )}
          </select>
        </div>

        {/* AGREGAR */}

        <button
          type="button"
          onClick={addStrategy}
          disabled={!canAdd}
          className="
            mt-3
            w-full
            rounded-md
            bg-emerald-500
            px-4
            py-3
            text-sm
            font-bold
            text-white
            transition

            hover:bg-emerald-400

            disabled:cursor-not-allowed
            disabled:bg-emerald-900
            disabled:text-slate-500
          "
        >
          Agregar Estrategia
        </button>

        {!hasCompleteCondition && (
          <p
            className="
              text-center
              text-xs
              text-slate-600
            "
          >
            Completa al menos una condición SI.
          </p>
        )}
      </div>

      {/* ESTRATEGIAS GUARDADAS */}

      {strategies.length > 0 && (
        <div
          className="
            mt-8
            space-y-2
          "
        >
          <h3
            className="
              mb-3
              text-sm
              font-bold
              uppercase
              tracking-wide
              text-slate-500
            "
          >
            Estrategias
          </h3>

          {strategies.map(
            (strategy) => (
              <div
                key={strategy.id}
                className="
                  flex
                  items-center
                  gap-3
                  rounded-md
                  border
                  border-slate-800
                  bg-slate-900
                  px-4
                  py-3
                "
              >
                <span
                  className="
                    min-w-0
                    flex-1
                    text-sm
                    text-white
                  "
                >
                  {getStrategyLabel(
                    strategy
                  )}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    removeStrategy(
                      strategy.id
                    )
                  }
                  title="Eliminar estrategia"
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                    text-lg
                    font-bold
                    text-white
                    transition
                    hover:bg-red-400
                  "
                >
                  ×
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}