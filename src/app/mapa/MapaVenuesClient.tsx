'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'pracas' | 'centropark'

interface Venue {
  id:    number
  icon:  string
  feat?: boolean
  name:  string
  neigh: string
  addr:  string
  lat:   number
  lng:   number
  fac:   { i: string; q: string; n: string }[]
  note?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Centro Park — sede principal do evento
// ⚠️  VERIFICAR coordenadas exatas via Google Maps antes do evento!
// ─────────────────────────────────────────────────────────────────────────────
const CENTRO_PARK = {
  lat:  -19.7477, // TODO: confirmar endereço exato
  lng:  -47.9320, // TODO: confirmar endereço exato
  name: 'Centro Park',
  addr: 'Uberaba · MG',
}

// ─────────────────────────────────────────────────────────────────────────────
// 17 Praças Esportivas
// ⚠️  Coordenadas precisam de revisão no mapa antes do evento.
// ─────────────────────────────────────────────────────────────────────────────
const VENUES: Venue[] = [
  { id: 1,  icon: '🏟️', feat: true,
    name: 'CEMEA Boa Vista',              neigh: 'Indianópolis',      addr: 'Av. Djalma Castro Alves, 340',
    lat: -19.7282, lng: -47.9554,
    fac: [{ i:'🏐',q:'1',n:'Quadra de Vôlei' },{ i:'🥅',q:'1',n:'Quadra de Futsal' },{ i:'🤾',q:'1',n:'Quadra de Handebol' },{ i:'🏀',q:'1',n:'Quadra de Basquete' },{ i:'🧍',q:'✓',n:'Área do Atleta' }] },

  { id: 2,  icon: '🏟️', feat: true,
    name: 'FUNEL',                        neigh: 'Abadia',            addr: 'Av. Orlando Rodrigues da Cunha, 1837',
    lat: -19.7493, lng: -47.9270,
    fac: [{ i:'🏐',q:'1',n:'Quadra de Vôlei' },{ i:'🥅',q:'1',n:'Quadra de Futsal' },{ i:'🤾',q:'2',n:'Quadras de Handebol' },{ i:'🏀',q:'1',n:'Quadra de Basquete' },{ i:'🧍',q:'✓',n:'Área do Atleta' }] },

  { id: 3,  icon: '⛵', feat: true,
    name: 'Uirapuru Iate Clube',          neigh: 'Santa Maria',       addr: 'Rua Amapá, 810',
    lat: -19.7750, lng: -47.9380,
    fac: [{ i:'🏀',q:'3',n:'Quadras de Basquete' },{ i:'🏐',q:'2',n:'Quadras de Vôlei' },{ i:'🏸',q:'6',n:'Quadras de Peteca' },{ i:'🎾',q:'6',n:'Quadras de Tênis' },{ i:'⚽',q:'1',n:'Campo de Futebol (iluminado)' },{ i:'🧍',q:'✓',n:'Área do Atleta' }] },

  { id: 4,  icon: '🤾',
    name: 'CIE — C. Iniciação ao Esporte',neigh: 'Beija-Flor II',    addr: 'Rua Mário Teodoro, 148',
    lat: -19.7895, lng: -47.9680,
    fac: [{ i:'🤾',q:'1',n:'Quadra de Handebol' }] },

  { id: 5,  icon: '🏊',
    name: 'UTC — Uberaba Tênis Clube',    neigh: 'N. Sra. da Abadia', addr: 'Praça Dr. Thomaz Ulhôa, 461',
    lat: -19.7535, lng: -47.9305,
    fac: [{ i:'🥅',q:'1',n:'Quadra de Futsal' },{ i:'🏊',q:'✓',n:'Piscina' },{ i:'🥁',q:'✓',n:'Bateria' }] },

  { id: 6,  icon: '🏓',
    name: 'FETI — Fundação Ensino Técnico',neigh: 'São Benedito',     addr: 'Rua Major Eustáquio, 790',
    lat: -19.7485, lng: -47.9400,
    fac: [{ i:'🏓',q:'✓',n:'Tênis de Mesa' },{ i:'♟️',q:'✓',n:'Xadrez' }] },

  { id: 7,  icon: '🥋', feat: true,
    name: 'Clube SESI Minas',             neigh: 'Res. Estados Unidos',addr: 'Rua Francisco Bertoldi, 133',
    lat: -19.7140, lng: -47.9810,
    fac: [{ i:'⚽',q:'1',n:'Campo de Futebol' },{ i:'🥋',q:'✓',n:'Lutas · Cheer · Jiu-Jitsu · Judô' }] },

  { id: 8,  icon: '🎓', feat: true,
    name: 'UNIUBE',                       neigh: 'Universitário',     addr: 'Av. Nenê Sabino, 1801',
    lat: -19.7200, lng: -47.9682,
    fac: [{ i:'🥅',q:'*',n:'Futsal (sob demanda)' },{ i:'🤾',q:'*',n:'Handebol (sob demanda)' },{ i:'🏃',q:'✓',n:'Pista de Atletismo' }],
    note: '* Ativadas conforme demanda de inscrições.' },

  { id: 9,  icon: '⚽', feat: true,
    name: 'Estádio Uberabão',             neigh: 'Vila Olímpica',     addr: 'R. Aluísio de Melo Teixeira',
    lat: -19.7380, lng: -47.9425,
    fac: [{ i:'⚽',q:'1',n:'Campo c/ iluminação' }] },

  { id: 10, icon: '⚽',
    name: 'Campo Vila Nova',              neigh: 'COHAB Boa Vista',   addr: 'R. Soldado José Costa Souza',
    lat: -19.7250, lng: -47.9520,
    fac: [{ i:'⚽',q:'1',n:'Campo Iluminado' }] },

  { id: 11, icon: '⚽',
    name: 'Campo Atlético Abadia',        neigh: 'Abadia',            addr: 'R. Iguatama, 460',
    lat: -19.7510, lng: -47.9325,
    fac: [{ i:'⚽',q:'1',n:'Campo Iluminado' }] },

  { id: 12, icon: '⚽',
    name: 'Campo Nenenzão',               neigh: 'Olinda',            addr: 'Av. Nenê Sabino, 744–854',
    lat: -19.7255, lng: -47.9645,
    fac: [{ i:'⚽',q:'1',n:'Campo Iluminado' }] },

  { id: 13, icon: '🏫',
    name: 'Ginásio Corina de Oliveira',   neigh: 'Mercês',            addr: 'Av. da Saudade, 289',
    lat: -19.7460, lng: -47.9315,
    fac: [{ i:'🥅',q:'1',n:'Quadra de Futsal' },{ i:'🏐',q:'1',n:'Quadra de Vôlei' }] },

  { id: 14, icon: '🏫',
    name: 'SESC Uberaba',                 neigh: 'Fabrício',          addr: 'Rua Ricardo Misson, 411',
    lat: -19.7520, lng: -47.9455,
    fac: [{ i:'🏐',q:'1',n:'Quadra de Vôlei' }] },

  { id: 15, icon: '🏀',
    name: 'Conselho Afro',                neigh: 'Jardim Elza Amui I',addr: 'Rua Nilton Rosa Nunes, 40',
    lat: -19.7700, lng: -47.9820,
    fac: [{ i:'🏀',q:'1',n:'Quadra de Basquete' }] },

  { id: 16, icon: '⚽',
    name: 'Toca da Bola',                 neigh: 'Universitário',     addr: 'R. Guiomar Rodrigues da Cunha, 201',
    lat: -19.7220, lng: -47.9660,
    fac: [{ i:'⚽',q:'1',n:'Campo Fut7' },{ i:'🏐',q:'2',n:'Vôlei de Areia' }] },

  { id: 17, icon: '⚽',
    name: 'Campo SESI (iluminado)',        neigh: 'Res. Estados Unidos',addr: 'R. Francisco Bertoldi, 133',
    lat: -19.7155, lng: -47.9800,
    fac: [{ i:'⚽',q:'1',n:'Campo Iluminado' }] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Haversine
// ─────────────────────────────────────────────────────────────────────────────

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, d2r = Math.PI / 180
  const dLat = (b.lat - a.lat) * d2r
  const dLng = (b.lng - a.lng) * d2r
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d2r) * Math.cos(b.lat * d2r) * Math.sin(dLng / 2) ** 2
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))).toFixed(1))
}

