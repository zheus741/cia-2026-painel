'use client'

import Link from 'next/link'
import { Trophy, Users, Radio, FileSpreadsheet, Star } from 'lucide-react'

interface Props {
  nome: string
  role: string
  isCoordEsportivo: boolean
  diffDays: number
  eventActive: boolean
}

const cards = [
  {
    href:  '/esportivo',
    label: 'Hub Esportivo',
    meta:  'Tabelas · classificações · resultados',
    icon:  Trophy,
    tone:  '#2e6b42',
    bg:    'rgba(46,107,66,0.08)',
    border:'rgba(46,107,66,0.20)',
  },
  {
    href:  '/atleticas',
    label: 'Atléticas',
    meta:  'Perfis e delegações',
    icon:  Users,
    tone:  '#2563eb',
    bg:    'rgba(37,99,235,0.07)',
    border:'rgba(37,99,235,0.18)',
  },
  {
    href:  '/placar',
    label: 'Placar Ao Vivo',
    meta:  'Jogos em andamento',
    icon:  Radio,
    tone:  '#c0392b',
    bg:    'rgba(192,57,43,0.07)',
    border:'rgba(192,57,43,0.18)',
  },
  {
    href:  '/esportivo/super-8',
    label: 'Liga Super 8',
    meta:  'Chaveamento e fase final',
    icon:  Star,
    tone:  '#8a5f06',
    bg:    'rgba(138,95,6,0.07)',
    border:'rgba(138,95,6,0.18)',
  },
] as const

const ROLE_LABEL: Record<string, string> = {
  coordenador_esportivo: 'Coord. Esportivo',
  operador_esportivo:    'Op. Esportivo',
}

export function HomeEsportivo({ nome, role, isCoordEsportivo, diffDays, eventActive }: Props) {
  const firstName = nome.trim().split(' ')[0]
  const roleName  = ROLE_LABEL[role] ?? role

  const countdown = eventActive
    ? 'Evento em andamento'
    : diffDays > 0
      ? `${diffDays} dia${diffDays !== 1 ? 's' : ''} para a CIA`
      : 'CIA 2026 encerrada'

  return (
    <main className="relative z-10 flex-1 overflow-y-auto">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div
        className="border-b px-6 py-10"
        style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
      >
        <p
          className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--green)' }}
        >
          {roleName}
        </p>
        <h1
          className="text-3xl font-extrabold tracking-tight md:text-4xl"
          style={{ color: 'var(--foreground)', letterSpacing: '-0.03em' }}
        >
          Olá, {firstName}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {countdown}
        </p>
      </div>

      {/* ── Cards esportivos ─────────────────────────────────── */}
      <div className="px-6 py-8">
        <p
          className="mb-5 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Painel esportivo
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map(({ href, label, meta, icon: Icon, tone, bg, border }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border p-5 transition-all hover:scale-[1.01] hover:shadow-md"
              style={{ background: bg, borderColor: border }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${tone}18`, border: `1px solid ${tone}30` }}
              >
                <Icon className="h-5 w-5" style={{ color: tone }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                  {label}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {meta}
                </p>
              </div>
            </Link>
          ))}

          {/* Importar tabela — só coord_esportivo */}
          {isCoordEsportivo && (
            <Link
              href="/esportivo/importar"
              className="group flex items-center gap-4 rounded-2xl border p-5 transition-all hover:scale-[1.01] hover:shadow-md sm:col-span-2"
              style={{ background: 'rgba(10,15,11,0.03)', borderColor: 'var(--border)' }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(10,15,11,0.06)', border: '1px solid rgba(10,15,11,0.12)' }}
              >
                <FileSpreadsheet className="h-5 w-5" style={{ color: 'var(--foreground)' }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                  Importar Tabela
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  Atualizar jogos, modalidades e setores do próximo dia
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
