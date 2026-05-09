'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, requireEdicaoAtivaId } from '@/lib/admin/actions-helper'

export async function updateDoc(
  id: string,
  slug: string,
  data: {
    titulo:      string
    conteudo_md: string
    categoria:   string | null
    funcao:      string | null
  },
) {
  await requireCoordOrAdmin()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('docs')
    .update({ ...data, autor_id: user!.id })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/wiki')
  revalidatePath(`/wiki/${slug}`)
}

export async function createDoc(data: {
  titulo:      string
  slug:        string
  conteudo_md: string
  categoria:   string | null
  funcao:      string | null
}) {
  await requireCoordOrAdmin()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const edicao_id = await requireEdicaoAtivaId()

  // Garante slug único — se já existir, adiciona sufixo numérico
  let finalSlug = data.slug
  const { data: existing } = await supabase
    .from('docs')
    .select('slug')
    .eq('edicao_id', edicao_id)
    .eq('slug', finalSlug)
    .maybeSingle()

  if (existing) {
    finalSlug = `${finalSlug}-${Date.now().toString(36)}`
  }

  const { data: doc, error } = await supabase
    .from('docs')
    .insert({ ...data, slug: finalSlug, edicao_id, autor_id: user!.id, publicado: true })
    .select('slug')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/wiki')
  return doc.slug as string
}