// ─────────────────────────────────────────────────────────────────────────────
// Pin factories — FIFA-inspired
// ─────────────────────────────────────────────────────────────────────────────

// Centro Park: teardrop pin with green glow
function makeCentroParkPin() {
  return L.divIcon({
    html: `
      <style>
        @keyframes cp-halo{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:.3;transform:scale(1.15)}}
        @keyframes cp-ring{0%{transform:scale(.9);opacity:.6}100%{transform:scale(1.7);opacity:0}}
      </style>
      <div style="position:relative;width:52px;height:64px;cursor:pointer">
        <div style="position:absolute;top:-14px;left:-14px;right:-14px;bottom:-2px;border-radius:50%;background:radial-gradient(circle,rgba(74,222,128,.4),transparent 65%);animation:cp-halo 2.2s ease-in-out infinite;pointer-events:none"></div>
        <div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:8px;border-radius:50%;border:1.5px solid rgba(74,222,128,.5);animation:cp-ring 2.2s ease-out infinite;pointer-events:none"></div>
        <div style="position:absolute;top:0;left:6px;width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#0a1a10,#122a1c);border:2.5px solid #4ade80;box-shadow:0 6px 24px rgba(74,222,128,.45),0 0 0 1px rgba(74,222,128,.18);display:flex;align-items:center;justify-content:center">
          <span style="transform:rotate(45deg);font-size:17px;line-height:1">⭐</span>
        </div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid #4ade80"></div>
      </div>
    `,
    className: '',
    iconSize:   [52, 64],
    iconAnchor: [26, 64],
    popupAnchor: [0, -68],
  })
}

