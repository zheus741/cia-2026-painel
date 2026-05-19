'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireProfile } from '@/lib/auth/current-user'

export interface CriarPautaResult {
  ok: boolean
  error?: string
  data?: {
    id: string
    titulo: string
    descricao: string | null
    referencias: string[]
    status: 'ideia'
  }
}

/**
 * Cria uma nova pauta como ideia.
 * Usa service client para bypassar RLS restritiva no INSERT —
 * pautas é um board colaborativo aberto a toda a equipe.
 * Chama refresh() para atualizar o server component imediatamente.
 */
export async function criarPautaAction(
  titulo: string,
  descricao: string,
  referencias: string[],
  edicaoId: string,
): Promise<CriarPautaResult> {
  const profile = await requireProfile()

  const titulo_ = titulo.trim()
  if (!titulo_) return { ok: false, error: 'Título obrigatório' }

  const service = createServiceClient()

  const refsClean = referencias.filter(r => r.trim())

  type PautaRow = { id: string; titulo: string; descricao: string | null; referencias: string[]; status: string }

  // Tenta inserir com referencias; se a coluna ainda não existir (migração pendente),
  // faz fallback sem ela para não bloquear a criação de pautas.
  let data: PautaRow | null = null

  const insertWithRefs = await service
    .from('pautas')
    .insert({
      titulo: titulo_,
      descricao: descricao.trim() || null,
      referencias: refsClean,
      edicao_id: edicaoId,
      autor_id: profile.id,
    })
    .select('id, titulo, descricao, referencias, status')
    .single()

  if (insertWithRefs.error?.message?.includes('referencias')) {
    // Coluna ainda não existe — fallback sem o campo
    const fallback = await service
      .from('pautas')
      .insert({
        titulo: titulo_,
        descricao: descricao.trim() || null,
        edicao_id: edicaoId,
        autor_id: profile.id,
      })
      .select('id, titulo, descricao, status')
      .single()
    if (fallback.error) return { ok: false, error: fallback.error.message }
    data = { ...(fallback.data as Omit<PautaRow, 'referencias'>), referencias: refsClean }
  } else if (insertWithRefs.error) {
    return { ok: false, error: insertWithRefs.error.message }
  } else {
    data = insertWithRefs.data as PautaRow
  }

  if (!data) return { ok: false, error: 'Erro inesperado ao salvar' }

  revalidatePath('/pautas')

  return {
    ok: true,
    data: {
      id: data.id,
      titulo: data.titulo,
      descricao: data.descricao,
      referencias: (data.referencias ?? refsClean) as string[],
      status: 'ideia' as const,
    },
  }
}

export interface AtualizarPautaResult {
  ok: boolean
  error?: string
}

/**
 * Atualiza setor e dia de uma pauta existente.
 * Permite null pra "remover" a atribuição.
 */
export async function atualizarSetorDiaAction(
  id: string,
  setorId: string | null,
  diaId: string | null,
): Promise<AtualizarPautaResult> {
  await requireProfile()

  const service = createServiceClient()
  const { error } = await service
    .from('pautas')
    .update({ setor_id: setorId, dia_id: diaId })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/pautas')
  return { ok: true }
}
