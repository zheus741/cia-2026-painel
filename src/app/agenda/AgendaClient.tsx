'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Radio, Search, Trophy, Music, PartyPopper, Tv2, ArrowUpRight } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgendaDia    { id: string; nome_dia: string; data: string }
export interface AgendaSetor  { id: string; nome: string; tem_youtube_live: boolean }

export interface AgendaJogo {
  id: string
  equipe_a_nome: string | null
  equipe_b_nome: string | null
  inicio: string | null
  fim_previsto: string | null
  status: string | null
  placar_a: number | null
  placar_b: number | null
  categoria: string | null
  divisao: string | null
  fase: string | null
  dia_id: string
  setor_id: string | null
  modalidade: { nome: string; icone: string } | null
  setor: { nome: string } | null
}

export interface AgendaShow {
  id: string
  nome: string
  tipo: string | null
  inicio: string | null
  fim_previsto: string | null
  dia_id: string
  setor_id: string | null
  setor: { nome: string } | null
}

export interface AgendaFesta {
  id: string
  nome: string
  tema: string | null
  inicio: string | null
  fim_previsto: string | null
  dia_id: string
  setor_id: string | null
  setor: { nome: string } | null
}

export interface AgendaTurnoCob {
  setor_id: string | null
  funcao: string
  dia_id: string | null
}

