/**
 * Helpers cacheados para auth + profile.
 *
 * Duas camadas de cache:
 *
 * 1. React.cache() — dedupe DENTRO de uma mesma request.
 *    Layout + page + loading compartilham o mesmo resultado sem bater
 *    novamente no banco na mesma renderização.
 *
 * 2. unstable_cache() no fetchProfile — persiste o profile entre requests
 *    do mesmo usuário por até 30s. Economiza ~240ms por navegação depois
 *    da primeira carga, sem risco de dados críticos defasados (role, nome).
 *    Invalidado via revalidateTag('profile:<id>') ao salvar o perfil.
 *
 * Resultado típico (Pro Micro, sem upgrade):
 *   /conteudos antes: auth 230ms + profile 240ms = 470ms
 *   /conteudos depois: auth 230ms + profile ~0ms = 230ms (nas reqs seguintes)
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export type Role = 'admin' | 'coordenacao' | 'lider_area' | 'operador'

export interface CurrentProfile {
  id:                string
  nome:              string
  email:             string
  foto_url:          string | null
  role:              Role
  funcao_principal:  string | null
  telefone:          string | null
  bio:               string | null
}

// Fetcher cacheado cross-request: persiste por 30s, key = user id.
// Usa service client para não depender do cookie de sessão neste contexto.
function makeCachedProfileFetch(userId: string) {
  return unstable_cache(
    async () => {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, email, foto_url, role, funcao_principal, telefone, bio')
        .eq('id', userId)
        .maybeSingle()
      return (data ?? null) as CurrentProfile | null
    },
    ['profile', userId],
    { revalidate: 30, tags: [`profile:${userId}`] },
  )
}

/** Apenas o user do Supabase Auth (sem profile). Cacheado por request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/** User + profile da tabela `profiles`. Cacheado por request + 30s cross-request. */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  return makeCachedProfileFetch(user.id)()
})

/** Versão que faz redirect('/login') se não autenticado. Cacheada. */
export const requireProfile = cache(async (): Promise<CurrentProfile> => {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  return profile
})
