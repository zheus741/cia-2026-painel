import { AppShell } from '@/components/app-shell'

export default function ConteudosLayout({ children }: { children: React.ReactNode }) {
  return <AppShell fullWidth>{children}</AppShell>
}
