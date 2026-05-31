/**
 * Parser dos resultados da planilha Google (CIA 2026).
 *
 * A planilha tem 1 aba por divisão/conferência. Cada aba é uma grade de BLOCOS
 * (um por modalidade+gênero), lado a lado. Cabeçalho de cada bloco:
 *   MOD · DIV/CONF · FASE · JOGO · ATLÉTICA · PLACAR · X · PLACAR · ATLÉTICA
 *
 * Casos especiais:
 *   - Pênaltis: PLACAR vem como "1 ( 4 )" → gol=1, pênaltis=4.
 *   - Vôlei/peteca: PLACAR é o nº de SETS ganhos.
 *   - "VENCEDOR JG N": jogo futuro (sem times reais) → ignorado.
 */

// ── MOD code → modalidade slug + categoria ───────────────────────────────────

const MOD_INFO: Record<string, { slug: string; categoria: 'Feminino' | 'Masculino' }> = {
  FF: { slug: 'futsal', categoria: 'Feminino' }, FM: { slug: 'futsal', categoria: 'Masculino' },
  FC: { slug: 'futebol', categoria: 'Masculino' },
  F7: { slug: 'fut7', categoria: 'Masculino' }, F7M: { slug: 'fut7', categoria: 'Masculino' }, F7F: { slug: 'fut7', categoria: 'Feminino' },
  BF: { slug: 'basquete', categoria: 'Feminino' }, BM: { slug: 'basquete', categoria: 'Masculino' },
  HF: { slug: 'handebol', categoria: 'Feminino' }, HM: { slug: 'handebol', categoria: 'Masculino' },
  VF: { slug: 'volei', categoria: 'Feminino' }, VM: { slug: 'volei', categoria: 'Masculino' },
  VPF: { slug: 'volei-praia', categoria: 'Feminino' }, VPM: { slug: 'volei-praia', categoria: 'Masculino' },
  PF: { slug: 'peteca', categoria: 'Feminino' }, PM: { slug: 'peteca', categoria: 'Masculino' },
  PETF: { slug: 'peteca', categoria: 'Feminino' }, PETM: { slug: 'peteca', categoria: 'Masculino' },
  TCF: { slug: 'tenis-campo', categoria: 'Feminino' }, TCM: { slug: 'tenis-campo', categoria: 'Masculino' },
  TMSF: { slug: 'tenis-mesa', categoria: 'Feminino' }, TMSM: { slug: 'tenis-mesa', categoria: 'Masculino' },
}

const SET_SLUGS = new Set(['volei', 'volei-praia', 'peteca'])

const FASE_MAP: Record<string, string> = {
  OF: 'oitavas', QF: 'quartas', SF: 'semifinal', F: 'final', '3L': '3lugar', '3': '3lugar',
}

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ResultadoPlanilha {
  aba:            string
  modCode:        string
  modalidadeSlug: string | null
  categoria:      'Feminino' | 'Masculino' | null
  fase:           string | null
  jogoNum:        number | null
  timeA:          string
  timeB:          string
  placarA:        number
  placarB:        number
  /** Pênaltis (futsal/futebol empatado). Null = sem disputa. */
  penA:           number | null
  penB:           number | null
  /** Vôlei/peteca → placar é em sets. */
  isSet:          boolean
}

// ── CSV → grade de células ───────────────────────────────────────────────────

/** Parser CSV mínimo com suporte a aspas e vírgulas dentro de campo. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (c === '\r') {
      // ignora
    } else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

// ── Parse de PLACAR ("2", "1 ( 4 )", "") ─────────────────────────────────────

interface PlacarCell { score: number | null; pen: number | null }

function parsePlacar(raw: string): PlacarCell {
  const t = (raw ?? '').trim()
  if (t === '') return { score: null, pen: null }
  // "1 ( 4 )" → score 1, pen 4 · "2" → score 2
  const m = t.match(/^(\d+)\s*(?:\(\s*(\d+)\s*\))?$/)
  if (!m) return { score: null, pen: null }
  return { score: parseInt(m[1], 10), pen: m[2] != null ? parseInt(m[2], 10) : null }
}

// ── Detecção de blocos + extração de resultados ──────────────────────────────

const isHeaderModCell = (cell: string): boolean => {
  const t = (cell ?? '').trim().toUpperCase()
  return t === 'MOD' || t.endsWith(' MOD')
}
const isVencedorPlaceholder = (nome: string): boolean =>
  /vencedor\s+jg/i.test(nome) || /perdedor\s+jg/i.test(nome) || nome.trim() === ''

/**
 * Extrai os resultados COMPLETOS (ambos placares preenchidos, times reais) de
 * uma aba. Detecta cada bloco pela célula de cabeçalho que termina em "MOD".
 */
export function parseAba(csv: string, aba: string): ResultadoPlanilha[] {
  const grid = parseCSV(csv)
  const out: ResultadoPlanilha[] = []

  for (let r = 0; r < grid.length; r++) {
    const rowCells = grid[r]
    for (let c = 0; c < rowCells.length; c++) {
      if (!isHeaderModCell(rowCells[c])) continue
      // Confirma que é cabeçalho: próxima coluna é DIV/CONF
      const next = (rowCells[c + 1] ?? '').trim().toUpperCase()
      if (next !== 'DIV' && next !== 'CONF') continue

      // Lê as linhas de dados abaixo, colunas c..c+8.
      for (let dr = r + 1; dr < grid.length; dr++) {
        const cells = grid[dr]
        const modRaw = (cells[c] ?? '').trim()
        if (modRaw === '' || isHeaderModCell(modRaw)) break  // fim do bloco

        const info = MOD_INFO[modRaw.toUpperCase()]
        const fase = FASE_MAP[(cells[c + 2] ?? '').trim().toUpperCase()] ?? null
        const jogoNum = parseInt((cells[c + 3] ?? '').trim(), 10)
        const timeA = (cells[c + 4] ?? '').trim()
        const timeB = (cells[c + 8] ?? '').trim()
        const pa = parsePlacar(cells[c + 5] ?? '')
        const pb = parsePlacar(cells[c + 7] ?? '')

        // Só importa jogo com times REAIS e AMBOS placares preenchidos.
        if (isVencedorPlaceholder(timeA) || isVencedorPlaceholder(timeB)) continue
        if (pa.score == null || pb.score == null) continue

        out.push({
          aba,
          modCode: modRaw.toUpperCase(),
          modalidadeSlug: info?.slug ?? null,
          categoria: info?.categoria ?? null,
          fase,
          jogoNum: Number.isNaN(jogoNum) ? null : jogoNum,
          timeA, timeB,
          placarA: pa.score, placarB: pb.score,
          penA: pa.pen, penB: pb.pen,
          isSet: info ? SET_SLUGS.has(info.slug) : false,
        })
      }
    }
  }
  return out
}
