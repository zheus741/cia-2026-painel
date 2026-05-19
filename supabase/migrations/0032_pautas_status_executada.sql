-- 0032: consolida fluxo de pautas em 3 status (IDEIA, APROVADA, EXECUTADA)
--
-- Antes:  ideia → aprovada → em_execucao → entregue → (descartada)
-- Depois: ideia → aprovada → executada               → (descartada)
--
-- 'em_execucao' e 'entregue' são consolidados em 'executada' — menos atrito
-- pra equipe e mais alinhado com o fluxo real (uma pauta tá no kanban até
-- ser executada; cobertura ao vivo não precisa do estado intermediário).

-- ── 1. Adiciona novo valor ao enum ──────────────────────────────────────────
DO $$
BEGIN
  ALTER TYPE status_pauta ADD VALUE IF NOT EXISTS 'executada';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Migra pautas existentes ──────────────────────────────────────────────
-- Tanto 'em_execucao' (em produção) quanto 'entregue' (já publicado) viram
-- 'executada' — o que importa é "saiu da fila de cobertura".
UPDATE pautas SET status = 'executada'
  WHERE status IN ('em_execucao', 'entregue');
