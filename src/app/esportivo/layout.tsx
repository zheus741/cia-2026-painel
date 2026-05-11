import { AppShellLayout } from '@/components/app-shell-layout'
import { createClient } from '@/lib/supabase/server'

export default async function EsportivoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role, funcao_principal')
    .eq('id', user?.id ?? '')
    .maybeSingle()
  return (
    <AppShellLayout profile={profile} userEmail={user?.email} userId={user?.id} fullWidth>
      {children}
    </AppShellLayout>
  )
}
