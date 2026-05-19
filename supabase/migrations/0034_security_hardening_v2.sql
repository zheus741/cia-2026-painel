-- 0034: corrige o que a 0033 não resolveu completamente
--
-- Problema 1 — public_bucket_allows_listing:
--   Qualquer política SELECT em bucket público aciona o aviso, mesmo que
--   restrita a 'authenticated'. A solução correta é não ter nenhuma política
--   SELECT — buckets públicos servem URLs diretamente sem precisar de policy.
--
-- Problema 2 — security_definer_function_executable:
--   REVOKE de roles específicos (anon, authenticated) não tem efeito quando
--   PUBLIC ainda tem EXECUTE. O Postgres concede a roles específicos por herança
--   de PUBLIC. Precisa revogar de PUBLIC primeiro.
--
-- ─── 1. Storage: remover TODAS as políticas SELECT em buckets públicos ───────
-- Bucket público + sem policy SELECT = acesso por URL direto funciona,
-- listagem programática via API bloqueada (que é o objetivo).

DROP POLICY IF EXISTS "avatars: leitura autenticado"  ON storage.objects;
DROP POLICY IF EXISTS "brasoes: leitura autenticado"  ON storage.objects;
-- Remove também as originais caso ainda existam (idempotência):
DROP POLICY IF EXISTS "avatars: leitura pública"      ON storage.objects;
DROP POLICY IF EXISTS "brasoes_public_read"           ON storage.objects;

-- ─── 2. SECURITY DEFINER: revogar de PUBLIC antes de revogar de roles ────────

-- handle_new_user — trigger de auth.users, nunca deve ser chamada via /rpc/
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- notify_turno_escala — trigger de turnos, nunca deve ser chamada via /rpc/
REVOKE EXECUTE ON FUNCTION public.notify_turno_escala() FROM PUBLIC;

-- instanciar_checklist — legítima para authenticated (app chama via RPC),
-- mas não deve ser acessível para anon. Revoga PUBLIC, re-concede a authenticated.
REVOKE EXECUTE ON FUNCTION public.instanciar_checklist(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.instanciar_checklist(uuid) TO authenticated;
