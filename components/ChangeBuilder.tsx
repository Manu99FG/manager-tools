"use client";

import {
  useMemo,
  useState,
} from "react";

/* =========================================================
   TIPOS
========================================================= */

export type ChangeActionType =
  | "SUB"
  | "TACTIC"
  | "CHANGEPOS"
  | "CHANGEAGG";

export type ChangeConditionType =
  | "MIN"
  | "SCORE"
  | "SHOTS"
  | "RED"
  | "YELLOW"
  | "INJURED";

export type Comparator =
  | "="
  | ">="
  | "<=";

export type EsmsPosition =
  | "GK"
  | "DF"
  | "DM"
  | "MF"
  | "AM"
  | "FW";

export type TacticalStyle =
  | "N"
  | "A"
  | "D"
  | "C"
  | "L"
  | "P"
  | "E";

export type ChangeCondition = {
  id: number;

  type: ChangeConditionType;

  operator: Comparator;

  value: string;
};

export type EsmsChange = {
  id: number;

  actionType: ChangeActionType;

  /* SUB */
  subOut: string;
  subIn: string;
  subPosition: EsmsPosition;

  /* TACTIC */
  tactic: TacticalStyle;

  /* CHANGEPOS */
  changePosPlayer: string;
  changePosPosition: EsmsPosition;

  /* CHANGEAGG */
  aggression: string;

  /* IF */
  conditions: ChangeCondition[];
};

/* =========================================================
   PROPS
========================================================= */

type Props = {
  changes: EsmsChange[];

  onChange: (
    changes: EsmsChange[]
  ) => void;
};

/* =========================================================
   CONSTANTES
========================================================= */

const ACTION_TYPES: ChangeActionType[] = [
  "SUB",
  "TACTIC",
  "CHANGEPOS",
  "CHANGEAGG",
];

const POSITIONS: EsmsPosition[] = [
  "GK",
  "DF",
  "DM",
  "MF",
  "AM",
  "FW",
];

const TACTICS: TacticalStyle[] = [
  "N",
  "A",
  "D",
  "C",
  "L",
  "P",
  "E",
];

const COMPARATORS: Comparator[] = [
  "=",
  ">=",
  "<=",
];

const CONDITION_TYPES: ChangeConditionType[] = [
  "MIN",
  "SCORE",
  "SHOTS",
  "RED",
  "YELLOW",
  "INJURED",
];

/* =========================================================
   REFERENCIAS DE POSICIÓN / DORSAL
========================================================= */

const POSITION_REFERENCES = [
  ...POSITIONS,

  ...POSITIONS.map(
    (position) =>
      `O${position}`
  ),

  "OPL",
];

const PLAYER_NUMBERS =
  Array.from(
    { length: 16 },
    (_, index) =>
      String(index + 1)
  );

const POSITION_OR_NUMBER_REFERENCES = [
  ...POSITIONS,
  ...PLAYER_NUMBERS,
];

const EVENT_REFERENCES = [
  ...POSITION_REFERENCES,
  ...PLAYER_NUMBERS,
];

/* =========================================================
   COMPONENTE
========================================================= */

