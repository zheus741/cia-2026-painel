'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

interface Facility { i: string; q: string; n: string }

interface Venue {
  id: number
  icon: string
  feat?: boolean
  name: string
  neigh: string
  addr: string
  lat: number
  lng: number
  fac: Facility[]
  note?: string
}

const VENUES: Venue[] = [
  { id:1,  icon:'🏟️', feat:true,
    name:'CEMEA Boa Vista',              neigh:'Indianópolis',         addr:'Av. Djalma Castro Alves, 340',
    lat:-19.7282, lng:-47.9554,
    fac:[{i:'🏐',q:'1',n:'Quadra de Vôlei'},{i:'🥅',q:'1',n:'Quadra de Futsal'},{i:'🤾',q:'1',n:'Quadra de Handebol'},{i:'🏀',q:'1',n:'Quadra de Basquete'},{i:'🧍',q:'✓',n:'Área do Atleta'}] },
  { id:2,  icon:'🏟️', feat:true,
    name:'FUNEL',                        neigh:'Abadia',               addr:'Av. Orlando Rodrigues da Cunha, 1837',
    lat:-19.7493, lng:-47.9270,
    fac:[{i:'🏐',q:'1',n:'Quadra de Vôlei'},{i:'🥅',q:'1',n:'Quadra de Futsal'},{i:'🤾',q:'2',n:'Quadras de Handebol'},{i:'🏀',q:'1',n:'Quadra de Basquete'},{i:'🧍',q:'✓',n:'Área do Atleta'}] },
  { id:3,  icon:'⛵', feat:true,
    name:'Uirapuru Iate Clube',          neigh:'Santa Maria',          addr:'Rua Amapá, 810',
    lat:-19.7750, lng:-47.9380,
    fac:[{i:'🏀',q:'3',n:'Quadras de Basquete'},{i:'🏐',q:'2',n:'Quadras de Vôlei'},{i:'🏸',q:'6',n:'Quadras de Peteca'},{i:'🎾',q:'6',n:'Quadras de Tênis'},{i:'⚽',q:'1',n:'Campo de Futebol (iluminado)'},{i:'🧍',q:'✓',n:'Área do Atleta'}] },
  { id:4,  icon:'🤾',
    name:'CIE — C. Iniciação ao Esporte',neigh:'Beija-Flor II',        addr:'Rua Mário Teodoro, 148',
    lat:-19.7895, lng:-47.9680,
    fac:[{i:'🤾',q:'1',n:'Quadra de Handebol'}] },
  { id:5,  icon:'🏊',
    name:'UTC — Uberaba Tênis Clube',    neigh:'N. Sra. da Abadia',    addr:'Praça Dr. Thomaz Ulhôa, 461',
    lat:-19.7535, lng:-47.9305,
    fac:[{i:'🥅',q:'1',n:'Quadra de Futsal'},{i:'🏊',q:'✓',n:'Piscina'},{i:'🥁',q:'✓',n:'Bateria'}] },
  { id:6,  icon:'🏓',
    name:'FETI — Fundação Ensino Técnico',neigh:'São Benedito',        addr:'Rua Major Eustáquio, 790',
    lat:-19.7485, lng:-47.9400,
    fac:[{i:'🏓',q:'✓',n:'Tênis de Mesa'},{i:'♟️',q:'✓',n:'Xadrez'}] },
  { id:7,  icon:'🥋',
    name:'Clube SESI Minas',             neigh:'Res. Estados Unidos',  addr:'Rua Francisco Bertoldi, 133',
    lat:-19.7140, lng:-47.9810,
    fac:[{i:'⚽',q:'1',n:'Campo de Futebol'},{i:'🥋',q:'✓',n:'Lutas · Cheer · Jiu-Jitsu · Judô'}] },
  { id:8,  icon:'🎓',
    name:'UNIUBE',                       neigh:'Universitário',        addr:'Av. Nenê Sabino, 1801',
    lat:-19.7200, lng:-47.9682,
    fac:[{i:'🥅',q:'*',n:'Futsal (sob demanda)'},{i:'🤾',q:'*',n:'Handebol (sob demanda)'},{i:'🏃',q:'✓',n:'Pista de Atletismo'}],
    note:'* Ativadas conforme demanda de inscrições.' },
  { id:9,  icon:'⚽', feat:true,
    name:'Estádio Uberabão',             neigh:'Vila Olímpica',        addr:'R. Aluísio de Melo Teixeira',
    lat:-19.7380, lng:-47.9425,
    fac:[{i:'⚽',q:'1',n:'Campo c/ iluminação'}] },
  { id:10, icon:'⚽',
    name:'Campo Vila Nova',              neigh:'COHAB Boa Vista',      addr:'R. Soldado José Costa Souza',
    lat:-19.7250, lng:-47.9520,
    fac:[{i:'⚽',q:'1',n:'Campo Iluminado'}] },
  { id:11, icon:'⚽',
    name:'Campo Atlético Abadia',        neigh:'Abadia',               addr:'R. Iguatama, 460',
    lat:-19.7510, lng:-47.9325,
    fac:[{i:'⚽',q:'1',n:'Campo Iluminado'}] },
  { id:12, icon:'⚽',
    name:'Campo Nenenzão',               neigh:'Olinda',               addr:'Av. Nenê Sabino, 744-854',
    lat:-19.7255, lng:-47.9645,
    fac:[{i:'⚽',q:'1',n:'Campo Iluminado'}] },
  { id:13, icon:'🏫',
    name:'Ginásio Corina de Oliveira',   neigh:'Mercês',               addr:'Av. da Saudade, 289',
    lat:-19.7460, lng:-47.9315,
    fac:[{i:'🥅',q:'1',n:'Quadra de Futsal'},{i:'🏐',q:'1',n:'Quadra de Vôlei'}] },
  { id:14, icon:'🏫',
    name:'SESC Uberaba',                 neigh:'Fabrício',             addr:'Rua Ricardo Misson, 411',
    lat:-19.7520, lng:-47.9455,
    fac:[{i:'🏐',q:'1',n:'Quadra de Vôlei'}] },
  { id:15, icon:'🏀',
    name:'Conselho Afro',                neigh:'Jardim Elza Amui I',   addr:'Rua Nilton Rosa Nunes, 40',
    lat:-19.7700, lng:-47.9820,
    fac:[{i:'🏀',q:'1',n:'Quadra de Basquete'}] },
  { id:16, icon:'⚽',
    name:'Toca da Bola',                 neigh:'Universitário',        addr:'R. Guiomar Rodrigues da Cunha, 201',
    lat:-19.7220, lng:-47.9660,
    fac:[{i:'⚽',q:'1',n:'Campo Fut7'},{i:'🏐',q:'2',n:'Vôlei de Areia'}] },
  { id:17, icon:'⚽',
    name:'Campo SESI (iluminado)',        neigh:'Res. Estados Unidos',  addr:'R. Francisco Bertoldi, 133',
    lat:-19.7155, lng:-47.9800,
    fac:[{i:'⚽',q:'1',n:'Campo Iluminado'}] },
]

