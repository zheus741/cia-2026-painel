-- =========================================================================
-- CIA 2026 — Setup Completo (migrations 0001–0003 + 0005–0008)
-- Cole no Supabase SQL Editor e execute de uma vez.
-- ATENÇÃO: após o primeiro login, execute 0004_admin_zheus.sql separadamente.
-- =========================================================================

-- =========================================================================
-- [0001] SCHEMA BASE — Enums, Tabelas, Triggers, RLS
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── ENUMS ────────────────────────────────────────────────────────────────

create type role_user as enum (
  'admin', 'coordenacao', 'lider_area', 'operador'
);

create type funcao_equipe as enum (
  'foto', 'video', 'social', 'reporter', 'editor',
  'drone', 'roaming', 'coordenacao', 'producao', 'design'
);

create type tipo_conteudo as enum (
  'story_rapido', 'story_editado', 'reels', 'card_feed',
  'card_patrocinado', 'texto_legenda', 'repost', 'cobertura_ao_vivo'
);

create type tipo_estagio as enum (
  'captura', 'pesquisa', 'edicao_video', 'edicao_foto', 'design_arte',
  'redacao', 'aprovacao_coord', 'aprovacao_patro', 'publicacao'
);

create type status_estagio as enum (
  'aguardando', 'pendente', 'em_andamento', 'pausado', 'bloqueado', 'pronto', 'pulado'
);

create type status_conteudo as enum (
  'rascunho', 'em_producao', 'publicado', 'arquivado', 'cancelado'
);

create type canal_publicacao as enum (
  'instagram_feed', 'instagram_stories', 'instagram_reels',
  'tiktok', 'youtube', 'youtube_shorts', 'twitter_x',
  'facebook', 'whatsapp_status', 'outro'
);

create type tipo_setor as enum (
  'esportivo', 'palco', 'festa', 'apoio', 'externo'
);

create type status_pauta as enum (
  'ideia', 'aprovada', 'em_execucao', 'entregue', 'descartada'
);

-- ── TABELAS ───────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  telefone text,
  foto_url text,
  role role_user not null default 'operador',
  funcao_principal funcao_equipe,
  funcoes_adicionais funcao_equipe[] default '{}',
  ativo boolean not null default true,
  bio text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index idx_profiles_role on profiles(role);
create index idx_profiles_funcao on profiles(funcao_principal);

create table edicoes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  ano integer not null,
  cidade text,
  data_inicio date not null,
  data_fim date not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table dias_evento (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  data date not null,
  nome_dia text not null,
  tema text,
  observacoes text,
  unique (edicao_id, data)
);

create table setores (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  nome text not null,
  tipo tipo_setor not null,
  endereco text,
  lat numeric(10,7),
  lng numeric(10,7),
  capacidade_pessoas integer,
  observacoes text,
  cor_hex text,
  criado_em timestamptz not null default now()
);

create table modalidades (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  nome text not null,
  slug text not null,
  icone text,
  categorias text[] default '{}',
  divisoes text[] default '{}',
  setor_principal_id uuid references setores(id),
  observacoes text,
  unique (edicao_id, slug)
);

create table equipes (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  nome text not null,
  slug text,
  tipo text not null,
  divisao text,
  universidade text,
  logo_url text,
  cor_primaria text,
  observacoes text,
  criado_em timestamptz not null default now()
);
create index idx_equipes_tipo on equipes(tipo);
create index idx_equipes_divisao on equipes(divisao);

create table jogos (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  modalidade_id uuid not null references modalidades(id),
  dia_id uuid references dias_evento(id),
  setor_id uuid references setores(id),
  categoria text,
  divisao text,
  fase text,
  equipe_a_id uuid references equipes(id),
  equipe_b_id uuid references equipes(id),
  equipe_a_nome text,
  equipe_b_nome text,
  inicio timestamptz,
  fim_previsto timestamptz,
  status text default 'agendado',
  placar_a integer,
  placar_b integer,
  observacoes text,
  criado_em timestamptz not null default now()
);
create index idx_jogos_dia on jogos(dia_id);
create index idx_jogos_modalidade on jogos(modalidade_id);
create index idx_jogos_inicio on jogos(inicio);

create table shows (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  dia_id uuid references dias_evento(id),
  setor_id uuid references setores(id),
  nome text not null,
  tipo text,
  inicio timestamptz,
  fim_previsto timestamptz,
  duracao_minutos integer,
  observacoes text,
  embaixador boolean default false,
  ordem_no_palco integer,
  criado_em timestamptz not null default now()
);
create index idx_shows_dia on shows(dia_id);
create index idx_shows_inicio on shows(inicio);

create table festas (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  dia_id uuid references dias_evento(id),
  setor_id uuid references setores(id),
  nome text not null,
  tema text,
  inicio timestamptz,
  fim_previsto timestamptz,
  observacoes text,
  criado_em timestamptz not null default now()
);

