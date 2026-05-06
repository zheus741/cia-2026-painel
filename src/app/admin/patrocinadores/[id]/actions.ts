'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

export async function criarEscopoItem(patrocinadorId: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const quantidade = parseInt(fd.get('quantidade_prevista') as string) || 1
    const { error } = await supabase.from('escopo_itens').insert({
      patrocinador_id: patrocinadorId,
      tipo_conteudo: fd.get('tipo_conteudo') as string || null,
      canal: fd.get('canal') as string || null,
      quantidade_prevista: quantidade,
      descricao: (fd.get('descricao') as string)?.trim() || null,
      status: 'pendente',
    })
    if (error) throw error
    revalidatePath(`/admin/patrocinadores/${patrocinadorId}`)
  })
}

export async function updateEscopoItemStatus(id: string, patrocinadorId: string, status: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('escopo_itens').update({ status }).eq('id', id)
    if (error) throw error
    revalidatePath(`/admin/patrocinadores/${patrocinadorId}`)
  })
}

export async function deleteEscopoItem(id: string, patrocinadorId: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('escopo_itens').delete().eq('id', id)
    if (error) throw error
    revalidatePath(`/admin/patrocinadores/${patrocinadorId}`)
  })
}
