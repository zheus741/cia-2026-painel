/**
 * Cached lookup tables — dados quase estáticos que mudam raramente.
 *
 * Usa unstable_cache do Next.js com revalidate: 300 (5 min).
 * Todas as funções usam o service-role client (sem cookies) para rodar
 * fora do contexto de request, o que é exatamente o que unstable_cache precisa.
 *
 * Impacto estimado: ~150ms economizados por navegação para /conteudos e
 * /escala-midia (3 queries de ~50ms cada substituídas por cache in-memory).
 *
 * Tags para invalidação manual via revalidateTag():
 *   'lookup-dias'          → dias_evento
 *   'lookup-setores'       → setores
 *   'lookup-patrocinadores'→ patrocinadores ativos
 *   'lookup-perfis'        → profiles ativos (id, nome, foto_url)
 */

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Cliente sem cookies — funciona dentro de unstable_cache (fora do request ctx).
// service-role ignora RLS e garante que os dados sejam sempre retornados.
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// ── Dias do evento ─────────────────────────────────────────────────────────────
export const getCachedDias = unstable_cache(
  async () => {
    const { data, error } = await admin()
      .from('dias_evento')
      .select('id, nome_dia, data')
      .order('data')
    if (error) console.error('[cache/lookups] dias_evento:', error.message)
    return (data ?? []) as { id: string; nome_dia: string; data: string }[]
  },
  ['lookup-dias'],
  { tags: ['lookup-dias'], revalidate: 300 },
)

// ── Setores ────────────────────────────────────────────────────────────────────
export const getCachedSetores = unstable_cache(
  async () => {
    const { data, error } = await admin()
      .from('setores')
      .select('id, nome, tipo')
      .order('nome')
    if (error) console.error('[cache/lookups] setores:', error.message)
    return (data ?? []) as { id: string; nome: string; tipo: string | null }[]
  },
  ['lookup-setores-v2'],
  { tags: ['lookup-setores'], revalidate: 300 },
)

// ── Patrocinadores ativos ──────────────────────────────────────────────────────
export const getCachedPatrocinadores = unstable_cache(
  async () => {
    const { data, error } = await admin()
      .from('patrocinadores')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    if (error) console.error('[cache/lookups] patrocinadores:', error.message)
    return (data ?? []) as { id: string; nome: string }[]
  },
  ['lookup-patrocinadores'],
  { tags: ['lookup-patrocinadores'], revalidate: 300 },
)

// ── Perfis ativos (para dropdowns de responsável) ──────────────────────────────
export const getCachedPerfis = unstable_cache(
  async () => {
    const { data, error } = await admin()
      .from('profiles')
      .select('id, nome, foto_url')
      .eq('ativo', true)
      .order('nome')
    if (error) console.error('[cache/lookups] profiles:', error.message)
    return (data ?? []) as { id: string; nome: string; foto_url: string | null }[]
  },
  ['lookup-perfis'],
  { tags: ['lookup-perfis'], revalidate: 300 },
)
