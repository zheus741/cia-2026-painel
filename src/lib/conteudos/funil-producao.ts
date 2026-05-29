/**
 * Agrega os status de produção (captação/design/edição) de uma lista de
 * conteúdos num funil — quanto de cada etapa está não iniciado / produzindo
 * / concluído.
 *
 * Só conta a etapa quando há RESPONSÁVEL designado naquele papel — etapa sem
 * responsável não faz parte do escopo daquele conteúdo (ex: card sem edição).
 *
 * Reutilizável em / (home Análises) e /tv (modo TV).
 */

export type RespStatus = 'nao_iniciado' | 'produzindo' | 'concluido'

export interface EtapaFunil {
  etapa:        'captacao' | 'design' | 'edicao'
  label:        string
  total:        number   // conteúdos com responsável nessa etapa
  naoIniciado:  number
  produzindo:   number
  concluido:    number
  pct:          number   // % concluído (0-100)
}

export interface FunilProducao {
  etapas:           EtapaFunil[]
  /** Total de itens "produzindo" agora em qualquer etapa (pro TV ao vivo). */
  produzindoAgora:  number
  /** Total de tarefas (soma dos totais das 3 etapas). */
  totalTarefas:     number
  /** Total concluídas (soma). */
  totalConcluidas:  number
  pctGeral:         number
}

interface ConteudoFunilInput {
  responsavel_captacao_id?: string | null
  responsavel_design_id?:   string | null
  responsavel_edicao_id?:   string | null
  status_captacao?:         string | null
  status_design?:           string | null
  status_edicao?:           string | null
}

function normStatus(s: string | null | undefined): RespStatus {
  if (s === 'produzindo' || s === 'concluido') return s
  return 'nao_iniciado'
}

const ETAPAS: Array<{
  key: EtapaFunil['etapa']
  label: string
  respKey: keyof ConteudoFunilInput
  statusKey: keyof ConteudoFunilInput
}> = [
  { key: 'captacao', label: 'Captação', respKey: 'responsavel_captacao_id', statusKey: 'status_captacao' },
  { key: 'design',   label: 'Design',   respKey: 'responsavel_design_id',   statusKey: 'status_design' },
  { key: 'edicao',   label: 'Edição',   respKey: 'responsavel_edicao_id',   statusKey: 'status_edicao' },
]

export function buildFunilProducao(conteudos: ConteudoFunilInput[]): FunilProducao {
  const etapas: EtapaFunil[] = ETAPAS.map(def => {
    let total = 0, naoIniciado = 0, produzindo = 0, concluido = 0
    for (const c of conteudos) {
      const temResp = !!c[def.respKey]
      if (!temResp) continue
      total++
      const st = normStatus(c[def.statusKey] as string | null | undefined)
      if (st === 'concluido')      concluido++
      else if (st === 'produzindo') produzindo++
      else                          naoIniciado++
    }
    return {
      etapa: def.key,
      label: def.label,
      total, naoIniciado, produzindo, concluido,
      pct: total > 0 ? Math.round((concluido / total) * 100) : 0,
    }
  })

  const produzindoAgora = etapas.reduce((s, e) => s + e.produzindo, 0)
  const totalTarefas    = etapas.reduce((s, e) => s + e.total, 0)
  const totalConcluidas = etapas.reduce((s, e) => s + e.concluido, 0)

  return {
    etapas,
    produzindoAgora,
    totalTarefas,
    totalConcluidas,
    pctGeral: totalTarefas > 0 ? Math.round((totalConcluidas / totalTarefas) * 100) : 0,
  }
}
