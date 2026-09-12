import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  movePlayerBetweenRosters,
  rollbackRosterMutation,
  tradePlayersBetweenRosters,
  type RosterMutationBackup,
} from "@/lib/roster-market";

type MovementType =
  | "PENDING"
  | "TRANSFER"
  | "LOAN"
  | "LOAN_RETURN";

const TYPES = new Set<MovementType>([
  "PENDING",
  "TRANSFER",
  "LOAN",
  "LOAN_RETURN",
]);

function optionalNumber(value: unknown, label: string) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} no es válido.`);
  }

  return parsed;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => optionalString(item))
        .filter((item): item is string => Boolean(item))
    )
  );
}

function movementType(value: unknown): MovementType {
  const normalized =
    typeof value === "string"
      ? value.trim().toUpperCase()
      : "";

  if (!TYPES.has(normalized as MovementType)) {
    throw new Error("Tipo de movimiento no válido.");
  }

  return normalized as MovementType;
}

async function syncSinglePlayerOwnership({
  playerId,
  type,
  fromTeamCode,
  toTeamCode,
  ownerTeamCode,
}: {
  playerId: string;
  type: MovementType;
  fromTeamCode: string | null;
  toTeamCode: string;
  ownerTeamCode: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (type === "TRANSFER") {
    const { error } = await supabase
      .from("players")
      .update({
        owner_team_code: toTeamCode,
        current_team_code: toTeamCode,
      })
      .eq("id", playerId);

    if (error) throw error;
    return;
  }

  if (type === "LOAN") {
    const owner = ownerTeamCode ?? fromTeamCode;

    const { error } = await supabase
      .from("players")
      .update({
        owner_team_code: owner,
        current_team_code: toTeamCode,
      })
      .eq("id", playerId);

    if (error) throw error;
    return;
  }

  if (type === "LOAN_RETURN") {
    const owner = ownerTeamCode ?? toTeamCode;

    const { error } = await supabase
      .from("players")
      .update({
        owner_team_code: owner,
        current_team_code: toTeamCode,
      })
      .eq("id", playerId);

    if (error) throw error;
  }
}

async function findParentLoan({
  playerId,
  fromTeamCode,
  toTeamCode,
}: {
  playerId: string;
  fromTeamCode: string | null;
  toTeamCode: string;
}) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("transfers")
    .select("id")
    .eq("player_id", playerId)
    .eq("movement_type", "LOAN")
    .eq("to_team_code", fromTeamCode ?? "")
    .order("loan_start_date", { ascending: false })
    .limit(1);

  if (toTeamCode) {
    query = query.eq("owner_team_code", toTeamCode);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  return data?.id ?? null;
}

async function getPlayerRosterIdentity(
  playerId: string
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("players")
    .select("id,esms_name,nationality,current_team_code")
    .eq("id", playerId)
    .single();

  if (error) throw error;

  return {
    id: data.id as string,
    name: data.esms_name as string,
    nationality: data.nationality as string,
    currentTeamCode:
      (data.current_team_code as string | null) ?? null,
  };
}

async function validateExchangePlayers({
  playerId,
  buyerTeamCode,
}: {
  playerId: string;
  buyerTeamCode: string;
}) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("players")
    .select("id,current_team_code,owner_team_code")
    .eq("id", playerId)
    .single();

  if (error) throw error;

  if (data.current_team_code !== buyerTeamCode) {
    throw new Error(
      "El jugador incluido debe pertenecer actualmente al equipo comprador."
    );
  }

  return data;
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const playerId = optionalString(body.player_id);
    const playerIds = stringList(body.player_ids);
    const fromTeamCode = optionalString(body.from_team_code);
    const toTeamCode = optionalString(body.to_team_code);
    const transferDate = optionalString(body.transfer_date);
    const type = movementType(body.movement_type ?? "TRANSFER");
    const exchangePlayerIds = stringList(
      body.exchange_player_ids
    );
    const legacyExchangePlayerId = optionalString(
      body.exchange_player_id
    );

    if (
      legacyExchangePlayerId &&
      !exchangePlayerIds.includes(legacyExchangePlayerId)
    ) {
      exchangePlayerIds.push(legacyExchangePlayerId);
    }

    const primaryInputPlayerId = playerIds[0] ?? playerId;

    if (!primaryInputPlayerId || !toTeamCode || !transferDate) {
      return NextResponse.json(
        {
          error:
            "Jugador, club de destino y fecha son obligatorios.",
        },
        { status: 400 }
      );
    }

    const destinationTeamCode = toTeamCode;
    const primaryPlayerId = primaryInputPlayerId;
    const extraInputPlayerIds =
      playerIds.length > 0
        ? playerIds.slice(1)
        : stringList(body.extra_player_ids);
    const extraPlayerIds = extraInputPlayerIds.filter(
      (id) => id !== primaryPlayerId
    );
    const outgoingPlayerIds = [
      primaryPlayerId,
      ...extraPlayerIds,
    ];

    if (exchangePlayerIds.length > 0 && type !== "TRANSFER") {
      return NextResponse.json(
        {
          error:
            "Un jugador incluido solo puede usarse en un fichaje permanente.",
        },
        { status: 400 }
      );
    }

    if (exchangePlayerIds.length > 0 && !fromTeamCode) {
      return NextResponse.json(
        {
          error:
            "Un intercambio necesita club vendedor y comprador.",
        },
        { status: 400 }
      );
    }

    if (
      exchangePlayerIds.some((id) =>
        outgoingPlayerIds.includes(id)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "No puedes incluir el mismo jugador en ambos lados del intercambio.",
        },
        { status: 400 }
      );
    }

    const seasonId = optionalString(body.season_id);
    const ownerTeamCode =
      optionalString(body.owner_team_code) ??
      (type === "LOAN" ? fromTeamCode : null);

    const fee =
      body.money_from_team_a !== undefined
        ? optionalNumber(body.money_from_team_a, "El dinero del equipo A")
        : optionalNumber(body.fee, "El importe");
    const counterFee = optionalNumber(
      body.money_from_team_b,
      "El dinero del equipo B"
    );
    const loanFee = optionalNumber(
      body.loan_fee,
      "El coste de cesión"
    );
    const purchaseOptionFee = optionalNumber(
      body.purchase_option_fee,
      "La opción de compra"
    );

    const loanStartDate =
      type === "LOAN"
        ? optionalString(body.loan_start_date) ?? transferDate
        : null;

    const loanEndDate =
      type === "LOAN"
        ? optionalString(body.loan_end_date)
        : null;

    if (
      type === "LOAN" &&
      (!loanStartDate ||
        !loanEndDate ||
        new Date(loanEndDate) <= new Date(loanStartDate))
    ) {
      return NextResponse.json(
        {
          error:
            "Una cesión necesita fecha de inicio y fin válidas.",
        },
        { status: 400 }
      );
    }

    let parentMovementId =
      optionalString(body.parent_movement_id);

    if (type === "LOAN_RETURN" && !parentMovementId) {
      parentMovementId = await findParentLoan({
        playerId: primaryPlayerId,
        fromTeamCode,
        toTeamCode,
      });
    }

    const supabase = getSupabaseAdmin();
    const dealId =
      type === "TRANSFER" &&
      (exchangePlayerIds.length > 0 ||
        extraPlayerIds.length > 0)
        ? crypto.randomUUID()
        : null;

    let rosterBackup: RosterMutationBackup | null = null;

    const outgoingIdentities = await Promise.all(
      outgoingPlayerIds.map((id) =>
        getPlayerRosterIdentity(id)
      )
    );

    const mainIdentity = outgoingIdentities[0];

    if (
      type !== "PENDING" &&
      fromTeamCode
    ) {
      const sourceTeamCode = fromTeamCode;

      for (const identity of outgoingIdentities) {
        if (
          identity.currentTeamCode &&
          identity.currentTeamCode !== sourceTeamCode
        ) {
          throw new Error(
            `${identity.name} figura actualmente en ${identity.currentTeamCode}, no en ${sourceTeamCode}.`
          );
        }
      }

      if (
        type === "TRANSFER" &&
        exchangePlayerIds.length > 0
      ) {
        for (const id of exchangePlayerIds) {
          await validateExchangePlayers({
            playerId: id,
            buyerTeamCode: destinationTeamCode,
          });
        }

        const exchangeIdentities = await Promise.all(
          exchangePlayerIds.map((id) =>
            getPlayerRosterIdentity(id)
          )
        );

        rosterBackup =
          await tradePlayersBetweenRosters({
            firstPlayers: outgoingIdentities.map(
              (identity) => ({
                name: identity.name,
                nationality: identity.nationality,
              })
            ),
            firstTeamCode: sourceTeamCode,
            secondPlayers: exchangeIdentities.map(
              (identity) => ({
                name: identity.name,
                nationality: identity.nationality,
              })
            ),
            secondTeamCode: destinationTeamCode,
          });
      } else {
        rosterBackup =
          await movePlayerBetweenRosters({
            player: {
              name: mainIdentity.name,
              nationality:
                mainIdentity.nationality,
            },
            fromTeamCode: sourceTeamCode,
            toTeamCode: destinationTeamCode,
          });
      }
    }

    const mainRow = {
      player_id: primaryPlayerId,
      from_team_code: fromTeamCode,
      to_team_code: destinationTeamCode,
      transfer_date: transferDate,
      fee: type === "TRANSFER" ? fee : null,
      season_id: seasonId,
      movement_type: type,
      owner_team_code: ownerTeamCode,
      loan_start_date: loanStartDate,
      loan_end_date: loanEndDate,
      loan_fee: type === "LOAN" ? loanFee : null,
      purchase_option:
        type === "LOAN" && body.purchase_option === true,
      purchase_option_fee:
        type === "LOAN" ? purchaseOptionFee : null,
      parent_movement_id: parentMovementId,
      notes: optionalString(body.notes),
      deal_id: dealId,
      deal_role: "PRIMARY",
    };

    if (dealId && fromTeamCode) {
      const sourceTeamCode = fromTeamCode;

      const extraRows = outgoingPlayerIds
        .slice(1)
        .map((id) => ({
          player_id: id,
          from_team_code: sourceTeamCode,
          to_team_code: destinationTeamCode,
          transfer_date: transferDate,
          fee: null,
          season_id: seasonId,
          movement_type: "TRANSFER",
          owner_team_code: null,
          loan_start_date: null,
          loan_end_date: null,
          loan_fee: null,
          purchase_option: false,
          purchase_option_fee: null,
          parent_movement_id: null,
          notes: optionalString(body.notes),
          deal_id: dealId,
          deal_role: "EXCHANGE",
        }));

      const exchangeRows = exchangePlayerIds.map((id, index) => ({
        player_id: id,
        from_team_code: destinationTeamCode,
        to_team_code: sourceTeamCode,
        transfer_date: transferDate,
        fee: index === 0 ? counterFee : null,
        season_id: seasonId,
        movement_type: "TRANSFER",
        owner_team_code: null,
        loan_start_date: null,
        loan_end_date: null,
        loan_fee: null,
        purchase_option: false,
        purchase_option_fee: null,
        parent_movement_id: null,
        notes: optionalString(body.notes),
        deal_id: dealId,
        deal_role: "EXCHANGE",
      }));

      let data;

      try {
        const result = await supabase
          .from("transfers")
          .insert([mainRow, ...extraRows, ...exchangeRows])
          .select("*");

        if (result.error) {
          throw result.error;
        }

        data = result.data;

        for (const id of outgoingPlayerIds) {
          await syncSinglePlayerOwnership({
            playerId: id,
            type: "TRANSFER",
            fromTeamCode: sourceTeamCode,
            toTeamCode: destinationTeamCode,
            ownerTeamCode: null,
          });
        }

        for (const id of exchangePlayerIds) {
          await syncSinglePlayerOwnership({
            playerId: id,
            type: "TRANSFER",
            fromTeamCode: destinationTeamCode,
            toTeamCode: sourceTeamCode,
            ownerTeamCode: null,
          });
        }
      } catch (error) {
        if (rosterBackup) {
          await rollbackRosterMutation(
            rosterBackup
          ).catch((rollbackError) => {
            console.error(
              "Error restaurando plantillas tras fallo de Supabase:",
              rollbackError
            );
          });
        }

        throw error;
      }

      return NextResponse.json({
        ok: true,
        transfers: data ?? [],
        deal_id: dealId,
        rosters_updated: true,
      });
    }

    let data;

    try {
      const result = await supabase
        .from("transfers")
        .insert(mainRow)
        .select("*")
        .single();

      if (result.error) {
        throw result.error;
      }

      data = result.data;

      await syncSinglePlayerOwnership({
        playerId: primaryPlayerId,
        type,
        fromTeamCode,
        toTeamCode,
        ownerTeamCode,
      });
    } catch (error) {
      if (rosterBackup) {
        await rollbackRosterMutation(
          rosterBackup
        ).catch((rollbackError) => {
          console.error(
            "Error restaurando plantillas tras fallo de Supabase:",
            rollbackError
          );
        });
      }

      throw error;
    }

    return NextResponse.json({
      ok: true,
      transfer: data,
      transfers: [data],
      rosters_updated: type !== "PENDING",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el movimiento.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const id = optionalString(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID del movimiento." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: existingError } =
      await supabase
        .from("transfers")
        .select("*")
        .eq("id", id)
        .single();

    if (existingError) throw existingError;

    const type = movementType(
      body.movement_type ?? existing.movement_type ?? "TRANSFER"
    );

    const playerId = existing.player_id as string;
    const fromTeamCode =
      optionalString(body.from_team_code) ??
      existing.from_team_code ??
      null;
    const toTeamCode =
      optionalString(body.to_team_code) ??
      existing.to_team_code;

    const transferDate =
      optionalString(body.transfer_date) ??
      existing.transfer_date;

    const ownerTeamCode =
      optionalString(body.owner_team_code) ??
      existing.owner_team_code ??
      (type === "LOAN" ? fromTeamCode : null);

    const seasonId =
      body.season_id !== undefined
        ? optionalString(body.season_id)
        : existing.season_id ?? null;

    const fee =
      body.fee !== undefined
        ? optionalNumber(body.fee, "El importe")
        : optionalNumber(existing.fee, "El importe");

    const loanFee =
      body.loan_fee !== undefined
        ? optionalNumber(body.loan_fee, "El coste de cesión")
        : optionalNumber(existing.loan_fee, "El coste de cesión");

    const purchaseOptionFee =
      body.purchase_option_fee !== undefined
        ? optionalNumber(
            body.purchase_option_fee,
            "La opción de compra"
          )
        : optionalNumber(
            existing.purchase_option_fee,
            "La opción de compra"
          );

    const loanStartDate =
      type === "LOAN"
        ? optionalString(body.loan_start_date) ??
          existing.loan_start_date ??
          transferDate
        : null;

    const loanEndDate =
      type === "LOAN"
        ? optionalString(body.loan_end_date) ??
          existing.loan_end_date ??
          null
        : null;

    if (
      type === "LOAN" &&
      (!loanStartDate ||
        !loanEndDate ||
        new Date(loanEndDate) <= new Date(loanStartDate))
    ) {
      return NextResponse.json(
        {
          error:
            "Una cesión necesita fecha de inicio y fin válidas.",
        },
        { status: 400 }
      );
    }

    let parentMovementId =
      optionalString(body.parent_movement_id) ??
      existing.parent_movement_id ??
      null;

    if (type === "LOAN_RETURN" && !parentMovementId) {
      parentMovementId = await findParentLoan({
        playerId,
        fromTeamCode,
        toTeamCode,
      });
    }

    const { data, error } = await supabase
      .from("transfers")
      .update({
        from_team_code: fromTeamCode,
        to_team_code: toTeamCode,
        transfer_date: transferDate,
        fee: type === "TRANSFER" ? fee : null,
        season_id: seasonId,
        movement_type: type,
        owner_team_code: ownerTeamCode,
        loan_start_date: loanStartDate,
        loan_end_date: loanEndDate,
        loan_fee: type === "LOAN" ? loanFee : null,
        purchase_option:
          type === "LOAN"
            ? body.purchase_option !== undefined
              ? body.purchase_option === true
              : existing.purchase_option === true
            : false,
        purchase_option_fee:
          type === "LOAN" ? purchaseOptionFee : null,
        parent_movement_id: parentMovementId,
        notes:
          body.notes !== undefined
            ? optionalString(body.notes)
            : existing.notes ?? null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    await syncSinglePlayerOwnership({
      playerId,
      type,
      fromTeamCode,
      toTeamCode,
      ownerTeamCode,
    });

    return NextResponse.json({
      ok: true,
      transfer: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el movimiento.",
      },
      { status: 500 }
    );
  }
}
