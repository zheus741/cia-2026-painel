-- =====================================================================
-- CIA 2026 - Migrations pendentes consolidadas (0054 a 0060)
-- =====================================================================
-- Tudo em ASCII puro pra evitar quebra no copy-paste.
-- Idempotente em todo lugar - pode rodar varias vezes sem efeito.
-- Pula 0055 (a 0060 substitui ela com o fix do CHECK).
--
-- Como usar:
--   1. Selecione TUDO neste arquivo (Cmd+A)
--   2. Cole no SQL Editor do Supabase
--   3. Run
-- =====================================================================


-- =====================================================================
-- 0054 - Schema repair: colunas usadas no codigo mas sem migration
-- =====================================================================

alter table conteudos
  add column if not exists responsavel_captacao_id uuid references profiles(id) on delete set null,
  add column if not exists responsavel_edicao_id   uuid references profiles(id) on delete set null,
  add column if not exists responsavel_design_id   uuid references profiles(id) on delete set null,
  add column if not exists horario_previsto        timestamptz;

comment on column conteudos.responsavel_captacao_id is 'Pessoa responsavel pela captacao foto/video do conteudo.';
comment on column conteudos.responsavel_edicao_id   is 'Pessoa responsavel pela edicao.';
comment on column conteudos.responsavel_design_id   is 'Pessoa responsavel pelo design.';
comment on column conteudos.horario_previsto        is 'Hora prevista de publicacao. Usada na ordenacao do kanban.';

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

create unique index if not exists uq_chave_config_modalidade_cat_div
  on chave_config(modalidade_id, categoria, divisao);

alter table chave_config enable row level security;

do $block$
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
end $block$;


-- =====================================================================
-- 0056 - Indices em queries quentes
-- =====================================================================

create index if not exists idx_jogos_equipe_a on jogos(equipe_a_id) where equipe_a_id is not null;
create index if not exists idx_jogos_equipe_b on jogos(equipe_b_id) where equipe_b_id is not null;

create index if not exists idx_jogos_modalidade_cat_div_status
  on jogos(modalidade_id, categoria, divisao, status);

create index if not exists idx_escopo_status on escopo_itens(status);
create index if not exists idx_escopo_patrocinador_status on escopo_itens(patrocinador_id, status);

create index if not exists idx_patrocinadores_edicao_ativo
  on patrocinadores(edicao_id, ativo) where ativo = true;

create index if not exists idx_profiles_ativo_nome
  on profiles(ativo, nome) where ativo = true;

create index if not exists idx_conteudos_setor_status
  on conteudos(setor_id, status) where setor_id is not null;
create index if not exists idx_conteudos_modalidade_status
  on conteudos(modalidade_id, status) where modalidade_id is not null;

create index if not exists idx_turnos_setor_funcao_dia
  on turnos(setor_id, funcao, dia_id) where setor_id is not null;


-- =====================================================================
-- 0057 - FKs corretas em DELETE
-- =====================================================================

do $block$
declare
  v_constraint_name text;
begin
  -- turnos.user_id: CASCADE -> RESTRICT
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.turnos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.turnos'::regclass and attname = 'user_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table turnos drop constraint %I', v_constraint_name);
  end if;
  alter table turnos
    add constraint turnos_user_id_fkey
    foreign key (user_id) references profiles(id) on delete restrict;

  -- jogos.equipe_a_id: NO ACTION -> SET NULL
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.jogos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.jogos'::regclass and attname = 'equipe_a_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table jogos drop constraint %I', v_constraint_name);
  end if;
  alter table jogos
    add constraint jogos_equipe_a_id_fkey
    foreign key (equipe_a_id) references equipes(id) on delete set null;

  -- jogos.equipe_b_id: NO ACTION -> SET NULL
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.jogos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.jogos'::regclass and attname = 'equipe_b_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table jogos drop constraint %I', v_constraint_name);
  end if;
  alter table jogos
    add constraint jogos_equipe_b_id_fkey
    foreign key (equipe_b_id) references equipes(id) on delete set null;

  -- conteudos.jogo_id: NO ACTION -> SET NULL
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.conteudos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.conteudos'::regclass and attname = 'jogo_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table conteudos drop constraint %I', v_constraint_name);
  end if;
  alter table conteudos
    add constraint conteudos_jogo_id_fkey
    foreign key (jogo_id) references jogos(id) on delete set null;

  -- modalidade_id em jogos: RESTRICT explicito
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.jogos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.jogos'::regclass and attname = 'modalidade_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table jogos drop constraint %I', v_constraint_name);
  end if;
  alter table jogos
    add constraint jogos_modalidade_id_fkey
    foreign key (modalidade_id) references modalidades(id) on delete restrict;
