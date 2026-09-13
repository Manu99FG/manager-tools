-- V31.35 · REGLAMENTO ÚNICO DE CLASIFICACIÓN
--
-- Orden obligatorio en TODAS las competiciones con tabla:
-- 1. Puntos
-- 2. Menos partidos NO PRESENTADOS
-- 3. Enfrentamientos directos (puntos de la mini-clasificación entre empatados)
-- 4. Diferencia de goles general
-- 5. Goles a favor generales
--
-- El código del club queda únicamente como último fallback técnico estable.

BEGIN;

ALTER TABLE public.competitions
  ALTER COLUMN standings_tiebreakers
  SET DEFAULT '["FEWER_NO_SHOWS","HEAD_TO_HEAD_POINTS","GOAL_DIFFERENCE","GOALS_FOR"]'::jsonb;

UPDATE public.competitions
SET standings_tiebreakers =
  '["FEWER_NO_SHOWS","HEAD_TO_HEAD_POINTS","GOAL_DIFFERENCE","GOALS_FOR"]'::jsonb
WHERE standings_tiebreakers IS DISTINCT FROM
  '["FEWER_NO_SHOWS","HEAD_TO_HEAD_POINTS","GOAL_DIFFERENCE","GOALS_FOR"]'::jsonb;

COMMENT ON COLUMN public.competitions.standings_tiebreakers IS
'Orden fijo global: puntos (implícito), menos NP, enfrentamientos directos, diferencia de goles y goles a favor. No configurable por competición.';

COMMIT;

SELECT id, name, standings_tiebreakers
FROM public.competitions
ORDER BY name;
