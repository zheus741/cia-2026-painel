import { requireProfile } from '@/lib/auth/current-user'
import { MapaEsportivoLoader } from './MapaEsportivoLoader'

export const dynamic = 'force-dynamic'

export default async function MapaEsportivoPage() {
  await requireProfile()
  return <MapaEsportivoLoader />
}
