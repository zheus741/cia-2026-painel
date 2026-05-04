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
  { name: 'slug', type: 'nullable_text' as const },
  { name: 'tipo', type: 'text' as const },
  { name: 'divisao', type: 'nullable_text' as const },
  { name: 'universidade', type: 'nullable_text' as const },
  { name: 'logo_url', type: 'nullable_text' as const },
  { name: 'cor_primaria', type: 'nullable_text' as const },
  { name: 'observacoes', type: 'nullable_text' as const },
]

export async function createEquipe(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('equipes').insert({ ...data, edicao_id })
    if (error) throw error
  })
}

export async function updateEquipe(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('equipes').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteEquipe(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('equipes').delete().eq('id', id)
    if (error) throw error
  })
}
