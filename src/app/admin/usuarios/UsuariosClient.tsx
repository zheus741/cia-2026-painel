'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updateRole, updateFuncao, toggleAtivo } from './actions'
import { Shield, UserCog, Users, Crown, Power, PowerOff } from 'lucide-react'

type Role = 'admin' | 'coordenacao' | 'lider_area' | 'operador'
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
}

const ROLE_META: Record<Role, { label: string; cor: string; icon: typeof Shield }> = {
  admin:       { label: 'Admin',       cor: 'text-red-600 bg-red-50 border-red-200',             icon: Crown },
  coordenacao: { label: 'Coordenação', cor: 'text-yellow-700 bg-yellow-50 border-yellow-200',    icon: Shield },
  lider_area:  { label: 'Líder',       cor: 'text-purple-700 bg-purple-50 border-purple-200',    icon: UserCog },
  operador:    { label: 'Operador',    cor: 'text-[var(--green-bright)] bg-[var(--green-dim)]/30 border-[var(--green-dim)]/40', icon: Users },
}

const FUNCOES = [
  { value: '',            label: '— sem função —' },
  { value: 'foto',        label: '📷 Foto' },
  { value: 'video',       label: '🎬 Vídeo' },
  { value: 'social',      label: '📱 Social Media' },
  { value: 'reporter',    label: '🎤 Repórter' },
  { value: 'editor',      label: '✂️ Editor' },
  { value: 'drone',       label: '🚁 Drone' },
  { value: 'roaming',     label: '🏃 Roaming' },
  { value: 'coordenacao', label: '📋 Coordenação' },
  { value: 'producao',    label: '⚙️ Produção' },
  { value: 'design',      label: '🎨 Design' },
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

export function UsuariosClient({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<Role | 'todos'>('todos')
  const [busca, setBusca] = useState('')

  const filtrados = usuarios
    .filter((u) => filtro === 'todos' || u.role === filtro)
    .filter((u) =>
      !busca ||
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
    )

  const contagem = {
    admin:       usuarios.filter((u) => u.role === 'admin').length,
    coordenacao: usuarios.filter((u) => u.role === 'coordenacao').length,
    lider_area:  usuarios.filter((u) => u.role === 'lider_area').length,
    operador:    usuarios.filter((u) => u.role === 'operador').length,
  }

  return (
    <div className="space-y-4">
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
    </div>
  )
}
