import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { SetoresBoardClient, type SetorRow } from './SetoresBoardClient'

export const dynamic = 'force-dynamic'

export default async function SetoresPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('setores')
    .select(`
      id, nome, tipo, endereco, lat, lng,
      capacidade_pessoas, cor_hex, observacoes,
      maps_url, tem_wifi, tem_ponto_apoio,
      alimentacao, notas_acesso, tem_youtube_live
    `)
    .order('nome')

  const setores = (data ?? []) as SetorRow[]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestão"
        title="Setores"
        subtitle="Locais físicos do evento. Coordenadas e cor alimentam o mapa ao vivo."
      />

      <SetoresBoardClient setores={setores} />
    </div>
  )
}
