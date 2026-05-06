import { AppShell } from '@/components/app-shell'

export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="Checklists">{children}</AppShell>
}
