'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSportEditor, safe, type ActionResult } from '@/lib/admin/actions-helper'
import { logError } from '@/lib/observability/log-error'
import { detectConcurrentEdit } from '@/lib/competicao/concurrent-edit'
import { propagarVencedorNaChave, recalcularChave, vincularEquipesNaChave } from '@/lib/chaveamento/avanco'
import {
  buscarResultadosDasAbas, casarResultados, aplicarResultadoNoJogo,
  JOGO_SELECT_COLS, type JogoRow,
} from '@/lib/planilha/sync-core'

// Helper: invalida cache da home quando dados estáticos do evento mudam.
// updateTag = revalidateTag mas com read-your-own-writes (Next 16+).
function bustHomeCache() {
  updateTag('home-static-event-data')
}

// Sanitiza placar: inteiro >= 0 e teto defensivo (evita valor absurdo via
// requisição forjada). O client já clampa, mas o server precisa também.
function clampPlacar(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(999, Math.floor(n)))
}

export async function setJogoAoVivo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ status: 'ao_vivo' })
      .eq('id', id)
    if (error) throw error
    // Marca o horário do 1º "ao vivo" (não sobrescreve em reativação) — base da
    // tag de atraso/antecipação pra Coordenação Esportiva.
    await supabase
      .from('jogos')
      .update({ ao_vivo_em: new Date().toISOString() })
      .eq('id', id)
      .is('ao_vivo_em', null)
    revalidatePath('/placar')
    bustHomeCache()
  })
}

export async function encerrarJogo(id: string): Promise<ActionResult> {
  try {
    await requireSportEditor()
    const supabase = await createClient()

    // Detecção SOFT de edição concorrente — avisa se outro coord editou
    // este jogo nos últimos 3s.
    const concurrent = await detectConcurrentEdit(id, supabase)

    // GUARD: só encerra se NÃO estava encerrado. Evita dupla-propagação
    // quando 2 coords clicam "Encerrar" no mesmo jogo (UI defasada).
    // .select() retorna [] se nenhuma linha bateu o filtro → já encerrado.
    const { data: changed, error } = await supabase
      .from('jogos')
      .update({ status: 'encerrado' })
      .eq('id', id)
      .neq('status', 'encerrado')
      .select('id')
    if (error) throw error

    // Já estava encerrado: no-op idempotente, não re-propaga.
    if (!changed || changed.length === 0) {
      revalidatePath('/placar')
      return { ok: true }
    }

    // Propaga vencedor pro próximo jogo da chave. Falha NÃO bloqueia
    // mas retorna warning pro client mostrar toast amarelo + "Recalcular".
    let warning: string | undefined = concurrent.warning
    try {
      const result = await propagarVencedorNaChave(id)
      if (!result.ok && result.reason !== 'ja-e-final') {
        console.warn('[encerrarJogo] propagação falhou:', result.reason, { jogoId: id })
        warning = warning ?? `Jogo encerrado, mas o vencedor não avançou na chave (${result.reason}). Clique RECALCULAR no chaveamento.`
      }
    } catch (err) {
      logError(err, { action: 'encerrarJogo:propagacao', extra: { jogoId: id } })
      warning = warning ?? 'Jogo encerrado, mas falhou propagação na chave. Use RECALCULAR.'
    }
    revalidatePath('/placar')
    bustHomeCache()
    revalidatePath('/esportivo/chaveamento')
    return { ok: true, warning }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao encerrar.'
    logError(e, { action: 'encerrarJogo', extra: { jogoId: id } })
    return { ok: false, error: msg }
  }
}

/**
 * Encerra um jogo de gol corrido (futsal/futebol) empatado no tempo normal,
 * registrando o placar da disputa de pênaltis. O vencedor (maior nº de pênaltis)
 * avança na chave. Exige penA != penB — disputa de pênaltis sempre tem vencedor.
 */
