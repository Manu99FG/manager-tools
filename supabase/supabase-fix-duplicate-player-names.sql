-- =========================================================
-- MANAGER TOOLS
-- MIGRACIÓN: JUGADORES CON EL MISMO NOMBRE ESMS
-- =========================================================
--
-- OBJETIVO
-- -------
-- players.id (UUID) es la identidad REAL y permanente del jugador.
--
-- NO debe existir una unicidad global por:
--   (esms_name, nationality)
--
-- porque puede haber dos jugadores distintos como:
--   FLA + M_Cunha + bra
--   MUN + M_Cunha + bra
--
-- Sí protegemos la identidad dentro de la plantilla ACTUAL:
--   (current_team_code, esms_name, nationality)
--
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Eliminar constraints UNIQUE que obliguen a que
--    (esms_name, nationality) sea globalmente único.
--    El bloque busca el nombre real del constraint,
--    por lo que no dependemos de cómo se llamara originalmente.
-- ---------------------------------------------------------

DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT
      c.conname
    FROM pg_constraint c
    JOIN pg_class t
      ON t.oid = c.conrelid
    JOIN pg_namespace n
      ON n.oid = t.relnamespace
    WHERE
      n.nspname = 'public'
      AND t.relname = 'players'
      AND c.contype = 'u'
      AND (
        SELECT count(*)
        FROM unnest(c.conkey) AS key(attnum)
      ) = 2
      AND (
        SELECT bool_and(
          a.attname IN ('esms_name', 'nationality')
        )
        FROM unnest(c.conkey) AS key(attnum)
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = key.attnum
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.players DROP CONSTRAINT %I',
      constraint_record.conname
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------
-- 2. Eliminar índices UNIQUE independientes que pudieran
--    seguir imponiendo la misma unicidad.
--    No toca la PRIMARY KEY ni índices de otras columnas.
-- ---------------------------------------------------------

DO $$
DECLARE
  index_record record;
BEGIN
  FOR index_record IN
    SELECT
      i.relname AS index_name
    FROM pg_index x
    JOIN pg_class i
      ON i.oid = x.indexrelid
    JOIN pg_class t
      ON t.oid = x.indrelid
    JOIN pg_namespace n
      ON n.oid = t.relnamespace
    WHERE
      n.nspname = 'public'
      AND t.relname = 'players'
      AND x.indisunique = true
      AND x.indisprimary = false
      AND x.indnkeyatts = 2
      AND (
        SELECT bool_and(
          a.attname IN ('esms_name', 'nationality')
        )
        FROM unnest(x.indkey::smallint[]) AS key(attnum)
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = key.attnum
        WHERE key.attnum > 0
      )
      AND (
        SELECT count(*)
        FROM unnest(x.indkey::smallint[]) AS key(attnum)
        WHERE key.attnum > 0
      ) = 2
  LOOP
    EXECUTE format(
      'DROP INDEX IF EXISTS public.%I',
      index_record.index_name
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------
-- 3. Índice normal para búsquedas por nombre/nacionalidad.
--    Ya NO es UNIQUE.
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_players_esms_name_nationality
ON public.players (
  esms_name,
  nationality
);

-- ---------------------------------------------------------
-- 4. Unicidad únicamente dentro de la plantilla actual.
--
-- Permite:
--   FLA / M_Cunha / bra
--   MUN / M_Cunha / bra
--
-- Impide accidentalmente:
--   FLA / M_Cunha / bra
--   FLA / M_Cunha / bra
--
-- Los jugadores sin equipo actual (NULL) no participan
-- en este índice.
-- ---------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_players_current_roster_identity
ON public.players (
  current_team_code,
  esms_name,
  nationality
)
WHERE current_team_code IS NOT NULL;

COMMIT;

-- =========================================================
-- COMPROBACIONES
-- =========================================================

-- Muestra nombres ESMS repetidos en la base.
SELECT
  esms_name,
  nationality,
  count(*) AS jugadores,
  string_agg(
    coalesce(current_team_code, 'SIN_EQUIPO'),
    ', '
    ORDER BY current_team_code
  ) AS equipos
FROM public.players
GROUP BY
  esms_name,
  nationality
HAVING count(*) > 1
ORDER BY
  esms_name,
  nationality;

-- Muestra específicamente M_Cunha.
SELECT
  id,
  esms_name,
  nationality,
  current_team_code,
  created_at,
  updated_at
FROM public.players
WHERE lower(esms_name) = lower('M_Cunha')
ORDER BY current_team_code;
