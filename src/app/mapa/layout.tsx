import { AppShell } from '@/components/app-shell'

export default function MapaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="Mapa Ao Vivo" fullWidth>{children}</AppShell>
}
