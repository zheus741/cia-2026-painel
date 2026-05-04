-- =========================================================================
-- CIA 2026 — Painel de Cobertura · Schema inicial
-- =========================================================================

-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================================
-- ENUMS
-- =========================================================================

create type role_user as enum (
  'admin',          -- vê e edita tudo
  'coordenacao',    -- edita escala, checklist, escopo, conteúdo
  'lider_area',     -- edita só sua área (foto/vídeo/social/design...)
  'operador'        -- vê própria escala e marca entregas
);

create type funcao_equipe as enum (
  'foto',
  'video',
  'social',
  'reporter',
  'editor',
  'drone',
  'roaming',
  'coordenacao',
  'producao',
  'design'
);

create type tipo_conteudo as enum (
  'story_rapido',
  'story_editado',
  'reels',
  'card_feed',
  'card_patrocinado',
  'texto_legenda',
  'repost',
  'cobertura_ao_vivo'
);

create type tipo_estagio as enum (
  'captura',
  'pesquisa',
  'edicao_video',
  'edicao_foto',
  'design_arte',
  'redacao',
  'aprovacao_coord',
  'aprovacao_patro',
  'publicacao'
);

create type status_estagio as enum (
  'aguardando',     -- ainda não chegou a vez
  'pendente',       -- na fila, sem dono
  'em_andamento',   -- alguém pegou
  'pausado',
  'bloqueado',
  'pronto',
  'pulado'          -- estágio dispensado
);

create type status_conteudo as enum (
  'rascunho',
  'em_producao',
  'publicado',
  'arquivado',
  'cancelado'
);

create type canal_publicacao as enum (
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
);

create type tipo_setor as enum (
  'esportivo',      -- ginásio, quadra
  'palco',          -- palco principal, eletrônico, 360°
  'festa',          -- área de festa
  'apoio',          -- camarote, base da equipe, alimentação
  'externo'         -- outras áreas da cidade
);

create type status_pauta as enum (
  'ideia',
  'aprovada',
  'em_execucao',
  'entregue',
  'descartada'
);

-- =========================================================================
-- USERS & ACCESS
-- =========================================================================

-- profiles complementa auth.users (linkado por id)
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

-- =========================================================================
-- ESTRUTURA DO EVENTO
-- =========================================================================

create table edicoes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,                          -- 'CIA 2026'
  ano integer not null,
  cidade text,                                  -- 'Uberaba'
  data_inicio date not null,
  data_fim date not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table dias_evento (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  data date not null,
  nome_dia text not null,                       -- 'Quinta', 'Sexta'...
  tema text,                                    -- 'Copa do Mundo', 'Festa do Pijama'
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
  cor_hex text,                                 -- pra mapa
  criado_em timestamptz not null default now()
);

create table modalidades (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  nome text not null,                           -- 'Basquete', 'Vôlei', 'Cheer'
  slug text not null,
  icone text,                                   -- emoji ou nome icone
  categorias text[] default '{}',               -- ['Masculino', 'Feminino']
  divisoes text[] default '{}',                 -- ['Primeira', 'Segunda']
  setor_principal_id uuid references setores(id),
  observacoes text,
  unique (edicao_id, slug)
);

create table equipes (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  nome text not null,                           -- 'ENGENHARIA UFU'
  slug text,
  tipo text not null,                           -- 'atletica' | 'cheer' | 'bateria'
  divisao text,                                 -- '1ª Divisão', 'COED 2.1', etc.
  universidade text,
  logo_url text,
  cor_primaria text,
  observacoes text,
  criado_em timestamptz not null default now()
);

create index idx_equipes_tipo on equipes(tipo);
create index idx_equipes_divisao on equipes(divisao);

-- Jogos (chaveamento — só referência, fonte de verdade fica externa)
create table jogos (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  modalidade_id uuid not null references modalidades(id),
  dia_id uuid references dias_evento(id),
  setor_id uuid references setores(id),
  categoria text,
  divisao text,
  fase text,                                    -- 'grupo', 'oitavas', 'final'...
  equipe_a_id uuid references equipes(id),
  equipe_b_id uuid references equipes(id),
  equipe_a_nome text,                           -- fallback se sem id
  equipe_b_nome text,
  inicio timestamptz,
  fim_previsto timestamptz,
  status text default 'agendado',               -- agendado, ao_vivo, encerrado, cancelado
  placar_a integer,
  placar_b integer,
  observacoes text,
  criado_em timestamptz not null default now()
);

create index idx_jogos_dia on jogos(dia_id);
create index idx_jogos_modalidade on jogos(modalidade_id);
create index idx_jogos_inicio on jogos(inicio);

