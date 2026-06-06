import { notFound } from 'next/navigation'
import {
  getAtleticaBySlug,
  getInscricoesByEquipe,
  getJogosByEquipe,
  computeStats,
  computePrevisaoAtletica,
  getForma,
  type ResultadoExterno,
} from '@/lib/competicao/queries'
import { getConferencia, getDivisao } from '@/lib/conferencias'
import { createClient } from '@/lib/supabase/server'
import { AtleticaWikiClient } from './AtleticaWikiClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function AtleticaWikiPage({ params }: PageProps) {
  const { slug } = await params
  const atletica = await getAtleticaBySlug(slug)
  if (!atletica) notFound()

  const supabase = await createClient()
  const [inscricoes, jogos, { data: rawResExt }] = await Promise.all([
    getInscricoesByEquipe(atletica.id),
    getJogosByEquipe(atletica.id),
    supabase
      .from('resultados_externos')
      .select('modalidade_id, divisao, equipe_id, colocacao, pontos, observacoes, modalidades:modalidade_id (nome, icone)')
      .eq('equipe_id', atletica.id),
  ])

  // Resultados externos (natação, judô, atletismo, xadrez, tênis…) desta atlética
  type RawResExt = {
    modalidade_id: string; divisao: string; equipe_id: string
    colocacao: number; pontos: number; observacoes: string | null
    modalidades: { nome: string; icone: string | null } | { nome: string; icone: string | null }[] | null
  }
  const resultadosExternos: ResultadoExterno[] = (rawResExt as RawResExt[] ?? []).map(r => {
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

  const stats    = computeStats(jogos, atletica.id)
  const forma    = getForma(jogos, atletica.id, 5)
  // Previsão Mín/Máx CIA — pontos garantidos + teto possível por modalidade
  const previsao = computePrevisaoAtletica(jogos, inscricoes, atletica.id, resultadosExternos)

  const confMeta = getConferencia(atletica.conferencia)
  const divMeta  = getDivisao(atletica.divisao)
  const accent   = atletica.cor_primaria ?? confMeta?.cor ?? divMeta?.cor ?? '#2e6b42'

  return (
    <AtleticaWikiClient
      atletica={atletica}
      inscricoes={inscricoes}
      jogos={jogos}
      stats={stats}
      forma={forma}
      previsao={previsao}
      confMeta={confMeta}
      divMeta={divMeta}
      accent={accent}
    />
  )
}
