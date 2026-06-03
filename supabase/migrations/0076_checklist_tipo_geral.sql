-- ════════════════════════════════════════════════════════════════════════════
-- 0076 · Checklist — tipo 'geral' para templates de assuntos diversos
-- ════════════════════════════════════════════════════════════════════════════
-- Hoje o enum tipo_checklist só tem jogo/show/festa/ativacao_patrocinador —
-- todos pressupõem um vínculo. Para criar templates operacionais genéricos
-- (montagem de palco, credenciamento, limpeza, segurança, etc.) sem precisar
-- vincular a um jogo/show, adiciona o tipo 'geral'.
--
-- ADD VALUE é idempotente com IF NOT EXISTS. Rodar isolado no SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

alter type tipo_checklist add value if not exists 'geral';
