'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Radio, Filter, MapPin, Music, Users, Sparkles, ZoomIn, ZoomOut, Crosshair,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  MAPA_AREAS, CATEGORIA_CONFIG, getAreaCenter,
  type MapaArea, type MapaCategoria,
} from '@/lib/mapa/areas'

// ─── Types (props) ───────────────────────────────────────────────────────────

interface SetorRow {
  id: string; nome: string; tipo: string | null
  capacidade_pessoas: number | null; cor_hex: string | null
  observacoes: string | null
}
interface JogoVivo {
  id: string; status: string
  equipe_a_nome: string | null; equipe_b_nome: string | null
  placar_a: number | null; placar_b: number | null
  setor_id: string | null; teste: boolean | null; divisao: string | null
  modalidade: { nome: string; icone: string } | null
  setor: { id: string; nome: string } | null
}
interface ShowAtivo {
  id: string; nome: string; tipo: string | null
  embaixador: boolean | null
  inicio: string | null; fim_previsto: string | null
  setor_id: string | null
  setor: { id: string; nome: string } | null
}
interface FestaAtiva {
  id: string; nome: string; tema: string | null
  inicio: string | null; fim_previsto: string | null
  setor_id: string | null
  setor: { id: string; nome: string } | null
}

interface Props {
  setores: SetorRow[]
  jogosVivo: JogoVivo[]
  showsAtivos: ShowAtivo[]
  festasAtivas: FestaAtiva[]
}

// ─── Util ────────────────────────────────────────────────────────────────────

const VIEWBOX = { w: 1400, h: 820 }

