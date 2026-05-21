import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { AppShell } from '@/components/app-shell'

const ALLOWED = ['admin', 'coordenacao', 'lider_fv', 'lider_area']

export default async function EscalaAVLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()
  if (!ALLOWED.includes(profile.role)) redirect('/')
  return <AppShell section="Escala Foto & Vídeo">{children}</AppShell>
}