interface Props {
  dias:               AgendaDia[]
  jogos:              AgendaJogo[]
  shows:              AgendaShow[]
  festas:             AgendaFesta[]
  setores:            AgendaSetor[]
  turnosCoberturaAV:  AgendaTurnoCob[]
  todayDiaId:         string | null
  userRole:           string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function durMin(s: string | null, e: string | null) {
  if (!s || !e) return null
  const d = (new Date(e).getTime() - new Date(s).getTime()) / 60000
  return d > 0 ? d : null
}

type Cat = 'todos' | 'jogos' | 'shows' | 'festas' | 'youtube'

// ── Event row ────────────────────────────────────────────────────────────────

function EventRow({
  icon, color, bg, border, title, subtitle, time, timeFim,
  dur, isActive, isPast, coverage, isYt, href,
}: {
  icon: React.ReactNode
  color: string
  bg: string
  border: string
  title: string
  subtitle?: string
  time: string
  timeFim?: string
  dur: number | null
  isActive: boolean
  isPast: boolean
  coverage: { foto: boolean; video: boolean }
  isYt: boolean
  href?: string
}) {
  const row = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 14,
        background: isActive ? bg : isPast ? 'transparent' : bg,
        border: `1px solid ${isActive ? border : isPast ? 'transparent' : border}`,
        opacity: isPast ? 0.45 : 1,
        transition: 'all 0.18s ease',
        cursor: href ? 'pointer' : 'default',
      }}
    >
      {/* Type icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: isActive ? color : `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 13.5, fontWeight: 700,
            color: isActive ? '#0A0F0B' : isPast ? 'rgba(10,15,11,0.55)' : '#0A0F0B',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}>
            {title}
          </span>
          {isActive && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 999,
              background: '#2e6b42', color: '#fff',
              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7effa0', animation: 'pulse 1.5s infinite' }} />
              ao vivo
            </span>
          )}
        </div>
        {subtitle && (
          <p style={{
            marginTop: 2, fontSize: 11.5,
            color: 'rgba(10,15,11,0.50)',
            letterSpacing: '-0.01em',
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: time + coverage */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em',
          color: isActive ? color : isPast ? 'rgba(10,15,11,0.30)' : 'rgba(10,15,11,0.60)',
        }}>
          {time}
          {timeFim && <span style={{ fontWeight: 500, fontSize: 11 }}> – {timeFim}</span>}
        </span>
        {dur && (
          <span style={{ fontSize: 10, color: 'rgba(10,15,11,0.35)', letterSpacing: '-0.01em' }}>
            {dur < 60 ? `${dur}min` : `${(dur / 60).toFixed(1).replace('.0', '')}h`}
          </span>
        )}
        {/* Coverage badges */}
        <div style={{ display: 'flex', gap: 3 }}>
          {isYt && (
            <span title="YouTube ao vivo" style={{
              padding: '2px 6px', borderRadius: 6,
              background: 'rgba(196,107,74,0.12)', color: '#A04A2E',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
            }}>YT</span>
          )}
          {coverage.foto && (
            <span title="Foto cobertura" style={{
              padding: '2px 6px', borderRadius: 6,
              background: 'rgba(46,107,66,0.10)', color: '#2e6b42',
              fontSize: 9, fontWeight: 700,
            }}>📷</span>
          )}
          {coverage.video && (
            <span title="Vídeo cobertura" style={{
              padding: '2px 6px', borderRadius: 6,
              background: 'rgba(61,73,224,0.10)', color: '#3D49E0',
              fontSize: 9, fontWeight: 700,
            }}>🎥</span>
          )}
        </div>
      </div>

      {href && (
        <ArrowUpRight style={{ width: 14, height: 14, color: 'rgba(10,15,11,0.25)', flexShrink: 0, marginTop: 2 }} />
      )}
    </div>
  )

  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{row}</Link>
  return row
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgendaClient({
  dias, jogos, shows, festas, setores,
  turnosCoberturaAV, todayDiaId, userRole,
}: Props) {
  const [selectedDiaId, setSelectedDiaId] = useState<string | null>(todayDiaId)
  const [cat, setCat]                     = useState<Cat>('todos')
  const [search, setSearch]               = useState('')
  const [now, setNow]                     = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const youtubeSetorIds = useMemo(
    () => new Set(setores.filter(s => s.tem_youtube_live).map(s => s.id)),
    [setores],
  )

  const coberturaMap = useMemo(() => {
    const map: Record<string, { foto: boolean; video: boolean }> = {}
    for (const t of turnosCoberturaAV) {
      if (!t.setor_id || t.dia_id !== selectedDiaId) continue
      if (!map[t.setor_id]) map[t.setor_id] = { foto: false, video: false }
      if (t.funcao === 'foto')  map[t.setor_id].foto  = true
      if (t.funcao === 'video') map[t.setor_id].video = true
    }
    return map
  }, [turnosCoberturaAV, selectedDiaId])

  // Filter by day
  const jogosDia  = selectedDiaId ? jogos.filter(j => j.dia_id === selectedDiaId)  : jogos
  const showsDia  = selectedDiaId ? shows.filter(s => s.dia_id === selectedDiaId)  : shows
  const festasDia = selectedDiaId ? festas.filter(f => f.dia_id === selectedDiaId) : festas

  // Filter by category
  const jogosF  = cat === 'shows' || cat === 'festas' ? [] : cat === 'youtube' ? jogosDia.filter(j => j.setor_id && youtubeSetorIds.has(j.setor_id))  : jogosDia
  const showsF  = cat === 'jogos' || cat === 'festas' ? [] : cat === 'youtube' ? showsDia.filter(s => s.setor_id && youtubeSetorIds.has(s.setor_id))   : showsDia
  const festasF = cat === 'jogos' || cat === 'shows'  ? [] : cat === 'youtube' ? festasDia.filter(f => f.setor_id && youtubeSetorIds.has(f.setor_id)) : festasDia

  // Search
  const q = search.toLowerCase().trim()
  const jogosS  = q ? jogosF.filter(j  => `${j.equipe_a_nome} ${j.equipe_b_nome} ${j.modalidade?.nome}`.toLowerCase().includes(q))  : jogosF
  const showsS  = q ? showsF.filter(s  => s.nome.toLowerCase().includes(q))   : showsF
  const festasS = q ? festasF.filter(f => f.nome.toLowerCase().includes(q))   : festasF

  // Merge + sort by time
  type Entry =
    | { kind: 'jogo';  data: AgendaJogo }
    | { kind: 'show';  data: AgendaShow }
    | { kind: 'festa'; data: AgendaFesta }

  const entries: Entry[] = [
    ...jogosS.map(j  => ({ kind: 'jogo'  as const, data: j })),
    ...showsS.map(s  => ({ kind: 'show'  as const, data: s })),
    ...festasS.map(f => ({ kind: 'festa' as const, data: f })),
  ].sort((a, b) => {
    const ta = a.data.inicio ? new Date(a.data.inicio).getTime() : Infinity
    const tb = b.data.inicio ? new Date(b.data.inicio).getTime() : Infinity
    return ta - tb
  })

  // Category counts (para badges nas pills)
  const ytCount = [
    ...jogosDia.filter(j => j.setor_id && youtubeSetorIds.has(j.setor_id)),
    ...showsDia.filter(s => s.setor_id && youtubeSetorIds.has(s.setor_id)),
    ...festasDia.filter(f => f.setor_id && youtubeSetorIds.has(f.setor_id)),
  ].length

  const cats: { key: Cat; icon: React.ReactNode; label: string; count: number }[] = [
    { key: 'todos',   icon: '📋', label: 'Todos',   count: jogosDia.length + showsDia.length + festasDia.length },
    { key: 'jogos',   icon: <Trophy   size={13} />, label: 'Jogos',   count: jogosDia.length },
    { key: 'shows',   icon: <Music    size={13} />, label: 'Shows',   count: showsDia.length },
    { key: 'festas',  icon: <PartyPopper size={13} />, label: 'Festas',  count: festasDia.length },
    { key: 'youtube', icon: <Tv2     size={13} />, label: 'YouTube',  count: ytCount },
  ]

  const isToday = selectedDiaId === todayDiaId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Sub-header ────────────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <div className="cia-page-header" style={{ marginBottom: 0 }}>
          <p className="cia-page-header__eyebrow">Programação</p>
          <h1 className="cia-page-header__title">Agenda</h1>
          <p className="cia-page-header__subtitle">
            {jogos.length + shows.length + festas.length} eventos · 04–07 jun 2026 · Uberaba/MG
          </p>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: 'var(--card)',
          minWidth: 200,
        }}>
          <Search style={{ width: 13, height: 13, color: 'rgba(10,15,11,0.40)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar evento..."
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--foreground)',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* ── Day tabs ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, overflowX: 'auto',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        flexShrink: 0,
      }}>
        {dias.map(d => {
          const isSel    = selectedDiaId === d.id
          const isActual = d.id === todayDiaId
          const eventCount = jogos.filter(j => j.dia_id === d.id).length
            + shows.filter(s => s.dia_id === d.id).length
            + festas.filter(f => f.dia_id === d.id).length
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDiaId(d.id)}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '12px 20px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: isSel ? '2px solid var(--foreground)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.01em',
                color: isSel ? 'var(--foreground)' : 'rgba(10,15,11,0.40)',
              }}>
                {d.nome_dia}
                {isActual && (
                  <span style={{
                    display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                    background: '#2e6b42', marginLeft: 5, verticalAlign: 'middle',
                    boxShadow: '0 0 6px rgba(46,107,66,0.70)',
                  }} />
                )}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, marginTop: 2,
                color: isSel ? 'rgba(10,15,11,0.50)' : 'rgba(10,15,11,0.28)',
              }}>
                {eventCount} eventos
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Category filter + live indicator ──────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 24px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {cats.map(c => {
          const isSel = cat === c.key
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 999,
                fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
                background: isSel ? '#0A0F0B' : 'transparent',
                color: isSel ? '#fff' : 'rgba(10,15,11,0.50)',
                border: `1px solid ${isSel ? '#0A0F0B' : 'rgba(10,15,11,0.12)'}`,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: c.key === 'todos' ? 13 : 12 }}>{c.icon}</span>
              {c.label}
              {c.count > 0 && (
                <span style={{
                  padding: '0 5px', borderRadius: 999,
                  background: isSel ? 'rgba(255,255,255,0.20)' : 'rgba(10,15,11,0.08)',
                  fontSize: 10, fontWeight: 800,
                }}>
                  {c.count}
                </span>
              )}
            </button>
          )
        })}

        {/* ao vivo indicator */}
        {isToday && now && (
          <span style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700, color: '#2e6b42',
            letterSpacing: '0.04em',
          }}>
            <Radio size={12} style={{ animation: 'pulse 2s infinite' }} />
            AO VIVO
          </span>
        )}
      </div>

      {/* ── Timeline ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {entries.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: 200, gap: 8,
            }}>
              <span style={{ fontSize: 32 }}>📭</span>
              <p style={{ fontSize: 14, color: 'rgba(10,15,11,0.40)', fontWeight: 600 }}>
                {q ? `Nenhum resultado para "${q}"` : 'Sem eventos para este filtro'}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entries.map((entry) => {
              const d = entry.data
              const inicio = d.inicio ? new Date(d.inicio) : null
              const fim    = d.fim_previsto ? new Date(d.fim_previsto) : null
              const isActive = isToday && now !== null && !!inicio && !!fim && inicio <= now && fim >= now
              const isPast   = isToday && now !== null && !!fim && fim < now
              const cov = (d.setor_id && coberturaMap[d.setor_id]) || { foto: false, video: false }
              const isYt = !!d.setor_id && youtubeSetorIds.has(d.setor_id)
              const dur  = durMin(d.inicio, d.fim_previsto)

              if (entry.kind === 'jogo') {
                const j = entry.data as AgendaJogo
                const title = j.equipe_a_nome && j.equipe_b_nome
                  ? `${j.equipe_a_nome} × ${j.equipe_b_nome}`
                  : j.modalidade?.nome ?? 'Jogo'
                const sub = [j.modalidade?.nome, j.categoria, j.fase, j.setor?.nome]
                  .filter(Boolean).join(' · ')
                const placar = isActive && j.placar_a !== null && j.placar_b !== null
                  ? ` · ${j.placar_a}–${j.placar_b}`
                  : ''
                return (
                  <EventRow
                    key={`jogo-${j.id}`}
                    icon={<Trophy size={15} color={isActive ? '#fff' : '#2e6b42'} />}
                    color="#2e6b42" bg="rgba(46,107,66,0.07)" border="rgba(46,107,66,0.20)"
                    title={title + placar}
                    subtitle={sub || undefined}
                    time={fmt(j.inicio)} timeFim={fmt(j.fim_previsto)}
                    dur={dur} isActive={isActive} isPast={isPast}
                    coverage={cov} isYt={isYt}
                    href={`/esportivo#${j.id}`}
                  />
                )
              }

              if (entry.kind === 'show') {
                const s = entry.data as AgendaShow
                const sub = [s.tipo === 'dj_set' ? 'DJ Set' : 'Show', s.setor?.nome].filter(Boolean).join(' · ')
                return (
                  <EventRow
                    key={`show-${s.id}`}
                    icon={<Music size={15} color={isActive ? '#fff' : '#3D49E0'} />}
                    color="#3D49E0" bg="rgba(61,73,224,0.07)" border="rgba(61,73,224,0.18)"
                    title={s.nome}
                    subtitle={sub || undefined}
                    time={fmt(s.inicio)} timeFim={fmt(s.fim_previsto)}
                    dur={dur} isActive={isActive} isPast={isPast}
                    coverage={cov} isYt={isYt}
                  />
                )
              }

              // festa
              const f = entry.data as AgendaFesta
              const sub = [f.tema, f.setor?.nome].filter(Boolean).join(' · ')
              return (
                <EventRow
                  key={`festa-${f.id}`}
                  icon={<PartyPopper size={15} color={isActive ? '#fff' : '#C46B4A'} />}
                  color="#C46B4A" bg="rgba(196,107,74,0.07)" border="rgba(196,107,74,0.20)"
                  title={f.nome}
                  subtitle={sub || undefined}
                  time={fmt(f.inicio)} timeFim={fmt(f.fim_previsto)}
                  dur={dur} isActive={isActive} isPast={isPast}
                  coverage={cov} isYt={isYt}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
