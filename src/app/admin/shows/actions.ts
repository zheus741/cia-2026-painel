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
  { name: 'tipo', type: 'nullable_text' as const },
  { name: 'dia_id', type: 'nullable_text' as const },
  { name: 'setor_id', type: 'nullable_text' as const },
  { name: 'inicio', type: 'datetime' as const },
  { name: 'fim_previsto', type: 'datetime' as const },
  { name: 'duracao_minutos', type: 'number' as const },
  { name: 'embaixador', type: 'boolean' as const },
  { name: 'ordem_no_palco', type: 'number' as const },
  { name: 'observacoes', type: 'nullable_text' as const },
]

export async function createShow(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('shows').insert({ ...data, edicao_id })
    if (error) throw error
  })
}

export async function updateShow(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('shows').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteShow(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('shows').delete().eq('id', id)
    if (error) throw error
  })
}
