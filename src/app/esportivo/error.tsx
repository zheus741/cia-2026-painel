'use client'

import { ErrorScreen } from '@/components/error-screen'

export default function EsportivoError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <ErrorScreen
      {...props}
      scope="Hub Esportivo"
      subtitle="Não consegui carregar a competição"
    />
  )
}
