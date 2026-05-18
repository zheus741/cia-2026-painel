import type { Metadata, Viewport } from 'next'
import { DM_Sans, Fraunces, Geist } from 'next/font/google'
import { PushNotificationSetup } from '@/components/PushNotificationSetup'
import { NavigationProgress } from '@/components/NavigationProgress'
import { Toaster } from '@/components/toast'
import { ConfirmDialogHost } from '@/components/confirm-dialog'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Fraunces — serif display variable (optical sizing + soft + wonk).
// Usada nos números gigantes e headers editoriais.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

// Geist Sans — body / UI.
const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-geist',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CIA 2026 · Painel de Cobertura',
  description:
    'Central de comando da cobertura ao vivo da Copa Inter Atléticas 2026 · Uberaba',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CIA 2026',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a3a24',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${dmSans.variable} ${fraunces.variable} ${geist.variable}`}>
      <body className="min-h-full flex flex-col">
        <NavigationProgress />
        {children}
        <PushNotificationSetup />
        <Toaster />
        <ConfirmDialogHost />
      </body>
    </html>
  )
}
