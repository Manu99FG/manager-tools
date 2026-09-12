-- =========================================================
-- V31.32 · NO PRESENTADO UNIVERSAL = 0-3 / 3-0
-- =========================================================
-- Regla única para TODAS las competiciones:
--   NP local     -> 0-3
--   NP visitante -> 3-0
-- El .stt se sigue importando y sus estadísticas se conservan.
-- stt_home_score / stt_away_score guardan el marcador bruto del .stt.
-- El marcador del .stt NUNCA sustituye el 3-0 administrativo mientras haya NP.
-- =========================================================

CREATE OR REPLACE FUNCTION public.apply_match_no_show_result()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  raw_home integer;
  raw_away integer;
  no_show_changed boolean := false;
  scores_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    no_show_changed := NEW.home_no_show OR NEW.away_no_show;
    scores_changed := NEW.home_score IS NOT NULL OR NEW.away_score IS NOT NULL;
  ELSE
    no_show_changed :=
      (NEW.home_no_show IS DISTINCT FROM OLD.home_no_show)
      OR (NEW.away_no_show IS DISTINCT FROM OLD.away_no_show);
    scores_changed :=
      (NEW.home_score IS DISTINCT FROM OLD.home_score)
      OR (NEW.away_score IS DISTINCT FROM OLD.away_score);
  END IF;

  -- Al retirar el NP, recuperamos el marcador real del .stt si existe.
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

  -- Si entra un marcador mientras el partido tiene NP (por ejemplo al importar
  -- el .stt), lo conservamos como marcador bruto antes de imponer el 3-0.
  IF NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR no_show_changed OR scores_changed THEN
      raw_home := NEW.home_score;
      raw_away := NEW.away_score;
      NEW.stt_home_score := raw_home;
      NEW.stt_away_score := raw_away;
    END IF;
  END IF;

  -- Resultado oficial invariable.
  IF NEW.home_no_show THEN
    NEW.home_score := 0;
    NEW.away_score := 3;
  ELSIF NEW.away_no_show THEN
    NEW.home_score := 3;
    NEW.away_score := 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_match_no_show_result ON public.matches;

CREATE TRIGGER trg_apply_match_no_show_result
BEFORE INSERT OR UPDATE OF
  home_score,
  away_score,
  home_no_show,
  away_no_show
ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.apply_match_no_show_result();

-- Las antiguas opciones quedan neutralizadas para compatibilidad con instalaciones
-- que ya tienen estas columnas. La aplicación deja de ofrecerlas como configuración.
UPDATE public.competitions
SET no_show_default_goals = 3,
    no_show_keep_real_margin = 3
WHERE no_show_default_goals IS DISTINCT FROM 3
   OR no_show_keep_real_margin IS DISTINCT FROM 3;

COMMENT ON COLUMN public.competitions.no_show_default_goals
IS 'Campo legado. NO PRESENTADO usa siempre 3 goles administrativos.';
COMMENT ON COLUMN public.competitions.no_show_keep_real_margin
IS 'Campo legado sin efecto. El resultado real del .stt nunca sustituye el 3-0 cuando hay NP.';
