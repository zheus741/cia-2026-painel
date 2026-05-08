import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente com service role — bypassa RLS.
 * Use apenas em server-only code (API routes, Server Actions).
 * NUNCA exponha ao browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione ao .env.local.',
    )
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
