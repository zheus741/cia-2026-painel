import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client com service_role — bypassa RLS completamente.
 *
 * Usar EXCLUSIVAMENTE em Server Actions, APÓS validar permissão via
 * requireCoordOrAdmin(). Nunca expor ao browser.
 *
 * Por que: operações de escrita (INSERT/UPDATE/DELETE) com o client normal
 * (anon key + JWT do usuário) dependem de RLS + trigger de profile. Se o
 * profile ainda não teve o role promovido para admin/coordenacao, o banco
 * bloqueia silenciosamente sem retornar error (DELETE afeta 0 rows, INSERT
 * lança RLS violation). Usando service_role a camada de autorização fica
 * 100% no requireCoordOrAdmin() da aplicação.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
