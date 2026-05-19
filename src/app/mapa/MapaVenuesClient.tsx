'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, type RefObject } from 'react'
import * as L from 'leaflet'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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
// Centro Park — sede principal
// ─────────────────────────────────────────────────────────────────────────────

const CENTRO_PARK = {
  lat:  -19.7477,
  lng:  -47.9320,
  name: 'Centro Park',
  addr: 'Uberaba · MG',
}

const CP_AREAS = [
  { icon: '🎪', label: 'Arena Principal',           desc: 'Cerimônias de abertura e encerramento' },
  { icon: '🏅', label: 'Pódio & Premiações',         desc: 'Entrega de medalhas e troféus' },
  { icon: '🍽️', label: 'Praça de Alimentação',       desc: 'Food trucks e espaço convivência' },
  { icon: '🎤', label: 'Palco Cultural',             desc: 'Shows e atrações noturnas' },
  { icon: '⚕️', label: 'Área Médica',               desc: 'Pronto atendimento e suporte atlético' },
  { icon: '📸', label: 'Media Center — Olharr',     desc: 'Credenciamento, cobertura e lives' },
  { icon: '🏟️', label: 'Palco de Esportes',         desc: 'Exibições e disputas especiais' },
]

// ─────────────────────────────────────────────────────────────────────────────
// 17 Praças Esportivas — coordenadas geocodificadas via Nominatim (maio 2026)
// ─────────────────────────────────────────────────────────────────────────────

