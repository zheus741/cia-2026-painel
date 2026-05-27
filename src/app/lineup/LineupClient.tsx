'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { Pencil, Plus, Trash2, Save, X, Loader2 } from 'lucide-react'
import {
  STAGES, DAY_IDS, toMin, hourLabel,
  type DayId, type Perf, type StageId, type StageConfig, type Lineup,
} from '@/lib/lineup-data'
import { useNowPlaying } from '@/lib/use-now-playing'
import { NowPlayingPanel } from '@/components/now-playing-panel'
import {
  createLineupPerf, updateLineupPerf, deleteLineupPerf,
  type LineupPerfInput,
} from './actions'

const SANS = 'var(--font-dm-sans), system-ui, sans-serif'
const PX = 2.2                    // pixels por minuto — bem arejado
const HEADER_H = 72
const TIME_COL_W = 72

// ── Card layout buckets ──────────────────────────────────────────────────────

interface CardLayout {
  showTimeEyebrow: boolean
  showDurFooter:   boolean
  showLiveBadge:   boolean
  titleSize:       number
  padding:         string
  align:           'space-between' | 'center'
}

function getCardLayout(height: number, isLive: boolean): CardLayout {
  if (height < 80) {
    return { showTimeEyebrow: false, showDurFooter: false, showLiveBadge: isLive,
             titleSize: 14, padding: '10px 14px', align: 'center' }
  }
  if (height < 120) {
    return { showTimeEyebrow: true, showDurFooter: false, showLiveBadge: isLive,
             titleSize: 16, padding: '12px 16px', align: 'space-between' }
  }
  if (height < 180) {
    return { showTimeEyebrow: true, showDurFooter: true, showLiveBadge: isLive,
             titleSize: 18, padding: '14px 18px', align: 'space-between' }
  }
  return { showTimeEyebrow: true, showDurFooter: true, showLiveBadge: isLive,
           titleSize: height > 260 ? 26 : 21, padding: '16px 20px', align: 'space-between' }
}

// ── Pulse dot ────────────────────────────────────────────────────────────────

function LivePulseDot({ color = '#FF4444' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7, flexShrink: 0 }} aria-hidden="true">
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, opacity: 0.55,
        animation: 'lineup-ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
      }} />
      <span style={{
        position: 'relative', width: 7, height: 7, borderRadius: '50%',
        background: color, boxShadow: `0 0 8px ${color}`,
      }} />
    </span>
  )
}

// ── Edit dialog ─────────────────────────────────────────────────────────────

interface EditDialogState {
  open:   boolean
  perf:   Perf | null
  stage:  StageId | null
  diaId:  string
  setorId: string
}

interface EditDialogProps {
  state:         EditDialogState
  onClose:       () => void
  onSaved:       () => void
  palcoSetorMap: Record<string, string>
}

