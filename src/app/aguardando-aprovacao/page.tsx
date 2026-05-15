import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, LogOut, Shield, CheckCircle2 } from 'lucide-react'
import { getCurrentProfile } from '@/lib/auth/current-user'
import { signOut } from '@/app/actions'

/**
 * /aguardando-aprovacao
 *
 * Tela bloqueio que aparece pra usuários com `aprovado=false`.
 * Funcionários cadastrados precisam que admin/coord libere acesso
 * antes de poder navegar pelo painel.
 */
export default async function AguardandoAprovacaoPage() {
  const profile = await getCurrentProfile()

  // Sem login → manda pra login
  if (!profile) redirect('/login')

  // Já aprovado → direto pra home (não devia estar aqui)
  if (profile.aprovado) redirect('/')

  const firstName = profile.nome?.trim().split(/\s+/)[0] ?? 'Você'

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--background)' }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border bg-[var(--card)] shadow-xl"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Accent top */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400/0 via-amber-400/80 to-amber-400/0" />

        <div className="p-8">
          {/* Ícone status */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25 mx-auto">
            <Clock className="h-7 w-7 text-amber-500 animate-pulse" />
          </div>

          {/* Título */}
          <h1 className="text-center text-xl font-bold tracking-tight text-[var(--foreground)]">
            Olá, {firstName} 👋
          </h1>
          <p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
            Sua conta foi criada com sucesso, mas <strong className="text-[var(--foreground)]">precisa ser liberada</strong> por um coordenador antes de você poder acessar o painel.
          </p>

          {/* Passos */}
          <div className="mt-6 space-y-3">
            <Step
              done
              icon={CheckCircle2}
              titulo="Conta criada"
              descricao="Você concluiu o cadastro com sucesso"
            />
            <Step
              ativo
              icon={Clock}
              titulo="Aguardando liberação"
              descricao="O coordenador foi notificado e vai aprovar em breve"
            />
            <Step
              icon={Shield}
              titulo="Acesso liberado"
              descricao="Você receberá uma notificação assim que liberado"
            />
          </div>

          {/* Info extra */}
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 px-4 py-3">
            <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              💡 <strong>Pra acelerar:</strong> avise o coordenador esportivo ou de mídia
              (no Slack ou WhatsApp) que você está aguardando. Ele/ela vai te atribuir a
              função certa e liberar.
            </p>
          </div>

          {/* Logout */}
          <form action={signOut} className="mt-6">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:border-red-300 hover:text-red-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair desta conta
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] bg-[var(--muted)]/30 px-8 py-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]/60">
            CIA 2026 · Painel da Cobertura
          </p>
        </div>
      </div>

      {/* Reload manual */}
      <Link
        href="/"
        className="mt-6 text-[11px] text-[var(--muted-foreground)]/60 hover:text-[var(--foreground)] transition-colors"
      >
        Já foi aprovado? Clique pra recarregar →
      </Link>
    </div>
  )
}

function Step({
  done, ativo, icon: Icon, titulo, descricao,
}: {
  done?: boolean
  ativo?: boolean
  icon: typeof Clock
  titulo: string
  descricao: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={[
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
          done
            ? 'bg-[var(--green-bright)]/15 border border-[var(--green-bright)]/40 text-[var(--green-bright)]'
            : ativo
            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-500'
            : 'bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)]/40',
        ].join(' ')}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p
          className={[
            'text-sm font-semibold leading-tight',
            done ? 'text-[var(--foreground)]' : ativo ? 'text-amber-700' : 'text-[var(--muted-foreground)]/60',
          ].join(' ')}
        >
          {titulo}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]/70 leading-snug">
          {descricao}
        </p>
      </div>
    </div>
  )
}
