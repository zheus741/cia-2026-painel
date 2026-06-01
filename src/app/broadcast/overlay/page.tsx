import { createServiceClient } from '@/lib/supabase/service'
import { OverlayClient } from './OverlayClient'
import { ESTADO_INICIAL, type BroadcastEstado, type PatrocinadorRef } from '../types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Overlay · Broadcast CIA 2026' }

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'

export default async function OverlayPage() {
  const sb = createServiceClient()
  const [{ data: estado }, { data: patrocs }] = await Promise.all([
    sb.from('broadcast_estado').select('*').eq('id', 'palco-principal').maybeSingle(),
    sb.from('patrocinadores').select('id, nome, logo_url, cota, cor_marca').eq('ativo', true).eq('edicao_id', EDICAO_ID),
  ])

  return (
    <OverlayClient
      estadoInicial={(estado as BroadcastEstado) ?? ESTADO_INICIAL}
      patrocinadores={(patrocs as PatrocinadorRef[]) ?? []}
    />
  )
}
