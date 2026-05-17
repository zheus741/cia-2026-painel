'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { updateRole, updateFuncao, toggleAtivo, aprovarUsuario, recusarUsuario } from './actions'
import { confirmDialog } from '@/components/confirm-dialog'
import {
  Shield, UserCog, Users, Crown, Power, PowerOff,
  Clock, CheckCircle2, X, Loader2, AlertCircle,
} from 'lucide-react'

type Role = 'admin' | 'coordenacao' | 'lider_area' | 'operador' | 'coordenador_esportivo' | 'operador_esportivo'
type Funcao = string | null

interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string | null
  role: string
  funcao_principal: string | null
  foto_url: string | null
  ativo: boolean
  criado_em: string
  aprovado: boolean
}

const ROLE_META: Record<Role, { label: string; cor: string; icon: typeof Shield }> = {
  admin:                  { label: 'Admin',          cor: 'text-red-600 bg-red-50 border-red-200',              icon: Crown },
  coordenacao:            { label: 'Coordenação',    cor: 'text-yellow-700 bg-yellow-50 border-yellow-200',     icon: Shield },
  lider_area:             { label: 'Líder',          cor: 'text-purple-700 bg-purple-50 border-purple-200',     icon: UserCog },
  operador:               { label: 'Operador',       cor: 'text-[var(--green-bright)] bg-[var(--green-dim)]/30 border-[var(--green-dim)]/40', icon: Users },
  coordenador_esportivo:  { label: 'Coord. Esport.', cor: 'text-blue-700 bg-blue-50 border-blue-200',           icon: Shield },
  operador_esportivo:     { label: 'Op. Esportivo',  cor: 'text-sky-700 bg-sky-50 border-sky-200',              icon: Users },
}

const FUNCOES = [
  { value: '',                label: '— sem função —' },
  { value: 'foto',            label: '📷 Foto' },
  { value: 'video',           label: '🎬 Vídeo' },
  { value: 'editor',          label: '✂️ Editor' },
  { value: 'design',          label: '🎨 Design' },
  { value: 'coordenacao',     label: '📋 Coordenação' },
  { value: 'storymaker',      label: '📱 Storymaker' },
  { value: 'lider_cobertura', label: '⭐ Líder de Cobertura' },
]

function Avatar({ nome, foto_url }: { nome: string; foto_url: string | null }) {
  const parts = nome.trim().split(/\s+/)
  const letras = (parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : nome.slice(0, 2)).toUpperCase()

  if (foto_url) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--green-dim)]/60">
        <Image src={foto_url} alt={nome} fill sizes="40px" className="object-cover" />
      </div>
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--green-dim)]/30 ring-1 ring-[var(--green-dim)]/50 text-sm font-bold text-[var(--green-bright)]">
      {letras}
    </div>
  )
}

function UsuarioCard({ u, onUpdate }: { u: Usuario; onUpdate: () => void }) {
  const [isPending, startTransition] = useTransition()
  const meta = ROLE_META[u.role as Role] ?? ROLE_META.operador
  const RoleIcon = meta.icon

  function handleRole(newRole: Role) {
    startTransition(async () => {
      await updateRole(u.id, newRole)
      onUpdate()
    })
  }

  function handleFuncao(newFuncao: string) {
    startTransition(async () => {
      await updateFuncao(u.id, newFuncao || null)
      onUpdate()
    })
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleAtivo(u.id, !u.ativo)
      onUpdate()
    })
  }

  return (
    <div className={`flex flex-col gap-4 rounded-xl border p-4 transition-all ${
      u.ativo
        ? 'border-[var(--border)] bg-[var(--card)]'
        : 'border-[var(--border)]/50 bg-[var(--card)]/40 opacity-60'
    }`}>
      {/* Linha superior */}
      <div className="flex items-start gap-3">
        <Avatar nome={u.nome} foto_url={u.foto_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{u.nome}</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{u.email}</p>
          {u.telefone && (
            <p className="text-xs text-[var(--muted-foreground)]/70">{u.telefone}</p>
          )}
        </div>
        {/* Badge de cargo */}
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.cor}`}>
          <RoleIcon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Trocar role */}
        <select
          value={u.role}
          onChange={(e) => handleRole(e.target.value as Role)}
          disabled={isPending}
          className="flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1.5 text-xs text-[var(--foreground)] disabled:opacity-50 cursor-pointer"
        >
          <option value="admin">Admin</option>
          <option value="coordenacao">Coordenação</option>
          <option value="lider_area">Líder de área</option>
          <option value="operador">Operador</option>
          <option value="coordenador_esportivo">Coord. Esportivo</option>
          <option value="operador_esportivo">Op. Esportivo</option>
        </select>

        {/* Trocar função */}
        <select
          value={u.funcao_principal ?? ''}
          onChange={(e) => handleFuncao(e.target.value)}
          disabled={isPending}
          className="flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1.5 text-xs text-[var(--foreground)] disabled:opacity-50 cursor-pointer"
        >
          {FUNCOES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Toggle ativo */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          title={u.ativo ? 'Desativar acesso' : 'Reativar acesso'}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            u.ativo
              ? 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-red-700/50 hover:text-red-400'
              : 'border-[var(--green-dim)]/40 text-[var(--green-bright)] hover:bg-[var(--green-dim)]/20'
          }`}
        >
          {u.ativo
            ? <><PowerOff className="h-3.5 w-3.5" /> Desativar</>
            : <><Power className="h-3.5 w-3.5" /> Reativar</>
          }
        </button>
      </div>

      {isPending && (
        <p className="text-[10px] text-[var(--muted-foreground)] animate-pulse">Salvando...</p>
      )}
    </div>
  )
}

// ── Dialog de aprovação ──────────────────────────────────────────────────────

