/**
 * Builder do bracket single-elimination — port direto da lógica oficial
 * (Anexo III do regulamento CIA).
 *
 * `buildGames(numTeams)` retorna a lista canônica de jogos da chave com:
 *   - id (identificador único do slot na chave)
 *   - num (JOGO N, numeração oficial)
 *   - round ('oitava'|'quarta'|'semi'|'final')
 *   - quad (Q1|Q2|Q3|Q4) — quadrante onde o jogo fica
 *   - half ('sup'|'inf') — em oitavas, qual colchete
 *   - slots[2] — cada slot tem:
 *       - type: 'direct' (vaga preenchida pelo sorteio com Posição N)
 *             | 'feeder' (vaga preenchida pelo vencedor de outro jogo)
 *       - pos:    número da posição (1..N) quando direct
 *       - gameId: id do jogo cujo vencedor preenche (quando feeder)
 *
 * As regras de eliminação de colchetes seguem Art. 5 do regulamento:
 *   - n < 16: extingue colchetes superiores (sentido horário Q1→Q4)
 *   - n < 12: extingue colchetes inferiores (sentido anti-horário Q4→Q1)
 *   - n < 8:  extingue quartas (sentido horário)
 *   - n < 4:  extingue semis (Q1-Q4 primeiro, depois Q2-Q3)
 */

export type Round = 'oitava' | 'quarta' | 'semi' | 'final'
export type Quad = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type Half = 'sup' | 'inf'

export interface BracketSlot {
  type:   'direct' | 'feeder'
  pos?:   number       // 1..N, se direct
  gameId?: string      // referência ao game cujo vencedor preenche, se feeder
}

export interface BracketGame {
  id:    string
  num:   number
  round: Round
  quad?: Quad
  half?: Half
  side?: 'L' | 'R'
  slots: [BracketSlot, BracketSlot]
}

interface Layout {
  oitavas: Record<string, boolean>  // 'Q1sup','Q1inf',...
  quartas: Record<Quad, boolean>
  semis:   { L: boolean; R: boolean }
}

function getLayout(n: number): Layout {
  const L: Layout = {
    oitavas: { Q1sup:true,Q1inf:true,Q2sup:true,Q2inf:true,Q3sup:true,Q3inf:true,Q4sup:true,Q4inf:true },
    quartas: { Q1:true,Q2:true,Q3:true,Q4:true },
    semis:   { L:true,R:true },
  }
  // Phase 1: extingue colchetes superiores (n=15..12)
  const supOrder = ['Q1sup','Q2sup','Q3sup','Q4sup'] as const
  for (let i = 0; i < Math.min(Math.max(0, 16-n), 4); i++) L.oitavas[supOrder[i]] = false
  // Phase 2: extingue colchetes inferiores (n=11..8)
  if (n <= 11) {
    const infOrder = ['Q4inf','Q3inf','Q2inf','Q1inf'] as const
    for (let i = 0; i < Math.min(12-n, 4); i++) L.oitavas[infOrder[i]] = false
  }
  // Phase 3: extingue quartas (n=7..4)
  if (n <= 7) {
    const qOrder: Quad[] = ['Q1','Q2','Q3','Q4']
    for (let i = 0; i < Math.min(8-n, 4); i++) L.quartas[qOrder[i]] = false
  }
  // Phase 4: extingue semis
  if (n <= 3) L.semis.L = false
  if (n <= 2) L.semis.R = false
  return L
}

const oitavaId = (q: Quad, h: Half) => `o_${q}_${h}`
const quartaId = (q: Quad) => `q_${q}`

