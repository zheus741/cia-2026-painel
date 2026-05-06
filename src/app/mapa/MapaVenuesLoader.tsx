'use client'

import dynamic from 'next/dynamic'

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-[var(--muted-foreground)] animate-pulse">Carregando mapa…</p>
    </div>
  )
}

const MapaVenuesDynamic = dynamic(
  () => import('./MapaVenuesClient').then(m => m.MapaVenuesClient),
  { ssr: false, loading: () => <Loading /> },
)

export function MapaVenuesLoader() {
  return <MapaVenuesDynamic />
}
