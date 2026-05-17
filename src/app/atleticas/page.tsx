import { getAllAtleticas } from '@/lib/competicao/queries'
import { getConferencia, CONFERENCIAS, type ConferenciaNome } from '@/lib/conferencias'
import { AtleticasIndexClient } from './AtleticasIndexClient'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'

export const dynamic = 'force-dynamic'

export default async function AtleticasPage() {
  const atleticas = await getAllAtleticas()

  // Agrupa: 1ª Divisão · 2ª Divisão · Super 08 (com sub-grupos por conferência)
  const div1 = atleticas.filter(a => a.divisao === '1ª Divisão')
  const div2 = atleticas.filter(a => a.divisao === '2ª Divisão')
  const super08Raw = atleticas.filter(a => a.divisao === 'Super 08')
  const semDiv = atleticas.filter(a => !a.divisao || !['1ª Divisão','2ª Divisão','Super 08'].includes(a.divisao))

  // Sub-agrupa Super 08 por conferência (mantendo ordem oficial das CONFERENCIAS)
  const super08ByConf = new Map<ConferenciaNome, typeof atleticas>()
  for (const conf of CONFERENCIAS) {
    super08ByConf.set(conf.nome, super08Raw.filter(a => a.conferencia === conf.nome))
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Esportivo"
        title="Atléticas"
        subtitle={`${atleticas.length} atléticas inscritas na Copa Inter Atléticas 2026 — organizadas por divisão e conferência.`}
      />

      <AtleticasIndexClient
        div1={div1}
        div2={div2}
        super08ByConf={Array.from(super08ByConf.entries()).map(([nome, equipes]) => ({
          conferencia: nome,
          meta: getConferencia(nome)!,
          equipes,
        }))}
        semDiv={semDiv}
        totals={{
          total: atleticas.length,
          div1: div1.length, div2: div2.length,
          super08: super08Raw.length,
          semDiv: semDiv.length,
        }}
      />
    </PageContainer>
  )
}
