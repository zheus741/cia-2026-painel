'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  parseFormData,
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

// ── Upload de logo ────────────────────────────────────────────────────────────

const BUCKET = 'patrocinadores-logos'
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 3 * 1024 * 1024 // 3 MB

export async function uploadLogoPatrocinador(
  patrocinadorId: string,
  fd: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    await requireCoordOrAdmin()

    const file = fd.get('file') as File | null
    if (!file || file.size === 0) throw new Error('Nenhum arquivo selecionado.')
    if (file.size > MAX_SIZE) throw new Error('Arquivo muito grande. Máximo 3 MB.')
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Formato não suportado. Use PNG, JPG, WebP ou SVG.')
    }

    const supabase = createAdminClient()

    // Cria o bucket se não existir (idempotente — ignora erro de duplicado)
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE,
      allowedMimeTypes: ALLOWED_TYPES,
    })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const path = `${patrocinadorId}.${ext}`

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      })
    if (upErr) throw upErr

    // URL pública com cache-buster para forçar reload no browser
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`

    const { error: dbErr } = await supabase
      .from('patrocinadores')
      .update({ logo_url: url })
      .eq('id', patrocinadorId)
    if (dbErr) throw dbErr

    revalidatePath('/admin/patrocinadores')
    return { ok: true, url }
  } catch (e) {
    const msg = e instanceof Error ? e.message
      : (e as Record<string, unknown>)?.message as string ?? 'Erro ao fazer upload.'
    console.error('[uploadLogoPatrocinador]', e)
    return { ok: false, error: msg }
  }
}

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