const STATS = [
  {icon:'🏟️',num:'17',lbl:'Praças'},
  {icon:'🏐',num:'8', lbl:'Vôlei'},
  {icon:'🥅',num:'6', lbl:'Futsal'},
  {icon:'🏀',num:'6', lbl:'Basquete'},
  {icon:'🤾',num:'5', lbl:'Handebol'},
  {icon:'⚽',num:'8', lbl:'Campos'},
  {icon:'🎾',num:'6', lbl:'Tênis'},
  {icon:'🏸',num:'6', lbl:'Peteca'},
  {icon:'🏊',num:'1', lbl:'Piscina'},
  {icon:'🥋',num:'1', lbl:'Lutas'},
  {icon:'🏓',num:'1', lbl:'T.Mesa'},
]

// ─────────────────────────────────────────────────────────────────────────────
// Haversine
// ─────────────────────────────────────────────────────────────────────────────

function haversine(a: Venue, b: Venue): number {
  const R = 6371, d2r = Math.PI / 180
  const dLat = (b.lat - a.lat) * d2r
  const dLng = (b.lng - a.lng) * d2r
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * d2r) * Math.cos(b.lat * d2r) * Math.sin(dLng / 2) ** 2
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))).toFixed(1))
}

// ─────────────────────────────────────────────────────────────────────────────
// Pin icon factory
// ─────────────────────────────────────────────────────────────────────────────

