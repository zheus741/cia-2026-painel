'use client'

import * as React from 'react'
import { MapPin, Maximize2, X, Image as ImageIcon } from 'lucide-react'

export interface VenueEsportivo {
  id: string
  nome: string
  modalidades: string[]
}

// Imagem 3D do evento (salve em public/mapa-esportivo.jpg).
const MAPA_IMG = '/mapa-esportivo.jpg'

// Posição do pin de cada local SOBRE a imagem, em % (x = esquerda, y = topo).
// Chave = nome do setor (como vem do banco). Preencher depois de ter a imagem;
// locais sem posição aparecem só na lista (sem pin no mapa).
const POSICOES: Record<string, { x: number; y: number }> = {
  // 'EDUCA UFU – GINÁSIO 02': { x: 42, y: 58 },
}

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
function posDe(nome: string): { x: number; y: number } | null {
  if (POSICOES[nome]) return POSICOES[nome]
  const n = norm(nome)
  for (const [k, v] of Object.entries(POSICOES)) if (norm(k) === n) return v
  return null
}

export function MapaEsportivoClient({ venues }: { venues: VenueEsportivo[] }) {
  const [sel, setSel] = React.useState<string | null>(null)
  const [imgOk, setImgOk] = React.useState(true)
  const [fullscreen, setFullscreen] = React.useState(false)

  const selVenue = venues.find(v => v.id === sel) ?? null

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 md:py-8">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--green)]">Esportivo</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] md:text-3xl">Mapa Esportivo</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {venues.length} {venues.length === 1 ? 'local' : 'locais'} de competição · toque num local pra ver as modalidades.
        </p>
      </div>

      <div className="space-y-5">
        {/* ── Mapa (imagem 3D + pins) ─────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {imgOk ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MAPA_IMG}
                alt="Mapa 3D do evento"
                className="block w-full select-none"
                onError={() => setImgOk(false)}
                draggable={false}
              />
              {/* Pins dos locais com posição definida */}
              {venues.map(v => {
                const p = posDe(v.nome)
                if (!p) return null
                const ativo = v.id === sel
                return (
                  <button
                    key={v.id}
                    onClick={() => setSel(v.id)}
                    className="absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    title={v.nome}
                  >
                    <MapPin
                      className={ativo ? 'drop-shadow-lg' : ''}
                      style={{ width: 30, height: 30, color: ativo ? 'var(--green-bright)' : 'var(--gold)', fill: ativo ? 'var(--green-bright)' : 'var(--gold)', fillOpacity: 0.25 }}
                    />
                  </button>
                )
              })}
              {/* Botão tela cheia */}
              <button
                onClick={() => setFullscreen(true)}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]/80 backdrop-blur transition-colors hover:bg-[var(--background)]"
                title="Ver em tela cheia"
              >
                <Maximize2 className="h-4 w-4 text-[var(--foreground)]" />
              </button>
            </div>
          ) : (
            // Placeholder enquanto não há imagem
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <ImageIcon className="h-10 w-10 text-[var(--muted-foreground)]/50" />
              <p className="text-sm font-semibold text-[var(--foreground)]">Mapa 3D ainda não adicionado</p>
              <p className="max-w-sm text-xs text-[var(--muted-foreground)]">
                Salve a imagem do mapa 3D do evento em <code className="rounded bg-[var(--muted)] px-1.5 py-0.5">public/mapa-esportivo.jpg</code> que ela aparece aqui automaticamente.
              </p>
            </div>
          )}
        </div>

        {/* ── Lista de locais esportivos ──────────────────────────────── */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {venues.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-10 text-center text-sm text-[var(--muted-foreground)] sm:col-span-2 lg:col-span-3">
              Nenhum local de competição encontrado ainda (sem jogos com local definido).
            </div>
          ) : (
            venues.map(v => {
              const ativo = v.id === sel
              const temPin = !!posDe(v.nome)
              return (
                <button
                  key={v.id}
                  onClick={() => setSel(ativo ? null : v.id)}
                  className="w-full rounded-xl border px-4 py-3 text-left transition-all"
                  style={{
                    borderColor: ativo ? 'var(--green-bright)' : 'var(--border)',
                    background: ativo ? 'var(--green-dim)' : 'var(--card)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" style={{ color: temPin ? 'var(--gold)' : 'var(--muted-foreground)' }} />
                    <span className="flex-1 truncate text-[14px] font-bold text-[var(--foreground)]">{v.nome}</span>
                    <span className="shrink-0 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)]">
                      {v.modalidades.length} mod.
                    </span>
                  </div>
                  {ativo && v.modalidades.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {v.modalidades.map(m => (
                        <span key={m} className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Detalhe do selecionado (resumo) */}
      {selVenue && (
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          <span className="font-bold text-[var(--foreground)]">{selVenue.nome}</span> — {selVenue.modalidades.join(' · ') || 'sem modalidades registradas'}
        </p>
      )}

      {/* Lightbox tela cheia */}
      {fullscreen && imgOk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setFullscreen(false)}>
          <button className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white" onClick={() => setFullscreen(false)}>
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MAPA_IMG} alt="Mapa 3D do evento" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  )
}
