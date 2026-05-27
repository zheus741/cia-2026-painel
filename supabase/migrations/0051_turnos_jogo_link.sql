-- ════════════════════════════════════════════════════════════════════════════
-- 0051 · Vincula turnos (Foto/Vídeo) a jogos específicos
-- ════════════════════════════════════════════════════════════════════════════
-- Coordenação precisa marcar QUAL jogo um turno deve cobrir prioritariamente.
-- O setor sozinho não basta: numa praça com vários jogos no dia, a equipe
-- precisa saber qual confronto é o foco.
--
-- jogo_id é OPCIONAL — se null, é cobertura geral do setor.
-- ════════════════════════════════════════════════════════════════════════════

alter table turnos
  add column if not exists jogo_id uuid references jogos(id) on delete set null;

create index if not exists idx_turnos_jogo on turnos(jogo_id);

comment on column turnos.jogo_id is
  'Jogo vinculado para foco da cobertura. Opcional — se null, é cobertura geral do setor.';
