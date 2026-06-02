'use client'

import 'leaflet/dist/leaflet.css'
import * as React from 'react'
import * as L from 'leaflet'
import { Wifi, ShieldCheck, Radio, Map, List, ChevronDown, ChevronUp } from 'lucide-react'
import type { Venue } from './types'

// ── Ícones por modalidade ────────────────────────────────────────────────────

const MOD_ICON: Record<string, string> = {
  volei: '🏐', voleibol: '🏐', 'volei de praia': '🏖️', voleidepraia: '🏖️',
  futsal: '🥅', futebol: '⚽', 'futebol de campo': '⚽', fut7: '⚽', 'futebol 7': '⚽',
  basquete: '🏀', basquetebol: '🏀', handebol: '🤾', peteca: '🏸',
  tenis: '🎾', 'tenis de mesa': '🏓', 'tenis de campo': '🎾',
  natacao: '🏊', atletismo: '🏃', xadrez: '♟️', luta: '🥋', lutas: '🥋',
}

// Ordem de prioridade: esportes mais "centrais" primeiro
const MOD_PRIORITY = [
  'futsal', 'futebol', 'basquete', 'handebol',
  'volei de praia', 'volei', 'peteca', 'tenis de mesa',
  'tenis de campo', 'tenis', 'natacao', 'atletismo', 'xadrez',
]

function normStr(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function modIcon(nome: string): string {
  const k = normStr(nome)
  return MOD_ICON[k] ?? '🏟️'
}

/** Ícone por prioridade de esporte — evita "primeiro alfabético" */
function venueIcon(v: Venue): string {
  if (!v.modalidades.length) return '📍'
  for (const prio of MOD_PRIORITY) {
    const found = v.modalidades.find(m => normStr(m).includes(prio))
    if (found) return modIcon(found)
  }
  return modIcon(v.modalidades[0])
}

// ── Distância entre duas praças (Haversine) ──────────────────────────────────

function dist(a: Venue, b: Venue): number {
  const R = 6371, d2r = Math.PI / 180
  const dLat = (b.lat - a.lat) * d2r, dLng = (b.lng - a.lng) * d2r
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * d2r) * Math.cos(b.lat * d2r) * Math.sin(dLng / 2) ** 2
  return +(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))).toFixed(1)
}

// ── Pins do Leaflet ──────────────────────────────────────────────────────────

