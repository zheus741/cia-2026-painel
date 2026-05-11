'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

export async function setJogoAoVivo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ status: 'ao_vivo' })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
  })
}

export async function encerrarJogo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ status: 'encerrado' })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
  })
}

export async function atualizarPlacar(
  id: string,
  placar_a: number,
  placar_b: number,
): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ placar_a, placar_b })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
  })
}

export async function cancelarJogo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ status: 'cancelado' })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
  })
}

export async function criarJogoTeste(diaId: string): Promise<ActionResult & { data?: { id: string } }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('jogos')
      .insert({
        equipe_a_nome: 'Equipe Alfa',
        equipe_b_nome: 'Equipe Beta',
        status: 'agendado',
        dia_id: diaId,
        placar_a: 0,
        placar_b: 0,
        teste: true,
      })
      .select('id')
      .single()
    if (error) throw error
    revalidatePath('/placar')
    return data as { id: string }
  })
}

export async function reativarJogo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ status: 'agendado', placar_a: null, placar_b: null })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
  })
}
