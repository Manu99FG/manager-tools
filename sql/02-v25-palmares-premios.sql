-- ============================================================
-- MANAGER TOOLS V25 · PALMARÉS HISTÓRICO DE PREMIOS
-- ============================================================
-- Ejecutar DESPUÉS de V24/V24.1.
--
-- Objetivos:
-- 1. Congelar el resultado al cerrar una votación.
-- 2. Impedir que un premio cerrado cambie después.
-- 3. Guardar ganador, podio y puntos como historial permanente.
-- 4. Poder consultar palmarés por jugador y por temporada.
-- 5. Corregir explícitamente el permiso de cast_award_ballot para service_role.

ALTER TABLE public.award_polls
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

CREATE TABLE IF NOT EXISTS public.award_final_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.award_polls(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.award_candidates(id) ON DELETE RESTRICT,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  team_code text,
  rank integer NOT NULL CHECK (rank >= 1),
  points bigint NOT NULL DEFAULT 0,
  votes bigint NOT NULL DEFAULT 0,
  first_places bigint NOT NULL DEFAULT 0,
  second_places bigint NOT NULL DEFAULT 0,
  third_places bigint NOT NULL DEFAULT 0,
  finalized_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, candidate_id),
  UNIQUE (poll_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_award_final_results_poll
  ON public.award_final_results(poll_id);

CREATE INDEX IF NOT EXISTS idx_award_final_results_player
  ON public.award_final_results(player_id);

CREATE INDEX IF NOT EXISTS idx_award_final_results_winners
  ON public.award_final_results(player_id, rank);

-- ------------------------------------------------------------
-- Cierre transaccional.
-- Se toma una "foto" definitiva de award_poll_results.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_award_poll(p_poll_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll public.award_polls%ROWTYPE;
  v_ballots integer;
  v_finalized_at timestamptz := now();
BEGIN
  SELECT *
    INTO v_poll
  FROM public.award_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Votación inexistente.';
  END IF;

  -- Idempotencia: si ya está cerrada y congelada, no hacemos nada.
  IF v_poll.status = 'CLOSED' AND v_poll.finalized_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF v_poll.status <> 'OPEN' THEN
    RAISE EXCEPTION 'Solo se puede cerrar una votación que esté OPEN.';
  END IF;

  SELECT count(*)
    INTO v_ballots
  FROM public.award_ballots
  WHERE poll_id = p_poll_id;

  IF v_ballots < 1 THEN
    RAISE EXCEPTION 'No se puede cerrar una votación sin papeletas.';
  END IF;

  DELETE FROM public.award_final_results
  WHERE poll_id = p_poll_id;

  INSERT INTO public.award_final_results (
    poll_id,
    candidate_id,
    player_id,
    team_code,
    rank,
    points,
    votes,
    first_places,
    second_places,
    third_places,
    finalized_at
  )
  SELECT
    r.poll_id,
    r.candidate_id,
    r.player_id,
    r.team_code,
    row_number() OVER (
      ORDER BY
        r.points DESC,
        r.first_places DESC,
        r.second_places DESC,
        r.third_places DESC,
        p.esms_name ASC
    )::integer AS rank,
    r.points,
    r.votes,
    r.first_places,
    r.second_places,
    r.third_places,
    v_finalized_at
  FROM public.award_poll_results r
  JOIN public.players p
    ON p.id = r.player_id
  WHERE r.poll_id = p_poll_id;

  UPDATE public.award_polls
  SET
    status = 'CLOSED',
    finalized_at = v_finalized_at,
    updated_at = v_finalized_at
  WHERE id = p_poll_id;
END;
$$;

-- Permisos de las RPC que usa la aplicación con SERVICE ROLE.
REVOKE ALL ON FUNCTION public.finalize_award_poll(uuid) FROM PUBLIC;
GRANT EXECUTE
ON FUNCTION public.finalize_award_poll(uuid)
TO service_role;

-- Corrección permanente del permiso que faltaba en V24 inicial.
GRANT EXECUTE
ON FUNCTION public.cast_award_ballot(uuid, text, jsonb)
TO service_role;

-- ------------------------------------------------------------
-- Vista histórica cómoda para consultas.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.award_history AS
SELECT
  fr.id,
  fr.poll_id,
  ap.season_id,
  ap.title,
  ap.award_key,
  ap.description,
  ap.finalized_at AS poll_finalized_at,
  fr.candidate_id,
  fr.player_id,
  fr.team_code,
  fr.rank,
  fr.points,
  fr.votes,
  fr.first_places,
  fr.second_places,
  fr.third_places,
  fr.finalized_at
FROM public.award_final_results fr
JOIN public.award_polls ap
  ON ap.id = fr.poll_id
WHERE ap.status = 'CLOSED';
