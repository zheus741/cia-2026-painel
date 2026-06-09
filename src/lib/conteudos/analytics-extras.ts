/**
 * analytics-extras — datasets adicionais pra aba Análises da home.
 *   • Mix de conteúdo (canal/plataforma + formato)
 *   • Produção por dia do evento
 *   • Entregas por patrocinador (entregue vs contratado)
 *   • Equipe por função (pessoas + publicações)
 *
 * Puro (sem I/O) — recebe os arrays já carregados e agrega.
 */

export interface MixItem { label: string; count: number }
export interface ProducaoDia { dia: number; label: string; total: number; publicados: number }
export interface PatrocinioItem { nome: string; entregues: number; contratado: number }
export interface EquipeFuncao { funcao: string; pessoas: number; publicados: number }

export interface AnalyticsExtras {
  canais:     MixItem[]
  formatos:   MixItem[]
  porDia:     ProducaoDia[]
  patrocinio: PatrocinioItem[]
  equipe:     EquipeFuncao[]
}

interface RawConteudo {
  status: string
  tipo: string | null
  dia_id: string | null
  canal_publicacao: string | null
  patrocinador_id: string | null
}
interface DiaRow { id: string; data: string }
interface Patroc { id: string; nome: string }
interface ContPatroc { patrocinador_id: string | null; status: string }
interface Escopo { patrocinador_id: string; quantidade_prevista: number | null }
interface RankRow { funcao: string | null; publicados: number }

const DIA_LABEL = ['', 'Qui', 'Sex', 'Sáb', 'Dom']

const splitCount = (rows: RawConteudo[], key: 'canal_publicacao' | 'tipo'): MixItem[] => {
  const m: Record<string, number> = {}
  for (const r of rows) {
    const v = r[key]
    if (!v) continue
    for (const part of String(v).split(',')) {
      const x = part.trim()
      if (x) m[x] = (m[x] || 0) + 1
    }
  }
  return Object.entries(m).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

export function buildAnalyticsExtras(params: {
  conteudos: RawConteudo[]
  dias: DiaRow[]
  patrocinadores: Patroc[]
  conteudosPorPatroc: ContPatroc[]
  escopoItens: Escopo[]
  ranking: RankRow[]
}): AnalyticsExtras {
  const { conteudos, dias, patrocinadores, conteudosPorPatroc, escopoItens, ranking } = params

  // Mix
  const canais = splitCount(conteudos, 'canal_publicacao').slice(0, 8)
  const formatos = splitCount(conteudos, 'tipo').slice(0, 8)

  // Produção por dia (só os 4 dias do evento)
  const diasEvento = [...dias]
    .sort((a, b) => a.data.localeCompare(b.data))
    .filter(d => d.data >= '2026-06-04' && d.data <= '2026-06-07')
  const diaIdx = new Map(diasEvento.map((d, i) => [d.id, i + 1]))
  const porDiaAcc = new Map<number, { total: number; pub: number }>()
  for (const c of conteudos) {
    if (!c.dia_id) continue
    const idx = diaIdx.get(c.dia_id)
    if (!idx) continue
    const cur = porDiaAcc.get(idx) ?? { total: 0, pub: 0 }
    cur.total++
    if (c.status === 'publicado') cur.pub++
    porDiaAcc.set(idx, cur)
  }
  const porDia: ProducaoDia[] = diasEvento.map((_, i) => {
    const idx = i + 1
    const v = porDiaAcc.get(idx) ?? { total: 0, pub: 0 }
    return { dia: idx, label: DIA_LABEL[idx] ?? `D${idx}`, total: v.total, publicados: v.pub }
  })

  // Patrocínio — entregue (publicado) vs contratado (escopo)
  const nomePat = new Map(patrocinadores.map(p => [p.id, p.nome]))
  const entreguePorPat = new Map<string, number>()
  for (const c of conteudosPorPatroc) {
    if (!c.patrocinador_id) continue
    if (c.status === 'publicado') entreguePorPat.set(c.patrocinador_id, (entreguePorPat.get(c.patrocinador_id) || 0) + 1)
  }
  const contratadoPorPat = new Map<string, number>()
  for (const e of escopoItens) {
    contratadoPorPat.set(e.patrocinador_id, (contratadoPorPat.get(e.patrocinador_id) || 0) + (e.quantidade_prevista ?? 0))
  }
  const patrocinio: PatrocinioItem[] = patrocinadores
    .map(p => ({ nome: p.nome, entregues: entreguePorPat.get(p.id) ?? 0, contratado: contratadoPorPat.get(p.id) ?? 0 }))
    .filter(p => p.entregues > 0 || p.contratado > 0)
    .sort((a, b) => b.entregues - a.entregues)

  // Equipe por função (agrega o ranking)
  const eqAcc = new Map<string, { pessoas: number; pub: number }>()
  for (const r of ranking) {
    const f = r.funcao || '(sem função)'
    const cur = eqAcc.get(f) ?? { pessoas: 0, pub: 0 }
    cur.pessoas++
    cur.pub += r.publicados
    eqAcc.set(f, cur)
  }
  const equipe: EquipeFuncao[] = Array.from(eqAcc.entries())
    .map(([funcao, v]) => ({ funcao, pessoas: v.pessoas, publicados: v.pub }))
    .sort((a, b) => b.publicados - a.publicados)

  return { canais, formatos, porDia, patrocinio, equipe }
}
