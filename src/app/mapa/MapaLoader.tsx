'use client'

import dynamic from 'next/dynamic'
import type { SetorPin } from './MapaClient'

function MapaLoading() {
  return (
    <div className="flex h-96 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)]/40">
      <div className="text-sm text-[var(--muted-foreground)]">Carregando mapa…</div>
    </div>
  )
}

const MapaClientDynamic = dynamic(
  () => import('./MapaClient').then((m) => m.MapaClient),
  { ssr: false, loading: () => <MapaLoading /> }
)

interface Props {
  setores: SetorPin[]
  height?: string
}

export function MapaLoader({ setores, height }: Props) {
  return <MapaClientDynamic setores={setores} height={height} />
}