-- Shows e festas (tudo do palco)
create table shows (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  dia_id uuid references dias_evento(id),
  setor_id uuid references setores(id),         -- palco principal/eletrônico/360°
  nome text not null,                           -- 'Pedro Sampaio'
  tipo text,                                    -- 'show', 'dj_set', 'apresentacao'
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

-- Festas (blocos, festa noturna etc.)
create table festas (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  dia_id uuid references dias_evento(id),
  setor_id uuid references setores(id),
  nome text not null,                           -- 'Festa Noturna', 'Sexta Arena'
  tema text,                                    -- 'Festa do Pijama'
  inicio timestamptz,
  fim_previsto timestamptz,
  observacoes text,
  criado_em timestamptz not null default now()
);

-- =========================================================================
-- PATROCINADORES
-- =========================================================================

create table patrocinadores (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  nome text not null,
  slug text,
  logo_url text,
  cor_marca text,
  cota text,                                    -- 'Master', 'Ouro', 'Apoio'
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
  dia_id uuid references dias_evento(id),       -- pode ser cross-dias
  tipo_conteudo tipo_conteudo,                  -- 'story_rapido', etc.
  canal canal_publicacao,
  setor_id uuid references setores(id),
  vinculado_a_show_id uuid references shows(id),
  vinculado_a_festa_id uuid references festas(id),
  vinculado_a_modalidade_id uuid references modalidades(id),
  quantidade_prevista integer not null default 1,
  descricao text,
  prazo_limite timestamptz,
  status text default 'pendente',               -- pendente, em_producao, entregue, atrasado
  observacoes text,
  criado_em timestamptz not null default now()
);

create index idx_escopo_patrocinador on escopo_itens(patrocinador_id);
create index idx_escopo_dia on escopo_itens(dia_id);

-- =========================================================================
-- ESCALA & TURNOS
-- =========================================================================

create table turnos (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  dia_id uuid not null references dias_evento(id),
  user_id uuid not null references profiles(id) on delete cascade,
  funcao funcao_equipe not null,
  setor_id uuid references setores(id),
  inicio timestamptz not null,
  fim timestamptz not null,
  is_roaming boolean not null default false,
  lider_area_id uuid references profiles(id),
  observacoes text,
  criado_em timestamptz not null default now()
);

create index idx_turnos_user on turnos(user_id);
create index idx_turnos_dia on turnos(dia_id);
create index idx_turnos_inicio on turnos(inicio);

-- =========================================================================
-- PIPELINE & CONTEÚDO
-- =========================================================================

create table pipeline_templates (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,                           -- 'Reels com aprovação'
  tipo_conteudo tipo_conteudo not null,
  patrocinado boolean not null default false,
  estagios tipo_estagio[] not null,             -- ordem dos estágios
  sla_por_estagio jsonb default '{}'::jsonb,    -- { "captura": 0, "edicao_video": 20, ... }
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
  prioridade integer not null default 3,        -- 1=alta, 5=baixa
  -- vínculo (qualquer um, ou nenhum)
  jogo_id uuid references jogos(id),
  show_id uuid references shows(id),
  festa_id uuid references festas(id),
  modalidade_id uuid references modalidades(id),
  patrocinador_id uuid references patrocinadores(id),
  escopo_item_id uuid references escopo_itens(id),
  setor_id uuid references setores(id),
  dia_id uuid references dias_evento(id),
  -- meta
  briefing text,
  link_publicado text,                          -- URL final do post
  canal_publicacao canal_publicacao,
  publicado_em timestamptz,
  metricas jsonb default '{}'::jsonb,           -- { likes, views, ... } futuro
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
  sla_minutos integer,                          -- copiado do template no momento da criação
  prazo timestamptz,                            -- iniciado_em + sla_minutos
  observacao text,
  link_resultado text,                          -- ex: link drive, figma, etc.
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

-- =========================================================================
-- REFERÊNCIAS / MOODBOARD
-- =========================================================================

create table tags (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text not null,
  categoria text,                               -- 'tema', 'formato', 'patrocinio', 'dia', 'vibe'
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
  origem text,                                  -- 'pinterest', 'instagram', 'manual'
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

-- =========================================================================
-- POSTS PUBLICADOS (agregação para dashboard de redes)
-- =========================================================================

-- view materializada conceitual: derivada de `conteudos` onde status='publicado'
-- por enquanto, a tabela conteudos já guarda link_publicado/canal/publicado_em

-- =========================================================================
-- PAUTAS / ROAMING
-- =========================================================================

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

-- =========================================================================
-- WIKI / DOCS (substitui Notion)
-- =========================================================================

create table docs (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  titulo text not null,
  slug text not null,
  conteudo_md text not null default '',
  categoria text,                               -- 'briefing', 'manual', 'contatos', 'tom_de_voz'
  funcao funcao_equipe,                         -- pode ser específico de função
  ordem integer default 0,
  publicado boolean not null default true,
  autor_id uuid references profiles(id),
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  unique (edicao_id, slug)
);

-- =========================================================================
-- CLIMA (cache)
-- =========================================================================

create table clima_cache (
  id uuid primary key default uuid_generate_v4(),
  cidade text not null default 'Uberaba',
  data date not null,
  hora_referencia integer not null,             -- 0..23
  temperatura numeric(4,1),
  sensacao numeric(4,1),
  umidade integer,
  chuva_prob integer,
  condicao text,                                -- 'limpo', 'nublado', 'chuva'
  icone text,
  atualizado_em timestamptz not null default now(),
  unique (cidade, data, hora_referencia)
);

-- =========================================================================
-- TRIGGERS — atualizado_em
-- =========================================================================

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

-- =========================================================================
-- HANDLER — criar profile automaticamente após signup
-- =========================================================================

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

-- =========================================================================
-- RLS — Row Level Security
-- =========================================================================

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

-- helper: pega role do user logado
create or replace function auth_role()
returns role_user
language sql
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth_role() = 'admin', false);
$$;

create or replace function is_coord_or_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth_role() in ('admin', 'coordenacao'), false);
$$;

create or replace function is_lider_or_above()
returns boolean
language sql
stable
as $$
  select coalesce(auth_role() in ('admin', 'coordenacao', 'lider_area'), false);
$$;

-- ============= profiles =============
create policy "profiles: ler todos autenticados"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles: editar próprio"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin edita qualquer um"
  on profiles for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============= leitura geral autenticado =============
-- todas as tabelas operacionais podem ser lidas por qualquer usuário logado
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

-- ============= write: só coord+admin (default) =============
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

-- ============= conteudos & estagios: operador atualiza próprio =============
create policy "conteudos: criar autenticado"
  on conteudos for insert
  to authenticated
  with check (true);

create policy "conteudos: update lider+coord+admin"
  on conteudos for update
  to authenticated
  using (is_lider_or_above())
  with check (is_lider_or_above());

create policy "conteudos: delete coord+admin"
  on conteudos for delete
  to authenticated
  using (is_coord_or_admin());

create policy "estagios: update próprio dono ou coord+"
  on estagios_conteudo for update
  to authenticated
  using (dono_id = auth.uid() or is_lider_or_above())
  with check (dono_id = auth.uid() or is_lider_or_above());

create policy "estagios: insert lider+"
  on estagios_conteudo for insert
  to authenticated
  with check (is_lider_or_above());

create policy "estagios: delete coord+"
  on estagios_conteudo for delete
  to authenticated
  using (is_coord_or_admin());

create policy "handoffs: insert autenticado"
  on handoffs for insert
  to authenticated
  with check (true);

-- ============= referências: qualquer um cria, autor edita =============
create policy "referencias: insert autenticado"
  on referencias for insert
  to authenticated
  with check (true);

create policy "referencias: update autor ou lider+"
  on referencias for update
  to authenticated
  using (autor_id = auth.uid() or is_lider_or_above())
  with check (autor_id = auth.uid() or is_lider_or_above());

create policy "referencias: delete autor ou coord+"
  on referencias for delete
  to authenticated
  using (autor_id = auth.uid() or is_coord_or_admin());

create policy "referencia_tags: insert autenticado"
  on referencia_tags for insert
  to authenticated
  with check (true);

create policy "referencia_tags: delete autor ou lider+"
  on referencia_tags for delete
  to authenticated
  using (
    exists (select 1 from referencias r where r.id = referencia_id
            and (r.autor_id = auth.uid() or is_lider_or_above()))
  );

create policy "conteudo_referencias: write lider+"
  on conteudo_referencias for all
  to authenticated
  using (is_lider_or_above())
  with check (is_lider_or_above());

-- ============= pautas: qualquer autenticado cria =============
create policy "pautas: insert autenticado"
  on pautas for insert
  to authenticated
  with check (true);

create policy "pautas: update autor ou lider+"
  on pautas for update
  to authenticated
  using (autor_id = auth.uid() or is_lider_or_above())
  with check (autor_id = auth.uid() or is_lider_or_above());

create policy "pautas: delete coord+"
  on pautas for delete
  to authenticated
  using (is_coord_or_admin());

-- ============= clima: write apenas service_role (cron job) =============
-- (sem política = bloqueado por padrão para usuários comuns)
