'use server'

import { createClient } from '@/lib/supabase/server'
import { safe, requireSportEditor, type ActionResult } from '@/lib/admin/actions-helper'
import {
  buscarResultadosDasAbas, casarResultados, aplicarResultadoNoJogo,
  JOGO_SELECT_COLS, type JogoRow, type PreviewItem,
} from '@/lib/planilha/sync-core'

export type { PreviewItem }

// ── Buscar + casar (preview) ─────────────────────────────────────────────────

export async function buscarPreviewPlanilha(): Promise<
  ActionResult & { data?: { itens: PreviewItem[]; abasComErro: string[]; totalLidos: number } }
> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()

    const { data: jogosRaw } = await supabase.from('jogos').select(JOGO_SELECT_COLS)
    const jogos = (jogosRaw ?? []) as JogoRow[]

    const { resultados, abasComErro } = await buscarResultadosDasAbas()
    const itens = casarResultados(jogos, resultados)
    return { itens, abasComErro, totalLidos: resultados.length }
  })
}

// ── Aplicar resultados selecionados (manual) ─────────────────────────────────

export async function aplicarResultadosPlanilha(
  itens: PreviewItem[],
): Promise<ActionResult & { data?: { aplicados: number; erros: number } }> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    let aplicados = 0, erros = 0
    for (const it of itens) {
      const r = await aplicarResultadoNoJogo(supabase, it)
      if (r === 'aplicado') aplicados++
      else if (r === 'erro') erros++
    }
    return { aplicados, erros }
  })
}
