-- =========================================================
-- V31.24 - CLASIFICACIÓN ENTRE COMPETICIONES
-- Permite que posiciones de cada grupo inscriban equipos
-- en otra competición SIN trasladar partidos ni estadísticas.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.competition_qualification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_competition_id uuid NOT NULL
    REFERENCES public.competitions(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  start_position integer NOT NULL CHECK (start_position > 0),
  end_position integer NOT NULL CHECK (end_position >= start_position),
  destination_competition_id uuid NOT NULL
    REFERENCES public.competitions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competition_qualification_rules_different_competitions
    CHECK (source_competition_id <> destination_competition_id),
  CONSTRAINT competition_qualification_rules_unique_range
    UNIQUE (source_competition_id, group_name, start_position, end_position)
);

CREATE INDEX IF NOT EXISTS idx_comp_qualification_rules_source
  ON public.competition_qualification_rules(source_competition_id, group_name);

CREATE INDEX IF NOT EXISTS idx_comp_qualification_rules_destination
  ON public.competition_qualification_rules(destination_competition_id);

DROP TRIGGER IF EXISTS trg_competition_qualification_rules_updated_at
  ON public.competition_qualification_rules;
CREATE TRIGGER trg_competition_qualification_rules_updated_at
BEFORE UPDATE ON public.competition_qualification_rules
FOR EACH ROW EXECUTE FUNCTION public.manager_tools_touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.competition_qualification_rules TO service_role;

COMMENT ON TABLE public.competition_qualification_rules IS
'Reglas de clasificación por posición y grupo hacia otra competición. Solo inscriben equipos; no copian partidos, resultados ni estadísticas.';
