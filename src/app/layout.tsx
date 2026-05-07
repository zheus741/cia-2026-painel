import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CIA 2026 · Painel de Cobertura',
  description:
    'Central de comando da cobertura ao vivo da Copa Inter Atléticas 2026 · Uberaba',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${dmSans.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