// Sports venue: circular white badge
function makeVenuePin(venue: Venue, active = false) {
  const sz         = active ? 44 : venue.feat ? 38 : 30
  const borderClr  = active ? '#4ade80' : venue.feat ? 'rgba(200,151,58,.85)' : 'rgba(255,255,255,.22)'
  const bg         = active ? 'linear-gradient(135deg,#0a1a10,#122a1c)' : 'rgba(255,255,255,.93)'
  const iconColor  = active ? '#4ade80' : '#1a1a2e'
  const shadow     = active
    ? '0 0 0 3px rgba(74,222,128,.35),0 4px 18px rgba(0,0,0,.75)'
    : venue.feat
    ? '0 0 0 2px rgba(200,151,58,.2),0 3px 14px rgba(0,0,0,.65)'
    : '0 2px 10px rgba(0,0,0,.6)'
  const transform  = active ? 'translateY(-5px) scale(1.1)' : 'none'
  const fontSize   = Math.floor(sz * 0.43)
  const anim       = venue.feat && !active
    ? `@keyframes fp${venue.id}{50%{box-shadow:0 0 0 5px rgba(200,151,58,.18),0 3px 14px rgba(0,0,0,.6);}}`
    : ''
  const animStyle  = venue.feat && !active ? `animation:fp${venue.id} 2.5s ease-in-out infinite` : ''

  return L.divIcon({
    html: `
      ${anim ? `<style>${anim}</style>` : ''}
      <div style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:${bg};border:2px solid ${borderClr};
        box-shadow:${shadow};
        display:flex;align-items:center;justify-content:center;
        font-size:${fontSize}px;cursor:pointer;
        transform:${transform};transition:all .22s ease;
        ${animStyle};
        color:${iconColor};
      ">${venue.icon}</div>
    `,
    className: '',
    iconSize:   [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -sz / 2 - 6],
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// VenuePanel — details drawer (side)
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:      'rgba(5,12,6,.94)',
  border:  'rgba(255,255,255,.08)',
  border2: 'rgba(255,255,255,.05)',
  gold:    '#c8973a',
  goldBr:  '#e8b94f',
  fg:      'rgba(255,255,255,.88)',
  muted:   'rgba(255,255,255,.35)',
  green:   '#4ade80',
}

function VenuePanel({
  venue, onSelectVenue, onClose,
}: {
  venue: Venue | null
  onSelectVenue: (id: number) => void
  onClose: () => void
}) {
  if (!venue) return null

  const distances = VENUES
    .filter(v => v.id !== venue.id)
    .map(v => ({ ...v, km: haversine(venue, v) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 6)

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: C.bg, backdropFilter: 'blur(20px)',
      border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,.7)',
    }}>

      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${C.border2}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 8, letterSpacing: '0.38em', color: C.goldBr, textTransform: 'uppercase' }}>
            Praça · {String(venue.id).padStart(2, '0')}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.fg, textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.25 }}>
          {venue.name}
        </div>
        <div style={{ fontStyle: 'italic', fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 4 }}>
          {venue.addr} — <span style={{ color: C.goldBr }}>{venue.neigh}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', scrollbarWidth: 'thin' }}>

        {/* Facilities */}
        <div style={{ fontSize: 8, letterSpacing: '0.3em', color: C.goldBr, textTransform: 'uppercase', marginBottom: 6, paddingBottom: 4, borderBottom: `1px dashed ${C.border2}` }}>
          Instalações
        </div>
        {venue.fac.map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto', alignItems: 'center', gap: 7, padding: '5px 4px', borderBottom: `1px dashed ${C.border2}` }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%,#d4c08a,#c8973a)', display: 'grid', placeItems: 'center', fontSize: 12, boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,.25),0 2px 5px rgba(0,0,0,.3)' }}>
              {f.i}
            </div>
            <span style={{ fontSize: 12, color: C.fg, fontWeight: 500 }}>{f.n}</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: C.goldBr }}>{f.q}</span>
          </div>
        ))}
        {venue.note && (
          <div style={{ marginTop: 8, padding: '7px 9px', borderLeft: `2px solid ${C.gold}`, background: 'rgba(200,151,58,.05)', fontStyle: 'italic', fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
            {venue.note}
          </div>
        )}

        {/* Distances */}
        <div style={{ marginTop: 12, fontSize: 8, letterSpacing: '0.3em', color: C.goldBr, textTransform: 'uppercase', marginBottom: 6, paddingBottom: 4, borderBottom: `1px dashed ${C.border2}` }}>
          Praças Próximas
        </div>
        {distances.map(v => {
          const distColor = v.km < 2 ? C.green : v.km < 5 ? C.goldBr : C.muted
          return (
            <div
              key={v.id}
              onClick={() => onSelectVenue(v.id)}
              style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', alignItems: 'center', gap: 7, padding: '5px 5px', borderRadius: 4, borderBottom: `1px dashed rgba(255,255,255,.04)`, cursor: 'pointer', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.04)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <span style={{ fontSize: 12, textAlign: 'center' }}>{v.icon}</span>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
              <span style={{ fontWeight: 700, fontSize: 11, color: distColor, background: 'rgba(255,255,255,.04)', padding: '2px 6px', borderRadius: 3, border: `1px solid rgba(255,255,255,.07)`, whiteSpace: 'nowrap' }}>
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
// Legend pills data
// ─────────────────────────────────────────────────────────────────────────────

const LEGEND = [
  { icon: '⭐', label: 'Centro Park',     count: '1',  highlight: true  },
  { icon: '🏟️', label: 'Praça Esportiva', count: '17', highlight: false },
  { icon: '⚽',  label: 'Futebol',         count: '8',  highlight: false },
  { icon: '🏐',  label: 'Vôlei',           count: '8',  highlight: false },
  { icon: '🏀',  label: 'Basquete',        count: '6',  highlight: false },
  { icon: '🤾',  label: 'Handebol',        count: '5',  highlight: false },
  { icon: '🎾',  label: 'Tênis/Peteca',    count: '12', highlight: false },
  { icon: '🏊',  label: 'Natação',         count: '1',  highlight: false },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function MapaVenuesClient() {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<L.Map | null>(null)
  const markersRef    = useRef<Record<number, L.Marker>>({})
  const [selected, setSelected] = useState<Venue | null>(null)
  const [tab, setTab] = useState<Tab>('pracas')

  // ── Sync pin icons when selection changes ─────────────────────────────────
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([idStr, marker]) => {
      const id    = Number(idStr)
      const venue = VENUES.find(v => v.id === id)!
      marker.setIcon(makeVenuePin(venue, selected?.id === id))
    })
  }, [selected])

  // ── Fly to correct area when tab changes ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tab === 'pracas') {
      map.flyTo([-19.748, -47.945], 13, { duration: 0.8 })
    } else {
      map.flyTo([CENTRO_PARK.lat, CENTRO_PARK.lng], 16, { duration: 0.9 })
    }
  }, [tab])

  // ── Init Leaflet (once) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [-19.748, -47.945],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: true,
    })

    // CartoDB Dark Matter — same look as FIFA WC26 reference
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '©<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ©<a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      },
    ).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Centro Park pin
    L.marker([CENTRO_PARK.lat, CENTRO_PARK.lng], {
      icon: makeCentroParkPin(),
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup(`
        <div style="min-width:140px;color:#c8dccb;font-size:11px;text-align:center;padding:4px 0">
          <div style="font-size:9px;letter-spacing:.3em;color:#4ade80;text-transform:uppercase;margin-bottom:4px">Sede do Evento</div>
          <div style="font-weight:700;font-size:14px;color:#fff">Centro Park</div>
          <div style="font-size:10px;color:#4e7055;margin-top:3px">Uberaba · MG</div>
        </div>
      `, { className: 'cia-popup-dark' })

    // Sports venues
    VENUES.forEach(v => {
      const m = L.marker([v.lat, v.lng], { icon: makeVenuePin(v) }).addTo(map)
      m.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e)
        setSelected(v)
        map.flyTo([v.lat, v.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
      })
      markersRef.current[v.id] = m
    })

    // Click map background → deselect
    map.on('click', () => setSelected(null))

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = {}
    }
  }, [])

  function handleSelectVenue(id: number) {
    const venue = VENUES.find(v => v.id === id)
    if (!venue || !mapRef.current) return
    setSelected(venue)
    mapRef.current.flyTo([venue.lat, venue.lng], 16, { duration: 0.7 })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 3.5rem)',
      background: '#060e07',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', flexShrink: 0,
        background: '#060e07',
        borderBottom: '1px solid rgba(255,255,255,.06)',
        gap: 16,
      }}>
        {/* Title */}
        <div>
          <div style={{ fontSize: 8, letterSpacing: '0.4em', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', marginBottom: 2 }}>
            CIA 2026 · Uberaba · MG
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
            MAPA DO EVENTO
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, padding: '4px', background: 'rgba(255,255,255,.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
          {[
            { id: 'pracas',     label: '🏟 Praças Esportivas' },
            { id: 'centropark', label: '⭐ Centro Park'         },
          ].map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id as Tab); if (t.id === 'pracas') setSelected(null) }}
                style={{
                  padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13, letterSpacing: '0.04em',
                  transition: 'all .2s',
                  background: active
                    ? (t.id === 'centropark' ? 'rgba(74,222,128,.14)' : 'rgba(255,255,255,.10)')
                    : 'transparent',
                  color: active
                    ? (t.id === 'centropark' ? '#4ade80' : '#fff')
                    : 'rgba(255,255,255,.42)',
                  boxShadow: active
                    ? (t.id === 'centropark'
                      ? '0 0 0 1px rgba(74,222,128,.3)'
                      : '0 0 0 1px rgba(255,255,255,.15)')
                    : 'none',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Map area ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>

        {/* Leaflet mount */}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Cartouche — top left */}
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 500, pointerEvents: 'none',
          padding: '8px 12px',
          background: 'rgba(5,12,6,.88)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,.1)', borderRadius: 6,
        }}>
          <div style={{ fontSize: 7, letterSpacing: '0.4em', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 2 }}>
            {tab === 'pracas' ? '◆ Satélite ◆' : '◆ Venue ◆'}
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,.85)', letterSpacing: '0.14em' }}>
            {tab === 'pracas' ? 'UBERABA · MG' : 'CENTRO PARK'}
          </div>
          <div style={{ fontStyle: 'italic', fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>
            {tab === 'pracas' ? '19°45′S · 47°55′W' : '04–07 Jun 2026'}
          </div>
        </div>

        {/* Compass — top right */}
        <div style={{ position: 'absolute', top: 12, right: selected ? 328 : 12, zIndex: 500, pointerEvents: 'none', opacity: .7, transition: 'right .35s ease' }}>
          <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,.2)" strokeWidth="1"/>
            <circle cx="50" cy="50" r="35" stroke="rgba(255,255,255,.1)" strokeWidth=".6" strokeDasharray="2 2"/>
            <line x1="50" y1="6"  x2="50" y2="14" stroke="rgba(255,255,255,.3)" strokeWidth=".8"/>
            <line x1="50" y1="86" x2="50" y2="94" stroke="rgba(255,255,255,.3)" strokeWidth=".8"/>
            <line x1="6"  y1="50" x2="14" y2="50" stroke="rgba(255,255,255,.3)" strokeWidth=".8"/>
            <line x1="86" y1="50" x2="94" y2="50" stroke="rgba(255,255,255,.3)" strokeWidth=".8"/>
            <polygon points="50,14 54,50 50,42 46,50" fill="rgba(255,255,255,.85)"/>
            <polygon points="50,86 46,50 50,58 54,50" fill="rgba(255,255,255,.3)"/>
            <circle cx="50" cy="50" r="3" fill="rgba(255,255,255,.6)" stroke="#060e07" strokeWidth=".8"/>
            <text x="50" y="26" textAnchor="middle" fontSize="7" fontWeight="700" fill="rgba(255,255,255,.8)">N</text>
            <text x="50" y="78" textAnchor="middle" fontSize="7" fontWeight="700" fill="rgba(255,255,255,.35)">S</text>
            <text x="18" y="53" textAnchor="middle" fontSize="7" fontWeight="700" fill="rgba(255,255,255,.35)">O</text>
            <text x="82" y="53" textAnchor="middle" fontSize="7" fontWeight="700" fill="rgba(255,255,255,.35)">L</text>
          </svg>
        </div>

        {/* Centro Park tab — CTA banner */}
        {tab === 'centropark' && !selected && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 500,
            background: 'rgba(5,12,6,.94)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(74,222,128,.25)', borderRadius: 14,
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
            maxWidth: 420, width: 'calc(100% - 32px)',
            boxShadow: '0 8px 40px rgba(0,0,0,.6),0 0 0 1px rgba(74,222,128,.1)',
          }}>
            <div style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>🗺️</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>
                Croqui Interno
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.35 }}>
                Palcos, bares, banheiros, acessos e serviços do Centro Park
              </div>
            </div>
            <Link
              href="/croqui"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8,
                background: 'rgba(74,222,128,.15)',
                border: '1px solid rgba(74,222,128,.4)',
                color: '#4ade80', textDecoration: 'none',
                fontWeight: 700, fontSize: 13, letterSpacing: '0.06em',
                whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'background .2s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(74,222,128,.25)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(74,222,128,.15)'}
            >
              Ver Croqui →
            </Link>
          </div>
        )}

        {/* Side venue panel */}
        <div style={{
          position: 'absolute', top: 12, right: 12, bottom: 12,
          width: 300, zIndex: 500,
          transform: selected ? 'translateX(0)' : 'translateX(calc(100% + 16px))',
          transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
          pointerEvents: selected ? 'all' : 'none',
        }}>
          <VenuePanel
            venue={selected}
            onSelectVenue={handleSelectVenue}
            onClose={() => setSelected(null)}
          />
        </div>
      </div>

      {/* ── Legend bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 6px',
        padding: '8px 16px', flexShrink: 0,
        background: '#060e07',
        borderTop: '1px solid rgba(255,255,255,.06)',
      }}>
        {LEGEND.map(item => (
          <div
            key={item.label}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 6,
              border: `1px solid ${item.highlight ? 'rgba(74,222,128,.3)' : 'rgba(255,255,255,.09)'}`,
              background: item.highlight ? 'rgba(74,222,128,.07)' : 'transparent',
            }}
          >
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: item.highlight ? '#4ade80' : 'rgba(255,255,255,.38)' }}>
              {item.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: item.highlight ? '#4ade80' : 'rgba(255,255,255,.25)' }}>
              {item.count}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}
