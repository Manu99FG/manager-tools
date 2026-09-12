-- =========================================================
-- V31.21 · CONFIGURACIÓN AVANZADA DE COMPETICIÓN
-- =========================================================
-- Añade:
-- - criterios de desempate configurables
-- - marcador reglamentario configurable para NO PRESENTADO
-- - margen configurable para conservar el resultado real del .stt
--
-- Los puntos victoria/empate/derrota y home_and_away ya existían;
-- V31.21 los incorpora al panel avanzado.
-- =========================================================

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS standings_tiebreakers jsonb
    NOT NULL DEFAULT '["GOAL_DIFFERENCE","GOALS_FOR"]'::jsonb,
  ADD COLUMN IF NOT EXISTS no_show_default_goals integer
    NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS no_show_keep_real_margin integer
    NOT NULL DEFAULT 3;

ALTER TABLE public.competitions
  DROP CONSTRAINT IF EXISTS competitions_no_show_default_goals_check;

ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_no_show_default_goals_check
  CHECK (no_show_default_goals BETWEEN 1 AND 20);

ALTER TABLE public.competitions
  DROP CONSTRAINT IF EXISTS competitions_no_show_keep_real_margin_check;

ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_no_show_keep_real_margin_check
  CHECK (no_show_keep_real_margin BETWEEN 1 AND 20);

CREATE OR REPLACE FUNCTION public.apply_match_no_show_result()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  raw_home integer;
  raw_away integer;
  no_show_was_changed boolean := false;
  scores_changed boolean := false;
  configured_default_goals integer := 3;
  configured_keep_margin integer := 3;
BEGIN
  SELECT
    COALESCE(c.no_show_default_goals, 3),
    COALESCE(c.no_show_keep_real_margin, 3)
  INTO
    configured_default_goals,
    configured_keep_margin
  FROM public.competitions c
  WHERE c.id = NEW.competition_id;

  IF TG_OP = 'INSERT' THEN
    no_show_was_changed := NEW.home_no_show OR NEW.away_no_show;
    scores_changed := NEW.home_score IS NOT NULL OR NEW.away_score IS NOT NULL;
  ELSE
    no_show_was_changed :=
      (NEW.home_no_show IS DISTINCT FROM OLD.home_no_show)
      OR (NEW.away_no_show IS DISTINCT FROM OLD.away_no_show);

    scores_changed :=
      (NEW.home_score IS DISTINCT FROM OLD.home_score)
      OR (NEW.away_score IS DISTINCT FROM OLD.away_score);
  END IF;

  -- Si quitamos el NP, restauramos el marcador original del .stt.
  IF NOT NEW.home_no_show AND NOT NEW.away_no_show THEN
    IF TG_OP = 'UPDATE'
       AND (OLD.home_no_show OR OLD.away_no_show)
       AND NEW.stt_home_score IS NOT NULL
       AND NEW.stt_away_score IS NOT NULL THEN
      NEW.home_score := NEW.stt_home_score;
      NEW.away_score := NEW.stt_away_score;
    END IF;

    RETURN NEW;
  END IF;

  -- Puede marcarse NP antes de importar el .stt.
  IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
    RETURN NEW;
  END IF;

  IF no_show_was_changed OR scores_changed THEN
    raw_home := NEW.home_score;
    raw_away := NEW.away_score;
  ELSE
    raw_home := COALESCE(NEW.stt_home_score, NEW.home_score);
    raw_away := COALESCE(NEW.stt_away_score, NEW.away_score);
  END IF;

  NEW.stt_home_score := raw_home;
  NEW.stt_away_score := raw_away;

  IF NEW.home_no_show THEN
    -- El visitante sí presentó.
    IF raw_away - raw_home >= configured_keep_margin THEN
      NEW.home_score := raw_home;
      NEW.away_score := raw_away;
    ELSE
      NEW.home_score := 0;
      NEW.away_score := configured_default_goals;
    END IF;
  ELSIF NEW.away_no_show THEN
    -- El local sí presentó.
    IF raw_home - raw_away >= configured_keep_margin THEN
      NEW.home_score := raw_home;
      NEW.away_score := raw_away;
    ELSE
      NEW.home_score := configured_default_goals;
      NEW.away_score := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.competitions.standings_tiebreakers
IS 'Criterios de desempate, en orden, después de puntos.';

COMMENT ON COLUMN public.competitions.no_show_default_goals
IS 'Goles del marcador reglamentario a favor del equipo que sí presentó alineación.';

COMMENT ON COLUMN public.competitions.no_show_keep_real_margin
IS 'Diferencia mínima de goles para conservar el marcador real del .stt cuando hay NO PRESENTADO.';
