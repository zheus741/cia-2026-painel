/**
 * Mapa do Centro Park — CIA 2026
 *
 * Geometria de cada área pública do evento, baseada no croqui
 * "CIA ARQEST A1 R5.pdf" da EXP Produções (16/04/2026).
 *
 * ViewBox padrão: 0 0 1400 820 (proporção ≈ 217m × 127m, escala ~6.5 px/m)
 *
 * Áreas operacionais (LED, som, elétrica, MKT etc.) NÃO entram aqui — esse mapa
 * é pra público + cobertura. Pra adicionar ou ajustar coordenadas, mexer só
 * neste arquivo.
 */

export type MapaCategoria =
  | 'palco'        // Palcos (principal, CIA Club)
  | 'bar'          // Bares
  | 'banheiro'     // Banheiros
  | 'servico'      // Ambulatório, SAC, caixa, troca de kit, etc.
  | 'acesso'       // Acessos / entradas
  | 'emergencia'   // Saídas de emergência
  | 'lazer'        // Vila, mirante, brinquedos, alimentação, descanso

export interface MapaArea {
  /** Slug único pra URL/key. */
  slug: string
  /** Nome curto pra label dentro do SVG. */
  nome: string
  /** Categoria — define cor base e ícone fallback. */
  categoria: MapaCategoria
  /** Descrição que aparece no painel ao clicar. */
  descricao?: string
  /** Capacidade aproximada (opcional). */
  capacidade?: number
  /** Slug do setor relacionado (caso queira linkar pro setor real). */
  setor_slug?: string
  /** Emoji/ícone customizado (sobrescreve o ícone da categoria). */
  icone?: string
  /**
   * Geometria — `rect` é mais simples; `polygon` aceita pontos arbitrários.
   * Coords em unidades do viewBox (0..1400 horizontal, 0..820 vertical).
   */
  geom:
    | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
    | { kind: 'polygon'; points: [number, number][] }
  /** Coord (cx, cy) pra posicionar o label. Se omitido, usa centro do bbox. */
  labelPos?: [number, number]
  /** Tamanho do label em unidades do viewBox. */
  labelSize?: number
}

// ─── Tema (cores por categoria) ─────────────────────────────────────────────

export const CATEGORIA_CONFIG: Record<MapaCategoria, {
  label: string
  icone: string
  cor: string        // cor primária (fill base)
  corStroke: string  // borda
  ordem: number      // pra legenda
}> = {
  palco:       { label: 'Palcos',       icone: '🎤', cor: '#6AB87E', corStroke: '#9BE3A8', ordem: 1 },
  bar:         { label: 'Bares',        icone: '🍻', cor: '#D8845F', corStroke: '#E89A6F', ordem: 2 },
  servico:     { label: 'Serviços',     icone: '🛎️', cor: '#F0D04A', corStroke: '#FBE388', ordem: 3 },
  banheiro:    { label: 'Banheiros',    icone: '🚻', cor: '#5E7A9B', corStroke: '#7E97B5', ordem: 4 },
  lazer:       { label: 'Lazer',        icone: '🎡', cor: '#A07BD6', corStroke: '#C09BE6', ordem: 5 },
  acesso:      { label: 'Acessos',      icone: '➡️', cor: '#3A6F4B', corStroke: '#6AB87E', ordem: 6 },
  emergencia:  { label: 'Emergência',   icone: '🚨', cor: '#EF4444', corStroke: '#FCA5A5', ordem: 7 },
}

// ─── Áreas ──────────────────────────────────────────────────────────────────
//
// Coordenadas aproximadas tiradas do croqui. Eixo Y cresce pra baixo.
// ViewBox total: 0 0 1400 820.
//
// Layout geral:
//   - Zona principal (esquerda, x≈40..640): Palco principal + Bares 01/02 + banheiros
//   - Zona CIA Club (centro, x≈680..950): Palco CIA Club + Bar 03
//   - Zona direita (x≈960..1280): Bar 04, banheiros, validação, mirante
//   - Faixa inferior (y≈700..800): Serviços (ambulatório, caixa, lojinha etc.)
//   - Acessos / emergências distribuídos no perímetro