create table patrocinadores (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  nome text not null,
  slug text,
  logo_url text,
  cor_marca text,
  cota text,
  contato_nome text,
  contato_email text,
  contato_telefone text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table escopo_itens (
  id uuid primary key default uuid_generate_v4(),
  patrocinador_id uuid not null references patrocinadores(id) on delete cascade,
  dia_id uuid references dias_evento(id),
  tipo_conteudo tipo_conteudo,
  canal canal_publicacao,
  setor_id uuid references setores(id),
  vinculado_a_show_id uuid references shows(id),
  vinculado_a_festa_id uuid references festas(id),
  vinculado_a_modalidade_id uuid references modalidades(id),
  quantidade_prevista integer not null default 1,
  descricao text,
  prazo_limite timestamptz,
  status text default 'pendente',
  observacoes text,
  criado_em timestamptz not null default now()
);
create index idx_escopo_patrocinador on escopo_itens(patrocinador_id);
create index idx_escopo_dia on escopo_itens(dia_id);

create table turnos (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  dia_id uuid not null references dias_evento(id),
  user_id uuid references profiles(id) on delete cascade,
  nome_pessoa text,
  funcao funcao_equipe not null,
  setor_id uuid references setores(id),
  inicio timestamptz not null,
  fim timestamptz not null,
  is_roaming boolean not null default false,
  lider_area_id uuid references profiles(id),
  observacoes text,
  criado_em timestamptz not null default now(),
  constraint turnos_has_person check (user_id is not null or (nome_pessoa is not null and nome_pessoa <> ''))
);
create index idx_turnos_user on turnos(user_id);
create index idx_turnos_dia on turnos(dia_id);
create index idx_turnos_inicio on turnos(inicio);

create table pipeline_templates (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  tipo_conteudo tipo_conteudo not null,
  patrocinado boolean not null default false,
  estagios tipo_estagio[] not null,
  sla_por_estagio jsonb default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table conteudos (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  titulo text not null,
  tipo tipo_conteudo not null,
  pipeline_template_id uuid references pipeline_templates(id),
  status status_conteudo not null default 'rascunho',
  prioridade integer not null default 3,
  jogo_id uuid references jogos(id),
  show_id uuid references shows(id),
  festa_id uuid references festas(id),
  modalidade_id uuid references modalidades(id),
  patrocinador_id uuid references patrocinadores(id),
  escopo_item_id uuid references escopo_itens(id),
  setor_id uuid references setores(id),
  dia_id uuid references dias_evento(id),
  briefing text,
  link_publicado text,
  canal_publicacao canal_publicacao,
  publicado_em timestamptz,
  metricas jsonb default '{}'::jsonb,
  criado_por uuid references profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index idx_conteudos_status on conteudos(status);
create index idx_conteudos_dia on conteudos(dia_id);
create index idx_conteudos_patrocinador on conteudos(patrocinador_id);
create index idx_conteudos_jogo on conteudos(jogo_id);
create index idx_conteudos_show on conteudos(show_id);

create table estagios_conteudo (
  id uuid primary key default uuid_generate_v4(),
  conteudo_id uuid not null references conteudos(id) on delete cascade,
  estagio tipo_estagio not null,
  ordem integer not null,
  status status_estagio not null default 'aguardando',
  dono_id uuid references profiles(id),
  iniciado_em timestamptz,
  concluido_em timestamptz,
  sla_minutos integer,
  prazo timestamptz,
  observacao text,
  link_resultado text,
  unique (conteudo_id, estagio, ordem)
);
create index idx_estagios_conteudo on estagios_conteudo(conteudo_id);
create index idx_estagios_dono on estagios_conteudo(dono_id);
create index idx_estagios_status on estagios_conteudo(status);

create table handoffs (
  id uuid primary key default uuid_generate_v4(),
  conteudo_id uuid not null references conteudos(id) on delete cascade,
  estagio_origem tipo_estagio,
  estagio_destino tipo_estagio,
  from_user_id uuid references profiles(id),
  to_user_id uuid references profiles(id),
  observacao text,
  criado_em timestamptz not null default now()
);
create index idx_handoffs_conteudo on handoffs(conteudo_id);

create table tags (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text not null,
  categoria text,
  cor_hex text,
  unique (slug, categoria)
);

create table referencias (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  url text,
  screenshot_url text,
  titulo text,
  descricao text,
  origem text,
  autor_id uuid references profiles(id),
  destacada boolean not null default false,
  arquivada boolean not null default false,
  ultima_vez_usada timestamptz,
  uso_count integer not null default 0,
  criado_em timestamptz not null default now()
);
create index idx_referencias_destacada on referencias(destacada) where destacada = true;
create index idx_referencias_arquivada on referencias(arquivada);

create table referencia_tags (
  referencia_id uuid not null references referencias(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (referencia_id, tag_id)
);

create table conteudo_referencias (
  conteudo_id uuid not null references conteudos(id) on delete cascade,
  referencia_id uuid not null references referencias(id) on delete cascade,
  vinculado_em timestamptz not null default now(),
  primary key (conteudo_id, referencia_id)
);

create table pautas (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  titulo text not null,
  descricao text,
  status status_pauta not null default 'ideia',
  autor_id uuid references profiles(id),
  responsavel_id uuid references profiles(id),
  setor_id uuid references setores(id),
  dia_id uuid references dias_evento(id),
  conteudo_gerado_id uuid references conteudos(id),
  criado_em timestamptz not null default now()
);

create table docs (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  titulo text not null,
  slug text not null,
  conteudo_md text not null default '',
  categoria text,
  funcao funcao_equipe,
  ordem integer default 0,
  publicado boolean not null default true,
  autor_id uuid references profiles(id),
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  unique (edicao_id, slug)
);

create table clima_cache (
  id uuid primary key default uuid_generate_v4(),
  cidade text not null default 'Uberaba',
  data date not null,
  hora_referencia integer not null,
  temperatura numeric(4,1),
  sensacao numeric(4,1),
  umidade integer,
  chuva_prob integer,
  condicao text,
  icone text,
  atualizado_em timestamptz not null default now(),
  unique (cidade, data, hora_referencia)
);

-- ── TRIGGERS ──────────────────────────────────────────────────────────────

create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_upd before update on profiles
  for each row execute function set_atualizado_em();
create trigger trg_conteudos_upd before update on conteudos
  for each row execute function set_atualizado_em();
create trigger trg_docs_upd before update on docs
  for each row execute function set_atualizado_em();

-- ── HANDLER: criar profile após signup ───────────────────────────────────

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'operador'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table edicoes enable row level security;
alter table dias_evento enable row level security;
alter table setores enable row level security;
alter table modalidades enable row level security;
alter table equipes enable row level security;
alter table jogos enable row level security;
alter table shows enable row level security;
alter table festas enable row level security;
alter table patrocinadores enable row level security;
alter table escopo_itens enable row level security;
alter table turnos enable row level security;
alter table pipeline_templates enable row level security;
alter table conteudos enable row level security;
alter table estagios_conteudo enable row level security;
alter table handoffs enable row level security;
alter table tags enable row level security;
alter table referencias enable row level security;
alter table referencia_tags enable row level security;
alter table conteudo_referencias enable row level security;
alter table pautas enable row level security;
alter table docs enable row level security;
alter table clima_cache enable row level security;

create or replace function auth_role()
returns role_user language sql stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable as $$
  select coalesce(auth_role() = 'admin', false);
$$;

create or replace function is_coord_or_admin()
returns boolean language sql stable as $$
  select coalesce(auth_role() in ('admin', 'coordenacao'), false);
$$;

create or replace function is_lider_or_above()
returns boolean language sql stable as $$
  select coalesce(auth_role() in ('admin', 'coordenacao', 'lider_area'), false);
$$;

create policy "profiles: ler todos autenticados"
  on profiles for select to authenticated using (true);
create policy "profiles: editar próprio"
  on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin edita qualquer um"
  on profiles for all to authenticated
  using (is_admin()) with check (is_admin());

do $$
declare t text;
begin
  for t in select unnest(array[
    'edicoes','dias_evento','setores','modalidades','equipes','jogos','shows','festas',
    'patrocinadores','escopo_itens','turnos','pipeline_templates','conteudos',
    'estagios_conteudo','handoffs','tags','referencias','referencia_tags',
    'conteudo_referencias','pautas','docs','clima_cache'
  ])
  loop
    execute format('create policy "%s: ler autenticado" on %I for select to authenticated using (true);', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'edicoes','dias_evento','setores','modalidades','equipes','jogos','shows','festas',
    'patrocinadores','escopo_itens','turnos','pipeline_templates','tags','docs'
  ])
  loop
    execute format('create policy "%s: write coord+admin" on %I for all to authenticated using (is_coord_or_admin()) with check (is_coord_or_admin());', t, t);
  end loop;
end $$;

create policy "conteudos: criar autenticado"
  on conteudos for insert to authenticated with check (true);
create policy "conteudos: update lider+coord+admin"
  on conteudos for update to authenticated
  using (is_lider_or_above()) with check (is_lider_or_above());
create policy "conteudos: delete coord+admin"
  on conteudos for delete to authenticated using (is_coord_or_admin());

create policy "estagios: update próprio dono ou coord+"
  on estagios_conteudo for update to authenticated
  using (dono_id = auth.uid() or is_lider_or_above())
  with check (dono_id = auth.uid() or is_lider_or_above());
create policy "estagios: insert lider+"
  on estagios_conteudo for insert to authenticated with check (is_lider_or_above());
create policy "estagios: delete coord+"
  on estagios_conteudo for delete to authenticated using (is_coord_or_admin());

create policy "handoffs: insert autenticado"
  on handoffs for insert to authenticated with check (true);

create policy "referencias: insert autenticado"
  on referencias for insert to authenticated with check (true);
create policy "referencias: update autor ou lider+"
  on referencias for update to authenticated
  using (autor_id = auth.uid() or is_lider_or_above())
  with check (autor_id = auth.uid() or is_lider_or_above());
create policy "referencias: delete autor ou coord+"
  on referencias for delete to authenticated
  using (autor_id = auth.uid() or is_coord_or_admin());
create policy "referencia_tags: insert autenticado"
  on referencia_tags for insert to authenticated with check (true);
create policy "referencia_tags: delete autor ou lider+"
  on referencia_tags for delete to authenticated
  using (exists (select 1 from referencias r where r.id = referencia_id
                 and (r.autor_id = auth.uid() or is_lider_or_above())));
create policy "conteudo_referencias: write lider+"
  on conteudo_referencias for all to authenticated
  using (is_lider_or_above()) with check (is_lider_or_above());

create policy "pautas: insert autenticado"
  on pautas for insert to authenticated with check (true);
create policy "pautas: update autor ou lider+"
  on pautas for update to authenticated
  using (autor_id = auth.uid() or is_lider_or_above())
  with check (autor_id = auth.uid() or is_lider_or_above());
create policy "pautas: delete coord+"
  on pautas for delete to authenticated using (is_coord_or_admin());

-- =========================================================================
-- [0005] SEED — Edição, Dias, Setores, Modalidades, Pipeline, Tags
-- =========================================================================

insert into edicoes (id, nome, ano, cidade, data_inicio, data_fim, ativa)
values ('00000000-0000-0000-0000-000000000001', 'CIA 2026', 2026, 'Uberaba', '2026-06-04', '2026-06-07', true)
on conflict (id) do nothing;

insert into dias_evento (id, edicao_id, data, nome_dia, tema) values
  ('00000000-0000-0001-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-04', 'Quinta',  'Abertura CIA 2026'),
  ('00000000-0000-0001-0000-000000000002', '00000000-0000-0000-0000-000000000001', '2026-06-05', 'Sexta',   'Semifinais'),
  ('00000000-0000-0001-0000-000000000003', '00000000-0000-0000-0000-000000000001', '2026-06-06', 'Sábado',  'Finals Day'),
  ('00000000-0000-0001-0000-000000000004', '00000000-0000-0000-0000-000000000001', '2026-06-07', 'Domingo', 'Grande Final CIA')
on conflict (edicao_id, data) do nothing;

insert into setores (id, edicao_id, nome, tipo, lat, lng, endereco, capacidade_pessoas, cor_hex) values
  ('00000000-0000-0002-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'SESI Clube',      'esportivo', -19.7566, -47.9421, 'Av. Guilherme Ferreira, Uberaba/MG', 1200, '#4a8a5c'),
  ('00000000-0000-0002-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'UTC',             'esportivo', -19.7338, -47.9155, 'Uberaba/MG',                          800, '#4a8a5c'),
  ('00000000-0000-0002-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Palco Principal', 'palco',     -19.7639, -47.9365, 'Centro de Eventos, Uberaba/MG',      5000, '#c8973a'),
  ('00000000-0000-0002-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Palco Eletrônico','palco',     -19.7642, -47.9368, 'Centro de Eventos, Uberaba/MG',      3000, '#c8973a'),
  ('00000000-0000-0002-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Palco 360°',      'palco',     -19.7637, -47.9362, 'Centro de Eventos, Uberaba/MG',      2000, '#c8973a'),
  ('00000000-0000-0002-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Área de Festa',   'festa',     -19.7644, -47.9360, 'Centro de Eventos, Uberaba/MG',      4000, '#ec4899'),
  ('00000000-0000-0002-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   'Camarotes',       'apoio',     -19.7648, -47.9355, 'Centro de Eventos, Uberaba/MG',      null, '#64748b'),
  ('00000000-0000-0002-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   'Base da Equipe',  'apoio',     -19.7633, -47.9370, 'Centro de Eventos, Uberaba/MG',      null, '#64748b')
on conflict (id) do nothing;

insert into modalidades (id, edicao_id, nome, slug, icone, categorias, setor_principal_id) values
  ('00000000-0000-0003-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Futsal',          'futsal',         '⚽', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000001'),
  ('00000000-0000-0003-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Futebol de Campo','futebol',        '🏟️', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000001'),
  ('00000000-0000-0003-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Futebol Society', 'futebol-society','⚽', array['Masculino'],            '00000000-0000-0002-0000-000000000001'),
  ('00000000-0000-0003-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Vôlei',           'volei',          '🏐', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000002'),
  ('00000000-0000-0003-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Basquete',        'basquete',       '🏀', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000002'),
  ('00000000-0000-0003-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Handebol',        'handebol',       '🤾', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000002'),
  ('00000000-0000-0003-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   'Natação',         'natacao',        '🏊', array['Masculino','Feminino'], null),
  ('00000000-0000-0003-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   'Atletismo',       'atletismo',      '🏃', array['Masculino','Feminino'], null),
  ('00000000-0000-0003-0000-000000000009', '00000000-0000-0000-0000-000000000001',
   'Tênis de Mesa',   'tenis-mesa',     '🏓', array['Masculino','Feminino'], null),
  ('00000000-0000-0003-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'Cheer',           'cheer',          '📣', array[]::text[],              null),
  ('00000000-0000-0003-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   'Bateria',         'bateria',        '🥁', array[]::text[],              null),
  ('00000000-0000-0003-0000-000000000012', '00000000-0000-0000-0000-000000000001',
   'Xadrez',          'xadrez',         '♟️', array['Masculino','Feminino'], null)
on conflict (edicao_id, slug) do nothing;

insert into pipeline_templates (id, nome, tipo_conteudo, patrocinado, estagios, sla_por_estagio) values
  ('00000000-0000-0004-0000-000000000001', 'Story Rápido', 'story_rapido', false,
   array['captura','publicacao']::tipo_estagio[],
   '{"captura": 0, "publicacao": 0}'::jsonb),
  ('00000000-0000-0004-0000-000000000002', 'Story Editado', 'story_rapido', false,
   array['captura','edicao_foto','redacao','publicacao']::tipo_estagio[],
   '{"captura": 0, "edicao_foto": 15, "redacao": 10, "publicacao": 0}'::jsonb),
  ('00000000-0000-0004-0000-000000000003', 'Reels', 'reels', false,
   array['captura','edicao_video','redacao','aprovacao_coord','publicacao']::tipo_estagio[],
   '{"captura": 0, "edicao_video": 60, "redacao": 15, "aprovacao_coord": 15, "publicacao": 0}'::jsonb),
  ('00000000-0000-0004-0000-000000000004', 'Card Feed', 'card_feed', false,
   array['captura','edicao_foto','design_arte','redacao','aprovacao_coord','publicacao']::tipo_estagio[],
   '{"captura": 0, "edicao_foto": 20, "design_arte": 30, "redacao": 10, "aprovacao_coord": 10, "publicacao": 0}'::jsonb),
  ('00000000-0000-0004-0000-000000000005', 'Card Patrocinado', 'card_patrocinado', true,
   array['captura','edicao_foto','design_arte','redacao','aprovacao_coord','aprovacao_patro','publicacao']::tipo_estagio[],
   '{"captura": 0, "edicao_foto": 20, "design_arte": 30, "redacao": 10, "aprovacao_coord": 10, "aprovacao_patro": 20, "publicacao": 0}'::jsonb),
  ('00000000-0000-0004-0000-000000000006', 'Cobertura Ao Vivo', 'cobertura_ao_vivo', false,
   array['captura','publicacao']::tipo_estagio[],
   '{"captura": 0, "publicacao": 0}'::jsonb),
  ('00000000-0000-0004-0000-000000000007', 'Texto / Legenda', 'texto_legenda', false,
   array['pesquisa','redacao','aprovacao_coord','publicacao']::tipo_estagio[],
   '{"pesquisa": 10, "redacao": 20, "aprovacao_coord": 10, "publicacao": 0}'::jsonb)
on conflict (id) do nothing;

insert into tags (nome, slug, categoria, cor_hex) values
  ('Esportes',    'esportes',    'tema',      '#4a8a5c'),
  ('Shows',       'shows',       'tema',      '#c8973a'),
  ('Festas',      'festas',      'tema',      '#ec4899'),
  ('Bastidores',  'bastidores',  'tema',      '#64748b'),
  ('Abertura',    'abertura',    'tema',      '#c8973a'),
  ('Final',       'final',       'tema',      '#e8b94f'),
  ('Quinta',      'quinta',      'dia',       '#4a8a5c'),
  ('Sexta',       'sexta',       'dia',       '#4a8a5c'),
  ('Sábado',      'sabado',      'dia',       '#4a8a5c'),
  ('Domingo',     'domingo',     'dia',       '#4a8a5c'),
  ('Patrocinado', 'patrocinado', 'patrocinio','#c8973a'),
  ('Urgente',     'urgente',     'vibe',      '#dc2626'),
  ('Moodboard',   'moodboard',   'vibe',      '#8b3a2a')
on conflict (slug, categoria) do nothing;

-- =========================================================================
-- [0006] SHOWS, FESTAS E EQUIPES
-- =========================================================================

insert into festas (id, edicao_id, dia_id, setor_id, nome, tema, inicio, fim_previsto) values
  ('00000000-0000-0005-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0001-0000-000000000001', '00000000-0000-0002-0000-000000000006',
   'Arena Estendida', 'Copa do Mundo',
   '2026-06-04T15:00:00-03:00', '2026-06-05T05:00:00-03:00'),
  ('00000000-0000-0005-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0001-0000-000000000002', '00000000-0000-0002-0000-000000000006',
   'Festa do Pijama', 'Pijama',
   '2026-06-05T23:00:00-03:00', '2026-06-06T08:00:00-03:00'),
  ('00000000-0000-0005-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0001-0000-000000000003', '00000000-0000-0002-0000-000000000005',
   'Sábado Arena', null,
   '2026-06-06T14:00:00-03:00', '2026-06-06T20:00:00-03:00'),
  ('00000000-0000-0005-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0001-0000-000000000003', '00000000-0000-0002-0000-000000000006',
   'Festa a Fantasia', 'Fantasia',
   '2026-06-06T23:00:00-03:00', '2026-06-07T08:00:00-03:00'),
  ('00000000-0000-0005-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0001-0000-000000000004', '00000000-0000-0002-0000-000000000003',
   'Arena das Campeãs', 'Campeãs',
   '2026-06-07T14:00:00-03:00', '2026-06-07T21:00:00-03:00')
on conflict (id) do nothing;

insert into shows (edicao_id, dia_id, setor_id, nome, tipo, inicio, fim_previsto, duracao_minutos, embaixador, ordem_no_palco) values
  -- Quinta — Palco Principal
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000003','Kenan & Kell','show','2026-06-04T17:00:00-03:00','2026-06-04T18:00:00-03:00',60,false,1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000003','Japa NK','show','2026-06-04T18:00:00-03:00','2026-06-04T19:00:00-03:00',60,false,2),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000003','Léo Foguete','show','2026-06-04T19:00:00-03:00','2026-06-04T19:45:00-03:00',45,false,3),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000003','Turma do Pagode','show','2026-06-04T19:45:00-03:00','2026-06-04T21:15:00-03:00',90,false,4),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000003','Teto','show','2026-06-04T21:15:00-03:00','2026-06-04T22:30:00-03:00',75,false,5),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000003','Matheus & Kauan','show','2026-06-04T22:30:00-03:00','2026-06-05T00:30:00-03:00',120,false,6),
  -- Quinta — Palco Eletrônico
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000004','Claudinho Brasil','dj_set','2026-06-04T17:00:00-03:00','2026-06-04T18:30:00-03:00',90,false,1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000004','Vegas','dj_set','2026-06-04T18:30:00-03:00','2026-06-04T20:00:00-03:00',90,false,2),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000004','Paranormal Attack','dj_set','2026-06-04T20:00:00-03:00','2026-06-04T22:00:00-03:00',120,false,3),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000004','Cat Dealers','dj_set','2026-06-04T22:00:00-03:00','2026-06-05T01:00:00-03:00',180,false,4),
  -- Sexta — Palco Principal
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000003','Nattan','show','2026-06-05T23:00:00-03:00','2026-06-06T00:00:00-03:00',60,false,1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000003','Pabllo Vittar','show','2026-06-06T00:00:00-03:00','2026-06-06T01:30:00-03:00',90,false,2),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000003','Matuê','show','2026-06-06T01:30:00-03:00','2026-06-06T02:45:00-03:00',75,false,3),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000003','Petroski','show','2026-06-06T02:45:00-03:00','2026-06-06T04:30:00-03:00',105,false,4),
  -- Sexta — Palco Eletrônico
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000004','Victor Lou','dj_set','2026-06-05T23:00:00-03:00','2026-06-06T00:00:00-03:00',60,false,1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000004','GBR','dj_set','2026-06-06T00:00:00-03:00','2026-06-06T01:00:00-03:00',60,false,2),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000004','Eli Iwasa','dj_set','2026-06-06T01:00:00-03:00','2026-06-06T02:00:00-03:00',60,false,3),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000004','Breaking Beattz','dj_set','2026-06-06T02:00:00-03:00','2026-06-06T03:00:00-03:00',60,false,4),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000004','Almanac','dj_set','2026-06-06T03:00:00-03:00','2026-06-06T04:00:00-03:00',60,false,5),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000004','Buja','dj_set','2026-06-06T04:00:00-03:00','2026-06-06T05:30:00-03:00',90,false,6),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000004','Gesus','dj_set','2026-06-06T05:30:00-03:00','2026-06-06T08:00:00-03:00',150,false,7),
  -- Sábado tarde — Palco 360°
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000005','Melody','show','2026-06-06T16:00:00-03:00','2026-06-06T18:00:00-03:00',120,false,1),
  -- Sábado noite — Palco Principal
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000003','Pedro Sampaio','show','2026-06-06T23:00:00-03:00','2026-06-07T01:00:00-03:00',120,true,1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000003','Felipe Amorim','show','2026-06-07T01:00:00-03:00','2026-06-07T02:00:00-03:00',60,false,2),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000003','GP da ZL','show','2026-06-07T02:00:00-03:00','2026-06-07T03:00:00-03:00',60,false,3),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000003','BK''','show','2026-06-07T03:00:00-03:00','2026-06-07T05:00:00-03:00',120,false,4),
  -- Sábado noite — Palco Eletrônico
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000004','Illusionize','dj_set','2026-06-06T23:00:00-03:00','2026-06-07T01:00:00-03:00',120,false,1),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000004','Aura Vortex','dj_set','2026-06-07T01:00:00-03:00','2026-06-07T02:30:00-03:00',90,false,2),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000004','Visage','dj_set','2026-06-07T02:30:00-03:00','2026-06-07T04:00:00-03:00',90,false,3),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000004','Vzaark','dj_set','2026-06-07T04:00:00-03:00','2026-06-07T06:00:00-03:00',120,false,4),
  -- Domingo — Palco Principal
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0001-0000-000000000004','00000000-0000-0002-0000-000000000003','GBR','dj_set','2026-06-07T17:00:00-03:00','2026-06-07T20:00:00-03:00',180,false,1);

insert into equipes (edicao_id, nome, slug, tipo, divisao, universidade) values
  -- Atléticas
  ('00000000-0000-0000-0000-000000000001','AA Eng UFU','aa-eng-ufu','atletica','1ª Divisão','UFU'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFTM','aa-med-uftm','atletica','1ª Divisão','UFTM'),
  ('00000000-0000-0000-0000-000000000001','AA Dir UFU','aa-dir-ufu','atletica','1ª Divisão','UFU'),
  ('00000000-0000-0000-0000-000000000001','AA Adm UFU','aa-adm-ufu','atletica','2ª Divisão','UFU'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFMG','aa-eng-ufmg','atletica','1ª Divisão','UFMG'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFMG','aa-med-ufmg','atletica','1ª Divisão','UFMG'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UNICAMP','aa-eng-unicamp','atletica','1ª Divisão','UNICAMP'),
  ('00000000-0000-0000-0000-000000000001','AA Med USP','aa-med-usp','atletica','1ª Divisão','USP'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFSCar','aa-eng-ufscar','atletica','2ª Divisão','UFSCar'),
  ('00000000-0000-0000-0000-000000000001','AA Med UNIFENAS','aa-med-unifenas','atletica','2ª Divisão','UNIFENAS'),
  ('00000000-0000-0000-0000-000000000001','AA Eng PUC-MG','aa-eng-pucmg','atletica','1ª Divisão','PUC-MG'),
  ('00000000-0000-0000-0000-000000000001','AA Med Uniube','aa-med-uniube','atletica','2ª Divisão','Uniube'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFSJ','aa-eng-ufsj','atletica','2ª Divisão','UFSJ'),
  ('00000000-0000-0000-0000-000000000001','AA Med UNIFAL','aa-med-unifal','atletica','2ª Divisão','UNIFAL'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UNIFEI','aa-eng-unifei','atletica','1ª Divisão','UNIFEI'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFLA','aa-med-ufla','atletica','2ª Divisão','UFLA'),
  ('00000000-0000-0000-0000-000000000001','AA Dir UFV','aa-dir-ufv','atletica','2ª Divisão','UFV'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFOP','aa-med-ufop','atletica','2ª Divisão','UFOP'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFRJ','aa-eng-ufrj','atletica','1ª Divisão','UFRJ'),
  ('00000000-0000-0000-0000-000000000001','AA Med PUC-Rio','aa-med-pucrio','atletica','1ª Divisão','PUC-Rio'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFF','aa-eng-uff','atletica','2ª Divisão','UFF'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFRGS','aa-med-ufrgs','atletica','1ª Divisão','UFRGS'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFSC','aa-eng-ufsc','atletica','1ª Divisão','UFSC'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFPR','aa-med-ufpr','atletica','2ª Divisão','UFPR'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UNIMEP','aa-eng-unimep','atletica','2ª Divisão','UNIMEP'),
  ('00000000-0000-0000-0000-000000000001','AA Med UnB','aa-med-unb','atletica','1ª Divisão','UnB'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFC','aa-eng-ufc','atletica','2ª Divisão','UFC'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFPE','aa-med-ufpe','atletica','2ª Divisão','UFPE'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFBA','aa-eng-ufba','atletica','2ª Divisão','UFBA'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFSM','aa-med-ufsm','atletica','2ª Divisão','UFSM'),
  ('00000000-0000-0000-0000-000000000001','AA Eng UFTM','aa-eng-uftm','atletica','2ª Divisão','UFTM'),
  ('00000000-0000-0000-0000-000000000001','AA Med UFU','aa-med-ufu','atletica','2ª Divisão','UFU'),
  -- Cheer
  ('00000000-0000-0000-0000-000000000001','Cheer Eng UFU','cheer-eng-ufu','cheer','COED 1','UFU'),
  ('00000000-0000-0000-0000-000000000001','Cheer Med UFTM','cheer-med-uftm','cheer','COED 2.1','UFTM'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFMG','cheer-ufmg','cheer','COED 1','UFMG'),
  ('00000000-0000-0000-0000-000000000001','Cheer USP','cheer-usp','cheer','COED 2.1','USP'),
  ('00000000-0000-0000-0000-000000000001','Cheer UNICAMP','cheer-unicamp','cheer','COED 1','UNICAMP'),
  ('00000000-0000-0000-0000-000000000001','Cheer PUC-MG','cheer-pucmg','cheer','COED 2NT','PUC-MG'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFRJ','cheer-ufrj','cheer','COED 2.1','UFRJ'),
  ('00000000-0000-0000-0000-000000000001','Cheer PUC-Rio','cheer-pucrio','cheer','COED 1','PUC-Rio'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFSC','cheer-ufsc','cheer','COED 2NT','UFSC'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFRGS','cheer-ufrgs','cheer','COED 3NT','UFRGS'),
  ('00000000-0000-0000-0000-000000000001','Cheer UNIFEI','cheer-unifei','cheer','COED 2NT','UNIFEI'),
  ('00000000-0000-0000-0000-000000000001','Cheer Uniube','cheer-uniube','cheer','COED 3NT','Uniube'),
  ('00000000-0000-0000-0000-000000000001','Cheer UnB','cheer-unb','cheer','COED 2.1','UnB'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFPR','cheer-ufpr','cheer','COED 3NT','UFPR'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFLA','cheer-ufla','cheer','COED 3NT','UFLA'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFMG Performance','cheer-ufmg-perf','cheer','Performance','UFMG'),
  ('00000000-0000-0000-0000-000000000001','Cheer USP Performance','cheer-usp-perf','cheer','Performance','USP'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFU Performance','cheer-ufu-perf','cheer','Performance','UFU'),
  ('00000000-0000-0000-0000-000000000001','Cheer UNICAMP Performance','cheer-unicamp-perf','cheer','Performance','UNICAMP'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFSJ','cheer-ufsj','cheer','COED 3NT','UFSJ'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFOP','cheer-ufop','cheer','COED 3NT','UFOP'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFC','cheer-ufc','cheer','COED 2NT','UFC'),
  ('00000000-0000-0000-0000-000000000001','Cheer UFBA','cheer-ufba','cheer','COED 3NT','UFBA'),
  -- Baterias
  ('00000000-0000-0000-0000-000000000001','Bateria Eng UFU','bat-eng-ufu','bateria','1ª Divisão','UFU'),
  ('00000000-0000-0000-0000-000000000001','Bateria Med UFTM','bat-med-uftm','bateria','1ª Divisão','UFTM'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFMG','bat-ufmg','bateria','1ª Divisão','UFMG'),
  ('00000000-0000-0000-0000-000000000001','Bateria USP','bat-usp','bateria','1ª Divisão','USP'),
  ('00000000-0000-0000-0000-000000000001','Bateria UNICAMP','bat-unicamp','bateria','1ª Divisão','UNICAMP'),
  ('00000000-0000-0000-0000-000000000001','Bateria PUC-MG','bat-pucmg','bateria','2ª Divisão','PUC-MG'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFRJ','bat-ufrj','bateria','1ª Divisão','UFRJ'),
  ('00000000-0000-0000-0000-000000000001','Bateria PUC-Rio','bat-pucrio','bateria','2ª Divisão','PUC-Rio'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFSC','bat-ufsc','bateria','2ª Divisão','UFSC'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFRGS','bat-ufrgs','bateria','1ª Divisão','UFRGS'),
  ('00000000-0000-0000-0000-000000000001','Bateria UNIFEI','bat-unifei','bateria','2ª Divisão','UNIFEI'),
  ('00000000-0000-0000-0000-000000000001','Bateria Uniube','bat-uniube','bateria','3ª Divisão','Uniube'),
  ('00000000-0000-0000-0000-000000000001','Bateria UnB','bat-unb','bateria','2ª Divisão','UnB'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFPR','bat-ufpr','bateria','3ª Divisão','UFPR'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFLA','bat-ufla','bateria','3ª Divisão','UFLA'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFV','bat-ufv','bateria','3ª Divisão','UFV'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFOP','bat-ufop','bateria','3ª Divisão','UFOP'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFC','bat-ufc','bateria','2ª Divisão','UFC'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFBA','bat-ufba','bateria','3ª Divisão','UFBA'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFPE','bat-ufpe','bateria','3ª Divisão','UFPE'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFSM','bat-ufsm','bateria','3ª Divisão','UFSM'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFTM','bat-uftm','bateria','3ª Divisão','UFTM'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFSCar','bat-ufscar','bateria','3ª Divisão','UFSCar'),
  ('00000000-0000-0000-0000-000000000001','Bateria UNIFAL','bat-unifal','bateria','3ª Divisão','UNIFAL'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFSJ','bat-ufsj','bateria','3ª Divisão','UFSJ'),
  ('00000000-0000-0000-0000-000000000001','Bateria UNIFENAS','bat-unifenas','bateria','3ª Divisão','UNIFENAS'),
  ('00000000-0000-0000-0000-000000000001','Bateria UFF','bat-uff','bateria','2ª Divisão','UFF'),
  ('00000000-0000-0000-0000-000000000001','Bateria Med UFU','bat-med-ufu','bateria','2ª Divisão','UFU'),
  ('00000000-0000-0000-0000-000000000001','Bateria Med UFMG','bat-med-ufmg','bateria','2ª Divisão','UFMG'),
  ('00000000-0000-0000-0000-000000000001','Bateria Eng UFMG','bat-eng-ufmg','bateria','1ª Divisão','UFMG'),
  ('00000000-0000-0000-0000-000000000001','Bateria Med USP','bat-med-usp','bateria','1ª Divisão','USP'),
  ('00000000-0000-0000-0000-000000000001','Bateria Eng UNICAMP','bat-eng-unicamp','bateria','1ª Divisão','UNICAMP'),
  ('00000000-0000-0000-0000-000000000001','Bateria UNIMEP','bat-unimep','bateria','3ª Divisão','UNIMEP'),
  ('00000000-0000-0000-0000-000000000001','Bateria Med UFRJ','bat-med-ufrj','bateria','2ª Divisão','UFRJ');

-- =========================================================================
-- [0007] CHECKLIST OPERACIONAL
-- =========================================================================

create type tipo_checklist as enum ('jogo','show','festa','ativacao_patrocinador');
create type status_checklist_item as enum ('pendente','feito','nao_aplica');

create table checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid references edicoes(id) on delete cascade,
  nome text not null,
  tipo tipo_checklist not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index idx_ck_templates_tipo on checklist_templates(tipo);

create table checklist_template_itens (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  label text not null,
  obrigatorio boolean not null default true,
  funcao_requerida funcao_equipe,
  canal canal_publicacao,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create index idx_ck_template_itens_template on checklist_template_itens(template_id);

create table checklist_instancias (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references checklist_templates(id),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  dia_id uuid references dias_evento(id),
  jogo_id uuid references jogos(id),
  show_id uuid references shows(id),
  festa_id uuid references festas(id),
  patrocinador_id uuid references patrocinadores(id),
  nome_override text,
  responsavel_id uuid references profiles(id),
  criado_em timestamptz not null default now(),
  constraint ck_instancia_um_vinculo check (
    (jogo_id is not null)::int +
    (show_id is not null)::int +
    (festa_id is not null)::int +
    (patrocinador_id is not null)::int <= 1
  )
);
create index idx_ck_instancias_jogo on checklist_instancias(jogo_id);
create index idx_ck_instancias_show on checklist_instancias(show_id);
create index idx_ck_instancias_festa on checklist_instancias(festa_id);
create index idx_ck_instancias_patrocinador on checklist_instancias(patrocinador_id);
create index idx_ck_instancias_dia on checklist_instancias(dia_id);

create table checklist_itens (
  id uuid primary key default uuid_generate_v4(),
  instancia_id uuid not null references checklist_instancias(id) on delete cascade,
  template_item_id uuid references checklist_template_itens(id),
  label text not null,
  obrigatorio boolean not null default true,
  ordem integer not null default 0,
  status status_checklist_item not null default 'pendente',
  operador_id uuid references profiles(id),
  feito_em timestamptz,
  link_post text,
  observacao text,
  criado_em timestamptz not null default now()
);
create index idx_ck_itens_instancia on checklist_itens(instancia_id);
create index idx_ck_itens_operador on checklist_itens(operador_id);
create index idx_ck_itens_status on checklist_itens(status);

alter table checklist_templates enable row level security;
alter table checklist_template_itens enable row level security;
alter table checklist_instancias enable row level security;
alter table checklist_itens enable row level security;

create policy "checklist_templates: ler autenticado"
  on checklist_templates for select to authenticated using (true);
create policy "checklist_template_itens: ler autenticado"
  on checklist_template_itens for select to authenticated using (true);
create policy "checklist_instancias: ler autenticado"
  on checklist_instancias for select to authenticated using (true);
create policy "checklist_itens: ler autenticado"
  on checklist_itens for select to authenticated using (true);

create policy "checklist_templates: write coord+"
  on checklist_templates for all to authenticated
  using (is_coord_or_admin()) with check (is_coord_or_admin());
create policy "checklist_template_itens: write coord+"
  on checklist_template_itens for all to authenticated
  using (is_coord_or_admin()) with check (is_coord_or_admin());
create policy "checklist_instancias: write coord+"
  on checklist_instancias for all to authenticated
  using (is_coord_or_admin()) with check (is_coord_or_admin());

create policy "checklist_itens: insert autenticado"
  on checklist_itens for insert to authenticated with check (true);
create policy "checklist_itens: update próprio ou coord+"
  on checklist_itens for update to authenticated
  using (operador_id = auth.uid() or is_coord_or_admin())
  with check (operador_id = auth.uid() or is_coord_or_admin());
create policy "checklist_itens: delete coord+"
  on checklist_itens for delete to authenticated using (is_coord_or_admin());

create or replace function instanciar_checklist(p_instancia_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into checklist_itens (instancia_id, template_item_id, label, obrigatorio, ordem)
  select p_instancia_id, ti.id, ti.label, ti.obrigatorio, ti.ordem
  from checklist_instancias ci
  join checklist_template_itens ti on ti.template_id = ci.template_id
  where ci.id = p_instancia_id
  order by ti.ordem;
end;
$$;

insert into checklist_templates (id, edicao_id, nome, tipo) values
  ('00000000-0000-0007-0000-000000000001','00000000-0000-0000-0000-000000000001','Cobertura de Jogo','jogo'),
  ('00000000-0000-0007-0000-000000000002','00000000-0000-0000-0000-000000000001','Cobertura de Show','show'),
  ('00000000-0000-0007-0000-000000000003','00000000-0000-0000-0000-000000000001','Cobertura de Festa','festa'),
  ('00000000-0000-0007-0000-000000000004','00000000-0000-0000-0000-000000000001','Ativação de Patrocinador','ativacao_patrocinador')
on conflict (id) do nothing;

insert into checklist_template_itens (template_id, label, obrigatorio, funcao_requerida, canal, ordem) values
  ('00000000-0000-0007-0000-000000000001','Chegada ao local confirmada',true,null,null,1),
  ('00000000-0000-0007-0000-000000000001','Foto de aquecimento / warm-up postada',true,'foto','instagram_stories',2),
  ('00000000-0000-0007-0000-000000000001','Story de abertura do jogo publicado',true,null,'instagram_stories',3),
  ('00000000-0000-0007-0000-000000000001','Cobertura ao vivo ativa (stories rodando)',true,null,'instagram_stories',4),
  ('00000000-0000-0007-0000-000000000001','Momento decisivo registrado (foto/vídeo)',true,'foto',null,5),
  ('00000000-0000-0007-0000-000000000001','Resultado postado nos stories',true,null,'instagram_stories',6),
  ('00000000-0000-0007-0000-000000000001','Resultado postado no feed (card)',true,'social','instagram_feed',7),
  ('00000000-0000-0007-0000-000000000001','Reels do jogo publicado',false,'editor','instagram_reels',8),
  ('00000000-0000-0007-0000-000000000001','TikTok do jogo publicado',false,'editor','tiktok',9),
  ('00000000-0000-0007-0000-000000000002','Chegada ao palco confirmada',true,null,null,1),
  ('00000000-0000-0007-0000-000000000002','Story de abertura / soundcheck publicado',true,null,'instagram_stories',2),
  ('00000000-0000-0007-0000-000000000002','Cobertura ao vivo ativa (stories)',true,null,'instagram_stories',3),
  ('00000000-0000-0007-0000-000000000002','Foto/vídeo do ápice do show capturada',true,'foto',null,4),
  ('00000000-0000-0007-0000-000000000002','Encerramento do show registrado',true,null,'instagram_stories',5),
  ('00000000-0000-0007-0000-000000000002','Post de feed (foto) publicado',true,'social','instagram_feed',6),
  ('00000000-0000-0007-0000-000000000002','Reels do show publicado',false,'editor','instagram_reels',7),
  ('00000000-0000-0007-0000-000000000002','TikTok do show publicado',false,'editor','tiktok',8),
  ('00000000-0000-0007-0000-000000000003','Chegada ao espaço confirmada',true,null,null,1),
  ('00000000-0000-0007-0000-000000000003','Story de abertura da festa publicado',true,null,'instagram_stories',2),
  ('00000000-0000-0007-0000-000000000003','Cobertura roaming ativa (stories)',true,'roaming','instagram_stories',3),
  ('00000000-0000-0007-0000-000000000003','Foto principal da festa capturada',true,'foto',null,4),
  ('00000000-0000-0007-0000-000000000003','Clipe curto / boomerang publicado',false,null,'instagram_stories',5),
  ('00000000-0000-0007-0000-000000000003','Post de feed da festa publicado',true,'social','instagram_feed',6),
  ('00000000-0000-0007-0000-000000000003','Reels da festa publicado',false,'editor','instagram_reels',7),
  ('00000000-0000-0007-0000-000000000003','Story de encerramento publicado',true,null,'instagram_stories',8),
  ('00000000-0000-0007-0000-000000000004','Briefing da ativação recebido e lido',true,null,null,1),
  ('00000000-0000-0007-0000-000000000004','Material de marca confirmado (logo/arte)',true,'design',null,2),
  ('00000000-0000-0007-0000-000000000004','Equipe no ponto de ativação',true,null,null,3),
  ('00000000-0000-0007-0000-000000000004','Story de ativação publicado',true,null,'instagram_stories',4),
  ('00000000-0000-0007-0000-000000000004','Menção à marca confirmada nos stories',true,'social','instagram_stories',5),
  ('00000000-0000-0007-0000-000000000004','Foto da ação publicada no feed',true,'social','instagram_feed',6),
  ('00000000-0000-0007-0000-000000000004','Card patrocinado publicado',false,'design','instagram_feed',7),
  ('00000000-0000-0007-0000-000000000004','Reels da ativação publicado',false,'editor','instagram_reels',8),
  ('00000000-0000-0007-0000-000000000004','Links dos posts enviados para relatório',true,'coordenacao',null,9);

-- =========================================================================
-- [0008] DADOS DE TESTE — Patrocinadores, Jogos, Pautas, Wiki, Checklists
-- =========================================================================

insert into patrocinadores (id, edicao_id, nome, slug, cota, contato_nome, contato_email, ativo) values
  ('00000000-0000-0009-0000-000000000001','00000000-0000-0000-0000-000000000001',
   'Patrocinador Master A','master-a','Master','Carlos Souza','carlos@master-a.com.br',true),
  ('00000000-0000-0009-0000-000000000002','00000000-0000-0000-0000-000000000001',
   'Patrocinador Ouro B','ouro-b','Ouro','Ana Lima','ana@ouro-b.com.br',true),
  ('00000000-0000-0009-0000-000000000003','00000000-0000-0000-0000-000000000001',
   'Apoiador C','apoio-c','Apoio','Paulo Ramos','paulo@apoio-c.com.br',true)
on conflict (id) do nothing;

insert into escopo_itens (patrocinador_id, tipo_conteudo, canal, quantidade_prevista, descricao, status) values
  ('00000000-0000-0009-0000-000000000001','story_rapido','instagram_stories',20,'20 stories de marca ao longo do evento','pendente'),
  ('00000000-0000-0009-0000-000000000001','reels','instagram_reels',4,'1 reels por dia','pendente'),
  ('00000000-0000-0009-0000-000000000001','card_patrocinado','instagram_feed',2,'Abertura + Encerramento','pendente'),
  ('00000000-0000-0009-0000-000000000002','story_rapido','instagram_stories',10,'10 stories de menção','pendente'),
  ('00000000-0000-0009-0000-000000000002','card_patrocinado','instagram_feed',1,'Card patrocinado de highlights','pendente'),
  ('00000000-0000-0009-0000-000000000003','story_rapido','instagram_stories',5,'Menção nos stories do maior jogo da semana','pendente');

insert into jogos (edicao_id, modalidade_id, dia_id, setor_id, categoria, divisao, fase, equipe_a_nome, equipe_b_nome, inicio, fim_previsto, status) values
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000001','Masculino','1ª Divisão','Grupo A','AA Eng UFU','AA Eng UFMG','2026-06-04T08:00:00-03:00','2026-06-04T09:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000004','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000002','Feminino','1ª Divisão','Grupo A','AA Med UFTM','AA Med USP','2026-06-04T09:30:00-03:00','2026-06-04T11:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000005','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000002','Masculino','1ª Divisão','Grupo A','AA Eng PUC-MG','AA Eng UFRJ','2026-06-04T11:00:00-03:00','2026-06-04T12:30:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000006','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000001','Masculino','1ª Divisão','Grupo A','AA Dir UFU','AA Med UnB','2026-06-04T13:00:00-03:00','2026-06-04T14:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000001','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000001','Feminino','1ª Divisão','Grupo A','AA Med UFMG','AA Med UFRGS','2026-06-04T15:00:00-03:00','2026-06-04T16:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000009','00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000002','Masculino','Único','Grupos','AA Eng UNICAMP','AA Eng UFSC','2026-06-04T17:00:00-03:00','2026-06-04T18:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000007','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000001','Misto','Único','Classificatória','Equipes Bloco A','Equipes Bloco B','2026-06-05T08:00:00-03:00','2026-06-05T10:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000003','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000001','Masculino','Único','Grupo B','AA Eng UFV','AA Eng UFSJ','2026-06-05T09:00:00-03:00','2026-06-05T10:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000004','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000002','Masculino','1ª Divisão','Grupo B','AA Eng UFRGS','AA Eng UNIFEI','2026-06-05T10:30:00-03:00','2026-06-05T12:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000005','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000002','Feminino','1ª Divisão','Semifinal','AA Med USP','AA Med UFMG','2026-06-05T12:00:00-03:00','2026-06-05T13:30:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000008','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000001','Misto','Único','Classificatória','Bloco Masculino','Bloco Feminino','2026-06-05T14:00:00-03:00','2026-06-05T16:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000001','00000000-0000-0001-0000-000000000002','00000000-0000-0002-0000-000000000001','Masculino','1ª Divisão','Semifinal','AA Eng UFU','AA Eng PUC-MG','2026-06-05T16:00:00-03:00','2026-06-05T17:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000010','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000003','COED 1','COED 1','Classificatória','Cheer Eng UFU','Cheer UFMG','2026-06-06T08:00:00-03:00','2026-06-06T09:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000011','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000003','Misto','1ª Divisão','Classificatória','Bateria Eng UFU','Bateria UFMG','2026-06-06T09:30:00-03:00','2026-06-06T10:30:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000001','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000001','Masculino','1ª Divisão','Final','AA Eng UFU','AA Eng UFMG','2026-06-06T12:00:00-03:00','2026-06-06T13:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000004','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000002','Masculino','1ª Divisão','Final','AA Med UFTM','AA Eng UFRGS','2026-06-06T14:00:00-03:00','2026-06-06T15:30:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000005','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000002','Masculino','1ª Divisão','Final','AA Eng PUC-MG','AA Med USP','2026-06-06T16:00:00-03:00','2026-06-06T17:30:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000006','00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000001','Masculino','1ª Divisão','Final','AA Dir UFU','AA Med UFMG','2026-06-06T18:00:00-03:00','2026-06-06T19:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000010','00000000-0000-0001-0000-000000000004','00000000-0000-0002-0000-000000000003','COED 1','COED 1','Final','Cheer UNICAMP','Cheer PUC-Rio','2026-06-07T08:00:00-03:00','2026-06-07T09:30:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000011','00000000-0000-0001-0000-000000000004','00000000-0000-0002-0000-000000000003','Misto','1ª Divisão','Final','Bateria Eng UFMG','Bateria Med USP','2026-06-07T10:00:00-03:00','2026-06-07T11:30:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000002','00000000-0000-0001-0000-000000000004','00000000-0000-0002-0000-000000000001','Masculino','1ª Divisão','Final','AA Eng UNICAMP','AA Med UFRJ','2026-06-07T11:00:00-03:00','2026-06-07T12:30:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000009','00000000-0000-0001-0000-000000000004','00000000-0000-0002-0000-000000000002','Masculino','Único','Final','AA Eng UFU','AA Eng UFSC','2026-06-07T13:00:00-03:00','2026-06-07T14:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000007','00000000-0000-0001-0000-000000000004','00000000-0000-0002-0000-000000000001','Misto','Único','Final','Bloco Masculino Final','Bloco Feminino Final','2026-06-07T14:00:00-03:00','2026-06-07T16:00:00-03:00','agendado'),
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0003-0000-000000000001','00000000-0000-0001-0000-000000000004','00000000-0000-0002-0000-000000000001','Feminino','1ª Divisão','Final','AA Med UFMG','AA Med UFTM','2026-06-07T16:00:00-03:00','2026-06-07T17:00:00-03:00','agendado');

insert into pautas (edicao_id, titulo, descricao, status, setor_id, dia_id) values
  ('00000000-0000-0000-0000-000000000001','Aquecimento das baterias antes da entrada','Capturar o camarim das baterias antes de entrarem no palco — sempre tem conteúdo bom nos bastidores','ideia',null,null),
  ('00000000-0000-0000-0000-000000000001','Reação da torcida no gol decisivo','Posicionar câmera virada para a arquibancada no momento dos pênaltis','aprovada','00000000-0000-0002-0000-000000000001','00000000-0000-0001-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001','Bastidores do Pedro Sampaio','Tentar acesso ao camarote/backstage antes do show das 23h de sábado','em_execucao','00000000-0000-0002-0000-000000000003','00000000-0000-0001-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001','Entrevista com capitão da equipe campeã','Pegar declaração logo após a final de futsal masculino','entregue','00000000-0000-0002-0000-000000000001','00000000-0000-0001-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000001','Time-lapse da montagem do palco','Drone fixo ou câmera em posição alta para capturar a montagem durante o dia','ideia','00000000-0000-0002-0000-000000000003',null),
  ('00000000-0000-0000-0000-000000000001','Moodboard das fantasias da Festa Fantasia','Coletar fotos das fantasias mais criativas — candidatas a post de feed','aprovada','00000000-0000-0002-0000-000000000006','00000000-0000-0001-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001','Vlog do dia de domingo da equipe','Câmera seguindo alguém da coord o dia todo — da abertura das finais até o encerramento','ideia',null,'00000000-0000-0001-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000001','Cobertura natação — provas de revezamento','As provas de revezamento sempre geram mais tensão — priorizar','descartada','00000000-0000-0002-0000-000000000001',null);

insert into docs (edicao_id, titulo, slug, conteudo_md, categoria, funcao, ordem, publicado) values
  ('00000000-0000-0000-0000-000000000001','Briefing Geral — CIA 2026','briefing-geral',
   E'# Briefing Geral — CIA 2026\n\nA **Copa Inter Atléticas 2026** acontece de **04 a 07 de junho** em **Uberaba/MG**.\n\n## Identidade Visual\n\n- Paleta: verde militar, dourado, preto\n- Fonte de título: Orbitron\n- Tom: épico, intenso, competitivo mas festivo\n\n## Canais\n\n| Canal | Frequência |\n|-------|------------|\n| Instagram Stories | Tempo real |\n| Instagram Feed | 2–4 posts/dia |\n| Instagram Reels | 1–2/dia |\n| TikTok | 1/dia |\n\n## Prioridades\n\n1. Cobertura ao vivo dos jogos decisivos\n2. Shows (Pedro Sampaio = prioridade máxima)\n3. Ativações de patrocinadores\n4. Bastidores e roaming',
   'briefing',null,1,true),
  ('00000000-0000-0000-0000-000000000001','Guia de Fotografia','guia-foto',
   E'# Guia de Fotografia — CIA 2026\n\n## Configurações recomendadas\n\n### Jogos internos (ginásio)\n- ISO: 1600–6400\n- Velocidade: mínimo 1/500s\n- Abertura: f/2.8 ou mais aberta\n\n### Shows (palco noturno)\n- ISO: 800–3200\n- Velocidade: 1/200s\n- Abertura: f/1.8–f/2.8\n\n## Entrega\n\n- Fotos selecionadas → pasta Drive em até 1h\n- Mínimo 10 fotos editadas por jogo',
   'manual','foto',2,true),
  ('00000000-0000-0000-0000-000000000001','Guia de Vídeo','guia-video',
   E'# Guia de Vídeo — CIA 2026\n\n## Formatos\n\n| Formato | Resolução | Ratio |\n|---------|-----------|-------|\n| Stories | 1080×1920 | 9:16 |\n| Reels | 1080×1920 | 9:16 |\n| Feed | 1080×1350 | 4:5 |\n\n## SLA de edição\n\n| Tipo | Prazo |\n|------|-------|\n| Story Rápido | 0 min |\n| Story Editado | 15 min |\n| Reels | 60 min |',
   'manual','video',3,true),
  ('00000000-0000-0000-0000-000000000001','Guia de Social Media','guia-social',
   E'# Guia de Social Media — CIA 2026\n\n## Tom de voz\n\nNão seja jornalístico, seja presente. Fale como quem está lá.\n\n## Hashtags oficiais\n\n`#CIA2026` `#CopaInterAtleticas` `#Uberaba2026`\n\n## Aprovação\n\n- Stories: pode postar direto\n- Feed e Reels: passa pela coord antes\n- Card patrocinado: coord + patrocinador',
   'manual','social',4,true),
  ('00000000-0000-0000-0000-000000000001','Protocolo de Coordenação','protocolo-coord',
   E'# Protocolo de Coordenação — CIA 2026\n\n## Comunicação\n\n- Grupo principal: WhatsApp "CIA 2026 — Equipe"\n- Urgente: ligar diretamente\n\n## Emergências\n\n1. **Equipamento quebrou** → avisar coord imediatamente\n2. **Perdeu credencial** → base da equipe, falar com produção\n3. **Problema de saúde** → informar coord, substituição acionada\n\n## Check-in diário\n\nTodos os dias às **07h30** no grupo do WhatsApp: ✅',
   'briefing','coordenacao',5,true);

-- Checklist instâncias com itens gerados
do $$
declare
  inst_pedro  uuid;
  inst_nattan uuid;
  inst_festa  uuid;
  inst_patro  uuid;
  show_pedro  uuid;
  show_nattan uuid;
begin
  select id into show_pedro  from shows where nome = 'Pedro Sampaio' limit 1;
  select id into show_nattan from shows where nome = 'Nattan'        limit 1;

  if show_pedro is not null then
    insert into checklist_instancias (template_id, edicao_id, dia_id, show_id) values
      ('00000000-0000-0007-0000-000000000002','00000000-0000-0000-0000-000000000001',
       '00000000-0000-0001-0000-000000000003', show_pedro)
    returning id into inst_pedro;
    perform instanciar_checklist(inst_pedro);
  end if;

  if show_nattan is not null then
    insert into checklist_instancias (template_id, edicao_id, dia_id, show_id) values
      ('00000000-0000-0007-0000-000000000002','00000000-0000-0000-0000-000000000001',
       '00000000-0000-0001-0000-000000000002', show_nattan)
    returning id into inst_nattan;
    perform instanciar_checklist(inst_nattan);
  end if;

  insert into checklist_instancias (template_id, edicao_id, dia_id, festa_id) values
    ('00000000-0000-0007-0000-000000000003','00000000-0000-0000-0000-000000000001',
     '00000000-0000-0001-0000-000000000003','00000000-0000-0005-0000-000000000004')
  returning id into inst_festa;
  perform instanciar_checklist(inst_festa);

  insert into checklist_instancias (template_id, edicao_id, patrocinador_id) values
    ('00000000-0000-0007-0000-000000000004','00000000-0000-0000-0000-000000000001',
     '00000000-0000-0009-0000-000000000001')
  returning id into inst_patro;
  perform instanciar_checklist(inst_patro);
end $$;

insert into conteudos (edicao_id, titulo, tipo, status, prioridade, dia_id, setor_id, canal_publicacao, pipeline_template_id) values
  ('00000000-0000-0000-0000-000000000001','Abertura — Chegada das equipes ao SESI','story_rapido','publicado',2,
   '00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000001','instagram_stories','00000000-0000-0004-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001','Futsal M — AA Eng UFU × AA Eng UFMG | Gol do título','reels','em_producao',1,
   '00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000001','instagram_reels','00000000-0000-0004-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001','Pedro Sampaio — Palco Principal Sábado','card_feed','rascunho',1,
   '00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000003','instagram_feed','00000000-0000-0004-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000001','Bastidores Cheer COED 1 — Final Sábado','story_editado','rascunho',2,
   '00000000-0000-0001-0000-000000000003','00000000-0000-0002-0000-000000000003','instagram_stories','00000000-0000-0004-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000001','Ativação Patrocinador Master A — Arena Estendida','card_patrocinado','em_producao',1,
   '00000000-0000-0001-0000-000000000001','00000000-0000-0002-0000-000000000006','instagram_feed','00000000-0000-0004-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000001','GBR Long Set Domingo — Encerramento CIA 2026','reels','rascunho',2,
   '00000000-0000-0001-0000-000000000004','00000000-0000-0002-0000-000000000003','instagram_reels','00000000-0000-0004-0000-000000000003');

-- =========================================================================
-- FIM — Após primeiro login, execute 0004_admin_zheus.sql para virar admin
-- =========================================================================
