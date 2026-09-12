"use client";

import { useMemo, useState } from "react";

type MovementType =
  | "PENDING"
  | "TRANSFER"
  | "LOAN"
  | "LOAN_RETURN";

type Transfer = {
  id: string;
  player_id: string;
  from_team_code: string | null;
  to_team_code: string | null;
  transfer_date: string;
  fee: number | string | null;
  season_id: string | null;
  movement_type: MovementType;
  owner_team_code: string | null;
  loan_start_date: string | null;
  loan_end_date: string | null;
  loan_fee: number | string | null;
  purchase_option: boolean;
  purchase_option_fee: number | string | null;
  parent_movement_id: string | null;
  notes: string | null;
  deal_id: string | null;
  deal_role: "PRIMARY" | "EXCHANGE";
};

type Player = {
  id: string;
  esms_name: string;
  current_team_code: string | null;
  owner_team_code: string | null;
};

type Season = {
  id: string;
  name: string;
};

type Props = {
  initialTransfers: Transfer[];
  players: Player[];
  seasons: Season[];
  teams: string[];
};

const TYPE_LABELS: Record<MovementType, string> = {
  PENDING: "Pendiente",
  TRANSFER: "Traspaso",
  LOAN: "Cesion",
  LOAN_RETURN: "Fin de cesion",
};

const CREATE_TYPES: Array<{
  type: MovementType;
  title: string;
  text: string;
  example: string;
}> = [
  {
    type: "TRANSFER",
    title: "Traspaso",
    text: "Un jugador cambia de club de forma definitiva.",
    example: "Ejemplo: A vende un jugador a B por dinero.",
  },
  {
    type: "LOAN",
    title: "Cesion",
    text: "El jugador va temporalmente a otro club.",
    example: "Ejemplo: A lo presta a B hasta final de temporada.",
  },
  {
    type: "LOAN_RETURN",
    title: "Fin de cesion",
    text: "El jugador vuelve a su club propietario.",
    example: "Elige la cesion activa y el panel rellena el resto.",
  },
  {
    type: "PENDING",
    title: "Pendiente",
    text: "Guarda un rumor o acuerdo sin mover plantillas.",
    example: "Ejemplo: acuerdo anunciado pero no inscrito.",
  },
];