export function buildGames(numTeams: number): BracketGame[] {
  const L = getLayout(numTeams)
  const games: BracketGame[] = []

  // Oitavas
  const oitavaDefs: Array<{ quad: Quad; half: Half; side: 'L'|'R' }> = [
    { quad:'Q1', half:'sup', side:'L' }, { quad:'Q1', half:'inf', side:'L' },
    { quad:'Q4', half:'sup', side:'L' }, { quad:'Q4', half:'inf', side:'L' },
    { quad:'Q2', half:'sup', side:'R' }, { quad:'Q2', half:'inf', side:'R' },
    { quad:'Q3', half:'sup', side:'R' }, { quad:'Q3', half:'inf', side:'R' },
  ]
  for (const d of oitavaDefs) {
    if (L.oitavas[d.quad + d.half]) {
      games.push({
        id: oitavaId(d.quad, d.half), num: 0, round: 'oitava',
        quad: d.quad, half: d.half, side: d.side,
        slots: [{ type:'direct' }, { type:'direct' }],
      })
    }
  }

  // Quartas (ordem Q1, Q4, Q2, Q3 — usada na numeração)
  for (const q of (['Q1','Q4','Q2','Q3'] as Quad[])) {
    if (L.quartas[q]) {
      const top: BracketSlot = L.oitavas[q+'sup']
        ? { type:'feeder', gameId: oitavaId(q, 'sup') }
        : { type:'direct' }
      const bot: BracketSlot = L.oitavas[q+'inf']
        ? { type:'feeder', gameId: oitavaId(q, 'inf') }
        : { type:'direct' }
      const side: 'L'|'R' = (q === 'Q1' || q === 'Q4') ? 'L' : 'R'
      games.push({ id: quartaId(q), num: 0, round: 'quarta', quad: q, side, slots: [top, bot] })
    }
  }

  // Semis
  if (L.semis.L) {
    const top: BracketSlot = L.quartas.Q1 ? { type:'feeder', gameId: quartaId('Q1') } : { type:'direct' }
    const bot: BracketSlot = L.quartas.Q4 ? { type:'feeder', gameId: quartaId('Q4') } : { type:'direct' }
    games.push({ id:'semL', num:0, round:'semi', side:'L', slots: [top, bot] })
  }
  if (L.semis.R) {
    const top: BracketSlot = L.quartas.Q2 ? { type:'feeder', gameId: quartaId('Q2') } : { type:'direct' }
    const bot: BracketSlot = L.quartas.Q3 ? { type:'feeder', gameId: quartaId('Q3') } : { type:'direct' }
    games.push({ id:'semR', num:0, round:'semi', side:'R', slots: [top, bot] })
  }

  // Final
  const finalTop: BracketSlot = L.semis.L
    ? { type:'feeder', gameId:'semL' }
    : (L.quartas.Q1 ? { type:'feeder', gameId: quartaId('Q1') } : { type:'direct' })
  const finalBot: BracketSlot = L.semis.R
    ? { type:'feeder', gameId:'semR' }
    : (L.quartas.Q2 ? { type:'feeder', gameId: quartaId('Q2') } : { type:'direct' })
  games.push({ id:'final', num:0, round:'final', slots: [finalTop, finalBot] })

  // Posição assignment: do centro para as bordas, ciclando Q1→Q2→Q3→Q4
  let posCounter = 1
  const assignIfDirect = (gameId: string, slotIdx: 0 | 1) => {
    const g = games.find(x => x.id === gameId)
    if (g && g.slots[slotIdx].type === 'direct' && g.slots[slotIdx].pos === undefined) {
      g.slots[slotIdx].pos = posCounter++
    }
  }
  // L0: final direct (apenas quando semis foram removidos)
  assignIfDirect('final', 0); assignIfDirect('final', 1)
  // L1: semi direct (ciclo Q1, Q2, Q3, Q4)
  assignIfDirect('semL', 0); assignIfDirect('semR', 0)
  assignIfDirect('semR', 1); assignIfDirect('semL', 1)
  // L2: quartas direct top
  for (const q of ['Q1','Q2','Q3','Q4'] as Quad[]) assignIfDirect(quartaId(q), 0)
  // L3: quartas direct bot
  for (const q of ['Q1','Q2','Q3','Q4'] as Quad[]) assignIfDirect(quartaId(q), 1)
  // L4-L7: oitavas direct (sup/inf top/bot)
  for (const q of ['Q1','Q2','Q3','Q4'] as Quad[]) assignIfDirect(oitavaId(q,'sup'), 0)
  for (const q of ['Q1','Q2','Q3','Q4'] as Quad[]) assignIfDirect(oitavaId(q,'inf'), 0)
  for (const q of ['Q1','Q2','Q3','Q4'] as Quad[]) assignIfDirect(oitavaId(q,'sup'), 1)
  for (const q of ['Q1','Q2','Q3','Q4'] as Quad[]) assignIfDirect(oitavaId(q,'inf'), 1)

  // Numeração JOGO N (oitavas Q1,Q4,Q2,Q3 sup→inf, quartas idem, semiL, semiR, final)
  let n = 1
  for (const q of ['Q1','Q4','Q2','Q3'] as Quad[]) {
    for (const h of ['sup','inf'] as Half[]) {
      const g = games.find(x => x.id === oitavaId(q,h))
      if (g) g.num = n++
    }
  }
  for (const q of ['Q1','Q4','Q2','Q3'] as Quad[]) {
    const g = games.find(x => x.id === quartaId(q))
    if (g) g.num = n++
  }
  for (const key of ['semL','semR','final']) {
    const g = games.find(x => x.id === key)
    if (g) g.num = n++
  }

  return games
}

/**
 * Normaliza nome de equipe (upper + trim + remover acentos)
 * Usado pra matchear DB equipe_a_nome com seed name.
 */
export function normTeamName(s: string | null | undefined): string {
  if (!s) return ''
  const stripped = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
  return stripped
}

/**
 * Aliases conhecidos (XLSX → bracket-site canonical).
 * Aplicado em ambos os lados pra match robusto.
 */
const ALIASES: Record<string, string> = {
  'MED UFMG':            'MEDICINA UFMG',
  'ENG UFU':             'ENGENHARIA UFU',
  'ECONO UNICAMP':       'ECONOMIA UNICAMP',
  'RAIVOSA':             'LAAUUFJ RAIVOSA',
  'LAAUFJ - RAIVOSA':    'LAAUUFJ RAIVOSA',
  'X 10 DE OUTUBRO':     'X DE OUTUBRO',
  'XV SETEMBRO':         'XV DE SETEMBRO',
  'TOUROS PUC':          'TOURO PUC',
}

export function canonTeamName(s: string | null | undefined): string {
  const n = normTeamName(s)
  return ALIASES[n] ?? n
}
