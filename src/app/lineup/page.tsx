export const dynamic = 'force-dynamic'

import { Bebas_Neue, Space_Mono } from 'next/font/google'
import { AppShell } from '@/components/app-shell'
import { LineupClient } from './LineupClient'

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-lineup-display',
})

const mono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-lineup-mono',
})

export default async function LineupPage() {
  return (
    <AppShell section="Line Up" fullWidth>
      <div className={`${bebas.variable} ${mono.variable}`}>
        <LineupClient />
      </div>
    </AppShell>
  )
}
