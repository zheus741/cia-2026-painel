/**
 * Mapa do Centro Park — CIA 2026
 *
 * Geometria baseada no croqui "CIA ARQEST A1 R5.pdf" — EXP Produções (16/04/2026).
 * ViewBox: 0 0 1400 820  (escala ≈ 6.5 px/m, proporção ≈ 217m × 127m)
 *
 * Layout:
 *   Zona A (x: 20–570)   — Palco Principal + CIA Club esq. + Bares 01/02
 *   Zona B (x: 570–860)  — Eletrônico + Bares 03/RedBull + PhotoPoint + Mirante
 *   Zona C (x: 840–1160) — Bar 04 + Banheiros + CIA Club dir. + Paredão RedBull
 *   Faixa (y: 745–800)   — Ambulatório, Alimentação, Serviços
 */

export type MapaCategoria =
  | 'palco'
  | 'bar'
  | 'banheiro'
  | 'servico'
  | 'acesso'
  | 'emergencia'
  | 'lazer'

export interface MapaArea {
  slug:        string
  nome:        string
  categoria:   MapaCategoria
  descricao?:  string
  capacidade?: number
  setor_slug?: string
  icone?:      string
  geom:
    | { kind: 'rect';    x: number; y: number; w: number; h: number; rx?: number }
    | { kind: 'polygon'; points: [number, number][] }
  labelPos?:  [number, number]
  labelSize?: number
}

// ── Cores por categoria — calibradas para fundo navy escuro ──────────────────

export const CATEGORIA_CONFIG: Record<MapaCategoria, {
  label:      string
  icone:      string
  cor:        string
  corStroke:  string
  ordem:      number
}> = {
  palco:      { label: 'Palcos',      icone: '🎤', cor: '#4ade80', corStroke: '#86efac', ordem: 1 },
  bar:        { label: 'Bares',       icone: '🍻', cor: '#fb923c', corStroke: '#fdba74', ordem: 2 },
  servico:    { label: 'Serviços',    icone: '🛎️', cor: '#fbbf24', corStroke: '#fde68a', ordem: 3 },
  banheiro:   { label: 'Banheiros',   icone: '🚻', cor: '#60a5fa', corStroke: '#93c5fd', ordem: 4 },
  lazer:      { label: 'Lazer',       icone: '🎡', cor: '#a78bfa', corStroke: '#c4b5fd', ordem: 5 },
  acesso:     { label: 'Acessos',     icone: '➡️', cor: '#94a3b8', corStroke: '#cbd5e1', ordem: 6 },
  emergencia: { label: 'Emergência',  icone: '🚨', cor: '#f87171', corStroke: '#fca5a5', ordem: 7 },
}

// ── Áreas ────────────────────────────────────────────────────────────────────

