-- MANAGER TOOLS V27.1
-- FICHAJES + CESIONES CON PROPIEDAD Y FECHAS REALES

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS owner_team_code text;

UPDATE public.players
SET owner_team_code = current_team_code
WHERE owner_team_code IS NULL
  AND current_team_code IS NOT NULL;

ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS movement_type text NOT NULL DEFAULT 'TRANSFER',
  ADD COLUMN IF NOT EXISTS owner_team_code text,
  ADD COLUMN IF NOT EXISTS loan_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS loan_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS loan_fee numeric,
  ADD COLUMN IF NOT EXISTS purchase_option boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_option_fee numeric,
  ADD COLUMN IF NOT EXISTS parent_movement_id uuid,
  ADD COLUMN IF NOT EXISTS notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transfers_movement_type_check'
      AND conrelid = 'public.transfers'::regclass
  ) THEN
    ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_movement_type_check
      CHECK (movement_type IN ('PENDING','TRANSFER','LOAN','LOAN_RETURN'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transfers_parent_movement_fk'
      AND conrelid = 'public.transfers'::regclass
  ) THEN
    ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_parent_movement_fk
      FOREIGN KEY (parent_movement_id)
      REFERENCES public.transfers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transfers_player_movement
  ON public.transfers (player_id, movement_type, transfer_date DESC);

CREATE INDEX IF NOT EXISTS idx_transfers_loan_period
  ON public.transfers (player_id, loan_start_date, loan_end_date)
  WHERE movement_type = 'LOAN';

CREATE INDEX IF NOT EXISTS idx_transfers_owner_team
  ON public.transfers (owner_team_code);

CREATE INDEX IF NOT EXISTS idx_players_owner_team
  ON public.players (owner_team_code);

-- Las filas históricas previas a V27.1 eran traspasos permanentes.
UPDATE public.transfers
SET movement_type = 'TRANSFER'
WHERE movement_type IS NULL
   OR movement_type NOT IN ('PENDING','TRANSFER','LOAN','LOAN_RETURN');

-- Una cesión necesita fechas coherentes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transfers_loan_dates_check'
      AND conrelid = 'public.transfers'::regclass
  ) THEN
    ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_loan_dates_check
      CHECK (
        movement_type <> 'LOAN'
        OR (
          loan_start_date IS NOT NULL
          AND loan_end_date IS NOT NULL
          AND loan_end_date > loan_start_date
        )
      ) NOT VALID;
  END IF;
END $$;

-- Vista útil para consultar qué jugadores están cedidos en una fecha concreta.
CREATE OR REPLACE VIEW public.active_player_loans AS
SELECT
  t.id,
  t.player_id,
  t.owner_team_code,
  t.to_team_code AS loan_team_code,
  t.loan_start_date,
  t.loan_end_date,
  t.loan_fee,
  t.purchase_option,
  t.purchase_option_fee,
  t.season_id
FROM public.transfers t
WHERE t.movement_type = 'LOAN'
  AND t.loan_start_date <= now()
  AND t.loan_end_date > now()
  AND NOT EXISTS (
    SELECT 1
    FROM public.transfers r
    WHERE r.parent_movement_id = t.id
      AND r.movement_type IN ('LOAN_RETURN','TRANSFER')
      AND r.transfer_date <= now()
  );
