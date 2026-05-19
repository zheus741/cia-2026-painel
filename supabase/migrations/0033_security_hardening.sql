-- 0033: security hardening — corrige avisos do Supabase Security Advisor
--
-- Problemas resolvidos aqui:
--   1. function_search_path_mutable (17 funções)      → SET search_path = public
--   2. anon_security_definer_function_executable       → REVOKE EXECUTE de anon
--   3. authenticated_security_definer_function_exec    → REVOKE EXECUTE de authenticated
--      (apenas handle_new_user e notify_turno_escala — trigger functions)
--   4. public_bucket_allows_listing                    → remove política SELECT broad em avatars/brasoes
--
-- Avisos intencionais NÃO corrigidos (documentados abaixo):
--   • rls_policy_always_true em pautas, checklist_itens, handoffs, referencias,
--     referencia_tags, escalas_esportivo, eventos_jogo  — design intencional:
--     sistema de equipe interna fechado, todo authenticated é membro da equipe.
--   • rls_policy_always_true em chave_config            — acesso de configuração
--     permitido a qualquer authenticated (dados não sensíveis, sistema interno).
--   • auth_leaked_password_protection                  — habilitar manualmente no
--     Supabase Dashboard → Authentication → Settings → Password protection.
--
-- ────────────────────────────────────────────────────────────────────────────
-- 1. Fixar search_path mutable em todas as funções públicas
-- ────────────────────────────────────────────────────────────────────────────
-- Pinar search_path = public impede "search_path injection": um atacante não
-- pode criar objetos em pg_temp ou outro schema para interceptar chamadas.
-- Todas as funções abaixo referem apenas objetos do schema public, por isso
-- search_path = public é suficiente e compatível (não exige qualificação total).

ALTER FUNCTION public.slugify(text)                            SET search_path = public;
ALTER FUNCTION public.normalize_team_name(text)                SET search_path = public;
ALTER FUNCTION public.expand_team_abbrev(text)                 SET search_path = public;
ALTER FUNCTION public.contract_team_full(text)                 SET search_path = public;
ALTER FUNCTION public.find_atletica_by_name(text)              SET search_path = public;

ALTER FUNCTION public.set_atualizado_em()                      SET search_path = public;
ALTER FUNCTION public.auth_role()                              SET search_path = public;
ALTER FUNCTION public.is_admin()                               SET search_path = public;
ALTER FUNCTION public.is_coord_or_admin()                      SET search_path = public;
ALTER FUNCTION public.is_lider_or_above()                      SET search_path = public;

ALTER FUNCTION public.inscricoes_touch_updated_at()            SET search_path = public;
ALTER FUNCTION public.update_push_sub_updated_at()             SET search_path = public;
ALTER FUNCTION public.notify_turno_escala()                    SET search_path = public;
ALTER FUNCTION public.jogos_auto_link_equipes()                SET search_path = public;
ALTER FUNCTION public.trg_resultados_externos_touch()          SET search_path = public;
ALTER FUNCTION public.super8_liga_set_atualizado()             SET search_path = public;

ALTER FUNCTION public.instanciar_checklist(uuid)               SET search_path = public;

-- ────────────────────────────────────────────────────────────────────────────
-- 2 & 3. REVOKE EXECUTE em funções SECURITY DEFINER que não devem ser
--         chamadas diretamente pela API REST (/rpc/...)
-- ────────────────────────────────────────────────────────────────────────────
-- handle_new_user() é trigger de auth.users — jamais deve ser chamada via REST.
-- notify_turno_escala() é trigger de turnos — idem.
-- Ambas têm SECURITY DEFINER e rodam como superuser; expô-las à API é risco.
-- instanciar_checklist() é chamada pelo app com cliente autenticado (RPC legítimo)
-- → mantemos EXECUTE para authenticated, revogamos apenas de anon.

REVOKE EXECUTE ON FUNCTION public.handle_new_user()    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_turno_escala() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.instanciar_checklist(uuid) FROM anon;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Storage: remove política SELECT ampla dos buckets públicos
-- ────────────────────────────────────────────────────────────────────────────
-- Em buckets públicos, a URL pública de cada objeto já funciona sem política
-- de storage. A política SELECT ampla (USING true / bucket_id = 'X') só serve
-- para listagem programática — o que permite enumerar todos os arquivos.
-- Removendo as políticas, URLs diretas continuam funcionando; listing via API
-- deixa de funcionar para unauthenticated (mais seguro).

DROP POLICY IF EXISTS "avatars: leitura pública"  ON storage.objects;
DROP POLICY IF EXISTS "brasoes_public_read"        ON storage.objects;

-- Recriar apenas para authenticated (equipe interna lê avatares entre si,
-- mas anon não precisa listar o bucket):
CREATE POLICY "avatars: leitura autenticado"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "brasoes: leitura autenticado"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'brasoes');
