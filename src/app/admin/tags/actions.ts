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
  { name: 'slug', type: 'text' as const },
  { name: 'categoria', type: 'nullable_text' as const },
  { name: 'cor_hex', type: 'nullable_text' as const },
]

export async function createTag(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('tags').insert(data)
    if (error) throw error
  })
}

export async function updateTag(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('tags').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteTag(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) throw error
  })
}
