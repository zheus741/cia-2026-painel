-- ════════════════════════════════════════════════════════════════════════════
-- 0070 · Marcadores do mapa (Centro Park)
-- ════════════════════════════════════════════════════════════════════════════
-- Pontos posicionados à mão sobre o render 3D do Centro Park (palcos, food,
-- área médica, etc.). x/y em % (0–100) relativos à imagem. Compartilhado:
-- coord posiciona clicando, todos veem.
--
-- RLS: leitura por qualquer autenticado; escrita por sport-editor
-- (admin / coordenacao / coordenador_esportivo — função is_sport_editor da 0065).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists mapa_marcadores (
  id         uuid primary key default uuid_generate_v4(),
  edicao_id  uuid not null references edicoes(id) on delete cascade,
  label      text not null,
  categoria  text,                       -- opcional: 'palco' | 'esporte' | 'apoio' | 'food' | ...
  x          real not null,              -- % horizontal (0–100)
  y          real not null,              -- % vertical (0–100)
  criado_em  timestamptz not null default now()
);

create index if not exists idx_mapa_marcadores_edicao on mapa_marcadores (edicao_id);

alter table mapa_marcadores enable row level security;

drop policy if exists "mapa_marcadores: ler autenticado" on mapa_marcadores;
create policy "mapa_marcadores: ler autenticado"
  on mapa_marcadores for select to authenticated using (true);

drop policy if exists "mapa_marcadores: write sport-editor" on mapa_marcadores;
create policy "mapa_marcadores: write sport-editor"
  on mapa_marcadores for all to authenticated
  using (is_sport_editor()) with check (is_sport_editor());
