import { requireProfile } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { ImportResultadosClient } from './ImportResultadosClient'

const CAN_EDIT_ROLES = ['admin', 'coordenador_esportivo']

export const dynamic = 'force-dynamic'

export default async function ImportarResultadosPage() {
  const profile = await requireProfile()
  if (!CAN_EDIT_ROLES.includes(profile.role)) redirect('/esportivo')

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 md:py-8">
      <PageHeader
        eyebrow="Esportivo"
        title="Importar resultados (planilha)"
        subtitle="Puxa os placares da planilha pública, mostra o que vai mudar e aplica nos jogos — propagando a chave."
      />
      <ImportResultadosClient />
    </div>
  )
}