const VENUES: Venue[] = [
  // ── Quadras poliesportivas ─────────────────────────────────────────────────
  { id: 1,  icon: '🏟️', feat: true,
    name: 'CEMEA Boa Vista',              neigh: 'Amoroso Costa',     addr: 'Av. São Paulo, 340',
    lat: -19.7374608, lng: -47.9034980,
    fac: [{ i:'🏐',q:'1',n:'Quadra de Vôlei' },{ i:'🥅',q:'1',n:'Quadra de Futsal' },{ i:'🤾',q:'1',n:'Quadra de Handebol' },{ i:'🏀',q:'1',n:'Quadra de Basquete' },{ i:'🧍',q:'✓',n:'Área do Atleta' }] },

  { id: 2,  icon: '🏟️', feat: true,
    name: 'FUNEL',                        neigh: 'Abadia',            addr: 'Av. Orlando Rodrigues da Cunha, 1837',
    lat: -19.7669293, lng: -47.9229271,  // mesmo corredor que CEMEA Abadia (1853)
    fac: [{ i:'🏐',q:'1',n:'Quadra de Vôlei' },{ i:'🥅',q:'1',n:'Quadra de Futsal' },{ i:'🤾',q:'2',n:'Quadras de Handebol' },{ i:'🏀',q:'1',n:'Quadra de Basquete' },{ i:'🧍',q:'✓',n:'Área do Atleta' }] },

  { id: 3,  icon: '⛵', feat: true,
    name: 'Uirapuru Iate Clube',          neigh: 'Santa Maria',       addr: 'Rua Amapá, 810',
    lat: -19.7603832, lng: -47.9586606,
    fac: [{ i:'🏀',q:'3',n:'Quadras de Basquete' },{ i:'🏐',q:'2',n:'Quadras de Vôlei' },{ i:'🏸',q:'6',n:'Quadras de Peteca' },{ i:'🎾',q:'6',n:'Quadras de Tênis' },{ i:'⚽',q:'1',n:'Campo de Futebol (iluminado)' },{ i:'🧍',q:'✓',n:'Área do Atleta' }] },

  { id: 4,  icon: '🤾',
    name: 'CIE — C. Iniciação ao Esporte',neigh: 'Beija-Flor II',    addr: 'Rua Mário Teodoro, 148',
    lat: -19.7529939, lng: -47.9907016,
    fac: [{ i:'🤾',q:'1',n:'Quadra de Handebol' }] },

  { id: 5,  icon: '🏊',
    name: 'UTC — Uberaba Tênis Clube',    neigh: 'N. Sra. da Abadia', addr: 'Praça Dr. Thomaz Ulhôa, 461',
    lat: -19.7508, lng: -47.9367, // ⚠ aprox.
    fac: [{ i:'🥅',q:'1',n:'Quadra de Futsal' },{ i:'🏊',q:'✓',n:'Piscina' },{ i:'🥁',q:'✓',n:'Bateria' }] },

  { id: 6,  icon: '🏓',
    name: 'FETI — Fundação Ensino Técnico',neigh: 'Centro',           addr: 'Rua Major Eustáquio, 790',
    lat: -19.7523377, lng: -47.9397969,
    fac: [{ i:'🏓',q:'✓',n:'Tênis de Mesa' },{ i:'♟️',q:'✓',n:'Xadrez' }] },

  { id: 7,  icon: '🥋', feat: true,
    name: 'Clube SESI Minas',             neigh: 'Res. Estados Unidos',addr: 'Rua Francisco Bertoldi, 133',
    lat: -19.7405356, lng: -47.9098069,
    fac: [{ i:'⚽',q:'1',n:'Campo de Futebol' },{ i:'🥋',q:'✓',n:'Lutas · Cheer · Jiu-Jitsu · Judô' }] },

  { id: 8,  icon: '🎓', feat: true,
    name: 'UNIUBE',                       neigh: 'Universitário',     addr: 'Av. Nenê Sabino, 1801',
    lat: -19.7550391, lng: -47.9646474,
    fac: [{ i:'🥅',q:'*',n:'Futsal (sob demanda)' },{ i:'🤾',q:'*',n:'Handebol (sob demanda)' },{ i:'🏃',q:'✓',n:'Pista de Atletismo' }],
    note: '* Ativadas conforme demanda de inscrições.' },

  // ── Estádio ────────────────────────────────────────────────────────────────
  { id: 9,  icon: '⚽', feat: true,
    name: 'Estádio Uberabão',             neigh: 'Vila Olímpica',     addr: 'Av. Maria Carmelita Castro Cunha',
    lat: -19.7395092, lng: -47.9397143,
    fac: [{ i:'⚽',q:'1',n:'Campo c/ iluminação' }] },

  // ── Campos de futebol ──────────────────────────────────────────────────────
  { id: 10, icon: '⚽',
    name: 'Campo Vila Nova',              neigh: 'COHAB Boa Vista',   addr: 'R. Soldado José Costa Souza',
    lat: -19.7268497, lng: -47.9181091,
    fac: [{ i:'⚽',q:'1',n:'Campo Iluminado' }] },

  { id: 11, icon: '⚽',
    name: 'Campo Atlético Abadia',        neigh: 'Abadia',            addr: 'R. Iguatama, 460',
    lat: -19.7639772, lng: -47.9222304,
    fac: [{ i:'⚽',q:'1',n:'Campo Iluminado' }] },

  { id: 12, icon: '⚽',
    name: 'Campo Nenenzão',               neigh: 'Olinda',            addr: 'Av. Nenê Sabino, 744–854',
    lat: -19.7480, lng: -47.9600, // ⚠ aprox.
    fac: [{ i:'⚽',q:'1',n:'Campo Iluminado' }] },

  // ── Outras instituições ────────────────────────────────────────────────────
  { id: 13, icon: '🏫',
    name: 'Ginásio Corina de Oliveira',   neigh: 'Sete Colinas',      addr: 'Av. da Saudade, 289',
    lat: -19.7462439, lng: -47.9502775,
    fac: [{ i:'🥅',q:'1',n:'Quadra de Futsal' },{ i:'🏐',q:'1',n:'Quadra de Vôlei' }] },

  { id: 14, icon: '🏫',
    name: 'SESC Uberaba',                 neigh: 'Fabrício',          addr: 'Rua Ricardo Misson, 411',
    lat: -19.7428146, lng: -47.9379767,
    fac: [{ i:'🏐',q:'1',n:'Quadra de Vôlei' }] },

  { id: 15, icon: '🏀',
    name: 'Conselho Afro',                neigh: 'Paraíso',           addr: 'Rua Nilton Rosa Nunes, 40',
    lat: -19.7430624, lng: -47.8896871,
    fac: [{ i:'🏀',q:'1',n:'Quadra de Basquete' }] },

  { id: 16, icon: '⚽',
    name: 'Toca da Bola',                 neigh: 'Universitário',     addr: 'R. Guiomar Rodrigues da Cunha, 201',
    lat: -19.7528311, lng: -47.9613570,
    fac: [{ i:'⚽',q:'1',n:'Campo Fut7' },{ i:'🏐',q:'2',n:'Vôlei de Areia' }] },

  { id: 17, icon: '⚽',
    name: 'Campo SESI (iluminado)',        neigh: 'Res. Estados Unidos',addr: 'R. Francisco Bertoldi, 133',
    lat: -19.7405356, lng: -47.9098069,
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
// Pin factories
// ─────────────────────────────────────────────────────────────────────────────

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

function makeVenuePin(venue: Venue, active = false) {
  const sz        = active ? 44 : venue.feat ? 38 : 30
  const borderClr = active ? '#4ade80' : venue.feat ? 'rgba(200,151,58,.85)' : 'rgba(255,255,255,.22)'
  const bg        = active ? 'linear-gradient(135deg,#0a1a10,#122a1c)' : 'rgba(255,255,255,.93)'
  const iconColor = active ? '#4ade80' : '#1a1a2e'
  const shadow    = active
    ? '0 0 0 3px rgba(74,222,128,.35),0 4px 18px rgba(0,0,0,.75)'
    : venue.feat
    ? '0 0 0 2px rgba(200,151,58,.2),0 3px 14px rgba(0,0,0,.65)'
    : '0 2px 10px rgba(0,0,0,.6)'
  const transform = active ? 'translateY(-5px) scale(1.1)' : 'none'
  const fontSize  = Math.floor(sz * 0.43)
  const anim      = venue.feat && !active
    ? `@keyframes fp${venue.id}{50%{box-shadow:0 0 0 5px rgba(200,151,58,.18),0 3px 14px rgba(0,0,0,.6);}}`
    : ''
  const animStyle = venue.feat && !active ? `animation:fp${venue.id} 2.5s ease-in-out infinite` : ''

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
// Tokens de cor
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:     'rgba(5,12,6,.94)',
  border: 'rgba(255,255,255,.08)',
  bdash:  'rgba(255,255,255,.05)',
  gold:   '#c8973a',
  goldBr: '#e8b94f',
  fg:     'rgba(255,255,255,.88)',
  muted:  'rgba(255,255,255,.35)',
  green:  '#4ade80',
}

// ─────────────────────────────────────────────────────────────────────────────
// VenuePanel — drawer lateral sobre o mapa esquerdo
// ─────────────────────────────────────────────────────────────────────────────

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
    .slice(0, 5)

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
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${C.bdash}`, flexShrink: 0 }}>
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
        <div style={{ fontStyle: 'italic', fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 4 }}>
          {venue.addr} — <span style={{ color: C.goldBr }}>{venue.neigh}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', scrollbarWidth: 'thin' }}>
        {/* Instalações */}
        <div style={{ fontSize: 8, letterSpacing: '0.3em', color: C.goldBr, textTransform: 'uppercase', marginBottom: 6, paddingBottom: 4, borderBottom: `1px dashed ${C.bdash}` }}>
          Instalações
        </div>
        {venue.fac.map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto', alignItems: 'center', gap: 7, padding: '5px 4px', borderBottom: `1px dashed ${C.bdash}` }}>
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

        {/* Praças próximas */}
        <div style={{ marginTop: 12, fontSize: 8, letterSpacing: '0.3em', color: C.goldBr, textTransform: 'uppercase', marginBottom: 6, paddingBottom: 4, borderBottom: `1px dashed ${C.bdash}` }}>
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
// CentroParkPanel — painel direito estático
// ─────────────────────────────────────────────────────────────────────────────

function CentroParkPanel({ cpMapRef }: { cpMapRef: RefObject<HTMLDivElement | null> }) {
  const stats = [
    { value: '4',   label: 'dias de evento' },
    { value: '17',  label: 'praças' },
    { value: '~100',label: 'pessoas' },
    { value: '500+',label: 'conteúdos' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060e07' }}>

      {/* Header */}
      <div style={{
        padding: '10px 16px 9px',
        borderBottom: '1px solid rgba(255,255,255,.06)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 8, letterSpacing: '0.4em', color: 'rgba(74,222,128,.65)', textTransform: 'uppercase', marginBottom: 2 }}>
          ⭐ Sede Principal
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1 }}>
          CENTRO PARK
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 3, letterSpacing: '0.04em' }}>
          Uberaba · MG · 04–07 Jun 2026
        </div>
      </div>

      {/* Mapa CP zoomed */}
      <div
        ref={cpMapRef}
        style={{ height: 190, flexShrink: 0, position: 'relative' }}
      />

      {/* Linha divisória */}
      <div style={{ height: 1, background: 'rgba(255,255,255,.06)', flexShrink: 0 }} />

      {/* Conteúdo rolável */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'thin' }}>

        {/* Endereço */}
        <div style={{
          padding: '9px 12px',
          background: 'rgba(74,222,128,.05)',
          border: '1px solid rgba(74,222,128,.14)',
          borderRadius: 9,
        }}>
          <div style={{ fontSize: 7.5, letterSpacing: '0.32em', color: 'rgba(74,222,128,.7)', textTransform: 'uppercase', marginBottom: 3 }}>Localização</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>{CENTRO_PARK.addr}</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>Coordenadas confirmadas em campo</div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              padding: '8px 10px',
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.35)', marginTop: 3, letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Áreas do evento */}
        <div style={{ fontSize: 7.5, letterSpacing: '0.32em', color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', margin: '4px 0 2px' }}>
          Áreas do Evento
        </div>
        {CP_AREAS.map((area, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 9,
            padding: '7px 10px',
            background: 'rgba(255,255,255,.025)',
            border: '1px solid rgba(255,255,255,.055)',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 15, flexShrink: 0, lineHeight: 1, marginTop: 1 }}>{area.icon}</div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.82)', lineHeight: 1.2 }}>{area.label}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.34)', marginTop: 2, lineHeight: 1.4 }}>{area.desc}</div>
            </div>
          </div>
        ))}

        {/* Footer note */}
        <div style={{
          marginTop: 4, padding: '8px 11px',
          borderLeft: '2px solid rgba(74,222,128,.35)',
          background: 'rgba(74,222,128,.03)',
          fontSize: 10.5, color: 'rgba(255,255,255,.3)', fontStyle: 'italic', lineHeight: 1.5,
        }}>
          Planta baixa e setorização serão publicadas próximo ao evento.
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — layout em dois painéis
// ─────────────────────────────────────────────────────────────────────────────

export function MapaVenuesClient() {
  // ── Referências ─────────────────────────────────────────────────────────────
  const uberabaContainerRef = useRef<HTMLDivElement>(null)
  const uberabaMapRef       = useRef<L.Map | null>(null)
  const markersRef          = useRef<Record<number, L.Marker>>({})

  const cpContainerRef = useRef<HTMLDivElement>(null)
  const cpMapRef       = useRef<L.Map | null>(null)

  const [selected, setSelected] = useState<Venue | null>(null)

  // ── Sync ícones ao mudar seleção ────────────────────────────────────────────
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([idStr, marker]) => {
      const id    = Number(idStr)
      const venue = VENUES.find(v => v.id === id)!
      marker.setIcon(makeVenuePin(venue, selected?.id === id))
    })
  }, [selected])

  // ── Init mapa Uberaba ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!uberabaContainerRef.current || uberabaMapRef.current) return

    const map = L.map(uberabaContainerRef.current, {
      center: [-19.748, -47.930],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: true,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '©OpenStreetMap ©CARTO', subdomains: 'abcd', maxZoom: 19 },
    ).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Centro Park no mapa de Uberaba
    L.marker([CENTRO_PARK.lat, CENTRO_PARK.lng], {
      icon: makeCentroParkPin(),
      zIndexOffset: 1000,
    }).addTo(map).bindPopup(`
      <div style="min-width:130px;color:#c8dccb;font-size:11px;text-align:center;padding:4px 0">
        <div style="font-size:9px;letter-spacing:.3em;color:#4ade80;text-transform:uppercase;margin-bottom:4px">Sede do Evento</div>
        <div style="font-weight:700;font-size:14px;color:#fff">Centro Park</div>
        <div style="font-size:10px;color:#4e7055;margin-top:3px">Uberaba · MG</div>
      </div>
    `, { className: 'cia-popup-dark' })

    // Pins de praças
    VENUES.forEach(v => {
      const m = L.marker([v.lat, v.lng], { icon: makeVenuePin(v) }).addTo(map)
      m.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e)
        setSelected(v)
        map.flyTo([v.lat, v.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
      })
      markersRef.current[v.id] = m
    })

    map.on('click', () => setSelected(null))
    uberabaMapRef.current = map

    return () => {
      map.remove()
      uberabaMapRef.current = null
      markersRef.current = {}
    }
  }, [])

  // ── Init mapa Centro Park (mini-mapa estático) ──────────────────────────────
  useEffect(() => {
    if (!cpContainerRef.current || cpMapRef.current) return

    const map = L.map(cpContainerRef.current, {
      center: [CENTRO_PARK.lat, CENTRO_PARK.lng],
      zoom: 16,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true,
      attributionControl: false,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19 },
    ).addTo(map)

    L.marker([CENTRO_PARK.lat, CENTRO_PARK.lng], {
      icon: makeCentroParkPin(),
      zIndexOffset: 1000,
    }).addTo(map)

    cpMapRef.current = map

    return () => {
      map.remove()
      cpMapRef.current = null
    }
  }, [])

  function handleSelectVenue(id: number) {
    const venue = VENUES.find(v => v.id === id)
    if (!venue || !uberabaMapRef.current) return
    setSelected(venue)
    uberabaMapRef.current.flyTo([venue.lat, venue.lng], 16, { duration: 0.7 })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      height: 'calc(100dvh - 3.5rem)',
      background: '#060e07',
      overflow: 'hidden',
    }}>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PAINEL ESQUERDO — Mapa de Uberaba                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Cabeçalho esquerdo */}
        <div style={{
          padding: '9px 16px 8px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 7.5, letterSpacing: '0.4em', color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', marginBottom: 1 }}>
              CIA 2026 · Praças Esportivas
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1 }}>
              UBERABA · MG
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {[
              { icon: '⭐', label: 'CP',  clr: 'rgba(74,222,128,.2)',  txt: '#4ade80' },
              { icon: '🏟️', label: '17×', clr: 'rgba(255,255,255,.06)', txt: 'rgba(255,255,255,.5)' },
              { icon: '⚽',  label: '8×',  clr: 'rgba(255,255,255,.04)', txt: 'rgba(255,255,255,.35)' },
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, background: b.clr, border: `1px solid ${b.txt}22` }}>
                <span style={{ fontSize: 11 }}>{b.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: b.txt, letterSpacing: '0.05em' }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Área do mapa */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>

          {/* Leaflet container */}
          <div ref={uberabaContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Cartouche */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 500, pointerEvents: 'none',
            padding: '7px 11px',
            background: 'rgba(5,12,6,.88)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,.1)', borderRadius: 6,
          }}>
            <div style={{ fontSize: 6.5, letterSpacing: '0.4em', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 2 }}>◆ Satélite ◆</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.85)', letterSpacing: '0.14em' }}>UBERABA · MG</div>
            <div style={{ fontStyle: 'italic', fontSize: 9.5, color: 'rgba(255,255,255,.3)', marginTop: 1 }}>19°45′S · 47°55′W</div>
          </div>

          {/* Bússola */}
          <div style={{ position: 'absolute', top: 12, right: selected ? 288 : 12, zIndex: 500, pointerEvents: 'none', opacity: .65, transition: 'right .35s ease' }}>
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
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

          {/* Venue panel */}
          <div style={{
            position: 'absolute', top: 12, right: 12, bottom: 12,
            width: 268, zIndex: 500,
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

        {/* Legenda */}
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px 5px',
          padding: '6px 14px',
          background: '#060e07',
          borderTop: '1px solid rgba(255,255,255,.06)',
          flexShrink: 0,
        }}>
          {[
            { icon: '⭐', label: 'Centro Park',     count: '1',  hl: true  },
            { icon: '🏟️', label: 'Praça',           count: '17', hl: false },
            { icon: '⚽',  label: 'Futebol',         count: '8',  hl: false },
            { icon: '🏐',  label: 'Vôlei',           count: '8',  hl: false },
            { icon: '🏀',  label: 'Basquete',        count: '6',  hl: false },
            { icon: '🤾',  label: 'Handebol',        count: '5',  hl: false },
            { icon: '🎾',  label: 'Tênis/Peteca',    count: '12', hl: false },
          ].map(item => (
            <div key={item.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 5,
              border: `1px solid ${item.hl ? 'rgba(74,222,128,.3)' : 'rgba(255,255,255,.08)'}`,
              background: item.hl ? 'rgba(74,222,128,.06)' : 'transparent',
            }}>
              <span style={{ fontSize: 11 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: item.hl ? '#4ade80' : 'rgba(255,255,255,.35)' }}>
                {item.label}
              </span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: item.hl ? '#4ade80' : 'rgba(255,255,255,.22)' }}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divisor vertical */}
      <div style={{ width: 1, background: 'rgba(255,255,255,.07)', flexShrink: 0 }} />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PAINEL DIREITO — Centro Park                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ width: 320, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <CentroParkPanel cpMapRef={cpContainerRef} />
      </div>

    </div>
  )
}
