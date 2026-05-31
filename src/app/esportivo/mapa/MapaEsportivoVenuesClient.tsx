'use client'

import 'leaflet/dist/leaflet.css'
import * as React from 'react'
import * as L from 'leaflet'

interface Fac { i: string; q: string; n: string }
interface Venue {
  id: number; icon: string; feat?: boolean
  name: string; neigh: string; addr: string
  lat: number; lng: number
  fac: Fac[]; note?: string
}

const VENUES: Venue[] = [
  { id:1, icon:'🏟️', feat:true, name:'CEMEA Boa Vista', neigh:'Indianópolis', addr:'Av. Djalma Castro Alves, 340', lat:-19.7282, lng:-47.9554,
    fac:[{i:'🏐',q:'1',n:'Quadra de Vôlei'},{i:'🥅',q:'1',n:'Quadra de Futsal'},{i:'🤾',q:'1',n:'Quadra de Handebol'},{i:'🏀',q:'1',n:'Quadra de Basquete'},{i:'🧍',q:'✓',n:'Área do Atleta'}]},
  { id:2, icon:'🏟️', feat:true, name:'FUNEL', neigh:'Abadia', addr:'Av. Orlando Rodrigues da Cunha, 1837', lat:-19.7493, lng:-47.9270,
    fac:[{i:'🏐',q:'1',n:'Quadra de Vôlei'},{i:'🥅',q:'1',n:'Quadra de Futsal'},{i:'🤾',q:'2',n:'Quadras de Handebol'},{i:'🏀',q:'1',n:'Quadra de Basquete'},{i:'🧍',q:'✓',n:'Área do Atleta'}]},
  { id:3, icon:'⛵', feat:true, name:'Uirapuru Iate Clube', neigh:'Santa Maria', addr:'Rua Amapá, 810', lat:-19.7750, lng:-47.9380,
    fac:[{i:'🏀',q:'3',n:'Quadras de Basquete'},{i:'🏐',q:'2',n:'Quadras de Vôlei'},{i:'🏸',q:'6',n:'Quadras de Peteca'},{i:'🎾',q:'6',n:'Quadras de Tênis'},{i:'⚽',q:'1',n:'Campo de Futebol (iluminado)'},{i:'🧍',q:'✓',n:'Área do Atleta'}]},
  { id:4, icon:'🤾', name:'CIE — C. Iniciação ao Esporte', neigh:'Beija-Flor II', addr:'Rua Mário Teodoro, 148', lat:-19.7895, lng:-47.9680,
    fac:[{i:'🤾',q:'1',n:'Quadra de Handebol'}]},
  { id:5, icon:'🏊', name:'UTC — Uberaba Tênis Clube', neigh:'N. Sra. da Abadia', addr:'Praça Dr. Thomaz Ulhôa, 461', lat:-19.7535, lng:-47.9305,
    fac:[{i:'🥅',q:'1',n:'Quadra de Futsal'},{i:'🏊',q:'✓',n:'Piscina'},{i:'🥁',q:'✓',n:'Bateria'}]},
  { id:6, icon:'🏓', name:'FETI — Fundação Ensino Técnico', neigh:'São Benedito', addr:'Rua Major Eustáquio, 790', lat:-19.7485, lng:-47.9400,
    fac:[{i:'🏓',q:'✓',n:'Tênis de Mesa'},{i:'♟️',q:'✓',n:'Xadrez'}]},
  { id:7, icon:'🥋', name:'Clube SESI Minas', neigh:'Res. Estados Unidos', addr:'Rua Francisco Bertoldi, 133', lat:-19.7140, lng:-47.9810,
    fac:[{i:'⚽',q:'1',n:'Campo de Futebol'},{i:'🥋',q:'✓',n:'Lutas · Cheer · Jiu-Jitsu · Judô'}]},
  { id:8, icon:'🎓', name:'UNIUBE', neigh:'Universitário', addr:'Av. Nenê Sabino, 1801', lat:-19.7200, lng:-47.9682,
    fac:[{i:'🥅',q:'*',n:'Futsal (sob demanda)'},{i:'🤾',q:'*',n:'Handebol (sob demanda)'},{i:'🏃',q:'✓',n:'Pista de Atletismo'}], note:'* Ativadas conforme demanda de inscrições.'},
  { id:9, icon:'⚽', feat:true, name:'Estádio Uberabão', neigh:'Vila Olímpica', addr:'R. Aluísio de Melo Teixeira', lat:-19.7380, lng:-47.9425,
    fac:[{i:'⚽',q:'1',n:'Campo c/ iluminação'}]},
  { id:10, icon:'⚽', name:'Campo Vila Nova', neigh:'COHAB Boa Vista', addr:'R. Soldado José Costa Souza', lat:-19.7250, lng:-47.9520,
    fac:[{i:'⚽',q:'1',n:'Campo Iluminado'}]},
  { id:11, icon:'⚽', name:'Campo Atlético Abadia', neigh:'Abadia', addr:'R. Iguatama, 460', lat:-19.7510, lng:-47.9325,
    fac:[{i:'⚽',q:'1',n:'Campo Iluminado'}]},
  { id:12, icon:'⚽', name:'Campo Nenenzão', neigh:'Olinda', addr:'Av. Nenê Sabino, 744-854', lat:-19.7255, lng:-47.9645,
    fac:[{i:'⚽',q:'1',n:'Campo Iluminado'}]},
  { id:13, icon:'🏫', name:'Ginásio Corina de Oliveira', neigh:'Mercês', addr:'Av. da Saudade, 289', lat:-19.7460, lng:-47.9315,
    fac:[{i:'🥅',q:'1',n:'Quadra de Futsal'},{i:'🏐',q:'1',n:'Quadra de Vôlei'}]},
  { id:14, icon:'🏫', name:'SESC Uberaba', neigh:'Fabrício', addr:'Rua Ricardo Misson, 411', lat:-19.7520, lng:-47.9455,
    fac:[{i:'🏐',q:'1',n:'Quadra de Vôlei'}]},
  { id:15, icon:'🏀', name:'Conselho Afro', neigh:'Jardim Elza Amui I', addr:'Rua Nilton Rosa Nunes, 40', lat:-19.7700, lng:-47.9820,
    fac:[{i:'🏀',q:'1',n:'Quadra de Basquete'}]},
  { id:16, icon:'⚽', name:'Toca da Bola', neigh:'Universitário', addr:'R. Guiomar Rodrigues da Cunha, 201', lat:-19.7220, lng:-47.9660,
    fac:[{i:'⚽',q:'1',n:'Campo Fut7'},{i:'🏐',q:'2',n:'Vôlei de Areia'}]},
  { id:17, icon:'⚽', name:'Campo SESI (iluminado)', neigh:'Res. Estados Unidos', addr:'R. Francisco Bertoldi, 133', lat:-19.7155, lng:-47.9800,
    fac:[{i:'⚽',q:'1',n:'Campo Iluminado'}]},
]

