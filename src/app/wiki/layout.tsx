import { AppShell } from '@/components/app-shell'

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="Wiki">{children}</AppShell>
}
