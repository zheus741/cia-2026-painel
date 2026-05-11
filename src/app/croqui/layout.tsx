import { AppShell } from '@/components/app-shell'

export default function CroquiLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="Croqui do Evento" fullWidth>{children}</AppShell>
}
