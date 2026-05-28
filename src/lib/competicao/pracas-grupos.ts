/**
 * Agrupa praças por "local físico" — várias quadras numeradas
 * (CEMEA 01, CEMEA 02…) representam o MESMO lugar (CEMEA).
 *
 * Detecção pelo prefixo numérico no nome: `^(.+?)\s*(\d{1,3})$`
 * - "CEMEA 01" → prefixo "CEMEA", número "01"
 * - "TOCA OU UIC" → solo (sem número)
 *
 * Usado no Hub Esportivo (cards agrupados) e no perfil
 * /esportivo/pracas/[slug] (lista detalhada das quadras).
 */

import type { PracaStats } from './pracas'

export interface QuadraDoLocal extends PracaStats {
  /** Número da quadra dentro do local, padronizado "01", "02" etc. Null se solo. */
  numero: string | null
}

export interface LocalAgrupado {
  /** Slug do local — normalizado pra URL (ex: "cemea"). */
  slug: string
  /** Nome do local exibido (ex: "CEMEA"). */
  nome: string
  /** Cor agregada (primeira quadra com cor definida). */
  cor: string | null
  /** Quantas quadras compõem o local. */
  numQuadras: number
  /** Soma de jogos totais. */
  totalJogos: number
  encerrados:  number
  aoVivo:      number
  agendados:   number
  /** Quadras individuais ordenadas pela numeração. */
  quadras:     QuadraDoLocal[]
  /** Modalidades únicas no local (consolidadas). */
  modalidades: Array<{ nome: string; icone: string | null; count: number }>
  /** Atléticas únicas no local (consolidadas). */
  atleticas:   Array<{ id: string; nome: string; slug: string; cor: string | null; jogos: number }>
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseNome(nome: string): { prefix: string; numero: string | null } {
  const match = nome.match(/^(.+?)\s*(\d{1,3})$/)
  if (!match) return { prefix: nome.trim(), numero: null }
  return { prefix: match[1].trim(), numero: match[2].padStart(2, '0') }
}

/** Slug pra URL: minúsculas, sem acento, dash em vez de espaço. */
export function slugifyLocal(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Agrupamento ─────────────────────────────────────────────────────────────

export function groupPracasByLocal(pracas: PracaStats[]): LocalAgrupado[] {
  const map = new Map<string, LocalAgrupado>()

  for (const p of pracas) {
    const { prefix, numero } = parseNome(p.nome)
    const slug = slugifyLocal(prefix)

    if (!map.has(slug)) {
      map.set(slug, {
        slug, nome: prefix, cor: p.cor,
        numQuadras: 0,
        totalJogos: 0, encerrados: 0, aoVivo: 0, agendados: 0,
        quadras: [], modalidades: [], atleticas: [],
      })
    }

    const local = map.get(slug)!
    if (!local.cor && p.cor) local.cor = p.cor
    local.numQuadras++
    local.totalJogos += p.totalJogos
    local.encerrados += p.encerrados
    local.aoVivo     += p.aoVivo
    local.agendados  += p.agendados
    local.quadras.push({ ...p, numero })
  }

  // Consolida modalidades e atléticas únicas por local
  for (const local of map.values()) {
    // Ordena quadras: numeradas por número crescente; soltas por nome
    local.quadras.sort((a, b) => {
      if (a.numero && b.numero) return Number(a.numero) - Number(b.numero)
      if (a.numero) return -1
      if (b.numero) return 1
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })

    // Modalidades agregadas
    const modMap = new Map<string, { nome: string; icone: string | null; count: number }>()
    for (const q of local.quadras) {
      for (const m of q.modalidades) {
        const cur = modMap.get(m.nome) ?? { nome: m.nome, icone: m.icone, count: 0 }
        cur.count += m.count
        modMap.set(m.nome, cur)
      }
    }
    local.modalidades = [...modMap.values()].sort((a, b) => b.count - a.count)

    // Atléticas agregadas
    const atlMap = new Map<string, { id: string; nome: string; slug: string; cor: string | null; jogos: number }>()
    for (const q of local.quadras) {
      for (const a of q.atleticas) {
        const cur = atlMap.get(a.id) ?? { id: a.id, nome: a.nome, slug: a.slug, cor: a.cor, jogos: 0 }
        cur.jogos += a.jogos
        atlMap.set(a.id, cur)
      }
    }
    local.atleticas = [...atlMap.values()].sort((a, b) => b.jogos - a.jogos)
  }

  return [...map.values()].sort((a, b) =>
    b.totalJogos - a.totalJogos ||
    a.nome.localeCompare(b.nome, 'pt-BR'),
  )
}

/** Reverso: dado um slug, retorna o LocalAgrupado correspondente. */
export function findLocalBySlug(pracas: PracaStats[], slug: string): LocalAgrupado | null {
  const all = groupPracasByLocal(pracas)
  return all.find(l => l.slug === slug) ?? null
}
