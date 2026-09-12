BEGIN;

-- Garantiza que toda competición existente tenga una identidad histórica.
-- Las ediciones con el mismo nombre (ignorando mayúsculas/espacios)
-- quedan agrupadas en una misma serie histórica, aunque cambie su formato.
INSERT INTO public.competition_series (name, type)
SELECT DISTINCT ON (lower(trim(c.name)))
  trim(c.name),
  c.type
FROM public.competitions c
WHERE trim(c.name) <> ''
  AND c.series_id IS NULL
ORDER BY lower(trim(c.name)), c.created_at ASC
ON CONFLICT DO NOTHING;

UPDATE public.competitions c
SET series_id = s.id
FROM public.competition_series s
WHERE c.series_id IS NULL
  AND lower(trim(c.name)) = lower(trim(s.name));

-- Refuerza el índice que permite resolver rápidamente todas las ediciones
-- de una competición desde su serie histórica.
CREATE INDEX IF NOT EXISTS idx_competitions_series_created
ON public.competitions (series_id, created_at DESC)
WHERE series_id IS NOT NULL;

COMMIT;