const OPERATION_HELP: Record<MovementType, {
  title: string;
  steps: string[];
  result: string;
}> = {
  TRANSFER: {
    title: "Traspaso o intercambio",
    steps: [
      "Elige si es un traspaso normal o un intercambio.",
      "Selecciona el club que entrega jugadores y el club que recibe.",
      "Añade jugadores y dinero solo donde haga falta.",
    ],
    result:
      "Se moveran las plantillas de Dropbox y la operacion aparecera en Mercado.",
  },
  LOAN: {
    title: "Cesion",
    steps: [
      "Elige el club propietario y el club donde jugara cedido.",
      "Indica inicio, final, coste y opcion de compra si existe.",
      "Escribe las condiciones importantes en lenguaje normal.",
    ],
    result:
      "El jugador cambiara de plantilla hasta que registres el fin de cesion.",
  },
  LOAN_RETURN: {
    title: "Fin de cesion",
    steps: [
      "Si existe una cesion activa, seleccionala en el desplegable.",
      "El panel rellenara jugador, origen y destino automaticamente.",
      "Revisa la fecha y crea el regreso.",
    ],
    result:
      "El jugador vuelve a la plantilla del propietario y Mercado muestra el regreso.",
  },
  PENDING: {
    title: "Movimiento pendiente",
    steps: [
      "Elige jugador, club de origen y club posible de destino.",
      "Usalo para rumores, acuerdos verbales o operaciones sin confirmar.",
      "Cuando sea oficial, crea el movimiento definitivo correspondiente.",
    ],
    result:
      "No cambia plantillas. Solo deja el registro visible como pendiente.",
  },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyMovement(
  players: Player[],
  teams: string[],
  seasons: Season[]
): Omit<Transfer, "id"> {
  const firstTeam =
    players.find((player) => player.current_team_code)
      ?.current_team_code ??
    teams[0] ??
    null;

  const firstPlayer =
    players
      .filter(
        (player) =>
          !firstTeam ||
          player.current_team_code === firstTeam
      )
      .sort((a, b) =>
        a.esms_name.localeCompare(b.esms_name)
      )[0] ?? null;

  return {
    player_id: firstPlayer?.id ?? players[0]?.id ?? "",
    from_team_code: firstTeam,
    to_team_code:
      teams.find((team) => team !== firstTeam) ??
      firstTeam,
    transfer_date: today(),
    fee: null,
    season_id: seasons[0]?.id ?? null,
    movement_type: "TRANSFER",
    owner_team_code: firstTeam,
    loan_start_date: today(),
    loan_end_date: null,
    loan_fee: null,
    purchase_option: false,
    purchase_option_fee: null,
    parent_movement_id: null,
    notes: null,
    deal_id: null,
    deal_role: "PRIMARY",
  };
}

export default function TransferHistoryAdmin({
  initialTransfers,
  players,
  seasons,
  teams,
}: Props) {
  const [transfers, setTransfers] =
    useState(initialTransfers);
  const [draft, setDraft] =
    useState(() => emptyMovement(players, teams, seasons));
  const [selectedTeam, setSelectedTeam] =
    useState(draft.from_team_code ?? "");
  const [transferMode, setTransferMode] =
    useState<"TRANSFER" | "EXCHANGE">("TRANSFER");
  const [teamAPlayerIds, setTeamAPlayerIds] =
    useState<string[]>([]);
  const [extraPlayerIds, setExtraPlayerIds] =
    useState<string[]>([]);
  const [exchangePlayerIds, setExchangePlayerIds] =
    useState<string[]>([]);
  const [moneyFromTeamA, setMoneyFromTeamA] =
    useState<string>("");
  const [moneyFromTeamB, setMoneyFromTeamB] =
    useState<string>("");
  const [creating, setCreating] =
    useState(false);
  const [saving, setSaving] =
    useState<string | null>(null);
  const [message, setMessage] =
    useState<{
      tone: "ok" | "error";
      text: string;
    } | null>(null);
  const [filters, setFilters] =
    useState({
      query: "",
      team: "ALL",
      type: "ALL",
      season: "ALL",
    });

  const playerById = useMemo(
    () =>
      new Map(
        players.map((player) => [
          player.id,
          player,
        ])
      ),
    [players]
  );

  const playersByTeam = useMemo(() => {
    const map = new Map<string, Player[]>();

    for (const player of players) {
      const team = player.current_team_code ?? "";
      const rows = map.get(team) ?? [];
      rows.push(player);
      map.set(team, rows);
    }

    for (const rows of map.values()) {
      rows.sort((a, b) =>
        a.esms_name.localeCompare(b.esms_name)
      );
    }

    return map;
  }, [players]);

  const filteredPlayers =
    playersByTeam.get(selectedTeam) ?? [];

  const exchangePlayers =
    playersByTeam.get(draft.to_team_code ?? "") ?? [];

  const activeLoans = useMemo(
    () =>
      transfers.filter(
        (transfer) =>
          transfer.movement_type === "LOAN" &&
          !transfers.some(
            (candidate) =>
              candidate.parent_movement_id === transfer.id &&
              (candidate.movement_type ===
                "LOAN_RETURN" ||
                candidate.movement_type === "TRANSFER")
          )
      ),
    [transfers]
  );

  const filteredTransfers = useMemo(() => {
    const query = filters.query
      .trim()
      .toLowerCase();

    return transfers.filter((transfer) => {
      const playerName =
        playerById
          .get(transfer.player_id)
          ?.esms_name.replaceAll("_", " ")
          .toLowerCase() ?? "";

      const matchesQuery =
        !query ||
        playerName.includes(query) ||
        transfer.from_team_code
          ?.toLowerCase()
          .includes(query) ||
        transfer.to_team_code
          ?.toLowerCase()
          .includes(query);

      const matchesTeam =
        filters.team === "ALL" ||
        transfer.from_team_code === filters.team ||
        transfer.to_team_code === filters.team ||
        transfer.owner_team_code === filters.team;

      const matchesType =
        filters.type === "ALL" ||
        transfer.movement_type === filters.type;

      const matchesSeason =
        filters.season === "ALL" ||
        transfer.season_id === filters.season;

      return (
        matchesQuery &&
        matchesTeam &&
        matchesType &&
        matchesSeason
      );
    });
  }, [filters, playerById, transfers]);

  const stats = useMemo(
    () => ({
      transfers: transfers.filter(
        (item) => item.movement_type === "TRANSFER"
      ).length,
      loans: transfers.filter(
        (item) => item.movement_type === "LOAN"
      ).length,
      returns: transfers.filter(
        (item) => item.movement_type === "LOAN_RETURN"
      ).length,
      exchanges: new Set(
        transfers
          .filter((item) => item.deal_id)
          .map((item) => item.deal_id)
      ).size,
    }),
    [transfers]
  );

  const operationHelp =
    OPERATION_HELP[draft.movement_type];

  const selectedMainPlayer =
    playerById.get(draft.player_id) ?? null;

  const teamAPlayers = teamAPlayerIds
    .map((id) => playerById.get(id))
    .filter((player): player is Player => Boolean(player));

  const exchangeSelectedPlayers = exchangePlayerIds
    .map((id) => playerById.get(id))
    .filter((player): player is Player => Boolean(player));

  const extraSelectedPlayers = extraPlayerIds
    .map((id) => playerById.get(id))
    .filter((player): player is Player => Boolean(player));

  const summaryLines = buildSummaryLines({
    draft,
    transferMode,
    selectedTeam,
    selectedMainPlayer,
    teamAPlayers,
    exchangeSelectedPlayers,
    extraSelectedPlayers,
    moneyFromTeamA,
    moneyFromTeamB,
  });

  const missingHelp = getMissingHelp({
    draft,
    transferMode,
    selectedTeam,
    teamAPlayerIds,
    exchangePlayerIds,
  });

  function setDraftType(nextType: MovementType) {
    setDraft((current) =>
      normalizeForType(current, nextType)
    );
    setTransferMode("TRANSFER");
    setTeamAPlayerIds([]);
    setExtraPlayerIds([]);
    setExchangePlayerIds([]);
    setMoneyFromTeamA("");
    setMoneyFromTeamB("");
  }

  function updateLocal(
    id: string,
    patch: Partial<Transfer>
  ) {
    setTransfers((current) =>
      current.map((transfer) =>
        transfer.id === id
          ? { ...transfer, ...patch }
          : transfer
      )
    );
  }

  function chooseSourceTeam(team: string) {
    const firstPlayer =
      (playersByTeam.get(team) ?? [])[0] ?? null;

    setSelectedTeam(team);
    setTeamAPlayerIds([]);
    setExtraPlayerIds([]);
    setDraft((current) => ({
      ...current,
      from_team_code: team || null,
      owner_team_code:
        current.movement_type === "LOAN"
          ? team || null
          : current.owner_team_code,
      player_id: firstPlayer?.id ?? "",
    }));
  }

  function chooseParentLoan(loanId: string) {
    const loan =
      activeLoans.find((item) => item.id === loanId) ??
      null;

    if (!loan) return;

    setSelectedTeam(loan.to_team_code ?? "");
    setDraft((current) => ({
      ...current,
      movement_type: "LOAN_RETURN",
      player_id: loan.player_id,
      from_team_code: loan.to_team_code,
      to_team_code:
        loan.owner_team_code ??
        loan.from_team_code ??
        null,
      owner_team_code:
        loan.owner_team_code ??
        loan.from_team_code ??
        null,
      parent_movement_id: loan.id,
    }));
  }

  async function save(transfer: Transfer) {
    setSaving(transfer.id);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/fichajes",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transfer),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "No se pudo guardar el movimiento."
        );
      }

      setTransfers((current) =>
        current.map((row) =>
          row.id === transfer.id
            ? payload.transfer
            : row
        )
      );

      setMessage({
        tone: "ok",
        text: "Movimiento guardado.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Error al guardar.",
      });
    } finally {
      setSaving(null);
    }
  }

  async function createMovement() {
    setCreating(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/fichajes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...draft,
            player_ids:
              draft.movement_type === "TRANSFER" &&
              transferMode === "EXCHANGE"
                ? teamAPlayerIds
                : [],
            extra_player_ids:
              draft.movement_type === "TRANSFER"
              && transferMode === "TRANSFER"
                ? extraPlayerIds
                : [],
            exchange_player_ids:
              draft.movement_type === "TRANSFER"
              && transferMode === "EXCHANGE"
                ? exchangePlayerIds
                : [],
            money_from_team_a:
              draft.movement_type === "TRANSFER" &&
              transferMode === "EXCHANGE"
                ? moneyFromTeamA
                : undefined,
            money_from_team_b:
              draft.movement_type === "TRANSFER" &&
              transferMode === "EXCHANGE"
                ? moneyFromTeamB
                : undefined,
          }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "No se pudo crear el movimiento."
        );
      }

      const createdTransfers: Transfer[] =
        Array.isArray(payload.transfers)
          ? payload.transfers
          : payload.transfer
            ? [payload.transfer]
            : [];

      setTransfers((current) => [
        ...createdTransfers,
        ...current,
      ]);
      setTransferMode("TRANSFER");
      setTeamAPlayerIds([]);
      setExtraPlayerIds([]);
      setExchangePlayerIds([]);
      setMoneyFromTeamA("");
      setMoneyFromTeamB("");
      setDraft(emptyMovement(players, teams, seasons));

      setMessage({
        tone: "ok",
        text: payload.rosters_updated
          ? "Movimiento creado, plantillas de Dropbox actualizadas y mercado listo para la web."
          : "Movimiento creado sin tocar plantillas.",
      });

      window.setTimeout(() => {
        window.location.reload();
      }, 650);
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Error al crear.",
      });
    } finally {
      setCreating(false);
    }
  }

  const canCreate =
    (draft.movement_type !== "TRANSFER" ||
      transferMode !== "EXCHANGE" ||
      teamAPlayerIds.length > 0) &&
    (draft.movement_type === "TRANSFER" &&
    transferMode === "EXCHANGE"
      ? exchangePlayerIds.length > 0
      : Boolean(draft.player_id)) &&
    Boolean(draft.to_team_code) &&
    Boolean(draft.transfer_date) &&
    (draft.movement_type !== "LOAN" ||
      Boolean(draft.loan_end_date));

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-5">
      <section className="app-panel rounded-[28px] p-6 sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="app-eyebrow">
              Administracion
            </div>
            <h1 className="mt-1.5 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
              Mercado y plantillas
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--mt-muted)]">
              Crea traspasos, intercambios, cesiones y
              regresos. Al crear movimientos definitivos se
              actualizan las plantillas oficiales de Dropbox,
              se sincroniza el jugador en Supabase y el mercado
              queda visible en la web.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label="Traspasos" value={stats.transfers} />
            <Kpi label="Cesiones" value={stats.loans} />
            <Kpi label="Regresos" value={stats.returns} />
            <Kpi label="Intercambios" value={stats.exchanges} />
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={`rounded-[13px] border px-4 py-3 text-sm font-bold ${
            message.tone === "ok"
              ? "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="app-panel rounded-2xl p-5">
          <div className="flex flex-col gap-4">
            <div>
              <div className="app-eyebrow">
                Nuevo movimiento
              </div>
              <h2 className="mt-1 text-xl font-black text-[var(--mt-text)]">
                Crear operacion paso a paso
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--mt-muted)]">
                Empieza eligiendo que ha pasado. Despues el
                panel solo muestra los campos necesarios para
                ese caso.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {CREATE_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setDraftType(item.type)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    draft.movement_type === item.type
                      ? "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] shadow-[0_16px_40px_rgba(214,166,71,0.18)]"
                      : "border-[var(--mt-line)] bg-[var(--mt-surface)]"
                  }`}
                >
                  <span className="block text-sm font-black text-[var(--mt-text)]">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--mt-muted)]">
                    {item.text}
                  </span>
                  <span className="mt-2 block text-[10px] leading-4 text-[var(--mt-gold-dark)]">
                    {item.example}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] p-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
              Ahora estas creando
            </div>
            <div className="mt-1 text-lg font-black text-[var(--mt-text)]">
              {operationHelp.title}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {operationHelp.steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-3 text-xs leading-5 text-[var(--mt-muted)]"
                >
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--mt-gold-dark)]">
                    Paso {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field
              label={
                draft.movement_type === "TRANSFER" &&
                transferMode === "EXCHANGE"
                  ? "Equipo A"
                  : draft.movement_type === "LOAN"
                    ? "Club propietario"
                    : "Club actual"
              }
              helper={
                draft.movement_type === "LOAN"
                  ? "De quien es el jugador."
                  : "Donde esta ahora el jugador."
              }
            >
              <select
                value={selectedTeam}
                onChange={(event) =>
                  chooseSourceTeam(event.target.value)
                }
                className={inputClass}
              >
                <option value="">Selecciona equipo</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </Field>

            {draft.movement_type === "TRANSFER" &&
            transferMode === "EXCHANGE" ? null : (
              <Field
                label="Jugador"
                helper="Primero elige el club y despues el jugador."
              >
                <select
                  value={draft.player_id}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      player_id: event.target.value,
                    }))
                  }
                  disabled={!selectedTeam}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {!selectedTeam ? (
                    <option value="">Elige equipo</option>
                  ) : filteredPlayers.length === 0 ? (
                    <option value="">
                      Sin jugadores disponibles
                    </option>
                  ) : (
                    filteredPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {displayName(player.esms_name)}
                      </option>
                    ))
                  )}
                </select>
              </Field>
            )}

            <TeamSelect
              label={
                draft.movement_type === "LOAN_RETURN"
                  ? "Vuelve a"
                  : draft.movement_type === "LOAN"
                    ? "Juega cedido en"
                  : draft.movement_type === "TRANSFER" &&
                      transferMode === "EXCHANGE"
                    ? "Equipo B"
                  : "Destino"
              }
              value={draft.to_team_code}
              teams={teams}
              onChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  to_team_code: value,
                }));
                setExchangePlayerIds([]);
              }}
            />

            <Field
              label="Fecha"
              helper="Fecha que se vera en el historial."
            >
              <input
                type="date"
                value={dateInput(draft.transfer_date)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    transfer_date: event.target.value,
                    loan_start_date:
                      current.movement_type === "LOAN"
                        ? current.loan_start_date ??
                          event.target.value
                        : current.loan_start_date,
                  }))
                }
                className={inputClass}
              />
            </Field>

            <SeasonSelect
              value={draft.season_id}
              seasons={seasons}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  season_id: value,
                }))
              }
            />

            {draft.movement_type === "TRANSFER" ? (
              <>
                <Field label="Tipo de operacion">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferMode("TRANSFER");
                        setTeamAPlayerIds([]);
                        setExchangePlayerIds([]);
                        setMoneyFromTeamA("");
                        setMoneyFromTeamB("");
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-black ${
                        transferMode === "TRANSFER"
                          ? "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]"
                          : "border-[var(--mt-line)] bg-[var(--mt-surface)] text-[var(--mt-muted)]"
                      }`}
                    >
                      Solo dinero
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferMode("EXCHANGE");
                        setExtraPlayerIds([]);
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-black ${
                        transferMode === "EXCHANGE"
                          ? "border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]"
                          : "border-[var(--mt-line)] bg-[var(--mt-surface)] text-[var(--mt-muted)]"
                      }`}
                    >
                      Jugadores
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-[var(--mt-muted)]">
                    Usa Solo dinero para compras/ventas. Usa
                    Jugadores cuando ambos equipos entregan
                    futbolistas.
                  </p>
                </Field>

                {transferMode === "TRANSFER" ? (
                <MoneyField
                  label="Dinero que paga el destino"
                  value={draft.fee}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      fee: value,
                    }))
                  }
                />
                ) : null}

                {transferMode === "TRANSFER" ? (
                  <MultiPlayerPicker
                    label="Otros jugadores que tambien van"
                    helper="Opcional. Usalo si el mismo club envia mas de un jugador al destino."
                    players={filteredPlayers.filter(
                      (player) => player.id !== draft.player_id
                    )}
                    selectedIds={extraPlayerIds}
                    onChange={setExtraPlayerIds}
                  />
                ) : (
                  <>
                    <MultiPlayerPicker
                      label={`Jugadores ${selectedTeam || "Equipo A"}`}
                      helper="Elige todos los jugadores que entrega el Equipo A."
                      players={filteredPlayers}
                      selectedIds={teamAPlayerIds}
                      onChange={setTeamAPlayerIds}
                    />

                    <MultiPlayerPicker
                      label={`Jugadores ${draft.to_team_code || "Equipo B"}`}
                      helper="Elige todos los jugadores que entrega el Equipo B."
                      players={exchangePlayers}
                      selectedIds={exchangePlayerIds}
                      onChange={setExchangePlayerIds}
                    />

                    <MoneyField
                      label={`Dinero que paga ${selectedTeam || "Equipo A"}`}
                      value={moneyFromTeamA}
                      onChange={setMoneyFromTeamA}
                    />

                    <MoneyField
                      label={`Dinero que paga ${draft.to_team_code || "Equipo B"}`}
                      value={moneyFromTeamB}
                      onChange={setMoneyFromTeamB}
                    />
                  </>
                )}
              </>
            ) : null}

            {draft.movement_type === "LOAN" ? (
              <>
                <TeamSelect
                  label="Propietario"
                  value={draft.owner_team_code}
                  teams={teams}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      owner_team_code: value,
                    }))
                  }
                />

                <Field label="Inicio cesion">
                  <input
                    type="date"
                    value={dateInput(draft.loan_start_date)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        loan_start_date: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Fin cesion">
                  <input
                    type="date"
                    value={dateInput(draft.loan_end_date)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        loan_end_date: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>

                <MoneyField
                  label="Coste cesion"
                  value={draft.loan_fee}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      loan_fee: value,
                    }))
                  }
                />

                <Field label="Opcion de compra">
                  <label className="flex h-[42px] items-center gap-3 rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 text-xs font-bold text-[var(--mt-muted)]">
                    <input
                      type="checkbox"
                      checked={draft.purchase_option}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          purchase_option:
                            event.target.checked,
                        }))
                      }
                    />
                    Activada
                  </label>
                </Field>

                {draft.purchase_option ? (
                  <MoneyField
                    label="Precio opcion"
                    value={draft.purchase_option_fee}
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        purchase_option_fee: value,
                      }))
                    }
                  />
                ) : null}

                <Field label="Condiciones">
                  <textarea
                    value={draft.notes ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Minutos, salario, objetivos, penalizaciones, restricciones, regreso anticipado..."
                    className={`${inputClass} min-h-28 resize-y leading-5 xl:col-span-2`}
                  />
                </Field>
              </>
            ) : null}

            {draft.movement_type === "LOAN_RETURN" ? (
              <Field label="Cesion activa">
                <select
                  value={draft.parent_movement_id ?? ""}
                  onChange={(event) =>
                    chooseParentLoan(event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">
                    Buscar automaticamente
                  </option>
                  {activeLoans.map((loan) => {
                    const player =
                      playerById.get(loan.player_id);
                    return (
                      <option key={loan.id} value={loan.id}>
                        {displayName(
                          player?.esms_name ?? loan.player_id
                        )}{" "}
                        · {loan.to_team_code} →{" "}
                        {loan.owner_team_code ??
                          loan.from_team_code}
                      </option>
                    );
                  })}
                </select>
              </Field>
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
                  Revisa antes de crear
                </div>
                <div className="mt-2 space-y-1 text-sm leading-6 text-[var(--mt-text)]">
                  {summaryLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--mt-muted)]">
                  {operationHelp.result}
                </p>
                {missingHelp ? (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    Falta: {missingHelp}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={creating || !canCreate}
                onClick={createMovement}
                className="rounded-xl bg-[var(--mt-gold)] px-5 py-3 text-xs font-black uppercase tracking-wide text-[var(--mt-surface)] transition hover:bg-[var(--mt-gold-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creando..."
                  : draft.movement_type === "PENDING"
                    ? "Guardar pendiente"
                    : "Crear y sincronizar"}
              </button>
            </div>
          </div>
        </div>

        <aside className="app-panel-soft rounded-2xl p-5">
          <div className="app-eyebrow">
            Flujo seguro
          </div>
          <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--mt-muted)]">
            <p>
              1. Dropbox se actualiza primero para comprobar
              que el jugador existe en la plantilla de origen.
            </p>
            <p>
              2. Si Supabase falla, se restauran las plantillas
              originales.
            </p>
            <p>
              3. Los intercambios se guardan como una sola
              operacion con todos sus jugadores vinculados.
            </p>
            <p>
              4. Las condiciones de cesion se guardan en notas y
              aparecen en Mercado.
            </p>
          </div>
        </aside>
      </section>

      <section className="app-panel rounded-2xl p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="app-eyebrow">
              Gestion
            </div>
            <h2 className="mt-1 text-xl font-black text-[var(--mt-text)]">
              Movimientos registrados
            </h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <input
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
              placeholder="Buscar jugador o club"
              className={inputClass}
            />
            <select
              value={filters.team}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  team: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="ALL">Todos los clubes</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  type: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="ALL">Todos los tipos</option>
              {Object.entries(TYPE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
            <select
              value={filters.season}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  season: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="ALL">Todas las temporadas</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="border-b border-[var(--mt-line)] bg-[var(--mt-surface)] text-[10px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
              <tr>
                <th className="px-3 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-left">Jugador</th>
                <th className="px-3 py-3 text-left">Tipo</th>
                <th className="px-3 py-3 text-center">De</th>
                <th className="px-3 py-3 text-center">A</th>
                <th className="px-3 py-3 text-left">Temporada</th>
                <th className="px-3 py-3 text-right">Importe</th>
                <th className="px-3 py-3 text-left">Detalles</th>
                <th className="px-3 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map((transfer) => (
                <TransferRow
                  key={transfer.id}
                  transfer={transfer}
                  teams={teams}
                  seasons={seasons}
                  playerName={displayName(
                    playerById.get(transfer.player_id)
                      ?.esms_name ?? transfer.player_id
                  )}
                  saving={saving === transfer.id}
                  onChange={(patch) =>
                    updateLocal(transfer.id, patch)
                  }
                  onSave={() => save(transfer)}
                />
              ))}

              {filteredTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-[var(--mt-muted)]"
                  >
                    No hay movimientos con estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function TransferRow({
  transfer,
  teams,
  seasons,
  playerName,
  saving,
  onChange,
  onSave,
}: {
  transfer: Transfer;
  teams: string[];
  seasons: Season[];
  playerName: string;
  saving: boolean;
  onChange: (patch: Partial<Transfer>) => void;
  onSave: () => void;
}) {
  return (
    <tr className="border-b border-[var(--mt-line)] align-top last:border-0">
      <td className="px-3 py-3">
        <input
          type="date"
          value={dateInput(transfer.transfer_date)}
          onChange={(event) =>
            onChange({
              transfer_date: event.target.value,
            })
          }
          className={`${inputClass} w-36`}
        />
      </td>
      <td className="px-3 py-4">
        <div className="font-black text-[var(--mt-text)]">
          {playerName}
        </div>
        {transfer.deal_id ? (
          <div className="mt-1 text-[9px] font-black uppercase tracking-wide text-[var(--mt-gold-dark)]">
            {transfer.deal_role === "EXCHANGE"
              ? "Jugador incluido"
              : "Operacion principal"}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3">
        <select
          value={transfer.movement_type ?? "TRANSFER"}
          onChange={(event) =>
            onChange(
              normalizeForType(
                transfer,
                event.target.value as MovementType
              )
            )
          }
          className={`${inputClass} w-36`}
        >
          {Object.entries(TYPE_LABELS).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            )
          )}
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          value={transfer.from_team_code ?? ""}
          onChange={(event) =>
            onChange({
              from_team_code:
                event.target.value || null,
              owner_team_code:
                transfer.movement_type === "LOAN"
                  ? event.target.value || null
                  : transfer.owner_team_code,
            })
          }
          className={`${inputClass} w-24`}
        >
          <option value="">-</option>
          {teams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          value={transfer.to_team_code ?? ""}
          onChange={(event) =>
            onChange({
              to_team_code: event.target.value || null,
            })
          }
          className={`${inputClass} w-24`}
        >
          <option value="">-</option>
          {teams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <SeasonSelect
          value={transfer.season_id}
          seasons={seasons}
          onChange={(value) =>
            onChange({
              season_id: value,
            })
          }
          compact
        />
      </td>
      <td className="px-3 py-3">
        {transfer.movement_type === "TRANSFER" ? (
          <MoneyField
            label=""
            value={transfer.fee}
            onChange={(value) =>
              onChange({
                fee: value,
              })
            }
            compact
          />
        ) : transfer.movement_type === "LOAN" ? (
          <MoneyField
            label=""
            value={transfer.loan_fee}
            onChange={(value) =>
              onChange({
                loan_fee: value,
              })
            }
            compact
          />
        ) : (
          <div className="py-2 text-right text-xs text-[var(--mt-muted)]">
            -
          </div>
        )}
      </td>
      <td className="px-3 py-3">
        <MovementDetails
          transfer={transfer}
          teams={teams}
          onChange={onChange}
        />
      </td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rounded-lg bg-[var(--mt-gold)] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[var(--mt-surface)] transition hover:bg-[var(--mt-gold-dark)] disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </td>
    </tr>
  );
}

function MovementDetails({
  transfer,
  teams,
  onChange,
}: {
  transfer: Transfer;
  teams: string[];
  onChange: (patch: Partial<Transfer>) => void;
}) {
  if (transfer.movement_type === "LOAN") {
    return (
      <div className="grid min-w-[460px] grid-cols-3 gap-2">
        <select
          value={transfer.owner_team_code ?? ""}
          onChange={(event) =>
            onChange({
              owner_team_code:
                event.target.value || null,
            })
          }
          className={inputClass}
        >
          <option value="">Propietario</option>
          {teams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateInput(transfer.loan_start_date)}
          onChange={(event) =>
            onChange({
              loan_start_date: event.target.value,
            })
          }
          className={inputClass}
        />
        <input
          type="date"
          value={dateInput(transfer.loan_end_date)}
          onChange={(event) =>
            onChange({
              loan_end_date: event.target.value,
            })
          }
          className={inputClass}
        />
        <label className="col-span-1 flex items-center gap-2 rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2 text-[10px] font-bold text-[var(--mt-muted)]">
          <input
            type="checkbox"
            checked={transfer.purchase_option}
            onChange={(event) =>
              onChange({
                purchase_option:
                  event.target.checked,
              })
            }
          />
          Opcion
        </label>
        {transfer.purchase_option ? (
          <div className="col-span-2">
            <MoneyField
              label=""
              value={transfer.purchase_option_fee}
              onChange={(value) =>
                onChange({
                  purchase_option_fee: value,
                })
              }
              compact
            />
          </div>
        ) : (
          <div className="col-span-2 py-2 text-xs text-[var(--mt-muted)]">
            Sin opcion de compra
          </div>
        )}
        <textarea
          value={transfer.notes ?? ""}
          onChange={(event) =>
            onChange({
              notes: event.target.value,
            })
          }
          rows={3}
          placeholder="Condiciones de cesion"
          className={`${inputClass} col-span-3 min-h-20 resize-y leading-5`}
        />
      </div>
    );
  }

  if (transfer.movement_type === "LOAN_RETURN") {
    return (
      <div className="min-w-[260px] text-xs leading-5 text-[var(--mt-muted)]">
        Regreso al club propietario. El sistema intenta
        enlazar la cesion activa si no eliges una manualmente.
      </div>
    );
  }

  if (transfer.movement_type === "PENDING") {
    return (
      <div className="min-w-[260px] text-xs leading-5 text-[var(--mt-gold-dark)]">
        Registro pendiente. No cuenta para economia ni cambia
        plantillas.
      </div>
    );
  }

  return (
    <div className="min-w-[260px] text-xs leading-5 text-[var(--mt-muted)]">
      Traspaso permanente. Si forma parte de un intercambio,
      sus filas comparten el mismo ID de operacion.
    </div>
  );
}

function buildSummaryLines({
  draft,
  transferMode,
  selectedTeam,
  selectedMainPlayer,
  teamAPlayers,
  exchangeSelectedPlayers,
  extraSelectedPlayers,
  moneyFromTeamA,
  moneyFromTeamB,
}: {
  draft: Omit<Transfer, "id">;
  transferMode: "TRANSFER" | "EXCHANGE";
  selectedTeam: string;
  selectedMainPlayer: Player | null;
  teamAPlayers: Player[];
  exchangeSelectedPlayers: Player[];
  extraSelectedPlayers: Player[];
  moneyFromTeamA: string;
  moneyFromTeamB: string;
}) {
  const from = selectedTeam || draft.from_team_code || "origen";
  const to = draft.to_team_code || "destino";
  const mainName = selectedMainPlayer
    ? displayName(selectedMainPlayer.esms_name)
    : "jugador";

  if (
    draft.movement_type === "TRANSFER" &&
    transferMode === "EXCHANGE"
  ) {
    const aPlayers = names(teamAPlayers);
    const bPlayers = names(exchangeSelectedPlayers);
    const moneyA = moneyFromTeamA
      ? ` y ${moneyFromTeamA} EUR`
      : "";
    const moneyB = moneyFromTeamB
      ? ` y ${moneyFromTeamB} EUR`
      : "";

    return [
      `${from} entrega ${aPlayers || "jugadores por elegir"}${moneyA}.`,
      `${to} entrega ${bPlayers || "jugadores por elegir"}${moneyB}.`,
      "Todo se guardara como un solo intercambio en Mercado.",
    ];
  }

  if (draft.movement_type === "TRANSFER") {
    const extra = extraSelectedPlayers.length
      ? ` Tambien van ${names(extraSelectedPlayers)}.`
      : "";
    const money = draft.fee
      ? ` por ${draft.fee} EUR`
      : "";

    return [
      `${mainName} pasa de ${from} a ${to}${money}.${extra}`,
      "Es un traspaso definitivo y actualizara las plantillas.",
    ];
  }

  if (draft.movement_type === "LOAN") {
    const cost = draft.loan_fee
      ? ` Coste: ${draft.loan_fee} EUR.`
      : "";
    const option = draft.purchase_option
      ? ` Opcion de compra${draft.purchase_option_fee ? `: ${draft.purchase_option_fee} EUR` : ""}.`
      : " Sin opcion de compra.";

    return [
      `${mainName} sale cedido de ${from} a ${to}.`,
      `Fechas: ${dateInput(draft.loan_start_date) || "inicio"} - ${dateInput(draft.loan_end_date) || "fin"}.${cost}`,
      `${option}${draft.notes ? " Tiene condiciones escritas." : ""}`,
    ];
  }

  if (draft.movement_type === "LOAN_RETURN") {
    return [
      `${mainName} vuelve de ${from} a ${to}.`,
      draft.parent_movement_id
        ? "La vuelta esta enlazada con una cesion activa."
        : "Si no eliges cesion activa, el sistema intentara encontrarla.",
    ];
  }

  return [
    `${mainName} queda registrado como pendiente entre ${from} y ${to}.`,
    "No se tocaran plantillas hasta crear una operacion definitiva.",
  ];
}

function getMissingHelp({
  draft,
  transferMode,
  selectedTeam,
  teamAPlayerIds,
  exchangePlayerIds,
}: {
  draft: Omit<Transfer, "id">;
  transferMode: "TRANSFER" | "EXCHANGE";
  selectedTeam: string;
  teamAPlayerIds: string[];
  exchangePlayerIds: string[];
}) {
  if (!selectedTeam) {
    return "elige el club de origen.";
  }

  if (
    draft.movement_type === "TRANSFER" &&
    transferMode === "EXCHANGE"
  ) {
    if (!draft.to_team_code) {
      return "elige el Equipo B.";
    }
    if (teamAPlayerIds.length === 0) {
      return "elige al menos un jugador del Equipo A.";
    }
    if (exchangePlayerIds.length === 0) {
      return "elige al menos un jugador del Equipo B.";
    }
    return null;
  }

  if (!draft.player_id) {
    return "elige el jugador.";
  }

  if (!draft.to_team_code) {
    return "elige el destino.";
  }

  if (!draft.transfer_date) {
    return "elige la fecha.";
  }

  if (draft.movement_type === "LOAN" && !draft.loan_end_date) {
    return "elige la fecha de fin de cesion.";
  }

  return null;
}

function names(players: Player[]) {
  return players
    .map((player) => displayName(player.esms_name))
    .join(", ");
}

function normalizeForType<T extends Partial<Transfer>>(
  movement: T,
  nextType: MovementType
): T {
  const base = {
    ...movement,
    movement_type: nextType,
  } as T;

  if (nextType === "LOAN") {
    return {
      ...base,
      owner_team_code:
        movement.owner_team_code ??
        movement.from_team_code ??
        null,
      loan_start_date:
        movement.loan_start_date ??
        movement.transfer_date ??
        today(),
      purchase_option:
        movement.purchase_option ?? false,
    };
  }

  if (nextType === "LOAN_RETURN") {
    return {
      ...base,
      fee: null,
      loan_fee: null,
      purchase_option: false,
      purchase_option_fee: null,
      loan_start_date: null,
      loan_end_date: null,
    };
  }

  if (nextType === "TRANSFER") {
    return {
      ...base,
      loan_fee: null,
      purchase_option: false,
      purchase_option_fee: null,
      loan_start_date: null,
      loan_end_date: null,
    };
  }

  return base;
}

const inputClass =
  "w-full rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2 text-xs font-bold text-[var(--mt-muted)] outline-none focus:border-[var(--mt-gold)]";

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <div className="mb-1.5 text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
        {label}
      </div>
      {children}
      {helper ? (
        <div className="mt-1 text-[10px] leading-4 text-[var(--mt-muted)]">
          {helper}
        </div>
      ) : null}
    </label>
  );
}

function TeamSelect({
  label,
  value,
  teams,
  onChange,
}: {
  label: string;
  value: string | null;
  teams: string[];
  onChange: (value: string | null) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value || null)
        }
        className={inputClass}
      >
        <option value="">-</option>
        {teams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
    </Field>
  );
}

function SeasonSelect({
  value,
  seasons,
  onChange,
  compact = false,
}: {
  value: string | null;
  seasons: Season[];
  onChange: (value: string | null) => void;
  compact?: boolean;
}) {
  const select = (
    <select
      value={value ?? ""}
      onChange={(event) =>
        onChange(event.target.value || null)
      }
      className={`${inputClass} ${compact ? "min-w-40" : ""}`}
    >
      <option value="">Sin temporada</option>
      {seasons.map((season) => (
        <option key={season.id} value={season.id}>
          {season.name}
        </option>
      ))}
    </select>
  );

  return compact ? (
    select
  ) : (
    <Field label="Temporada">{select}</Field>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: number | string | null;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const field = (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        step="0.01"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder="0"
        className={`${inputClass} ${compact ? "w-28 text-right" : "text-right"}`}
      />
      <span className="text-xs font-black text-[var(--mt-muted)]">
        EUR
      </span>
    </div>
  );

  return compact ? field : (
    <Field label={label}>{field}</Field>
  );
}

function MultiPlayerPicker({
  label,
  helper,
  players,
  selectedIds,
  onChange,
}: {
  label: string;
  helper: string;
  players: Player[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selectedPlayers = selectedIds
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));

  return (
    <div>
      <div className="mb-1.5 text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
        {label}
      </div>
      <div className="rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] p-2">
        <select
          value=""
          onChange={(event) => {
            const value = event.target.value;
            if (!value || selectedIds.includes(value)) {
              return;
            }
            onChange([...selectedIds, value]);
          }}
          className={inputClass}
        >
          <option value="">Añadir jugador</option>
          {players
            .filter(
              (player) => !selectedIds.includes(player.id)
            )
            .map((player) => (
              <option key={player.id} value={player.id}>
                {displayName(player.esms_name)}
              </option>
            ))}
        </select>
        <p className="mt-2 text-[10px] leading-4 text-[var(--mt-muted)]">
          {helper}
        </p>
        {selectedPlayers.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() =>
                  onChange(
                    selectedIds.filter((id) => id !== player.id)
                  )
                }
                className="rounded-full border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] px-3 py-1 text-[10px] font-black text-[var(--mt-gold-dark)]"
              >
                {displayName(player.esms_name)} ×
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 py-3 text-center">
      <div className="text-xl font-black text-[var(--mt-text)]">
        {value}
      </div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
        {label}
      </div>
    </div>
  );
}

function dateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function displayName(value: string) {
  return value.replaceAll("_", " ");
}