export async function encerrarComPenaltis(
  id: string,
  penA: number,
  penB: number,
): Promise<ActionResult> {
  try {
    await requireSportEditor()
    const pa = clampPlacar(penA)
    const pb = clampPlacar(penB)
    if (pa === pb) {
      return { ok: false, error: 'A disputa de pênaltis precisa ter um vencedor (placares diferentes).' }
    }
    const supabase = await createClient()
    const concurrent = await detectConcurrentEdit(id, supabase)

    // Guard idempotente: só encerra se não estava encerrado (evita dupla-propagação).
    const { data: changed, error } = await supabase
      .from('jogos')
      .update({ penaltis_a: pa, penaltis_b: pb, status: 'encerrado' })
      .eq('id', id)
      .neq('status', 'encerrado')
      .select('id')
    if (error) throw error

    // Já encerrado: atualiza só os pênaltis (correção), sem re-propagar do zero.
    if (!changed || changed.length === 0) {
      await supabase.from('jogos').update({ penaltis_a: pa, penaltis_b: pb }).eq('id', id)
    }

    let warning: string | undefined = concurrent.warning
    try {
      const result = await propagarVencedorNaChave(id)
      if (!result.ok && result.reason !== 'ja-e-final') {
        warning = warning ?? `Pênaltis registrados, mas o vencedor não avançou na chave (${result.reason}). Clique SINCRONIZAR no chaveamento.`
      }
    } catch (err) {
      logError(err, { action: 'encerrarComPenaltis:propagacao', extra: { jogoId: id } })
      warning = warning ?? 'Pênaltis registrados, mas falhou a propagação na chave. Use SINCRONIZAR.'
    }
    revalidatePath('/placar')
    bustHomeCache()
    revalidatePath('/esportivo/chaveamento')
    revalidatePath('/central')
    return { ok: true, warning }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao registrar pênaltis.'
    logError(e, { action: 'encerrarComPenaltis', extra: { jogoId: id } })
    return { ok: false, error: msg }
  }
}

export async function atualizarPlacar(
  id: string,
  placar_a: number,
  placar_b: number,
): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ placar_a: clampPlacar(placar_a), placar_b: clampPlacar(placar_b) })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
    bustHomeCache()
  })
}

/**
 * Lança o resultado final direto: define placar e encerra o jogo numa só ação.
 * Para quadras sem operador ao vivo — a coord só registra o placar final.
 */
export async function lancarResultado(
  id: string,
  placar_a: number,
  placar_b: number,
  opts?: {
    /** Pontos por set (vôlei/peteca): [{a,b}, ...]. placar_a/b = sets ganhos. */
    sets?: { a: number; b: number }[]
    /** Desempate por pênaltis (futsal/futebol empatado no mata-mata). */
    penaltis_a?: number | null
    penaltis_b?: number | null
  },
): Promise<ActionResult> {
  try {
    await requireSportEditor()
    const supabase = await createClient()

    const concurrent = await detectConcurrentEdit(id, supabase)

    const update: Record<string, unknown> = {
      placar_a: clampPlacar(placar_a),
      placar_b: clampPlacar(placar_b),
      status: 'encerrado',
    }
    if (opts?.sets && opts.sets.length > 0) {
      update.sets = opts.sets.map(s => ({ a: clampPlacar(s.a), b: clampPlacar(s.b) }))
    }
    if (opts?.penaltis_a != null && opts?.penaltis_b != null) {
      update.penaltis_a = clampPlacar(opts.penaltis_a)
      update.penaltis_b = clampPlacar(opts.penaltis_b)
    }

    const { error } = await supabase
      .from('jogos')
      .update(update)
      .eq('id', id)
    if (error) throw error

    let warning: string | undefined = concurrent.warning
    try {
      const result = await propagarVencedorNaChave(id)
      if (!result.ok && result.reason !== 'ja-e-final') {
        console.warn('[lancarResultado] propagação falhou:', result.reason, { jogoId: id })
        warning = warning ?? `Resultado lançado, mas o vencedor não avançou na chave (${result.reason}). Use RECALCULAR no chaveamento.`
      }
    } catch (err) {
      logError(err, { action: 'lancarResultado:propagacao', extra: { jogoId: id } })
      warning = warning ?? 'Resultado lançado, mas falhou propagação na chave. Use RECALCULAR.'
    }
    revalidatePath('/placar')
    bustHomeCache()
    revalidatePath('/esportivo/chaveamento')
    return { ok: true, warning }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao lançar resultado.'
    logError(e, { action: 'lancarResultado', extra: { jogoId: id, placar_a, placar_b } })
    return { ok: false, error: msg }
  }
}

export async function cancelarJogo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ status: 'cancelado' })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
    bustHomeCache()
  })
}

export async function criarJogoTeste(diaId: string): Promise<ActionResult & { data?: { id: string } }> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('jogos')
      .insert({
        equipe_a_nome: 'Equipe Alfa',
        equipe_b_nome: 'Equipe Beta',
        status: 'agendado',
        dia_id: diaId,
        placar_a: 0,
        placar_b: 0,
        teste: true,
      })
      .select('id')
      .single()
    if (error) throw error
    revalidatePath('/placar')
    bustHomeCache()
    return data as { id: string }
  })
}

