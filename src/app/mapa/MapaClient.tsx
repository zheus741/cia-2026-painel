'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import * as L from 'leaflet'

export interface SetorPin {
  id: string
  nome: string
  tipo: string
  lat: number
  lng: number
  cor_hex: string | null
  endereco: string | null
  capacidade_pessoas: number | null
}

const TIPO_ICON: Record<string, string> = {
  esportivo: '🏟️',
  palco: '🎤',
  festa: '🎉',
  apoio: '🏠',
  externo: '📍',
}

const TIPO_LABEL: Record<string, string> = {
  esportivo: 'Praça esportiva',
  palco: 'Palco',
  festa: 'Área de festa',
  apoio: 'Apoio',
  externo: 'Externo',
}

function makeIcon(cor: string, tipo: string) {
  const emoji = TIPO_ICON[tipo] ?? '📍'
  const html = `
    <div style="
      width:36px;height:36px;border-radius:50%;
      background:${cor};border:2px solid rgba(255,255,255,0.25);
      box-shadow:0 0 16px ${cor}88;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;cursor:pointer;
      transition:transform 0.15s;
    ">${emoji}</div>
  `
  return L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20] })
}

interface Props {
  setores: SetorPin[]
  height?: string
}

export function MapaClient({ setores, height = '100%' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Center on Uberaba
    const center: [number, number] = [-19.7477, -47.9333]
    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    setores.forEach((s) => {
      const cor = s.cor_hex ?? '#4a8a5c'
      const icon = makeIcon(cor, s.tipo)

      const popup = L.popup({ className: 'cia-map-popup' }).setContent(`
        <div style="min-width:160px;padding:4px 0">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#4e7055;margin-bottom:4px">
            ${TIPO_LABEL[s.tipo] ?? s.tipo}
          </div>
          <div style="font-size:15px;font-weight:700;color:#c8dccb;margin-bottom:6px">
            ${s.nome}
          </div>
          ${s.endereco ? `<div style="font-size:12px;color:#6ab87e;margin-bottom:4px">📍 ${s.endereco}</div>` : ''}
          ${s.capacidade_pessoas ? `<div style="font-size:12px;color:#4e7055">👥 ${s.capacidade_pessoas.toLocaleString('pt-BR')} pessoas</div>` : ''}
        </div>
      `)

      L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(popup)
    })

    if (setores.length > 0) {
      const bounds = L.latLngBounds(setores.map((s) => [s.lat, s.lng]))
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 })
    }

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [setores])

  return <div ref={containerRef} style={{ width: '100%', height, minHeight: 400, borderRadius: 12 }} />
}
