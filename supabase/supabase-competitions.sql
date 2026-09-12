-- =========================================================
-- MANAGER TOOLS - NÚCLEO DE COMPETICIONES
-- Temporadas -> Competiciones -> Participantes -> Jornadas -> Partidos
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  starts_at date,
  ends_at date,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL CHECK (type IN ('LEAGUE', 'CUP', 'GROUPS', 'GROUPS_KNOCKOUT', 'SUPERCUP')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'FINISHED')),
  points_win integer NOT NULL DEFAULT 3,
  points_draw integer NOT NULL DEFAULT 1,
  points_loss integer NOT NULL DEFAULT 0,
  home_and_away boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, slug)
);

CREATE TABLE IF NOT EXISTS public.competition_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  team_code text NOT NULL,
  seed integer,
  group_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, team_code)
);

CREATE TABLE IF NOT EXISTS public.competition_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  number integer NOT NULL,
  name text NOT NULL,
  starts_at date,
  ends_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, number)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  round_id uuid REFERENCES public.competition_rounds(id) ON DELETE SET NULL,
  home_team_code text NOT NULL,
  away_team_code text NOT NULL,
  home_score integer,
  away_score integer,
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'PLAYED', 'POSTPONED', 'CANCELLED')),
  scheduled_at timestamptz,
  played_at timestamptz,
  esms_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_team_code <> away_team_code),
  CHECK (home_score IS NULL OR home_score >= 0),
  CHECK (away_score IS NULL OR away_score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_competitions_season ON public.competitions(season_id);
CREATE INDEX IF NOT EXISTS idx_competition_teams_competition ON public.competition_teams(competition_id);
CREATE INDEX IF NOT EXISTS idx_rounds_competition ON public.competition_rounds(competition_id, number);
CREATE INDEX IF NOT EXISTS idx_matches_competition ON public.matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON public.matches(round_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

CREATE OR REPLACE FUNCTION public.manager_tools_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seasons_updated_at ON public.seasons;
CREATE TRIGGER trg_seasons_updated_at
BEFORE UPDATE ON public.seasons
FOR EACH ROW EXECUTE FUNCTION public.manager_tools_touch_updated_at();

DROP TRIGGER IF EXISTS trg_competitions_updated_at ON public.competitions;
CREATE TRIGGER trg_competitions_updated_at
BEFORE UPDATE ON public.competitions
FOR EACH ROW EXECUTE FUNCTION public.manager_tools_touch_updated_at();

DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;
CREATE TRIGGER trg_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.manager_tools_touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasons TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_rounds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO service_role;