function dist(a: Venue, b: Venue): number {
  const R = 6371, d2r = Math.PI / 180
  const dLat = (b.lat - a.lat) * d2r, dLng = (b.lng - a.lng) * d2r
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*d2r)*Math.cos(b.lat*d2r)*Math.sin(dLng/2)**2
  return +(R*2*Math.atan2(Math.sqrt(s), Math.sqrt(1-s))).toFixed(1)
}

function pinHtml(v: Venue, active: boolean): string {
  const cls = ['cia-pin', v.feat ? 'feat' : '', active ? 'active' : ''].filter(Boolean).join(' ')
  return `<div class="${cls}"><span class="cia-pin-glow"></span><span class="cia-pin-ring"></span><span class="cia-pin-body">${v.icon}</span></div>`
}
function buildIcon(v: Venue, active = false) {
  return L.divIcon({ html: pinHtml(v, active), className: 'cia-pin-icon', iconSize: [40, 40], iconAnchor: [20, 20] })
}

export function MapaEsportivoVenuesClient() {
  const mapEl = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const markersRef = React.useRef<Record<number, L.Marker>>({})
  const [sel, setSel] = React.useState<number | null>(null)
  const selRef = React.useRef<number | null>(null)

  const selectVenue = React.useCallback((id: number | null) => {
    const map = mapRef.current
    // reset anterior
    const prev = selRef.current
    if (prev != null && markersRef.current[prev]) {
      const pv = VENUES.find(x => x.id === prev)!
      markersRef.current[prev].setIcon(buildIcon(pv, false))
    }
    selRef.current = id
    setSel(id)
    if (id != null && markersRef.current[id]) {
      const v = VENUES.find(x => x.id === id)!
      markersRef.current[id].setIcon(buildIcon(v, true))
      map?.flyTo([v.lat, v.lng], 16, { duration: 0.9 })
    }
  }, [])

  React.useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, { center: [-19.748, -47.945], zoom: 13, zoomControl: true, scrollWheelZoom: true })
    mapRef.current = map
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © ESRI', maxZoom: 19,
    }).addTo(map)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '', maxZoom: 19,
    }).addTo(map)

    VENUES.forEach(v => {
      const m = L.marker([v.lat, v.lng], { icon: buildIcon(v) }).addTo(map)
      m.on('click', () => selectVenue(v.id))
      markersRef.current[v.id] = m
    })
    map.on('click', (e: L.LeafletMouseEvent) => {
      const t = e.originalEvent.target as HTMLElement
      if (!t.closest('.cia-pin')) selectVenue(null)
    })
    setTimeout(() => map.invalidateSize(), 200)
    return () => { map.remove(); mapRef.current = null; markersRef.current = {} }
  }, [selectVenue])

  const venue = sel != null ? VENUES.find(v => v.id === sel) ?? null : null
  const dists = venue
    ? VENUES.filter(x => x.id !== venue.id).map(x => ({ ...x, km: dist(venue, x) })).sort((a, b) => a.km - b.km)
    : []

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 md:py-8">
      <style>{PIN_CSS}</style>

      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--green)]">Esportivo</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] md:text-3xl">Mapa Esportivo</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {VENUES.length} praças em Uberaba · toque num ponto pra ver as instalações e distâncias.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* Mapa */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]" style={{ height: 'clamp(360px, 64vh, 720px)' }}>
          <div ref={mapEl} className="absolute inset-0" />
        </div>

        {/* Painel */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden flex flex-col" style={{ maxHeight: 'clamp(360px, 64vh, 720px)' }}>
          {!venue ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="text-3xl opacity-70">🗺️</div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">{VENUES.length} arenas · 1 cidade</h4>
              <p className="max-w-[240px] text-sm text-[var(--muted-foreground)]">Toque em qualquer ponto no mapa pra ver as instalações e as distâncias até as outras praças.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-[var(--border)] px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--gold)]">Praça · {String(venue.id).padStart(2, '0')}</div>
                <div className="mt-1 text-[15px] font-extrabold text-[var(--foreground)]">{venue.name}</div>
                <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{venue.addr} — <span className="text-[var(--gold)]">{venue.neigh}</span></div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.name}, ${venue.addr}, ${venue.neigh}, Uberaba - MG`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  🧭 Como chegar
                </a>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold)]">Instalações</div>
                {venue.fac.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 border-b border-dashed border-[var(--border)] py-1.5 last:border-0">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--muted)] text-xs">{f.i}</span>
                    <span className="flex-1 text-[13px] text-[var(--foreground)]">{f.n}</span>
                    <span className="text-[13px] font-bold text-[var(--gold)]">{f.q}</span>
                  </div>
                ))}
                {venue.note && <div className="mt-2 border-l-2 border-[var(--gold)] bg-[var(--gold)]/5 px-2.5 py-1.5 text-xs italic text-[var(--muted-foreground)]">{venue.note}</div>}

                <div className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gold)]">Distâncias (km)</div>
                {dists.map(x => {
                  const cor = x.km < 2 ? 'var(--green)' : x.km < 5 ? 'var(--gold)' : 'var(--muted-foreground)'
                  return (
                    <button key={x.id} onClick={() => selectVenue(x.id)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[var(--muted)]/50">
                      <span className="text-xs">{x.icon}</span>
                      <span className="flex-1 truncate text-xs text-[var(--muted-foreground)]">{x.name}</span>
                      <span className="rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums" style={{ color: cor, border: '1px solid var(--border)' }}>{x.km}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const PIN_CSS = `
