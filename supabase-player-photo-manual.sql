-- =========================================================
-- MANAGER TOOLS - FOTO MANUAL DEL JUGADOR
-- =========================================================

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS photo_path text;

-- Bucket público: las escrituras se hacen exclusivamente
-- desde el servidor con la clave service_role.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'player-photos',
  'player-photos',
  true,
  20971520,
  ARRAY['image/png']
)
ON CONFLICT (id)
DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Si llegaste a crear la antigua tabla de Wikimedia y ya no
-- la necesitas, puedes borrarla MANUALMENTE con esta línea:
-- DROP TABLE IF EXISTS public.player_photos;
