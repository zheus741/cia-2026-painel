'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
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
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 3.5rem)', background:'#060d1e', fontFamily:'Rajdhani,system-ui,sans-serif' }}>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', flexShrink:0, borderBottom:'1px solid rgba(255,255,255,.06)', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, letterSpacing:'0.4em', color:'rgba(255,255,255,.3)', textTransform:'uppercase', marginBottom:2 }}>
            CIA 2026 · Centro Park · Uberaba
          </div>
          <h1 style={{ fontFamily:'Orbitron,monospace', fontWeight:700, fontSize:20, color:'#fff', letterSpacing:'0.14em', textTransform:'uppercase', margin:0, lineHeight:1 }}>
            MAPA DO EVENTO
          </h1>
          {totalLive > 0 && (
            <p style={{ margin:'4px 0 0', fontFamily:'Rajdhani,system-ui', fontSize:12, color:'#4ade80' }}>
              · {totalLive} área{totalLive > 1 ? 's' : ''} com atividade agora
            </p>
          )}
        </div>
        <span
          style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'5px 12px', borderRadius:9999,
            border: conectado ? '1px solid rgba(74,222,128,.3)' : '1px solid rgba(255,255,255,.1)',
            background: conectado ? 'rgba(74,222,128,.08)' : 'rgba(255,255,255,.04)',
            fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700,
            letterSpacing:'0.2em', textTransform:'uppercase',
            color: conectado ? '#4ade80' : 'rgba(255,255,255,.35)',
            flexShrink:0,
          }}
        >
          <span style={{ width:6, height:6, borderRadius:'50%', background: conectado ? '#4ade80' : 'rgba(255,255,255,.3)', animation: conectado ? 'pulse 2s infinite' : 'none' }} />
          {conectado ? 'Ao vivo' : 'Conectando'}
        </span>
      </div>

      {/* Main grid: mapa + side panel */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr', gap:8, padding:'8px 8px 8px 8px', minHeight:0, overflow:'hidden' }}
           className="lg:grid-cols-[1fr_360px]">

        {/* MAPA */}
        <div style={{ position:'relative', overflow:'hidden', borderRadius:16, border:'1px solid rgba(255,255,255,.08)', background:'#060d1e', minHeight:460 }}>

          {/* Subtle vignette */}
          <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none',
            background:'radial-gradient(70% 55% at 50% 50%, rgba(74,222,128,.04) 0%, transparent 70%), radial-gradient(50% 40% at 90% 90%, rgba(251,146,60,.03) 0%, transparent 60%)',
          }} />

          {/* Zoom controls */}
          <div style={{ position:'absolute', top:12, right:12, zIndex:10, display:'flex', flexDirection:'column', gap:6 }}>
            {[
              { icon: <ZoomIn size={14} />, action: () => adjustZoom(0.2), title: 'Zoom in' },
              { icon: <ZoomOut size={14} />, action: () => adjustZoom(-0.2), title: 'Zoom out' },
              { icon: <Crosshair size={14} />, action: resetView, title: 'Resetar' },
            ].map(({ icon, action, title }) => (
              <button
                key={title}
                onClick={action}
                title={title}
                style={{
                  width:32, height:32, borderRadius:8,
                  border:'1px solid rgba(255,255,255,0.10)',
                  background:'rgba(6,13,30,0.85)',
                  color:'rgba(255,255,255,0.45)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', backdropFilter:'blur(8px)',
                  transition:'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(74,222,128,0.4)'; (e.currentTarget as HTMLElement).style.color='#4ade80' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.10)'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.45)' }}
              >
                {icon}
              </button>
            ))}
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
              {/* Defs */}
              <defs>
                {categoriasOrdenadas.map(cat => {
                  const cfg = CATEGORIA_CONFIG[cat]
                  return (
                    <linearGradient key={cat} id={`g-${cat}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%"   stopColor={cfg.cor} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={cfg.cor} stopOpacity="0.10" />
                    </linearGradient>
                  )
                })}
                <filter id="glow-live">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-sel">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Dot grid — similar ao grid de ruas da ref FIFA */}
                <pattern id="dotgrid" patternUnits="userSpaceOnUse" width="28" height="28">
                  <rect width="28" height="28" fill="#060d1e" />
                  <circle cx="14" cy="14" r="0.7" fill="rgba(255,255,255,0.07)" />
                </pattern>
              </defs>

              {/* Base navy */}
              <rect x={0} y={0} width={VIEWBOX.w} height={VIEWBOX.h} fill="url(#dotgrid)" />

              {/* Venue ground polygons — área do evento levemente mais clara */}
              {/* Zona A: Palco Principal + CIA Club esq. */}
              <polygon
                points="18,22 392,18 402,98 570,98 582,708 548,752 18,772"
                fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"
              />
              {/* Zona B: Eletrônico + Bares centro */}
              <polygon
                points="570,98 842,98 858,558 596,710 582,708"
                fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"
              />
              {/* Zona C: CIA Club dir. + Bar 04 */}
              <polygon
                points="842,98 1160,200 1162,560 1162,648 988,672 850,558 858,558"
                fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"
              />
              {/* Faixa de serviços — base */}
              <rect x={92} y={742} width={690} height={65} rx={4}
                fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.07)" strokeWidth="1"
              />

              {/* Caminho / circulação central */}
              <polygon
                points="570,98 600,98 600,290 658,290 658,740 570,740 570,708"
                fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"
              />

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
        <div style={{ borderRadius:16, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(10,18,40,0.95)', overflow:'hidden', minHeight:0, display:'flex', flexDirection:'column' }}>
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
    <div style={{ display:'flex', height:'100%', flexDirection:'column', fontFamily:'Rajdhani,system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{
        position:'relative', padding:'20px 20px 16px', flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        background: `linear-gradient(180deg, ${cfg.cor}20 0%, transparent 100%)`,
      }}>
        <button
          onClick={onClose}
          style={{
            position:'absolute', right:10, top:10,
            width:28, height:28, borderRadius:'50%',
            border:'1px solid rgba(255,255,255,0.08)', background:'rgba(6,13,30,0.6)',
            color:'rgba(255,255,255,0.45)', display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', transition:'background 0.15s',
          }}
        >
          <X size={13} />
        </button>

        <span style={{
          display:'inline-flex', alignItems:'center', gap:4,
          borderRadius:9999, padding:'2px 10px',
          background: `${cfg.cor}20`, color: cfg.cor, border: `1px solid ${cfg.cor}40`,
          fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase',
        }}>
          <span>{cfg.icone}</span>
          {cfg.label}
        </span>
        <h2 style={{ margin:'8px 0 0', fontFamily:'Orbitron,monospace', fontSize:18, fontWeight:700, color:'#fff', letterSpacing:'0.05em', lineHeight:1.2 }}>
          {area.nome}
        </h2>
        {area.descricao && (
          <p style={{ margin:'6px 0 0', fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>
            {area.descricao}
          </p>
        )}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Live section */}
        {hasLive && live && (
          <section>
            <h3 style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'#4ade80', marginBottom:10 }}>
              <Radio size={10} style={{ animation:'pulse 2s infinite' }} />
              Acontecendo agora
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {live.jogos.map(j => <LiveJogoCard key={j.id} jogo={j} />)}
              {live.shows.map(s => <LiveShowCard key={s.id} show={s} />)}
              {live.festas.map(f => <LiveFestaCard key={f.id} festa={f} />)}
            </div>
          </section>
        )}

        {/* Setor info */}
        {setor && (
          <section>
            <h3 style={{ fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
              <MapPin size={9} />
              Setor
            </h3>
            <div style={{ borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{setor.nome}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 16px', fontSize:11, color:'rgba(255,255,255,0.45)' }}>
                {setor.tipo && <span>Tipo: <strong style={{ color:'rgba(255,255,255,0.8)' }}>{setor.tipo}</strong></span>}
                {setor.capacidade_pessoas != null && (
                  <span>Capacidade: <strong style={{ color:'rgba(255,255,255,0.8)' }}>{setor.capacidade_pessoas} pessoas</strong></span>
                )}
              </div>
              {setor.observacoes && (
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.5, margin:0 }}>
                  {setor.observacoes}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Capacidade fallback (sem setor) */}
        {!setor && area.capacidade && (
          <section>
            <h3 style={{ fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
              <Users size={9} />
              Capacidade
            </h3>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{area.capacidade} pessoas</div>
          </section>
        )}

        {/* Sem nada acontecendo */}
        {!hasLive && (
          <div style={{ borderRadius:10, border:'1px dashed rgba(255,255,255,0.10)', padding:20, textAlign:'center' }}>
            <Sparkles size={16} style={{ margin:'0 auto 8px', color:'rgba(255,255,255,0.2)', display:'block' }} />
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:0 }}>
              Nenhuma atividade ao vivo aqui agora.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const LIVE_CARD: React.CSSProperties = {
  borderRadius:10, border:'1px solid rgba(74,222,128,0.25)',
  background:'rgba(74,222,128,0.06)', padding:'10px 12px',
  fontFamily:'Rajdhani,system-ui,sans-serif',
}
const LIVE_LABEL: React.CSSProperties = {
  fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700,
  letterSpacing:'0.15em', textTransform:'uppercase', color:'#4ade80',
}
const BADGE_AMBER: React.CSSProperties = {
  display:'inline-flex', borderRadius:9999, background:'rgba(245,158,11,0.18)',
  border:'1px solid rgba(245,158,11,0.35)', padding:'1px 6px',
  fontSize:8, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#fbbf24',
}

function LiveJogoCard({ jogo }: { jogo: JogoVivo }) {
  return (
    <div style={LIVE_CARD}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        {jogo.modalidade && <span style={{ fontSize:13 }}>{jogo.modalidade.icone}</span>}
        <span style={LIVE_LABEL}>{jogo.modalidade?.nome ?? 'Jogo'}</span>
        {jogo.teste && <span style={{ ...BADGE_AMBER, marginLeft:'auto' }}>Teste</span>}
        {!jogo.teste && jogo.divisao && (
          <span style={{ marginLeft:'auto', fontSize:8, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>
            {jogo.divisao}
          </span>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:700, color:'#fff' }}>
          {jogo.equipe_a_nome ?? '—'}
        </span>
        <span style={{ fontVariantNumeric:'tabular-nums', fontWeight:800, fontSize:16, color:'#4ade80' }}>
          {jogo.placar_a ?? 0}
        </span>
        <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11 }}>×</span>
        <span style={{ fontVariantNumeric:'tabular-nums', fontWeight:800, fontSize:16, color:'#4ade80' }}>
          {jogo.placar_b ?? 0}
        </span>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:700, color:'#fff', textAlign:'right' }}>
          {jogo.equipe_b_nome ?? '—'}
        </span>
      </div>
    </div>
  )
}

function LiveShowCard({ show }: { show: ShowAtivo }) {
  return (
    <div style={LIVE_CARD}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <Music size={10} style={{ color:'#4ade80', flexShrink:0 }} />
        <span style={LIVE_LABEL}>{show.tipo ?? 'Show'}</span>
        {show.embaixador && <span style={{ ...BADGE_AMBER, marginLeft:'auto' }}>⭐ Embaixador</span>}
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:'#fff', lineHeight:1.2 }}>{show.nome}</div>
      {(show.inicio || show.fim_previsto) && (
        <div style={{ marginTop:4, fontSize:10, color:'rgba(255,255,255,0.4)', fontVariantNumeric:'tabular-nums' }}>
          {fmtTime(show.inicio)} → {fmtTime(show.fim_previsto)}
        </div>
      )}
    </div>
  )
}

function LiveFestaCard({ festa }: { festa: FestaAtiva }) {
  return (
    <div style={LIVE_CARD}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <Sparkles size={10} style={{ color:'#4ade80', flexShrink:0 }} />
        <span style={LIVE_LABEL}>Festa</span>
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:'#fff', lineHeight:1.2 }}>{festa.nome}</div>
      {festa.tema && <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{festa.tema}</div>}
      {(festa.inicio || festa.fim_previsto) && (
        <div style={{ marginTop:4, fontSize:10, color:'rgba(255,255,255,0.4)', fontVariantNumeric:'tabular-nums' }}>
          {fmtTime(festa.inicio)} → {fmtTime(festa.fim_previsto)}
        </div>
      )}
    </div>
  )
}

function EmptyPanel({ totalAreas, totalLive }: { totalAreas: number; totalLive: number }) {
  return (
    <div style={{ display:'flex', height:'100%', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', gap:12, fontFamily:'Rajdhani,system-ui,sans-serif' }}>
      {/* Ícone */}
      <div style={{
        width:56, height:56, borderRadius:'50%',
        border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <MapPin size={22} style={{ color:'rgba(255,255,255,0.25)' }} />
      </div>
      <div>
        <p style={{ fontFamily:'Orbitron,monospace', fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'0.05em', margin:0 }}>
          Toque numa área
        </p>
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:6, maxWidth:240, lineHeight:1.5 }}>
          Cada bloco do mapa abre aqui — capacidade, setor e o que está rolando ao vivo.
        </p>
      </div>
      {/* Stats */}
      <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, width:'100%', maxWidth:220 }}>
        <div style={{ borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', padding:'10px 8px', textAlign:'center' }}>
          <div style={{ fontVariantNumeric:'tabular-nums', fontSize:22, fontWeight:800, color:'#fff' }}>{totalAreas}</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginTop:2 }}>áreas</div>
        </div>
        <div style={{ borderRadius:10, border:'1px solid rgba(74,222,128,0.25)', background:'rgba(74,222,128,0.06)', padding:'10px 8px', textAlign:'center' }}>
          <div style={{ fontVariantNumeric:'tabular-nums', fontSize:22, fontWeight:800, color:'#4ade80' }}>{totalLive}</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(74,222,128,0.6)', marginTop:2 }}>ao vivo</div>
        </div>
      </div>
    </div>
  )
}
