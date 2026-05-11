import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CiaLogo } from '@/components/cia-logo'
import { signOut } from '@/app/actions'
import { LogOut, ArrowLeft } from 'lucide-react'
import { ProfileClient } from './ProfileClient'

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email, role, funcao_principal, foto_url, telefone')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/')

  // ── Fetch personal data in parallel ──────────────────────────────────────
  const [turnosRes, conteudosRes] = await Promise.all([
    // All turnos assigned to this user (all event days)
    supabase
      .from('turnos')
      .select('id, funcao, inicio, fim, observacoes, dia:dias_evento(nome_dia, data), setor:setores(nome)')
      .eq('user_id', user.id)
      .order('inicio'),

    // Conteúdos where user is responsible in any role
    supabase
      .from('conteudos')
      .select(`
        id, titulo, tipo, status, prioridade, horario_previsto,
        responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id,
        dia:dias_evento(nome_dia, data),
        setor:setores(nome)
      `)
      .or(
        `responsavel_captacao_id.eq.${user.id},responsavel_design_id.eq.${user.id},responsavel_edicao_id.eq.${user.id}`
      )
      .not('status', 'in', '(arquivado,cancelado)')
      .order('prioridade'),
  ])

  type RawTurno = {
    id: string; funcao: string; inicio: string; fim: string; observacoes: string | null
    dia: { nome_dia: string; data: string } | { nome_dia: string; data: string }[] | null
    setor: { nome: string } | { nome: string }[] | null
  }

  type RawConteudo = {
    id: string; titulo: string; tipo: string; status: string; prioridade: number
    horario_previsto: string | null
    responsavel_captacao_id: string | null
    responsavel_design_id: string | null
    responsavel_edicao_id: string | null
    dia: { nome_dia: string; data: string } | { nome_dia: string; data: string }[] | null
    setor: { nome: string } | { nome: string }[] | null
  }

  const arr = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v ?? null

  const turnos = (turnosRes.data ?? []).map((t) => ({
    ...(t as RawTurno),
    dia:   arr((t as RawTurno).dia),
    setor: arr((t as RawTurno).setor),
  }))

  const conteudos = (conteudosRes.data ?? []).map((c) => ({
    ...(c as RawConteudo),
    dia:   arr((c as RawConteudo).dia),
    setor: arr((c as RawConteudo).setor),
    // compute which roles this user has on this content
    myRoles: [
      (c as RawConteudo).responsavel_captacao_id === user.id ? 'captacao' : null,
      (c as RawConteudo).responsavel_design_id   === user.id ? 'design'   : null,
      (c as RawConteudo).responsavel_edicao_id   === user.id ? 'edicao'   : null,
    ].filter(Boolean) as string[],
  }))

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden cia-bg">

      <div className="cia-dot-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="cia-bg-stars pointer-events-none absolute inset-0 opacity-30" />

      {/* Giroscópio */}
      <div className="pointer-events-none absolute -right-28 -top-28 select-none">
        <div className="cia-spin-slow cia-pulse-glow">
          <Image
            src="/assets/giroscopio.png"
            alt=""
            width={400}
            height={400}
            style={{
              filter: 'invert(1) hue-rotate(100deg) saturate(1.5)',
              mixBlendMode: 'screen',
              opacity: 0.07,
            }}
          />
        </div>
      </div>

      {/* Header */}
      <header
        className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-4 sm:px-6"
        style={{ background: 'var(--background)' }}
      >
        <CiaLogo />
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-all hover:border-[var(--green-dim)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-all hover:border-[var(--destructive)]/50 hover:text-[var(--destructive)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <ProfileClient
          userId={user.id}
          profile={profile}
          turnos={turnos}
          conteudos={conteudos}
        />
      </main>
    </div>
  )
}
