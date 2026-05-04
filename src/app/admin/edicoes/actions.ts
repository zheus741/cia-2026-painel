'use server'

import { createClient } from '@/lib/supabase/server'
import {
  parseFormData,
  requireCoordOrAdmin,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

const SCHEMA = [
  { name: 'nome', type: 'text' as const },
  { name: 'ano', type: 'number' as const },
  { name: 'cidade', type: 'nullable_text' as const },
  { name: 'data_inicio', type: 'text' as const },
  { name: 'data_fim', type: 'text' as const },
  { name: 'ativa', type: 'boolean' as const },
]

export async function createEdicao(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('edicoes').insert(data)
    if (error) throw error
  })
}

export async function updateEdicao(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('edicoes').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteEdicao(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('edicoes').delete().eq('id', id)
    if (error) throw error
  })
}
