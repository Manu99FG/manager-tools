-- =========================================================
-- V31.18 · NO PRESENTADO
-- =========================================================
-- Reglas:
-- 1. Puede marcarse como NO PRESENTADO el local o el visitante.
-- 2. El .stt se importa SIEMPRE y sus estadísticas se conservan.
-- 3. Se guarda el marcador real del .stt en stt_home_score/stt_away_score.
-- 4. Si el equipo que sí presentó alineación ganó por 3 goles o más,
--    se conserva el resultado real del .stt.
-- 5. En cualquier otro caso, el resultado oficial pasa a 3-0 / 0-3.
-- 6. Si se quita el NO PRESENTADO, se restaura el marcador del .stt.
-- =========================================================

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_no_show boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS away_no_show boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stt_home_score integer,
  ADD COLUMN IF NOT EXISTS stt_away_score integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'matches_only_one_no_show'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_only_one_no_show
      CHECK (NOT (home_no_show AND away_no_show));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apply_match_no_show_result()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  raw_home integer;
  raw_away integer;
  no_show_was_added boolean := false;
  scores_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    no_show_was_added := NEW.home_no_show OR NEW.away_no_show;
    scores_changed := NEW.home_score IS NOT NULL OR NEW.away_score IS NOT NULL;
  ELSE
    no_show_was_added :=
      (NEW.home_no_show IS DISTINCT FROM OLD.home_no_show)
      OR (NEW.away_no_show IS DISTINCT FROM OLD.away_no_show);

    scores_changed :=
      (NEW.home_score IS DISTINCT FROM OLD.home_score)
      OR (NEW.away_score IS DISTINCT FROM OLD.away_score);
  END IF;

  -- Si quitamos el NP, restauramos el marcador real del .stt.
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

  -- Permitimos marcar el NP ANTES de importar el .stt.
  -- En ese caso todavía no existe un marcador que corregir.
  IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
    RETURN NEW;
  END IF;

  -- ¿De dónde sale el marcador real del .stt?
  -- A) Al marcar NP por primera vez: el marcador actual es el del .stt.
  -- B) Si ya estaba marcado y el importador vuelve a escribir el marcador:
  --    el nuevo marcador entrante es el del .stt.
  -- C) En cualquier otro update usamos el marcador .stt ya guardado.
  IF no_show_was_added OR scores_changed THEN
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
    IF raw_away - raw_home >= 3 THEN
      NEW.home_score := raw_home;
      NEW.away_score := raw_away;
    ELSE
      NEW.home_score := 0;
      NEW.away_score := 3;
    END IF;
  ELSIF NEW.away_no_show THEN
    -- El local sí presentó.
    IF raw_home - raw_away >= 3 THEN
      NEW.home_score := raw_home;
      NEW.away_score := raw_away;
    ELSE
      NEW.home_score := 3;
      NEW.away_score := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_match_no_show_result
ON public.matches;

CREATE TRIGGER trg_apply_match_no_show_result
BEFORE INSERT OR UPDATE OF
  home_score,
  away_score,
  home_no_show,
  away_no_show
ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.apply_match_no_show_result();

COMMENT ON COLUMN public.matches.home_no_show
IS 'True si el equipo local no presentó alineación.';

COMMENT ON COLUMN public.matches.away_no_show
IS 'True si el equipo visitante no presentó alineación.';

COMMENT ON COLUMN public.matches.stt_home_score
IS 'Marcador local original leído del .stt antes de aplicar la regla de NO PRESENTADO.';

COMMENT ON COLUMN public.matches.stt_away_score
IS 'Marcador visitante original leído del .stt antes de aplicar la regla de NO PRESENTADO.';
