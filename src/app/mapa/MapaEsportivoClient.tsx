'use client'

import * as React from 'react'
import { MapPin, Maximize2, X, Plus, Pencil, Trash2, Check, Image as ImageIcon } from 'lucide-react'
import { toast } from '@/components/toast'
import { criarMarcador, moverMarcador, renomearMarcador, deletarMarcador } from './actions'

export interface Marcador {
  id: string
  label: string
  categoria: string | null
  x: number
  y: number
}

const MAPA_IMG = '/mapa-esportivo.jpg'

export function MapaEsportivoClient({
  marcadores: initial, canEdit,
}: { marcadores: Marcador[]; canEdit: boolean }) {
  const [marcadores, setMarcadores] = React.useState<Marcador[]>(initial)
  const [imgOk, setImgOk] = React.useState(true)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [editMode, setEditMode] = React.useState(false)
  const [novoNome, setNovoNome] = React.useState('')
  const [placing, setPlacing] = React.useState(false)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [editId, setEditId] = React.useState<string | null>(null)
  const mapRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => { setMarcadores(initial) }, [initial])

  function pctFromEvent(clientX: number, clientY: number): { x: number; y: number } | null {
    const el = mapRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    }
  }

  // ── Adicionar ponto: clica no mapa após nomear ───────────────────────────
  async function handleMapClick(e: React.MouseEvent) {
    if (!placing) return
    const p = pctFromEvent(e.clientX, e.clientY)
    if (!p) return
    const nome = novoNome.trim()
    setPlacing(false); setNovoNome('')
    // otimista
    const tempId = `tmp-${Date.now()}`
    setMarcadores(prev => [...prev, { id: tempId, label: nome, categoria: null, x: p.x, y: p.y }])
    const r = await criarMarcador(nome, p.x, p.y)
    if (r.ok && r.data) {
      setMarcadores(prev => prev.map(m => m.id === tempId ? { ...m, id: r.data!.id } : m))
    } else {
      setMarcadores(prev => prev.filter(m => m.id !== tempId))
      toast.error('Falha ao criar ponto', { description: r.error })
    }
  }

  // ── Arrastar ponto ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!dragId) return
    const onMove = (e: PointerEvent) => {
      const p = pctFromEvent(e.clientX, e.clientY)
      if (p) setMarcadores(prev => prev.map(m => m.id === dragId ? { ...m, x: p.x, y: p.y } : m))
    }
    const onUp = async () => {
      const m = marcadores.find(x => x.id === dragId)
      const id = dragId
      setDragId(null)
      if (m && !id.startsWith('tmp-')) {
        const r = await moverMarcador(id, m.x, m.y)
        if (!r.ok) toast.error('Falha ao mover', { description: r.error })
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [dragId, marcadores])

  async function handleRenomear(id: string) {
    const atual = marcadores.find(m => m.id === id)
    const novo = window.prompt('Nome do ponto:', atual?.label ?? '')
    if (novo == null) return
    const nome = novo.trim()
    if (!nome) return
    setMarcadores(prev => prev.map(m => m.id === id ? { ...m, label: nome } : m))
    setEditId(null)
    const r = await renomearMarcador(id, nome)
    if (!r.ok) toast.error('Falha ao renomear', { description: r.error })
  }

  async function handleDeletar(id: string) {
    setMarcadores(prev => prev.filter(m => m.id !== id))
    setEditId(null)
    const r = await deletarMarcador(id)
    if (!r.ok) toast.error('Falha ao excluir', { description: r.error })
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 md:py-8">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--green)]">Mapa</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] md:text-3xl">Centro Park</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {marcadores.length} ponto{marcadores.length === 1 ? '' : 's'} no mapa
            {canEdit && ' · você pode adicionar e posicionar pontos.'}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditMode(e => !e); setPlacing(false); setEditId(null) }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors"
            style={{
              borderColor: editMode ? 'var(--green-bright)' : 'var(--border)',
              background: editMode ? 'var(--green-dim)' : 'var(--card)',
              color: editMode ? 'var(--green-bright)' : 'var(--foreground)',
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            {editMode ? 'Pronto' : 'Editar pontos'}
          </button>
        )}
      </div>

      {/* Barra de adicionar (modo edição) */}
      {editMode && canEdit && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5">
          <input
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome do ponto (ex: Arena Principal)"
            className="h-9 flex-1 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--green-bright)]"
          />
          <button
            onClick={() => { if (novoNome.trim()) setPlacing(true) }}
            disabled={!novoNome.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 text-xs font-bold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {placing ? 'Clique no mapa…' : 'Adicionar ponto'}
          </button>
          {placing && (
            <button onClick={() => setPlacing(false)} className="text-xs text-[var(--muted-foreground)] underline">cancelar</button>
          )}
        </div>
      )}

      {/* Mapa */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {imgOk ? (
          <div
            ref={mapRef}
            className="relative"
            style={{ cursor: placing ? 'crosshair' : 'default' }}
            onClick={handleMapClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MAPA_IMG} alt="Mapa 3D do Centro Park" className="block w-full select-none" onError={() => setImgOk(false)} draggable={false} />

            {marcadores.map(m => {
              const emEdicao = editId === m.id
              return (
                <div key={m.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                  <button
                    onPointerDown={(e) => { if (editMode) { e.stopPropagation(); setDragId(m.id) } }}
                    onClick={(e) => { e.stopPropagation(); if (editMode) setEditId(id => id === m.id ? null : m.id) }}
                    className="group flex flex-col items-center"
                    style={{ cursor: editMode ? 'grab' : 'default' }}
                    title={m.label}
                  >
                    <span className="max-w-[140px] truncate rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur" style={{ marginBottom: 2 }}>
                      {m.label}
                    </span>
                    <MapPin style={{ width: 26, height: 26, color: 'var(--gold)', fill: 'var(--gold)', fillOpacity: 0.3 }} />
                  </button>
                  {emEdicao && editMode && (
                    <div className="absolute left-1/2 top-full z-10 mt-1 flex -translate-x-1/2 gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
                      <button onClick={(e) => { e.stopPropagation(); handleRenomear(m.id) }} className="rounded p-1 hover:bg-[var(--muted)]" title="Renomear"><Pencil className="h-3.5 w-3.5 text-[var(--foreground)]" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeletar(m.id) }} className="rounded p-1 hover:bg-red-500/10" title="Excluir"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Tela cheia */}
            {!editMode && (
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreen(true) }}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]/80 backdrop-blur transition-colors hover:bg-[var(--background)]"
                title="Tela cheia"
              >
                <Maximize2 className="h-4 w-4 text-[var(--foreground)]" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <ImageIcon className="h-10 w-10 text-[var(--muted-foreground)]/50" />
            <p className="text-sm font-semibold text-[var(--foreground)]">Mapa não encontrado</p>
            <p className="max-w-sm text-xs text-[var(--muted-foreground)]">Salve a imagem em <code className="rounded bg-[var(--muted)] px-1.5 py-0.5">public/mapa-esportivo.jpg</code>.</p>
          </div>
        )}
      </div>

      {editMode && (
        <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
          <Check className="mr-1 inline h-3 w-3" /> Digite o nome e clique &quot;Adicionar ponto&quot;, depois clique no mapa. Arraste um pino pra reposicionar; clique nele pra renomear/excluir.
        </p>
      )}

      {/* Lightbox */}
      {fullscreen && imgOk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setFullscreen(false)}>
          <button className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white" onClick={() => setFullscreen(false)}><X className="h-5 w-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MAPA_IMG} alt="Mapa 3D do Centro Park" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  )
}
