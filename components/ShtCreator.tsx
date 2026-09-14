"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  GlobalEsmsPlayer,
} from "@/lib/all-players";

import {
  getPlayerProfile,
  getTieFallbackPosition,
  hasMainRatingTie,
  type EsmsPosition,
} from "@/lib/esms-player";

import FootballPitch from "@/components/FootballPitch";

import BenchSelector, {
  type BenchSlot,
} from "@/components/BenchSelector";

import type { StrategyTactic } from "@/components/StrategyBuilder";

import ChangeBuilder, {
  type ChangeCondition,
  type ChangeConditionType,
  type Comparator,
  type EsmsChange,
  type EsmsPosition as ChangeEsmsPosition,
  type TacticalStyle as ChangeTacticalStyle,
} from "@/components/ChangeBuilder";

import PlayerNameLink from "@/components/PlayerNameLink";

import {
  validateOriginalTeamsheet,
  type OriginalOrder,
  type OriginalPredicate,
  type OriginalRosterPlayer,
  type OriginalSelection,
} from "@/lib/original-sht-checker";

/* =========================================================
   TIPOS
========================================================= */

type AssignedPosition =
  | ""
  | "GK"
  | "DF"
  | "DM"
  | "MF"
  | "AM"
  | "FW";

type CreatorTab =
  | "starters"
  | "subs"
  | "changes";

type TacticalStyle = StrategyTactic;

type ImportStatus = {
  type: "success" | "error";
  title: string;
  detail: string;
};

type Props = {
  players: GlobalEsmsPlayer[];
};

/* =========================================================
   CONSTANTES
========================================================= */

const ASSIGNED_POSITIONS: {
  value: AssignedPosition;
  label: string;
}[] = [
  {
    value: "",
    label: "-",
  },
  {
    value: "GK",
    label: "GK",
  },
  {
    value: "DF",
    label: "DF",
  },
  {
    value: "DM",
    label: "DM",
  },
  {
    value: "MF",
    label: "MF",
  },
  {
    value: "AM",
    label: "AM",
  },
  {
    value: "FW",
    label: "FW",
  },
];

const TACTICS: {
  value: TacticalStyle;
  label: string;
}[] = [
  {
    value: "N",
    label: "N - Normal",
  },
  {
    value: "A",
    label: "A - Ataque",
  },
  {
    value: "D",
    label: "D - Defensa",
  },
  {
    value: "C",
    label: "C - Contraataque",
  },
  {
    value: "L",
    label: "L - Juego largo",
  },
  {
    value: "P",
    label: "P - Pases",
  },
  {
    value: "E",
    label: "E - Europea",
  },
];

const POSITION_ORDER: Record<
  EsmsPosition,
  number
> = {
  GK: 0,
  DF: 1,
  DM: 2,
  MF: 3,
  AM: 4,
  FW: 5,
};

/* =========================================================
   HELPERS
========================================================= */

function getPlayerKey(
  player: GlobalEsmsPlayer
) {
  return `${player.teamCode}:${player.name}`;
}

function normalizeSheetName(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleUpperCase("es-ES");
}

function normalizeCompactName(
  value: string
) {
  return normalizeSheetName(
    value
  ).replace(/\s+/g, "");
}

function findSheetPlayer(
  roster: GlobalEsmsPlayer[],
  playerName: string
) {
  const compactName =
    normalizeCompactName(
      playerName
    );

  return roster.find(
    (player) =>
      normalizeCompactName(
        player.name
      ) === compactName ||
      normalizeSheetName(
        player.name
      ) ===
        normalizeSheetName(
          playerName
        )
  );
}

function toAssignedPosition(
  value: string
): AssignedPosition {
  const position =
    value
      .trim()
      .toUpperCase();

  if (
    position === "GK" ||
    position === "DF" ||
    position === "DM" ||
    position === "MF" ||
    position === "AM" ||
    position === "FW"
  ) {
    return position;
  }

  return "";
}

function toTacticalStyle(
  value: string
): TacticalStyle {
  const tactic =
    value
      .trim()
      .toUpperCase();

  if (
    tactic === "A" ||
    tactic === "C" ||
    tactic === "D" ||
    tactic === "E" ||
    tactic === "L" ||
    tactic === "N" ||
    tactic === "P"
  ) {
    return tactic;
  }

  return "N";
}

function hasNumericPredicate(
  predicate: OriginalPredicate
): predicate is Extract<
  OriginalPredicate,
  { operator: string }
> {
  return "operator" in predicate;
}

function hasPositionPredicate(
  predicate: OriginalPredicate
): predicate is Extract<
  OriginalPredicate,
  { position: string }
> {
  return "position" in predicate;
}

function predicateToChangeCondition(
  predicate: OriginalPredicate,
  index: number
): ChangeCondition | null {
  const kind =
    predicate.kind.toUpperCase();

  if (
    hasNumericPredicate(
      predicate
    )
  ) {
    if (
      predicate.operator !== "=" &&
      predicate.operator !== ">=" &&
      predicate.operator !== "<="
    ) {
      return null;
    }

    if (
      kind !== "MIN" &&
      kind !== "SCORE" &&
      kind !== "SHOTS"
    ) {
      return null;
    }

    return {
      id: index,
      type:
        kind as ChangeConditionType,
      operator:
        predicate.operator as Comparator,
      value:
        predicate.rawValue ||
        String(predicate.value),
    };
  }

  if (
    hasPositionPredicate(
      predicate
    )
  ) {
    const normalizedKind =
      kind === "INJURY"
        ? "INJURED"
        : kind;

    if (
      normalizedKind !== "RED" &&
      normalizedKind !== "YELLOW" &&
      normalizedKind !== "INJURED"
    ) {
      return null;
    }

    return {
      id: index,
      type:
        normalizedKind as ChangeConditionType,
      operator: "=",
      value:
        predicate.position,
    };
  }

  return null;
}

