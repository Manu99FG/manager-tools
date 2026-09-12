-- =========================================================
-- MANAGER TOOLS - COMPETICIONES V3
-- ESTADÍSTICAS ESMS PARTIDO A PARTIDO
-- Formato real .stt: 1 archivo = local + visitante
-- =========================================================

CREATE TABLE IF NOT EXISTS public.match_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  match_id uuid NOT NULL
    REFERENCES public.matches(id)
    ON DELETE CASCADE,

  player_id uuid
    REFERENCES public.players(id)
    ON DELETE SET NULL,

  team_code text NOT NULL,
  esms_name text NOT NULL,

  participated integer NOT NULL DEFAULT 0,
  came_on_as_sub integer NOT NULL DEFAULT 0,
  minutes integer NOT NULL DEFAULT 0,
  mom integer NOT NULL DEFAULT 0,

  saves integer NOT NULL DEFAULT 0,
  conceded integer NOT NULL DEFAULT 0,
  tackles integer NOT NULL DEFAULT 0,
  key_passes integer NOT NULL DEFAULT 0,
  shots integer NOT NULL DEFAULT 0,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,

  dp integer NOT NULL DEFAULT 0,
  injury integer NOT NULL DEFAULT 0,

  kab_delta integer NOT NULL DEFAULT 0,
  tab_delta integer NOT NULL DEFAULT 0,
  pab_delta integer NOT NULL DEFAULT 0,
  sab_delta integer NOT NULL DEFAULT 0,

  reserved_value integer NOT NULL DEFAULT -999,
  fitness integer NOT NULL DEFAULT 100,

  source_file text,
  imported_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT match_player_stats_unique
    UNIQUE (match_id, team_code, esms_name)
);

-- Compatibilidad si llegaste a ejecutar una versión V3 anterior.
ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS participated integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS came_on_as_sub integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS kab_delta integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS tab_delta integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS pab_delta integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS sab_delta integer NOT NULL DEFAULT 0;

ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS reserved_value integer NOT NULL DEFAULT -999;

CREATE INDEX IF NOT EXISTS idx_match_player_stats_match
ON public.match_player_stats(match_id);

CREATE INDEX IF NOT EXISTS idx_match_player_stats_player
ON public.match_player_stats(player_id);

CREATE INDEX IF NOT EXISTS idx_match_player_stats_team
ON public.match_player_stats(team_code);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.match_player_stats
TO service_role;
