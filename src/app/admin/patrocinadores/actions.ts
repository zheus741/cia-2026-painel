'use server'

import { createAdminClient } from '@/lib/supabase/admin'
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
  { name: 'logo_url', type: 'nullable_text' as const },
  { name: 'cor_marca', type: 'nullable_text' as const },
  { name: 'cota', type: 'nullable_text' as const },
  { name: 'contato_nome', type: 'nullable_text' as const },
  { name: 'contato_email', type: 'nullable_text' as const },
  { name: 'contato_telefone', type: 'nullable_text' as const },
  { name: 'observacoes', type: 'nullable_text' as const },
  { name: 'ativo', type: 'boolean' as const },
]

export async function createPatrocinador(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = createAdminClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('patrocinadores').insert({ ...data, edicao_id })
    if (error) throw error
  })
}

export async function updatePatrocinador(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = createAdminClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('patrocinadores').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deletePatrocinador(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from('patrocinadores').delete().eq('id', id)
    if (error) throw error
  })
}