.cia-pin-icon{background:transparent!important;border:none!important;}
.cia-pin{position:relative;width:40px;height:40px;display:grid;place-items:center;cursor:pointer;transition:transform .2s ease;}
.cia-pin:hover{transform:translateY(-3px) scale(1.1);}
.cia-pin.active{transform:translateY(-4px) scale(1.15);}
.cia-pin-glow{position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,rgba(212,179,106,.6),transparent 68%);filter:blur(5px);opacity:0;transition:opacity .3s;}
.cia-pin:hover .cia-pin-glow,.cia-pin.active .cia-pin-glow{opacity:1;}
.cia-pin.feat .cia-pin-glow{opacity:.7;animation:ciaHalo 2.2s ease-in-out infinite;}
@keyframes ciaHalo{50%{opacity:.3;filter:blur(10px);}}
.cia-pin-ring{position:absolute;inset:-4px;border-radius:50%;border:2px dashed #d4b36a;opacity:0;animation:ciaSpin 10s linear infinite;}
.cia-pin.active .cia-pin-ring{opacity:.6;}
@keyframes ciaSpin{to{transform:rotate(360deg);}}
.cia-pin-body{width:34px;height:34px;border-radius:50%;background:linear-gradient(145deg,#f3ecd2,#d4b36a 60%,#c8a048);display:grid;place-items:center;font-size:15px;box-shadow:0 3px 12px rgba(0,0,0,.5),0 0 0 2px rgba(10,26,16,.4),inset 0 1px 0 rgba(255,255,255,.25);}
.cia-pin.feat .cia-pin-body{background:linear-gradient(145deg,#efd07a,#d4b36a 60%,#a07c2e);box-shadow:0 3px 14px rgba(0,0,0,.5),0 0 0 2.5px rgba(239,208,122,.45),inset 0 1px 0 rgba(255,255,255,.3);}
.cia-pin.active .cia-pin-body{box-shadow:0 4px 20px rgba(0,0,0,.6),0 0 0 3px #efd07a,inset 0 1px 0 rgba(255,255,255,.3);}
`
