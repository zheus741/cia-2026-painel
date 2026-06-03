'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

const VALIDOS = ['pendente', 'em_producao', 'entregue', 'atrasado'] as const
type EscopoStatus = (typeof VALIDOS)[number]

// Revalida tudo que consome a métrica de escopo (home, fichário, TV, esta página).
function revalidarMetrica() {
  revalidatePath('/admin/patrocinadores/entregas')
  revalidatePath('/admin/patrocinadores')
  revalidatePath('/')
  revalidatePath('/tv')
}

/** Marca/desmarca um item de escopo (toque único na Entrega Rápida). */
export async function setEscopoStatus(id: string, status: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    if (!VALIDOS.includes(status as EscopoStatus)) throw new Error(`Status inválido: ${status}`)
    const supabase = createAdminClient()
    const { error } = await supabase.from('escopo_itens').update({ status }).eq('id', id)
    if (error) throw error
    revalidarMetrica()
  })
}

/** Marca vários itens de uma vez (botão "marcar tudo" da marca). */
export async function setEscopoStatusBulk(ids: string[], status: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    if (!VALIDOS.includes(status as EscopoStatus)) throw new Error(`Status inválido: ${status}`)
    if (ids.length === 0) return
    const supabase = createAdminClient()
    const { error } = await supabase.from('escopo_itens').update({ status }).in('id', ids)
    if (error) throw error
    revalidarMetrica()
  })
}
