import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShellLayout } from '@/components/app-shell-layout'

interface AppShellProps {
  children: React.ReactNode
  section?: string
  fullWidth?: boolean
}

export async function AppShell({ children, section, fullWidth = false }: AppShellProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, funcao_principal')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <AppShellLayout
      profile={profile}
      userEmail={user.email}
      userId={user.id}
      section={section}
      fullWidth={fullWidth}
    >
      {children}
    </AppShellLayout>
  )
}
