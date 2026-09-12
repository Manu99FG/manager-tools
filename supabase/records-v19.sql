BEGIN;

-- Metadatos históricos de cada competición permanente.
-- Se usan para récords que NO se deben deducir del nombre.
ALTER TABLE public.competition_series
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'OTHER';

ALTER TABLE public.competition_series
ADD COLUMN IF NOT EXISTS league_level integer;

ALTER TABLE public.competition_series
ADD COLUMN IF NOT EXISTS counts_as_league boolean NOT NULL DEFAULT false;

ALTER TABLE public.competition_series
ADD COLUMN IF NOT EXISTS counts_as_champions boolean NOT NULL DEFAULT false;

ALTER TABLE public.competition_series
ADD COLUMN IF NOT EXISTS tracks_promotions boolean NOT NULL DEFAULT false;

ALTER TABLE public.competition_series
ADD COLUMN IF NOT EXISTS promoted_places integer NOT NULL DEFAULT 0;

ALTER TABLE public.competition_series
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Permite marcar explícitamente una jornada como FINAL.
-- No se intenta adivinar una final por el nombre de la jornada.
ALTER TABLE public.competition_rounds
ADD COLUMN IF NOT EXISTS stage text;

CREATE INDEX IF NOT EXISTS idx_competition_rounds_stage
ON public.competition_rounds(competition_id, stage);

-- Valores permitidos por convención:
-- competition_series.scope:
-- DOMESTIC_LEAGUE | DOMESTIC_CUP | CONTINENTAL | SUPERCUP | OTHER
--
-- competition_rounds.stage:
-- FINAL | SEMIFINAL | QUARTERFINAL | ROUND_OF_16 | GROUP | LEAGUE | OTHER

COMMIT;