export const MAPA_AREAS: MapaArea[] = [
  // ── PALCOS ─────────────────────────────────────────────────────────────────
  {
    slug: 'palco-principal',
    nome: 'Palco Principal',
    categoria: 'palco',
    descricao: 'Palco principal do evento — shows nacionais, embaixadores e DJs do line-up.',
    setor_slug: 'palco-principal',
    icone: '🎤',
    geom: { kind: 'polygon', points: [
      [110, 470], [430, 410], [530, 560], [410, 660], [180, 660], [110, 580],
    ]},
    labelPos: [275, 555], labelSize: 22,
  },
  {
    slug: 'palco-cia-club',
    nome: 'Palco CIA Club',
    categoria: 'palco',
    descricao: 'Palco do CIA Club — programação alternativa, sets exclusivos.',
    setor_slug: 'palco-cia-club',
    icone: '🎧',
    geom: { kind: 'rect', x: 720, y: 215, w: 200, h: 115, rx: 8 },
    labelSize: 16,
  },

  // ── BARES ──────────────────────────────────────────────────────────────────
  {
    slug: 'bar-01',
    nome: 'Bar 01',
    categoria: 'bar',
    descricao: 'Bar 01 — lateral esquerda da área principal.',
    geom: { kind: 'rect', x: 50, y: 220, w: 55, h: 290, rx: 6 },
    labelPos: [77, 365], labelSize: 14,
  },
  {
    slug: 'bar-02',
    nome: 'Bar 02',
    categoria: 'bar',
    descricao: 'Bar 02 — central, ao lado dos banheiros principais.',
    geom: { kind: 'rect', x: 545, y: 290, w: 60, h: 235, rx: 6 },
    labelPos: [575, 405], labelSize: 14,
  },
  {
    slug: 'bar-03',
    nome: 'Bar 03',
    categoria: 'bar',
    descricao: 'Bar 03 — área de transição entre Palco Principal e CIA Club.',
    geom: { kind: 'rect', x: 850, y: 295, w: 55, h: 215, rx: 6 },
    labelPos: [877, 400], labelSize: 14,
  },
  {
    slug: 'bar-04',
    nome: 'Bar 04',
    categoria: 'bar',
    descricao: 'Bar 04 — lateral direita, próximo ao Palco CIA Club.',
    geom: { kind: 'rect', x: 1015, y: 305, w: 55, h: 180, rx: 6 },
    labelPos: [1042, 395], labelSize: 14,
  },

  // ── BANHEIROS ──────────────────────────────────────────────────────────────
  {
    slug: 'banheiros-centro',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Bloco central de banheiros — área principal.',
    geom: { kind: 'rect', x: 460, y: 320, w: 80, h: 175, rx: 6 },
    labelPos: [500, 410], labelSize: 12,
  },
  {
    slug: 'banheiros-bar01',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Banheiros próximos ao Bar 01.',
    geom: { kind: 'rect', x: 115, y: 230, w: 75, h: 55, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'banheiros-palco-sul',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Banheiros próximos à entrada inferior do Palco Principal.',
    geom: { kind: 'rect', x: 200, y: 685, w: 230, h: 60, rx: 6 },
    labelSize: 12,
  },
  {
    slug: 'banheiros-cia-club',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Banheiros do CIA Club.',
    geom: { kind: 'rect', x: 935, y: 405, w: 75, h: 120, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'banheiros-direita',
    nome: 'Banheiros',
    categoria: 'banheiro',
    descricao: 'Banheiros laterais direitos.',
    geom: { kind: 'rect', x: 1075, y: 295, w: 130, h: 230, rx: 6 },
    labelPos: [1140, 410], labelSize: 13,
  },

  // ── SERVIÇOS (faixa inferior) ──────────────────────────────────────────────
  {
    slug: 'ambulatorio',
    nome: 'Ambulatório',
    categoria: 'servico',
    descricao: 'Atendimento médico 24h. Equipe de paramédicos + ambulância.',
    icone: '⛑️',
    setor_slug: 'ambulatorio',
    geom: { kind: 'rect', x: 145, y: 740, w: 85, h: 50, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'acolhimento',
    nome: 'Acolhimento',
    categoria: 'servico',
    descricao: 'Espaço de acolhimento — apoio emocional e segurança para todes.',
    icone: '🤝',
    geom: { kind: 'rect', x: 245, y: 740, w: 80, h: 50, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'sac',
    nome: 'SAC',
    categoria: 'servico',
    descricao: 'Serviço de Atendimento ao Consumidor — dúvidas, achados e perdidos.',
    icone: 'ℹ️',
    geom: { kind: 'rect', x: 580, y: 730, w: 60, h: 60, rx: 6 },
    labelSize: 12,
  },
  {
    slug: 'caixa',
    nome: 'Caixa',
    categoria: 'servico',
    descricao: 'Compra de fichas e recarga de cartão.',
    icone: '💳',
    geom: { kind: 'rect', x: 405, y: 740, w: 55, h: 50, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'lojinha',
    nome: 'Lojinha',
    categoria: 'servico',
    descricao: 'Merchandise oficial do CIA — camisas, copos, lembranças.',
    icone: '🛍️',
    geom: { kind: 'rect', x: 465, y: 740, w: 55, h: 50, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'eco-copo',
    nome: 'Eco Copo',
    categoria: 'servico',
    descricao: 'Retirada e devolução do copo reutilizável.',
    icone: '♻️',
    geom: { kind: 'rect', x: 525, y: 740, w: 50, h: 50, rx: 6 },
    labelSize: 10,
  },
  {
    slug: 'troca-de-kit',
    nome: 'Troca de Kit',
    categoria: 'servico',
    descricao: 'Retirada do kit do participante.',
    icone: '🎟️',
    geom: { kind: 'rect', x: 645, y: 740, w: 75, h: 50, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'credenciamento',
    nome: 'Credenciamento',
    categoria: 'servico',
    descricao: 'Credenciamento de staff, imprensa e equipes.',
    icone: '🪪',
    geom: { kind: 'rect', x: 725, y: 740, w: 100, h: 50, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'validacao',
    nome: 'Validação',
    categoria: 'servico',
    descricao: 'Validação de pulseiras CIA Club.',
    icone: '✅',
    geom: { kind: 'rect', x: 935, y: 285, w: 70, h: 75, rx: 6 },
    labelSize: 11,
  },

  // ── LAZER ──────────────────────────────────────────────────────────────────
  {
    slug: 'vila',
    nome: 'Vila',
    categoria: 'lazer',
    descricao: 'Vila do CIA — espaço de convivência das atléticas, ativações e parceiros.',
    icone: '🏘️',
    geom: { kind: 'rect', x: 70, y: 600, w: 320, h: 90, rx: 8 },
    labelPos: [230, 645], labelSize: 16,
  },
  {
    slug: 'mirante',
    nome: 'Mirante',
    categoria: 'lazer',
    descricao: 'Mirante — vista panorâmica do evento.',
    icone: '👁️',
    geom: { kind: 'rect', x: 685, y: 540, w: 50, h: 55, rx: 6 },
    labelSize: 11,
  },
  {
    slug: 'alimentacao',
    nome: 'Alimentação',
    categoria: 'lazer',
    descricao: 'Praça de alimentação — food trucks e parceiros gastronômicos.',
    icone: '🍔',
    geom: { kind: 'rect', x: 405, y: 600, w: 220, h: 80, rx: 8 },
    labelPos: [515, 640], labelSize: 14,
  },
  {
    slug: 'brinquedos',
    nome: 'Brinquedos',
    categoria: 'lazer',
    descricao: 'Área kids — brinquedos infláveis e atividades para crianças.',
    icone: '🎠',
    geom: { kind: 'rect', x: 660, y: 605, w: 95, h: 75, rx: 8 },
    labelSize: 12,
  },
  {
    slug: 'descanso',
    nome: 'Descanso',
    categoria: 'lazer',
    descricao: 'Área de descanso — sombra e assentos pra recarregar.',
    icone: '🪑',
    geom: { kind: 'rect', x: 860, y: 740, w: 110, h: 50, rx: 6 },
    labelSize: 12,
  },

  // ── ACESSOS ────────────────────────────────────────────────────────────────
  {
    slug: 'acesso-principal',
    nome: 'Acesso',
    categoria: 'acesso',
    descricao: 'Acesso principal do público.',
    geom: { kind: 'rect', x: 520, y: 745, w: 55, h: 40, rx: 4 },
    labelSize: 10,
  },
  {
    slug: 'acesso-leste',
    nome: 'Acesso',
    categoria: 'acesso',
    descricao: 'Acesso pela lateral leste do parque.',
    geom: { kind: 'rect', x: 1240, y: 410, w: 50, h: 40, rx: 4 },
    labelSize: 10,
  },
  {
    slug: 'acesso-oeste',
    nome: 'Acesso',
    categoria: 'acesso',
    descricao: 'Acesso lateral oeste — perto do Bar 01.',
    geom: { kind: 'rect', x: 10, y: 410, w: 35, h: 50, rx: 4 },
    labelSize: 10,
  },

  // ── SAÍDAS DE EMERGÊNCIA ───────────────────────────────────────────────────
  {
    slug: 'emergencia-1',
    nome: 'Saída',
    categoria: 'emergencia',
    descricao: 'Saída de emergência — lado oeste.',
    geom: { kind: 'rect', x: 10, y: 130, w: 35, h: 35, rx: 4 },
    labelSize: 9,
  },
  {
    slug: 'emergencia-2',
    nome: 'Saída',
    categoria: 'emergencia',
    descricao: 'Saída de emergência — lado norte do palco principal.',
    geom: { kind: 'rect', x: 435, y: 200, w: 35, h: 35, rx: 4 },
    labelSize: 9,
  },
  {
    slug: 'emergencia-3',
    nome: 'Saída',
    categoria: 'emergencia',
    descricao: 'Saída de emergência — lado sul / acesso veículos emergência.',
    geom: { kind: 'rect', x: 95, y: 745, w: 35, h: 35, rx: 4 },
    labelSize: 9,
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getArea(slug: string): MapaArea | undefined {
  return MAPA_AREAS.find(a => a.slug === slug)
}

export function getAreaCenter(area: MapaArea): [number, number] {
  if (area.labelPos) return area.labelPos
  if (area.geom.kind === 'rect') {
    return [area.geom.x + area.geom.w / 2, area.geom.y + area.geom.h / 2]
  }
  // polygon centroid
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
