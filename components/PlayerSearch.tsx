"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { GlobalEsmsPlayer } from "@/lib/all-players";

import {
  getPlayerProfile,
  getTieFallbackPosition,
  hasMainRatingTie,
  type EsmsPosition,
} from "@/lib/esms-player";

import {
  getFlagUrl,
} from "@/lib/nationalities";

/* =========================================================
   TIPOS
========================================================= */

type SortKey =
  | "name"
  | "teamName"
  | "age"
  | "nat"
  | "position"
  | "st"
  | "tk"
  | "ps"
  | "sh"
  | "kab"
  | "tab"
  | "pab"
  | "sab";

type SortDirection =
  | "asc"
  | "desc";

type AdvancedFilterType =
  | "age"
  | "nat"
  | "st"
  | "tk"
  | "ps"
  | "sh"
  | "kab"
  | "tab"
  | "pab"
  | "sab";

type AdvancedFilter = {
  id: number;
  type: AdvancedFilterType;
  min: string;
  max: string;
  value: string;
};

/* =========================================================
   POSICIONES
========================================================= */

const POSITION_ORDER: Record<
  EsmsPosition,
  number
> = {
  GK: 1,
  DF: 2,
  DM: 3,
  MF: 4,
  AM: 5,
  FW: 6,
};

const POSITION_COLORS: Record<
  EsmsPosition,
  string
> = {
  GK: "bg-yellow-400 text-black",
  DF: "bg-blue-500 text-white",
  DM: "bg-cyan-500 text-slate-950",
  MF: "bg-green-500 text-slate-950",
  AM: "bg-violet-500 text-white",
  FW: "bg-red-500 text-white",
};

/* =========================================================
   OPCIONES FILTROS AVANZADOS
========================================================= */

const ADVANCED_FILTER_OPTIONS: {
  value: AdvancedFilterType;
  label: string;
}[] = [
  {
    value: "age",
    label: "Edad",
  },
  {
    value: "nat",
    label: "Nacionalidad",
  },
  {
    value: "st",
    label: "St",
  },
  {
    value: "tk",
    label: "Tk",
  },
  {
    value: "ps",
    label: "Ps",
  },
  {
    value: "sh",
    label: "Sh",
  },
  {
    value: "kab",
    label: "KAb",
  },
  {
    value: "tab",
    label: "TAb",
  },
  {
    value: "pab",
    label: "PAb",
  },
  {
    value: "sab",
    label: "SAb",
  },
];

/* =========================================================
   COMPONENTE
========================================================= */

