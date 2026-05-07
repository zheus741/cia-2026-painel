import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Camera, Video, Phone, Mail, User } from 'lucide-react'

const FUNCAO_LABEL: Record<string, string> = {
  foto: 'Fotografia', video: 'Vídeo',
  social: 'Social', reporter: 'Repórter', editor: 'Editor',
  drone: 'Drone', roaming: 'Roaming', coordenacao: 'Coordenação',
  producao: 'Produção', design: 'Design',
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', coordenacao: 'Coordenação',
  lider_area: 'Líder de Área', operador: 'Operador',
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default async function MinhaEquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role, funcao_principal, nome')
    .eq('id', user.id)
    .maybeSingle()

  if (!me?.funcao_principal) redirect('/minha-escala')

  const { data: equipe } = await supabase
    .from('profiles')
    .select('id, nome, role, funcao_principal, telefone, email')
    .eq('ativo', true)
    .eq('funcao_principal', me.funcao_principal)
    .order('role')
    .order('nome')

  const membros = equipe ?? []
  const funcaoLabel = FUNCAO_LABEL[me.funcao_principal] ?? me.funcao_principal
  const FuncaoIcon = me.funcao_principal === 'foto' ? Camera : me.funcao_principal === 'video' ? Video : User
  const funcaoColor = me.funcao_principal === 'foto' ? '#7c3aed' : me.funcao_principal === 'video' ? '#2563eb' : '#2e6b42'

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Equipe
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FuncaoIcon className="h-6 w-6" style={{ color: funcaoColor }} />
          <span>Equipe de {funcaoLabel}</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {membros.length} membro{membros.length !== 1 ? 's' : ''} cadastrado{membros.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Team grid */}
      {membros.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
          <FuncaoIcon className="mx-auto mb-3 h-8 w-8 opacity-30" style={{ color: funcaoColor }} />
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhum membro cadastrado para a equipe de {funcaoLabel} ainda.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {membros.map((m) => {
            const isMe = m.id === user.id
            const initials = getInitials(m.nome)
            const roleLabel = ROLE_LABEL[m.role] ?? m.role
            const isLider = m.role === 'lider_area' || m.role === 'admin' || m.role === 'coordenacao'

            return (
              <div
                key={m.id}
                className="cia-metric-card flex items-start gap-3 p-4"
                style={isMe ? { outline: `2px solid ${funcaoColor}30`, outlineOffset: 0 } : undefined}
              >
                {/* Avatar */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: `${funcaoColor}15`,
                    border: `1.5px solid ${funcaoColor}35`,
                    color: funcaoColor,
                  }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold leading-snug">
                      {m.nome}
                      {isMe && (
                        <span className="ml-1 text-[10px] font-normal text-[var(--muted-foreground)]">(você)</span>
                      )}
                    </p>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{
                        background: isLider ? `${funcaoColor}12` : 'var(--muted)',
                        borderColor: isLider ? `${funcaoColor}30` : 'var(--border)',
                        color: isLider ? funcaoColor : 'var(--muted-foreground)',
                      }}
                    >
                      {roleLabel}
                    </span>
                  </div>

                  {/* Contact */}
                  <div className="mt-2 space-y-1">
                    {m.telefone && (
                      <a
                        href={`tel:${m.telefone}`}
                        className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{m.telefone}</span>
                      </a>
                    )}
                    {m.email && (
                      <a
                        href={`mailto:${m.email}`}
                        className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </a>
                    )}
                    {!m.telefone && !m.email && (
                      <p className="text-[10px] text-[var(--muted-foreground)]/50">Sem contato cadastrado</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
