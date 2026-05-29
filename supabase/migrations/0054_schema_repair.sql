-- ════════════════════════════════════════════════════════════════════════════
-- 0054 · Schema repair — colunas usadas no código mas sem migration de origem
-- ════════════════════════════════════════════════════════════════════════════
-- Diagnóstico: várias colunas são lidas/indexadas pelo código mas nunca tiveram
-- `ADD COLUMN` versionado. Provavelmente foram criadas direto no Supabase
-- Dashboard. Esta migration é DEFENSIVA com IF NOT EXISTS — não quebra se
-- a coluna já existir, mas garante que qualquer ambiente novo (staging,
-- replica, dev fresh) sobe consistente.
--
-- Cobertura:
--  - conteudos.responsavel_captacao_id  (indexada em 0023)
--  - conteudos.responsavel_edicao_id    (indexada em 0023)
--  - conteudos.responsavel_design_id    (indexada em 0023)
--  - conteudos.horario_previsto         (indexada em 0025)
--  - chave_config (tabela inteira — usada por /esportivo/chaveamento)
-- ════════════════════════════════════════════════════════════════════════════

-- ── conteudos: responsáveis de pipeline ────────────────────────────────────
alter table conteudos
  add column if not exists responsavel_captacao_id uuid references profiles(id) on delete set null,
  add column if not exists responsavel_edicao_id   uuid references profiles(id) on delete set null,
  add column if not exists responsavel_design_id   uuid references profiles(id) on delete set null,
  add column if not exists horario_previsto        timestamptz;

comment on column conteudos.responsavel_captacao_id is 'Pessoa responsável pela captação foto/vídeo do conteúdo.';
comment on column conteudos.responsavel_edicao_id   is 'Pessoa responsável pela edição.';
comment on column conteudos.responsavel_design_id   is 'Pessoa responsável pelo design.';
comment on column conteudos.horario_previsto        is 'Hora prevista de publicação. Usada na ordenação do kanban.';

-- ── chave_config: tabela do chaveamento eliminatório ──────────────────────
-- Migrations 0048/0049 fazem INSERT mas sem CREATE TABLE — mais um drift.
create table if not exists chave_config (
  id              uuid primary key default gen_random_uuid(),
  modalidade_id   uuid not null references modalidades(id) on delete cascade,
  categoria       text not null,
  divisao         text not null,
  num_teams       integer not null,
  seeds           text[] not null default '{}',
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz
);

-- Unique composite: 1 config por (modalidade, categoria, divisao)
create unique index if not exists uq_chave_config_modalidade_cat_div
  on chave_config(modalidade_id, categoria, divisao);

alter table chave_config enable row level security;

-- Policies: leitura para autenticados, escrita só pra coord/admin
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chave_config'
      and policyname = 'chave_config_read_all'
  ) then
    create policy chave_config_read_all on chave_config
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chave_config'
      and policyname = 'chave_config_write_coord'
  ) then
    create policy chave_config_write_coord on chave_config
      for all to authenticated
      using (
        exists (
          select 1 from profiles
          where id = (select auth.uid())
            and role in ('admin', 'coordenacao', 'coordenador_esportivo')
        )
      );
  end if;
end $$;
