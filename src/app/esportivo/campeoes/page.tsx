import { createClient } from '@/lib/supabase/server'
import {
  computePrevisaoAtletica,
  type JogoDetalhe,
  type InscricaoDetalhe,
  type ResultadoExterno,
} from '@/lib/competicao/queries'
import { CONFERENCIAS, getConferencia } from '@/lib/conferencias'
import {
  getSuper8Rows,
  computeSuper8Standings,
  summarizeSuper8,
} from '@/lib/competicao/super8'
import { CampeoesClient } from './CampeoesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Campeões · CIA 2026' }

const isSuper8 = (d: string | null) => (d ?? '').toLowerCase().includes('super')

export default async function CampeoesPage() {
  const supabase = await createClient()

  const [
    { data: rawAtleticas },
    { data: rawJogos },
    { data: rawInscricoes },
    { data: rawResultadosExternos },
    { data: edicao },
  ] = await Promise.all([
    supabase.from('equipes')
      .select('id, nome, slug, divisao, conferencia, universidade, cor_primaria, logo_url')
      .eq('tipo', 'atletica').order('nome'),
    supabase.from('jogos')
      .select(`id, modalidade_id, categoria, divisao, fase, inicio, status, placar_a, placar_b, penaltis_a, penaltis_b, wo, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome, modalidades:modalidade_id (nome, icone)`)
      .order('inicio', { ascending: true, nullsFirst: false }),
    supabase.from('inscricoes')
      .select(`id, equipe_id, modalidade_id, categoria, divisao, conferencia, cabeca_chave, modalidades:modalidade_id (nome, slug, icone)`),
    supabase.from('resultados_externos')
      .select(`modalidade_id, divisao, equipe_id, colocacao, pontos, observacoes, modalidades:modalidade_id (nome, icone)`),
    supabase.from('edicoes').select('id, nome').eq('ativa', true).maybeSingle(),
  ])

  const atleticas = rawAtleticas ?? []
  const nomeById = new Map(atleticas.map(a => [a.id, a]))

  // ── Jogos (exclui Super 08 do cálculo geral — é troféu à parte) ──────────────
  type Mod = { nome: string; icone: string | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todosJogos: JogoDetalhe[] = (rawJogos as any[] ?? [])
    .filter(r => !isSuper8(r.divisao))
    .map(r => {
      const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : (r.modalidades as Mod | null)
      return {
        id: r.id, modalidade_id: r.modalidade_id,
        modalidade_nome: mod?.nome ?? null, modalidade_icone: mod?.icone ?? null,
        categoria: r.categoria, divisao: r.divisao, fase: r.fase,
        inicio: r.inicio, fim_previsto: null, status: r.status,
        placar_a: r.placar_a, placar_b: r.placar_b,
        penaltis_a: r.penaltis_a, penaltis_b: r.penaltis_b, wo: r.wo,
        equipe_a_id: r.equipe_a_id, equipe_b_id: r.equipe_b_id,
        equipe_a_nome: r.equipe_a_nome, equipe_b_nome: r.equipe_b_nome,
      }
    })

  const inscricoesPorEquipe = new Map<string, InscricaoDetalhe[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (rawInscricoes as any[] ?? [])) {
    if (isSuper8(r.divisao)) continue
    const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
    const list = inscricoesPorEquipe.get(r.equipe_id) ?? []
    list.push({
      inscricao_id: r.id, modalidade_id: r.modalidade_id,
      modalidade_nome: mod?.nome ?? '?', modalidade_slug: mod?.slug ?? '', modalidade_icone: mod?.icone ?? null,
      categoria: r.categoria, divisao: r.divisao, conferencia: r.conferencia,
      cabeca_chave: r.cabeca_chave as 1 | 2 | null,
    })
    inscricoesPorEquipe.set(r.equipe_id, list)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultadosExternos: ResultadoExterno[] = (rawResultadosExternos as any[] ?? [])
    .filter(r => !isSuper8(r.divisao))
    .map(r => {
      const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
      return {
        modalidade_id: r.modalidade_id, modalidade_nome: mod?.nome ?? null, modalidade_icone: mod?.icone ?? null,
        divisao: r.divisao, equipe_id: r.equipe_id, colocacao: r.colocacao, pontos: r.pontos, observacoes: r.observacoes,
      }
    })

  // ── Pontos por atlética (atual) ──────────────────────────────────────────────
  const pontosById = new Map<string, number>()
  for (const a of atleticas) {
    const prev = computePrevisaoAtletica(todosJogos, inscricoesPorEquipe.get(a.id) ?? [], a.id, resultadosExternos)
    pontosById.set(a.id, prev.atual)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campeaoDe = (filtro: (a: any) => boolean) => {
    const membros = atleticas.filter(filtro)
      .map(a => ({ id: a.id, nome: a.nome, slug: a.slug, universidade: a.universidade, cor: a.cor_primaria, logo: a.logo_url, pontos: pontosById.get(a.id) ?? 0 }))
      .sort((x, y) => y.pontos - x.pontos || x.nome.localeCompare(y.nome))
    return membros[0] ?? null
  }

  const divisoes = [
    { nome: '1ª Divisão', cor: '#F0D04A', campeao: campeaoDe(a => a.divisao === '1ª Divisão') },
    { nome: '2ª Divisão', cor: '#4aa06a', campeao: campeaoDe(a => a.divisao === '2ª Divisão') },
  ]

  const conferencias = CONFERENCIAS.map(c => ({
    nome: c.nome, cor: c.cor, corAlt: c.corAlt, icone: c.icone, vibe: c.vibe,
    campeao: campeaoDe(a => a.conferencia === c.nome && isSuper8(a.divisao)),
  }))

  // ── Campeões por modalidade (colocação 1 = 13 pts) ───────────────────────────
  type ModCampeao = { modalidade: string; categoria: string | null; campeao: string }
  const porGrupoModalidade = new Map<string, ModCampeao[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (rawResultadosExternos as any[] ?? [])) {
    if (isSuper8(r.divisao)) continue
    if (r.colocacao !== 1 && r.pontos !== 13) continue
    const mod = Array.isArray(r.modalidades) ? r.modalidades[0] : r.modalidades
    const grupo = r.divisao ?? '?'
    const list = porGrupoModalidade.get(grupo) ?? []
    list.push({ modalidade: mod?.nome ?? '?', categoria: r.observacoes ?? null, campeao: nomeById.get(r.equipe_id)?.nome ?? '?' })
    porGrupoModalidade.set(grupo, list)
  }
  const modalidades = [...porGrupoModalidade.entries()]
    .map(([grupo, items]) => ({
      grupo,
      conf: getConferencia(grupo),
      items: items.sort((a, b) => a.modalidade.localeCompare(b.modalidade)),
    }))
    .sort((a, b) => {
      const ord = (g: string) => g.includes('1ª') ? 0 : g.includes('2ª') ? 1 : 2
      return ord(a.grupo) - ord(b.grupo) || a.grupo.localeCompare(b.grupo)
    })

  // ── Finais em disputa (1ª/2ª coletivas — títulos saindo agora) ───────────────
  const TBD = (n: string | null) => !n || /vencedor|perdedor|definir|tbd|^[—-]$/i.test(n.trim())
  const finaisMap = new Map<string, JogoDetalhe>()
  for (const j of todosJogos) {
    if (j.divisao !== '1ª Divisão' && j.divisao !== '2ª Divisão') continue
    if (!/final/i.test(j.fase ?? '') || j.status === 'encerrado') continue
    if (TBD(j.equipe_a_nome) || TBD(j.equipe_b_nome)) continue
    const k = `${j.divisao}|${j.modalidade_nome}|${j.categoria}`
    const cur = finaisMap.get(k)
    if (!cur || (j.inicio ?? '') > (cur.inicio ?? '')) finaisMap.set(k, j)
  }
  const finais = [...finaisMap.values()]
    .map(j => ({
      divisao: j.divisao as string, modalidade: j.modalidade_nome ?? '?',
      categoria: j.categoria, inicio: j.inicio, aoVivo: j.status === 'ao_vivo',
      a: j.equipe_a_nome ?? '?', b: j.equipe_b_nome ?? '?',
    }))
    .sort((a, b) => (a.aoVivo === b.aoVivo ? (a.inicio ?? '').localeCompare(b.inicio ?? '') : a.aoVivo ? -1 : 1))

  // ── Super 08 (liga) ──────────────────────────────────────────────────────────
  let super8: { standings: ReturnType<typeof computeSuper8Standings>; resumo: ReturnType<typeof summarizeSuper8> } | null = null
  if (edicao?.id) {
    const rows = await getSuper8Rows(edicao.id)
    super8 = { standings: computeSuper8Standings(rows), resumo: summarizeSuper8(rows) }
  }

  const totalModalidades = modalidades.reduce((n, g) => n + g.items.length, 0)

  return (
    <CampeoesClient
      divisoes={divisoes}
      conferencias={conferencias}
      modalidades={modalidades}
      super8={super8}
      finais={finais}
      totalModalidades={totalModalidades}
    />
  )
}
