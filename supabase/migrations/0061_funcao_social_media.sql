-- ════════════════════════════════════════════════════════════════════════════
-- 0061 · Adiciona 'social_media' ao enum funcao_equipe
-- ════════════════════════════════════════════════════════════════════════════
-- profiles.funcao_principal e turnos.funcao usam o enum funcao_equipe.
-- A UI (admin/escala + admin/usuarios) passou a oferecer "Social Media"
-- com value 'social_media' — sem este valor no enum, o UPDATE falha com
-- "invalid input value for enum funcao_equipe".
--
-- Mesmo padrao da migration 0041 (storymaker, lider_cobertura).
-- ADD VALUE IF NOT EXISTS é idempotente.
--
-- NOTA: ALTER TYPE ADD VALUE nao pode rodar dentro de transacao em conjunto
-- com uso imediato do valor. Rode este arquivo isolado.
-- ════════════════════════════════════════════════════════════════════════════

alter type public.funcao_equipe add value if not exists 'social_media';
