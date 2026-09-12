import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type MarketMovementType =
  | "PENDING"
  | "TRANSFER"
  | "LOAN"
  | "LOAN_RETURN";

type TransferRow = {
  id: string;
  player_id: string;
  from_team_code: string | null;
  to_team_code: string | null;
  transfer_date: string;
  fee: number | string | null;
  season_id: string | null;
  movement_type: MarketMovementType | null;
  owner_team_code: string | null;
  loan_start_date: string | null;
  loan_end_date: string | null;
  loan_fee: number | string | null;
  purchase_option: boolean | null;
  purchase_option_fee: number | string | null;
  parent_movement_id: string | null;
  notes: string | null;
  deal_id: string | null;
  deal_role: "PRIMARY" | "EXCHANGE" | null;
};

type PlayerRow = {
  id: string;
  esms_name: string;
  full_name?: string | null;
};

type SeasonRow = {
  id: string;
  name: string;
};

export type MarketTransfer = {
  id: string;
  playerId: string;
  playerName: string;
  fromTeamCode: string | null;
  toTeamCode: string | null;
  transferDate: string;
  fee: number | null;
  seasonId: string | null;
  seasonName: string | null;
  movementType: MarketMovementType;
  ownerTeamCode: string | null;
  loanStartDate: string | null;
  loanEndDate: string | null;
  loanFee: number | null;
  purchaseOption: boolean;
  purchaseOptionFee: number | null;
  parentMovementId: string | null;
  notes: string | null;
  dealId: string | null;
  dealRole: "PRIMARY" | "EXCHANGE";
  isExchange: boolean;
  dealCash: number | null;
  dealMembers?: MarketTransfer[];
};

export type MarketClub = {
  teamCode: string;
  purchases: number;
  sales: number;
  loansIn: number;
  loansOut: number;
  spent: number;
  income: number;
  loanSpent: number;
  loanIncome: number;
  balance: number;
};

export type MarketSeason = {
  seasonId: string;
  seasonName: string;
  transfers: number;
  loans: number;
  transferVolume: number;
  loanVolume: number;
};

export type MarketHistoryData = {
  totals: {
    movements: number;
    transfers: number;
    loans: number;
    pending: number;
    exchangeDeals: number;
    transferVolume: number;
    loanVolume: number;
    clubs: number;
    seasons: number;
  };
  biggestTransfers: MarketTransfer[];
  latestMovements: MarketTransfer[];
  clubs: MarketClub[];
  seasons: MarketSeason[];
  activeLoans: MarketTransfer[];
  byOperationType: {
    cashTransfers: MarketTransfer[];
    playerExchanges: MarketTransfer[];
    playerExchangesWithCash: MarketTransfer[];
    loans: MarketTransfer[];
  };
  limitations: string[];
};

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (
    typeof value === "string" &&
    value.trim() &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return null;
}

function movementType(value: unknown): MarketMovementType {
  return value === "LOAN" ||
    value === "LOAN_RETURN" ||
    value === "PENDING"
    ? value
    : "TRANSFER";
}

