-- ============================================================
-- MANAGER TOOLS V31.22 · BORRADO COMPLETO DE TEMPORADAS
-- ============================================================
-- Permite borrar una temporada aunque contenga competiciones,
-- partidos y votaciones. El núcleo de competiciones ya usa
-- ON DELETE CASCADE; aquí corregimos las relaciones internas
-- del sistema de premios que podían bloquear la cascada.
--
-- Ejecutar UNA VEZ en Supabase SQL Editor antes de usar el nuevo
-- botón de borrado de temporadas.

BEGIN;

-- Una papeleta pertenece a un token de esa misma votación.
-- Al borrar la votación/temporada, ambos deben desaparecer.
ALTER TABLE public.award_ballots
  DROP CONSTRAINT IF EXISTS award_ballots_voter_token_id_fkey;

ALTER TABLE public.award_ballots
  ADD CONSTRAINT award_ballots_voter_token_id_fkey
  FOREIGN KEY (voter_token_id)
  REFERENCES public.award_voter_tokens(id)
  ON DELETE CASCADE;

-- Las elecciones de una papeleta dependen del candidato.
-- Si desaparece la votación/temporada, no deben bloquear
-- la eliminación de award_candidates.
ALTER TABLE public.award_ballot_choices
  DROP CONSTRAINT IF EXISTS award_ballot_choices_candidate_id_fkey;

ALTER TABLE public.award_ballot_choices
  ADD CONSTRAINT award_ballot_choices_candidate_id_fkey
  FOREIGN KEY (candidate_id)
  REFERENCES public.award_candidates(id)
  ON DELETE CASCADE;

-- El resultado final también depende del candidato de la votación.
ALTER TABLE public.award_final_results
  DROP CONSTRAINT IF EXISTS award_final_results_candidate_id_fkey;

ALTER TABLE public.award_final_results
  ADD CONSTRAINT award_final_results_candidate_id_fkey
  FOREIGN KEY (candidate_id)
  REFERENCES public.award_candidates(id)
  ON DELETE CASCADE;

COMMIT;
