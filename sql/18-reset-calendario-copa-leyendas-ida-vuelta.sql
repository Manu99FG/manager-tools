-- COPA DE LEYENDAS
-- Borra únicamente partidos y jornadas/calendario generados.
-- Conserva equipos, clases, grupos y configuración.

DO $$
DECLARE
  comp_id uuid;
BEGIN
  SELECT id
    INTO comp_id
  FROM public.competitions
  WHERE lower(name) = lower('Copa de Leyendas')
  ORDER BY created_at DESC
  LIMIT 1;

  IF comp_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la competición Copa de Leyendas';
  END IF;

  DELETE FROM public.matches
  WHERE competition_id = comp_id;

  DELETE FROM public.competition_rounds
  WHERE competition_id = comp_id;

  UPDATE public.competitions
  SET home_and_away = true
  WHERE id = comp_id;

  RAISE NOTICE 'Calendario eliminado y Copa de Leyendas configurada con fase de clases a ida y vuelta.';
END $$;
