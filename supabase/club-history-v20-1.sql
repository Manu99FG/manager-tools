-- =========================================================
-- MANAGER TOOLS — V20.1
-- HISTORIAL DE CLUBES: EDAD/POSICIÓN EN PARTIDO + MERCADO
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Congelar datos necesarios en cada estadística de partido
-- ---------------------------------------------------------

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS age_at_match integer;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS position_at_match text;

CREATE INDEX IF NOT EXISTS idx_match_player_stats_age_at_match
ON public.match_player_stats(age_at_match);

CREATE INDEX IF NOT EXISTS idx_match_player_stats_position_at_match
ON public.match_player_stats(position_at_match);

-- ---------------------------------------------------------
-- 2. Datos económicos de transferencias
-- ---------------------------------------------------------

ALTER TABLE public.transfers
ADD COLUMN IF NOT EXISTS fee numeric(14,2);

ALTER TABLE public.transfers
ADD COLUMN IF NOT EXISTS season_id uuid
REFERENCES public.seasons(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_season_id
ON public.transfers(season_id);

-- ---------------------------------------------------------
-- 3. Clasificador ESMS para guardar la posición en el momento
--    del partido.
--
--    Replica la lógica actual:
--    - empate principal: GK > FW > DF > MF
--    - Ps dominante puede convertirse en DM/AM si la
--      diferencia con Tk/Sh es <= 5.
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.manager_tools_esms_position(
  p_st integer,
  p_tk integer,
  p_ps integer,
  p_sh integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_max integer;
  v_ties integer;
BEGIN
  v_max := GREATEST(p_st, p_tk, p_ps, p_sh);

  v_ties :=
    (CASE WHEN p_st = v_max THEN 1 ELSE 0 END) +
    (CASE WHEN p_tk = v_max THEN 1 ELSE 0 END) +
    (CASE WHEN p_ps = v_max THEN 1 ELSE 0 END) +
    (CASE WHEN p_sh = v_max THEN 1 ELSE 0 END);

  IF v_ties > 1 THEN
    IF p_st = v_max THEN RETURN 'GK'; END IF;
    IF p_sh = v_max THEN RETURN 'FW'; END IF;
    IF p_tk = v_max THEN RETURN 'DF'; END IF;
    RETURN 'MF';
  END IF;

  IF p_st = v_max THEN
    RETURN 'GK';
  ELSIF p_sh = v_max THEN
    RETURN 'FW';
  ELSIF p_tk = v_max THEN
    RETURN 'DF';
  END IF;

  IF p_tk > p_sh AND (p_ps - p_tk) <= 5 THEN
    RETURN 'DM';
  ELSIF p_sh > p_tk AND (p_ps - p_sh) <= 5 THEN
    RETURN 'AM';
  END IF;

  RETURN 'MF';
END;
$$;

-- ---------------------------------------------------------
-- 4. Trigger.
--
--    Al importar un .stt, match_player_stats ya contiene el
--    UUID del jugador cuando está enlazado. El trigger toma
--    el snapshot más reciente de ese UUID EN ESE MOMENTO y
--    congela edad + posición en la fila del partido.
--
--    No intenta enlazar jugadores sin UUID: evita errores
--    con homónimos.
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.manager_tools_fill_match_player_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_snapshot record;
BEGIN
  IF NEW.player_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.age_at_match IS NOT NULL
     AND NEW.position_at_match IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    age,
    st,
    tk,
    ps,
    sh
  INTO v_snapshot
  FROM public.player_snapshots
  WHERE player_id = NEW.player_id
  ORDER BY snapshot_date DESC
  LIMIT 1;

  IF FOUND THEN
    IF NEW.age_at_match IS NULL THEN
      NEW.age_at_match := v_snapshot.age;
    END IF;

    IF NEW.position_at_match IS NULL THEN
      NEW.position_at_match :=
        public.manager_tools_esms_position(
          v_snapshot.st,
          v_snapshot.tk,
          v_snapshot.ps,
          v_snapshot.sh
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_player_stats_context
ON public.match_player_stats;

CREATE TRIGGER trg_match_player_stats_context
BEFORE INSERT OR UPDATE OF player_id
ON public.match_player_stats
FOR EACH ROW
EXECUTE FUNCTION public.manager_tools_fill_match_player_context();

COMMIT;

-- =========================================================
-- IMPORTANTE SOBRE DATOS ANTERIORES
-- =========================================================
-- No se hace un backfill automático de age_at_match.
-- La edad histórica NO puede reconstruirse con total certeza
-- usando simplemente la edad actual del jugador.
--
-- Desde que se instala V20.1, cada nuevo .stt importado
-- queda congelado correctamente.
--
-- Los traspasos antiguos pueden editarse desde /admin/fichajes
-- para indicar temporada e importe.
