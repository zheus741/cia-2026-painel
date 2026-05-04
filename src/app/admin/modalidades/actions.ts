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
  { name: 'slug', type: 'text' as const },
  { name: 'icone', type: 'nullable_text' as const },
  { name: 'categorias', type: 'array' as const },
  { name: 'divisoes', type: 'array' as const },
  { name: 'observacoes', type: 'nullable_text' as const },
]

export async function createModalidade(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('modalidades').insert({ ...data, edicao_id })
    if (error) throw error
  })
}

export async function updateModalidade(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('modalidades').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteModalidade(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('modalidades').delete().eq('id', id)
    if (error) throw error
  })
}