function AprovacaoDialog({ user, onClose, onApproved }: {
  user: Usuario
  onClose: () => void
  onApproved: () => void
}) {
  const [role, setRole]     = useState<Role>('operador')
  const [funcao, setFuncao] = useState<string>('')
  const [error, setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const res = await aprovarUsuario(user.id, { role, funcao: funcao || null })
      if (!res.ok) { setError(res.error ?? 'Erro'); return }
      onApproved()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar nome={user.nome} foto_url={user.foto_url} />
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[var(--foreground)]">{user.nome}</h3>
              <p className="truncate text-xs text-[var(--muted-foreground)]">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-xs text-[var(--muted-foreground)]">
          Escolha o papel e a função antes de liberar o acesso. O usuário será notificado.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Papel</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--green-bright)] focus:outline-none"
            >
              <option value="operador">Operador</option>
              <option value="lider_area">Líder de área</option>
              <option value="coordenacao">Coordenação</option>
              <option value="operador_esportivo">Op. Esportivo</option>
              <option value="coordenador_esportivo">Coord. Esportivo</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Função</label>
            <select
              value={funcao}
              onChange={e => setFuncao(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--green-bright)] focus:outline-none"
            >
              {FUNCOES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--green-deep)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aprovar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card de usuário pendente ─────────────────────────────────────────────────

function PendingUserCard({ u, onUpdate, onApprove }: {
  u: Usuario
  onUpdate: () => void
  onApprove: () => void
}) {
  const [isPending, startTransition] = useTransition()

  async function handleReject() {
    const ok = await confirmDialog({
      title: `Recusar acesso de ${u.nome}?`,
      description: 'A conta será desativada. O usuário não poderá entrar no painel até ser aprovado novamente.',
      confirmLabel: 'Recusar',
      destructive: true,
    })
    if (!ok) return
    startTransition(async () => {
      await recusarUsuario(u.id)
      onUpdate()
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-amber-400/40 bg-amber-500/[0.04] p-4 ring-1 ring-amber-400/20">
      <div className="flex items-start gap-3">
        <Avatar nome={u.nome} foto_url={u.foto_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{u.nome}</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{u.email}</p>
          {u.telefone && (
            <p className="text-xs text-[var(--muted-foreground)]/70">{u.telefone}</p>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
          <Clock className="h-3 w-3 animate-pulse" />
          Pendente
        </span>
      </div>

      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]/50">
        Cadastrou-se em {new Date(u.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onApprove}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--green-deep)] px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Aprovar
        </button>
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:border-red-300 hover:text-red-500 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Recusar
        </button>
      </div>
    </div>
  )
}

export function UsuariosClient({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filtro, setFiltro] = useState<Role | 'todos'>('todos')
  const [busca, setBusca] = useState('')
  const [aprovacaoTarget, setAprovacaoTarget] = useState<Usuario | null>(null)

  const pendentes  = usuarios.filter(u => !u.aprovado)
  const aprovados  = usuarios.filter(u => u.aprovado)

  // Deep-link via notificação: ?pending=1 — auto-scrolla pra seção pendentes
  useEffect(() => {
    if (searchParams.get('pending') === '1' && pendentes.length > 0) {
      setTimeout(() => {
        document.getElementById('pendentes-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams, pendentes.length])

  const filtrados = aprovados
    .filter((u) => filtro === 'todos' || u.role === filtro)
    .filter((u) =>
      !busca ||
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
    )

  const contagem = {
    admin:                 aprovados.filter((u) => u.role === 'admin').length,
    coordenacao:           aprovados.filter((u) => u.role === 'coordenacao').length,
    lider_area:            aprovados.filter((u) => u.role === 'lider_area').length,
    operador:              aprovados.filter((u) => u.role === 'operador').length,
    coordenador_esportivo: aprovados.filter((u) => u.role === 'coordenador_esportivo').length,
    operador_esportivo:    aprovados.filter((u) => u.role === 'operador_esportivo').length,
  }

  return (
    <div className="space-y-5">

      {/* ═══════════ PENDENTES (destacado no topo) ═══════════ */}
      {pendentes.length > 0 && (
        <section id="pendentes-section" className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-400/30 bg-amber-500/[0.05] px-4 py-3">
            <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-700">
                {pendentes.length} {pendentes.length === 1 ? 'usuário aguardando aprovação' : 'usuários aguardando aprovação'}
              </p>
              <p className="text-[11px] text-amber-700/70">
                Atribua papel e função para liberar o acesso.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pendentes.map(u => (
              <PendingUserCard
                key={u.id}
                u={u}
                onUpdate={() => router.refresh()}
                onApprove={() => setAprovacaoTarget(u)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══════════ APROVADOS ═══════════ */}
      {aprovados.length > 0 && (
        <>
          <div className="border-t border-[var(--border)] pt-5" />
          {/* Resumo por cargo */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.entries(ROLE_META) as [Role, typeof ROLE_META[Role]][]).map(([role, meta]) => {
              const Icon = meta.icon
              return (
                <button
                  key={role}
                  onClick={() => setFiltro(filtro === role ? 'todos' : role)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-all ${
                    filtro === role ? meta.cor : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider">{meta.label}</p>
                    <p className="text-xl font-bold tabular-nums">{contagem[role]}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Busca */}
          <input
            type="search"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30"
          />

          {/* Lista */}
          {filtrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtrados.map((u) => (
                <UsuarioCard key={u.id} u={u} onUpdate={() => router.refresh()} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialog de aprovação */}
      {aprovacaoTarget && (
        <AprovacaoDialog
          user={aprovacaoTarget}
          onClose={() => setAprovacaoTarget(null)}
          onApproved={() => router.refresh()}
        />
      )}
    </div>
  )
}
