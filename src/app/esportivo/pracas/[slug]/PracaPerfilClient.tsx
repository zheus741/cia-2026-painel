'use client'

/**
 * PracaPerfilClient — perfil completo de um local esportivo.
 *
 * Estrutura:
 * 1. Hero: nome do local + breadcrumb + countdown stats
 * 2. Hero card duplo: estado geral + quem está ao vivo agora
 * 3. Grid de quadras: 1 card por quadra com status individual (clicável = filtra)
 * 4. Timeline cronológica de todos os jogos (filtrável por quadra)
 * 5. Lista de atléticas + modalidades agregadas
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Radio, MapPin, Clock, Trophy, X } from 'lucide-react'
import type { LocalAgrupado, QuadraDoLocal } from '@/lib/competicao/pracas-grupos'

const SANS = 'var(--font-dm-sans), system-ui, sans-serif'

// ── Types ────────────────────────────────────────────────────────────────────

interface JogoDetalhado {
  id:            string
  setor_id:      string | null
  setor_nome:    string
  modalidade:    string | null
  modalidade_icone: string | null
  categoria:     string | null
  divisao:       string | null
  fase:          string | null
  inicio:        string | null
  fim_previsto:  string | null
  status:        string | null
  placar_a:      number | null
  placar_b:      number | null
  wo:            'a' | 'b' | 'duplo' | null
  equipe_a_id:   string | null
  equipe_b_id:   string | null
  equipe_a_nome: string | null
  equipe_b_nome: string | null
}

interface Props {
  local: LocalAgrupado
  jogos: JogoDetalhado[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}
function fmtDateLong(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo',
  })
}

// ── Componente principal ─────────────────────────────────────────────────────

export function PracaPerfilClient({ local, jogos }: Props) {
  // Filtro por quadra (null = todas)
  const [quadraFiltro, setQuadraFiltro] = useState<string | null>(null)

  const jogosFiltrados = useMemo(
    () => quadraFiltro ? jogos.filter(j => j.setor_id === quadraFiltro) : jogos,
    [jogos, quadraFiltro]
  )

  // Agrupa jogos por dia (timeline)
  const jogosPorDia = useMemo(() => {
    const m = new Map<string, JogoDetalhado[]>()
    for (const j of jogosFiltrados) {
      if (!j.inicio) continue
      const key = j.inicio.slice(0, 10) // YYYY-MM-DD
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(j)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [jogosFiltrados])

  // Jogos ao vivo
  const aoVivoAgora = jogos.filter(j => j.status === 'ao_vivo')
  // Próximo agendado (considera filtro)
  const proximo = jogosFiltrados.find(j => j.status === 'agendado' && j.inicio && new Date(j.inicio) >= new Date())
  const quadraAtiva = quadraFiltro ? local.quadras.find(q => q.id === quadraFiltro) : null

  const pctEncerrados = local.totalJogos > 0
    ? Math.round((local.encerrados / local.totalJogos) * 100)
    : 0

  return (
    <div style={{ fontFamily: SANS, color: '#0A0F0B' }}>

      {/* ─── Breadcrumb + back ─── */}
      <div className="mb-5 flex items-center gap-2">
        <Link
          href="/esportivo"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:border-[rgba(10,15,11,0.20)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={13} />
          Núcleo Esportivo
        </Link>
        <span style={{ fontSize: 11, color: 'rgba(10,15,11,0.30)' }}>·</span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          Praça
        </span>
      </div>

      {/* ─── Hero ─── */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p style={{
            fontSize: 10.5, fontWeight: 800,
            color: '#2e6b42',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            <MapPin size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
            Local esportivo {local.numQuadras > 1 ? `· ${local.numQuadras} quadras` : ''}
          </p>
          <h1 style={{
            fontFamily: SANS,
            fontSize: 'clamp(40px, 5vw, 68px)',
            fontWeight: 800,
            letterSpacing: '-0.05em',
            lineHeight: 0.92,
            color: '#0A0F0B',
          }}>
            {local.nome}
          </h1>
          <p style={{
            marginTop: 8,
            fontSize: 14, fontWeight: 500,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '-0.01em',
            maxWidth: 580,
          }}>
            {local.totalJogos} jogos · {pctEncerrados}% encerrados · {local.modalidades.length} modalidades · {local.atleticas.length} atléticas
          </p>
        </div>

        {/* AO VIVO pill — destaque se há */}
        {aoVivoAgora.length > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600">
            <Radio size={13} className="animate-pulse" />
            {aoVivoAgora.length} ao vivo agora
          </span>
        )}
      </header>

      {/* ─── Quadras (grid, clicável filtra a timeline) ─── */}
      {local.numQuadras > 1 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <h2 style={{
              fontFamily: SANS,
              fontSize: 'clamp(22px, 2.4vw, 30px)',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.025em',
            }}>
              Quadras · {local.numQuadras}
            </h2>
            {quadraAtiva && (
              <button
                onClick={() => setQuadraFiltro(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
              >
                <X size={11} />
                {quadraAtiva.nome} — ver todas
              </button>
            )}
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
          >
            {local.quadras.map(q => (
              <button
                key={q.id}
                onClick={() => setQuadraFiltro(q.id === quadraFiltro ? null : q.id)}
                className="text-left w-full"
                style={{ outline: 'none' }}
              >
                <div style={{
                  outline: q.id === quadraFiltro ? '2px solid var(--accent)' : 'none',
                  outlineOffset: 2,
                  borderRadius: 16,
                  opacity: quadraFiltro && q.id !== quadraFiltro ? 0.55 : 1,
                  transition: 'opacity 0.2s, outline 0.2s',
                }}>
                  <QuadraCard quadra={q} jogos={jogos} />
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
            Toque numa quadra para filtrar o cronograma
          </p>
        </section>
      )}

      {/* ─── Próximo destaque ─── */}
      {proximo && (
        <section className="mb-8">
          <div className="cia-edit-card cia-edit-card--gold" style={{ minHeight: 'auto' }}>
            <div className="flex items-start justify-between">
              <span style={{
                fontSize: 11.5, fontWeight: 600,
                color: 'rgba(70,50,5,0.65)',
                letterSpacing: '-0.01em',
              }}>
                próximo jogo
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(70,50,5,0.12)',
                fontSize: 11, fontWeight: 700,
                color: '#46320C',
                letterSpacing: '-0.01em',
              }}>
                <Clock size={11} />
                {fmtDateLong(proximo.inicio)} · {fmtTime(proximo.inicio)}
              </span>
            </div>
            <div className="mt-4">
              <p style={{
                fontSize: 11, fontWeight: 700,
                color: 'rgba(70,50,5,0.55)',
                letterSpacing: '0.10em', textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                {proximo.modalidade_icone ?? ''} {proximo.modalidade ?? '—'}
                {proximo.divisao && ` · ${proximo.divisao}`}
                {' · '}{proximo.setor_nome}
              </p>
              <p style={{
                fontFamily: SANS,
                fontSize: 'clamp(24px, 3vw, 38px)',
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.035em',
                color: '#0A0F0B',
              }}>
                {proximo.equipe_a_nome ?? '?'}
                <span style={{ margin: '0 10px', color: 'rgba(10,15,11,0.35)' }}>×</span>
                {proximo.equipe_b_nome ?? '?'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─── Timeline cronológica ─── */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <h2 style={{
            fontFamily: SANS,
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.025em',
          }}>
            Cronograma
          </h2>
          {quadraAtiva && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold text-[var(--accent)]">
              {quadraAtiva.nome}
              <span className="text-[var(--accent)]/60">· {jogosFiltrados.length} jogos</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {jogosPorDia.map(([dia, jogosDoDia]) => (
            <div key={dia}>
              <h3 style={{
                fontSize: 11, fontWeight: 800,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                {fmtDateLong(dia + 'T12:00:00-03:00')}
                <span style={{ marginLeft: 8, color: 'rgba(10,15,11,0.35)', fontWeight: 600 }}>
                  · {jogosDoDia.length} {jogosDoDia.length === 1 ? 'jogo' : 'jogos'}
                </span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {jogosDoDia.map(j => <JogoRow key={j.id} jogo={j} />)}
              </div>
            </div>
          ))}
          {jogosPorDia.length === 0 && (
            <p style={{
              padding: '32px',
              textAlign: 'center',
              fontSize: 13,
              color: 'rgba(10,15,11,0.45)',
              border: '1px dashed rgba(10,15,11,0.18)',
              borderRadius: 12,
            }}>
              Nenhum jogo programado.
            </p>
          )}
        </div>
      </section>

      {/* ─── Modalidades + Atléticas (split) ─── */}
      <section className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Modalidades */}
        {local.modalidades.length > 0 && (
          <div className="cia-edit-card cia-edit-card--cream" style={{ minHeight: 'auto' }}>
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '-0.01em',
            }}>
              modalidades
            </span>
            <h3 className="mt-1" style={{
              fontFamily: SANS,
              fontSize: 28, fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#0A0F0B',
              lineHeight: 1,
            }}>
              {local.modalidades.length} {local.modalidades.length === 1 ? 'modalidade' : 'modalidades'}
            </h3>
            <div className="mt-4 flex flex-col gap-1.5">
              {local.modalidades.map(m => (
                <div
                  key={m.nome}
                  className="flex items-center justify-between"
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(10,15,11,0.08)',
                    borderRadius: 10,
                  }}
                >
                  <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 700, color: '#0A0F0B' }}>
                    {m.icone && <span aria-hidden style={{ fontSize: 14 }}>{m.icone}</span>}
                    {m.nome}
                  </span>
                  <span style={{
                    fontFamily: SANS,
                    fontSize: 16, fontWeight: 800,
                    color: '#0A0F0B',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}>
                    {m.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atléticas */}
        {local.atleticas.length > 0 && (
          <div className="cia-edit-card cia-edit-card--lavender" style={{ minHeight: 'auto' }}>
            <span style={{
              fontSize: 11.5, fontWeight: 600,
              color: 'rgba(45,27,92,0.65)',
              letterSpacing: '-0.01em',
            }}>
              atléticas que jogaram aqui
            </span>
            <h3 className="mt-1" style={{
              fontFamily: SANS,
              fontSize: 28, fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#0A0F0B',
              lineHeight: 1,
            }}>
              {local.atleticas.length} {local.atleticas.length === 1 ? 'atlética' : 'atléticas'}
            </h3>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {local.atleticas.map(a => (
                <Link
                  key={a.id}
                  href={`/atleticas/${a.slug}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: a.cor ? `${a.cor}1F` : 'rgba(10,15,11,0.06)',
                    border: `1px solid ${a.cor ? `${a.cor}45` : 'rgba(10,15,11,0.10)'}`,
                    fontSize: 12, fontWeight: 700,
                    color: a.cor ?? '#0A0F0B',
                    letterSpacing: '-0.01em',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: a.cor ?? '#0A0F0B',
                  }} />
                  {a.nome}
                  <span style={{ opacity: 0.65, fontWeight: 600 }}>· {a.jogos}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

    </div>
  )
}

// ─── QuadraCard — uma quadra individual com status ────────────────────────────

function QuadraCard({ quadra: q, jogos }: { quadra: QuadraDoLocal; jogos: JogoDetalhado[] }) {
  const jogosDaQuadra = jogos.filter(j => j.setor_id === q.id)
  const aoVivo = jogosDaQuadra.find(j => j.status === 'ao_vivo')
  const proximo = jogosDaQuadra.find(j => j.status === 'agendado' && j.inicio && new Date(j.inicio) >= new Date())
  const pctEncerrados = q.totalJogos > 0 ? Math.round((q.encerrados / q.totalJogos) * 100) : 0

  // Status visual
  const status =
    aoVivo ? { label: 'AO VIVO', bg: 'rgba(192,57,43,0.10)', border: 'rgba(192,57,43,0.40)', color: '#C0392B', pulse: true } :
    q.agendados > 0 ? { label: 'EM ATIVIDADE', bg: 'rgba(70,50,5,0.10)', border: 'rgba(138,95,6,0.30)', color: '#8a5f06', pulse: false } :
    q.encerrados === q.totalJogos && q.totalJogos > 0 ? { label: 'ENCERRADO', bg: 'rgba(46,107,66,0.10)', border: 'rgba(46,107,66,0.30)', color: '#2e6b42', pulse: false } :
    { label: 'AGUARDANDO', bg: 'rgba(10,15,11,0.04)', border: 'rgba(10,15,11,0.08)', color: 'rgba(10,15,11,0.55)', pulse: false }

  return (
    <div
      style={{
        padding: 16,
        background: '#FAF7F0',
        border: '1px solid rgba(10,15,11,0.08)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p style={{
            fontSize: 9.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.45)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            Quadra
          </p>
          <h4 style={{
            fontFamily: SANS,
            fontSize: 18, fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#0A0F0B',
            lineHeight: 1.1,
          }}>
            {q.nome}
          </h4>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 999,
          background: status.bg,
          border: `1px solid ${status.border}`,
          fontSize: 9.5, fontWeight: 800,
          color: status.color,
          letterSpacing: '0.10em',
          flexShrink: 0,
        }}>
          {status.pulse && <span className="animate-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: status.color }} />}
          {status.label}
        </span>
      </div>

      {/* Quick stats */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span style={{
            fontFamily: SANS,
            fontSize: 32, fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#0A0F0B',
            lineHeight: 0.9,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {q.totalJogos}
          </span>
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            jogos
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'rgba(10,15,11,0.45)',
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {pctEncerrados}% encerrados
        </span>
      </div>

      {/* Barra de progresso */}
      <div style={{
        height: 6, borderRadius: 3, overflow: 'hidden',
        background: 'rgba(10,15,11,0.08)',
        display: 'flex',
      }}>
        {q.encerrados > 0 && (
          <div style={{
            width: `${(q.encerrados / q.totalJogos) * 100}%`,
            background: q.cor ?? '#2e6b42',
          }} />
        )}
        {q.aoVivo > 0 && (
          <div style={{
            width: `${(q.aoVivo / q.totalJogos) * 100}%`,
            background: '#C0392B',
          }} />
        )}
      </div>

      {/* Próximo jogo destaque */}
      {(aoVivo || proximo) && (
        <div
          style={{
            marginTop: 4,
            padding: 10,
            background: aoVivo ? 'rgba(192,57,43,0.06)' : 'rgba(255,255,255,0.55)',
            border: `1px solid ${aoVivo ? 'rgba(192,57,43,0.20)' : 'rgba(10,15,11,0.08)'}`,
            borderRadius: 10,
          }}
        >
          <p style={{
            fontSize: 9.5, fontWeight: 800,
            color: aoVivo ? '#C0392B' : 'rgba(10,15,11,0.55)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            {aoVivo ? '● Ao vivo' : 'Próximo'} · {fmtTime((aoVivo ?? proximo)!.inicio)}
            {(aoVivo ?? proximo)?.modalidade && ` · ${(aoVivo ?? proximo)!.modalidade}`}
          </p>
          <p style={{
            fontFamily: SANS,
            fontSize: 13, fontWeight: 800,
            color: '#0A0F0B',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}>
            {(aoVivo ?? proximo)?.equipe_a_nome ?? '?'}
            <span style={{ margin: '0 6px', color: 'rgba(10,15,11,0.30)' }}>×</span>
            {(aoVivo ?? proximo)?.equipe_b_nome ?? '?'}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── JogoRow — linha compacta na timeline ────────────────────────────────────

function JogoRow({ jogo: j }: { jogo: JogoDetalhado }) {
  const isAoVivo = j.status === 'ao_vivo'
  const isEncerrado = j.status === 'encerrado'
  const isCancelado = j.status === 'cancelado'

  // Vencedor
  let winner: 'a' | 'b' | null = null
  if (isEncerrado && !j.wo && j.placar_a != null && j.placar_b != null) {
    if (j.placar_a > j.placar_b) winner = 'a'
    else if (j.placar_b > j.placar_a) winner = 'b'
  }
  if (j.wo === 'a') winner = 'b'
  if (j.wo === 'b') winner = 'a'

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        isAoVivo ? 'border-red-500/30 bg-red-500/5' :
        isCancelado ? 'opacity-50' : 'bg-[var(--card)]'
      }`}
      style={{ borderColor: isAoVivo ? 'rgba(192,57,43,0.30)' : 'var(--border)' }}
    >
      {/* Hora */}
      <span style={{
        width: 50, flexShrink: 0,
        fontFamily: SANS,
        fontSize: 13, fontWeight: 700,
        color: '#0A0F0B',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
      }}>
        {fmtTime(j.inicio)}
      </span>

      {/* Quadra/Modalidade */}
      <div className="hidden md:flex w-44 shrink-0 min-w-0 items-center gap-1.5">
        {j.modalidade_icone && <span aria-hidden style={{ fontSize: 13 }}>{j.modalidade_icone}</span>}
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'rgba(10,15,11,0.55)',
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {j.modalidade ?? '—'}
          <span style={{ opacity: 0.6, fontWeight: 600 }}> · {j.setor_nome}</span>
        </span>
      </div>

      {/* Equipes + placar */}
      <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
        <span style={{
          fontSize: 12, fontWeight: 700,
          letterSpacing: '-0.01em',
          color: winner === 'a' ? '#2e6b42' :
                 winner === 'b' ? 'rgba(10,15,11,0.45)' :
                 j.wo === 'a' ? 'rgba(10,15,11,0.40)' : '#0A0F0B',
          textDecoration: j.wo === 'a' ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'right',
        }}>
          {j.equipe_a_nome ?? '—'}
        </span>

        {(isAoVivo || isEncerrado) && !j.wo ? (
          <span style={{
            fontFamily: SANS,
            fontSize: 14, fontWeight: 800,
            color: '#0A0F0B',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            padding: '0 6px',
            flexShrink: 0,
          }}>
            {j.placar_a ?? 0}<span style={{ color: 'rgba(10,15,11,0.30)' }}>:</span>{j.placar_b ?? 0}
          </span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: 'rgba(10,15,11,0.35)',
            letterSpacing: '0.04em',
            flexShrink: 0,
            padding: '0 6px',
          }}>
            {j.wo ? 'WO' : 'vs'}
          </span>
        )}

        <span style={{
          fontSize: 12, fontWeight: 700,
          letterSpacing: '-0.01em',
          color: winner === 'b' ? '#2e6b42' :
                 winner === 'a' ? 'rgba(10,15,11,0.45)' :
                 j.wo === 'b' ? 'rgba(10,15,11,0.40)' : '#0A0F0B',
          textDecoration: j.wo === 'b' ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'left',
        }}>
          {j.equipe_b_nome ?? '—'}
        </span>
      </div>

      {/* Status pill */}
      <span style={{
        flexShrink: 0,
        padding: '2px 7px', borderRadius: 999,
        fontSize: 9, fontWeight: 800,
        letterSpacing: '0.10em', textTransform: 'uppercase',
        background:
          isAoVivo ? 'rgba(192,57,43,0.12)' :
          isEncerrado ? 'rgba(46,107,66,0.10)' :
          isCancelado ? 'rgba(10,15,11,0.06)' :
          'rgba(138,95,6,0.10)',
        color:
          isAoVivo ? '#C0392B' :
          isEncerrado ? '#2e6b42' :
          isCancelado ? 'rgba(10,15,11,0.45)' :
          '#8a5f06',
      }}>
        {isAoVivo ? '● ao vivo' :
         isEncerrado ? 'encerrado' :
         isCancelado ? 'cancelado' :
         'agendado'}
      </span>

      {/* Divisão */}
      {j.divisao && (
        <span className="hidden lg:inline" style={{
          flexShrink: 0,
          fontSize: 9, fontWeight: 800,
          color: 'rgba(10,15,11,0.40)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          {j.divisao}
        </span>
      )}

      {/* Trophy se final */}
      {j.fase === 'final' && (
        <Trophy size={12} style={{ color: '#8a5f06' }} />
      )}
    </div>
  )
}
