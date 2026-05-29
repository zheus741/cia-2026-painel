'use client'

import { ErrorScreen } from '@/components/error-screen'

export default function AgendaError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <ErrorScreen
      {...props}
      scope="Agenda"
      subtitle="Não consegui carregar a programação"
    />
  )
}
