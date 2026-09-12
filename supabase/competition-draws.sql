BEGIN;
CREATE TABLE IF NOT EXISTS public.competition_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  destination_competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','GENERATING','GENERATED','APPLIED')),
  result jsonb,
  generated_at timestamptz,
  reveal_interval_seconds integer NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_competition_draws_status_time ON public.competition_draws(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_competition_draws_source ON public.competition_draws(source_competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_draws_destination ON public.competition_draws(destination_competition_id);
DROP TRIGGER IF EXISTS trg_competition_draws_updated_at ON public.competition_draws;
CREATE TRIGGER trg_competition_draws_updated_at
BEFORE UPDATE ON public.competition_draws
FOR EACH ROW EXECUTE FUNCTION public.manager_tools_touch_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_draws TO service_role;
COMMIT;