function EditDialog({ state, onClose, onSaved, palcoSetorMap }: EditDialogProps) {
  const [nome,  setNome]  = useState('')
  const [start, setStart] = useState('')
  const [end,   setEnd]   = useState('')
  const [tipo,  setTipo]  = useState<string>('show')
  const [err,   setErr]   = useState<string | null>(null)
  const [pending, startT] = useTransition()
  const [deleting, setDeleting] = useState(false)

  const isEditing = !!state.perf?.id

  useEffect(() => {
    if (!state.open) return
    setNome(state.perf?.artist ?? '')
    setStart(state.perf?.start ?? '')
    setEnd(state.perf?.end ?? '')
    setTipo(state.perf?.tipo ?? 'show')
    setErr(null)
  }, [state.open, state.perf])

  if (!state.open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const input: LineupPerfInput = {
      nome:    nome.trim(),
      start, end,
      diaId:   state.diaId,
      setorId: state.setorId,
      tipo,
    }
    startT(async () => {
      const result = isEditing && state.perf?.id
        ? await updateLineupPerf(state.perf.id, input)
        : await createLineupPerf(input)
      if (!result.ok) { setErr(result.error ?? 'Erro ao salvar'); return }
      onSaved()
      onClose()
    })
  }

  function handleDelete() {
    if (!state.perf?.id) return
    if (!confirm(`Excluir "${state.perf.artist}"?`)) return
    setDeleting(true)
    startT(async () => {
      const result = await deleteLineupPerf(state.perf!.id!)
      setDeleting(false)
      if (!result.ok) { setErr(result.error ?? 'Erro ao excluir'); return }
      onSaved()
      onClose()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Editar atração' : 'Nova atração'}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,15,11,0.55)',
        backdropFilter: 'blur(4px)',
        padding: 20,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          background: '#FEFCF8',
          borderRadius: 18,
          border: '1px solid rgba(10,15,11,0.10)',
          boxShadow: '0 24px 60px rgba(10,15,11,0.40)',
          padding: 24,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <div>
          <div style={{
            fontSize: 11.5, fontWeight: 600,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '-0.01em',
          }}>
            {isEditing ? 'Editando atração' : 'Nova atração'}
          </div>
          <h2 style={{
            margin: '4px 0 0',
            fontFamily: SANS,
            fontSize: 24, fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#0A0F0B',
            lineHeight: 1,
          }}>
            {isEditing ? state.perf?.artist : 'Adicionar ao palco'}
          </h2>
        </div>

        {/* Nome */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Nome do artista
          </span>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Pablo Vittar"
            required
            autoFocus
            style={{
              padding: '11px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              fontFamily: SANS,
              fontSize: 15,
              fontWeight: 600,
              color: '#0A0F0B',
              outline: 'none',
            }}
          />
        </label>

        {/* Horários */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Início
            </span>
            <input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              required
              style={{
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#FFFFFF',
                fontFamily: SANS,
                fontSize: 15,
                fontWeight: 700,
                color: '#0A0F0B',
                outline: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: 'rgba(10,15,11,0.55)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Fim
            </span>
            <input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              required
              style={{
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: '#FFFFFF',
                fontFamily: SANS,
                fontSize: 15,
                fontWeight: 700,
                color: '#0A0F0B',
                outline: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </label>
        </div>

        {/* Tipo */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(10,15,11,0.55)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Tipo
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['show', 'dj_set', 'banda'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: tipo === t ? '1px solid #0A0F0B' : '1px solid var(--border)',
                  background: tipo === t ? '#0A0F0B' : '#FFFFFF',
                  color: tipo === t ? '#FAF7F0' : '#0A0F0B',
                  fontFamily: SANS,
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {t === 'dj_set' ? 'DJ Set' : t}
              </button>
            ))}
          </div>
        </label>

        {err && (
          <div role="alert" style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(196,107,74,0.10)',
            border: '1px solid rgba(196,107,74,0.30)',
            fontSize: 13, fontWeight: 600,
            color: '#8b3a2a',
          }}>
            {err}
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending || deleting}
              style={{
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid rgba(196,107,74,0.30)',
                background: '#FFFFFF',
                color: '#8b3a2a',
                fontFamily: SANS,
                fontSize: 13, fontWeight: 700,
                cursor: pending ? 'wait' : 'pointer',
                opacity: pending || deleting ? 0.5 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <Trash2 size={13} strokeWidth={2.2} />
              {deleting ? 'Excluindo…' : 'Excluir'}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={{
              padding: '11px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: '#0A0F0B',
              fontFamily: SANS,
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: '11px 18px',
              borderRadius: 10,
              border: '1px solid #0A0F0B',
              background: '#0A0F0B',
              color: '#FAF7F0',
              fontFamily: SANS,
              fontSize: 13, fontWeight: 700,
              cursor: pending ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 0 rgba(10,15,11,0.04), 0 8px 24px rgba(10,15,11,0.18)',
            }}
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2.2} />}
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

interface LineupClientProps {
  lineup:        Lineup
  canEdit:       boolean
  palcoSetorMap: Record<string, string>
}

export function LineupClient({ lineup, canEdit, palcoSetorMap }: LineupClientProps) {
  const nowPlaying = useNowPlaying(lineup)
  const [activeDay, setActiveDay] = useState<DayId>('qui')
  const [editState, setEditState] = useState<EditDialogState>({
    open: false, perf: null, stage: null, diaId: '', setorId: '',
  })

  useEffect(() => {
    if (nowPlaying.todayDayId) setActiveDay(nowPlaying.todayDayId)
  }, [nowPlaying.todayDayId])

  const day = lineup[activeDay]
  const startMin = toMin(day.rangeStart)
  const endMin   = toMin(day.rangeEnd)
  const totalMin = Math.max(60, endMin - startMin)
  const gridH    = totalMin * PX

  const hourTicks = useMemo(() => {
    const fh = Math.floor(startMin / 60)
    const lh = Math.ceil(endMin / 60)
    return Array.from({ length: lh - fh + 1 }, (_, i) => (fh + i) * 60)
      .filter(m => m >= startMin && m <= endMin)
  }, [startMin, endMin])

  const totalArtists =
    day.stages.arena.length + day.stages.principal.length + day.stages.eletronico.length
  const totalHours = Math.round(totalMin / 60)
  const isViewingLiveDay = nowPlaying.isLive && nowPlaying.todayDayId === activeDay

  function openNew(stageId: StageId) {
    const setorName = STAGES.find(s => s.id === stageId)?.name === 'Arena 360'
      ? 'Arena 360'
      : STAGES.find(s => s.id === stageId)?.name === 'Principal'
        ? 'Palco Principal'
        : 'Palco Eletrônico'
    const setorId = palcoSetorMap[setorName] ?? ''
    setEditState({
      open: true, perf: null, stage: stageId,
      diaId: day.diaId, setorId,
    })
  }

  function openEdit(perf: Perf) {
    setEditState({
      open: true, perf, stage: null,
      diaId: perf.diaId, setorId: perf.setorId,
    })
  }

  return (
    <div className="cia-fade-in" style={{ fontFamily: SANS, color: '#0A0F0B' }}>

      <style>{`
        @keyframes lineup-ping {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(2.5); opacity: 0;    }
          100% { transform: scale(2.5); opacity: 0;    }
        }
        @keyframes lineup-live-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,68,68,0.6), 0 0 0 2px rgba(255,68,68,0.85); }
          50%      { box-shadow: 0 0 0 6px rgba(255,68,68,0), 0 0 0 2px rgba(255,68,68,0.85); }
        }
        .lineup-live-card { animation: lineup-live-ring 2s ease-in-out infinite; }
        .lineup-card:hover .lineup-edit-btn { opacity: 1; }
        @media (prefers-reduced-motion: reduce) {
          .lineup-live-card { animation: none; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTAINER EDITORIAL — max-width + padding generoso
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        maxWidth: 1320,
        margin: '0 auto',
        padding: 'clamp(20px, 4vw, 40px)',
      }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: 24, flexWrap: 'wrap',
          }}>
            <div>
              <span style={{
                fontSize: 11.5, fontWeight: 600,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '-0.01em',
              }}>
                programação musical · 04 a 07 jun · uberaba mg
              </span>
              <h1 style={{
                marginTop: 4, marginBottom: 0,
                fontFamily: SANS,
                fontSize: 'clamp(40px, 6vw, 64px)',
                fontWeight: 800,
                letterSpacing: '-0.05em',
                lineHeight: 0.92,
                color: '#0A0F0B',
              }}>
                Line Up
              </h1>
              <p style={{
                marginTop: 10, marginBottom: 0,
                fontSize: 14, fontWeight: 500,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '-0.01em',
                maxWidth: 480,
              }}>
                {canEdit
                  ? 'Três palcos, quatro noites. Passe o mouse sobre uma atração para editar.'
                  : 'Três palcos, quatro noites de festival.'}
              </p>
            </div>

            <div style={{ textAlign: 'right', minWidth: 140 }}>
              <div style={{
                fontFamily: SANS,
                fontSize: 64, fontWeight: 800,
                letterSpacing: '-0.05em',
                lineHeight: 0.88,
                color: '#0A0F0B',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {totalArtists}
              </div>
              <div style={{
                marginTop: 8,
                fontSize: 10, fontWeight: 700,
                color: 'rgba(10,15,11,0.55)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                atrações · {totalHours}h
              </div>
            </div>
          </div>

          {canEdit && (
            <div style={{
              marginTop: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(232,184,47,0.16)',
              border: '1px solid rgba(232,184,47,0.36)',
              fontSize: 10, fontWeight: 700,
              color: '#8a5f06',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              <Pencil size={10} strokeWidth={2.4} />
              modo edição · admin
            </div>
          )}
        </div>

        {/* NOW PLAYING (só em dia de evento) */}
        {nowPlaying.activeDay && (
          <div style={{ marginBottom: 28 }}>
            <NowPlayingPanel lineup={lineup} />
          </div>
        )}

        {/* DAY TABS */}
        <div
          role="tablist"
          aria-label="Selecionar dia da programação"
          style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}
        >
          {DAY_IDS.map(id => {
            const d = lineup[id]
            const active = activeDay === id
            const isToday = nowPlaying.todayDayId === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                aria-controls={`lineup-grid-${id}`}
                onClick={() => setActiveDay(id)}
                style={{
                  position: 'relative',
                  minHeight: 60,
                  padding: '12px 20px',
                  borderRadius: 14,
                  border: active ? '1px solid #0A0F0B' : '1px solid var(--border)',
                  background: active ? '#0A0F0B' : 'var(--card)',
                  color: active ? '#FAF7F0' : '#0A0F0B',
                  cursor: 'pointer',
                  transition: 'transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s',
                  textAlign: 'left',
                  fontFamily: SANS,
                  boxShadow: active
                    ? '0 2px 0 rgba(10,15,11,0.04), 0 8px 24px rgba(10,15,11,0.18)'
                    : '0 1px 0 rgba(10,15,11,0.04)',
                  minWidth: 108,
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}
              >
                {isToday && (
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <LivePulseDot />
                  </div>
                )}
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: active ? 'rgba(250,247,240,0.6)' : 'rgba(10,15,11,0.55)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  {d.wd}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {d.date}
                </div>
                <div style={{
                  marginTop: 4,
                  fontSize: 10.5, fontWeight: 600,
                  color: active ? 'rgba(250,247,240,0.55)' : 'rgba(10,15,11,0.45)',
                  letterSpacing: '-0.01em',
                }}>
                  {d.stages.arena.length + d.stages.principal.length + d.stages.eletronico.length} atrações
                </div>
              </button>
            )
          })}
        </div>

        {/* LEGENDA + RANGE */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 14,
          marginBottom: 16, paddingLeft: 2,
          alignItems: 'center',
        }}>
          {STAGES.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: s.blockBg,
                  boxShadow: `inset 0 0 0 1px ${s.accentRing}`,
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: 11.5, fontWeight: 600,
                color: 'rgba(10,15,11,0.7)',
                letterSpacing: '-0.01em',
              }}>
                {s.name}
              </span>
            </div>
          ))}
          <div style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 600,
            color: 'rgba(10,15,11,0.4)',
            letterSpacing: '-0.01em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {day.rangeStart} <span style={{ opacity: 0.4 }}>→</span> {day.rangeEnd}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            GRADE
            ═══════════════════════════════════════════════════════════════════ */}
        <div
          id={`lineup-grid-${activeDay}`}
          role="tabpanel"
          aria-label={`Programação de ${day.label}`}
          style={{
            position: 'relative',
            overflowX: 'auto',
            overflowY: 'visible',
            borderRadius: 20,
            border: '1px solid rgba(10,15,11,0.10)',
            background: 'var(--card)',
            boxShadow: '0 1px 0 rgba(10,15,11,0.04), 0 8px 32px rgba(10,15,11,0.06)',
          }}
        >
          <div style={{ display: 'flex', minWidth: 800, position: 'relative' }}>

            {/* Coluna de horas */}
            <div style={{
              width: TIME_COL_W,
              flexShrink: 0,
              position: 'relative',
              height: gridH + HEADER_H + 64,
              borderRight: '1px solid rgba(10,15,11,0.08)',
              background: 'rgba(10,15,11,0.015)',
            }}>
              <div style={{
                height: HEADER_H,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: 16,
                borderBottom: '1px solid rgba(10,15,11,0.08)',
              }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 700,
                  color: 'rgba(10,15,11,0.42)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}>
                  hora
                </span>
              </div>

              {hourTicks.map(absMin => {
                const y = HEADER_H + (absMin - startMin) * PX
                return (
                  <div
                    key={absMin}
                    style={{
                      position: 'absolute',
                      top: y, left: 0, right: 0,
                      transform: 'translateY(-50%)',
                      textAlign: 'center',
                      fontFamily: SANS,
                      fontSize: 13, fontWeight: 700,
                      color: 'rgba(10,15,11,0.42)',
                      letterSpacing: '-0.02em',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}
                  >
                    {hourLabel(absMin)}
                  </div>
                )
              })}
            </div>

            {/* Colunas de palcos */}
            {STAGES.map(stage => {
              const perfs = day.stages[stage.id as StageId] ?? []
              const isEmpty = perfs.length === 0
              const stagePlay = nowPlaying.stages[stage.id as StageId]

              return (
                <div
                  key={stage.id}
                  style={{
                    flex: 1,
                    minWidth: 240,
                    position: 'relative',
                    height: gridH + HEADER_H + 64,
                    borderRight: '1px solid rgba(10,15,11,0.08)',
                  }}
                >
                  {/* Header do palco */}
                  <div style={{
                    height: HEADER_H,
                    padding: '14px 18px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    background: stage.accentSoft,
                    borderBottom: `2px solid ${stage.accentRing}`,
                    position: 'relative',
                  }}>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700,
                      color: 'rgba(10,15,11,0.5)',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                    }}>
                      {stage.eyebrow}
                    </div>
                    <div style={{
                      marginTop: 5,
                      fontFamily: SANS,
                      fontSize: 18, fontWeight: 800,
                      letterSpacing: '-0.03em',
                      color: stage.accentInk,
                      lineHeight: 1,
                    }}>
                      {stage.name}
                    </div>

                    {isViewingLiveDay && stagePlay.current && (
                      <div style={{
                        position: 'absolute',
                        top: 14, right: 14,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: '#0A0F0B',
                      }}>
                        <LivePulseDot />
                        <span style={{
                          fontSize: 9, fontWeight: 800,
                          color: '#FF7777',
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                        }}>
                          no ar
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Linhas-guia */}
                  {hourTicks.map(absMin => {
                    const y = HEADER_H + (absMin - startMin) * PX
                    return (
                      <div
                        key={absMin}
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: y, left: 0, right: 0,
                          height: 1,
                          background: 'rgba(10,15,11,0.06)',
                          pointerEvents: 'none',
                        }}
                      />
                    )
                  })}

                  {/* Empty state */}
                  {isEmpty && !canEdit && (
                    <div style={{
                      position: 'absolute',
                      top: HEADER_H + 36,
                      left: 18, right: 18,
                      padding: '16px',
                      borderRadius: 12,
                      border: '1px dashed rgba(10,15,11,0.18)',
                      background: 'rgba(10,15,11,0.02)',
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: 9.5, fontWeight: 700,
                        color: 'rgba(10,15,11,0.42)',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}>
                        sem programação
                      </div>
                    </div>
                  )}

                  {/* Blocos */}
                  {perfs.map((p, i) => {
                    const top    = HEADER_H + (toMin(p.start) - startMin) * PX
                    const height = p.duration * PX
                    const isSpecial = p.special
                    const isLive = isViewingLiveDay && stagePlay.current?.id === p.id
                    const layout = getCardLayout(height, isLive)

                    return (
                      <PerfCard
                        key={`${p.id ?? p.artist}-${i}`}
                        perf={p}
                        stage={stage}
                        top={top}
                        height={height}
                        isSpecial={!!isSpecial}
                        isLive={isLive}
                        layout={layout}
                        canEdit={canEdit}
                        onEdit={() => openEdit(p)}
                      />
                    )
                  })}

                  {/* Botão "+ Adicionar" para canEdit (sempre presente, no fim) */}
                  {canEdit && (
                    <button
                      onClick={() => openNew(stage.id)}
                      style={{
                        position: 'absolute',
                        bottom: 16,
                        left: 12, right: 12,
                        minHeight: 44,
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: `1.5px dashed ${stage.accentRing}`,
                        background: 'transparent',
                        color: stage.accentInk,
                        fontFamily: SANS,
                        fontSize: 12, fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6,
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = stage.accentSoft
                        el.style.borderColor = stage.accentInk
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = 'transparent'
                        el.style.borderColor = stage.accentRing
                      }}
                    >
                      <Plus size={13} strokeWidth={2.4} />
                      Adicionar atração
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          marginTop: 18,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(10,15,11,0.42)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            Programação sujeita a alterações
          </div>
          <div style={{ flex: 1, height: 1, background: 'rgba(10,15,11,0.10)', minWidth: 40 }} />
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(10,15,11,0.42)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            CIA 2026 · Uberaba MG
          </div>
        </div>
      </div>

      {/* Dialog de edição */}
      <EditDialog
        state={editState}
        onClose={() => setEditState(prev => ({ ...prev, open: false }))}
        onSaved={() => {/* server action revalida via revalidatePath */}}
        palcoSetorMap={palcoSetorMap}
      />
    </div>
  )
}

// ── PerfCard ─────────────────────────────────────────────────────────────────

interface PerfCardProps {
  perf:      Perf
  stage:     StageConfig
  top:       number
  height:    number
  isSpecial: boolean
  isLive:    boolean
  layout:    CardLayout
  canEdit:   boolean
  onEdit:    () => void
}

function PerfCard({ perf, stage, top, height, isSpecial, isLive, layout, canEdit, onEdit }: PerfCardProps) {
  return (
    <div
      role="article"
      aria-label={`${perf.artist} no palco ${stage.name} das ${perf.start} às ${perf.end}${isLive ? ' — no ar agora' : ''}`}
      title={`${perf.artist} · ${perf.start}–${perf.end}`}
      tabIndex={0}
      className={`lineup-card ${isLive ? 'lineup-live-card' : ''}`}
      style={{
        position: 'absolute',
        top: top + 6,
        left: 12, right: 12,
        height: height - 12,
        background: isSpecial
          ? 'linear-gradient(155deg, #0A0F0B 0%, #1a1f1c 100%)'
          : stage.blockBg,
        borderRadius: 14,
        padding: layout.padding,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: layout.align,
        boxShadow: isLive
          ? `0 0 0 2px #FF4444, 0 8px 20px rgba(255,68,68,0.18)`
          : isSpecial
            ? '0 1px 0 rgba(10,15,11,0.06), 0 8px 24px rgba(10,15,11,0.25)'
            : `0 1px 0 ${stage.accentRing}, 0 4px 12px rgba(10,15,11,0.08)`,
        cursor: canEdit ? 'pointer' : 'default',
        transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s',
        border: isSpecial ? '1px solid rgba(232,184,47,0.45)' : 'none',
        outline: 'none',
      }}
      onClick={canEdit ? onEdit : undefined}
      onKeyDown={canEdit ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() } }) : undefined}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Botão de edição flutuante */}
      {canEdit && (
        <button
          className="lineup-edit-btn"
          onClick={e => { e.stopPropagation(); onEdit() }}
          aria-label="Editar atração"
          style={{
            position: 'absolute',
            top: 8, right: 8,
            width: 28, height: 28,
            borderRadius: 8,
            border: 'none',
            background: isSpecial ? 'rgba(232,184,47,0.18)' : 'rgba(0,0,0,0.18)',
            color: isSpecial ? '#e8b94f' : (stage.tone === 'gold' ? '#0A0F0B' : '#FFFFFF'),
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.15s, background 0.15s',
            zIndex: 2,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = isSpecial
              ? 'rgba(232,184,47,0.32)'
              : 'rgba(0,0,0,0.32)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = isSpecial
              ? 'rgba(232,184,47,0.18)'
              : 'rgba(0,0,0,0.18)'
          }}
        >
          <Pencil size={13} strokeWidth={2.2} />
        </button>
      )}

      <div style={{ minWidth: 0, paddingRight: canEdit ? 32 : 0 }}>
        {(layout.showTimeEyebrow || layout.showLiveBadge) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 6,
          }}>
            {layout.showLiveBadge && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 6px',
                borderRadius: 999,
                background: '#0A0F0B',
              }}>
                <LivePulseDot />
                <span style={{
                  fontSize: 8.5, fontWeight: 800,
                  color: '#FF7777',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}>
                  no ar
                </span>
              </span>
            )}
            {layout.showTimeEyebrow && (
              <span style={{
                fontFamily: SANS,
                fontSize: 10.5, fontWeight: 700,
                color: isSpecial ? 'rgba(232,184,47,0.85)' : stage.blockTextMuted,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {perf.start} → {perf.end}
              </span>
            )}
          </div>
        )}

        <div style={{
          fontFamily: SANS,
          fontSize: layout.titleSize,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: isSpecial ? '#FAF7F0' : stage.blockText,
          lineHeight: 1.05,
          wordBreak: 'break-word',
        }}>
          {perf.artist}
        </div>
      </div>

      {layout.showDurFooter && (
        <div style={{
          fontFamily: SANS,
          fontSize: 11, fontWeight: 600,
          color: isSpecial ? 'rgba(250,247,240,0.55)' : stage.blockTextMuted,
          letterSpacing: '-0.01em',
          marginTop: 8,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {perf.duration} min
        </div>
      )}
    </div>
  )
}