function orderToChange(
  order: OriginalOrder,
  id: number
): EsmsChange | null {
  const action =
    order.action.toUpperCase();

  const conditions =
    order.predicates.map(
      (predicate, index) =>
        predicateToChangeCondition(
          predicate,
          id * 100 + index
        )
    );

  if (
    conditions.some(
      (condition) =>
        condition === null
    )
  ) {
    return null;
  }

  const base = {
    id,
    subOut: "",
    subIn: "",
    subPosition: "MF" as ChangeEsmsPosition,
    tactic: "N" as ChangeTacticalStyle,
    changePosPlayer: "",
    changePosPosition: "MF" as ChangeEsmsPosition,
    aggression: "",
    conditions:
      conditions as ChangeCondition[],
  };

  if (action === "TACTIC") {
    const tactic =
      toTacticalStyle(
        order.arguments[0] ??
          ""
      );

    return {
      ...base,
      actionType: "TACTIC",
      tactic:
        tactic as ChangeTacticalStyle,
    };
  }

  if (action === "SUB") {
    const position =
      toAssignedPosition(
        order.arguments[2] ??
          ""
      );

    if (!position) {
      return null;
    }

    return {
      ...base,
      actionType: "SUB",
      subOut:
        order.arguments[0] ??
        "",
      subIn:
        order.arguments[1] ??
        "",
      subPosition:
        position as ChangeEsmsPosition,
    };
  }

  if (action === "CHANGEPOS") {
    const position =
      toAssignedPosition(
        order.arguments[1] ??
          ""
      );

    if (!position) {
      return null;
    }

    return {
      ...base,
      actionType: "CHANGEPOS",
      changePosPlayer:
        order.arguments[0] ??
        "",
      changePosPosition:
        position as ChangeEsmsPosition,
    };
  }

  if (
    action === "CHANGEAGG"
  ) {
    return {
      ...base,
      actionType: "CHANGEAGG",
      aggression:
        order.arguments[0] ??
        "",
    };
  }

  return null;
}

function serializeChange(
  change: EsmsChange
) {
  const conditions =
    change.conditions.map(
      (condition) => {
        if (
          condition.type === "MIN" ||
          condition.type === "SCORE" ||
          condition.type === "SHOTS"
        ) {
          return [
            condition.type,
            condition.operator,
            condition.value,
          ].join(" ");
        }

        return [
          condition.type,
          condition.value,
        ].join(" ");
      }
    );

  if (conditions.length === 0) {
    return "";
  }

  switch (change.actionType) {
    case "SUB":
      return [
        "SUB",
        change.subOut,
        change.subIn,
        change.subPosition,
        "IF",
        ...conditions,
      ].join(" ");

    case "TACTIC":
      return [
        "TACTIC",
        change.tactic,
        "IF",
        ...conditions,
      ].join(" ");

    case "CHANGEPOS":
      return [
        "CHANGEPOS",
        change.changePosPlayer,
        change.changePosPosition,
        "IF",
        ...conditions,
      ].join(" ");

    case "CHANGEAGG":
      return [
        "CHANGEAGG",
        change.aggression,
        "IF",
        ...conditions,
      ].join(" ");

    default:
      return "";
  }
}

function serializeImportedOrder(
  order: OriginalOrder
) {
  const predicates =
    order.predicates.flatMap(
      (predicate) => {
        const kind =
          predicate.kind.toUpperCase();

        if (
          hasNumericPredicate(
            predicate
          )
        ) {
          return [
            kind,
            predicate.operator,
            predicate.rawValue ||
              String(predicate.value),
          ];
        }

        if (
          hasPositionPredicate(
            predicate
          )
        ) {
          return [
            kind,
            predicate.position,
          ];
        }

        return [kind];
      }
    );

  return [
    order.action.toUpperCase(),
    ...order.arguments,
    "IF",
    ...predicates,
  ]
    .filter(Boolean)
    .join(" ");
}

function getSheetPlayerName(
  player: GlobalEsmsPlayer
) {
  return player.name.replace(
    /\s+/g,
    "_"
  );
}

function buildSelectionMap(
  selections: OriginalSelection[],
  teamPlayers: GlobalEsmsPlayer[]
) {
  const assignments: Record<
    string,
    AssignedPosition
  > = {};

  const missing: string[] = [];

  for (const selection of selections) {
    const player =
      findSheetPlayer(
        teamPlayers,
        selection.playerName
      );

    const position =
      toAssignedPosition(
        selection.position
      );

    if (
      !player ||
      !position
    ) {
      missing.push(
        selection.playerName
      );
      continue;
    }

    assignments[
      getPlayerKey(
        player
      )
    ] = position;
  }

  return {
    assignments,
    missing,
  };
}

function createEmptyBench(): BenchSlot[] {
  return Array.from(
    {
      length: 5,
    },
    (_, index) => ({
      id: index + 1,
      position: "",
      playerKey: "",
    })
  );
}

function getPositionStorageKey(
  player: GlobalEsmsPlayer
) {
  return `manager-tools-position-v2:${player.teamCode}:${player.name}`;
}

function getPositionClass(
  position:
    | EsmsPosition
    | AssignedPosition
) {
  switch (position) {
    case "GK":
      return `
        border-yellow-500/40
        bg-yellow-500/10
        text-yellow-800
      `;

    case "DF":
      return `
        border-[var(--mt-gold)]
        bg-[var(--mt-surface-soft)]
        text-[var(--mt-gold-dark)]
      `;

    case "DM":
      return `
        border-[var(--mt-gold)]
        bg-[var(--mt-surface-soft)]
        text-[var(--mt-gold-dark)]
      `;

    case "MF":
      return `
        border-emerald-500/40
        bg-emerald-500/10
        text-emerald-700
      `;

    case "AM":
      return `
        border-[var(--mt-gold)]
        bg-[var(--mt-surface-soft)]
        text-[var(--mt-gold-dark)]
      `;

    case "FW":
      return `
        border-red-500/40
        bg-red-500/10
        text-red-700
      `;

    default:
      return `
        border-[var(--mt-line)]
        bg-[var(--mt-surface)]
        text-[var(--mt-muted)]
      `;
  }
}

function getRatingClass(
  value: number
) {
  if (value >= 16) {
    return "font-bold text-emerald-700";
  }

  return "text-[var(--mt-muted)]";
}


function isUnavailable(
  player: GlobalEsmsPlayer
) {
  return (
    player.inj > 0 ||
    player.sus > 0
  );
}

function getUnavailableLabel(
  player: GlobalEsmsPlayer
) {
  const reasons: string[] = [];

  if (player.inj > 0) {
    reasons.push(
      `LESIONADO (${player.inj})`
    );
  }

  if (player.sus > 0) {
    reasons.push(
      `SANCIONADO (${player.sus})`
    );
  }

  return reasons.join(
    " · "
  );
}