export const MAPA_AREAS: MapaArea[] = [

  // ─── PALCOS ─────────────────────────────────────────────────────────────────

  {
    slug: 'palco-principal',
    nome: 'Palco Principal',
    categoria: 'palco',
    descricao: 'Palco principal do evento — shows nacionais, embaixadores e DJs do line-up.',
    setor_slug: 'palco-principal',
    icone: '🎤',
    geom: { kind: 'polygon', points: [
      [105, 440], [400, 390], [460, 405], [530, 520],
      [475, 670], [260, 695], [118, 630],
    ]},
    labelPos: [298, 548], labelSize: 26,
  },
  {
    slug: 'palco-cia-club-esq',
    nome: 'CIA Club',
    categoria: 'palco',
    descricao: 'Palco do CIA Club — programação alternativa, sets exclusivos.',
    setor_slug: 'palco-cia-club',
    icone: '🎧',
    geom: { kind: 'rect', x: 92, y: 220, w: 220, h: 70, rx: 8 },
    labelSize: 20,
  },
  {
    slug: 'eletronico',
    nome: 'Eletrônico',
    categoria: 'palco',
    descricao: 'Palco eletrônico — sets de DJ, música eletrônica ao vivo.',
    setor_slug: 'eletronico',
    icone: '🎛️',
    geom: { kind: 'rect', x: 685, y: 250, w: 120, h: 75, rx: 8 },
    labelSize: 18,
  },

  // ─── BARES ──────────────────────────────────────────────────────────────────

  {
    slug: 'bar-01',
    nome: 'Bar 01',
    categoria: 'bar',
    descricao: 'Bar 01 — lateral esquerda da área principal.',
    geom: { kind: 'rect', x: 118, y: 440, w: 58, h: 160, rx: 6 },
    labelPos: [147, 520], labelSize: 14,
  },
  {
    slug: 'bar-02',
    nome: 'Bar 02',
    categoria: 'bar',
    descricao: 'Bar 02 — central, próximo aos banheiros.',
    geom: { kind: 'rect', x: 442, y: 360, w: 58, h: 210, rx: 6 },
    labelPos: [471, 465], labelSize: 14,
  },
  {
    slug: 'bar-03',
    nome: 'Bar 03',
    categoria: 'bar',
    descricao: 'Bar 03 — área entre Palco Principal e Eletrônico.',
    geom: { kind: 'rect', x: 610, y: 332, w: 58, h: 185, rx: 6 },
    labelPos: [639, 425], labelSize: 14,
  },
  {
    slug: 'bar-04',
    nome: 'Bar 04',
    categoria: 'bar',
    descricao: 'Bar 04 — lateral direita, próximo ao CIA Club.',
    geom: { kind: 'rect', x: 858, y: 348, w: 62, h: 105, rx: 6 },
    labelPos: [889, 400], labelSize: 14,
  },
  {
    slug: 'bar-redbull',
    nome: 'Bar RedBull',
    categoria: 'bar',
    descricao: 'Ativação RedBull — bebidas e experiência de marca.',
    icone: '🔴',
    geom: { kind: 'rect', x: 572, y: 582, w: 80, h: 52, rx: 6 },
    labelSize: 12,
  },

  // ─── BANHEIROS ──────────────────────────────────────────────────────────────

  {
    slug: 'banheiros-top-esq',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Banheiros próximos ao Camarim e CIA Club esquerdo.',
    geom: { kind: 'rect', x: 280, y: 132, w: 108, h: 62, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'banheiros-centro',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Banheiros centrais — área principal.',
    geom: { kind: 'rect', x: 458, y: 468, w: 82, h: 108, rx: 6 },
    labelPos: [499, 522], labelSize: 12,
  },
  {
    slug: 'banheiros-palco-sul',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Banheiros sul — próximos à Ativação RedBull e saída.',
    geom: { kind: 'rect', x: 200, y: 648, w: 232, h: 58, rx: 6 },
    labelSize: 12,
  },
  {
    slug: 'banheiros-centro-dir',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Banheiros da área central direita — Eletrônico.',
    geom: { kind: 'rect', x: 885, y: 408, w: 130, h: 110, rx: 6 },
    labelPos: [950, 463], labelSize: 13,
  },

  // ─── SERVIÇOS ────────────────────────────────────────────────────────────────

  {
    slug: 'credenciamento',
    nome: 'Credenciamento',
    categoria: 'servico',
    descricao: 'Credenciamento de staff, imprensa e equipes — entrada principal.',
    icone: '🪪',
    geom: { kind: 'rect', x: 82, y: 22, w: 100, h: 42, rx: 6 },
    labelSize: 12,
  },
  {
    slug: 'ambulatorio',
    nome: 'Ambulatório',
    categoria: 'servico',
    descricao: 'Atendimento médico 24h — paramédicos e ambulância.',
    icone: '⛑️',
    setor_slug: 'ambulatorio',
    geom: { kind: 'rect', x: 232, y: 752, w: 90, h: 46, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'acolhimento',
    nome: 'Acolhimento',
    categoria: 'servico',
    descricao: 'Espaço de acolhimento — apoio emocional e segurança.',
    icone: '🤝',
    geom: { kind: 'rect', x: 326, y: 752, w: 80, h: 46, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'alimentacao',
    nome: 'Alimentação',
    categoria: 'servico',
    descricao: 'Food trucks e praça de alimentação.',
    icone: '🍔',
    setor_slug: 'alimentacao',
    geom: { kind: 'rect', x: 448, y: 756, w: 106, h: 42, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'caixlojinha',
    nome: 'Caixa / Lojinha',
    categoria: 'servico',
    descricao: 'Compra de fichas, recarga e merchandise oficial do CIA.',
    icone: '💳',
    geom: { kind: 'rect', x: 556, y: 756, w: 82, h: 42, rx: 6 },
    labelPos: [597, 777], labelSize: 10,
  },
  {
    slug: 'troca-de-kit',
    nome: 'Troca de Kit',
    categoria: 'servico',
    descricao: 'Retirada do kit do participante — pulseira e copo.',
    icone: '🎟️',
    geom: { kind: 'rect', x: 640, y: 752, w: 82, h: 46, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'validacao',
    nome: 'Validação',
    categoria: 'servico',
    descricao: 'Validação de pulseiras CIA Club.',
    icone: '✅',
    geom: { kind: 'rect', x: 858, y: 508, w: 66, h: 44, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'apoio',
    nome: 'Apoio',
    categoria: 'servico',
    descricao: 'Base de apoio operacional — staff e coordenação.',
    icone: '🏠',
    geom: { kind: 'rect', x: 858, y: 458, w: 66, h: 46, rx: 6 },
    labelSize: 11,
  },

  // ─── LAZER / ATIVAÇÕES ───────────────────────────────────────────────────────

  {
    slug: 'vila',
    nome: 'Vila',
    categoria: 'lazer',
    descricao: 'Vila do CIA — espaço de convivência das atléticas, ativações e parceiros.',
    icone: '🏘️',
    geom: { kind: 'rect', x: 295, y: 48, w: 90, h: 80, rx: 8 },
    labelSize: 14,
  },
  {
    slug: 'estrela-redbull',
    nome: 'Estrela RedBull',
    categoria: 'lazer',
    descricao: 'Estrutura da Estrela RedBull — ativação principal da marca.',
    icone: '🔴',
    geom: { kind: 'rect', x: 558, y: 432, w: 150, h: 72, rx: 8 },
    labelPos: [633, 468], labelSize: 14,
  },
  {
    slug: 'photopoint',
    nome: 'PhotoPoint',
    categoria: 'lazer',
    descricao: 'Espaço instagramável — fotos e ativações de marca.',
    icone: '📸',
    geom: { kind: 'rect', x: 558, y: 512, w: 80, h: 52, rx: 6 },
    labelSize: 12,
  },
  {
    slug: 'mirante',
    nome: 'Mirante',
    categoria: 'lazer',
    descricao: 'Mirante — vista panorâmica do evento.',
    icone: '👁️',
    geom: { kind: 'rect', x: 646, y: 512, w: 72, h: 52, rx: 6 },
    labelSize: 12,
  },
  {
    slug: 'ativacao-redbull',
    nome: 'Ativação RedBull',
    categoria: 'lazer',
    descricao: 'Área de ativação RedBull — experiências e branding.',
    icone: '🔴',
    geom: { kind: 'rect', x: 335, y: 668, w: 118, h: 58, rx: 6 },
    labelSize: 12,
  },
  {
    slug: 'paredao-redbull',
    nome: 'Paredão RedBull',
    categoria: 'lazer',
    descricao: 'Telão/paredão RedBull — transmissão ao vivo e interativo.',
    icone: '📺',
    geom: { kind: 'rect', x: 840, y: 538, w: 210, h: 34, rx: 4 },
    labelPos: [945, 555], labelSize: 12,
  },
  {
    slug: 'brinquedos',
    nome: 'Brinquedos',
    categoria: 'lazer',
    descricao: 'Área kids — infláveis e atividades para crianças.',
    icone: '🎠',
    geom: { kind: 'rect', x: 558, y: 572, w: 160, h: 62, rx: 8 },
    labelSize: 13,
  },
  {
    slug: 'descanso',
    nome: 'Descanso',
    categoria: 'lazer',
    descricao: 'Área de descanso — sombra e assentos.',
    icone: '🪑',
    geom: { kind: 'rect', x: 558, y: 642, w: 160, h: 50, rx: 6 },
    labelSize: 12,
  },
  {
    slug: 'cia-club-dir',
    nome: 'CIA Club',
    categoria: 'palco',
    descricao: 'Área CIA Club direita — acesso exclusivo com pulseira.',
    setor_slug: 'palco-cia-club',
    icone: '🎧',
    geom: { kind: 'polygon', points: [
      [848, 555], [860, 590], [862, 650], [1002, 673], [1155, 645], [1155, 555],
    ]},
    labelPos: [995, 618], labelSize: 22,
  },

  // ─── ACESSOS ─────────────────────────────────────────────────────────────────

  {
    slug: 'acesso-principal',
    nome: 'Acesso',
    categoria: 'acesso',
    descricao: 'Acesso central — entrada principal do público.',
    geom: { kind: 'rect', x: 598, y: 284, w: 56, h: 50, rx: 4 },
    labelSize: 10,
  },
  {
    slug: 'acesso-staff',
    nome: 'Acesso Staff',
    categoria: 'acesso',
    descricao: 'Acesso exclusivo de staff e equipes técnicas.',
    geom: { kind: 'rect', x: 16, y: 64, w: 64, h: 42, rx: 4 },
    labelSize: 10,
  },

  // ─── EMERGÊNCIA ──────────────────────────────────────────────────────────────

  {
    slug: 'emergencia-1',
    nome: 'Saída',
    categoria: 'emergencia',
    descricao: 'Saída de emergência — lado oeste.',
    geom: { kind: 'rect', x: 16, y: 136, w: 34, h: 34, rx: 4 },
    labelSize: 9,
  },
  {
    slug: 'emergencia-2',
    nome: 'Saída',
    categoria: 'emergencia',
    descricao: 'Saída de emergência — norte do palco principal.',
    geom: { kind: 'rect', x: 438, y: 204, w: 34, h: 34, rx: 4 },
    labelSize: 9,
  },
  {
    slug: 'emergencia-3',
    nome: 'Saída',
    categoria: 'emergencia',
    descricao: 'Saída de emergência — acesso veículos sul.',
    geom: { kind: 'rect', x: 96, y: 748, w: 34, h: 34, rx: 4 },
    labelSize: 9,
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getArea(slug: string): MapaArea | undefined {
  return MAPA_AREAS.find(a => a.slug === slug)
}

export function getAreaCenter(area: MapaArea): [number, number] {
  if (area.labelPos) return area.labelPos
  if (area.geom.kind === 'rect') {
    return [area.geom.x + area.geom.w / 2, area.geom.y + area.geom.h / 2]
  }
  const pts = area.geom.points
  const sx = pts.reduce((s, [x]) => s + x, 0)
  const sy = pts.reduce((s, [, y]) => s + y, 0)
  return [sx / pts.length, sy / pts.length]
}

export function getAreaBounds(area: MapaArea): { x: number; y: number; w: number; h: number } {
  if (area.geom.kind === 'rect') {
    return { x: area.geom.x, y: area.geom.y, w: area.geom.w, h: area.geom.h }
  }
  const xs = area.geom.points.map(([x]) => x)
  const ys = area.geom.points.map(([, y]) => y)
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}
