import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/sidebar'
import { CiaLogo } from '@/components/cia-logo'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/80 px-6 backdrop-blur">
        <div className="flex items-center gap-6">
          <Link href="/">
            <CiaLogo />
          </Link>
          <span className="hidden text-xs uppercase tracking-widest text-[var(--muted-foreground)] sm:inline">
            · Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="font-medium">{profile?.nome ?? user.email}</p>
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              {profile?.role ?? '—'}
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 px-6 py-6 overflow-x-auto">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
