'use server'

/**
 * Server actions pra gerenciar resultados externos.
 *
 * - salvarColocacoes: upsert em lote das colocações de uma modalidade × divisão
 * - removerColocacao: remove uma linha específica
 * - anexarArquivo: upload no bucket + linha em resultados_externos_anexos
 * - removerAnexo: deleta do storage + remove a linha
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'

// ── Cálculo de pontos ──────────────────────────────────────────────────────────

/**
 * Calcula os pontos da tabela do regulamento (Art. 44/46).
 *
 * Regra: 13/10/7/6/4/3/2/1 pras posições 1-8. 9º+ = 0.
 * Em conferências individuais (Allura, Kazura...) só top 4 pontua (Art. 46 I).
 */
function calcPontos(colocacao: number, divisao: string): number {
  if (colocacao <= 0) return 0  // desclassificado / WO

  const TABELA: Record<number, number> = {
    1: 13, 2: 10, 3: 7, 4: 6,
    5: 4,  6: 3,  7: 2, 8: 1,
  }

  const ehDivisaoPrincipal = ['1ª Divisão', '2ª Divisão', 'Super 08'].includes(divisao)
  // Intraconferência (Allura, Kazura, etc.) — só top 4 pontua
  if (!ehDivisaoPrincipal && colocacao > 4) return 0

  return TABELA[colocacao] ?? 0
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ColocacaoInput {
  /** ID da linha existente — null = inserir nova */
  id?:           string | null
  equipe_id:     string
  colocacao:     number
  observacoes?:  string | null
}

// ── Actions ────────────────────────────────────────────────────────────────────

/**
 * Salva (upsert) em lote as colocações de uma modalidade × divisão.
 * Substitui registros existentes com mesmo (equipe_id, observacoes).
 */
export async function salvarColocacoes(
  modalidadeId: string,
  divisao:      string,
  colocacoes:   ColocacaoInput[],
): Promise<ActionResult & { data?: { salvos: number; pontos: Record<string, number> } }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id ?? null

    if (!modalidadeId || !divisao) throw new Error('modalidade_id e divisao são obrigatórios')

    const rows = colocacoes.map(c => ({
      edicao_id:     EDICAO_ID,
      modalidade_id: modalidadeId,
      divisao,
      equipe_id:     c.equipe_id,
      colocacao:     Math.max(0, Math.floor(c.colocacao)),
      pontos:        calcPontos(c.colocacao, divisao),
      observacoes:   c.observacoes ?? null,
      updated_by:    userId,
      // Se id veio, preserva pra fazer update; senão deixa o gen_random_uuid()
      ...(c.id ? { id: c.id } : {}),
    }))

    if (rows.length === 0) {
      return { salvos: 0, pontos: {} as Record<string, number> }
    }

    // Upsert por conflict (modalidade_id, divisao, equipe_id, observacoes)
    const { error } = await supabase
      .from('resultados_externos')
      .upsert(rows, { onConflict: 'modalidade_id,divisao,equipe_id,observacoes' })

    if (error) throw error

    const pontosMap: Record<string, number> = {}
    for (const r of rows) pontosMap[r.equipe_id] = r.pontos

    revalidatePath('/esportivo/resultados-externos')
    revalidatePath('/esportivo/classificacao')
    revalidatePath('/esportivo')

    return { salvos: rows.length, pontos: pontosMap }
  })
}

/**
 * Remove uma colocação específica.
 */
export async function removerColocacao(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('resultados_externos')
      .delete()
      .eq('id', id)
    if (error) throw error
    revalidatePath('/esportivo/resultados-externos')
    revalidatePath('/esportivo/classificacao')
    revalidatePath('/esportivo')
  })
}

/**
 * Anexa arquivo (upload no bucket + linha em resultados_externos_anexos).
 *
 * O arquivo já deve estar uploaded no bucket via client-side
 * (createBrowserClient.storage.from('resultados-externos').upload(...))
 * — esta action só registra os metadados.
 */
export async function registrarAnexo(input: {
  modalidadeId:    string
  divisao:         string
  storagePath:     string
  arquivoNome:     string
  arquivoTipo?:    string | null
  arquivoTamanho?: number | null
  descricao?:      string | null
}): Promise<ActionResult & { data?: { id: string } }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id ?? null

    const { data, error } = await supabase
      .from('resultados_externos_anexos')
      .insert({
        edicao_id:       EDICAO_ID,
        modalidade_id:   input.modalidadeId,
        divisao:         input.divisao,
        storage_path:    input.storagePath,
        arquivo_nome:    input.arquivoNome,
        arquivo_tipo:    input.arquivoTipo ?? null,
        arquivo_tamanho: input.arquivoTamanho ?? null,
        descricao:       input.descricao ?? null,
        created_by:      userId,
      })
      .select('id')
      .single()

    if (error) throw error
    revalidatePath('/esportivo/resultados-externos')
    return { id: (data as { id: string }).id }
  })
}

/**
 * Remove um anexo (deleta do storage + da tabela).
 */
export async function removerAnexo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()

    // Pega o storage_path antes pra deletar do bucket
    const { data: anexo } = await supabase
      .from('resultados_externos_anexos')
      .select('storage_path')
      .eq('id', id)
      .single()

    if (anexo?.storage_path) {
      await supabase.storage.from('resultados-externos').remove([anexo.storage_path])
    }

    const { error } = await supabase
      .from('resultados_externos_anexos')
      .delete()
      .eq('id', id)
    if (error) throw error

    revalidatePath('/esportivo/resultados-externos')
  })
}

/**
 * Gera signed URL pra download de um anexo (válida por 10 minutos).
 */
export async function gerarSignedUrl(storagePath: string): Promise<ActionResult & { data?: { url: string } }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('resultados-externos')
      .createSignedUrl(storagePath, 600)  // 10 minutos
    if (error || !data?.signedUrl) throw error ?? new Error('falha ao gerar URL')
    return { url: data.signedUrl }
  })
}
