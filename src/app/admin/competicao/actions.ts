'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

export interface AtleticaPatch {
  nome?: string
  divisao?: string | null
  conferencia?: string | null
  seed?: number | null
  universidade?: string | null
  logo_url?: string | null
}

export async function updateAtletica(id: string, patch: AtleticaPatch): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('equipes').update(patch).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/competicao')
  })
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface NovaAtleticaInput {
  nome: string
  divisao?: string | null
  conferencia?: string | null
  seed?: number | null
  universidade?: string | null
  logo_url?: string | null
}

export async function createAtletica(input: NovaAtleticaInput): Promise<ActionResult & { data?: { id: string; slug: string } }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    if (!input.nome.trim()) throw new Error('Nome obrigatório.')
    const supabase = await createClient()
    const baseSlug = slugify(input.nome)
    // Garantir slug único
    const { data: existing } = await supabase
      .from('equipes')
      .select('slug')
      .like('slug', `${baseSlug}%`)
    const takenSlugs = new Set((existing ?? []).map((r: { slug: string }) => r.slug))
    let slug = baseSlug
    let n = 2
    while (takenSlugs.has(slug)) { slug = `${baseSlug}-${n++}` }

    const { data, error } = await supabase
      .from('equipes')
      .insert({
        nome: input.nome.trim(),
        slug,
        tipo: 'atletica',
        divisao: input.divisao ?? null,
        conferencia: input.conferencia ?? null,
        seed: input.seed ?? null,
        universidade: input.universidade?.trim() || null,
        logo_url: input.logo_url?.trim() || null,
      })
      .select('id, slug')
      .single()
    if (error) throw error
    revalidatePath('/admin/competicao')
    return data as { id: string; slug: string }
  })
}

export interface InscricaoPatch {
  cabeca_chave?: 1 | 2 | null
}

export async function updateInscricao(id: string, patch: InscricaoPatch): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('inscricoes').update(patch).eq('id', id)
    if (error) throw error
  })
}

export async function deleteInscricaoById(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('inscricoes').delete().eq('id', id)
    if (error) throw error
  })
}
