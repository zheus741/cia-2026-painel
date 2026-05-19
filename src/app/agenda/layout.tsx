import { AppShell } from '@/components/app-shell'

export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="Agenda" fullWidth>{children}</AppShell>
}
