export type DatabasePlayer = {
  id: string;

  esms_name: string;
  nationality: string;

  current_team_code:
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

export type PlayerTransfer = {
  id: string;

  player_id: string;

  from_team_code:
    | string
    | null;

  to_team_code: string;

  transfer_date: string;

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