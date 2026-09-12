BEGIN;

-- El histórico se identifica exclusivamente por el nombre de la competición.
-- Una competición puede cambiar de formato entre temporadas sin perder continuidad.

-- Reasigna ediciones de series duplicadas por nombre a la serie más antigua.
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM public.competition_series
), duplicates AS (
  SELECT id, canonical_id
  FROM ranked
  WHERE id <> canonical_id
)
UPDATE public.competitions c
SET series_id = d.canonical_id
FROM duplicates d
WHERE c.series_id = d.id;

-- Elimina las series duplicadas ya vacías.
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id
  FROM public.competition_series
)
DELETE FROM public.competition_series s
USING ranked r
WHERE s.id = r.id
  AND r.id <> r.canonical_id;

-- La unicidad pasa a depender solo del nombre normalizado.
DROP INDEX IF EXISTS public.competition_series_unique_name_type;

CREATE UNIQUE INDEX IF NOT EXISTS competition_series_unique_name
ON public.competition_series (lower(trim(name)));

-- Vincula competiciones huérfanas solo por nombre, sin comparar el tipo.
UPDATE public.competitions c
SET series_id = s.id
FROM public.competition_series s
WHERE c.series_id IS NULL
  AND lower(trim(c.name)) = lower(trim(s.name));

COMMIT;
