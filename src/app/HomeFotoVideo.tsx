import type React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowUpRight, Camera, Video, Aperture, MapPin, Radio,
  Trophy, BookOpen, UserCircle, Calendar, Zap, Bell, Music,
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

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'
const SANS = 'var(--font-dm-sans), system-ui, sans-serif'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateLong(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function CircleArrow({ size = 40, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <span
      className="cia-circle-arrow"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: dark ? '#0A0F0B' : '#FFFFFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(10,15,11,0.18)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <ArrowUpRight
        style={{
          width: size * 0.42, height: size * 0.42,
          color: dark ? '#FFFFFF' : '#0A0F0B',
          strokeWidth: 2,
        }}
      />
    </span>
  )
}

function Pill({ children, bg = 'rgba(10,15,11,0.08)', color = '#0A0F0B' }: {
  children: React.ReactNode; bg?: string; color?: string
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 11px', borderRadius: 999,
      background: bg, color,
      fontSize: 11.5, fontWeight: 600,
      letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

// ── Quick access (bento grid) ────────────────────────────────────────────────

interface QuickCard {
  href:   string
  label:  string
  meta:   string
  icon:   React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>
  tone:   'lavender' | 'gold' | 'electric' | 'terracotta' | 'green' | 'cream'
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface MeuTurno {
  id:           string
  inicio:       string | null
  fim:          string | null
  funcao:       string
  status:       string | null
  setor_nome:   string | null
  parceiro_nome: string | null
  parceiro_cor: string | null
  jogo: {
    inicio: string | null
    equipe_a: string | null
    equipe_b: string | null
    divisao: string | null
    status: string | null
  } | null
}

// ── Componente ───────────────────────────────────────────────────────────────

export async function HomeFotoVideo({
  userId, nome, role, isLider, diffDays, eventActive,
}: Props) {
  const supabase = await createClient()

  // ── Fetches paralelos ──
  const now = new Date()
  const nowIso = now.toISOString()

  const [conteudosRes, meusTurnosRes, globalTurnosRes] = await Promise.all([
    supabase
      .from('conteudos')
      .select('id, status')
      .or(`responsavel_captacao_id.eq.${userId},responsavel_edicao_id.eq.${userId}`)
      .not('status', 'in', '(arquivado,cancelado)'),

    // Próximos 6 turnos do usuário com setor/parceiro/jogo
    supabase
      .from('turnos')
      .select(`
        id, inicio, fim, funcao, status_escala,
        setor:setores(nome),
        parceiro:parceiros(nome, cor_hex),
        jogo:jogos(inicio, equipe_a_nome, equipe_b_nome, divisao, status)
      `)
      .eq('user_id', userId)
      .in('funcao', ['foto', 'video'])
      .or(`fim.is.null,fim.gte.${nowIso}`)
      .order('inicio', { ascending: true, nullsFirst: false })
      .limit(6),

    // Estatísticas globais do núcleo FV — só lider pode ver gauge
    isLider
      ? supabase
          .from('turnos')
          .select('id, user_id, parceiro_id', { count: 'exact' })
          .eq('edicao_id', EDICAO_ID)
          .in('funcao', ['foto', 'video'])
      : Promise.resolve({ data: null, count: null }),
  ])

  const conteudos = conteudosRes.data ?? []
  const stats = {
    total:       conteudos.length,
    publicado:   conteudos.filter(c => c.status === 'publicado').length,
    em_producao: conteudos.filter(c =>
      ['em_andamento', 'pendente', 'pausado', 'em_producao'].includes(c.status),
    ).length,
  }

  // Normaliza meus turnos
  const meusTurnos: MeuTurno[] = (meusTurnosRes.data ?? []).map((r: Record<string, unknown>) => {
    const arr = <T,>(v: unknown): T | null => Array.isArray(v) ? (v[0] as T ?? null) : ((v ?? null) as T | null)
    const setor    = arr<{ nome: string }>(r.setor)
    const parceiro = arr<{ nome: string; cor_hex: string }>(r.parceiro)
    const jogo     = arr<{ inicio: string | null; equipe_a_nome: string | null; equipe_b_nome: string | null; divisao: string | null; status: string | null }>(r.jogo)
    return {
      id:            r.id as string,
      inicio:        r.inicio as string | null,
      fim:           r.fim as string | null,
      funcao:        r.funcao as string,
      status:        r.status_escala as string | null,
      setor_nome:    setor?.nome ?? null,
      parceiro_nome: parceiro?.nome ?? null,
      parceiro_cor:  parceiro?.cor_hex ?? null,
      jogo:          jogo ? {
        inicio:   jogo.inicio,
        equipe_a: jogo.equipe_a_nome,
        equipe_b: jogo.equipe_b_nome,
        divisao:  jogo.divisao,
        status:   jogo.status,
      } : null,
    }
  })

  // Gauge global (líder)
  const globalTurnos = (globalTurnosRes.data ?? []) as Array<{ user_id: string | null; parceiro_id: string | null }>
  const totalSlots   = globalTurnos.length
  const slotsAtribuidos = globalTurnos.filter(t => t.user_id !== null).length
  const slotsAtribuidosPct = totalSlots > 0 ? Math.round((slotsAtribuidos / totalSlots) * 100) : 0

  const firstName = nome.trim().split(' ')[0]
  const roleName  = ROLE_LABEL[role] ?? role

  // Próximo turno em destaque
  const proximoTurno = meusTurnos[0] ?? null
  const demaisTurnos = meusTurnos.slice(1)

  // Acesso rápido (bento grid)
  const quickCards: QuickCard[] = [
    { href: '/conteudos',  label: 'Conteúdos',   meta: 'Meus uploads e edições',   icon: Camera,     tone: 'lavender'   },
    { href: '/minha-escala', label: 'Minha Escala', meta: 'Turnos completos · briefing', icon: Aperture, tone: 'electric'   },
    ...(isLider ? [{ href: '/admin/escala-av' as const, label: 'Escala FV', meta: 'Designar operadores',   icon: Aperture, tone: 'terracotta' as const }] : []),
    { href: '/mapa',        label: 'Mapa Ao Vivo', meta: 'Setores em tempo real',   icon: MapPin,     tone: 'green'      },
    { href: '/placar',      label: 'Placar',       meta: 'Jogos em andamento',      icon: Radio,      tone: 'terracotta' },
    { href: '/esportivo',   label: 'Esportivo',    meta: 'Tabelas e brackets',      icon: Trophy,     tone: 'gold'       },
    ...(isLider ? [{ href: '/lineup' as const, label: 'Line Up', meta: 'Programação musical', icon: Music, tone: 'lavender' as const }] : []),
    { href: '/wiki',        label: 'Wiki',         meta: 'Guias e padrões',         icon: BookOpen,   tone: 'cream'      },
    { href: '/perfil',      label: 'Meu Perfil',   meta: 'Dados e config',          icon: UserCircle, tone: 'cream'      },
  ]

  // Countdown
  const countdownStatus = eventActive
    ? { label: 'Evento em andamento', icon: Zap,      bg: 'rgba(220,38,38,0.10)',   color: '#DC2626', border: 'rgba(220,38,38,0.28)' }
    : diffDays > 0
      ? { label: `${diffDays} dia${diffDays !== 1 ? 's' : ''} para a CIA`, icon: Calendar, bg: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: 'rgba(124,58,237,0.28)' }
      : { label: 'CIA 2026 encerrada', icon: Calendar, bg: 'rgba(148,163,184,0.10)', color: '#64748b', border: 'rgba(148,163,184,0.28)' }
  const CountdownIcon = countdownStatus.icon

  return (
    <main className="relative z-10 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1640px] px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12">

        {/* ═════════════════════════════════════════════════════════════════
            HERO
            ═════════════════════════════════════════════════════════════════ */}
        <header className="flex flex-wrap items-end justify-between gap-4" style={{ marginBottom: 28 }}>
          <div>
            <p style={{
              fontSize: 10.5, fontWeight: 800,
              color: '#7c3aed',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Foto & Vídeo · {roleName}
            </p>
            <h1 style={{
              fontFamily: SANS,
              fontSize: 'clamp(34px, 4.5vw, 56px)',
              fontWeight: 800,
              letterSpacing: '-0.045em',
              lineHeight: 0.95,
              color: '#0A0F0B',
            }}>
              Núcleo Foto & Vídeo
            </h1>
            <p style={{
              marginTop: 8,
              fontSize: 14, fontWeight: 500,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '-0.01em',
              maxWidth: 580,
            }}>
              {isLider
                ? 'Escala da equipe, conteúdos da edição e atalhos pros módulos esportivo e festivo.'
                : 'Sua agenda, conteúdos sob sua responsabilidade e atalhos pros módulos operacionais.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
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
        </header>

        {/* ═════════════════════════════════════════════════════════════════
            CARDS GRANDES — lado a lado
            ═════════════════════════════════════════════════════════════════ */}
        <div
          className="grid gap-3 md:gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: 28 }}
        >
          {/* CARD ESQUERDO: meus conteúdos (gauge) */}
          <ConteudosGauge
            total={stats.total}
            publicado={stats.publicado}
            em_producao={stats.em_producao}
          />

          {/* CARD DIREITO: próximo turno OU gauge do núcleo (líder) */}
          {proximoTurno ? (
            <ProximoTurnoCard turno={proximoTurno} />
          ) : isLider && totalSlots > 0 ? (
            <CoberturaGauge total={totalSlots} atribuidos={slotsAtribuidos} pct={slotsAtribuidosPct} />
          ) : (
            <SemEscalaCard firstName={firstName} isLider={isLider} />
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            PRÓXIMAS ESCALAS — strip horizontal
            ═════════════════════════════════════════════════════════════════ */}
        {demaisTurnos.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
              <h3 style={{
                fontFamily: SANS,
                fontSize: 'clamp(22px, 2.6vw, 32px)',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.025em',
                color: '#0A0F0B',
              }}>
                Próximas escalas
              </h3>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: 'rgba(10,15,11,0.40)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {demaisTurnos.length} {demaisTurnos.length === 1 ? 'turno' : 'turnos'}
              </span>
            </div>

            <div
              className="flex gap-3 overflow-x-auto"
              style={{ paddingBottom: 6, scrollSnapType: 'x mandatory' }}
            >
              {demaisTurnos.map(t => (
                <TurnoStripCard key={t.id} turno={t} />
              ))}
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            ACESSO RÁPIDO — bento grid
            ═════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
            <h3 style={{
              fontFamily: SANS,
              fontSize: 'clamp(22px, 2.6vw, 32px)',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.025em',
              color: '#0A0F0B',
            }}>
              Acesso rápido
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: 'rgba(10,15,11,0.40)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {quickCards.length} módulos
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {quickCards.map((c, idx) => <BentoCard key={c.href} card={c} idx={idx} />)}
          </div>
        </section>

      </div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function ConteudosGauge({
  total, publicado, em_producao,
}: { total: number; publicado: number; em_producao: number }) {
  const pct = total > 0 ? Math.round((publicado / total) * 100) : 0

  return (
    <Link href="/conteudos" className="cia-edit-card cia-edit-card--cream group">
      <div className="flex items-start justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
        }}>
          meus conteúdos
        </span>
        <Pill bg="rgba(124,58,237,0.10)" color="#7c3aed">
          <Camera size={11} /> {total === 0 ? 'sem itens' : pct >= 70 ? 'no ritmo' : pct >= 30 ? 'em curso' : 'inicial'}
        </Pill>
      </div>

      <div className="flex-1 flex flex-col justify-center" style={{ marginTop: 16 }}>
        <div className="flex items-baseline gap-2">
          <span style={{
            fontFamily: SANS,
            fontSize: 'clamp(64px, 7vw, 108px)',
            fontWeight: 800,
            lineHeight: 0.85,
            letterSpacing: '-0.05em',
            color: '#0A0F0B',
          }}>
            {total}
          </span>
          <span style={{
            fontSize: 14, fontWeight: 500,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '-0.01em',
          }}>
            {total === 1 ? 'conteúdo' : 'conteúdos'} no escopo
          </span>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-4" style={{ marginTop: 14, flexWrap: 'wrap' }}>
            <div className="flex items-baseline gap-1.5">
              <span style={{
                fontFamily: SANS,
                fontSize: 26, fontWeight: 800,
                color: '#2e6b42',
                letterSpacing: '-0.02em',
              }}>
                {publicado}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '0.10em', textTransform: 'uppercase',
              }}>
                publicados
              </span>
            </div>
            <div style={{ height: 16, width: 1, background: 'rgba(10,15,11,0.12)' }} />
            <div className="flex items-baseline gap-1.5">
              <span style={{
                fontFamily: SANS,
                fontSize: 26, fontWeight: 800,
                color: '#7c3aed',
                letterSpacing: '-0.02em',
              }}>
                {em_producao}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '0.10em', textTransform: 'uppercase',
              }}>
                em produção
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
        <span style={{ fontSize: 13, color: 'rgba(10,15,11,0.62)', fontWeight: 600 }}>
          Abrir meus conteúdos
        </span>
        <CircleArrow size={40} />
      </div>
    </Link>
  )
}

function ProximoTurnoCard({ turno }: { turno: MeuTurno }) {
  const funcaoIcon = turno.funcao === 'foto' ? Camera : Video
  const Icon = funcaoIcon

  return (
    <Link href="/minha-escala" className="cia-edit-card cia-edit-card--lavender group">
      <div className="flex items-start justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(45,27,92,0.65)',
          letterSpacing: '-0.01em',
        }}>
          próxima escala
        </span>
        <Pill bg="rgba(45,27,92,0.12)" color="#2D1B5C">
          <Icon size={11} /> {turno.funcao.toUpperCase()}
        </Pill>
      </div>

      <div className="flex-1 flex flex-col justify-center" style={{ marginTop: 16 }}>
        <p style={{
          fontSize: 10.5, fontWeight: 800,
          color: 'rgba(45,27,92,0.65)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          {fmtDateLong(turno.inicio)}
        </p>

        <p style={{
          fontFamily: SANS,
          fontSize: 'clamp(28px, 3.4vw, 44px)',
          fontWeight: 800,
          lineHeight: 0.95,
          letterSpacing: '-0.035em',
          color: '#0A0F0B',
          marginBottom: 10,
        }}>
          {turno.setor_nome ?? 'Sem setor'}
        </p>

        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 10 }}>
          <span style={{
            fontFamily: SANS,
            fontSize: 18, fontWeight: 700,
            color: '#0A0F0B',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtTime(turno.inicio)}
            {turno.fim && (
              <>
                <span style={{ margin: '0 6px', color: 'rgba(10,15,11,0.30)', fontSize: 14 }}>→</span>
                {fmtTime(turno.fim)}
              </>
            )}
          </span>
          {turno.parceiro_nome && (
            <span style={{
              padding: '3px 9px',
              borderRadius: 999,
              fontSize: 10, fontWeight: 800,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              background: `${turno.parceiro_cor ?? '#2D1B5C'}1F`,
              color:       turno.parceiro_cor ?? '#2D1B5C',
              border:      `1px solid ${turno.parceiro_cor ?? '#2D1B5C'}40`,
            }}>
              {turno.parceiro_nome}
            </span>
          )}
        </div>

        {turno.jogo && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              background: turno.jogo.status === 'ao_vivo' ? 'rgba(220,38,38,0.10)' : 'rgba(255,255,255,0.55)',
              border: '1px solid ' + (turno.jogo.status === 'ao_vivo' ? 'rgba(220,38,38,0.32)' : 'rgba(45,27,92,0.10)'),
            }}
          >
            <p style={{
              fontSize: 9.5, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: turno.jogo.status === 'ao_vivo' ? '#dc2626' : 'rgba(45,27,92,0.65)',
              marginBottom: 2,
            }}>
              {turno.jogo.status === 'ao_vivo' ? '● Jogo ao vivo' : 'Jogo em foco'}
              {turno.jogo.divisao && <span style={{ opacity: 0.65, marginLeft: 8 }}>· {turno.jogo.divisao}</span>}
            </p>
            <p style={{
              fontFamily: SANS,
              fontSize: 14, fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#0A0F0B',
            }}>
              {turno.jogo.equipe_a ?? '?'}
              <span style={{ margin: '0 6px', color: 'rgba(10,15,11,0.30)' }}>×</span>
              {turno.jogo.equipe_b ?? '?'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
        <span style={{ fontSize: 13, color: 'rgba(45,27,92,0.62)', fontWeight: 600 }}>
          Ver minha escala completa
        </span>
        <CircleArrow size={40} />
      </div>
    </Link>
  )
}

function CoberturaGauge({ total, atribuidos, pct }: { total: number; atribuidos: number; pct: number }) {
  const status =
    pct >= 90 ? 'completa'  :
    pct >= 60 ? 'em curso'  :
    pct >= 30 ? 'parcial'   :
                'inicial'

  return (
    <Link href="/admin/escala-av" className="cia-edit-card cia-edit-card--terracotta group">
      <div className="flex items-start justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: '-0.01em',
        }}>
          cobertura da equipe
        </span>
        <Pill bg="rgba(255,255,255,0.20)" color="#FFFFFF">
          <Aperture size={11} /> {status}
        </Pill>
      </div>

      <div className="flex-1 flex flex-col justify-center" style={{ marginTop: 16 }}>
        <div className="flex items-baseline gap-2">
          <span style={{
            fontFamily: SANS,
            fontSize: 'clamp(72px, 8vw, 124px)',
            fontWeight: 800,
            lineHeight: 0.85,
            letterSpacing: '-0.05em',
            color: '#FFFFFF',
          }}>
            {pct}
          </span>
          <span style={{
            fontFamily: SANS,
            fontSize: 28, fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '-0.02em',
          }}>
            %
          </span>
        </div>
        <span style={{
          fontSize: 14, fontWeight: 500,
          color: 'rgba(255,255,255,0.78)',
          letterSpacing: '-0.01em',
          marginTop: 6,
        }}>
          {atribuidos} de {total} slots com colaborador
        </span>

        {/* Progress bar */}
        <div style={{
          marginTop: 16, height: 8, borderRadius: 4, overflow: 'hidden',
          background: 'rgba(255,255,255,0.20)',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: '#FFFFFF',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', fontWeight: 600 }}>
          Abrir escala FV
        </span>
        <CircleArrow size={40} dark={false} />
      </div>
    </Link>
  )
}

function SemEscalaCard({ firstName, isLider }: { firstName: string; isLider: boolean }) {
  return (
    <Link
      href={isLider ? '/admin/escala-av' : '/minha-escala'}
      className="cia-edit-card cia-edit-card--gold group"
    >
      <div className="flex items-start justify-between">
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: 'rgba(70,50,5,0.65)',
          letterSpacing: '-0.01em',
        }}>
          sua agenda
        </span>
        <Pill bg="rgba(70,50,5,0.12)" color="#46320C">
          <Bell size={11} /> livre
        </Pill>
      </div>

      <div className="flex-1 flex flex-col justify-center" style={{ marginTop: 16 }}>
        <p style={{
          fontFamily: SANS,
          fontSize: 'clamp(28px, 3.6vw, 44px)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: '#0A0F0B',
          marginBottom: 10,
        }}>
          Sem escala<br />no momento.
        </p>
        <p style={{
          fontSize: 14, fontWeight: 500,
          color: 'rgba(10,15,11,0.62)',
          letterSpacing: '-0.01em',
          maxWidth: 320,
        }}>
          {firstName}, sua próxima designação aparece aqui assim que for criada.
        </p>
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
        <span style={{ fontSize: 13, color: 'rgba(70,50,5,0.62)', fontWeight: 600 }}>
          {isLider ? 'Abrir escala da equipe' : 'Ver minha escala'}
        </span>
        <CircleArrow size={40} />
      </div>
    </Link>
  )
}

function TurnoStripCard({ turno }: { turno: MeuTurno }) {
  const Icon = turno.funcao === 'foto' ? Camera : Video
  const tone = turno.funcao === 'foto' ? '#7c3aed' : '#1a5c5c'
  const isLive = turno.jogo?.status === 'ao_vivo'

  return (
    <Link
      href="/minha-escala"
      style={{
        flexShrink: 0,
        width: 280,
        padding: 16,
        background: '#FAF7F0',
        borderRadius: 18,
        border: '1px solid rgba(10,15,11,0.08)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        scrollSnapAlign: 'start',
        textDecoration: 'none',
      }}
      className="hover:-translate-y-0.5 hover:shadow-md hover:border-[rgba(10,15,11,0.18)]"
    >
      {/* Função + data */}
      <div className="flex items-center gap-1.5" style={{ marginBottom: 12 }}>
        <Icon size={13} strokeWidth={2.4} style={{ color: tone }} />
        <span style={{
          fontSize: 10.5, fontWeight: 800,
          color: tone,
          letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          {turno.funcao}
        </span>
        {isLive && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 9, fontWeight: 800,
            color: '#dc2626',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 4,
            background: 'rgba(220,38,38,0.10)',
          }}>
            ● ao vivo
          </span>
        )}
        {!isLive && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 10.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.50)',
            letterSpacing: '0.04em',
          }}>
            {fmtDateLong(turno.inicio)}
          </span>
        )}
      </div>

      {/* Setor */}
      <p style={{
        fontFamily: SANS,
        fontSize: 18, fontWeight: 800,
        lineHeight: 1.15,
        letterSpacing: '-0.025em',
        color: '#0A0F0B',
        marginBottom: 6,
      }}>
        {turno.setor_nome ?? 'Sem setor'}
      </p>

      {/* Horário + parceiro */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 10 }}>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: 'rgba(10,15,11,0.62)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtTime(turno.inicio)}
          {turno.fim && <> – {fmtTime(turno.fim)}</>}
        </span>
        {turno.parceiro_nome && (
          <span style={{
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 9, fontWeight: 800,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            background: `${turno.parceiro_cor ?? '#0A0F0B'}1F`,
            color:       turno.parceiro_cor ?? '#0A0F0B',
            border:      `1px solid ${turno.parceiro_cor ?? '#0A0F0B'}40`,
          }}>
            {turno.parceiro_nome}
          </span>
        )}
      </div>

      {/* Jogo */}
      {turno.jogo ? (
        <p style={{
          fontSize: 12, fontWeight: 700,
          color: isLive ? '#dc2626' : 'rgba(10,15,11,0.65)',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          paddingTop: 8,
          borderTop: '1px solid rgba(10,15,11,0.08)',
        }}>
          {turno.jogo.equipe_a ?? '?'}
          <span style={{ margin: '0 5px', color: 'rgba(10,15,11,0.30)' }}>×</span>
          {turno.jogo.equipe_b ?? '?'}
        </p>
      ) : (
        <p style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(10,15,11,0.40)',
          letterSpacing: '-0.01em',
          fontStyle: 'italic',
          paddingTop: 8,
          borderTop: '1px solid rgba(10,15,11,0.08)',
        }}>
          Cobertura geral do setor
        </p>
      )}
    </Link>
  )
}

