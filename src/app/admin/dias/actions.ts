'use server'

import { createClient } from '@/lib/supabase/server'
import {
  parseFormData,
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

const SCHEMA = [
  { name: 'data', type: 'text' as const },
  { name: 'nome_dia', type: 'text' as const },
  { name: 'tema', type: 'nullable_text' as const },
  { name: 'observacoes', type: 'nullable_text' as const },
]

export async function createDia(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('dias_evento').insert({ ...data, edicao_id })
    if (error) throw error
  })
}

export async function updateDia(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('dias_evento').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteDia(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('dias_evento').delete().eq('id', id)
    if (error) throw error
  })
}
