export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/app-shell'
import { LineupClient } from './LineupClient'

export default async function LineupPage() {
  return (
    <AppShell section="Line Up" fullWidth>
      <LineupClient />
    </AppShell>
  )
}
