import { notFound } from 'next/navigation'
import {
  getAtleticaBySlug,
  getInscricoesByEquipe,
  getJogosByEquipe,
  computeStats,
  getForma,
} from '@/lib/competicao/queries'
import { getConferencia, getDivisao } from '@/lib/conferencias'
import { AtleticaWikiClient } from './AtleticaWikiClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function AtleticaWikiPage({ params }: PageProps) {
  const { slug } = await params
  const atletica = await getAtleticaBySlug(slug)
  if (!atletica) notFound()

  const [inscricoes, jogos] = await Promise.all([
    getInscricoesByEquipe(atletica.id),
    getJogosByEquipe(atletica.id),
  ])

  const stats = computeStats(jogos, atletica.id)
  const forma = getForma(jogos, atletica.id, 5)

  const confMeta = getConferencia(atletica.conferencia)
  const divMeta  = getDivisao(atletica.divisao)
  const accent   = confMeta?.cor ?? divMeta?.cor ?? '#2e6b42'

  return (
    <AtleticaWikiClient
      atletica={atletica}
      inscricoes={inscricoes}
      jogos={jogos}
      stats={stats}
      forma={forma}
      confMeta={confMeta}
      divMeta={divMeta}
      accent={accent}
    />
  )
}
