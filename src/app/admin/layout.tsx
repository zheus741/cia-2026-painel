import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { AppShell } from '@/components/app-shell'

// Apenas admin e coordenação acessam /admin/**
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // PERF: requireProfile() cacheado — chamada deduplicada com page.tsx filho
  const profile = await requireProfile()
  if (profile.role !== 'admin') {
    redirect('/')
  }

  return <AppShell section="Cadastros">{children}</AppShell>
}