function BentoCard({ card, idx }: { card: QuickCard; idx: number }) {
  const Icon = card.icon
  const toneClass = `cia-edit-card cia-edit-card--${card.tone}`
  // arrow dark sobre tones claros, white sobre tones escuros
  const arrowDark = card.tone === 'lavender' || card.tone === 'gold' || card.tone === 'cream'
  const textColor = card.tone === 'electric' || card.tone === 'terracotta' || card.tone === 'green'
    ? '#FFFFFF'
    : '#0A0F0B'
  const textMuted = card.tone === 'electric' || card.tone === 'terracotta' || card.tone === 'green'
    ? 'rgba(255,255,255,0.70)'
    : 'rgba(10,15,11,0.55)'

  return (
    <Link
      href={card.href}
      className={`${toneClass} cia-quick-card`}
      style={{ animationDelay: `${idx * 35}ms`, minHeight: 130 }}
    >
      <div className="flex items-start justify-between">
        <Icon
          size={20}
          strokeWidth={1.8}
          style={{ color: textColor, opacity: 0.85 }}
        />
        <CircleArrow size={32} dark={arrowDark} />
      </div>

      <div className="flex-1 flex flex-col justify-end" style={{ marginTop: 16 }}>
        <span style={{
          fontFamily: SANS,
          fontSize: 'clamp(18px, 1.8vw, 22px)',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          color: textColor,
        }}>
          {card.label}
        </span>
        <span style={{
          marginTop: 4,
          fontSize: 11.5, fontWeight: 500,
          color: textMuted,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}>
          {card.meta}
        </span>
      </div>
    </Link>
  )
}
