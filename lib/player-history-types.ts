export type DatabasePlayer = {
  id: string;

  esms_name: string;
  nationality: string;

  current_team_code:
    | string
    | null;

  owner_team_code?:
    | string
    | null;

  origin_team_code?:
    | string
    | null;

  created_at: string;
  updated_at: string;
};

export type PlayerSnapshot = {
  id: string;

  player_id: string;

  team_code: string;
  snapshot_date: string;

  age: number;

  st: number;
  tk: number;
  ps: number;
  sh: number;

  ag: number;

  kab: number;
  tab: number;
  pab: number;
  sab: number;

  gam: number;
  sub: number;
  min: number;
  mom: number;

  sav: number;
  con: number;
  ktk: number;
  kps: number;
  sht: number;
  gls: number;
  ass: number;

  dp: number;
  inj: number;
  sus: number;
  fit: number;

  created_at: string;
};

export type PlayerMovementType =
  | "PENDING"
  | "TRANSFER"
  | "LOAN"
  | "LOAN_RETURN";

export type PlayerTransfer = {
  id: string;

  player_id: string;

  from_team_code:
    | string
    | null;

  to_team_code: string;

  transfer_date: string;

  fee?: number | null;
  season_id?: string | null;

  movement_type?: PlayerMovementType;

  owner_team_code?: string | null;

  loan_start_date?: string | null;
  loan_end_date?: string | null;
  loan_fee?: number | null;

  purchase_option?: boolean;
  purchase_option_fee?: number | null;

  parent_movement_id?: string | null;
  notes?: string | null;

  deal_id?: string | null;
  deal_role?: "PRIMARY" | "EXCHANGE";

  created_at: string;
};

export type PlayerHistoryEvent = {
  id: string;

  player_id: string;
  snapshot_id:
    | string
    | null;

  event_type: string;

  stat: string;

  old_value:
    | string
    | null;

  new_value:
    | string
    | null;

  created_at: string;
};