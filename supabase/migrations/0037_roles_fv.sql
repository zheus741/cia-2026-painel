-- 0037: adiciona roles operador_fv e lider_fv ao enum role_user
--
-- operador_fv — Operador Foto/Vídeo
--   Acesso somente leitura: wiki, mapa, hub esportivo, atléticas,
--   chaveamento, placar ao vivo, minha equipe, perfil.
--   No perfil, visualiza os conteúdos atribuídos a ele.
--
-- lider_fv — Líder Foto/Vídeo
--   Tudo do operador_fv + pode designar operadores nos turnos
--   foto/vídeo via /escala-av (não-admin).
--
-- Notas:
--   • Postgres não tem IF NOT EXISTS para ALTER TYPE ADD VALUE antes do 12,
--     mas nosso Supabase usa Postgres 15 — a sintaxe abaixo é segura.
--   • Novos valores de enum não precisam de COMMIT explícito no Supabase Studio.

ALTER TYPE role_user ADD VALUE IF NOT EXISTS 'operador_fv';
ALTER TYPE role_user ADD VALUE IF NOT EXISTS 'lider_fv';
