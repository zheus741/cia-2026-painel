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
  { name: 'nome', type: 'text' as const },
  { name: 'tema', type: 'nullable_text' as const },
  { name: 'dia_id', type: 'nullable_text' as const },
  { name: 'setor_id', type: 'nullable_text' as const },
  { name: 'inicio', type: 'datetime' as const },
  { name: 'fim_previsto', type: 'datetime' as const },
  { name: 'observacoes', type: 'nullable_text' as const },
]

export async function createFesta(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('festas').insert({ ...data, edicao_id })
    if (error) throw error
  })
}

export async function updateFesta(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('festas').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteFesta(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('festas').delete().eq('id', id)
    if (error) throw error
  })
}
