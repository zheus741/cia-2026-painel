'use client'

import { ErrorScreen } from '@/components/error-screen'

export default function ConteudosError(props: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <ErrorScreen
      {...props}
      scope="Conteúdos"
      subtitle="Não consegui carregar o kanban"
    />
  )
}
