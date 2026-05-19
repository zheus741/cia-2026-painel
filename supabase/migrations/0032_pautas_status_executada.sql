-- 0032: consolida fluxo de pautas em 3 status (IDEIA, APROVADA, EXECUTADA)
--
-- Antes:  ideia → aprovada → em_execucao → entregue → (descartada)
-- Depois: ideia → aprovada → executada               → (descartada)
--
-- IMPORTANTE: este arquivo precisa ser executado em DUAS partes separadas
-- no Supabase Studio. Postgres exige que ALTER TYPE ADD VALUE seja
-- commitado antes de o novo valor poder ser usado em UPDATE.
--
-- Parte 1 (rodar primeiro, sozinha):

ALTER TYPE status_pauta ADD VALUE IF NOT EXISTS 'executada';

-- ──────────────────────────────────────────────────────────────────────────
-- Parte 2 (rodar DEPOIS da Parte 1 ter sido commitada):
--
--   UPDATE pautas SET status = 'executada'
--     WHERE status IN ('em_execucao', 'entregue');