export async function reativarJogo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ status: 'agendado', placar_a: null, placar_b: null, wo: null })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
    bustHomeCache()
  })
}

/**
 * Declara W.O. (Walkover) num jogo — Art. 58-65 do regulamento.
 *
 * Efeitos:
 *  • Marca `jogos.wo` = 'a' | 'b' | 'duplo' (lado que NÃO compareceu)
 *  • Encerra o jogo (`status = 'encerrado'`)
 *  • Mantém o placar atual — `wo` é a fonte de verdade para apuração
 *
 * Penalidades (-13 pts + posição vaga) são aplicadas pela camada de leitura
 * via `derivarColocacao()` em `lib/competicao/queries.ts`. Esta função apenas
 * marca a flag — o ranking é recalculado on-the-fly.
 *
 * Reversível via `removerWO(id)` em caso de erro do mesário.
 */
export async function declararWO(
  id: string,
  lado: 'a' | 'b' | 'duplo',
): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    if (!['a', 'b', 'duplo'].includes(lado)) {
      throw new Error(`Lado inválido: ${lado}`)
    }
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ wo: lado, status: 'encerrado' })
      .eq('id', id)
    if (error) throw error
    // Propaga vencedor (W.O. simples) pra próxima fase. W.O. duplo não propaga.
    if (lado !== 'duplo') {
      try {
        const result = await propagarVencedorNaChave(id)
        if (!result.ok) {
          console.warn('[declararWO] propagação falhou:', result.reason, { jogoId: id })
        }
      } catch (err) {
        logError(err, { action: 'declararWO:propagacao', extra: { jogoId: id, lado } })
      }
    }
    revalidatePath('/placar')
    bustHomeCache()
    revalidatePath('/esportivo/chaveamento')
  })
}

/**
 * Remove a marcação de W.O. — para corrigir erro do mesário.
 * Mantém o status como 'encerrado'; ajuste manual se precisar reabrir.
 */
export async function removerWO(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { error } = await supabase
      .from('jogos')
      .update({ wo: null })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/placar')
    bustHomeCache()
  })
}

/**
 * Registra um evento de jogo (gol, cartão, ace, set, etc).
 * NÃO mexe no placar — eventos são puro registro histórico.
 * O placar é controlado manualmente via botões +/- (atualizarPlacar).
 */
export async function registrarEvento(
  jogoId: string,
  tipo: string,
  equipe: 'a' | 'b',
): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const TIPOS_VALIDOS = [
      // Pontos / gols (registro histórico)
      'gol', 'cesta_2', 'cesta_3', 'lance_livre', 'ace', 'bloqueio', 'set_ganho',
      // Disciplinares
      'cartao_amarelo', 'cartao_vermelho', 'falta', 'falta_tecnica', 'exclusao', 'penalti',
      // Estratégicos
      'timeout',
    ]
    if (!TIPOS_VALIDOS.includes(tipo)) throw new Error(`Tipo inválido: ${tipo}`)

    const supabase = await createClient()

    // Dedup defensivo: evento idêntico (jogo+tipo+equipe) nos últimos 1.5s
    // é provavelmente double-click. No-op silencioso.
    const since = new Date(Date.now() - 1500).toISOString()
    const { data: recent } = await supabase
      .from('eventos_jogo')
      .select('id')
      .eq('jogo_id', jogoId)
      .eq('tipo', tipo)
      .eq('equipe', equipe)
      .gte('criado_em', since)
      .limit(1)
    if (recent && recent.length > 0) {
      return // duplicado — ignora
    }

    const { error } = await supabase
      .from('eventos_jogo')
      .insert({ jogo_id: jogoId, tipo, equipe })
    if (error) throw error
    revalidatePath('/placar')
    bustHomeCache()
  })
}

/**
 * Fecha um set (vôlei / vôlei de praia / peteca): registra o set_ganho
 * para o vencedor E zera o placar de pontos pro próximo set.
 */
export async function fecharSet(
  jogoId: string,
  vencedor: 'a' | 'b',
): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()

    // Dedup CRÍTICO: double-click fecharia 2 sets, corrompendo o resultado
    // (melhor-de-3 com contagem errada). Janela de 3s — fechar 2 sets reais
    // em 3s é impossível.
    const since = new Date(Date.now() - 3000).toISOString()
    const { data: recentSet } = await supabase
      .from('eventos_jogo')
      .select('id')
      .eq('jogo_id', jogoId)
      .eq('tipo', 'set_ganho')
      .gte('criado_em', since)
      .limit(1)
    if (recentSet && recentSet.length > 0) {
      return // double-click — set já foi fechado
    }

    const { error: evErr } = await supabase
      .from('eventos_jogo')
      .insert({ jogo_id: jogoId, tipo: 'set_ganho', equipe: vencedor })
    if (evErr) throw evErr
    const { error: plErr } = await supabase
      .from('jogos')
      .update({ placar_a: 0, placar_b: 0 })
      .eq('id', jogoId)
    if (plErr) throw plErr
    revalidatePath('/placar')
    bustHomeCache()
  })
}