export default function ChangeBuilder({
  changes,
  onChange,
}: Props) {
  /* =======================================================
     ACCIÓN
  ======================================================= */

  const [
    actionType,
    setActionType,
  ] =
    useState<ChangeActionType>(
      "TACTIC"
    );

  /* =======================================================
     SUB
  ======================================================= */

  const [
    subOut,
    setSubOut,
  ] = useState("");

  const [
    subIn,
    setSubIn,
  ] = useState("");

  const [
    subPosition,
    setSubPosition,
  ] =
    useState<EsmsPosition>(
      "MF"
    );

  /* =======================================================
     TACTIC
  ======================================================= */

  const [
    tactic,
    setTactic,
  ] =
    useState<TacticalStyle>(
      "N"
    );

  /* =======================================================
     CHANGEPOS
  ======================================================= */

  const [
    changePosPlayer,
    setChangePosPlayer,
  ] = useState("");

  const [
    changePosPosition,
    setChangePosPosition,
  ] =
    useState<EsmsPosition>(
      "MF"
    );

  /* =======================================================
     CHANGEAGG
  ======================================================= */

  const [
    aggression,
    setAggression,
  ] = useState("");

  /* =======================================================
     CONDICIONES
  ======================================================= */

  const [
    conditions,
    setConditions,
  ] = useState<
    ChangeCondition[]
  >([]);

  const [
    nextConditionId,
    setNextConditionId,
  ] = useState(1);

  /* =======================================================
     OPCIONES NUMÉRICAS
  ======================================================= */

  const minuteOptions =
    useMemo(
      () =>
        Array.from(
          { length: 99 },
          (_, index) =>
            String(index + 1)
        ),
      []
    );

  const scoreOptions =
    useMemo(
      () =>
        Array.from(
          { length: 11 },
          (_, index) =>
            String(index - 5)
        ),
      []
    );

  const shotsOptions =
    useMemo(
      () =>
        Array.from(
          { length: 21 },
          (_, index) =>
            String(index - 10)
        ),
      []
    );

  const aggressionOptions =
    useMemo(
      () =>
        Array.from(
          { length: 20 },
          (_, index) =>
            String(index + 1)
        ),
      []
    );

  /* =======================================================
     AÑADIR CONDICIÓN
  ======================================================= */

  function addCondition() {
    setConditions(
      (current) => [
        ...current,
        {
          id: nextConditionId,
          type: "MIN",
          operator: ">=",
          value: "",
        },
      ]
    );

    setNextConditionId(
      (current) =>
        current + 1
    );
  }

  /* =======================================================
     ELIMINAR CONDICIÓN
  ======================================================= */

  function removeCondition(
    id: number
  ) {
    setConditions(
      (current) =>
        current.filter(
          (condition) =>
            condition.id !== id
        )
    );
  }

  /* =======================================================
     CAMBIAR TIPO
  ======================================================= */

  function updateConditionType(
    id: number,
    type: ChangeConditionType
  ) {
    setConditions(
      (current) =>
        current.map(
          (condition) =>
            condition.id === id
              ? {
                  ...condition,
                  type,
                  operator: ">=",
                  value: "",
                }
              : condition
        )
    );
  }

  /* =======================================================
     CAMBIAR OPERADOR
  ======================================================= */

  function updateConditionOperator(
    id: number,
    operator: Comparator
  ) {
    setConditions(
      (current) =>
        current.map(
          (condition) =>
            condition.id === id
              ? {
                  ...condition,
                  operator,
                }
              : condition
        )
    );
  }

  /* =======================================================
     CAMBIAR VALOR
  ======================================================= */

  function updateConditionValue(
    id: number,
    value: string
  ) {
    setConditions(
      (current) =>
        current.map(
          (condition) =>
            condition.id === id
              ? {
                  ...condition,
                  value,
                }
              : condition
        )
    );
  }

  /* =======================================================
     VALIDAR CONDICIÓN
  ======================================================= */

  function isConditionComplete(
    condition: ChangeCondition
  ) {
    return Boolean(
      condition.value
    );
  }

  const conditionsComplete =
    conditions.length > 0 &&
    conditions.every(
      isConditionComplete
    );

  /* =======================================================
     VALIDAR ACCIÓN
  ======================================================= */

  const actionComplete =
    useMemo(() => {
      switch (actionType) {
        case "SUB":
          return Boolean(
            subOut &&
              subIn &&
              subPosition
          );

        case "TACTIC":
          return Boolean(
            tactic
          );

        case "CHANGEPOS":
          return Boolean(
            changePosPlayer &&
              changePosPosition
          );

        case "CHANGEAGG":
          return Boolean(
            aggression
          );

        default:
          return false;
      }
    }, [
      actionType,
      subOut,
      subIn,
      subPosition,
      tactic,
      changePosPlayer,
      changePosPosition,
      aggression,
    ]);

  const canAdd =
    actionComplete &&
    conditionsComplete;

  /* =======================================================
     CREAR OBJETO
  ======================================================= */

  function addChange() {
    if (!canAdd) {
      return;
    }

    const change: EsmsChange = {
      id: Date.now(),

      actionType,

      subOut,
      subIn,
      subPosition,

      tactic,

      changePosPlayer,
      changePosPosition,

      aggression,

      conditions:
        conditions.map(
          (condition) => ({
            ...condition,
          })
        ),
    };

    onChange([
      ...changes,
      change,
    ]);

    /*
     * Limpiamos únicamente
     * los datos de la acción
     * y las condiciones.
     */

    setSubOut("");
    setSubIn("");
    setSubPosition("MF");

    setTactic("N");

    setChangePosPlayer("");
    setChangePosPosition(
      "MF"
    );

    setAggression("");

    setConditions([]);
  }

  /* =======================================================
     BORRAR CAMBIO
  ======================================================= */

  function removeChange(
    id: number
  ) {
    onChange(
      changes.filter(
        (change) =>
          change.id !== id
      )
    );
  }

  /* =======================================================
     CONDICIÓN A TEXTO ESMS
  ======================================================= */

  function conditionToText(
    condition: ChangeCondition
  ) {
    switch (condition.type) {
      case "MIN":
      case "SCORE":
      case "SHOTS":
        return `${condition.type} ${condition.operator} ${condition.value}`;

      case "RED":
      case "YELLOW":
      case "INJURED":
        return `${condition.type} ${condition.value}`;

      default:
        return "";
    }
  }

  /* =======================================================
     CAMBIO A TEXTO ESMS
  ======================================================= */

  function changeToText(
    change: EsmsChange
  ) {
    let action = "";

    switch (
      change.actionType
    ) {
      case "SUB":
        action =
          `SUB ${change.subOut} ${change.subIn} ${change.subPosition}`;
        break;

      case "TACTIC":
        action =
          `TACTIC ${change.tactic}`;
        break;

      case "CHANGEPOS":
        action =
          `CHANGEPOS ${change.changePosPlayer} ${change.changePosPosition}`;
        break;

      case "CHANGEAGG":
        action =
          `CHANGEAGG ${change.aggression}`;
        break;
    }

    const conditionText =
      change.conditions
        .map(
          conditionToText
        )
        .join(" ");

    return `${action} IF ${conditionText}`;
  }

  /* =======================================================
     SELECTOR VALOR CONDICIÓN
  ======================================================= */

  function renderConditionValue(
    condition: ChangeCondition
  ) {
    if (
      condition.type ===
      "MIN"
    ) {
      return (
        <select
          value={
            condition.value
          }
          onChange={(event) =>
            updateConditionValue(
              condition.id,
              event.target
                .value
            )
          }
          className="
            h-10
            min-w-0
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
      );
    }

    if (
      condition.type ===
      "SCORE"
    ) {
      return (
        <select
          value={
            condition.value
          }
          onChange={(event) =>
            updateConditionValue(
              condition.id,
              event.target
                .value
            )
          }
          className="
            h-10
            min-w-0
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
            (value) => (
              <option
                key={value}
                value={value}
              >
                {Number(value) > 0
                  ? `+${value}`
                  : value}
              </option>
            )
          )}
        </select>
      );
    }

    if (
      condition.type ===
      "SHOTS"
    ) {
      return (
        <select
          value={
            condition.value
          }
          onChange={(event) =>
            updateConditionValue(
              condition.id,
              event.target
                .value
            )
          }
          className="
            h-10
            min-w-0
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

          {shotsOptions.map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {Number(value) > 0
                  ? `+${value}`
                  : value}
              </option>
            )
          )}
        </select>
      );
    }

    return (
      <select
        value={
          condition.value
        }
        onChange={(event) =>
          updateConditionValue(
            condition.id,
            event.target
              .value
          )
        }
        className="
          h-10
          min-w-0
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

        {EVENT_REFERENCES.map(
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
    );
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
          Cambios
        </h2>
      </div>

      {/* ===================================================
          TIPO DE CAMBIO
      =================================================== */}

      <div className="mt-5">
        <label
          className="
            mb-2
            block
            text-sm
            font-medium
            text-white
          "
        >
          Tipo de cambio
        </label>

        <select
          value={
            actionType
          }
          onChange={(event) =>
            setActionType(
              event.target
                .value as ChangeActionType
            )
          }
          className="
            h-10
            w-full
            rounded-md
            border
            border-slate-700
            bg-slate-800
            px-3
            text-sm
            font-bold
            text-white
            outline-none
            focus:border-blue-500
          "
        >
          {ACTION_TYPES.map(
            (type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            )
          )}
        </select>
      </div>

      {/* ===================================================
          SUB
      =================================================== */}

      {actionType ===
        "SUB" && (
        <div
          className="
            mt-4
            grid
            grid-cols-1
            gap-3
            rounded-lg
            border
            border-slate-800
            bg-slate-900/60
            p-4

            sm:grid-cols-3
          "
        >
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Sale
            </label>

            <select
              value={subOut}
              onChange={(event) =>
                setSubOut(
                  event.target
                    .value
                )
              }
              className="
                h-10
                w-full
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

              {POSITION_OR_NUMBER_REFERENCES.map(
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

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Entra
            </label>

            <select
              value={subIn}
              onChange={(event) =>
                setSubIn(
                  event.target
                    .value
                )
              }
              className="
                h-10
                w-full
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

              {PLAYER_NUMBERS.map(
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

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Posición
            </label>

            <select
              value={
                subPosition
              }
              onChange={(event) =>
                setSubPosition(
                  event.target
                    .value as EsmsPosition
                )
              }
              className="
                h-10
                w-full
                rounded-md
                border
                border-slate-700
                bg-slate-800
                px-3
                text-sm
                text-white
              "
            >
              {POSITIONS.map(
                (position) => (
                  <option
                    key={
                      position
                    }
                    value={
                      position
                    }
                  >
                    {
                      position
                    }
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      )}

      {/* ===================================================
          TACTIC
      =================================================== */}

      {actionType ===
        "TACTIC" && (
        <div
          className="
            mt-4
            rounded-lg
            border
            border-slate-800
            bg-slate-900/60
            p-4
          "
        >
          <label className="mb-1 block text-xs text-slate-400">
            Cambiar táctica a
          </label>

          <select
            value={tactic}
            onChange={(event) =>
              setTactic(
                event.target
                  .value as TacticalStyle
              )
            }
            className="
              h-10
              w-full
              rounded-md
              border
              border-slate-700
              bg-slate-800
              px-3
              text-sm
              text-white
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
      )}

      {/* ===================================================
          CHANGEPOS
      =================================================== */}

      {actionType ===
        "CHANGEPOS" && (
        <div
          className="
            mt-4
            grid
            grid-cols-1
            gap-3
            rounded-lg
            border
            border-slate-800
            bg-slate-900/60
            p-4

            sm:grid-cols-2
          "
        >
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Dorsal
            </label>

            <select
              value={
                changePosPlayer
              }
              onChange={(event) =>
                setChangePosPlayer(
                  event.target
                    .value
                )
              }
              className="
                h-10
                w-full
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

              {PLAYER_NUMBERS.map(
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

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Nueva posición
            </label>

            <select
              value={
                changePosPosition
              }
              onChange={(event) =>
                setChangePosPosition(
                  event.target
                    .value as EsmsPosition
                )
              }
              className="
                h-10
                w-full
                rounded-md
                border
                border-slate-700
                bg-slate-800
                px-3
                text-sm
                text-white
              "
            >
              {POSITIONS.map(
                (position) => (
                  <option
                    key={
                      position
                    }
                    value={
                      position
                    }
                  >
                    {
                      position
                    }
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      )}

      {/* ===================================================
          CHANGEAGG
      =================================================== */}

      {actionType ===
        "CHANGEAGG" && (
        <div
          className="
            mt-4
            rounded-lg
            border
            border-slate-800
            bg-slate-900/60
            p-4
          "
        >
          <label className="mb-1 block text-xs text-slate-400">
            Nueva agresividad
          </label>

          <select
            value={
              aggression
            }
            onChange={(event) =>
              setAggression(
                event.target
                  .value
              )
            }
            className="
              h-10
              w-full
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

            {aggressionOptions.map(
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
      )}

      {/* ===================================================
          CONDICIONES
      =================================================== */}

      <div className="mt-6">
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-slate-800
            pb-2
          "
        >
          <h3
            className="
              text-sm
              font-bold
              text-white
            "
          >
            Condiciones IF
          </h3>

          <button
            type="button"
            onClick={
              addCondition
            }
            className="
              rounded-md
              bg-blue-500
              px-3
              py-1.5
              text-xs
              font-bold
              text-white
              transition
              hover:bg-blue-400
            "
          >
            + Condición
          </button>
        </div>

        {/* SIN CONDICIONES */}

        {conditions.length ===
          0 && (
          <div
            className="
              py-6
              text-center
              text-xs
              text-slate-600
            "
          >
            Debes añadir al menos una condición.
          </div>
        )}

        {/* FILAS */}

        <div
          className="
            mt-3
            space-y-2
          "
        >
          {conditions.map(
            (condition) => {
              const numericCondition =
                condition.type ===
                  "MIN" ||
                condition.type ===
                  "SCORE" ||
                condition.type ===
                  "SHOTS";

              return (
                <div
                  key={
                    condition.id
                  }
                  className="
                    grid
                    grid-cols-1
                    gap-2
                    rounded-lg
                    border
                    border-slate-800
                    bg-slate-900
                    p-3

                    sm:grid-cols-[130px_90px_minmax(0,1fr)_40px]
                    sm:items-center
                  "
                >
                  {/* TIPO */}

                  <select
                    value={
                      condition.type
                    }
                    onChange={(
                      event
                    ) =>
                      updateConditionType(
                        condition.id,
                        event.target
                          .value as ChangeConditionType
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
                    {CONDITION_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>

                  {/* OPERADOR */}

                  {numericCondition ? (
                    <select
                      value={
                        condition.operator
                      }
                      onChange={(
                        event
                      ) =>
                        updateConditionOperator(
                          condition.id,
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
                      {COMPARATORS.map(
                        (
                          operator
                        ) => (
                          <option
                            key={
                              operator
                            }
                            value={
                              operator
                            }
                          >
                            {
                              operator
                            }
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <div
                      className="
                        hidden
                        h-10

                        sm:block
                      "
                    />
                  )}

                  {/* VALOR */}

                  {renderConditionValue(
                    condition
                  )}

                  {/* BORRAR */}

                  <button
                    type="button"
                    onClick={() =>
                      removeCondition(
                        condition.id
                      )
                    }
                    title="Eliminar condición"
                    className="
                      flex
                      h-10
                      w-full
                      items-center
                      justify-center
                      rounded-md
                      bg-red-500
                      text-xl
                      font-bold
                      text-white
                      transition
                      hover:bg-red-400

                      sm:w-10
                    "
                  >
                    ×
                  </button>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* ===================================================
          AGREGAR
      =================================================== */}

      <button
        type="button"
        onClick={addChange}
        disabled={!canAdd}
        className="
          mt-5
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
          disabled:bg-emerald-950
          disabled:text-slate-600
        "
      >
        Agregar Cambio
      </button>

      {/* ===================================================
          CAMBIOS GUARDADOS
      =================================================== */}

      {changes.length >
        0 && (
        <div className="mt-8">
          <h3
            className="
              mb-3
              border-b
              border-slate-800
              pb-2
              text-sm
              font-bold
              text-slate-400
            "
          >
            Cambios guardados
          </h3>

          <div className="space-y-2">
            {changes.map(
              (change) => (
                <div
                  key={
                    change.id
                  }
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
                  <code
                    className="
                      min-w-0
                      flex-1
                      whitespace-normal
                      break-words
                      text-xs
                      font-semibold
                      text-white

                      sm:text-sm
                    "
                  >
                    {changeToText(
                      change
                    )}
                  </code>

                  <button
                    type="button"
                    onClick={() =>
                      removeChange(
                        change.id
                      )
                    }
                    title="Eliminar cambio"
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
        </div>
      )}
    </div>
  );
}