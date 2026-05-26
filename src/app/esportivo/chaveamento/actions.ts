'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCoordOrAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

/**
 * Cria ou atualiza a configuração de seeds de uma chave (modalidade+categoria+divisão).
 * Necessário para que a propagação automática de vencedores funcione.
 *
 * Conflito resolvido por (modalidade_id, categoria, divisao) — mas também faz lookup
 * cross-edicao via modalidadeSlug pra evitar duplicatas com linhas do migration legado
 * que podem ter modalidade_id de uma edicao diferente.
 */
export async function upsertChaveConfig(
  modalidadeId: string,
  categoria: string,
  divisao: string,
  numTeams: number,
  seeds: string[],
  modalidadeSlug?: string,
): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()

    if (!modalidadeId || !categoria || !divisao)
      throw new Error('modalidade_id, categoria e divisao são obrigatórios')
    if (numTeams < 2 || numTeams > 64)
      throw new Error('num_teams deve estar entre 2 e 64')
    if (seeds.length < 2)
      throw new Error('Precisa de pelo menos 2 seeds')

    const supabase = await createClient()

    // 1ª tentativa: lookup exato por modalidade_id (caso normal)
    let existingId: string | null = null

    const { data: exact } = await supabase
      .from('chave_config')
      .select('id')
      .eq('modalidade_id', modalidadeId)
      .eq('categoria', categoria)
      .ilike('divisao', divisao)
      .maybeSingle()
    existingId = exact?.id ?? null

    // 2ª tentativa: se não achou e temos o slug, busca cross-edicao.
    // Cobre o caso de chave_config criada pelo migration legado com ID de outra edicao.
    if (!existingId && modalidadeSlug) {
      const { data: sameSlugs } = await supabase
        .from('modalidades')
        .select('id')
        .eq('slug', modalidadeSlug)
      const allIds = (sameSlugs ?? []).map(m => m.id).filter(id => id !== modalidadeId)
      if (allIds.length > 0) {
        const { data: crossEdition } = await supabase
          .from('chave_config')
          .select('id')
          .in('modalidade_id', allIds)
          .eq('categoria', categoria)
          .ilike('divisao', divisao)
          .limit(1)
          .maybeSingle()
        existingId = crossEdition?.id ?? null
      }
    }

    if (existingId) {
      // Atualiza seeds + migra o modalidade_id para o da edicao atual (deduplication)
      const { error } = await supabase
        .from('chave_config')
        .update({ modalidade_id: modalidadeId, num_teams: numTeams, seeds })
        .eq('id', existingId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('chave_config')
        .insert({ modalidade_id: modalidadeId, categoria, divisao, num_teams: numTeams, seeds })
      if (error) throw error
    }

    revalidatePath('/esportivo/chaveamento')
    revalidatePath('/placar')
  })
}

/**
 * Remove a configuração de seeds de uma chave.
 * Use com cuidado — desabilita a propagação automática de vencedores.
 */
export async function deleteChaveConfig(
  modalidadeId: string,
  categoria: string,
  divisao: string,
): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('chave_config')
      .delete()
      .eq('modalidade_id', modalidadeId)
      .eq('categoria', categoria)
      .eq('divisao', divisao)
    if (error) throw error
    revalidatePath('/esportivo/chaveamento')
  })
}