export async function getMarketHistoryData(): Promise<MarketHistoryData> {
  const supabase = getSupabaseAdmin();

  const [transfersResult, playersResult, seasonsResult] =
    await Promise.all([
      supabase
        .from("transfers")
        .select(
          "id,player_id,from_team_code,to_team_code,transfer_date,fee,season_id,movement_type,owner_team_code,loan_start_date,loan_end_date,loan_fee,purchase_option,purchase_option_fee,parent_movement_id,notes,deal_id,deal_role"
        )
        .order("transfer_date", { ascending: false }),
      supabase
        .from("players")
        .select("id,esms_name,full_name"),
      supabase
        .from("seasons")
        .select("id,name"),
    ]);

  if (transfersResult.error) throw transfersResult.error;
  if (playersResult.error) throw playersResult.error;
  if (seasonsResult.error) throw seasonsResult.error;

  const playerById = new Map(
    ((playersResult.data ?? []) as PlayerRow[]).map((player) => [
      player.id,
      player,
    ])
  );

  const seasonById = new Map(
    ((seasonsResult.data ?? []) as SeasonRow[]).map((season) => [
      season.id,
      season,
    ])
  );

  const movements: MarketTransfer[] = (
    (transfersResult.data ?? []) as TransferRow[]
  ).map((row) => {
    const player = playerById.get(row.player_id);
    const season = row.season_id
      ? seasonById.get(row.season_id)
      : null;

    return {
      id: row.id,
      playerId: row.player_id,
      playerName:
        player?.full_name?.trim() ||
        player?.esms_name ||
        row.player_id,
      fromTeamCode: row.from_team_code,
      toTeamCode: row.to_team_code,
      transferDate: row.transfer_date,
      fee: numberOrNull(row.fee),
      seasonId: row.season_id,
      seasonName: season?.name ?? null,
      movementType: movementType(row.movement_type),
      ownerTeamCode: row.owner_team_code,
      loanStartDate: row.loan_start_date,
      loanEndDate: row.loan_end_date,
      loanFee: numberOrNull(row.loan_fee),
      purchaseOption: row.purchase_option === true,
      purchaseOptionFee: numberOrNull(row.purchase_option_fee),
      parentMovementId: row.parent_movement_id,
      notes: row.notes,
      dealId: row.deal_id,
      dealRole:
        row.deal_role === "EXCHANGE"
          ? "EXCHANGE"
          : "PRIMARY",
      isExchange: false,
      dealCash: null,
    };
  });

  const dealCounts = new Map<string, number>();
  const dealCash = new Map<string, number>();

  for (const movement of movements) {
    if (!movement.dealId) continue;

    dealCounts.set(
      movement.dealId,
      (dealCounts.get(movement.dealId) ?? 0) + 1
    );

    if (movement.movementType === "TRANSFER") {
      dealCash.set(
        movement.dealId,
        (dealCash.get(movement.dealId) ?? 0) +
          (movement.fee ?? 0)
      );
    }
  }

  for (const movement of movements) {
    movement.isExchange =
      movement.dealId !== null &&
      (dealCounts.get(movement.dealId) ?? 0) > 1;

    movement.dealCash = movement.dealId
      ? dealCash.get(movement.dealId) ?? 0
      : null;
  }

  const dealMembers = new Map<string, MarketTransfer[]>();

  for (const movement of movements) {
    if (!movement.dealId) continue;

    const members = dealMembers.get(movement.dealId) ?? [];
    members.push(movement);
    dealMembers.set(movement.dealId, members);
  }

  for (const movement of movements) {
    movement.dealMembers = movement.dealId
      ? dealMembers.get(movement.dealId) ?? []
      : [];
  }

  const clubMap = new Map<string, MarketClub>();

  function getClub(teamCode: string) {
    const existing = clubMap.get(teamCode);
    if (existing) return existing;

    const created: MarketClub = {
      teamCode,
      purchases: 0,
      sales: 0,
      loansIn: 0,
      loansOut: 0,
      spent: 0,
      income: 0,
      loanSpent: 0,
      loanIncome: 0,
      balance: 0,
    };

    clubMap.set(teamCode, created);
    return created;
  }

  const seasonMap = new Map<string, MarketSeason>();

  for (const movement of movements) {
    if (movement.movementType === "TRANSFER") {
      if (movement.toTeamCode) {
        const club = getClub(movement.toTeamCode);
        club.purchases += 1;
        club.spent += movement.fee ?? 0;
      }

      if (movement.fromTeamCode) {
        const club = getClub(movement.fromTeamCode);
        club.sales += 1;
        club.income += movement.fee ?? 0;
      }
    }

    if (movement.movementType === "LOAN") {
      if (movement.toTeamCode) {
        const club = getClub(movement.toTeamCode);
        club.loansIn += 1;
        club.loanSpent += movement.loanFee ?? 0;
      }

      const owner =
        movement.ownerTeamCode ??
        movement.fromTeamCode;

      if (owner) {
        const club = getClub(owner);
        club.loansOut += 1;
        club.loanIncome += movement.loanFee ?? 0;
      }
    }

    if (movement.seasonId) {
      const season =
        seasonMap.get(movement.seasonId) ?? {
          seasonId: movement.seasonId,
          seasonName:
            movement.seasonName ?? "Temporada",
          transfers: 0,
          loans: 0,
          transferVolume: 0,
          loanVolume: 0,
        };

      if (movement.movementType === "TRANSFER") {
        season.transfers += 1;
        season.transferVolume += movement.fee ?? 0;
      }

      if (movement.movementType === "LOAN") {
        season.loans += 1;
        season.loanVolume += movement.loanFee ?? 0;
      }

      seasonMap.set(movement.seasonId, season);
    }
  }

  for (const club of clubMap.values()) {
    club.balance =
      club.income +
      club.loanIncome -
      club.spent -
      club.loanSpent;
  }

  const now = Date.now();

  const activeLoans = movements
    .filter((movement) => {
      if (
        movement.movementType !== "LOAN" ||
        !movement.loanStartDate ||
        !movement.loanEndDate
      ) {
        return false;
      }

      const start = new Date(movement.loanStartDate).getTime();
      const end = new Date(movement.loanEndDate).getTime();

      return start <= now && end > now;
    })
    .filter((loan) => {
      return !movements.some(
        (movement) =>
          movement.parentMovementId === loan.id &&
          (movement.movementType === "LOAN_RETURN" ||
            movement.movementType === "TRANSFER") &&
          new Date(movement.transferDate).getTime() <= now
      );
    });

  const limitations: string[] = [];

  if (
    movements.some(
      (movement) => movement.movementType === "PENDING"
    )
  ) {
    limitations.push(
      "Hay cambios de plantilla pendientes de clasificar. No cuentan como fichaje ni cesión hasta confirmarlos en /admin/fichajes."
    );
  }

  if (
    movements.some(
      (movement) =>
        movement.movementType === "TRANSFER" &&
        movement.fee === null
    )
  ) {
    limitations.push(
      "Hay fichajes sin precio. No se inventa ningún importe: su valor económico queda fuera de los totales."
    );
  }

  return {
    totals: {
      movements: movements.length,
      transfers: movements.filter(
        (movement) =>
          movement.movementType === "TRANSFER"
      ).length,
      loans: movements.filter(
        (movement) =>
          movement.movementType === "LOAN"
      ).length,
      pending: movements.filter(
        (movement) =>
          movement.movementType === "PENDING"
      ).length,
      exchangeDeals: new Set(
        movements
          .filter(
            (movement) =>
              movement.isExchange &&
              movement.dealId
          )
          .map((movement) => movement.dealId as string)
      ).size,
      transferVolume: movements
        .filter(
          (movement) =>
            movement.movementType === "TRANSFER"
        )
        .reduce(
          (sum, movement) =>
            sum + (movement.fee ?? 0),
          0
        ),
      loanVolume: movements
        .filter(
          (movement) =>
            movement.movementType === "LOAN"
        )
        .reduce(
          (sum, movement) =>
            sum + (movement.loanFee ?? 0),
          0
        ),
      clubs: clubMap.size,
      seasons: seasonMap.size,
    },

    biggestTransfers: movements
      .filter(
        (movement) =>
          movement.movementType === "TRANSFER" &&
          movement.fee !== null
      )
      .sort(
        (a, b) =>
          (b.fee ?? 0) - (a.fee ?? 0) ||
          b.transferDate.localeCompare(a.transferDate)
      )
      .slice(0, 25),

    latestMovements: movements.slice(0, 30),

    byOperationType: {
      cashTransfers: movements
        .filter(
          (movement) =>
            movement.movementType === "TRANSFER" &&
            !movement.isExchange
        )
        .slice(0, 12),
      playerExchanges: movements
        .filter(
          (movement) =>
            movement.movementType === "TRANSFER" &&
            movement.isExchange &&
            (movement.dealCash ?? 0) === 0
        )
        .slice(0, 12),
      playerExchangesWithCash: movements
        .filter(
          (movement) =>
            movement.movementType === "TRANSFER" &&
            movement.isExchange &&
            (movement.dealCash ?? 0) > 0
        )
        .slice(0, 12),
      loans: movements
        .filter(
          (movement) =>
            movement.movementType === "LOAN"
        )
        .slice(0, 12),
    },

    clubs: Array.from(clubMap.values()).sort(
      (a, b) =>
        b.spent + b.loanSpent -
          (a.spent + a.loanSpent) ||
        a.teamCode.localeCompare(b.teamCode)
    ),

    seasons: Array.from(seasonMap.values()).sort(
      (a, b) =>
        b.transferVolume +
          b.loanVolume -
          (a.transferVolume + a.loanVolume) ||
        b.transfers +
          b.loans -
          (a.transfers + a.loans)
    ),

    activeLoans,

    limitations,
  };
}
