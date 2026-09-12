-- ============================================================
-- MANAGER TOOLS V24 · SISTEMA DE VOTACIONES Y PREMIOS
-- ============================================================
-- Ejecutar una sola vez en Supabase SQL Editor.
--
-- Modelo:
--   award_polls            -> una votación/premio
--   award_candidates       -> candidatos
--   award_voter_tokens     -> códigos de manager (guardados como hash)
--   award_ballots          -> papeletas emitidas
--   award_ballot_choices   -> 1º / 2º / 3º de cada papeleta
--
-- Los códigos nunca se guardan en texto plano.
-- Una papeleta por código y votación.
-- El voto se emite mediante una función SQL transaccional.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.award_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  title text NOT NULL,
  award_key text NOT NULL DEFAULT 'CUSTOM',
  description text,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED')),
  max_rank integer NOT NULL DEFAULT 3
    CHECK (max_rank BETWEEN 1 AND 3),
  points_first integer NOT NULL DEFAULT 5 CHECK (points_first >= 0),
  points_second integer NOT NULL DEFAULT 3 CHECK (points_second >= 0),
  points_third integer NOT NULL DEFAULT 1 CHECK (points_third >= 0),
  show_live_results boolean NOT NULL DEFAULT false,
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_award_polls_season
  ON public.award_polls(season_id);

CREATE INDEX IF NOT EXISTS idx_award_polls_status
  ON public.award_polls(status);

CREATE TABLE IF NOT EXISTS public.award_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.award_polls(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_code text,
  sort_order integer NOT NULL DEFAULT 0,
  nomination_score numeric,
  nomination_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_award_candidates_poll
  ON public.award_candidates(poll_id);

-- V24.1: datos que explican por qué la web nominó al jugador.
ALTER TABLE public.award_candidates
  ADD COLUMN IF NOT EXISTS nomination_score numeric;

ALTER TABLE public.award_candidates
  ADD COLUMN IF NOT EXISTS nomination_reason text;

CREATE TABLE IF NOT EXISTS public.award_voter_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.award_polls(id) ON DELETE CASCADE,
  label text,
  token_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, token_hash)
);

CREATE INDEX IF NOT EXISTS idx_award_voter_tokens_poll
  ON public.award_voter_tokens(poll_id);

CREATE TABLE IF NOT EXISTS public.award_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.award_polls(id) ON DELETE CASCADE,
  voter_token_id uuid NOT NULL REFERENCES public.award_voter_tokens(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, voter_token_id)
);

CREATE INDEX IF NOT EXISTS idx_award_ballots_poll
  ON public.award_ballots(poll_id);

