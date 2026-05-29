-- ════════════════════════════════════════════════════════════════════════════
-- 0060 · Conserta CHECK constraint de canal_publicacao (subquery proibida)
-- ════════════════════════════════════════════════════════════════════════════
-- Postgres não permite subqueries em CHECK (ERRO 0A000).
-- Fix: validação via função IMMUTABLE chamada pelo CHECK.
--
-- IMPORTANTE: este é o arquivo COMPLETO. Rode ele inteiro, não trechos.
-- Idempotente (pode rodar várias vezes).
-- ════════════════════════════════════════════════════════════════════════════

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

comment on function is_valid_canal_publicacao(text) is
  'Valida CSV de canais de publicacao. Whitelist mantida na funcao - adicione novos valores aqui (via CREATE OR REPLACE) sem precisar dropar o CHECK.';
