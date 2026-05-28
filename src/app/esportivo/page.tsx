import { createClient } from '@/lib/supabase/server'
import {
  computeStats,
  computePrevisaoAtletica,
  type JogoDetalhe,
  type InscricaoDetalhe,
  type ResultadoExterno,
} from '@/lib/competicao/queries'
import { CONFERENCIAS } from '@/lib/conferencias'
import { EsportivoClient } from './EsportivoClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Núcleo Esportivo · CIA 2026' }

export default async function EsportivoPage() {
  const supabase = await createClient()

  // PERF: traz TODOS os jogos da edição (incluindo agendados — preciso pra
  // saber quais modalidades a atlética ainda vai disputar) + inscrições + dados
  // de modalidade. Sem isso a previsão Mín/Máx não pode ser calculada.
  const [
    { data: rawAtleticas },
    { data: rawJogos },
    { count: aoVivoCount },
    { data: rawInscricoes },
    { data: rawResultadosExternos },
    { data: rawSetores },
  ] = await Promise.all([
    supabase
      .from('equipes')
      .select('id, nome, slug, divisao, conferencia, seed, universidade, cor_primaria')
      .eq('tipo', 'atletica')
      .order('divisao', { ascending: true, nullsFirst: false })
      .order('seed',    { ascending: true, nullsFirst: false })
      .order('nome'),
    supabase
      .from('jogos')
      .select(`
        id, modalidade_id, categoria, divisao, fase, setor_id,
        inicio, status, placar_a, placar_b, wo,
        equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome,
        modalidades:modalidade_id (nome, icone)
      `)
      .order('inicio', { ascending: true, nullsFirst: false }),
    supabase
      .from('jogos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ao_vivo'),
    supabase
      .from('inscricoes')
      .select(`
        id, equipe_id, modalidade_id, categoria, divisao, conferencia, cabeca_chave,
        modalidades:modalidade_id (nome, slug, icone)
      `),
    supabase
      .from('resultados_externos')
      .select(`
        modalidade_id, divisao, equipe_id, colocacao, pontos, observacoes,
        modalidades:modalidade_id (nome, icone)
      `),
    supabase
      .from('setores')
      .select('id, nome, tipo, cor_hex')
      .eq('tipo', 'esportivo')
      .order('nome'),
  ])

  const atleticas = rawAtleticas ?? []

  // ── Normaliza jogos (formato JogoDetalhe) ─────────────────────────────────
  type Mod = { nome: string; icone: string | null }
  type RawJogo = {
    id: string; modalidade_id: string
    categoria: string | null; divisao: string | null; fase: string | null
    setor_id: string | null
    inicio: string | null; status: string | null
    placar_a: number | null; placar_b: number | null
    wo: 'a' | 'b' | 'duplo' | null
    equipe_a_id: string | null; equipe_b_id: string | null
    equipe_a_nome: string | null; equipe_b_nome: string | null
    modalidades: Mod | Mod[] | null
  }
  const todosJogos: JogoDetalhe[] = (rawJogos as RawJogo[] ?? []).map(r => {
    const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
    return {
      id: r.id, modalidade_id: r.modalidade_id,
      modalidade_nome:  mod?.nome ?? null,
      modalidade_icone: mod?.icone ?? null,
      categoria: r.categoria, divisao: r.divisao, fase: r.fase,
      inicio: r.inicio, fim_previsto: null, status: r.status,
      placar_a: r.placar_a, placar_b: r.placar_b, wo: r.wo,
      equipe_a_id: r.equipe_a_id, equipe_b_id: r.equipe_b_id,
      equipe_a_nome: r.equipe_a_nome, equipe_b_nome: r.equipe_b_nome,
    }
  })
  const encerrados = todosJogos.filter(j => j.status === 'encerrado')

  // ── Inscrições por equipe (Map para lookup rápido) ────────────────────────
  type RawInsc = {
    id: string; equipe_id: string; modalidade_id: string
    categoria: string; divisao: string; conferencia: string | null
    cabeca_chave: 1 | 2 | 3 | 4 | null
    modalidades: { nome: string; slug: string; icone: string | null } | { nome: string; slug: string; icone: string | null }[] | null
  }
  const inscricoesPorEquipe = new Map<string, InscricaoDetalhe[]>()
  for (const r of (rawInscricoes as RawInsc[] ?? [])) {
    const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
    const detalhe: InscricaoDetalhe = {
      inscricao_id:     r.id,
      modalidade_id:    r.modalidade_id,
      modalidade_nome:  mod?.nome ?? '?',
      modalidade_slug:  mod?.slug ?? '',
      modalidade_icone: mod?.icone ?? null,
      categoria:        r.categoria,
      divisao:          r.divisao,
      conferencia:      r.conferencia,
      cabeca_chave:     r.cabeca_chave as 1 | 2 | null,
    }
    const list = inscricoesPorEquipe.get(r.equipe_id) ?? []
    list.push(detalhe)
    inscricoesPorEquipe.set(r.equipe_id, list)
  }

  // ── Resultados externos (judô, jiu, atl, nat, xadrez) ─────────────────────
  type RawResExt = {
    modalidade_id: string; divisao: string; equipe_id: string
    colocacao: number; pontos: number; observacoes: string | null
    modalidades: { nome: string; icone: string | null } | { nome: string; icone: string | null }[] | null
  }
  const resultadosExternos: ResultadoExterno[] = (rawResultadosExternos as RawResExt[] ?? []).map(r => {
    const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
    return {
      modalidade_id:    r.modalidade_id,
      modalidade_nome:  mod?.nome ?? null,
      modalidade_icone: mod?.icone ?? null,
      divisao:          r.divisao,
      equipe_id:        r.equipe_id,
      colocacao:        r.colocacao,
      pontos:           r.pontos,
      observacoes:      r.observacoes,
    }
  })

  // ── Stats + Previsão por atlética ─────────────────────────────────────────
  const atleticasWithStats = atleticas.map(a => {
    const myEncerrados = encerrados.filter(j => j.equipe_a_id === a.id || j.equipe_b_id === a.id)
    const stats        = computeStats(myEncerrados, a.id)
    const inscricoes   = inscricoesPorEquipe.get(a.id) ?? []
    const previsao     = computePrevisaoAtletica(todosJogos, inscricoes, a.id, resultadosExternos)
    return {
      ...a, ...stats,
      // Previsão CIA — substitui o `pontos` antigo (3V+1E Brasileirão errado)
      pontos_cia:        previsao.atual,
      pontos_cia_max:    previsao.maximo,
      vivas:             previsao.vivas,
      decididas:         previsao.decididas,
      total_inscricoes:  inscricoes.length,
    }
  })

  // Sort: pontos CIA atual desc → máx desc → saldo → nome
  const sortByPoints = (list: typeof atleticasWithStats) =>
    [...list].sort((a, b) =>
      b.pontos_cia     - a.pontos_cia ||
      b.pontos_cia_max - a.pontos_cia_max ||
      b.saldo          - a.saldo ||
      a.nome.localeCompare(b.nome),
    )

  const div1 = sortByPoints(atleticasWithStats.filter(a => a.divisao === '1ª Divisão'))
  const div2 = sortByPoints(atleticasWithStats.filter(a => a.divisao === '2ª Divisão'))

  const super08 = CONFERENCIAS.map(conf => ({
    conferencia: conf.nome,
    equipes: sortByPoints(atleticasWithStats.filter(a => a.conferencia === conf.nome)),
  }))

  // ── Upcoming (próximos jogos agendados) ───────────────────────────────────
  const upcoming = todosJogos
    .filter(j => j.status === 'agendado')
    .slice(0, 8)
    .map(j => ({
      id: j.id,
      equipe_a_id: j.equipe_a_id, equipe_b_id: j.equipe_b_id,
      equipe_a_nome: j.equipe_a_nome, equipe_b_nome: j.equipe_b_nome,
      inicio: j.inicio, fase: j.fase, divisao: j.divisao,
      modalidade_nome: j.modalidade_nome, modalidade_icone: j.modalidade_icone,
    }))

  // ── Volume por praça esportiva ────────────────────────────────────────────
  type SetorRow = { id: string; nome: string; tipo: string; cor_hex: string | null }
  const setores = (rawSetores as SetorRow[] | null) ?? []
  // Index pra lookups
  const rawJogosTyped = (rawJogos as RawJogo[] | null) ?? []
  const atleticaById = new Map(atleticas.map(a => [a.id, a]))

  type PracaModalidadeCount = { nome: string; icone: string | null; count: number }
  type PracaAtleticaCount   = { id: string; nome: string; slug: string; cor: string | null; jogos: number }

  const pracas = setores.map(s => {
    const jogosDaPraca = rawJogosTyped.filter(j => j.setor_id === s.id)
    let encerradosCount = 0, aoVivoCount = 0, agendadosCount = 0
    const modMap = new Map<string, PracaModalidadeCount>()
    const atlMap = new Map<string, PracaAtleticaCount>()
    let primeiroJogo: string | null = null
    let ultimoJogo:   string | null = null

    for (const j of jogosDaPraca) {
      if      (j.status === 'encerrado') encerradosCount++
      else if (j.status === 'ao_vivo')   aoVivoCount++
      else if (j.status === 'agendado')  agendadosCount++

      // Modalidade
      const mod = Array.isArray(j.modalidades) ? j.modalidades[0] : j.modalidades
      if (mod) {
        const cur = modMap.get(mod.nome) ?? { nome: mod.nome, icone: mod.icone, count: 0 }
        cur.count++
        modMap.set(mod.nome, cur)
      }

      // Atléticas
      for (const eqId of [j.equipe_a_id, j.equipe_b_id]) {
        if (!eqId) continue
        const a = atleticaById.get(eqId)
        if (!a) continue
        const cur = atlMap.get(a.id) ?? { id: a.id, nome: a.nome, slug: a.slug, cor: a.cor_primaria, jogos: 0 }
        cur.jogos++
        atlMap.set(a.id, cur)
      }

      // Range temporal
      if (j.inicio) {
        if (!primeiroJogo || j.inicio < primeiroJogo) primeiroJogo = j.inicio
        if (!ultimoJogo   || j.inicio > ultimoJogo)   ultimoJogo   = j.inicio
      }
    }

    const modalidades = [...modMap.values()].sort((a, b) => b.count - a.count)
    const atleticasList = [...atlMap.values()].sort((a, b) => b.jogos - a.jogos)

    return {
      id:           s.id,
      nome:         s.nome,
      cor:          s.cor_hex,
      totalJogos:   jogosDaPraca.length,
      encerrados:   encerradosCount,
      aoVivo:       aoVivoCount,
      agendados:    agendadosCount,
      modalidades,
      atleticas:    atleticasList,
      primeiroJogo,
      ultimoJogo,
    }
  })
  // Ordem: mais movimentada primeiro, vazias no fim
  .sort((a, b) => b.totalJogos - a.totalJogos || a.nome.localeCompare(b.nome, 'pt-BR'))
  // Esconde praças sem nenhum jogo
  .filter(p => p.totalJogos > 0)

  return (
    <div className="mx-auto w-full max-w-[1640px] px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12">
      <EsportivoClient
        div1={div1}
        div2={div2}
        super08={super08}
        upcoming={upcoming}
        totalJogos={encerrados.length}
        totalAtleticas={atleticas.length}
        aoVivoCount={aoVivoCount ?? 0}
        pracas={pracas}
      />
    </div>
  )
}
