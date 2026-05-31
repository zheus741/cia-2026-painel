'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSportEditor, requireEdicaoAtivaId, safe, type ActionResult } from '@/lib/admin/actions-helper'

const clampPct = (n: number) => Math.max(0, Math.min(100, n))

export async function criarMarcador(
  label: string, x: number, y: number, categoria?: string | null,
): Promise<ActionResult & { data?: { id: string } }> {
  return safe(async () => {
    await requireSportEditor()
    const nome = (label ?? '').trim()
    if (!nome) throw new Error('Dê um nome ao ponto.')
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const { data, error } = await supabase
      .from('mapa_marcadores')
      .insert({ edicao_id, label: nome, categoria: categoria ?? null, x: clampPct(x), y: clampPct(y) })
      .select('id')
      .single()
    if (error) throw error
    revalidatePath('/mapa')
    return { id: data.id as string }
  })
}

export async function moverMarcador(id: string, x: number, y: number): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { error } = await supabase
      .from('mapa_marcadores')
      .update({ x: clampPct(x), y: clampPct(y) })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/mapa')
  })
}

export async function renomearMarcador(id: string, label: string): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const nome = (label ?? '').trim()
    if (!nome) throw new Error('Nome vazio.')
    const supabase = await createClient()
    const { error } = await supabase.from('mapa_marcadores').update({ label: nome }).eq('id', id)
    if (error) throw error
    revalidatePath('/mapa')
  })
}

export async function deletarMarcador(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { error } = await supabase.from('mapa_marcadores').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/mapa')
  })
}
