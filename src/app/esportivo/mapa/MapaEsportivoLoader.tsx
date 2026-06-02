'use client'

import dynamic from 'next/dynamic'
import type { Venue } from './types'

const Dyn = dynamic(
  () => import('./MapaEsportivoVenuesClient').then(m => m.MapaEsportivoVenuesClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)] animate-pulse">Carregando mapa…</p>
      </div>
    ),
  },
)

export function MapaEsportivoLoader({
  venues,
  semGeo,
  isAdmin = false,
}: {
  venues: Venue[]
  semGeo: string[]
  isAdmin?: boolean
}) {
  return <Dyn venues={venues} semGeo={semGeo} isAdmin={isAdmin} />
}