function pinHtml(v: Venue, active: boolean, dimmed = false): string {
  const feat = v.modalidades.length >= 3
  const cls = ['cia-pin', feat ? 'feat' : '', active ? 'active' : '', dimmed ? 'dimmed' : '']
    .filter(Boolean).join(' ')
  return `<div class="${cls}"><span class="cia-pin-glow"></span><span class="cia-pin-ring"></span><span class="cia-pin-body">${venueIcon(v)}</span></div>`
}
function buildIcon(v: Venue, active = false, dimmed = false) {
  return L.divIcon({
    html: pinHtml(v, active, dimmed),
    className: 'cia-pin-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

// ── Componente principal ─────────────────────────────────────────────────────

export function MapaEsportivoVenuesClient({
  venues,
  semGeo,
  isAdmin = false,
}: {
  venues: Venue[]
  semGeo: string[]
  isAdmin?: boolean
}) {
  const mapEl   = React.useRef<HTMLDivElement | null>(null)
  const mapRef  = React.useRef<L.Map | null>(null)
  const markersRef = React.useRef<Record<number, L.Marker>>({})
  const panelRef   = React.useRef<HTMLDivElement | null>(null)

  const [sel, setSel]             = React.useState<number | null>(null)
  const selRef                    = React.useRef<number | null>(null)
  const [filterMod, setFilterMod] = React.useState<string | null>(null)
  const [viewMode, setViewMode]   = React.useState<'map' | 'list'>('map')
  const [showAllDists, setShowAllDists] = React.useState(false)

  // Todas as modalidades únicas (sem gênero) para os chips de filtro
  const allMods = React.useMemo(() => {
    const set = new Set<string>()
    venues.forEach(v => v.modalidades.forEach(m => set.add(m)))
    return [...set].sort()
  }, [venues])

  // Venues filtradas pelo chip ativo
  const filteredIds = React.useMemo(() => {
    if (!filterMod) return null // null = sem filtro = todas
    const ids = new Set(
      venues
        .filter(v => v.modalidades.some(m => normStr(m) === normStr(filterMod)))
        .map(v => v.id),
    )
    return ids
  }, [venues, filterMod])

  const filteredVenues = React.useMemo(
    () => (filteredIds ? venues.filter(v => filteredIds.has(v.id)) : venues),
    [venues, filteredIds],
  )

  // ── selectVenue ────────────────────────────────────────────────────────────
  const selectVenue = React.useCallback(
    (id: number | null) => {
      const map = mapRef.current
      const prev = selRef.current

      // Desfaz seleção anterior
      if (prev != null && markersRef.current[prev]) {
        const pv = venues.find(x => x.id === prev)
        if (pv) markersRef.current[prev].setIcon(buildIcon(pv, false))
      }
      selRef.current = id
      setSel(id)
      setShowAllDists(false)

      if (id != null) {
        const v = venues.find(x => x.id === id)
        if (v && markersRef.current[id]) {
          markersRef.current[id].setIcon(buildIcon(v, true))
          map?.flyTo([v.lat, v.lng], 16, { duration: 0.9 })
        }
        // Auto-scroll para o painel no mobile
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setTimeout(() => {
            panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 380)
        }
      }
    },
    [venues],
  )

  // ── Inicializa mapa ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, {
      center: [-19.748, -47.945],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    })
    mapRef.current = map

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © ESRI', maxZoom: 19 },
    ).addTo(map)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '', maxZoom: 19 },
    ).addTo(map)

    venues.forEach(v => {
      const m = L.marker([v.lat, v.lng], { icon: buildIcon(v) }).addTo(map)
      m.on('click', () => selectVenue(v.id))
      markersRef.current[v.id] = m
    })

    if (venues.length) {
      const b = L.latLngBounds(venues.map(v => [v.lat, v.lng] as [number, number]))
      map.fitBounds(b, { padding: [50, 50], maxZoom: 14 })
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const t = e.originalEvent.target as HTMLElement
      if (!t.closest('.cia-pin')) selectVenue(null)
    })

    setTimeout(() => map.invalidateSize(), 200)
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = {}
    }
  }, [selectVenue, venues])

  // ── Atualiza visibilidade dos pins ao filtrar ──────────────────────────────
  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Se a praça selecionada foi filtrada para fora, deseleciona
    if (selRef.current != null && filteredIds && !filteredIds.has(selRef.current)) {
      const prev = selRef.current
      if (markersRef.current[prev]) {
        const pv = venues.find(x => x.id === prev)
        if (pv) markersRef.current[prev].setIcon(buildIcon(pv, false))
      }
      selRef.current = null
      setSel(null)
    }

    venues.forEach(v => {
      const m = markersRef.current[v.id]
      if (!m) return
      const visible = !filteredIds || filteredIds.has(v.id)
      if (visible) {
        if (!map.hasLayer(m)) m.addTo(map)
      } else {
        if (map.hasLayer(m)) m.remove()
      }
    })
  }, [filteredIds, venues])

  // ── Dados do painel ────────────────────────────────────────────────────────
  const venue = sel != null ? venues.find(v => v.id === sel) ?? null : null

  const dists = React.useMemo(() => {
    if (!venue) return []
    return filteredVenues
      .filter(x => x.id !== venue.id)
      .map(x => ({ ...x, km: dist(venue, x) }))
      .sort((a, b) => a.km - b.km)
  }, [venue, filteredVenues])

  const visibleDists = showAllDists ? dists : dists.slice(0, 5)

  const comoChegar = venue
    ? (venue.maps_url ??
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${venue.nome}, ${venue.endereco ?? 'Uberaba - MG'}`,
        )}`)
    : '#'

  // ── Toggle de filtro ───────────────────────────────────────────────────────
  function toggleFilter(mod: string) {
    setFilterMod(prev => (prev === mod ? null : mod))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 md:py-8">
      <style>{PIN_CSS}</style>

      {/* Cabeçalho + toggle de visualização */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--green)]">Esportivo</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] md:text-3xl">
            Mapa Esportivo
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {venues.length} praças em Uberaba
            {filterMod ? ` · ${filteredVenues.length} com ${filterMod}` : ' · toque num ponto pra ver detalhes'}
          </p>
        </div>

        {/* Mapa / Lista */}
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
              viewMode === 'map'
                ? 'bg-[var(--green)] text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <Map className="h-3.5 w-3.5" /> Mapa
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--green)] text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </div>

      {/* Chips de filtro por modalidade */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setFilterMod(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            !filterMod
              ? 'bg-[var(--green)] text-white'
              : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
          }`}
        >
          Todas
        </button>
        {allMods.map(m => (
          <button
            key={m}
            onClick={() => toggleFilter(m)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filterMod === m
                ? 'bg-[var(--green)] text-white'
                : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <span>{modIcon(m)}</span>
            {m}
          </button>
        ))}
      </div>

      {viewMode === 'list' ? (
        /* ── Vista em lista ── */
        <ListaVenues
          venues={filteredVenues}
          onSelect={id => {
            setViewMode('map')
            selectVenue(id)
          }}
        />
      ) : (
        /* ── Vista em mapa ── */
        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">

          {/* Mapa */}
          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--border)]"
            style={{ height: 'clamp(360px, 64vh, 720px)' }}
          >
            <div ref={mapEl} className="absolute inset-0" />

            {/* Legenda */}
            <div className="absolute bottom-3 left-3 z-[400] rounded-lg border border-[var(--border)] bg-[var(--card)]/90 px-2.5 py-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--gold)]" />
                <span>halo = 3+ modalidades</span>
              </div>
              {filterMod && (
                <div className="mt-0.5 text-[10px] font-semibold text-[var(--green)]">
                  {filteredVenues.length} de {venues.length} praças
                </div>
              )}
            </div>
          </div>

          {/* Painel de detalhes */}
          <div
            ref={panelRef}
            className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
            style={{ maxHeight: 'clamp(360px, 64vh, 720px)' }}
          >
            {!venue ? (
              /* Empty state */
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <div className="text-3xl opacity-70">🗺️</div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
                  {filteredVenues.length} praça{filteredVenues.length !== 1 ? 's' : ''}
                  {filterMod ? ` · ${filterMod}` : ' · 1 cidade'}
                </h4>
                <p className="max-w-[240px] text-sm text-[var(--muted-foreground)]">
                  Toque em qualquer ponto no mapa pra ver as quadras, as modalidades e as distâncias.
                </p>
              </div>
            ) : (
              <>
                {/* Header da praça */}
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold)]">
                    Praça
                  </div>
                  <div className="mt-0.5 text-[15px] font-extrabold text-[var(--foreground)]">
                    {venue.nome}
                  </div>
                  {venue.endereco && (
                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{venue.endereco}</div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <a
                      href={comoChegar}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                    >
                      🧭 Como chegar
                    </a>
                    {venue.wifi && <Badge icon={<Wifi className="h-2.5 w-2.5" />} label="Wi-Fi" />}
                    {venue.apoio && <Badge icon={<ShieldCheck className="h-2.5 w-2.5" />} label="Apoio" />}
                    {venue.live && <Badge icon={<Radio className="h-2.5 w-2.5" />} label="Live" />}
                  </div>
                </div>

                {/* Corpo rolável */}
                <div className="flex-1 overflow-y-auto px-4 py-3">

                  {/* Quadras */}
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold)]">
                    Quadras / instalações ({venue.quadras.length})
                  </div>
                  {venue.quadras.map((q, i) => (
                    <div
                      key={i}
                      className="border-b border-dashed border-[var(--border)] py-1.5 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-[13px] font-semibold text-[var(--foreground)]">
                          {q.nome}
                        </span>
                        {q.capacidade != null && (
                          <span className="text-[10px] tabular-nums text-[var(--muted-foreground)]">
                            {q.capacidade.toLocaleString('pt-BR')} pess.
                          </span>
                        )}
                      </div>
                      {q.modalidades.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {q.modalidades.map((m, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                            >
                              <span>{modIcon(m)}</span>
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {venue.notas && (
                    <div className="mt-2 border-l-2 border-[var(--gold)] bg-[var(--gold)]/5 px-2.5 py-1.5 text-xs italic text-[var(--muted-foreground)]">
                      {venue.notas}
                    </div>
                  )}

                  {/* Praças próximas — máx 5 com "ver mais" */}
                  {dists.length > 0 && (
                    <>
                      <div className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold)]">
                        Praças próximas
                      </div>
                      {visibleDists.map(x => {
                        const cor =
                          x.km < 2
                            ? 'var(--green)'
                            : x.km < 5
                              ? 'var(--gold)'
                              : 'var(--muted-foreground)'
                        return (
                          <button
                            key={x.id}
                            onClick={() => selectVenue(x.id)}
                            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[var(--muted)]/50"
                          >
                            <span className="text-xs">{venueIcon(x)}</span>
                            <span className="flex-1 truncate text-xs text-[var(--muted-foreground)]">
                              {x.nome}
                            </span>
                            <span
                              className="rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                              style={{ color: cor, border: '1px solid var(--border)' }}
                            >
                              {x.km} km
                            </span>
                          </button>
                        )
                      })}
                      {dists.length > 5 && (
                        <button
                          onClick={() => setShowAllDists(v => !v)}
                          className="mt-1.5 flex w-full items-center justify-center gap-1 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                        >
                          {showAllDists ? (
                            <><ChevronUp className="h-3 w-3" /> Mostrar menos</>
                          ) : (
                            <><ChevronDown className="h-3 w-3" /> Ver todas ({dists.length})</>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Alerta de setores sem coordenada — só pra admin/coord */}
      {isAdmin && semGeo.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--gold)]/40 bg-[var(--gold)]/5 px-4 py-3 text-xs text-[var(--muted-foreground)]">
          <span className="font-bold text-[var(--gold)]">
            {semGeo.length} setor{semGeo.length !== 1 ? 'es' : ''} sem coordenada
          </span>{' '}
          (não aparece{semGeo.length !== 1 ? 'm' : ''} no mapa):{' '}
          {semGeo.join(' · ')}. Preencha lat/lng em{' '}
          <span className="font-mono">Admin → Setores</span> e{' '}
          {semGeo.length !== 1 ? 'entram' : 'entra'} automaticamente.
        </div>
      )}
    </div>
  )
}

// ── Vista em lista ────────────────────────────────────────────────────────────

function ListaVenues({
  venues,
  onSelect,
}: {
  venues: Venue[]
  onSelect: (id: number) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {venues.map(v => (
        <div
          key={v.id}
          className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-2xl">{venueIcon(v)}</span>
            <div className="flex gap-1">
              {v.live  && <Badge icon={<Radio      className="h-2.5 w-2.5" />} label="Live"  />}
              {v.wifi  && <Badge icon={<Wifi       className="h-2.5 w-2.5" />} label="Wi-Fi" />}
              {v.apoio && <Badge icon={<ShieldCheck className="h-2.5 w-2.5" />} label="Apoio" />}
            </div>
          </div>
          <div className="mt-2 text-sm font-bold leading-snug text-[var(--foreground)]">
            {v.nome}
          </div>
          {v.endereco && (
            <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{v.endereco}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {v.modalidades.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
              >
                <span>{modIcon(m)}</span>
                {m}
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onSelect(v.id)}
              className="flex-1 rounded-lg border border-[var(--border)] py-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              Ver no mapa
            </button>
            <a
              href={
                v.maps_url ??
                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  `${v.nome}, ${v.endereco ?? 'Uberaba - MG'}`,
                )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-[var(--green)] py-1.5 text-center text-[11px] font-bold text-white transition-opacity hover:opacity-90"
            >
              🧭 Como chegar
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-1 text-[10px] font-medium text-[var(--muted-foreground)]">
      {icon}
      {label}
    </span>
  )
}

// ── CSS dos pins ──────────────────────────────────────────────────────────────

const PIN_CSS = `
.cia-pin-icon { background: transparent !important; border: none !important; }
.cia-pin {
  position: relative; width: 40px; height: 40px;
  display: grid; place-items: center;
  cursor: pointer; transition: transform .2s ease, opacity .2s ease;
}
.cia-pin:hover  { transform: translateY(-3px) scale(1.1); }
.cia-pin.active { transform: translateY(-4px) scale(1.15); }
.cia-pin.dimmed { opacity: 0.35; pointer-events: none; }

.cia-pin-glow {
  position: absolute; inset: -8px; border-radius: 50%;
  background: radial-gradient(circle, rgba(212,179,106,.6), transparent 68%);
  filter: blur(5px); opacity: 0; transition: opacity .3s;
}
.cia-pin:hover .cia-pin-glow,
.cia-pin.active .cia-pin-glow { opacity: 1; }
.cia-pin.feat .cia-pin-glow  { opacity: .7; animation: ciaHalo 2.2s ease-in-out infinite; }
@keyframes ciaHalo { 50% { opacity: .3; filter: blur(10px); } }

.cia-pin-ring {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 2px dashed #d4b36a; opacity: 0;
  animation: ciaSpin 10s linear infinite;
}
.cia-pin.active .cia-pin-ring { opacity: .6; }
@keyframes ciaSpin { to { transform: rotate(360deg); } }

.cia-pin-body {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(145deg, #f3ecd2, #d4b36a 60%, #c8a048);
  display: grid; place-items: center; font-size: 15px;
  box-shadow: 0 3px 12px rgba(0,0,0,.5), 0 0 0 2px rgba(10,26,16,.4), inset 0 1px 0 rgba(255,255,255,.25);
}
.cia-pin.feat .cia-pin-body {
  background: linear-gradient(145deg, #efd07a, #d4b36a 60%, #a07c2e);
  box-shadow: 0 3px 14px rgba(0,0,0,.5), 0 0 0 2.5px rgba(239,208,122,.45), inset 0 1px 0 rgba(255,255,255,.3);
}
.cia-pin.active .cia-pin-body {
  box-shadow: 0 4px 20px rgba(0,0,0,.6), 0 0 0 3px #efd07a, inset 0 1px 0 rgba(255,255,255,.3);
}
`
