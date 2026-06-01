'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uniqueChannel } from '@/lib/supabase/channel-name'
import type { BroadcastEstado, PatrocinadorRef } from '../types'

// ── Design tokens ───────────────────────────────────────────────────────────
const C = {
  cream:    '#FAF7F0',
  creamDim: 'rgba(250,247,240,0.72)',
  gold:     '#D4B36A',
  goldBright: '#F0D04A',
  green:    '#4aa06a',
  greenDeep:'#1d3a26',
  red:      '#EF4444',
  ink:      '#070D0A',
} as const
const FD = 'var(--font-fraunces), Georgia, serif'
const FS = 'var(--font-geist), system-ui, sans-serif'

// Cartão escuro translúcido padrão das peças
const cardBg = 'linear-gradient(135deg, rgba(7,13,10,0.92) 0%, rgba(13,26,18,0.88) 100%)'

export function OverlayClient({
  estadoInicial, patrocinadores,
}: {
  estadoInicial: BroadcastEstado
  patrocinadores: PatrocinadorRef[]
}) {
  const [e, setE] = useState<BroadcastEstado>(estadoInicial)
  const chanRef = useRef<ReturnType<typeof createClient>['channel'] | null>(null)

  useEffect(() => {
    const sb = createClient()
    let reconnect: ReturnType<typeof setTimeout> | null = null
    const channel = sb
      .channel(uniqueChannel('broadcast-overlay'))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'broadcast_estado' }, (payload) => {
        setE(prev => ({ ...prev, ...(payload.new as BroadcastEstado) }))
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (reconnect) clearTimeout(reconnect)
          reconnect = setTimeout(() => channel.subscribe(), 2000)
        }
      })
    chanRef.current = channel as unknown as ReturnType<typeof createClient>['channel']
    return () => { if (reconnect) clearTimeout(reconnect); sb.removeChannel(channel) }
  }, [])

  const patroc = e.patroc_id ? patrocinadores.find(p => p.id === e.patroc_id) ?? null : null
  const bottomBase = e.crawl_on ? 11 : 6   // sobe GC/NP quando o crawl está no ar

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      overflow: 'hidden', fontFamily: FD,
      background: 'transparent',
    }}>
      <style>{`
        html, body { background: transparent !important; }
        @keyframes bcCrawl { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }
        @keyframes bcPing { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.25)} }
        @keyframes bcBars { 0%,100%{height:30%} 50%{height:100%} }
        .bc-layer { transition: opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1); }
        .bc-off { opacity: 0; pointer-events: none; }
      `}</style>

      {/* ── MOSCA / BUG (top-right) ─────────────────────────────────────────── */}
      <div className="bc-layer" style={{
        position: 'absolute', top: '4.2vh', right: '2.6vw',
        display: 'flex', alignItems: 'center', gap: '0.7vw',
        opacity: e.mosca_on ? 1 : 0,
        transform: e.mosca_on ? 'translateY(0)' : 'translateY(-1vh)',
      }}>
        {e.ao_vivo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.45vw',
            background: 'rgba(239,68,68,0.92)', borderRadius: '999px',
            padding: '0.5vh 0.9vw',
          }}>
            <span style={{ width: '0.7vw', height: '0.7vw', borderRadius: '50%', background: '#fff', animation: 'bcPing 1.3s ease-in-out infinite' }} />
            <span style={{ fontFamily: FS, fontWeight: 800, fontSize: '1.05vw', color: '#fff', letterSpacing: '0.14em' }}>AO VIVO</span>
          </div>
        )}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          background: cardBg, border: `1px solid ${C.gold}40`,
          borderRadius: '0.7vw', padding: '0.7vh 1vw',
        }}>
          <span style={{ fontFamily: FS, fontSize: '0.62vw', fontWeight: 700, letterSpacing: '0.28em', color: `${C.green}`, lineHeight: 1 }}>★ CIA · COBERTURA</span>
          <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: '1.5vw', color: C.cream, lineHeight: 1.05, letterSpacing: '-0.02em' }}>2026</span>
        </div>
      </div>

      {/* ── GC / LOWER THIRD (bottom-left) ──────────────────────────────────── */}
      <div className="bc-layer" style={{
        position: 'absolute', left: '4vw', bottom: `${bottomBase}vh`, maxWidth: '52vw',
        opacity: e.gc_on ? 1 : 0,
        transform: e.gc_on ? 'translateX(0)' : 'translateX(-2vw)',
      }}>
        {e.gc_tipo === 'credito' ? (
          <div style={{ display: 'inline-flex', flexDirection: 'column', background: cardBg, borderLeft: `0.35vw solid ${C.gold}`, borderRadius: '0 0.7vw 0.7vw 0', padding: '1.1vh 1.6vw' }}>
            <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: '2.4vw', color: C.cream, lineHeight: 1, letterSpacing: '-0.02em' }}>{e.gc_titulo}</span>
            {e.gc_subtitulo && <span style={{ fontFamily: FS, fontSize: '1vw', fontWeight: 600, color: C.gold, letterSpacing: '0.06em', marginTop: '0.5vh' }}>{e.gc_subtitulo}</span>}
          </div>
        ) : (
          <div style={{ display: 'inline-flex', flexDirection: 'column', background: cardBg, borderLeft: `0.35vw solid ${C.green}`, borderRadius: '0 0.7vw 0.7vw 0', padding: '1.2vh 1.8vw' }}>
            <span style={{ fontFamily: FS, fontSize: '0.7vw', fontWeight: 800, letterSpacing: '0.3em', color: C.green, marginBottom: '0.3vh' }}>NO PALCO</span>
            <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: '3vw', color: C.cream, lineHeight: 0.98, letterSpacing: '-0.03em' }}>{e.gc_titulo}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw', marginTop: '0.6vh' }}>
              {e.gc_subtitulo && <span style={{ fontFamily: FS, fontSize: '1.05vw', fontWeight: 600, color: C.gold }}>{e.gc_subtitulo}</span>}
              {e.gc_detalhe && <span style={{ fontFamily: FS, fontSize: '0.85vw', fontWeight: 600, color: C.creamDim, background: 'rgba(250,247,240,0.10)', borderRadius: '999px', padding: '0.25vh 0.7vw' }}>{e.gc_detalhe}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── NOW PLAYING (bottom-right) ──────────────────────────────────────── */}
      <div className="bc-layer" style={{
        position: 'absolute', right: '4vw', bottom: `${bottomBase}vh`,
        opacity: e.np_on ? 1 : 0,
        transform: e.np_on ? 'translateX(0)' : 'translateX(2vw)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', background: cardBg, border: `1px solid ${C.gold}35`, borderRadius: '0.7vw', padding: '1vh 1.3vw' }}>
          {/* Equalizer animado */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.18vw', height: '2vw', width: '2vw' }}>
            {[0, 1, 2, 3].map(i => (
              <span key={i} style={{ flex: 1, background: C.goldBright, borderRadius: '1px', height: '50%', animation: `bcBars 0.9s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: FS, fontSize: '0.62vw', fontWeight: 800, letterSpacing: '0.26em', color: C.gold, marginBottom: '0.2vh' }}>♪ TOCANDO AGORA</span>
            <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 700, fontSize: '1.6vw', color: C.cream, lineHeight: 1, letterSpacing: '-0.02em' }}>{e.np_musica}</span>
            {e.np_artista && <span style={{ fontFamily: FS, fontSize: '0.85vw', color: C.creamDim, marginTop: '0.3vh' }}>{e.np_artista}</span>}
          </div>
        </div>
      </div>

      {/* ── PATROCINADOR (bottom-center) ────────────────────────────────────── */}
      <div className="bc-layer" style={{
        position: 'absolute', left: '50%', bottom: e.crawl_on ? '6vh' : '3vh',
        transform: e.patroc_on ? 'translate(-50%, 0)' : 'translate(-50%, 1.5vh)',
        opacity: e.patroc_on ? 1 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1vw', background: cardBg, border: `1px solid ${C.gold}45`, borderRadius: '0.8vw', padding: '0.9vh 1.5vw' }}>
          <span style={{ fontFamily: FS, fontSize: '0.68vw', fontWeight: 800, letterSpacing: '0.24em', color: C.gold }}>
            {e.patroc_modo === 'apoio' ? 'APOIO' : e.patroc_modo === 'card' ? 'PATROCÍNIO' : 'APRESENTAÇÃO'}
          </span>
          <span style={{ width: '1px', height: '2.4vh', background: `${C.gold}40` }} />
          {patroc?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={patroc.logo_url} alt={patroc.nome} style={{ height: '3.2vh', maxWidth: '12vw', objectFit: 'contain', background: '#fff', borderRadius: '0.3vw', padding: '0.3vh 0.5vw' }} />
          ) : (
            <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: '1.7vw', color: C.cream }}>{patroc?.nome}</span>
          )}
        </div>
      </div>

      {/* ── PLACA FULL-SCREEN ───────────────────────────────────────────────── */}
      <div className="bc-layer" style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: e.placa_on ? 'radial-gradient(ellipse at center, rgba(7,13,10,0.86), rgba(7,13,10,0.97))' : 'transparent',
        opacity: e.placa_on ? 1 : 0,
        transform: e.placa_on ? 'scale(1)' : 'scale(1.04)',
      }}>
        <Placa estado={e} />
      </div>

      {/* ── CRAWL / LETREIRO (bottom full-width) ────────────────────────────── */}
      <div className="bc-layer" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '4.6vh',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
        background: `linear-gradient(90deg, ${C.greenDeep} 0%, rgba(7,13,10,0.95) 100%)`,
        borderTop: `1px solid ${C.gold}40`,
        opacity: e.crawl_on ? 1 : 0,
        transform: e.crawl_on ? 'translateY(0)' : 'translateY(100%)',
      }}>
        <div style={{ flexShrink: 0, background: C.gold, height: '100%', display: 'flex', alignItems: 'center', padding: '0 1.2vw' }}>
          <span style={{ fontFamily: FS, fontWeight: 900, fontSize: '0.95vw', color: C.ink, letterSpacing: '0.16em' }}>CIA 2026</span>
        </div>
        <div style={{ whiteSpace: 'nowrap', animation: 'bcCrawl 22s linear infinite', paddingLeft: '2vw' }}>
          <span style={{ fontFamily: FS, fontSize: '1.15vw', fontWeight: 600, color: C.cream, letterSpacing: '0.02em' }}>
            {e.crawl_texto}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Placa full-screen por tipo ───────────────────────────────────────────────
function Placa({ estado }: { estado: BroadcastEstado }) {
  const p = estado.placa_payload ?? {}
  const tipo = estado.placa_tipo

  if (tipo === 'abertura') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: FS, fontSize: '1.1vw', fontWeight: 800, letterSpacing: '0.4em', color: C.green, marginBottom: '1.5vh' }}>COPA INTER ATLÉTICAS</div>
        <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 900, fontSize: '11vw', color: C.cream, lineHeight: 0.85, letterSpacing: '-0.04em' }}>2026</div>
        <div style={{ fontFamily: FS, fontSize: '1.4vw', fontWeight: 700, letterSpacing: '0.24em', color: C.gold, marginTop: '2vh' }}>{p.titulo ?? 'AO VIVO · PALCO PRINCIPAL'}</div>
      </div>
    )
  }
  if (tipo === 'premiacao') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '6vw', lineHeight: 1 }}>🏆</div>
        <div style={{ fontFamily: FS, fontSize: '1.1vw', fontWeight: 800, letterSpacing: '0.3em', color: C.gold, margin: '1.5vh 0' }}>{p.titulo ?? 'PREMIAÇÃO'}</div>
        <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 900, fontSize: '6vw', color: C.cream, lineHeight: 0.95, letterSpacing: '-0.03em' }}>{p.linha1}</div>
        {p.linha2 && <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 700, fontSize: '2.6vw', color: C.goldBright, marginTop: '1vh' }}>{p.linha2}</div>}
      </div>
    )
  }
  if (tipo === 'encerramento') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 900, fontSize: '8vw', color: C.cream, lineHeight: 0.9, letterSpacing: '-0.03em' }}>{p.titulo ?? 'Obrigado!'}</div>
        {p.linha1 && <div style={{ fontFamily: FS, fontSize: '1.5vw', fontWeight: 600, color: C.gold, marginTop: '2vh', letterSpacing: '0.1em' }}>{p.linha1}</div>}
      </div>
    )
  }
  // 'a_seguir' (default)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: FS, fontSize: '1.3vw', fontWeight: 800, letterSpacing: '0.4em', color: C.green, marginBottom: '2vh' }}>A SEGUIR</div>
      <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 900, fontSize: '7vw', color: C.cream, lineHeight: 0.92, letterSpacing: '-0.03em' }}>{p.titulo}</div>
      {p.linha1 && <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 700, fontSize: '2.8vw', color: C.goldBright, marginTop: '1.5vh' }}>{p.linha1}</div>}
      {p.rodape && <div style={{ fontFamily: FS, fontSize: '1.1vw', color: C.creamDim, marginTop: '1.5vh' }}>{p.rodape}</div>}
    </div>
  )
}
