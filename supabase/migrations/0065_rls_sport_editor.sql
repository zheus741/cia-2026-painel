-- ════════════════════════════════════════════════════════════════════════════
-- 0065 · RLS — coordenador_esportivo pode escrever no placar/chave
-- ════════════════════════════════════════════════════════════════════════════
-- BUG: o coordenador esportivo não conseguia salvar resultados no placar.
--
-- O app libera edição para ['admin', 'coordenador_esportivo'] (CAN_EDIT_ROLES +
-- requireSportEditor), mas a RLS das tabelas de competição usava
-- is_coord_or_admin() = auth_role() in ('admin','coordenacao') — que NÃO inclui
-- 'coordenador_esportivo'. Resultado: a action passava, mas o UPDATE em `jogos`
-- era filtrado pela RLS (0 linhas, SEM erro) → "salvou" mas nada mudava.
--
-- CORREÇÃO: helper is_sport_editor() cobrindo admin + coordenacao +
-- coordenador_esportivo, aplicado às tabelas que o fluxo de placar/chave escreve:
--   • jogos        — placar, status, W.O., propagação (insert/update)
--   • eventos_jogo — sets, faltas, cartões (insert/delete)
--   • chave_config — seeds da chave
--
-- Superset (mantém quem já escrevia) — não remove acesso de ninguém.
-- Idempotente (drop+create de cada policy; create or replace da função).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function is_sport_editor()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth_role() in ('admin', 'coordenacao', 'coordenador_esportivo'), false);
$$;

-- ─── jogos ───────────────────────────────────────────────────────────────────
drop policy if exists "jogos: write coord+admin"   on public.jogos;
drop policy if exists "jogos: write sport-editor"   on public.jogos;
create policy "jogos: write sport-editor"
  on public.jogos for all to authenticated
  using (is_sport_editor())
  with check (is_sport_editor());

-- ─── eventos_jogo ────────────────────────────────────────────────────────────
drop policy if exists "eventos_jogo: write coord+"      on public.eventos_jogo;
drop policy if exists "eventos_jogo: write sport-editor" on public.eventos_jogo;
create policy "eventos_jogo: write sport-editor"
  on public.eventos_jogo for all to authenticated
  using (is_sport_editor())
  with check (is_sport_editor());

-- ─── chave_config ────────────────────────────────────────────────────────────
drop policy if exists "chave_config: write coord+"       on public.chave_config;
drop policy if exists "chave_config: write sport-editor"  on public.chave_config;
create policy "chave_config: write sport-editor"
  on public.chave_config for all to authenticated
  using (is_sport_editor())
  with check (is_sport_editor());
