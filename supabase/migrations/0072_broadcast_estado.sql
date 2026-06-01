-- ════════════════════════════════════════════════════════════════════════════
-- 0072 — BROADCAST / RÉGIE: estado ao vivo do Palco Principal
-- ════════════════════════════════════════════════════════════════════════════
-- A Régie (mesa do diretor) escreve nesta linha única; o Overlay (browser source
-- no OBS) lê + escuta realtime e renderiza os gráficos sobre o vídeo.
--
-- Modelo: 1 linha por canal (por enquanto só 'palco-principal'). Cada camada
-- gráfica tem seu _on (visível?) + os campos de conteúdo.

create table if not exists broadcast_estado (
  id          text primary key default 'palco-principal',

  -- Mosca / bug persistente + selo AO VIVO
  mosca_on    boolean not null default true,
  ao_vivo     boolean not null default false,

  -- GC (gerador de caracteres / lower third): artista ou crédito
  gc_on        boolean not null default false,
  gc_tipo      text,            -- 'artista' | 'credito'
  gc_titulo    text,            -- nome do artista / pessoa
  gc_subtitulo text,            -- @ instagram  /  função
  gc_detalhe   text,            -- atlética / cidade

  -- Now playing (música tocando)
  np_on       boolean not null default false,
  np_musica   text,
  np_artista  text,

  -- Card patrocinador
  patroc_on   boolean not null default false,
  patroc_id   uuid references patrocinadores(id) on delete set null,
  patroc_modo text default 'apresenta',  -- 'apresenta' | 'apoio' | 'card'

  -- Placa full-screen
  placa_on      boolean not null default false,
  placa_tipo    text,           -- 'a_seguir' | 'premiacao' | 'abertura' | 'encerramento'
  placa_payload jsonb,          -- conteúdo flexível da placa

  -- Crawl / letreiro rolante
  crawl_on    boolean not null default false,
  crawl_texto text,

  -- meta
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- As-run log: tudo que foi ao ar (pós-produção + relatório de patrocínio)
create table if not exists broadcast_log (
  id        uuid primary key default gen_random_uuid(),
  canal     text not null default 'palco-principal',
  acao      text not null,        -- 'gc_ar' | 'np_ar' | 'patroc_ar' | 'placa_ar' | 'clip' | ...
  rotulo    text,                 -- descrição legível
  payload   jsonb,
  patroc_id uuid references patrocinadores(id) on delete set null,
  criado_em timestamptz not null default now(),
  criado_por uuid
);
create index if not exists idx_broadcast_log_canal_data on broadcast_log (canal, criado_em desc);

-- Seed da linha única
insert into broadcast_estado (id) values ('palco-principal')
  on conflict (id) do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table broadcast_estado enable row level security;
alter table broadcast_log    enable row level security;

-- Overlay é público (browser source não loga) → SELECT liberado pra todos.
-- Escrita só via service role (server actions já validam papel) → sem policy de write.
drop policy if exists "broadcast_estado select público" on broadcast_estado;
create policy "broadcast_estado select público" on broadcast_estado
  for select using (true);

-- Log: leitura só autenticado; escrita via service role.
drop policy if exists "broadcast_log select autenticado" on broadcast_log;
create policy "broadcast_log select autenticado" on broadcast_log
  for select to authenticated using (true);

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Overlay escuta postgres_changes nesta tabela.
alter publication supabase_realtime add table broadcast_estado;