function makePin(venue: Venue, active = false) {
  const glow    = active ? 'opacity:1' : venue.feat ? 'opacity:.7;animation:cia-pin-halo 2.2s ease-in-out infinite' : 'opacity:0'
  const ringOp  = active ? 'opacity:.6' : 'opacity:0'
  const bodyBg  = active || venue.feat
    ? 'linear-gradient(145deg,#e8b94f,#c8973a 60%,#a07020)'
    : 'linear-gradient(145deg,#d4c08a,#c8973a 60%,#a07020)'
  const bodySh  = active
    ? '0 3px 20px rgba(0,0,0,.7),0 0 0 3px #e8b94f,inset 0 1px 0 rgba(255,255,255,.3)'
    : venue.feat
    ? '0 3px 14px rgba(0,0,0,.65),0 0 0 2.5px rgba(232,185,79,.45),inset 0 1px 0 rgba(255,255,255,.3)'
    : '0 3px 12px rgba(0,0,0,.65),0 0 0 2px rgba(10,26,16,.5),inset 0 1px 0 rgba(255,255,255,.25)'
  const sz = active ? '36px' : '32px'

  return L.divIcon({
    html: `<style>
      @keyframes cia-pin-halo{50%{opacity:.3;filter:blur(10px);}}
      @keyframes cia-pin-spin{to{transform:rotate(360deg);}}
    </style>
    <div style="position:relative;width:40px;height:40px;display:grid;place-items:center;cursor:pointer;transition:transform .22s ease;${active?'transform:translateY(-4px) scale(1.15)':''}">
      <div style="position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,rgba(232,185,79,.65),transparent 68%);filter:blur(5px);${glow};transition:opacity .3s"></div>
      <div style="position:absolute;inset:-4px;border-radius:50%;border:2px dashed #e8b94f;${ringOp};animation:cia-pin-spin 10s linear infinite"></div>
      <div style="width:${sz};height:${sz};border-radius:50%;background:${bodyBg};display:grid;place-items:center;font-size:${active?'15px':'14px'};box-shadow:${bodySh};transition:all .22s">${venue.icon}</div>
    </div>`,
    className: '',
    iconSize:   [40, 40],
    iconAnchor: [20, 20],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Venue panel (right side)
// ─────────────────────────────────────────────────────────────────────────────

function VenuePanel({
  venue,
  onSelectVenue,
  onClose,
}: {
  venue: Venue | null
  onSelectVenue: (id: number) => void
  onClose: () => void
}) {
  const gold    = '#c8973a'
  const goldBr  = '#e8b94f'
  const muted   = '#4e7055'
  const fg      = '#c8dccb'
  const border  = 'rgba(74,138,92,0.2)'
  const border2 = 'rgba(74,138,92,0.1)'

  if (!venue) {
    return (
      <div style={{
        flex: '0 0 300px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: 'rgba(13,26,15,0.85)', backdropFilter: 'blur(20px)',
        border: `1px solid ${border}`, borderRadius: 12,
        padding: '24px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', opacity: .6 }}>✦ ⚜ ✦</div>
        <p style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: '0.14em', color: fg, textTransform: 'uppercase', margin: 0 }}>
          17 Arenas · 1 Cidade
        </p>
        <p style={{ fontFamily: 'system-ui', fontSize: 12, color: muted, lineHeight: 1.5, margin: 0 }}>
          Toque em qualquer pin no mapa para ver as instalações e as distâncias até as demais praças.
        </p>
      </div>
    )
  }

  const distances = VENUES
    .filter(v => v.id !== venue.id)
    .map(v => ({ ...v, km: haversine(venue, v) }))
    .sort((a, b) => a.km - b.km)

  return (
    <div style={{
      flex: '0 0 300px', display: 'flex', flexDirection: 'column',
      background: 'rgba(13,26,15,0.88)', backdropFilter: 'blur(20px)',
      border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${border2}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.35em', color: goldBr, textTransform: 'uppercase' }}>
            Praça · {String(venue.id).padStart(2, '0')}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, fontSize: 13, color: fg, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.25 }}>
          {venue.name}
        </div>
        <div style={{ fontFamily: 'system-ui', fontStyle: 'italic', fontSize: 11, color: muted, textAlign: 'center', marginTop: 4, lineHeight: 1.4 }}>
          {venue.addr} — <span style={{ color: goldBr }}>{venue.neigh}</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', scrollbarWidth: 'thin' }}>

        {/* Facilities */}
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.28em', color: goldBr, textTransform: 'uppercase', marginBottom: 6, paddingBottom: 4, borderBottom: `1px dashed ${border2}` }}>
          Instalações
        </div>
        {venue.fac.map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto', alignItems: 'center', gap: 8, padding: '5px 6px', borderBottom: `1px dashed ${border2}` }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%,#d4c08a,#c8973a)', display: 'grid', placeItems: 'center', fontSize: 12, boxShadow: 'inset 0 0 0 1.5px rgba(10,26,16,.35),0 2px 5px rgba(0,0,0,.3)' }}>
              {f.i}
            </div>
            <span style={{ fontSize: 12, color: fg, fontFamily: 'system-ui', fontWeight: 500 }}>{f.n}</span>
            <span style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, fontSize: 12, color: goldBr }}>{f.q}</span>
          </div>
        ))}

        {venue.note && (
          <div style={{ marginTop: 8, padding: '7px 9px', borderLeft: `2px solid ${gold}`, background: 'rgba(200,151,58,0.05)', fontStyle: 'italic', fontSize: 11, color: muted, lineHeight: 1.4 }}>
            {venue.note}
          </div>
        )}

        {/* Distances */}
        <div style={{ marginTop: 12, fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.28em', color: goldBr, textTransform: 'uppercase', marginBottom: 6, paddingBottom: 4, borderBottom: `1px dashed ${border2}` }}>
          Distâncias
        </div>
        {distances.map(v => {
          const cls = v.km < 2 ? '#6ab87e' : v.km < 5 ? goldBr : muted
          return (
            <div
              key={v.id}
              onClick={() => onSelectVenue(v.id)}
              style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', alignItems: 'center', gap: 7, padding: '5px 5px', borderRadius: 4, borderBottom: `1px dashed rgba(74,138,92,0.08)`, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(74,138,92,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <span style={{ fontSize: 12, textAlign: 'center' }}>{v.icon}</span>
              <span style={{ fontSize: 11, color: muted, fontFamily: 'system-ui', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, fontSize: 11, color: cls, background: 'rgba(74,138,92,0.1)', padding: '2px 6px', borderRadius: 3, border: `1px solid rgba(74,138,92,0.2)`, whiteSpace: 'nowrap' }}>
                {v.km} km
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function MapaVenuesClient() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<L.Map | null>(null)
  const markersRef      = useRef<Record<number, L.Marker>>({})
  const [selected, setSelected] = useState<Venue | null>(null)

  // Build / rebuild marker icon when selection changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([idStr, marker]) => {
      const id    = Number(idStr)
      const venue = VENUES.find(v => v.id === id)!
      marker.setIcon(makePin(venue, selected?.id === id))
    })
  }, [selected])

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [-19.748, -47.945],
      zoom:   13,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    // Satellite
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © ESRI', maxZoom: 19 },
    ).addTo(map)

    // Labels overlay
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '', maxZoom: 19, pane: 'overlayPane' },
    ).addTo(map)

    // Add pins
    VENUES.forEach(v => {
      const m = L.marker([v.lat, v.lng], { icon: makePin(v) }).addTo(map)
      m.on('click', () => setSelected(v))
      markersRef.current[v.id] = m
    })

    // Click map background → deselect
    map.on('click', (e: L.LeafletMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement
      if (!target.closest?.('[data-id]') && !target.closest?.('.pin-wrap')) {
        setSelected(null)
      }
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  function handleSelectVenue(id: number) {
    const venue = VENUES.find(v => v.id === id)
    if (!venue || !mapRef.current) return
    setSelected(venue)
    mapRef.current.flyTo([venue.lat, venue.lng], 16, { duration: 0.9 })
  }

  // 3.5rem = 56px = h-14 (AppShell header). Bypasses the percentage-height
  // chain through overflow-auto so Leaflet always gets a concrete pixel value.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3.5rem)', gap: 8, padding: 8 }}>

      {/* Map + Panel row */}
      <div style={{ display: 'flex', flex: 1, gap: 8, minHeight: 0 }}>

        {/* Map */}
        <div style={{ position: 'relative', flex: '1 1 0', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(74,138,92,0.2)' }}>

          {/* Cartouche overlay */}
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 500, pointerEvents: 'none',
            padding: '8px 13px', background: 'rgba(6,12,7,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(200,151,58,0.3)', borderRadius: 4,
          }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 7, letterSpacing: '0.38em', color: '#e8b94f', textTransform: 'uppercase', marginBottom: 2 }}>◆ Satélite ◆</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, fontSize: 13, color: '#c8dccb', letterSpacing: '0.16em' }}>UBERABA · MG</div>
            <div style={{ fontFamily: 'system-ui', fontStyle: 'italic', fontSize: 10, color: '#4e7055', marginTop: 2 }}>19°45&apos;S · 47°55&apos;W</div>
          </div>

          {/* Compass overlay */}
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 500, pointerEvents: 'none', opacity: .85 }}>
            <svg width="64" height="64" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="44" stroke="#c8973a" strokeWidth="1" opacity=".7"/>
              <circle cx="50" cy="50" r="35" stroke="#c8973a" strokeWidth=".6" opacity=".4" strokeDasharray="2 2"/>
              <line x1="50" y1="6"  x2="50" y2="14" stroke="#c8973a" strokeWidth=".8" opacity=".7"/>
              <line x1="50" y1="86" x2="50" y2="94" stroke="#c8973a" strokeWidth=".8" opacity=".7"/>
              <line x1="6"  y1="50" x2="14" y2="50" stroke="#c8973a" strokeWidth=".8" opacity=".7"/>
              <line x1="86" y1="50" x2="94" y2="50" stroke="#c8973a" strokeWidth=".8" opacity=".7"/>
              <polygon points="50,14 54,50 50,42 46,50" fill="#c8dccb"/>
              <polygon points="50,86 46,50 50,58 54,50" fill="#a07020"/>
              <circle cx="50" cy="50" r="3" fill="#e8b94f" stroke="#060c07" strokeWidth=".8"/>
              <text x="50" y="22" textAnchor="middle" fontFamily="Orbitron,serif" fontSize="7" fontWeight="700" fill="#c8dccb">N</text>
              <text x="50" y="82" textAnchor="middle" fontFamily="Orbitron,serif" fontSize="7" fontWeight="700" fill="#e8b94f">S</text>
              <text x="20" y="53" textAnchor="middle" fontFamily="Orbitron,serif" fontSize="7" fontWeight="700" fill="#e8b94f">O</text>
              <text x="80" y="53" textAnchor="middle" fontFamily="Orbitron,serif" fontSize="7" fontWeight="700" fill="#e8b94f">L</text>
            </svg>
          </div>

          {/* Leaflet mount point */}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Side panel */}
        <VenuePanel
          venue={selected}
          onSelectVenue={handleSelectVenue}
          onClose={() => setSelected(null)}
        />
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '8px 16px', borderRadius: 10, flexShrink: 0,
        background: 'rgba(13,26,15,0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(200,151,58,0.18)',
      }}>
        {STATS.map(s => (
          <div key={s.lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '2px 8px', borderLeft: '1px solid rgba(74,138,92,0.15)' }} className="first:border-l-0">
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            <span style={{ fontFamily: 'Orbitron, monospace', fontWeight: 900, fontSize: 14, color: '#e8b94f', lineHeight: 1 }}>{s.num}</span>
            <span style={{ fontFamily: 'system-ui', fontSize: 9, letterSpacing: '0.14em', color: '#4e7055', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.lbl}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
