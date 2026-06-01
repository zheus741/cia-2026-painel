-- ════════════════════════════════════════════════════════════════════════════
-- 0073 — BROADCAST FASE 2: Escaleta, VTs e Checklist Go-Live (PRÉ-produção)
-- ════════════════════════════════════════════════════════════════════════════
-- Rodar DEPOIS do 0072.

-- ── Biblioteca de VTs ────────────────────────────────────────────────────────
create table if not exists broadcast_vt (
  id         uuid primary key default gen_random_uuid(),
  canal      text not null default 'palco-principal',
  nome       text not null,
  descricao  text,
  duracao_seg integer not null default 30,
  patroc_id  uuid references patrocinadores(id) on delete set null,
  ordem      real not null default 0,
  criado_em  timestamptz not null default now()
);
create index if not exists idx_broadcast_vt_canal on broadcast_vt (canal, ordem);

-- ── Escaleta / espelho do programa ───────────────────────────────────────────
create table if not exists broadcast_escaleta (
  id          uuid primary key default gen_random_uuid(),
  canal       text not null default 'palco-principal',
  ordem       real not null default 0,
  tipo        text not null default 'atracao',  -- vinheta|vt|atracao|bumper|fala|intervalo|placa|encerramento
  titulo      text not null,
  duracao_seg integer not null default 0,
  vt_id       uuid references broadcast_vt(id) on delete set null,
  notas       text,
  status      text not null default 'pendente', -- pendente|no_ar|concluido
  criado_em   timestamptz not null default now()
);
create index if not exists idx_broadcast_escaleta_canal on broadcast_escaleta (canal, ordem);

-- ── Checklist Go-Live ────────────────────────────────────────────────────────
create table if not exists broadcast_checklist (
  id        uuid primary key default gen_random_uuid(),
  canal     text not null default 'palco-principal',
  categoria text not null default 'Geral',
  texto     text not null,
  feito     boolean not null default false,
  ordem     real not null default 0
);

-- ── Estado: campos de VT-cue e segmento atual ────────────────────────────────
alter table broadcast_estado
  add column if not exists vt_on          boolean default false,
  add column if not exists vt_nome        text,
  add column if not exists vt_fim_ts      timestamptz,
  add column if not exists segmento_id    uuid,
  add column if not exists segmento_titulo text,
  add column if not exists segmento_fim_ts timestamptz;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table broadcast_vt        enable row level security;
alter table broadcast_escaleta  enable row level security;
alter table broadcast_checklist enable row level security;

drop policy if exists "broadcast_vt sel"        on broadcast_vt;
drop policy if exists "broadcast_escaleta sel"  on broadcast_escaleta;
drop policy if exists "broadcast_checklist sel" on broadcast_checklist;
create policy "broadcast_vt sel"        on broadcast_vt        for select to authenticated using (true);
create policy "broadcast_escaleta sel"  on broadcast_escaleta  for select to authenticated using (true);
create policy "broadcast_checklist sel" on broadcast_checklist for select to authenticated using (true);

-- ── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table broadcast_escaleta;

-- ── Seed do Checklist Go-Live (ritual de prontidão pré-ar) ────────────────────
insert into broadcast_checklist (categoria, texto, ordem) values
  ('Áudio',    'Mesa de som testada e nivelada',                10),
  ('Áudio',    'Microfone do apresentador funcionando',         20),
  ('Áudio',    'Áudio do palco chegando no programa',            30),
  ('Vídeo',    'Todas as câmeras enquadradas e com sinal',       40),
  ('Vídeo',    'Iluminação do palco conferida',                  50),
  ('Gráficos', 'Overlay carregado no OBS (browser source)',      60),
  ('Gráficos', 'Régie aberta e sincronizando',                   70),
  ('Gráficos', 'Logos de patrocinadores carregadas',             80),
  ('VTs',      'VTs no lugar e testadas no switcher',             90),
  ('Stream',   'Stream key do YouTube configurada',             100),
  ('Stream',   'Internet/upload estável (teste de banda)',      110),
  ('Stream',   'Gravação local ativada (backup)',               120),
  ('Equipe',   'Escaleta fechada e revisada',                   130),
  ('Equipe',   'Talkback funcionando com a equipe',             140)
on conflict do nothing;
