import type React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  BookOpen, MapPin, Radio, Trophy, Users, GitBranch,
  Aperture, Users2, UserCircle, Calendar, Zap,
} from 'lucide-react'

interface Props {
  userId:      string
  nome:        string
  role:        string
  isLider:     boolean
  diffDays:    number
  eventActive: boolean
}

const ROLE_LABEL: Record<string, string> = {
  lider_fv:    'Líder FV',
  operador_fv: 'Operador FV',
}

// ── Quick access card definitions ──────────────────────────────────────────────

interface QuickCard {
  href:   string
  label:  string
  meta:   string
  icon:   React.ComponentType<{ style?: React.CSSProperties; className?: string }>
  tone:   string
  bg:     string
  border: string
}

const BASE_CARDS: QuickCard[] = [
  {
    href:   '/wiki',
    label:  'Wiki',
    meta:   'Guias e referências',
    icon:   BookOpen,
    tone:   '#2563eb',
    bg:     'rgba(37,99,235,0.07)',
    border: 'rgba(37,99,235,0.18)',
  },
  {
    href:   '/mapa',
    label:  'Mapa Ao Vivo',
    meta:   'Localização em tempo real',
    icon:   MapPin,
    tone:   '#2e6b42',
    bg:     'rgba(46,107,66,0.07)',
    border: 'rgba(46,107,66,0.18)',
  },
  {
    href:   '/esportivo',
    label:  'Hub Esportivo',
    meta:   'Tabelas · classificações · resultados',
    icon:   Trophy,
    tone:   '#2e6b42',
    bg:     'rgba(46,107,66,0.06)',
    border: 'rgba(46,107,66,0.15)',
  },
  {
    href:   '/atleticas',
    label:  'Atléticas',
    meta:   'Perfis e delegações',
    icon:   Users,
    tone:   '#2563eb',
    bg:     'rgba(37,99,235,0.07)',
    border: 'rgba(37,99,235,0.18)',
  },
  {
    href:   '/esportivo/chaveamento',
    label:  'Chaveamento',
    meta:   'Fase eliminatória e brackets',
    icon:   GitBranch,
    tone:   '#92400e',
    bg:     'rgba(146,64,14,0.07)',
    border: 'rgba(146,64,14,0.18)',
  },
]

const PLACAR_CARD: QuickCard = {
  href:   '/placar',
  label:  'Placar Ao Vivo',
  meta:   'Jogos em andamento',
  icon:   Radio,
  tone:   '#c0392b',
  bg:     'rgba(192,57,43,0.07)',
  border: 'rgba(192,57,43,0.18)',
}

const ESCALA_FV_CARD: QuickCard = {
  href:   '/escala-av',
  label:  'Escala FV',
  meta:   'Designar operadores foto/vídeo',
  icon:   Aperture,
  tone:   '#7c3aed',
  bg:     'rgba(124,58,237,0.08)',
  border: 'rgba(124,58,237,0.22)',
}

const PERFIL_CARD: QuickCard = {
  href:   '/perfil',
  label:  'Meu Perfil',
  meta:   'Dados e configurações',
  icon:   UserCircle,
  tone:   '#64748b',
  bg:     'rgba(100,116,139,0.07)',
  border: 'rgba(100,116,139,0.15)',
}

// ── Component ──────────────────────────────────────────────────────────────────

