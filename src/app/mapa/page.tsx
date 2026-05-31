import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { MapaEsportivoClient, type Marcador } from './MapaEsportivoClient'

const CAN_EDIT_ROLES = ['admin', 'coordenacao', 'coordenador_esportivo']

export const dynamic = 'force-dynamic'

export default async function MapaPage() {
  const profile = await requireProfile()
  const canEdit = CAN_EDIT_ROLES.includes(profile.role)
  const supabase = await createClient()

  const { data } = await supabase
    .from('mapa_marcadores')
    .select('id, label, categoria, x, y')
    .order('criado_em', { ascending: true })

  const marcadores = (data ?? []) as Marcador[]
  return <MapaEsportivoClient marcadores={marcadores} canEdit={canEdit} />
}
