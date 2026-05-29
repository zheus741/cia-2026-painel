'use client'

import { ErrorScreen } from '@/components/error-screen'

export default function PlacarError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <ErrorScreen
      {...props}
      scope="Placar"
      subtitle="Não consegui carregar os jogos"
    />
  )
}
