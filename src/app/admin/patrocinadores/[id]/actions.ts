'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

export async function criarEscopoItem(patrocinadorId: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = createAdminClient()
    const quantidade = parseInt(fd.get('quantidade_prevista') as string) || 1
    const prazoRaw = fd.get('prazo_limite') as string | null
    const { error } = await supabase.from('escopo_itens').insert({
      patrocinador_id: patrocinadorId,
      tipo_conteudo: fd.get('tipo_conteudo') as string || null,
      canal: fd.get('canal') as string || null,
      quantidade_prevista: quantidade,
      descricao: (fd.get('descricao') as string)?.trim() || null,
      prazo_limite: prazoRaw || null,
      status: 'pendente',
    })
    if (error) throw error
    revalidatePath(`/admin/patrocinadores/${patrocinadorId}`)
  })
}

export async function updateEscopoItemStatus(id: string, patrocinadorId: string, status: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from('escopo_itens').update({ status }).eq('id', id)
    if (error) throw error
    revalidatePath(`/admin/patrocinadores/${patrocinadorId}`)
  })
}

export async function deleteEscopoItem(id: string, patrocinadorId: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from('escopo_itens').delete().eq('id', id)
    if (error) throw error
    revalidatePath(`/admin/patrocinadores/${patrocinadorId}`)
  })
}
