'use client'

/**
 * <CommandPalette /> — Busca global Cmd+K / Ctrl+K
 *
 * - Abre com Cmd+K (Mac) ou Ctrl+K (Win/Linux)
 * - Fecha com Esc, click fora ou após navegar
 * - Navega resultados com ↑/↓, abre com Enter
 * - Busca debounced via /api/search
 * - Quando vazio: mostra atalhos de páginas (quick nav)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, Users, Trophy, Camera, UserCircle, MapPin,
  CornerDownLeft, ArrowUp, ArrowDown, LayoutGrid,
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'atletica' | 'jogo' | 'conteudo' | 'usuario' | 'setor' | 'praca' | 'nav'
  title: string
  subtitle?: string
  href: string
}

const TYPE_META: Record<SearchResult['type'], { label: string; icon: typeof Users; cor: string }> = {
  atletica: { label: 'Atlética',  icon: Users,        cor: '#2563eb' },
  jogo:     { label: 'Jogo',      icon: Trophy,       cor: '#2e6b42' },
  conteudo: { label: 'Conteúdo',  icon: Camera,       cor: '#A04A2E' },
  usuario:  { label: 'Usuário',   icon: UserCircle,   cor: '#8a5f06' },
  setor:    { label: 'Setor',     icon: MapPin,       cor: '#1a5c5c' },
  praca:    { label: 'Praça',     icon: MapPin,       cor: '#1a5c5c' },
  nav:      { label: 'Página',    icon: LayoutGrid,   cor: '#64748b' },
}

// Quick nav: atalhos de páginas que aparecem quando a busca está vazia.
const QUICK_NAV: SearchResult[] = [
  { id: 'nav-placar',    type: 'nav', title: 'Placar Ao Vivo',  subtitle: 'Acompanhar jogos',                href: '/placar' },
  { id: 'nav-atleticas', type: 'nav', title: 'Atléticas',       subtitle: 'Lista de atléticas',              href: '/atleticas' },
  { id: 'nav-agenda',    type: 'nav', title: 'Agenda',          subtitle: 'Jogos, shows e festas',           href: '/agenda' },
  { id: 'nav-escala',    type: 'nav', title: 'Escala Delegados',subtitle: 'Praças esportivas',               href: '/esportivo/escala' },
  { id: 'nav-conteudos', type: 'nav', title: 'Kanban Conteúdo', subtitle: 'Produção',                        href: '/conteudos' },
  { id: 'nav-pautas',    type: 'nav', title: 'Pautas',          subtitle: 'Ideias de cobertura',             href: '/pautas' },
  { id: 'nav-mapa',      type: 'nav', title: 'Mapa do Evento',  subtitle: 'Setores e WiFi',                  href: '/mapa' },
  { id: 'nav-checklist', type: 'nav', title: 'Checklists',      subtitle: 'Tarefas por evento',              href: '/checklist' },
]

export function CommandPalette() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)

  // ── Atalho Cmd+K / Ctrl+K — global ───────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Cmd+K (Mac) / Ctrl+K (Win/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      // Esc fecha
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    // Permite que outros componentes abram o palette via window event
    // (ex: botão de busca no header em mobile)
    function openHandler() { setOpen(true) }

    document.addEventListener('keydown', handler)
    window.addEventListener('cmd-palette-open', openHandler)
    return () => {
      document.removeEventListener('keydown', handler)
      window.removeEventListener('cmd-palette-open', openHandler)
    }
  }, [open])

  // ── Foca input ao abrir ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIdx(0)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (trimmed.length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        const data = (await res.json()) as { results: SearchResult[] }
        setResults(data.results)
        setSelectedIdx(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, open])

  // Lista exibida: resultados da busca OU quick nav quando vazio
  const displayed = query.trim().length === 0 ? QUICK_NAV : results

  const go = useCallback((href: string) => {
    router.push(href)
    setOpen(false)
  }, [router])

  // ── Navegação por teclado ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, displayed.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && displayed[selectedIdx]) {
        e.preventDefault()
        go(displayed[selectedIdx].href)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, displayed, selectedIdx, go])

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Busca global"
    >
      <div
        ref={containerRef}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        style={{ animation: 'cmdK-in 150ms ease-out' }}
      >
        <style>{`
          @keyframes cmdK-in {
            from { opacity: 0; transform: scale(0.97) translateY(-8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Input bar */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]/60" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar atléticas, jogos, conteúdos, usuários…"
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 outline-none"
            autoComplete="off"
          />
          {loading && (
            <span className="h-3 w-3 rounded-full border-2 border-[var(--green-bright)] border-t-transparent animate-spin" aria-label="Carregando" />
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="rounded-md p-1 text-[var(--muted-foreground)]/40 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Section label */}
        {displayed.length > 0 && (
          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/50">
            {query.trim() ? `Resultados (${displayed.length})` : 'Acesso rápido'}
          </p>
        )}

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto px-2 pb-2">
          {displayed.length === 0 && query.trim() && !loading && (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhum resultado para &quot;<span className="font-medium">{query}</span>&quot;
            </p>
          )}
          {displayed.map((r, idx) => {
            const meta = TYPE_META[r.type]
            const Icon = meta.icon
            const isActive = idx === selectedIdx
            return (
              <button
                key={r.id}
                onClick={() => go(r.href)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive ? 'bg-[var(--green-dim)]/15' : 'hover:bg-[var(--muted)]'
                }`}
              >
                {/* Icon */}
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `${meta.cor}14`,
                    border:     `1px solid ${meta.cor}28`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: meta.cor }} />
                </span>

                {/* Title + subtitle */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {r.title}
                  </p>
                  {r.subtitle && (
                    <p className="truncate text-[11px] text-[var(--muted-foreground)]">
                      {r.subtitle}
                    </p>
                  )}
                </div>

                {/* Type label */}
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: meta.cor, background: `${meta.cor}10` }}
                >
                  {meta.label}
                </span>

                {/* Enter hint for active */}
                {isActive && (
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]/60" aria-hidden />
                )}
              </button>
            )
          })}
        </div>

        {/* Footer with shortcuts */}
        <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--muted)]/30 px-4 py-2 text-[10px] text-[var(--muted-foreground)]/60">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 text-[9px] font-mono">
                <ArrowUp className="inline h-2.5 w-2.5" />
                <ArrowDown className="inline h-2.5 w-2.5" />
              </kbd>
              navegar
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 text-[9px] font-mono">
                <CornerDownLeft className="inline h-2.5 w-2.5" />
              </kbd>
              abrir
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 text-[9px] font-mono">
                esc
              </kbd>
              fechar
            </span>
          </div>
          <span className="text-[var(--muted-foreground)]/40">CIA 2026</span>
        </div>
      </div>
    </div>
  )
}

