-- =========================================================
-- V31.23 · TIPO DE COMPETICIÓN "SOLO GRUPOS"
-- Permite crear competiciones cuya fase completa sea de grupos,
-- sin eliminatorias posteriores.
-- =========================================================

ALTER TABLE public.competitions
  DROP CONSTRAINT IF EXISTS competitions_type_check;

ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_type_check
  CHECK (type IN ('LEAGUE', 'CUP', 'GROUPS', 'GROUPS_KNOCKOUT', 'SUPERCUP'));