function getUnavailableMessage(
  player: GlobalEsmsPlayer
) {
  const reasons: string[] = [];

  if (player.inj > 0) {
    reasons.push(
      `lesionado (${player.inj} partido${player.inj === 1 ? "" : "s"} pendiente${player.inj === 1 ? "" : "s"})`
    );
  }

  if (player.sus > 0) {
    reasons.push(
      `sancionado (${player.sus} partido${player.sus === 1 ? "" : "s"} pendiente${player.sus === 1 ? "" : "s"})`
    );
  }

  return `${player.name} está ${reasons.join(" y ")}.`;
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function ShtCreator({
  players,
}: Props) {
  const [
    selectedTeam,
    setSelectedTeam,
  ] = useState("");


  const checkerFileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const isImportingRef =
    useRef(false);

  const [
    tacticalStyle,
    setTacticalStyle,
  ] =
    useState<TacticalStyle>(
      "N"
    );

  const [
    hideUnavailable,
    setHideUnavailable,
  ] = useState(false);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<CreatorTab>(
      "starters"
    );

  const [
    assignedPositions,
    setAssignedPositions,
  ] = useState<
    Record<
      string,
      AssignedPosition
    >
  >({});

  const [
    bench,
    setBench,
  ] =
    useState<BenchSlot[]>(
      createEmptyBench()
    );

  const [
    changes,
    setChanges,
  ] =
    useState<EsmsChange[]>([]);

  const [
    penaltyTaker,
    setPenaltyTaker,
  ] = useState("");

  const [
    initialAggression,
    setInitialAggression,
  ] = useState("10");

  const [
    importStatus,
    setImportStatus,
  ] = useState<ImportStatus | null>(
    null
  );

  const [
    importedAdvancedOrders,
    setImportedAdvancedOrders,
  ] = useState<string[]>([]);

  const [
    positions,
    setPositions,
  ] = useState<
    Record<
      string,
      EsmsPosition
    >
  >({});

  /* =======================================================
     POSICIONES NATURALES
  ======================================================= */

  useEffect(() => {
    const nextPositions: Record<
      string,
      EsmsPosition
    > = {};

    for (
      const player of players
    ) {
      const key =
        getPlayerKey(
          player
        );

      const storageKey =
        getPositionStorageKey(
          player
        );

      const calculated =
        getPlayerProfile(
          player
        );

      if (
        typeof window ===
        "undefined"
      ) {
        nextPositions[key] =
          calculated;

        continue;
      }

      if (
        hasMainRatingTie(
          player
        )
      ) {
        const saved =
          window.localStorage.getItem(
            storageKey
          ) as EsmsPosition | null;

        if (
          saved &&
          [
            "GK",
            "DF",
            "DM",
            "MF",
            "AM",
            "FW",
          ].includes(
            saved
          )
        ) {
          nextPositions[key] =
            saved;
        } else {
          const fallback =
            getTieFallbackPosition(
              player
            );

          nextPositions[key] =
            fallback;

          window.localStorage.setItem(
            storageKey,
            fallback
          );
        }
      } else {
        nextPositions[key] =
          calculated;

        window.localStorage.setItem(
          storageKey,
          calculated
        );
      }
    }

    setPositions(
      nextPositions
    );
  }, [players]);

  /* =======================================================
     EQUIPOS
  ======================================================= */

  const teams =
    useMemo(() => {
      const teamMap =
        new Map<
          string,
          string
        >();

      for (
        const player of players
      ) {
        if (
          !teamMap.has(
            player.teamCode
          )
        ) {
          teamMap.set(
            player.teamCode,
            player.teamName
          );
        }
      }

      return Array.from(
        teamMap.entries()
      )
        .map(
          ([
            code,
            name,
          ]) => ({
            code,
            name,
          })
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name
            )
        );
    }, [players]);

  /* =======================================================
     RESOLVER POSICIÓN NATURAL
  ======================================================= */

  function resolvePosition(
    player: GlobalEsmsPlayer
  ): EsmsPosition {
    return (
      positions[
        getPlayerKey(
          player
        )
      ] ??
      getPlayerProfile(
        player
      )
    );
  }

  /* =======================================================
     JUGADORES DEL EQUIPO
  ======================================================= */

  const teamPlayers =
    useMemo(() => {
      if (
        !selectedTeam
      ) {
        return [];
      }

      return players
        .filter(
          (player) =>
            player.teamCode ===
            selectedTeam
        )
        .sort(
          (a, b) => {
            const positionA =
              positions[
                getPlayerKey(
                  a
                )
              ] ??
              getPlayerProfile(
                a
              );

            const positionB =
              positions[
                getPlayerKey(
                  b
                )
              ] ??
              getPlayerProfile(
                b
              );

            const order =
              POSITION_ORDER[
                positionA
              ] -
              POSITION_ORDER[
                positionB
              ];

            if (
              order !== 0
            ) {
              return order;
            }

            const ratingA =
              Math.max(
                a.st,
                a.tk,
                a.ps,
                a.sh
              );

            const ratingB =
              Math.max(
                b.st,
                b.tk,
                b.ps,
                b.sh
              );

            if (
              ratingA !==
              ratingB
            ) {
              return (
                ratingB -
                ratingA
              );
            }

            return a.name.localeCompare(
              b.name
            );
          }
        );
    }, [
      players,
      selectedTeam,
      positions,
    ]);

  /* =======================================================
     JUGADORES DISPONIBLES

     El creador usa los valores INJ / SUS del roster actual.
     Un jugador con cualquiera de los dos campos > 0 no puede
     ser titular ni suplente.
  ======================================================= */

  const availableTeamPlayers =
    useMemo(() => {
      return teamPlayers.filter(
        (player) =>
          !isUnavailable(
            player
          )
      );
    }, [teamPlayers]);

  /* =======================================================
     OCULTAR BAJAS
  ======================================================= */

  const visiblePlayers =
    useMemo(() => {
      if (
        !hideUnavailable
      ) {
        return teamPlayers;
      }

      return availableTeamPlayers;
    }, [
      teamPlayers,
      availableTeamPlayers,
      hideUnavailable,
    ]);

  /* =======================================================
     REINICIAR AL CAMBIAR EQUIPO
  ======================================================= */

  useEffect(() => {
    if (isImportingRef.current) {
      isImportingRef.current =
        false;
      return;
    }

    setAssignedPositions(
      {}
    );

    setBench(
      createEmptyBench()
    );

    setChanges([]);

    setPenaltyTaker("");

    setInitialAggression("10");

    setImportStatus(null);

    setImportedAdvancedOrders([]);

    setActiveTab(
      "starters"
    );
  }, [selectedTeam]);

  /* =======================================================
     ELIMINAR BAJAS YA SELECCIONADAS

     Si la plantilla cambia y un jugador pasa a tener INJ/SUS,
     se elimina automáticamente de titulares y banquillo.
  ======================================================= */

  useEffect(() => {
    const unavailableKeys =
      new Set(
        teamPlayers
          .filter(
            isUnavailable
          )
          .map(
            getPlayerKey
          )
      );

    if (
      unavailableKeys.size ===
      0
    ) {
      return;
    }

    setAssignedPositions(
      (previous) => {
        let changed =
          false;

        const next = {
          ...previous,
        };

        for (
          const key of
            unavailableKeys
        ) {
          if (
            next[key]
          ) {
            next[key] =
              "";
            changed =
              true;
          }
        }

        return changed
          ? next
          : previous;
      }
    );

    setBench(
      (previous) => {
        let changed =
          false;

        const next =
          previous.map(
            (slot) => {
              if (
                slot.playerKey &&
                unavailableKeys.has(
                  slot.playerKey
                )
              ) {
                changed =
                  true;

                return {
                  ...slot,
                  playerKey:
                    "",
                };
              }

              return slot;
            }
          );

        return changed
          ? next
          : previous;
      }
    );
  }, [teamPlayers]);

  /* =======================================================
     TITULARES
  ======================================================= */

  const selectedStarters =
    useMemo(() => {
      return teamPlayers.filter(
        (player) => {
          const key =
            getPlayerKey(
              player
            );

          return Boolean(
            assignedPositions[
              key
            ]
          );
        }
      );
    }, [
      teamPlayers,
      assignedPositions,
    ]);

  /* =======================================================
     ERROR CORREGIDO:
     BenchSelector espera string[]
  ======================================================= */

  const startersKeys =
    useMemo(() => {
      return selectedStarters.map(
        (player) =>
          getPlayerKey(
            player
          )
      );
    }, [
      selectedStarters,
    ]);

  /* =======================================================
     CAMPO
  ======================================================= */

  const pitchPlayers =
    useMemo(() => {
      return selectedStarters.map(
        (player) => {
          const key =
            getPlayerKey(
              player
            );

          const assignedPosition =
            assignedPositions[
              key
            ];

          return {
            player,
            position:
              assignedPosition as Exclude<
                AssignedPosition,
                ""
              >,
          };
        }
      );
    }, [
      selectedStarters,
      assignedPositions,
    ]);

  /* =======================================================
     BANQUILLO COMPLETO
  ======================================================= */

  const completedBench =
    useMemo(() => {
      return bench.filter(
        (slot) =>
          slot.position !==
            "" &&
          slot.playerKey !==
            ""
      );
    }, [bench]);

  /* =======================================================
     ASIGNAR POSICIÓN
  ======================================================= */

  function handleAssignedPosition(
    player:
      GlobalEsmsPlayer,
    position:
      AssignedPosition
  ) {
    if (
      position !== "" &&
      isUnavailable(
        player
      )
    ) {
      alert(
        getUnavailableMessage(
          player
        )
      );

      return;
    }

    const key =
      getPlayerKey(
        player
      );

    setAssignedPositions(
      (previous) => ({
        ...previous,

        [key]:
          position,
      })
    );

    if (
      position !== ""
    ) {
      setBench(
        (previous) =>
          previous.map(
            (slot) =>
              slot.playerKey ===
              key
                ? {
                    ...slot,
                    playerKey:
                      "",
                  }
                : slot
          )
      );
    }
  }

  /* =======================================================
     COMPROBAR ALINEACIÓN IMPORTADA

     El botón "Comprobar" abre directamente el selector de
     archivos. No crea una pestaña ni un apartado adicional.
  ======================================================= */

  async function handleCheckImportedFile(
    file: File
  ) {
    const buffer =
      await file.arrayBuffer();

    const teamsheetText =
      new TextDecoder(
        "windows-1252"
      ).decode(
        buffer
      );

    const teamCode =
      teamsheetText
        .split(/\r?\n/)
        .map(
          (line) =>
            line.trim()
        )
        .find(Boolean)
        ?.toUpperCase() ??
      "";

    const importedTeamPlayers =
      players.filter(
        (player) =>
          player.teamCode.toUpperCase() ===
          teamCode
      );

    const roster:
      OriginalRosterPlayer[] =
      importedTeamPlayers.map(
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

    const result =
      validateOriginalTeamsheet({
        teamsheetText,

        roster,

        league: {
          Positions:
            1,

          Tactic_7:
            1,

          Max_Skill:
            30,

          Min_DF:
            2,

          Max_DF:
            8,

          Min_MF:
            2,

          Max_MF:
            8,

          Max_DM:
            8,

          Max_AM:
            8,

          Min_FW:
            0,

          Max_FW:
            5,
        },
      });

    if (
      !result.valid
    ) {
      const lineText =
        result.error.line !==
        null
          ? " Línea " + result.error.line + "."
          : "";

      setImportStatus({
        type: "error",
        title: "No se pudo cargar la alineación",
        detail:
          file.name + ": " + result.error.message + "." + lineText,
      });

      return;
    }

    const starterMap =
      buildSelectionMap(
        result.teamsheet.starters,
        importedTeamPlayers
      );

    const substituteMap =
      buildSelectionMap(
        result.teamsheet.substitutes,
        importedTeamPlayers
      );

    const nextBench =
      createEmptyBench();

    result.teamsheet.substitutes
      .slice(0, 5)
      .forEach(
        (substitute, index) => {
          const player =
            findSheetPlayer(
              importedTeamPlayers,
              substitute.playerName
            );

          const position =
            toAssignedPosition(
              substitute.position
            );

          if (
            player &&
            position
          ) {
            nextBench[index] = {
              ...nextBench[index],
              position,
              playerKey:
                getPlayerKey(
                  player
                ),
            };
          }
        }
      );

    const penaltyPlayer =
      findSheetPlayer(
        importedTeamPlayers,
        result.teamsheet.penaltyTaker
      );

    const nextChanges:
      EsmsChange[] = [];
    const advancedOrders:
      string[] = [];

    setInitialAggression("10");

    result.teamsheet.orders.forEach(
      (order, index) => {
        if (order.action.toUpperCase() === "AGG") {
          setInitialAggression(
            order.arguments[0] ??
              "10"
          );
          return;
        }

        const change =
          orderToChange(
            order,
            index + 1
          );

        if (change) {
          nextChanges.push(
            change
          );
        } else {
          advancedOrders.push(
            serializeImportedOrder(
              order
            )
          );
        }
      }
    );

    const missing = [
      ...starterMap.missing,
      ...substituteMap.missing,
      ...(
        penaltyPlayer
          ? []
          : [
              result.teamsheet.penaltyTaker,
            ]
      ),
    ];

    isImportingRef.current =
      true;

    setSelectedTeam(
      result.teamsheet.team
    );

    setTacticalStyle(
      toTacticalStyle(
        result.teamsheet.tactic
      )
    );

    setAssignedPositions(
      starterMap.assignments
    );

    setBench(
      nextBench
    );

    setChanges(
      nextChanges
    );

    setPenaltyTaker(
      penaltyPlayer
        ? getPlayerKey(
            penaltyPlayer
          )
        : ""
    );

    setImportedAdvancedOrders(
      advancedOrders
    );

    setHideUnavailable(false);

    setActiveTab(
      "starters"
    );

    setImportStatus({
      type:
        missing.length > 0
          ? "error"
          : "success",
      title:
        missing.length > 0
          ? "Alineación cargada con avisos"
          : "Alineación cargada en el creador",
      detail:
        [
          file.name + ": " + result.teamsheet.starters.length + " titulares, " + result.teamsheet.substitutes.length + " suplentes, penalti y " + result.teamsheet.orders.length + " órdenes importadas.",
          advancedOrders.length > 0
            ? advancedOrders.length + " órdenes avanzadas se han conservado y se incluirán al descargar el archivo."
            : "Todas las órdenes se han cargado: las simples aparecen como controles y las avanzadas se conservan para la descarga.",
          missing.length > 0
            ? "Revisa estos nombres no encontrados: " + missing.join(", ") + "."
            : "",
        ]
          .filter(Boolean)
          .join(" "),
    });
  }

  /* =======================================================
     GENERAR
  ======================================================= */

  function buildTeamsheetText() {
    const playerByKey =
      new Map(
        teamPlayers.map(
          (player) => [
            getPlayerKey(
              player
            ),
            player,
          ]
        )
      );

    const starterLines =
      pitchPlayers.map(
        (item) =>
          item.position +
          " " +
          getSheetPlayerName(
            item.player
          )
      );

    const benchLines =
      completedBench.map(
        (slot) => {
          const player =
            playerByKey.get(
              slot.playerKey
            );

          if (!player) {
            return "";
          }

          return (
            slot.position +
            " " +
            getSheetPlayerName(
              player
            )
          );
        }
      );

    const penaltyPlayer =
      penaltyTaker
        ? playerByKey.get(
            penaltyTaker
          )
        : undefined;

    const changeLines =
      changes
        .map(
          serializeChange
        )
        .filter(Boolean);

    const controlLines = [
      "PK: " +
        (penaltyPlayer
          ? getSheetPlayerName(penaltyPlayer)
          : ""),
      ...(initialAggression
        ? ["AGG " + initialAggression]
        : []),
    ];

    const conditionLines = [
      ...changeLines,
      ...importedAdvancedOrders,
    ];

    // Formato ESMS: bloques separados por una línea en blanco.
    return [
      selectedTeam,
      tacticalStyle,
      "",
      ...starterLines,
      "",
      ...benchLines,
      "",
      ...controlLines,
      "",
      ...conditionLines,
      "",
    ].join("\r\n");
  }

  function downloadTeamsheet(
    text: string
  ) {
    const blob =
      new Blob(
        [text],
        {
          type: "text/plain;charset=windows-1252",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      selectedTeam.toUpperCase() +
      "sht.txt";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );
  }

  function handleGenerate() {
    if (
      !selectedTeam
    ) {
      alert(
        "Selecciona un equipo."
      );

      return;
    }

    const unavailableStarters =
      selectedStarters.filter(
        isUnavailable
      );

    if (
      unavailableStarters.length >
      0
    ) {
      alert(
        "Alineación no válida.\n\n" +
          unavailableStarters
            .map(
              getUnavailableMessage
            )
            .join("\n")
      );

      return;
    }

    const benchPlayerKeys =
      new Set(
        completedBench.map(
          (slot) =>
            slot.playerKey
        )
      );

    const unavailableBench =
      teamPlayers.filter(
        (player) =>
          benchPlayerKeys.has(
            getPlayerKey(
              player
            )
          ) &&
          isUnavailable(
            player
          )
      );

    if (
      unavailableBench.length >
      0
    ) {
      alert(
        "Banquillo no válido.\n\n" +
          unavailableBench
            .map(
              getUnavailableMessage
            )
            .join("\n")
      );

      return;
    }

    if (
      selectedStarters.length !==
      11
    ) {
      alert(
        "Debes seleccionar exactamente 11 titulares. Actualmente tienes " +
          selectedStarters.length +
          "."
      );

      return;
    }

    const goalkeeperCount =
      pitchPlayers.filter(
        (item) =>
          item.position ===
          "GK"
      ).length;

    if (
      goalkeeperCount !==
      1
    ) {
      alert(
        "Debes seleccionar exactamente 1 portero titular."
      );

      return;
    }

    if (
      completedBench.length !==
      5
    ) {
      alert(
        "Debes completar los 5 jugadores del banquillo. Actualmente tienes " +
          completedBench.length +
          "."
      );

      return;
    }

    if (!penaltyTaker) {
      alert(
        "Elige el lanzador de penaltis antes de generar el archivo."
      );

      return;
    }

    const teamsheetText =
      buildTeamsheetText();

    const roster:
      OriginalRosterPlayer[] =
      teamPlayers.map(
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

    const result =
      validateOriginalTeamsheet({
        teamsheetText,
        roster,
        league: {
          Positions:
            1,

          Tactic_7:
            1,

          Max_Skill:
            30,
          Min_DF:
            2,
          Max_DF:
            8,
          Min_MF:
            2,
          Max_MF:
            8,
          Max_DM:
            8,
          Max_AM:
            8,
          Min_FW:
            0,
          Max_FW:
            5,
        },
      });

    if (!result.valid) {
      const lineText =
        result.error.line !==
        null
          ? "\nLínea: " +
            result.error.line
          : "";

      alert(
        "No se ha descargado el archivo porque la alineación generada no es válida para el simulador.\n\n" +
          result.error.message +
          lineText
      );

      return;
    }

    downloadTeamsheet(
      teamsheetText
    );

    setImportStatus({
      type: "success",
      title: "Archivo generado",
      detail:
        selectedTeam.toUpperCase() +
        "sht.txt se ha descargado en formato válido para el simulador.",
    });
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        grid
        min-h-[720px]
        grid-cols-1
        overflow-hidden
        rounded-xl
        border
        border-[var(--mt-line)]
        bg-[var(--mt-surface)]

        xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,1fr)]
      "
    >
      {/* ===================================================
          PANEL IZQUIERDO
      =================================================== */}

      <div
        className="
          min-w-0
          border-b
          border-[var(--mt-line)]

          xl:border-b-0
          xl:border-r
        "
      >
        {/* CONTROLES */}

        <div
          className="
            border-b
            border-[var(--mt-line)]
            p-4
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-3

              sm:grid-cols-2

              lg:grid-cols-4
              lg:items-end
            "
          >
            {/* EQUIPO */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[var(--mt-muted)]
                "
              >
                Equipo
              </label>

              <select
                value={
                  selectedTeam
                }
                onChange={(
                  event
                ) =>
                  setSelectedTeam(
                    event.target
                      .value
                  )
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-[var(--mt-line)]
                  bg-[var(--mt-surface)]
                  px-3
                  py-2.5
                  text-sm
                  text-[var(--mt-text)]
                  outline-none

                  focus:border-[var(--mt-gold)]
                "
              >
                <option value="">
                  Selecciona un equipo
                </option>

                {teams.map(
                  (team) => (
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
                      (
                      {
                        team.code
                      }
                      )
                    </option>
                  )
                )}
              </select>
            </div>

            {/* TÁCTICA */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[var(--mt-muted)]
                "
              >
                Táctica inicial
              </label>

              <select
                value={
                  tacticalStyle
                }
                onChange={(
                  event
                ) =>
                  setTacticalStyle(
                    event.target
                      .value as TacticalStyle
                  )
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-[var(--mt-line)]
                  bg-[var(--mt-surface)]
                  px-3
                  py-2.5
                  text-sm
                  text-[var(--mt-text)]
                  outline-none

                  focus:border-[var(--mt-gold)]
                "
              >
                {TACTICS.map(
                  (tactic) => (
                    <option
                      key={
                        tactic.value
                      }
                      value={
                        tactic.value
                      }
                    >
                      {
                        tactic.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* LANZADOR DE PENALTIS */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[var(--mt-muted)]
                "
              >
                Penaltis
              </label>

              <select
                value={
                  penaltyTaker
                }
                onChange={(
                  event
                ) =>
                  setPenaltyTaker(
                    event.target
                      .value
                  )
                }
                disabled={
                  !selectedTeam
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-[var(--mt-line)]
                  bg-[var(--mt-surface)]
                  px-3
                  py-2.5
                  text-sm
                  text-[var(--mt-text)]
                  outline-none

                  disabled:opacity-50
                  focus:border-[var(--mt-gold)]
                "
              >
                <option value="">
                  Sin elegir
                </option>

                {teamPlayers.map(
                  (player) => (
                    <option
                      key={
                        getPlayerKey(
                          player
                        )
                      }
                      value={
                        getPlayerKey(
                          player
                        )
                      }
                    >
                      {
                        player.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* AGRESIVIDAD INICIAL */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[var(--mt-muted)]
                "
              >
                Agresividad inicial
              </label>

              <select
                value={
                  initialAggression
                }
                onChange={(
                  event
                ) =>
                  setInitialAggression(
                    event.target
                      .value
                  )
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-[var(--mt-line)]
                  bg-[var(--mt-surface)]
                  px-3
                  py-2.5
                  text-sm
                  text-[var(--mt-text)]
                  outline-none

                  focus:border-[var(--mt-gold)]
                "
              >
                <option value="">
                  Sin AGG
                </option>

                {Array.from(
                  { length: 20 },
                  (_, index) =>
                    String(index + 1)
                ).map(
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

            {/* OCULTAR BAJAS */}

            <label
              className="
                flex
                min-h-[42px]
                cursor-pointer
                items-center
                gap-2
                rounded-lg
                border
                border-[var(--mt-line)]
                bg-[var(--mt-surface)]
                px-3
                text-sm
                text-[var(--mt-muted)]
              "
            >
              <input
                type="checkbox"
                checked={
                  hideUnavailable
                }
                onChange={(
                  event
                ) =>
                  setHideUnavailable(
                    event.target
                      .checked
                  )
                }
                className="
                  h-4
                  w-4
                  accent-blue-500
                "
              />

              Ocultar bajas
            </label>

            {/* GENERAR */}

            <button
              type="button"
              onClick={
                handleGenerate
              }
              className="
                min-h-[42px]
                rounded-lg
                bg-[var(--mt-gold-dark)]
                px-5
                text-sm
                font-bold
                text-white
                transition

                hover:bg-[var(--mt-gold-dark)]
              "
            >
              Generar
            </button>

            {/* COMPROBAR ALINEACIÓN ESCRITA A MANO */}

            <input
              ref={
                checkerFileInputRef
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
                  void handleCheckImportedFile(
                    file
                  );
                }

                event.target.value =
                  "";
              }}
            />

            <button
              type="button"
              onClick={() => {
                if (
                  checkerFileInputRef.current
                ) {
                  checkerFileInputRef.current.value =
                    "";

                  checkerFileInputRef.current.click();
                }
              }}
              className="
                min-h-[42px]
                rounded-lg
                border
                border-[var(--mt-gold)]
                bg-[var(--mt-surface-soft)]
                px-5
                text-sm
                font-bold
                text-[var(--mt-gold-dark)]
                transition

                hover:bg-[var(--mt-surface-soft)]
                hover:text-[var(--mt-gold-dark)]
              "
            >
              Importar y comprobar
            </button>

          </div>
        </div>

        {importStatus && (
          <div
            className={
              "mx-4 mt-4 rounded-xl border p-4 text-sm " +
              (importStatus.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                : "border-emerald-500/30 bg-emerald-500/10 text-amber-800")
            }
          >
            <div className="font-bold">
              {importStatus.title}
            </div>

            <p className="mt-1 leading-relaxed">
              {importStatus.detail}
            </p>
          </div>
        )}

        {/* SIN EQUIPO */}

        {!selectedTeam && (
          <div
            className="
              flex
              min-h-[500px]
              items-center
              justify-center
              p-8
              text-center
            "
          >
            <div>
              <div
                className="
                  text-lg
                  font-bold
                  text-[var(--mt-text)]
                "
              >
                Selecciona un equipo
              </div>

              <p
                className="
                  mt-2
                  max-w-md
                  text-sm
                  text-[var(--mt-muted)]
                "
              >
                Selecciona una plantilla
                para comenzar a crear
                la alineación.
              </p>
            </div>
          </div>
        )}

        {/* PLANTILLA */}

        {selectedTeam && (
          <div
            className="
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                min-w-[760px]
                border-collapse
              "
            >
              <thead
                className="
                  bg-[var(--mt-surface)]
                "
              >
                <tr
                  className="
                    border-b
                    border-[var(--mt-line)]
                  "
                >
                  <TableHeader>
                    Sel.
                  </TableHeader>

                  <TableHeader>
                    Pos
                  </TableHeader>

                  <TableHeader
                    align="left"
                  >
                    Nombre
                  </TableHeader>

                  <TableHeader>
                    GK
                  </TableHeader>

                  <TableHeader>
                    DF
                  </TableHeader>

                  <TableHeader>
                    MF
                  </TableHeader>

                  <TableHeader>
                    FW
                  </TableHeader>

                  <TableHeader>
                    Sus
                  </TableHeader>

                  <TableHeader>
                    Inj
                  </TableHeader>

                  <TableHeader>
                    Fit
                  </TableHeader>
                </tr>
              </thead>

              <tbody>
                {visiblePlayers.map(
                  (player) => {
                    const key =
                      getPlayerKey(
                        player
                      );

                    const naturalPosition =
                      resolvePosition(
                        player
                      );

                    const assignedPosition =
                      assignedPositions[
                        key
                      ] ?? "";

                    const unavailable =
                      isUnavailable(
                        player
                      );

                    const unavailableLabel =
                      getUnavailableLabel(
                        player
                      );

                    return (
                      <tr
                        key={
                          key
                        }
                        className={`
                          border-b
                          border-[var(--mt-line)]
                          transition

                          ${
                            unavailable
                              ? "bg-red-950/10 opacity-70"
                              : "hover:bg-[var(--mt-surface-soft)]"
                          }
                        `}
                      >
                        {/* SELECCIÓN */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                          "
                        >
                          <select
                            value={
                              assignedPosition
                            }
                            disabled={
                              unavailable
                            }
                            title={
                              unavailable
                                ? unavailableLabel
                                : "Asignar posición"
                            }
                            onChange={(
                              event
                            ) =>
                              handleAssignedPosition(
                                player,
                                event
                                  .target
                                  .value as AssignedPosition
                              )
                            }
                            className={`
                              w-[68px]
                              rounded-md
                              border
                              px-2
                              py-1.5
                              text-xs
                              font-bold
                              outline-none

                              ${getPositionClass(
                                assignedPosition
                              )}

                              ${
                                unavailable
                                  ? "cursor-not-allowed opacity-40"
                                  : ""
                              }
                            `}
                          >
                            {ASSIGNED_POSITIONS.map(
                              (
                                option
                              ) => (
                                <option
                                  key={
                                    option.value ||
                                    "none"
                                  }
                                  value={
                                    option.value
                                  }
                                  className="
                                    bg-[var(--mt-surface)]
                                    text-[var(--mt-text)]
                                  "
                                >
                                  {
                                    option.label
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        {/* POSICIÓN NATURAL */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                          "
                        >
                          <span
                            className={`
                              inline-flex
                              min-w-[42px]
                              items-center
                              justify-center
                              rounded-md
                              border
                              px-2
                              py-1
                              text-xs
                              font-bold

                              ${getPositionClass(
                                naturalPosition
                              )}
                            `}
                          >
                            {
                              naturalPosition
                            }
                          </span>
                        </td>

                        {/* NOMBRE CLICABLE */}

                        <td
                          className="
                            px-3
                            py-2
                            text-left
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              gap-1
                            "
                          >
                            <PlayerNameLink
                              playerId={
                                player.playerId
                              }
                              name={
                                player.name
                              }
                              className="
                                font-semibold
                                text-[var(--mt-text)]
                              "
                            />

                            <span
                              className="
                                text-xs
                                text-[var(--mt-muted)]
                              "
                            >
                              (
                              {
                                player.age
                              }
                              )
                            </span>

                            {unavailable && (
                              <span
                                className="
                                  ml-1
                                  rounded-md
                                  border
                                  border-red-500/30
                                  bg-red-500/10
                                  px-1.5
                                  py-0.5
                                  text-[9px]
                                  font-black
                                  uppercase
                                  tracking-wide
                                  text-red-700
                                "
                              >
                                {
                                  unavailableLabel
                                }
                              </span>
                            )}
                          </div>
                        </td>

                        {/* GK */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                            text-sm
                          "
                        >
                          <span
                            className={
                              getRatingClass(
                                player.st
                              )
                            }
                          >
                            {
                              player.st
                            }
                          </span>

                          <span
                            className="
                              ml-1
                              text-xs
                              text-[var(--mt-muted)]
                            "
                          >
                            (
                            {
                              player.kab
                            }
                            )
                          </span>
                        </td>

                        {/* DF */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                            text-sm
                          "
                        >
                          <span
                            className={
                              getRatingClass(
                                player.tk
                              )
                            }
                          >
                            {
                              player.tk
                            }
                          </span>

                          <span
                            className="
                              ml-1
                              text-xs
                              text-[var(--mt-muted)]
                            "
                          >
                            (
                            {
                              player.tab
                            }
                            )
                          </span>
                        </td>

                        {/* MF */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                            text-sm
                          "
                        >
                          <span
                            className={
                              getRatingClass(
                                player.ps
                              )
                            }
                          >
                            {
                              player.ps
                            }
                          </span>

                          <span
                            className="
                              ml-1
                              text-xs
                              text-[var(--mt-muted)]
                            "
                          >
                            (
                            {
                              player.pab
                            }
                            )
                          </span>
                        </td>

                        {/* FW */}

                        <td
                          className="
                            px-2
                            py-2
                            text-center
                            text-sm
                          "
                        >
                          <span
                            className={
                              getRatingClass(
                                player.sh
                              )
                            }
                          >
                            {
                              player.sh
                            }
                          </span>

                          <span
                            className="
                              ml-1
                              text-xs
                              text-[var(--mt-muted)]
                            "
                          >
                            (
                            {
                              player.sab
                            }
                            )
                          </span>
                        </td>

                        {/* SUSPENSIÓN */}

                        <td
                          className={`
                            px-2
                            py-2
                            text-center
                            text-sm
                            font-semibold

                            ${
                              player.sus >
                              0
                                ? "text-red-700"
                                : "text-[var(--mt-muted)]"
                            }
                          `}
                        >
                          {
                            player.sus
                          }
                        </td>

                        {/* LESIÓN */}

                        <td
                          className={`
                            px-2
                            py-2
                            text-center
                            text-sm
                            font-semibold

                            ${
                              player.inj >
                              0
                                ? "text-red-700"
                                : "text-[var(--mt-muted)]"
                            }
                          `}
                        >
                          {
                            player.inj
                          }
                        </td>

                        {/* FIT */}

                        <td
                          className={`
                            px-2
                            py-2
                            text-center
                            text-sm
                            font-bold

                            ${
                              player.fit >=
                              90
                                ? "text-emerald-700"
                                : player.fit >=
                                    75
                                  ? "text-yellow-800"
                                  : "text-red-700"
                            }
                          `}
                        >
                          {
                            player.fit
                          }
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>

            {visiblePlayers.length ===
              0 && (
              <div
                className="
                  p-8
                  text-center
                  text-sm
                  text-[var(--mt-muted)]
                "
              >
                No hay jugadores
                disponibles con los
                filtros actuales.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================
          PANEL DERECHO
      =================================================== */}

      <div
        className="
          min-w-0
          bg-[var(--mt-surface)]
        "
      >
        {/* TABS */}

        <div
          className="
            grid
            grid-cols-3
            border-b
            border-[var(--mt-line)]
          "
        >
          <TabButton
            active={
              activeTab ===
              "starters"
            }
            activeClass="
              border-[var(--mt-gold)]
              bg-[var(--mt-surface-soft)]
              text-[var(--mt-gold-dark)]
            "
            onClick={() =>
              setActiveTab(
                "starters"
              )
            }
          >
            Titulares
          </TabButton>

          <TabButton
            active={
              activeTab ===
              "subs"
            }
            activeClass="
              border-emerald-500
              bg-emerald-500/10
              text-emerald-700
            "
            onClick={() =>
              setActiveTab(
                "subs"
              )
            }
          >
            Suplentes
          </TabButton>

          <TabButton
            active={
              activeTab ===
              "changes"
            }
            activeClass="
              border-[var(--mt-gold)]
              bg-[var(--mt-surface-soft)]
              text-[var(--mt-gold-dark)]
            "
            onClick={() =>
              setActiveTab(
                "changes"
              )
            }
          >
            Cambios
          </TabButton>
        </div>

        {/* CONTENIDO */}

        <div
          className="
            p-4

            sm:p-5
          "
        >
          {!selectedTeam && (
            <div
              className="
                flex
                min-h-[500px]
                items-center
                justify-center
                text-center
              "
            >
              <div>
                <div
                  className="
                    text-lg
                    font-bold
                    text-[var(--mt-muted)]
                  "
                >
                  Creador de alineaciones
                </div>

                <p
                  className="
                    mt-2
                    text-sm
                    text-[var(--mt-muted)]
                  "
                >
                  Selecciona un equipo
                  para comenzar.
                </p>
              </div>
            </div>
          )}

          {selectedTeam &&
            activeTab ===
              "starters" && (
              <>
                <div
                  className="
                    mb-4
                    flex
                    flex-wrap
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <div>
                    <h2
                      className="
                        font-bold
                        text-[var(--mt-text)]
                      "
                    >
                      Titulares
                    </h2>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-[var(--mt-muted)]
                      "
                    >
                      Selecciona 11
                      jugadores y asigna
                      su posición.
                    </p>
                  </div>

                  <div
                    className={`
                      rounded-lg
                      border
                      px-3
                      py-1.5
                      text-sm
                      font-bold

                      ${
                        selectedStarters.length ===
                        11
                          ? `
                            border-emerald-500/40
                            bg-emerald-500/10
                            text-emerald-700
                          `
                          : `
                            border-[var(--mt-line)]
                            bg-[var(--mt-surface)]
                            text-[var(--mt-muted)]
                          `
                      }
                    `}
                  >
                    {
                      selectedStarters.length
                    }
                    /11
                  </div>
                </div>

                <FootballPitch
                  players={
                    pitchPlayers
                  }
                />
              </>
            )}

          {selectedTeam &&
            activeTab ===
              "subs" && (
              <BenchSelector
                teamPlayers={
                  availableTeamPlayers
                }
                startersKeys={
                  startersKeys
                }
                bench={
                  bench
                }
                onChange={
                  setBench
                }
              />
            )}

          {selectedTeam &&
            activeTab ===
              "changes" && (
              <div className="space-y-4">
                {importedAdvancedOrders.length > 0 && (
                  <div
                    className="
                      rounded-xl
                      border
                      border-emerald-500/30
                      bg-emerald-500/10
                      p-4
                      text-sm
                      text-emerald-900
                    "
                  >
                    <div className="font-bold">
                      Órdenes avanzadas conservadas
                    </div>

                    <p className="mt-1 text-xs leading-relaxed">
                      Estas órdenes vienen del archivo importado. Se conservan exactamente y se añadirán al .txt generado para el foro.
                    </p>

                    <ul className="mt-3 space-y-1 font-mono text-xs">
                      {importedAdvancedOrders.map(
                        (order) => (
                          <li key={order}>
                            {order}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                <ChangeBuilder
                  changes={
                    changes
                  }
                  onChange={
                    setChanges
                  }
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TABLE HEADER
========================================================= */

function TableHeader({
  children,
  align = "center",
}: {
  children:
    React.ReactNode;

  align?:
    | "left"
    | "center";
}) {
  return (
    <th
      className={`
        whitespace-nowrap
        px-2
        py-3
        text-xs
        font-semibold
        uppercase
        tracking-wide
        text-[var(--mt-muted)]

        ${
          align === "left"
            ? "text-left"
            : "text-center"
        }
      `}
    >
      {children}
    </th>
  );
}

/* =========================================================
   TAB
========================================================= */

function TabButton({
  children,
  active,
  activeClass,
  onClick,
}: {
  children:
    React.ReactNode;

  active: boolean;

  activeClass: string;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        border-b-2
        px-2
        py-4
        text-sm
        font-bold
        transition

        ${
          active
            ? activeClass
            : `
              border-transparent
              text-[var(--mt-muted)]

              hover:bg-[var(--mt-surface-soft)]
              hover:text-[var(--mt-muted)]
            `
        }
      `}
    >
      {children}
    </button>
  );
}


