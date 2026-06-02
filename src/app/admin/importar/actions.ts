'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { sincronizarTabelaJogosCore, type ImportStats } from '@/lib/planilha/jogos-sync-core'

export type SyncJogosResult =
  | { ok: true; stats: ImportStats }
  | { ok: false; error: string }

/**
 * Sincroniza a TABELA DE JOGOS direto da planilha mestre do Google (fonte da
 * verdade). Baixa o XLSX, parseia (TABELA DIA NN + JOGOS ADIANTADOS), faz
 * insert/dedup por confronto e carimba fase+bracket_num. Não usa overwrite —
 * confia no dedup, então é seguro rodar quantas vezes quiser.
 */
export async function sincronizarTabelaJogos(): Promise<SyncJogosResult> {
  const profile = await requireProfile()
  if (!['admin', 'coordenacao', 'coordenador_esportivo'].includes(profile.role)) {
    return { ok: false, error: 'Sem permissão para sincronizar a tabela de jogos.' }
  }

  const supabase = await createClient()
  const result = await sincronizarTabelaJogosCore(supabase, { overwrite: false })
  if (!result.ok) return { ok: false, error: result.error }

  // Invalida tudo que depende dos jogos.
  revalidatePath('/placar')
  revalidatePath('/esportivo')
  revalidatePath('/esportivo/chaveamento')
  revalidatePath('/esportivo/classificacao')
  revalidatePath('/cronograma')
  revalidatePath('/agenda')
  revalidateTag('lookup-dias', 'max')

  return { ok: true, stats: result.stats }
}
