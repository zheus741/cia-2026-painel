-- ════════════════════════════════════════════════════════════════════════════
-- 0055 · canal_publicacao: enum → text com CHECK whitelist
-- ════════════════════════════════════════════════════════════════════════════
-- A UI envia valores como 'instagram_cia', 'tiktok_cia', 'instagram_jogo_rapido'
-- que NÃO existem no enum original (instagram_feed/reels/stories…). Ou a coluna
-- foi convertida pra TEXT manualmente fora de migration (provável), ou os
-- INSERTs estão falhando silenciosamente.
--
-- Estratégia mais segura: converter pra TEXT + CHECK whitelist. Permite valores
-- atuais da UI + facilita adicionar novos (basta editar o CHECK).
--
-- Idempotente: se a coluna já é TEXT, só recria o CHECK constraint.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_current_type text;
begin
  -- Descobre o tipo atual da coluna
  select data_type into v_current_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'conteudos'
     and column_name  = 'canal_publicacao';

  -- Se ainda é USER-DEFINED (enum), converte
  if v_current_type = 'USER-DEFINED' then
    alter table conteudos
      alter column canal_publicacao type text
      using canal_publicacao::text;
  end if;
end $$;

-- Remove constraint antiga se existir, pra recriar com lista atualizada
alter table conteudos
  drop constraint if exists conteudos_canal_publicacao_check;

-- CHECK: aceita CSV separado por vírgula (formato atual) ou single value.
-- Whitelist por substring — cada item entre vírgulas deve estar na lista.
-- Permite NULL.
alter table conteudos
  add constraint conteudos_canal_publicacao_check
  check (
    canal_publicacao is null
    or (
      -- Cada elemento do CSV é validado individualmente
      (
        select bool_and(
          trim(elem) in (
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
            -- Mantém os antigos por compatibilidade com rows existentes
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
          )
        )
        from unnest(string_to_array(canal_publicacao, ',')) elem
      )
    )
  );

comment on column conteudos.canal_publicacao is
  'CSV de canais alvo. Whitelist definida no CHECK constraint. Adicione novos valores editando esta migration ou criando uma 005X de update.';