end $block$;


-- =====================================================================
-- 0058 - Cleanup automatico de notificacoes (pula se pg_cron indisponivel)
-- =====================================================================

do $block$
begin
  create extension if not exists pg_cron;
exception
  when undefined_file then
    raise notice 'pg_cron nao disponivel neste plano - pulando';
  when others then
    raise notice 'erro inesperado em pg_cron - pulando';
end $block$;

do $block$
begin
  perform cron.unschedule('cleanup-notificacoes-antigas');
exception
  when others then null;
end $block$;

do $block$
begin
  perform cron.schedule(
    'cleanup-notificacoes-antigas',
    '30 7 * * *',
    'delete from notificacoes where lida = true and created_at < now() - interval ''60 days'''
  );
exception
  when undefined_function then
    raise notice 'pg_cron.schedule nao disponivel - rode manualmente o DELETE periodicamente';
  when others then null;
end $block$;


-- =====================================================================
-- 0059 - jogos.atualizado_em + trigger
-- =====================================================================

alter table jogos
  add column if not exists atualizado_em timestamptz default now();

create or replace function set_atualizado_em()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  new.atualizado_em := now();
  return new;
end;
$func$;

drop trigger if exists trg_jogos_atualizado_em on jogos;
create trigger trg_jogos_atualizado_em
  before update on jogos
  for each row execute function set_atualizado_em();

update jogos set atualizado_em = coalesce(atualizado_em, criado_em, now())
 where atualizado_em is null;

create index if not exists idx_jogos_atualizado_em
  on jogos(atualizado_em desc);


-- =====================================================================
-- 0060 - canal_publicacao: enum -> text + CHECK via funcao IMMUTABLE
-- =====================================================================

do $block$
declare
  v_current_type text;
begin
  select data_type into v_current_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'conteudos'
     and column_name  = 'canal_publicacao';

  if v_current_type = 'USER-DEFINED' then
    alter table conteudos
      alter column canal_publicacao type text
      using canal_publicacao::text;
  end if;
end $block$;

create or replace function is_valid_canal_publicacao(p_value text)
returns boolean
language plpgsql
immutable
parallel safe
as $func$
declare
  v_allowed text[] := array[
    'instagram_cia',
    'instagram_jogo_rapido',
    'tiktok_cia',
    'instagram_exp',
    'instagram_grupo_exp',
    'tiktok_exp',
    'instagram_nix',
    'x_cia',
    'x_exp',
    'whats_comunidade',
    'youtube_exp',
    'instagram_feed',
    'instagram_stories',
    'instagram_reels',
    'tiktok',
    'youtube',
    'youtube_shorts',
    'twitter_x',
    'facebook',
    'whatsapp_status',
    'outro'
  ];
  v_item text;
begin
  if p_value is null then
    return true;
  end if;

  foreach v_item in array string_to_array(p_value, ',')
  loop
    if trim(v_item) <> all(v_allowed) then
      return false;
    end if;
  end loop;

  return true;
end;
$func$;

alter table conteudos
  drop constraint if exists conteudos_canal_publicacao_check;

alter table conteudos
  add constraint conteudos_canal_publicacao_check
  check (is_valid_canal_publicacao(canal_publicacao));


-- =====================================================================
-- FIM
-- =====================================================================
