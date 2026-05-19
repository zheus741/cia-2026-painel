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
  { name: 'nome',               type: 'text'          as const },
  { name: 'tipo',               type: 'text'          as const },
  { name: 'endereco',           type: 'nullable_text' as const },
  { name: 'lat',                type: 'number'        as const },
  { name: 'lng',                type: 'number'        as const },
  { name: 'capacidade_pessoas', type: 'number'        as const },
  { name: 'cor_hex',            type: 'nullable_text' as const },
  { name: 'observacoes',        type: 'nullable_text' as const },
  { name: 'maps_url',           type: 'nullable_text' as const },
  { name: 'tem_wifi',           type: 'boolean'       as const },
  { name: 'tem_ponto_apoio',    type: 'boolean'       as const },
  { name: 'alimentacao',        type: 'nullable_text' as const },
  { name: 'notas_acesso',       type: 'nullable_text' as const },
  { name: 'tem_youtube_live',   type: 'boolean'       as const },
]

export async function createSetor(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('setores').insert({ ...data, edicao_id })
    if (error) throw error
  })
}

export async function updateSetor(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('setores').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteSetor(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('setores').delete().eq('id', id)
    if (error) throw error
  })
}
