-- =========================================================
-- V31.19 · PERFORMANCE FINAL · COMPETICIONES
-- =========================================================

-- Listado / detalle / clasificación / calendario
CREATE INDEX IF NOT EXISTS idx_matches_competition_status_round
ON public.matches (competition_id, status, round_id);

-- Historial por serie y orden temporal
CREATE INDEX IF NOT EXISTS idx_competitions_series_created
ON public.competitions (series_id, created_at DESC)
WHERE series_id IS NOT NULL;

-- Importador .stt: solo busca jugadores de los dos clubes del partido
CREATE INDEX IF NOT EXISTS idx_players_current_team_code
ON public.players (current_team_code)
WHERE current_team_code IS NOT NULL;

-- Lecturas frecuentes de plantillas de competición
CREATE INDEX IF NOT EXISTS idx_competition_teams_competition_team
ON public.competition_teams (competition_id, team_code);

-- Contadores del Centro de Competiciones sin N+1 ni descarga de todos los registros.
CREATE OR REPLACE FUNCTION public.manager_tools_competition_counts()
RETURNS TABLE (
  competition_id uuid,
  team_count bigint,
  round_count bigint,
  match_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH team_counts AS (
    SELECT competition_id, count(*) AS team_count
    FROM public.competition_teams
    GROUP BY competition_id
  ),
  round_counts AS (
    SELECT competition_id, count(*) AS round_count
    FROM public.competition_rounds
    GROUP BY competition_id
  ),
  match_counts AS (
    SELECT competition_id, count(*) AS match_count
    FROM public.matches
    GROUP BY competition_id
  )
  SELECT
    c.id AS competition_id,
    COALESCE(t.team_count, 0)::bigint,
    COALESCE(r.round_count, 0)::bigint,
    COALESCE(m.match_count, 0)::bigint
  FROM public.competitions c
  LEFT JOIN team_counts t ON t.competition_id = c.id
  LEFT JOIN round_counts r ON r.competition_id = c.id
  LEFT JOIN match_counts m ON m.competition_id = c.id;
$$;

REVOKE ALL ON FUNCTION public.manager_tools_competition_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_tools_competition_counts() TO service_role;
