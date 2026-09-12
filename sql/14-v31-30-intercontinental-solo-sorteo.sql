-- V31.30 · Copa Intercontinental: los equipos se asignan únicamente mediante sorteo.
-- Limpia asignaciones automáticas antiguas SOLO en Copas Intercontinentales que todavía no tienen partidos.
DELETE FROM public.competition_teams ct
USING public.competitions c
WHERE ct.competition_id = c.id
  AND lower(c.name) LIKE '%intercontinental%'
  AND NOT EXISTS (
    SELECT 1 FROM public.matches m WHERE m.competition_id = c.id
  );
