'use server'

import { createClient } from '@/lib/supabase/server'
import { safe, requireSportEditor, type ActionResult } from '@/lib/admin/actions-helper'
import { canonTeamName, fuzzyMatchTeam } from '@/lib/chaveamento/bracket-builder'
import { parseAba, type ResultadoPlanilha } from '@/lib/planilha/parse-resultados'
import { lancarResultado } from '@/app/placar/actions'

// Planilha pública de resultados (Google Sheets). Editável aqui se mudar.
const SHEET_ID = '11JjjaVLMitlr185DOCQAYtDiq48Z7UOy'
const ABAS = [
  '1ª Div', '2ª Div', 'ATHEMPURA', 'ALLURA', 'CYBER CITY',
  'ELDORADO', 'ESPETÁCULO', 'KAZURA', 'RANACH', 'URAH',
]

function gvizUrl(aba: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(aba)}`
}

// ── Tipos do preview ─────────────────────────────────────────────────────────

export interface PreviewItem {
  res:          ResultadoPlanilha
  jogoId:       string | null
  swapped:      boolean          // ordem dos times invertida vs banco
  /** placar a aplicar JÁ na orientação do banco. */
  aplicA:       number
  aplicB:       number
  penAplicA:    number | null
  penAplicB:    number | null
  status:       'novo' | 'igual' | 'conflito' | 'sem_jogo' | 'ambiguo' | 'sem_modalidade'
  // contexto p/ exibição
  jogoLabel:    string | null    // "ENG UFMG × HUMANAS UFU"
  jogoFase:     string | null
  jogoStatusAtual: string | null
  placarAtual:  string | null
}

interface JogoRow {
  id: string
  modalidade_id: string | null
  categoria: string | null
  divisao: string | null
  fase: string | null
  status: string | null
  placar_a: number | null
  placar_b: number | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  modalidade: { slug: string } | { slug: string }[] | null
}

function modSlug(j: JogoRow): string | null {
  const m = Array.isArray(j.modalidade) ? j.modalidade[0] : j.modalidade
  return m?.slug ?? null
}

function normCat(c: string | null | undefined): string {
  return (c ?? '').trim().toLowerCase()
}

/** Casa o nome do par de times (fuzzy), retornando orientação. */
function paresCasam(
  jA: string | null, jB: string | null, pA: string, pB: string,
): 'direto' | 'invertido' | null {
  const ja = canonTeamName(jA), jb = canonTeamName(jB)
  const pa = canonTeamName(pA), pb = canonTeamName(pB)
  const eq = (x: string, y: string) => x === y || fuzzyMatchTeam(x, y)
  if (eq(ja, pa) && eq(jb, pb)) return 'direto'
  if (eq(ja, pb) && eq(jb, pa)) return 'invertido'
  return null
}

// ── Buscar + parsear + casar (preview) ───────────────────────────────────────

export async function buscarPreviewPlanilha(): Promise<
  ActionResult & { data?: { itens: PreviewItem[]; abasComErro: string[]; totalLidos: number } }
> {
  return safe(async () => {
    await requireSportEditor()
    const supabase = await createClient()

    // 1. Carrega jogos da edição (com slug da modalidade)
    const { data: jogosRaw } = await supabase
      .from('jogos')
      .select('id, modalidade_id, categoria, divisao, fase, status, placar_a, placar_b, equipe_a_nome, equipe_b_nome, modalidade:modalidades(slug)')
    const jogos = (jogosRaw ?? []) as JogoRow[]

    // 2. Busca e parseia cada aba
    const todos: ResultadoPlanilha[] = []
    const abasComErro: string[] = []
    for (const aba of ABAS) {
      try {
        const resp = await fetch(gvizUrl(aba), { cache: 'no-store' })
        if (!resp.ok) { abasComErro.push(aba); continue }
        const csv = await resp.text()
        todos.push(...parseAba(csv, aba))
      } catch {
        abasComErro.push(aba)
      }
    }

    // 3. Casa cada resultado com um jogo
    const itens: PreviewItem[] = todos.map((res): PreviewItem => {
      const base = {
        res, jogoId: null, swapped: false,
        aplicA: res.placarA, aplicB: res.placarB,
        penAplicA: res.penA, penAplicB: res.penB,
        jogoLabel: null, jogoFase: null, jogoStatusAtual: null, placarAtual: null,
      }
      if (!res.modalidadeSlug) return { ...base, status: 'sem_modalidade' }

      const candidatos = jogos.filter(j =>
        modSlug(j) === res.modalidadeSlug &&
        normCat(j.categoria) === normCat(res.categoria),
      )
      const casados: { j: JogoRow; orient: 'direto' | 'invertido' }[] = []
      for (const j of candidatos) {
        const orient = paresCasam(j.equipe_a_nome, j.equipe_b_nome, res.timeA, res.timeB)
        if (orient) casados.push({ j, orient })
      }

      if (casados.length === 0) return { ...base, status: 'sem_jogo' }
      if (casados.length > 1)  return { ...base, status: 'ambiguo' }

      const { j, orient } = casados[0]
      const swapped = orient === 'invertido'
      const aplicA = swapped ? res.placarB : res.placarA
      const aplicB = swapped ? res.placarA : res.placarB
      const penAplicA = swapped ? res.penB : res.penA
      const penAplicB = swapped ? res.penA : res.penB

      const placarAtual = (j.placar_a != null && j.placar_b != null) ? `${j.placar_a}×${j.placar_b}` : null
      const jaIgual = j.status === 'encerrado' && j.placar_a === aplicA && j.placar_b === aplicB

      return {
        ...base,
        jogoId: j.id, swapped, aplicA, aplicB, penAplicA, penAplicB,
        status: jaIgual ? 'igual' : (j.status === 'encerrado' ? 'conflito' : 'novo'),
        jogoLabel: `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
        jogoFase: j.fase,
        jogoStatusAtual: j.status,
        placarAtual,
      }
    })

    return { itens, abasComErro, totalLidos: todos.length }
  })
}

// ── Aplicar resultados selecionados ──────────────────────────────────────────

export interface AplicarItem {
  jogoId: string
  aplicA: number
  aplicB: number
  penAplicA: number | null
  penAplicB: number | null
  isSet: boolean
}

export async function aplicarResultadosPlanilha(
  itens: AplicarItem[],
): Promise<ActionResult & { data?: { aplicados: number; erros: number } }> {
  return safe(async () => {
    await requireSportEditor()
    let aplicados = 0, erros = 0
    for (const it of itens) {
      if (!it.jogoId) { erros++; continue }
      const opts: { penaltis_a?: number | null; penaltis_b?: number | null } = {}
      if (it.penAplicA != null && it.penAplicB != null) {
        opts.penaltis_a = it.penAplicA
        opts.penaltis_b = it.penAplicB
      }
      const r = await lancarResultado(it.jogoId, it.aplicA, it.aplicB, opts)
      if (r.ok) aplicados++
      else erros++
    }
    return { aplicados, erros }
  })
}
