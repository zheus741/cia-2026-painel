-- ════════════════════════════════════════════════════════════════════════════
-- 0060 · Conserta CHECK constraint de canal_publicacao (subquery proibida)
-- ════════════════════════════════════════════════════════════════════════════
-- A migration 0055 tentou usar uma subquery dentro de CHECK constraint:
--   check (... (select bool_and(...) from unnest(...)) ...)
-- Postgres não permite subqueries em CHECKs (ERRO 0A000).
--
-- Fix: extrair a validação pra uma função `is_valid_canal_publicacao(text)`
-- marcada como IMMUTABLE — agora o CHECK pode chamá-la sem subquery aparente.
--
-- A coluna provavelmente JÁ está como text (o ALTER TYPE da 0055 roda primeiro).
-- Esta migration:
--   1. Confirma que a coluna é text (no-op se já é)
--   2. Cria a função de validação
--   3. Aplica o CHECK usando a função
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Garante coluna TEXT (no-op se 0055 já rodou essa parte) ─────────────
do $$
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
end $$;

-- ── 2. Função de validação ────────────────────────────────────────────────
create or replace function is_valid_canal_publicacao(p_value text)
returns boolean
language plpgsql
immutable
parallel safe
as $$
declare
  v_allowed text[] := array[
    -- Canais atuais (UI 2026)
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
    -- Antigos enum (compat com rows existentes)
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
  -- NULL aceito
  if p_value is null then
    return true;
  end if;

  -- Cada elemento do CSV deve estar na whitelist
  foreach v_item in array string_to_array(p_value, ',')
  loop
    if trim(v_item) <> all(v_allowed) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- ── 3. Re-aplica o CHECK usando a função ──────────────────────────────────
alter table conteudos
  drop constraint if exists conteudos_canal_publicacao_check;

alter table conteudos
  add constraint conteudos_canal_publicacao_check
  check (is_valid_canal_publicacao(canal_publicacao));

comment on function is_valid_canal_publicacao(text) is
  'Valida CSV de canais. Whitelist mantida na função — adicione novos valores aqui (via CREATE OR REPLACE) sem precisar dropar o CHECK.';
