-- MANAGER TOOLS V27.3
-- INTERCAMBIOS / JUGADOR INCLUIDO EN UNA OPERACIÓN

ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS deal_id uuid,
  ADD COLUMN IF NOT EXISTS deal_role text NOT NULL DEFAULT 'PRIMARY';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transfers_deal_role_check'
      AND conrelid = 'public.transfers'::regclass
  ) THEN
    ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_deal_role_check
      CHECK (deal_role IN ('PRIMARY', 'EXCHANGE'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transfers_deal_id
  ON public.transfers (deal_id)
  WHERE deal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_deal_role
  ON public.transfers (deal_role);

-- Los movimientos antiguos siguen siendo operaciones principales.
UPDATE public.transfers
SET deal_role = 'PRIMARY'
WHERE deal_role IS NULL
   OR deal_role NOT IN ('PRIMARY', 'EXCHANGE');