export async function HomeFotoVideo({
  userId,
  nome,
  role,
  isLider,
  diffDays,
  eventActive,
}: Props) {
  const supabase = await createClient()

  const { data: meusConteudos } = await supabase
    .from('conteudos')
    .select('id, status')
    .or(`responsavel_captacao_id.eq.${userId},responsavel_edicao_id.eq.${userId}`)
    .not('status', 'in', '(arquivado,cancelado)')

  const stats = {
    total:       meusConteudos?.length ?? 0,
    publicado:   meusConteudos?.filter(c => c.status === 'publicado').length ?? 0,
    em_producao: meusConteudos?.filter(c =>
      ['em_andamento', 'pendente', 'pausado', 'em_producao'].includes(c.status)
    ).length ?? 0,
  }

  const firstName = nome.trim().split(' ')[0]
  const roleName  = ROLE_LABEL[role] ?? role

  const countdownStatus = eventActive
    ? { label: 'Evento em andamento', icon: Zap,      bg: 'rgba(220,38,38,0.10)',   color: '#DC2626', border: 'rgba(220,38,38,0.28)' }
    : diffDays > 0
      ? { label: `${diffDays} dia${diffDays !== 1 ? 's' : ''} para a CIA`, icon: Calendar, bg: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: 'rgba(124,58,237,0.28)' }
      : { label: 'CIA 2026 encerrada', icon: Calendar, bg: 'rgba(148,163,184,0.10)', color: '#64748b', border: 'rgba(148,163,184,0.28)' }
  const CountdownIcon = countdownStatus.icon

  // Build card list
  const placarCardWithPulse = { ...PLACAR_CARD, pulse: eventActive }
  const cards: (QuickCard & { pulse?: boolean })[] = [
    ...BASE_CARDS,
    placarCardWithPulse,
    ...(isLider ? [ESCALA_FV_CARD] : []),
    PERFIL_CARD,
  ]

  return (
    <main className="relative z-10 flex-1 overflow-y-auto">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div
        className="border-b px-6 py-10"
        style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
      >
        <p
          className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: '#7c3aed' }}
        >
          {roleName}
        </p>
        <h1
          className="text-3xl font-extrabold tracking-tight md:text-4xl"
          style={{ color: 'var(--foreground)', letterSpacing: '-0.03em' }}
        >
          Olá, {firstName}
        </h1>
        <div className="mt-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              background:  countdownStatus.bg,
              color:       countdownStatus.color,
              borderColor: countdownStatus.border,
            }}
          >
            <CountdownIcon className={`h-3.5 w-3.5 ${eventActive ? 'animate-pulse' : ''}`} />
            {countdownStatus.label}
          </span>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <div className="border-b px-6 py-5" style={{ borderColor: 'var(--border)' }}>
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Meus conteúdos
        </p>
        <div className="grid grid-cols-3 gap-3">
          {/* Total */}
          <div
            className="rounded-xl border p-3 text-center"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <p
              className="text-2xl font-extrabold tabular-nums"
              style={{ color: 'var(--foreground)' }}
            >
              {stats.total}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Total
            </p>
          </div>

          {/* Publicados */}
          <div
            className="rounded-xl border p-3 text-center"
            style={{ background: 'rgba(46,107,66,0.06)', borderColor: 'rgba(46,107,66,0.18)' }}
          >
            <p
              className="text-2xl font-extrabold tabular-nums"
              style={{ color: 'var(--green-bright, #4ade80)' }}
            >
              {stats.publicado}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Publicados
            </p>
          </div>

          {/* Em produção */}
          <div
            className="rounded-xl border p-3 text-center"
            style={{ background: 'rgba(124,58,237,0.07)', borderColor: 'rgba(124,58,237,0.20)' }}
          >
            <p
              className="text-2xl font-extrabold tabular-nums"
              style={{ color: '#7c3aed' }}
            >
              {stats.em_producao}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              Em produção
            </p>
          </div>
        </div>

        <div className="mt-3 text-center">
          <Link
            href="/perfil"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: '#7c3aed' }}
          >
            Ver meus conteúdos →
          </Link>
        </div>
      </div>

      {/* ── Quick access grid ─────────────────────────────────── */}
      <div className="px-6 py-8">
        <p
          className="mb-5 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Acesso rápido
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map(({ href, label, meta, icon: Icon, tone, bg, border, pulse }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl border p-4 transition-all hover:scale-[1.01] hover:shadow-md"
              style={{ background: bg, borderColor: border }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${tone}18`, border: `1px solid ${tone}30` }}
              >
                <Icon
                  className={pulse ? 'animate-pulse' : ''}
                  style={{ width: 18, height: 18, color: tone }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                  {label}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug" style={{ color: 'var(--muted-foreground)' }}>
                  {meta}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
