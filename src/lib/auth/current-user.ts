/**
 * Helpers cacheados para auth + profile.
 *
 * Por que React.cache?
 *   No App Router, `supabase.auth.getUser()` bate no endpoint /auth/v1/user do
 *   Supabase a cada chamada — em medições reais, ~240ms por hit. Como toda
 *   page.tsx (e layouts) precisam saber quem é o usuário, esse custo se
 *   multiplicava.
 *
 *   `cache()` faz dedupe DENTRO de uma mesma request: chamadas idênticas
 *   reutilizam o resultado do primeiro await. Layout + page + loading
 *   compartilham o mesmo cache.
 *
 *   Resultado típico:
 *     /conteudos antes: auth.getUser() 240ms + profile fetch 240ms = 480ms
 *     /conteudos depois: 240ms total (e zero em chamadas subsequentes)
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

/** Apenas o user do Supabase Auth (sem profile). Cacheado por request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/** User + profile da tabela `profiles`. Cacheado por request. */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nome, email, foto_url, role, funcao_principal, telefone, bio')
    .eq('id', user.id)
    .maybeSingle()
  return (data ?? null) as CurrentProfile | null
})

/** Versão que faz redirect('/login') se não autenticado. Cacheada. */
export const requireProfile = cache(async (): Promise<CurrentProfile> => {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  return profile
})
