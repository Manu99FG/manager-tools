-- V31.31 · Clase de club editable desde administración

CREATE TABLE IF NOT EXISTS public.club_metadata (
  team_code text PRIMARY KEY,
  club_class text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_metadata_class
  ON public.club_metadata (club_class);

GRANT SELECT ON public.club_metadata TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_metadata TO service_role;

COMMENT ON TABLE public.club_metadata IS 'Metadatos editables de los clubes de Liga de Leyendas.';
COMMENT ON COLUMN public.club_metadata.club_class IS 'Clase/categoría visible del club. Texto libre editable desde administración.';