CREATE TABLE IF NOT EXISTS public.award_ballot_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES public.award_ballots(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.award_candidates(id) ON DELETE RESTRICT,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 3),
  points integer NOT NULL CHECK (points >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ballot_id, rank),
  UNIQUE (ballot_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_award_ballot_choices_ballot
  ON public.award_ballot_choices(ballot_id);

CREATE INDEX IF NOT EXISTS idx_award_ballot_choices_candidate
  ON public.award_ballot_choices(candidate_id);

CREATE OR REPLACE FUNCTION public.manager_tools_touch_award_poll()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_polls_updated_at ON public.award_polls;
CREATE TRIGGER trg_award_polls_updated_at
BEFORE UPDATE ON public.award_polls
FOR EACH ROW
EXECUTE FUNCTION public.manager_tools_touch_award_poll();

-- ------------------------------------------------------------
-- Voto atómico.
--
-- p_choices:
-- [
--   {"candidate_id":"uuid","rank":1},
--   {"candidate_id":"uuid","rank":2},
--   {"candidate_id":"uuid","rank":3}
-- ]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_award_ballot(
  p_poll_id uuid,
  p_token_hash text,
  p_choices jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll public.award_polls%ROWTYPE;
  v_token public.award_voter_tokens%ROWTYPE;
  v_ballot_id uuid;
  v_choice jsonb;
  v_candidate_id uuid;
  v_rank integer;
  v_points integer;
  v_count integer;
  v_distinct_count integer;
BEGIN
  SELECT *
    INTO v_poll
  FROM public.award_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Votación inexistente.';
  END IF;

  IF v_poll.status <> 'OPEN' THEN
    RAISE EXCEPTION 'La votación no está abierta.';
  END IF;

  IF v_poll.opens_at IS NOT NULL AND now() < v_poll.opens_at THEN
    RAISE EXCEPTION 'La votación todavía no ha comenzado.';
  END IF;

  IF v_poll.closes_at IS NOT NULL AND now() > v_poll.closes_at THEN
    RAISE EXCEPTION 'La votación ya ha finalizado.';
  END IF;

  SELECT *
    INTO v_token
  FROM public.award_voter_tokens
  WHERE poll_id = p_poll_id
    AND token_hash = p_token_hash
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de votación incorrecto o desactivado.';
  END IF;

  IF v_token.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este código ya ha votado.';
  END IF;

  IF jsonb_typeof(p_choices) <> 'array' THEN
    RAISE EXCEPTION 'Papeleta no válida.';
  END IF;

  SELECT count(*)
    INTO v_count
  FROM jsonb_array_elements(p_choices);

  IF v_count < 1 OR v_count > v_poll.max_rank THEN
    RAISE EXCEPTION 'Número de elecciones no válido.';
  END IF;

  SELECT count(DISTINCT elem->>'candidate_id')
    INTO v_distinct_count
  FROM jsonb_array_elements(p_choices) elem;

  IF v_distinct_count <> v_count THEN
    RAISE EXCEPTION 'No puedes votar dos veces al mismo candidato.';
  END IF;

  -- Rangos exactamente 1..N, sin huecos ni duplicados.
  IF EXISTS (
    SELECT 1
    FROM generate_series(1, v_count) expected(rank)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_choices) elem
      WHERE (elem->>'rank')::integer = expected.rank
    )
  ) THEN
    RAISE EXCEPTION 'El orden de la papeleta no es válido.';
  END IF;

  INSERT INTO public.award_ballots (poll_id, voter_token_id)
  VALUES (p_poll_id, v_token.id)
  RETURNING id INTO v_ballot_id;

  FOR v_choice IN
    SELECT value FROM jsonb_array_elements(p_choices)
  LOOP
    v_candidate_id := (v_choice->>'candidate_id')::uuid;
    v_rank := (v_choice->>'rank')::integer;

    IF v_rank < 1 OR v_rank > v_poll.max_rank THEN
      RAISE EXCEPTION 'Posición de voto no válida.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.award_candidates
      WHERE id = v_candidate_id
        AND poll_id = p_poll_id
    ) THEN
      RAISE EXCEPTION 'Uno de los candidatos no pertenece a esta votación.';
    END IF;

    v_points := CASE v_rank
      WHEN 1 THEN v_poll.points_first
      WHEN 2 THEN v_poll.points_second
      WHEN 3 THEN v_poll.points_third
      ELSE 0
    END;

    INSERT INTO public.award_ballot_choices (
      ballot_id,
      candidate_id,
      rank,
      points
    )
    VALUES (
      v_ballot_id,
      v_candidate_id,
      v_rank,
      v_points
    );
  END LOOP;

  UPDATE public.award_voter_tokens
  SET used_at = now()
  WHERE id = v_token.id;

  RETURN v_ballot_id;
END;
$$;

-- La app usa la SERVICE ROLE para invocar la función.
REVOKE ALL ON FUNCTION public.cast_award_ballot(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE
ON FUNCTION public.cast_award_ballot(uuid, text, jsonb)
TO service_role;

-- Vista útil para resultados históricos.
CREATE OR REPLACE VIEW public.award_poll_results AS
SELECT
  c.poll_id,
  c.id AS candidate_id,
  c.player_id,
  c.team_code,
  COALESCE(SUM(ch.points), 0)::bigint AS points,
  COUNT(ch.id)::bigint AS votes,
  COUNT(ch.id) FILTER (WHERE ch.rank = 1)::bigint AS first_places,
  COUNT(ch.id) FILTER (WHERE ch.rank = 2)::bigint AS second_places,
  COUNT(ch.id) FILTER (WHERE ch.rank = 3)::bigint AS third_places
FROM public.award_candidates c
LEFT JOIN public.award_ballot_choices ch
  ON ch.candidate_id = c.id
GROUP BY c.poll_id, c.id, c.player_id, c.team_code;
