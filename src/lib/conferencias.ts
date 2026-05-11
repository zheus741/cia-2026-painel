/**
 * Identidade visual das 8 conferências da 3ª Divisão (Super 08) da CIA 2026.
 *
 * Cada conferência tem 8 vagas. Os campeões de cada uma sobem para o Super 08,
 * que define os 4 acessos para a 2ª Divisão.
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
  nome:    DivisaoNome
  nivel:   1 | 2 | 3
  cor:     string
  vagas:   number
  rotulo:  string  // ex: "Nível 1 · Elite"
}

export const DIVISOES: DivisaoMeta[] = [
  { nome: '1ª Divisão', nivel: 1, cor: '#F0D04A', vagas: 16, rotulo: 'Elite' },
  { nome: '2ª Divisão', nivel: 2, cor: '#4aa06a', vagas: 16, rotulo: 'Acesso' },
  { nome: 'Super 08',   nivel: 3, cor: '#D8845F', vagas: 64, rotulo: 'Conferências' },
]

export function getDivisao(nome: string | null | undefined): DivisaoMeta | null {
  if (!nome) return null
  return DIVISOES.find(d => d.nome === nome.trim()) ?? null
}
