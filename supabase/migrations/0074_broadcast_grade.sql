-- ════════════════════════════════════════════════════════════════════════════
-- 0074 — BROADCAST: Grade de Programação (TV) + Equipe + YouTube
-- ════════════════════════════════════════════════════════════════════════════
-- Rodar DEPOIS do 0072 e 0073.
-- Pivô: removida a Régie (camada técnica de gráficos). Foco em pré-produção
-- organizacional + termômetro ao vivo. A tabela broadcast_escaleta vira a
-- GRADE DE PROGRAMAÇÃO (blocos com horário). broadcast_estado guarda config
-- do programa (ao vivo + link do YouTube).

-- Escaleta → Grade de Programação (blocos com horário previsto + responsável)
alter table broadcast_escaleta
  add column if not exists horario     time,         -- horário previsto de início
  add column if not exists responsavel text,         -- quem conduz/opera o bloco
  add column if not exists dia         date;          -- noite do show (null = padrão)

-- Equipe do programa (call sheet)
create table if not exists broadcast_equipe (
  id        uuid primary key default gen_random_uuid(),
  canal     text not null default 'palco-principal',
  funcao    text not null,        -- Diretor, Operador, Apresentador, Câmera 1…
  nome      text not null,
  contato   text,
  ordem     real not null default 0,
  criado_em timestamptz not null default now()
);

-- Config do programa pro termômetro (link YouTube)
alter table broadcast_estado
  add column if not exists youtube_url      text,
  add column if not exists youtube_video_id text,
  add column if not exists programa_titulo  text;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table broadcast_equipe enable row level security;
drop policy if exists "broadcast_equipe sel" on broadcast_equipe;
create policy "broadcast_equipe sel" on broadcast_equipe for select to authenticated using (true);

-- Seed de funções da equipe (call sheet padrão)
insert into broadcast_equipe (funcao, nome, ordem) values
  ('Diretor de transmissão', '', 10),
  ('Operador (switcher/OBS)', '', 20),
  ('GC / Gráficos',           '', 30),
  ('Apresentador(a)',         '', 40),
  ('Câmera 1',                '', 50),
  ('Câmera 2',                '', 60),
  ('Áudio',                   '', 70),
  ('Produção / piso',         '', 80)
on conflict do nothing;
