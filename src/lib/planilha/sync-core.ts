import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { canonTeamName, fuzzyMatchTeam } from '@/lib/chaveamento/bracket-builder'
import { propagarVencedorNaChave } from '@/lib/chaveamento/avanco'
import { parseAba, type ResultadoPlanilha } from './parse-resultados'

/** Cliente Supabase (server com sessão OU service no webhook). */
export type DbClient = Awaited<ReturnType<typeof createClient>>

// Planilha pública de resultados. Edite aqui se mudar.
export const SHEET_ID = '11JjjaVLMitlr185DOCQAYtDiq48Z7UOy'
export const ABAS = [
  '1ª Div', '2ª Div', 'ATHEMPURA', 'ALLURA', 'CYBER CITY',
  'ELDORADO', 'ESPETÁCULO', 'KAZURA', 'RANACH', 'URAH',
]

function gvizUrl(aba: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(aba)}`
}

/** Busca e parseia todas as abas da planilha. */
export async function buscarResultadosDasAbas(): Promise<{
  resultados: ResultadoPlanilha[]
  abasComErro: string[]
}> {
  const resultados: ResultadoPlanilha[] = []
  const abasComErro: string[] = []
  for (const aba of ABAS) {
    try {
      const resp = await fetch(gvizUrl(aba), { cache: 'no-store' })
      if (!resp.ok) { abasComErro.push(aba); continue }
      resultados.push(...parseAba(await resp.text(), aba))
    } catch {
      abasComErro.push(aba)
    }
  }
  return { resultados, abasComErro }
}

// ── Casamento resultado ↔ jogo ───────────────────────────────────────────────

export interface JogoRow {
  id: string
  modalidade_id: string | null
  categoria: string | null
  divisao: string | null
  fase: string | null
  status: string | null
  placar_a: number | null
  placar_b: number | null
  penaltis_a: number | null
  penaltis_b: number | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  modalidade: { slug: string } | { slug: string }[] | null
}

export interface PreviewItem {
  res:             ResultadoPlanilha
  jogoId:          string | null
  swapped:         boolean
  aplicA:          number
  aplicB:          number
  penAplicA:       number | null
  penAplicB:       number | null
  status:          'novo' | 'igual' | 'conflito' | 'sem_jogo' | 'ambiguo' | 'sem_modalidade'
  jogoLabel:       string | null
  jogoFase:        string | null
  jogoStatusAtual: string | null
  placarAtual:     string | null
}

const modSlug = (j: JogoRow): string | null => {
  const m = Array.isArray(j.modalidade) ? j.modalidade[0] : j.modalidade
  return m?.slug ?? null
}
const normCat = (c: string | null | undefined): string => (c ?? '').trim().toLowerCase()

function paresCasam(jA: string | null, jB: string | null, pA: string, pB: string): 'direto' | 'invertido' | null {
  const ja = canonTeamName(jA), jb = canonTeamName(jB)
  const pa = canonTeamName(pA), pb = canonTeamName(pB)
  const eq = (x: string, y: string) => !!x && !!y && (x === y || fuzzyMatchTeam(x, y))
  if (eq(ja, pa) && eq(jb, pb)) return 'direto'
  if (eq(ja, pb) && eq(jb, pa)) return 'invertido'
  return null
}

/** Casa cada resultado da planilha com um jogo do banco. */
export function casarResultados(jogos: JogoRow[], resultados: ResultadoPlanilha[]): PreviewItem[] {
  return resultados.map((res): PreviewItem => {
    const base = {
      res, jogoId: null, swapped: false,
      aplicA: res.placarA, aplicB: res.placarB,
      penAplicA: res.penA, penAplicB: res.penB,
      jogoLabel: null, jogoFase: null, jogoStatusAtual: null, placarAtual: null,
    }
    if (!res.modalidadeSlug) return { ...base, status: 'sem_modalidade' }

    const candidatos = jogos.filter(j =>
      modSlug(j) === res.modalidadeSlug && normCat(j.categoria) === normCat(res.categoria),
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
    const jaIgual =
      j.status === 'encerrado' && j.placar_a === aplicA && j.placar_b === aplicB &&
      (j.penaltis_a ?? null) === (penAplicA ?? null) && (j.penaltis_b ?? null) === (penAplicB ?? null)

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
}

export const JOGO_SELECT_COLS =
  'id, modalidade_id, categoria, divisao, fase, status, placar_a, placar_b, penaltis_a, penaltis_b, equipe_a_nome, equipe_b_nome, modalidade:modalidades(slug)'

/**
 * Aplica UM resultado no jogo (update + propagação na chave). Idempotente:
 * se já está igual, não faz nada. Usa o client recebido (server ou service).
 */
export async function aplicarResultadoNoJogo(
  supabase: DbClient,
  item: PreviewItem,
): Promise<'aplicado' | 'igual' | 'erro'> {
  if (!item.jogoId) return 'erro'
  if (item.status === 'igual') return 'igual'

  const update: Record<string, unknown> = {
    placar_a: item.aplicA,
    placar_b: item.aplicB,
    status: 'encerrado',
  }
  if (item.penAplicA != null && item.penAplicB != null) {
    update.penaltis_a = item.penAplicA
    update.penaltis_b = item.penAplicB
  }
  const { error } = await supabase.from('jogos').update(update).eq('id', item.jogoId)
  if (error) return 'erro'

  // Propaga o vencedor na chave usando o MESMO client (service no webhook).
  try { await propagarVencedorNaChave(item.jogoId, supabase) } catch { /* não bloqueia */ }
  return 'aplicado'
}
