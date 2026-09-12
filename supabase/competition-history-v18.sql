BEGIN;

CREATE TABLE IF NOT EXISTS public.competition_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS competition_series_unique_name_type
ON public.competition_series (lower(trim(name)), type);

ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS series_id uuid
REFERENCES public.competition_series(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_competitions_series_id
ON public.competitions(series_id);

-- Crea una identidad histórica para cada competición ya existente.
-- Solo agrupa automáticamente ediciones cuyo nombre y tipo coinciden exactamente.
INSERT INTO public.competition_series (name, type)
SELECT DISTINCT
  trim(c.name),
  c.type
FROM public.competitions c
WHERE trim(c.name) <> ''
ON CONFLICT DO NOTHING;

-- Vincula las competiciones existentes a su identidad histórica.
UPDATE public.competitions c
SET series_id = s.id
FROM public.competition_series s
WHERE c.series_id IS NULL
  AND lower(trim(c.name)) = lower(trim(s.name))
  AND c.type = s.type;

COMMIT;
