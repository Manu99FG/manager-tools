-- MANAGER TOOLS V31.34
-- CLUB DE ORIGEN HISTÓRICO DEL JUGADOR
-- La Plantilla BASE define el club en el que cada jugador inicia la partida.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS origin_team_code text;

CREATE INDEX IF NOT EXISTS idx_players_origin_team_code
  ON public.players(origin_team_code);

-- Para bases ya existentes, si todavía no existe un origen conocido,
-- usamos el club propietario/actual como respaldo. Al volver a ejecutar
-- "Reconstruir jugadores desde BASE", el valor se corrige con la BASE real.
UPDATE public.players
SET origin_team_code = COALESCE(owner_team_code, current_team_code)
WHERE origin_team_code IS NULL;