/** Match de área → setor (por slug se setor_slug está setado, senão por nome). */
function matchSetor(area: MapaArea, setores: SetorRow[]): SetorRow | null {
  if (!setores.length) return null
  if (area.setor_slug) {
    const found = setores.find(s => normalize(s.nome) === normalize(area.setor_slug!))
    if (found) return found
  }
  // Fallback: tenta casar pelo nome
  return setores.find(s => normalize(s.nome) === normalize(area.nome)) ?? null
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

// ─── Main component ──────────────────────────────────────────────────────────

export function MapaInterativoClient({ setores, jogosVivo, showsAtivos, festasAtivas }: Props) {
  const router = useRouter()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null)
  const [hiddenCats, setHiddenCats] = useState<Set<MapaCategoria>>(new Set())
  const [conectado, setConectado] = useState(false)

  // Zoom / pan
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const svgWrapRef = useRef<HTMLDivElement | null>(null)

  // Realtime: refresh quando jogos/shows mudam
  useEffect(() => {
    const supabase = createClient()
    let t: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (t) clearTimeout(t)
      t = setTimeout(() => router.refresh(), 1200)
    }
    const ch = supabase
      .channel('croqui-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shows' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'festas' }, schedule)
      .subscribe(status => setConectado(status === 'SUBSCRIBED'))
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch) }
  }, [router])

  // Index de live data por setor_id
  const liveBySetor = useMemo(() => {
    const map = new Map<string, { jogos: JogoVivo[]; shows: ShowAtivo[]; festas: FestaAtiva[] }>()
    const ensure = (id: string) => {
      if (!map.has(id)) map.set(id, { jogos: [], shows: [], festas: [] })
      return map.get(id)!
    }
    jogosVivo.forEach(j => { if (j.setor_id) ensure(j.setor_id).jogos.push(j) })
    showsAtivos.forEach(s => { if (s.setor_id) ensure(s.setor_id).shows.push(s) })
    festasAtivas.forEach(f => { if (f.setor_id) ensure(f.setor_id).festas.push(f) })
    return map
  }, [jogosVivo, showsAtivos, festasAtivas])

  // Áreas enriquecidas (com setor + live)
  const areasEnriched = useMemo(() => {
    return MAPA_AREAS.map(area => {
      const setor = matchSetor(area, setores)
      const live = setor ? liveBySetor.get(setor.id) : undefined
      const hasLive = !!(live && (live.jogos.length || live.shows.length || live.festas.length))
      return { area, setor, live, hasLive }
    })
  }, [setores, liveBySetor])

  const selectedItem = selectedSlug ? areasEnriched.find(a => a.area.slug === selectedSlug) : null
  const totalLive = areasEnriched.filter(a => a.hasLive).length

  // Categorias visíveis (pra legenda)
  const categoriasOrdenadas = (Object.keys(CATEGORIA_CONFIG) as MapaCategoria[])
    .sort((a, b) => CATEGORIA_CONFIG[a].ordem - CATEGORIA_CONFIG[b].ordem)

  // Pan/zoom handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-area]')) return // não arrasta se clicou área
    if (svgWrapRef.current) svgWrapRef.current.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy })
  }
  const onPointerUp = () => { dragRef.current = null }
  const adjustZoom = (delta: number) => setZoom(z => Math.max(0.5, Math.min(3, z + delta)))
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // Wheel zoom (desktop) — bound to non-passive listener via useEffect
  useEffect(() => {
    const el = svgWrapRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return // só zoom com cmd/ctrl
      e.preventDefault()
      setZoom(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.002)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] min-h-[600px] gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Centro Park · Uberaba</p>
          <h1 className="font-[var(--font-display)] text-2xl md:text-3xl font-bold tracking-tight mt-0.5">
            Croqui do Evento
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Toque numa área pra ver detalhes. {totalLive > 0 && (
              <span className="font-semibold text-[var(--green-bright)]">
                · {totalLive} área{totalLive > 1 ? 's' : ''} com atividade agora
              </span>
            )}
          </p>
        </div>

        {/* Status realtime */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            conectado
              ? 'border-[var(--green-bright)]/30 bg-[var(--green-dim)]/10 text-[var(--green-bright)]'
              : 'border-[var(--border)] bg-[var(--card)]/40 text-[var(--muted-foreground)]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${conectado ? 'bg-[var(--green-bright)] animate-pulse' : 'bg-[var(--muted-foreground)]/50'}`} />
          {conectado ? 'Tempo real' : 'Conectando'}
        </span>
      </div>

      {/* Main grid: mapa + side panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 min-h-0">

        {/* MAPA */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[#080d0a] min-h-[460px]">

          {/* Ambient: vinheta + textura sutil */}
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(80% 60% at 50% 50%, rgba(46,107,66,0.18) 0%, transparent 70%), radial-gradient(60% 50% at 100% 100%, rgba(216,132,95,0.06) 0%, transparent 60%)',
          }} />
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/></svg>")',
          }} />

          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <button
              onClick={() => adjustZoom(0.2)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)]/80 text-[var(--muted-foreground)] backdrop-blur transition-colors hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)]"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => adjustZoom(-0.2)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)]/80 text-[var(--muted-foreground)] backdrop-blur transition-colors hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)]"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={resetView}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)]/80 text-[var(--muted-foreground)] backdrop-blur transition-colors hover:border-[var(--green-bright)]/40 hover:text-[var(--green-bright)]"
              title="Resetar visualização"
            >
              <Crosshair size={14} />
            </button>
          </div>

          {/* Hint cmd+scroll */}
          <div className="hidden md:flex absolute bottom-3 right-3 z-10 items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/40 backdrop-blur">
            ⌘ + scroll · zoom · drag · pan
          </div>

          {/* SVG container */}
          <div
            ref={svgWrapRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
          >
            <svg
              viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
              preserveAspectRatio="xMidYMid meet"
              width="100%"
              height="100%"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: dragRef.current ? 'none' : 'transform 0.2s ease',
              }}
            >
              {/* Defs: gradientes e filtros */}
              <defs>
                {categoriasOrdenadas.map(cat => {
                  const cfg = CATEGORIA_CONFIG[cat]
                  return (
                    <linearGradient key={cat} id={`g-${cat}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={cfg.cor} stopOpacity="0.55" />
                      <stop offset="100%" stopColor={cfg.cor} stopOpacity="0.18" />
                    </linearGradient>
                  )
                })}
                <filter id="glow-live">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <pattern id="grass" patternUnits="userSpaceOnUse" width="20" height="20">
                  <rect width="20" height="20" fill="#0d1612" />
                  <circle cx="10" cy="10" r="0.5" fill="#1a2820" />
                </pattern>
              </defs>

              {/* Background "land" */}
              <rect x={0} y={0} width={VIEWBOX.w} height={VIEWBOX.h} fill="url(#grass)" />

              {/* Áreas */}
              {areasEnriched.map(({ area, setor, hasLive, live }) => {
                const cfg = CATEGORIA_CONFIG[area.categoria]
                const isHidden = hiddenCats.has(area.categoria)
                const isHovered = hoveredSlug === area.slug
                const isSelected = selectedSlug === area.slug
                const isDimmed = hiddenCats.size > 0 && isHidden
                const [cx, cy] = getAreaCenter(area)

                if (isDimmed) {
                  // Renderiza super sutil quando categoria está desligada
                  return (
                    <AreaShape
                      key={area.slug}
                      area={area}
                      fill="rgba(255,255,255,0.02)"
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth={0.5}
                    />
                  )
                }

                const fill = `url(#g-${area.categoria})`
                const stroke = isSelected ? '#fafaf0' : isHovered ? cfg.corStroke : cfg.cor
                const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.2
                const opacity = isHovered || isSelected ? 1 : 0.92

                return (
                  <g
                    key={area.slug}
                    data-area
                    onClick={(e) => { e.stopPropagation(); setSelectedSlug(area.slug) }}
                    onMouseEnter={() => setHoveredSlug(area.slug)}
                    onMouseLeave={() => setHoveredSlug(null)}
                    style={{ cursor: 'pointer' }}
                    opacity={opacity}
                  >
                    {/* Glow ao redor se tem live activity */}
                    {hasLive && (
                      <AreaShape
                        area={area}
                        fill="none"
                        stroke="#6AB87E"
                        strokeWidth={3}
                        filter="url(#glow-live)"
                        className="animate-pulse"
                        style={{ animationDuration: '2.2s' }}
                      />
                    )}
                    <AreaShape
                      area={area}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      style={{ transition: 'stroke-width 0.18s, stroke 0.18s' }}
                    />

                    {/* Label */}
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fafaf0"
                      fontSize={area.labelSize ?? 12}
                      fontWeight={700}
                      style={{
                        pointerEvents: 'none',
                        userSelect: 'none',
                        textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {area.icone ?? cfg.icone} {area.nome}
                    </text>

                    {/* Badge de contagem live */}
                    {hasLive && live && (
                      <LiveBadge
                        x={cx}
                        y={cy + (area.labelSize ?? 12) * 0.9}
                        count={live.jogos.length + live.shows.length + live.festas.length}
                      />
                    )}

                    {/* Se vinculado a setor mas sem live, ainda mostra ponto verde sutil */}
                    {!hasLive && setor && (
                      <circle cx={cx} cy={cy - (area.labelSize ?? 12) * 0.7} r={2} fill="#6AB87E" opacity={0.5} />
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Legenda flutuante (mobile: bottom; desktop: top-left) */}
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-110px)]">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/50 backdrop-blur">
              <Filter size={9} />
              Categorias
            </span>
            {categoriasOrdenadas.map(cat => {
              const cfg = CATEGORIA_CONFIG[cat]
              const hidden = hiddenCats.has(cat)
              return (
                <button
                  key={cat}
                  onClick={() => setHiddenCats(prev => {
                    const next = new Set(prev)
                    if (next.has(cat)) next.delete(cat); else next.add(cat)
                    return next
                  })}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur transition-all"
                  style={{
                    borderColor: hidden ? 'rgba(255,255,255,0.10)' : `${cfg.cor}60`,
                    background: hidden ? 'rgba(0,0,0,0.30)' : `${cfg.cor}25`,
                    color: hidden ? 'rgba(255,255,255,0.35)' : cfg.cor,
                    textDecoration: hidden ? 'line-through' : 'none',
                  }}
                  title={`${hidden ? 'Mostrar' : 'Ocultar'} ${cfg.label.toLowerCase()}`}
                >
                  <span>{cfg.icone}</span>
                  <span className="hidden sm:inline">{cfg.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* SIDE PANEL */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 overflow-hidden min-h-0 flex flex-col">
          {selectedItem ? (
            <SidePanel item={selectedItem} onClose={() => setSelectedSlug(null)} />
          ) : (
            <EmptyPanel
              totalAreas={MAPA_AREAS.length}
              totalLive={totalLive}
            />
          )}
        </div>
      </div>

    </div>
  )
}

// ─── Shape renderer ──────────────────────────────────────────────────────────

function AreaShape({
  area, fill, stroke, strokeWidth, filter, className, style,
}: {
  area: MapaArea
  fill: string
  stroke: string
  strokeWidth: number
  filter?: string
  className?: string
  style?: React.CSSProperties
}) {
  if (area.geom.kind === 'rect') {
    return (
      <rect
        x={area.geom.x}
        y={area.geom.y}
        width={area.geom.w}
        height={area.geom.h}
        rx={area.geom.rx ?? 4}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        filter={filter}
        className={className}
        style={style}
      />
    )
  }
  return (
    <polygon
      points={area.geom.points.map(([x, y]) => `${x},${y}`).join(' ')}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      filter={filter}
      className={className}
      style={style}
    />
  )
}

function LiveBadge({ x, y, count }: { x: number; y: number; count: number }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={x} cy={y + 10} r={9} fill="#6AB87E" />
      <circle cx={x} cy={y + 10} r={9} fill="#6AB87E" opacity={0.45} className="animate-ping" style={{ animationDuration: '2s' }} />
      <text x={x} y={y + 10} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={800} fill="#0a0f0b">
        {count}
      </text>
    </g>
  )
}

// ─── Side panel ──────────────────────────────────────────────────────────────

function SidePanel({
  item,
  onClose,
}: {
  item: { area: MapaArea; setor: SetorRow | null; live?: { jogos: JogoVivo[]; shows: ShowAtivo[]; festas: FestaAtiva[] }; hasLive: boolean }
  onClose: () => void
}) {
  const { area, setor, live, hasLive } = item
  const cfg = CATEGORIA_CONFIG[area.categoria]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="relative px-5 pt-5 pb-4 border-b border-[var(--border)]"
        style={{
          background: `linear-gradient(180deg, ${cfg.cor}25 0%, transparent 100%)`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--background)]/60 hover:text-[var(--foreground)]"
        >
          <X size={14} />
        </button>

        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: `${cfg.cor}25`, color: cfg.cor, border: `1px solid ${cfg.cor}50` }}
        >
          <span>{cfg.icone}</span>
          {cfg.label}
        </span>
        <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold tracking-tight">
          {area.icone ?? cfg.icone} {area.nome}
        </h2>
        {area.descricao && (
          <p className="mt-1.5 text-xs text-[var(--muted-foreground)] leading-relaxed">
            {area.descricao}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Live section */}
        {hasLive && live && (
          <section>
            <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--green-bright)] mb-2.5">
              <Radio size={11} className="animate-pulse" />
              Acontecendo agora
            </h3>
            <div className="space-y-2">
              {live.jogos.map(j => (
                <LiveJogoCard key={j.id} jogo={j} />
              ))}
              {live.shows.map(s => (
                <LiveShowCard key={s.id} show={s} />
              ))}
              {live.festas.map(f => (
                <LiveFestaCard key={f.id} festa={f} />
              ))}
            </div>
          </section>
        )}

        {/* Setor info */}
        {setor && (
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
              <MapPin size={10} className="inline mr-1" />
              Setor
            </h3>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-3 space-y-1.5">
              <div className="text-sm font-semibold">{setor.nome}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
                {setor.tipo && <span>Tipo: <strong className="text-[var(--foreground)]">{setor.tipo}</strong></span>}
                {setor.capacidade_pessoas != null && (
                  <span>Capacidade: <strong className="text-[var(--foreground)]">{setor.capacidade_pessoas} pessoas</strong></span>
                )}
              </div>
              {setor.observacoes && (
                <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5 leading-relaxed">
                  {setor.observacoes}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Capacidade fallback (sem setor) */}
        {!setor && area.capacidade && (
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
              <Users size={10} className="inline mr-1" />
              Capacidade
            </h3>
            <div className="text-sm font-semibold">{area.capacidade} pessoas</div>
          </section>
        )}

        {/* Sem nada acontecendo */}
        {!hasLive && (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center">
            <Sparkles size={16} className="mx-auto mb-2 text-[var(--muted-foreground)]/40" />
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Nenhuma atividade ao vivo aqui agora.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function LiveJogoCard({ jogo }: { jogo: JogoVivo }) {
  return (
    <div className="rounded-lg border border-[var(--green-bright)]/30 bg-[var(--green-dim)]/8 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {jogo.modalidade && <span className="text-xs">{jogo.modalidade.icone}</span>}
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--green-bright)]">
          {jogo.modalidade?.nome ?? 'Jogo'}
        </span>
        {jogo.teste && (
          <span className="ml-auto inline-flex rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/40">
            Teste
          </span>
        )}
        {jogo.divisao && (
          <span className="ml-auto text-[8px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/60">
            {jogo.divisao}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="flex-1 truncate font-semibold">{jogo.equipe_a_nome ?? '—'}</span>
        <span className="tabular-nums font-bold text-base text-[var(--green-bright)]">
          {jogo.placar_a ?? 0}
        </span>
        <span className="text-[var(--muted-foreground)]/40">×</span>
        <span className="tabular-nums font-bold text-base text-[var(--green-bright)]">
          {jogo.placar_b ?? 0}
        </span>
        <span className="flex-1 truncate font-semibold text-right">{jogo.equipe_b_nome ?? '—'}</span>
      </div>
    </div>
  )
}

function LiveShowCard({ show }: { show: ShowAtivo }) {
  return (
    <div className="rounded-lg border border-[var(--green-bright)]/30 bg-[var(--green-dim)]/8 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Music size={11} className="text-[var(--green-bright)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--green-bright)]">
          {show.tipo ?? 'Show'}
        </span>
        {show.embaixador && (
          <span className="inline-flex rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/40">
            ⭐ Embaixador
          </span>
        )}
      </div>
      <div className="text-sm font-bold leading-tight">{show.nome}</div>
      {(show.inicio || show.fim_previsto) && (
        <div className="mt-1 text-[10px] text-[var(--muted-foreground)] tabular-nums">
          {fmtTime(show.inicio)} → {fmtTime(show.fim_previsto)}
        </div>
      )}
    </div>
  )
}

function LiveFestaCard({ festa }: { festa: FestaAtiva }) {
  return (
    <div className="rounded-lg border border-[var(--green-bright)]/30 bg-[var(--green-dim)]/8 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles size={11} className="text-[var(--green-bright)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--green-bright)]">
          Festa
        </span>
      </div>
      <div className="text-sm font-bold leading-tight">{festa.nome}</div>
      {festa.tema && <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{festa.tema}</div>}
      {(festa.inicio || festa.fim_previsto) && (
        <div className="mt-1 text-[10px] text-[var(--muted-foreground)] tabular-nums">
          {fmtTime(festa.inicio)} → {fmtTime(festa.fim_previsto)}
        </div>
      )}
    </div>
  )
}

function EmptyPanel({ totalAreas, totalLive }: { totalAreas: number; totalLive: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center gap-3">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]/40">
        <MapPin size={22} className="text-[var(--muted-foreground)]/50" />
      </div>
      <div>
        <p className="font-[var(--font-display)] text-lg font-bold tracking-tight">
          Toque numa área
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[260px]">
          Cada bloco do mapa abre aqui — capacidade, setor relacionado e o que está rolando ao vivo.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center w-full max-w-[240px]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/40 p-2.5">
          <div className="tabular-nums text-xl font-bold">{totalAreas}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-0.5">áreas</div>
        </div>
        <div className="rounded-lg border border-[var(--green-bright)]/30 bg-[var(--green-dim)]/10 p-2.5">
          <div className="tabular-nums text-xl font-bold text-[var(--green-bright)]">{totalLive}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--green-bright)]/70 mt-0.5">ao vivo</div>
        </div>
      </div>
    </div>
  )
}