/**
 * Remove um evento de jogo — para corrigir registro errado.
 * Nota: não reverte o placar automaticamente (use os botões +/- para isso).
 */
export async function removerEvento(eventoId: string): Promise<ActionResult> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()
    const { error } = await supabase
      .from('eventos_jogo')
      .delete()
      .eq('id', eventoId)
    if (error) throw error
    revalidatePath('/placar')
    bustHomeCache()
  })
}

/**
 * Reprocessa toda a propagação de uma chave (modalidade + categoria + divisão).
 * Útil pra:
 *  - Importou resultados em lote sem disparar avanço
 *  - Declarou WO/encerrou jogos antes da função de avanço existir
 *  - Quer revalidar a chave inteira
 *
 * Roda em ordem oitavas → quartas → semifinal → final, em loop idempotente.
 */
export async function recalcularChaveAction(
  modalidadeSlug: string,
  categoria: string | null,
  divisao: string,
): Promise<ActionResult & { data?: { total: number; propagados: number; pulados: number; errors: number; vinculados: number; naoResolvidos: string[] } }> {
  return safe(async () => {
    await requireSportEditor()
    // 1) Vincula equipe_nome → equipe_id (conserta apuração/previsão de jogos importados).
    const vinculo = await vincularEquipesNaChave(modalidadeSlug, categoria, divisao)
    // 2) Recalcula a chave — propaga vencedores e CRIA as fases seguintes faltantes.
    const result = await recalcularChave(modalidadeSlug, categoria, divisao)
    revalidatePath('/placar')
    bustHomeCache()
    revalidatePath('/esportivo/chaveamento')
    revalidatePath('/esportivo/classificacao')
    return {
      total:         vinculo.total,
      propagados:    result.propagados,
      pulados:       result.pulados,
      errors:        result.errors.length,
      vinculados:    vinculo.vinculados,
      naoResolvidos: vinculo.naoResolvidos,
    }
  })
}

/**
 * Sincroniza AGORA com a planilha pública: lê os resultados, casa com os jogos
 * e aplica os de casamento único (novos ou que mudaram), propagando a chave.
 * Botão "Sincronizar planilha" no placar. Mesma lógica do webhook realtime.
 */
export async function sincronizarPlanilhaAgora(): Promise<
  ActionResult & { data?: { lidos: number; aplicados: number; jaIguais: number; semCasar: number; ambiguos: number; erros: number; naoCasados: string[] } }
> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()

    const { data: jogosRaw } = await supabase.from('jogos').select(JOGO_SELECT_COLS)
    const jogos = (jogosRaw ?? []) as JogoRow[]

    const { resultados } = await buscarResultadosDasAbas()
    const itens = casarResultados(jogos, resultados)

    let aplicados = 0, jaIguais = 0, semCasar = 0, ambiguos = 0, erros = 0
    const naoCasados: string[] = []
    for (const it of itens) {
      if (it.status === 'sem_jogo' || it.status === 'sem_modalidade' || it.status === 'ambiguo') {
        if (it.status === 'ambiguo') ambiguos++; else semCasar++
        const motivo = it.status === 'ambiguo' ? 'ambíguo' : it.status === 'sem_modalidade' ? 'modalidade?' : 'sem jogo'
        naoCasados.push(`${it.res.timeA} ${it.res.placarA}×${it.res.placarB} ${it.res.timeB} · ${it.res.modalidadeLabel} · ${it.res.aba} (${motivo})`)
        continue
      }
      if (it.status === 'igual') { jaIguais++; continue }
      const r = await aplicarResultadoNoJogo(supabase, it)
      if (r === 'aplicado') aplicados++
      else if (r === 'erro') erros++
      else jaIguais++
    }

    revalidatePath('/placar')
    bustHomeCache()
    revalidatePath('/esportivo/chaveamento')
    revalidatePath('/esportivo/classificacao')
    revalidatePath('/central')
    return { lidos: resultados.length, aplicados, jaIguais, semCasar, ambiguos, erros, naoCasados }
  })
}
