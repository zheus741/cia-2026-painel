-- ════════════════════════════════════════════════════════════════════════════
-- 0062 · Status por responsável no Kanban de conteúdos
-- ════════════════════════════════════════════════════════════════════════════
-- Cada papel (captação, design, edição) ganha um status próprio de andamento:
-- nao_iniciado / produzindo / concluido. Permite ver quem já fez sua parte
-- sem mexer no status global do card.
--
-- Idempotente (ADD COLUMN IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════════════

alter table conteudos
  add column if not exists status_captacao text default 'nao_iniciado',
  add column if not exists status_design   text default 'nao_iniciado',
  add column if not exists status_edicao   text default 'nao_iniciado';

-- CHECK de whitelist (drop+add pra ser idempotente)
alter table conteudos drop constraint if exists conteudos_status_captacao_check;
alter table conteudos drop constraint if exists conteudos_status_design_check;
alter table conteudos drop constraint if exists conteudos_status_edicao_check;

alter table conteudos
  add constraint conteudos_status_captacao_check
  check (status_captacao in ('nao_iniciado', 'produzindo', 'concluido'));
alter table conteudos
  add constraint conteudos_status_design_check
  check (status_design in ('nao_iniciado', 'produzindo', 'concluido'));
alter table conteudos
  add constraint conteudos_status_edicao_check
  check (status_edicao in ('nao_iniciado', 'produzindo', 'concluido'));

comment on column conteudos.status_captacao is 'Andamento da captação: nao_iniciado/produzindo/concluido.';
comment on column conteudos.status_design   is 'Andamento do design: nao_iniciado/produzindo/concluido.';
comment on column conteudos.status_edicao   is 'Andamento da edição: nao_iniciado/produzindo/concluido.';