export default function PlayerSearch({
  players,
}: {
  players: GlobalEsmsPlayer[];
}) {
  /* =======================================================
     FILTROS PRINCIPALES
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [
    teamFilter,
    setTeamFilter,
  ] = useState("ALL");

  const [
    positionFilter,
    setPositionFilter,
  ] = useState("ALL");

  /* =======================================================
     FILTROS AVANZADOS
  ======================================================= */

  const [
    advancedFilters,
    setAdvancedFilters,
  ] = useState<AdvancedFilter[]>([]);

  const [
    nextFilterId,
    setNextFilterId,
  ] = useState(1);

  /* =======================================================
     ORDENACIÓN
  ======================================================= */

  const [sortKey, setSortKey] =
    useState<SortKey | null>(null);

  const [
    sortDirection,
    setSortDirection,
  ] = useState<SortDirection>("asc");

  /* =======================================================
     POSICIONES GUARDADAS
  ======================================================= */

  const [
    positions,
    setPositions,
  ] = useState<
    Record<string, EsmsPosition>
  >({});

  function getPlayerKey(
    player: GlobalEsmsPlayer
  ) {
    return `${player.teamCode}:${player.name}`;
  }

  useEffect(() => {
    const resolved: Record<
      string,
      EsmsPosition
    > = {};

    for (const player of players) {
      const playerKey =
        getPlayerKey(player);

      const storageKey =
        `manager-tools-position:${playerKey}`;

      const previousPosition =
        localStorage.getItem(
          storageKey
        ) as EsmsPosition | null;

      if (
        !hasMainRatingTie(player)
      ) {
        const currentPosition =
          getPlayerProfile(player);

        resolved[playerKey] =
          currentPosition;

        localStorage.setItem(
          storageKey,
          currentPosition
        );

        continue;
      }

      if (previousPosition) {
        resolved[playerKey] =
          previousPosition;

        continue;
      }

      resolved[playerKey] =
        getTieFallbackPosition(
          player
        );
    }

    setPositions(resolved);
  }, [players]);

  function resolvePosition(
    player: GlobalEsmsPlayer
  ): EsmsPosition {
    return (
      positions[
        getPlayerKey(player)
      ] ??
      getPlayerProfile(player)
    );
  }

  /* =======================================================
     EQUIPOS
  ======================================================= */

  const teams = useMemo(() => {
    const map = new Map<
      string,
      string
    >();

    for (const player of players) {
      map.set(
        player.teamCode,
        player.teamName
      );
    }

    return Array.from(
      map.entries()
    )
      .map(([code, name]) => ({
        code,
        name,
      }))
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "es"
        )
      );
  }, [players]);

  /* =======================================================
     NACIONALIDADES
  ======================================================= */

  const nationalities =
    useMemo(() => {
      return Array.from(
        new Set(
          players
            .map((player) =>
              player.nat
                .trim()
                .toLowerCase()
            )
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(b)
      );
    }, [players]);

  /* =======================================================
     AÑADIR FILTRO
  ======================================================= */

  function addAdvancedFilter() {
    setAdvancedFilters(
      (current) => [
        ...current,
        {
          id: nextFilterId,

          /*
           * El filtro nuevo empieza en Edad.
           * El usuario puede cambiarlo
           * inmediatamente.
           */
          type: "age",

          min: "",
          max: "",
          value: "",
        },
      ]
    );

    setNextFilterId(
      (current) => current + 1
    );
  }

  /* =======================================================
     BORRAR FILTRO
  ======================================================= */

  function removeAdvancedFilter(
    id: number
  ) {
    setAdvancedFilters(
      (current) =>
        current.filter(
          (filter) =>
            filter.id !== id
        )
    );
  }

  /* =======================================================
     CAMBIAR TIPO
  ======================================================= */

  function changeFilterType(
    id: number,
    type: AdvancedFilterType
  ) {
    setAdvancedFilters(
      (current) =>
        current.map((filter) =>
          filter.id === id
            ? {
                ...filter,
                type,
                min: "",
                max: "",
                value: "",
              }
            : filter
        )
    );
  }

  /* =======================================================
     ACTUALIZAR MÍNIMO
  ======================================================= */

  function changeFilterMin(
    id: number,
    min: string
  ) {
    setAdvancedFilters(
      (current) =>
        current.map((filter) =>
          filter.id === id
            ? {
                ...filter,
                min,
              }
            : filter
        )
    );
  }

  /* =======================================================
     ACTUALIZAR MÁXIMO
  ======================================================= */

  function changeFilterMax(
    id: number,
    max: string
  ) {
    setAdvancedFilters(
      (current) =>
        current.map((filter) =>
          filter.id === id
            ? {
                ...filter,
                max,
              }
            : filter
        )
    );
  }

  /* =======================================================
     ACTUALIZAR VALOR
     Se utiliza para nacionalidad.
  ======================================================= */

  function changeFilterValue(
    id: number,
    value: string
  ) {
    setAdvancedFilters(
      (current) =>
        current.map((filter) =>
          filter.id === id
            ? {
                ...filter,
                value,
              }
            : filter
        )
    );
  }

  /* =======================================================
     COMPROBAR FILTRO NUMÉRICO
  ======================================================= */

  function matchesNumericFilter(
    playerValue: number,
    filter: AdvancedFilter
  ) {
    if (
      filter.min !== "" &&
      playerValue <
        Number(filter.min)
    ) {
      return false;
    }

    if (
      filter.max !== "" &&
      playerValue >
        Number(filter.max)
    ) {
      return false;
    }

    return true;
  }

  /* =======================================================
     COMPROBAR FILTROS AVANZADOS
  ======================================================= */

  function matchesAdvancedFilters(
    player: GlobalEsmsPlayer
  ) {
    /*
     * TODOS los filtros creados deben
     * cumplirse.
     *
     * Es decir:
     *
     * Edad 18-23
     * Y
     * Ps 18-20
     * Y
     * Nacionalidad ESP
     *
     * etc.
     */
    return advancedFilters.every(
      (filter) => {
        switch (filter.type) {
          case "nat":
            /*
             * Si todavía no hemos elegido
             * nacionalidad, este filtro
             * no restringe resultados.
             */
            if (!filter.value) {
              return true;
            }

            return (
              player.nat
                .trim()
                .toLowerCase() ===
              filter.value
            );

          case "age":
            return matchesNumericFilter(
              player.age,
              filter
            );

          case "st":
            return matchesNumericFilter(
              player.st,
              filter
            );

          case "tk":
            return matchesNumericFilter(
              player.tk,
              filter
            );

          case "ps":
            return matchesNumericFilter(
              player.ps,
              filter
            );

          case "sh":
            return matchesNumericFilter(
              player.sh,
              filter
            );

          case "kab":
            return matchesNumericFilter(
              player.kab,
              filter
            );

          case "tab":
            return matchesNumericFilter(
              player.tab,
              filter
            );

          case "pab":
            return matchesNumericFilter(
              player.pab,
              filter
            );

          case "sab":
            return matchesNumericFilter(
              player.sab,
              filter
            );

          default:
            return true;
        }
      }
    );
  }

  /* =======================================================
     FILTRAR JUGADORES
  ======================================================= */

  const filteredPlayers =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return players.filter(
        (player) => {
          const position =
            resolvePosition(player);

          /*
           * Nombre
           */
          if (
            normalizedSearch &&
            !player.name
              .toLowerCase()
              .includes(
                normalizedSearch
              )
          ) {
            return false;
          }

          /*
           * Equipo
           */
          if (
            teamFilter !== "ALL" &&
            player.teamCode !==
              teamFilter
          ) {
            return false;
          }

          /*
           * Posición
           */
          if (
            positionFilter !==
              "ALL" &&
            position !==
              positionFilter
          ) {
            return false;
          }

          /*
           * Filtros avanzados
           */
          if (
            !matchesAdvancedFilters(
              player
            )
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      players,
      search,
      teamFilter,
      positionFilter,
      advancedFilters,
      positions,
    ]);

  /* =======================================================
     ORDENACIÓN
  ======================================================= */

  const sortedPlayers =
    useMemo(() => {
      if (!sortKey) {
        return filteredPlayers;
      }

      return [
        ...filteredPlayers,
      ].sort((a, b) => {
        let result = 0;

        if (
          sortKey === "position"
        ) {
          result =
            POSITION_ORDER[
              resolvePosition(a)
            ] -
            POSITION_ORDER[
              resolvePosition(b)
            ];
        } else {
          const aValue =
            a[sortKey];

          const bValue =
            b[sortKey];

          if (
            typeof aValue ===
              "number" &&
            typeof bValue ===
              "number"
          ) {
            result =
              aValue - bValue;
          } else {
            result =
              String(
                aValue
              ).localeCompare(
                String(bValue),
                "es",
                {
                  sensitivity:
                    "base",
                }
              );
          }
        }

        return sortDirection ===
          "asc"
          ? result
          : -result;
      });
    }, [
      filteredPlayers,
      sortKey,
      sortDirection,
      positions,
    ]);

  /* =======================================================
     ORDENAR
  ======================================================= */

  function handleSort(
    key: SortKey
  ) {
    if (sortKey === key) {
      setSortDirection(
        (current) =>
          current === "asc"
            ? "desc"
            : "asc"
      );

      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  /* =======================================================
     LIMPIAR
  ======================================================= */

  function clearFilters() {
    setSearch("");
    setTeamFilter("ALL");
    setPositionFilter("ALL");

    /*
     * Eliminamos también todas las
     * líneas de filtros avanzados.
     */
    setAdvancedFilters([]);
  }

  /* =======================================================
     CABECERA ORDENABLE
  ======================================================= */

  function SortHeader({
    label,
    field,
    align = "center",
  }: {
    label: string;
    field: SortKey;
    align?: "left" | "center";
  }) {
    const active =
      sortKey === field;

    return (
      <th
        onClick={() =>
          handleSort(field)
        }
        className={`
          cursor-pointer
          select-none
          whitespace-nowrap
          px-3
          py-3
          transition
          hover:bg-slate-700

          ${
            align === "left"
              ? "text-left"
              : "text-center"
          }
        `}
      >
        {label}

        {active && (
          <span
            className="
              ml-2
              text-xs
              text-blue-400
            "
          >
            {sortDirection ===
            "asc"
              ? "▲"
              : "▼"}
          </span>
        )}
      </th>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div>
      {/* ===================================================
          FILTROS PRINCIPALES
      =================================================== */}

      <div
        className="
          flex
          flex-wrap
          gap-3
        "
      >
        {/* BUSCAR JUGADOR */}

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Buscar jugador..."
          className="
            min-w-[220px]
            flex-1
            rounded-lg
            border
            border-slate-700
            bg-slate-800
            px-4
            py-3
            text-sm
            text-white
            outline-none
            placeholder:text-slate-500
            focus:border-blue-500
          "
        />

        {/* EQUIPO */}

        <select
          value={teamFilter}
          onChange={(event) =>
            setTeamFilter(
              event.target.value
            )
          }
          className="
            min-w-[200px]
            rounded-lg
            border
            border-slate-700
            bg-slate-800
            px-3
            py-3
            text-sm
            text-white
            outline-none
          "
        >
          <option value="ALL">
            Todos los equipos
          </option>

          {teams.map((team) => (
            <option
              key={team.code}
              value={team.code}
            >
              {team.name}
            </option>
          ))}
        </select>

        {/* POSICIÓN */}

        <select
          value={
            positionFilter
          }
          onChange={(event) =>
            setPositionFilter(
              event.target.value
            )
          }
          className="
            min-w-[170px]
            rounded-lg
            border
            border-slate-700
            bg-slate-800
            px-3
            py-3
            text-sm
            text-white
            outline-none
          "
        >
          <option value="ALL">
            Todas posiciones
          </option>

          <option value="GK">
            GK
          </option>

          <option value="DF">
            DF
          </option>

          <option value="DM">
            DM
          </option>

          <option value="MF">
            MF
          </option>

          <option value="AM">
            AM
          </option>

          <option value="FW">
            FW
          </option>
        </select>

        {/* BOTÓN AÑADIR FILTRO */}

        <button
          type="button"
          onClick={
            addAdvancedFilter
          }
          className="
            whitespace-nowrap
            rounded-lg
            bg-emerald-500
            px-5
            py-3
            text-sm
            font-bold
            text-white
            transition
            hover:bg-emerald-400
          "
        >
          + Filtros Avanzados
        </button>
      </div>

      {/* ===================================================
          FILTROS AVANZADOS DINÁMICOS
      =================================================== */}

      {advancedFilters.length >
        0 && (
        <div
          className="
            mt-3
            space-y-2
          "
        >
          {advancedFilters.map(
            (filter) => (
              <div
                key={filter.id}
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-3
                  rounded-lg
                  border
                  border-slate-800
                  bg-slate-900/60
                  p-3
                "
              >
                {/* TIPO DE FILTRO */}

                <select
                  value={
                    filter.type
                  }
                  onChange={(
                    event
                  ) =>
                    changeFilterType(
                      filter.id,
                      event.target
                        .value as AdvancedFilterType
                    )
                  }
                  className="
                    min-w-[150px]
                    rounded-md
                    border
                    border-slate-700
                    bg-slate-800
                    px-3
                    py-2
                    text-sm
                    text-white
                    outline-none
                    focus:border-blue-500
                  "
                >
                  {ADVANCED_FILTER_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>

                {/* =========================================
                    NACIONALIDAD
                ========================================= */}

                {filter.type ===
                "nat" ? (
                  <>
                    <span
                      className="
                        text-sm
                        text-slate-400
                      "
                    >
                      Es
                    </span>

                    <select
                      value={
                        filter.value
                      }
                      onChange={(
                        event
                      ) =>
                        changeFilterValue(
                          filter.id,
                          event.target
                            .value
                        )
                      }
                      className="
                        min-w-[220px]
                        rounded-md
                        border
                        border-slate-700
                        bg-slate-800
                        px-3
                        py-2
                        text-sm
                        text-white
                        outline-none
                        focus:border-blue-500
                      "
                    >
                      <option value="">
                        Seleccionar nacionalidad
                      </option>

                      {nationalities.map(
                        (nat) => (
                          <option
                            key={
                              nat
                            }
                            value={
                              nat
                            }
                          >
                            {nat.toUpperCase()}
                          </option>
                        )
                      )}
                    </select>
                  </>
                ) : (
                  <>
                    {/* =====================================
                        FILTROS NUMÉRICOS
                    ===================================== */}

                    <span
                      className="
                        text-sm
                        text-slate-400
                      "
                    >
                      Entre
                    </span>

                    <input
                      type="number"
                      value={
                        filter.min
                      }
                      onChange={(
                        event
                      ) =>
                        changeFilterMin(
                          filter.id,
                          event.target
                            .value
                        )
                      }
                      placeholder="Mín"
                      className="
                        w-[150px]
                        rounded-md
                        border
                        border-slate-700
                        bg-slate-800
                        px-3
                        py-2
                        text-sm
                        text-white
                        outline-none
                        placeholder:text-slate-500
                        focus:border-blue-500
                      "
                    />

                    <span
                      className="
                        text-sm
                        text-slate-400
                      "
                    >
                      y
                    </span>

                    <input
                      type="number"
                      value={
                        filter.max
                      }
                      onChange={(
                        event
                      ) =>
                        changeFilterMax(
                          filter.id,
                          event.target
                            .value
                        )
                      }
                      placeholder="Máx"
                      className="
                        w-[150px]
                        rounded-md
                        border
                        border-slate-700
                        bg-slate-800
                        px-3
                        py-2
                        text-sm
                        text-white
                        outline-none
                        placeholder:text-slate-500
                        focus:border-blue-500
                      "
                    />
                  </>
                )}

                {/* BORRAR FILTRO */}

                <button
                  type="button"
                  onClick={() =>
                    removeAdvancedFilter(
                      filter.id
                    )
                  }
                  title="Eliminar filtro"
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-md
                    bg-red-500
                    text-xl
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

      {/* ===================================================
          CONTADOR
      =================================================== */}

      <div
        className="
          mt-4
          flex
          items-center
          justify-between
          text-sm
          text-slate-500
        "
      >
        <span>
          {sortedPlayers.length}{" "}
          jugadores encontrados
        </span>

        {(search ||
          teamFilter !== "ALL" ||
          positionFilter !==
            "ALL" ||
          advancedFilters.length >
            0) && (
          <button
            type="button"
            onClick={
              clearFilters
            }
            className="
              text-blue-400
              hover:text-blue-300
            "
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ===================================================
          TABLA
      =================================================== */}

      <div
        className="
          mt-3
          overflow-x-auto
          rounded-xl
          border
          border-slate-800
        "
      >
        <table
          className="
            w-full
            min-w-max
            text-sm
          "
        >
          <thead
            className="
              bg-slate-800
              text-slate-200
            "
          >
            <tr>
              <SortHeader
                label="Nombre"
                field="name"
                align="left"
              />

              <SortHeader
                label="Equipo"
                field="teamName"
                align="left"
              />

              <SortHeader
                label="Edad"
                field="age"
              />

              <SortHeader
                label="Nat"
                field="nat"
              />

              <SortHeader
                label="Pos"
                field="position"
              />

              <SortHeader
                label="St"
                field="st"
              />

              <SortHeader
                label="Tk"
                field="tk"
              />

              <SortHeader
                label="Ps"
                field="ps"
              />

              <SortHeader
                label="Sh"
                field="sh"
              />

              <SortHeader
                label="KAb"
                field="kab"
              />

              <SortHeader
                label="TAb"
                field="tab"
              />

              <SortHeader
                label="PAb"
                field="pab"
              />

              <SortHeader
                label="SAb"
                field="sab"
              />
            </tr>
          </thead>

          <tbody>
            {sortedPlayers.map(
              (
                player,
                index
              ) => {
                const position =
                  resolvePosition(
                    player
                  );

                const flagUrl =
                  getFlagUrl(
                    player.nat
                  );

                return (
                  <tr
                    key={`${player.teamCode}-${player.name}-${index}`}
                    className="
                      border-t
                      border-slate-800
                      hover:bg-slate-900
                    "
                  >
                    {/* NOMBRE */}

                    <td
                      className="
                        whitespace-nowrap
                        px-3
                        py-3
                        font-medium
                        text-white
                      "
                    >
                      {player.name}
                    </td>

                    {/* EQUIPO */}

                    <td
                      className="
                        whitespace-nowrap
                        px-3
                        py-3
                        text-slate-300
                      "
                    >
                      {
                        player.teamName
                      }
                    </td>

                    {/* EDAD */}

                    <td className="px-3 py-3 text-center">
                      {player.age}
                    </td>

                    {/* NACIONALIDAD */}

                    <td
                      className="
                        px-3
                        py-3
                        text-center
                      "
                      title={
                        player.nat.toUpperCase()
                      }
                    >
                      {flagUrl ? (
                        <img
                          src={
                            flagUrl
                          }
                          alt={
                            player.nat
                          }
                          width={24}
                          height={18}
                          loading="lazy"
                          className="
                            mx-auto
                            h-[18px]
                            w-6
                            rounded-sm
                            object-cover
                          "
                        />
                      ) : (
                        <span
                          className="
                            text-xs
                            font-bold
                            uppercase
                            text-slate-500
                          "
                        >
                          {
                            player.nat
                          }
                        </span>
                      )}
                    </td>

                    {/* POSICIÓN */}

                    <td className="p-0">
                      <div
                        className={`
                          min-w-16
                          px-4
                          py-3
                          text-center
                          font-bold

                          ${
                            POSITION_COLORS[
                              position
                            ]
                          }
                        `}
                      >
                        {position}
                      </div>
                    </td>

                    {/* MEDIAS */}

                    <td className="px-3 py-3 text-center">
                      {player.st}
                    </td>

                    <td className="px-3 py-3 text-center">
                      {player.tk}
                    </td>

                    <td className="px-3 py-3 text-center">
                      {player.ps}
                    </td>

                    <td className="px-3 py-3 text-center">
                      {player.sh}
                    </td>

                    {/* EXPERIENCIA */}

                    <td className="px-3 py-3 text-center">
                      {player.kab}
                    </td>

                    <td className="px-3 py-3 text-center">
                      {player.tab}
                    </td>

                    <td className="px-3 py-3 text-center">
                      {player.pab}
                    </td>

                    <td className="px-3 py-3 text-center">
                      {player.sab}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}