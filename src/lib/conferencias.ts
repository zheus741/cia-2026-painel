/**
 * Identidade visual das 8 conferências da Divisão de Acesso da CIA 2026.
 *
 * Cada conferência tem 8 vagas (8 × 8 = 64 atléticas). Os campeões de cada
 * uma se classificam para a fase final — chamada "Super 8" (sem zero) no
 * regulamento — que define os 4 acessos para a 2ª Divisão de 2027.
 *
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  DIVISÕES (3 buckets) vs FASE Super 8 (playoff)                    │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │  1ª Divisão  → 16 atléticas (Elite)                                │
 *   │  2ª Divisão  → 16 atléticas (mesmo modelo da 1ª, top 3 sobem)      │
 *   │  Super 08    → 64 atléticas em 8 conferências (Divisão de Acesso)  │
 *   │                                                                    │
 *   │  Super 8 (sem zero) → playoff entre os 8 campeões de conferência.  │
 *   │                       Liga de 7 rodadas; top 4 sobem para a 2ª.    │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Naming pragmático (importante):
 *   • DB: `equipes.divisao = 'Super 08'` (com zero) → bucket dos 64 times
 *   • DB: tabela `super8_liga`            (sem zero) → playoff das 8 campeãs
 *
 * Cores foram escolhidas com contraste alto sobre o fundo escuro do tema (#0A1410)
 * e diferenciação clara entre conferências. Ajustes são triviais — basta editar
 * este arquivo.
 */

export type ConferenciaNome =
  | 'ALLURA'
  | 'KAZURA'
  | 'CYBER CITY'
  | 'ESPETÁCULO'
  | 'ELDORADO'
  | 'ATHEMPURA'
  | 'URAH'
  | 'RANACH'

export interface ConferenciaMeta {
  nome:    ConferenciaNome
  cor:     string   // primária (hex)
  corAlt:  string   // acento/contraste suave
  vibe:    string   // descrição curta da identidade temática
  icone:   string   // emoji representativo
  ordem:   number
}

export const CONFERENCIAS: ConferenciaMeta[] = [
  { nome: 'ALLURA',     cor: '#D946EF', corAlt: '#F0ABFC', vibe: 'Brilho · Glam',     icone: '✦', ordem: 1 },
  { nome: 'KAZURA',     cor: '#F59E0B', corAlt: '#FCD34D', vibe: 'Fogo · Pulso',       icone: '🔥', ordem: 2 },
  { nome: 'CYBER CITY', cor: '#06B6D4', corAlt: '#67E8F9', vibe: 'Neon · Futuro',      icone: '◆', ordem: 3 },
  { nome: 'ESPETÁCULO', cor: '#EAB308', corAlt: '#FDE047', vibe: 'Ouro · Show',        icone: '★', ordem: 4 },
  { nome: 'ELDORADO',   cor: '#84CC16', corAlt: '#BEF264', vibe: 'Riqueza · Verde',    icone: '◈', ordem: 5 },
  { nome: 'ATHEMPURA',  cor: '#A855F7', corAlt: '#D8B4FE', vibe: 'Místico · Violeta',  icone: '✧', ordem: 6 },
  { nome: 'URAH',       cor: '#EF4444', corAlt: '#FCA5A5', vibe: 'Sangue · Pulso',     icone: '◉', ordem: 7 },
  { nome: 'RANACH',     cor: '#22D3EE', corAlt: '#A5F3FC', vibe: 'Aqua · Floresta',    icone: '◇', ordem: 8 },
]

const BY_NOME = new Map<string, ConferenciaMeta>(
  CONFERENCIAS.map(c => [c.nome, c]),
)

/**
 * Resolve metadata da conferência por nome.
 * Retorna `null` para 1ª/2ª Divisão (que não têm conferência).
 */
export function getConferencia(nome: string | null | undefined): ConferenciaMeta | null {
  if (!nome) return null
  return BY_NOME.get(nome.trim().toUpperCase()) ?? null
}

// ── Divisões ────────────────────────────────────────────────────────────────

export type DivisaoNome = '1ª Divisão' | '2ª Divisão' | 'Super 08'

export interface DivisaoMeta {
  nome:        DivisaoNome
  nivel:       1 | 2 | 3
  cor:         string
  vagas:       number
  rotulo:      string  // ex: "Nível 1 · Elite"
  /** Quantas atléticas sobem para a divisão superior ao fim da temporada. */
  sobem:       number
  /** Quantas atléticas descem para a divisão inferior ao fim da temporada. */
  descem:      number
}

export const DIVISOES: DivisaoMeta[] = [
  // 1ª Div: top 13 permanecem, 3 piores são rebaixadas
  { nome: '1ª Divisão', nivel: 1, cor: '#F0D04A', vagas: 16, rotulo: 'Elite',          sobem: 0, descem: 3 },
  // 2ª Div: top 3 sobem para a 1ª, ? piores rebaixadas (regra a confirmar)
  { nome: '2ª Divisão', nivel: 2, cor: '#4aa06a', vagas: 16, rotulo: 'Acesso',         sobem: 3, descem: 3 },
  // Super 08 (Divisão de Acesso): top 4 do playoff Super 8 sobem para a 2ª
  { nome: 'Super 08',   nivel: 3, cor: '#D8845F', vagas: 64, rotulo: 'Conferências',   sobem: 4, descem: 0 },
]

export function getDivisao(nome: string | null | undefined): DivisaoMeta | null {
  if (!nome) return null
  return DIVISOES.find(d => d.nome === nome.trim()) ?? null
}


// ── Fases da competição ─────────────────────────────────────────────────────

/**
 * Fases possíveis dentro de uma modalidade — usadas como `jogos.fase`.
 *
 *   Eliminatória simples: oitavas → quartas → semi → final
 *   3lugar:               disputa explícita de 3º (quando houver)
 *   r1..r7:               rodadas da liga Super 8 (pontos corridos)
 *   suico1..N:            rodadas do sistema suíço (xadrez)
 *   prova:                etapa única (natação, atletismo)
 *   grupo:                fase de grupos (raro na CIA)
 */
export type FaseJogo =
  | 'grupo'
  | 'oitavas'
  | 'quartas'
  | 'semi'    | 'semifinal'
  | 'final'
  | '3lugar'  | 'terceiro'
  | 'r1' | 'r2' | 'r3' | 'r4' | 'r5' | 'r6' | 'r7'  // Super 8 liga
  | 'prova'
  | string  // tolerante a outras fases customizadas

/** Tipo de competição para uma modalidade — define a lógica de pontuação. */
export type SistemaDisputa =
  | 'eliminatoria_simples'   // mata-mata padrão (a maioria das modalidades)
  | 'suico'                   // xadrez
  | 'provas'                  // natação, atletismo
  | 'liga'                    // super 8 playoff
  | 'todos_contra_todos'      // jiu-jitsu/judô com só 3 atletas (Art. 69 IV)
