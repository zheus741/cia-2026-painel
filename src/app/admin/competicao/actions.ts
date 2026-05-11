'use server'

import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

export interface AtleticaPatch {
  divisao?: string | null
  conferencia?: string | null
  seed?: number | null
  universidade?: string | null
}

export async function updateAtletica(id: string, patch: AtleticaPatch): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('equipes').update(patch).eq('id', id)
    if (error) throw error
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
