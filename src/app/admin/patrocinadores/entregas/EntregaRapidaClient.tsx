'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Check, Layers, Film, ImageIcon, Star, Radio, FileText, Repeat,
  ArrowLeft, Zap, Clock,
} from 'lucide-react'

// ── Mapeamentos (espelham o EscopoClient) ──────────────────────────────────────

const TIPO_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  story_rapido:      { label: 'Story Rápido',     Icon: Layers,    color: '#a78bfa' },
  story_editado:     { label: 'Story Editado',    Icon: Layers,    color: '#818cf8' },
  reels:             { label: 'Reels',            Icon: Film,      color: '#f472b6' },
  card_feed:         { label: 'Card Feed',        Icon: ImageIcon, color: '#60a5fa' },
  card_patrocinado:  { label: 'Card Patrocinado', Icon: Star,      color: '#fbbf24' },
  cobertura_ao_vivo: { label: 'Cobertura ao Vivo',Icon: Radio,     color: '#34d399' },
  texto_legenda:     { label: 'Texto / Legenda',  Icon: FileText,  color: '#94a3b8' },
  repost:            { label: 'Repost',           Icon: Repeat,    color: '#fb923c' },
}

const CANAL_LABEL: Record<string, string> = {
  instagram_feed: 'IG Feed', instagram_stories: 'IG Stories', instagram_reels: 'IG Reels',
  tiktok: 'TikTok', youtube: 'YouTube', youtube_shorts: 'YT Shorts',
  twitter_x: 'Twitter/X', facebook: 'Facebook', whatsapp_status: 'WA Status', outro: 'Outro',
}

function fmtPrazo(d: string | null) {
  if (!d) return null
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ItemEntrega {
  id: string
  tipo_conteudo: string | null
  canal: string | null
  descricao: string | null
  quantidade_prevista: number
  status: string
  prazo_limite: string | null
}

export interface MarcaEntrega {
  id: string
  nome: string
  logo_url: string | null
  cor_marca: string | null
  itens: ItemEntrega[]
}

type ActionResult = { ok: boolean; error?: string }

interface Props {
  marcas: MarcaEntrega[]
  setStatus: (id: string, status: string) => Promise<ActionResult>
  setStatusBulk: (ids: string[], status: string) => Promise<ActionResult>
}

// ── Componente ───────────────────────────────────────────────────────────────

export function EntregaRapidaClient({ marcas, setStatus, setStatusBulk }: Props) {
  // Estado local otimista: id → status
  const [statusById, setStatusById] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const m of marcas) for (const it of m.itens) map[it.id] = it.status
    return map
  })
  const [filtro, setFiltro] = useState<string>('__todas__')
  const [, startT] = useTransition()

  function isEntregue(id: string) {
    return statusById[id] === 'entregue'
  }

  // Total geral (em unidades de escopo)
  const { totalUnid, entregueUnid } = useMemo(() => {
    let total = 0, entr = 0
    for (const m of marcas) for (const it of m.itens) {
      total += it.quantidade_prevista
      if (statusById[it.id] === 'entregue') entr += it.quantidade_prevista
    }
    return { totalUnid: total, entregueUnid: entr }
  }, [marcas, statusById])
  const pctGeral = totalUnid > 0 ? Math.round((entregueUnid / totalUnid) * 100) : 0

  function toggleItem(it: ItemEntrega) {
    const novo = isEntregue(it.id) ? 'pendente' : 'entregue'
    setStatusById((prev) => ({ ...prev, [it.id]: novo }))
    startT(async () => {
      const res = await setStatus(it.id, novo)
      if (!res.ok) {
        // rollback em caso de erro
        setStatusById((prev) => ({ ...prev, [it.id]: it.status }))
      }
    })
  }

  function marcarMarcaToda(m: MarcaEntrega, status: 'entregue' | 'pendente') {
    const ids = m.itens.map((i) => i.id)
    const anterior: Record<string, string> = {}
    for (const i of m.itens) anterior[i.id] = statusById[i.id]
    setStatusById((prev) => {
      const next = { ...prev }
      for (const id of ids) next[id] = status
      return next
    })
    startT(async () => {
      const res = await setStatusBulk(ids, status)
      if (!res.ok) setStatusById((prev) => ({ ...prev, ...anterior }))
    })
  }

  const marcasVisiveis = filtro === '__todas__' ? marcas : marcas.filter((m) => m.id === filtro)

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4">
      {/* Voltar */}
      <Link
        href="/admin/patrocinadores"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Fichário de patrocínio
      </Link>

      {/* Cabeçalho */}
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-[var(--green-bright)]" />
        <h1 className="text-lg font-bold tracking-tight text-[var(--foreground)]">Entrega Rápida</h1>
      </div>

      {/* Progresso geral — sticky */}
      <div className="sticky top-2 z-10 mb-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 p-4 backdrop-blur">
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Entregue ao vivo
          </p>
          <span className={`text-lg font-black tabular-nums ${pctGeral === 100 ? 'text-emerald-400' : 'text-[var(--foreground)]'}`}>
            {pctGeral}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pctGeral === 100 ? 'bg-emerald-500' : 'bg-[var(--green-bright)]'}`}
            style={{ width: `${pctGeral}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
          {entregueUnid} de {totalUnid} unidades entregues
        </p>
      </div>

      {/* Filtro por marca */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <FiltroChip ativo={filtro === '__todas__'} onClick={() => setFiltro('__todas__')}>
          Todas
        </FiltroChip>
        {marcas.map((m) => (
          <FiltroChip key={m.id} ativo={filtro === m.id} onClick={() => setFiltro(m.id)}>
            {m.nome}
          </FiltroChip>
        ))}
      </div>

      {/* Seções por marca */}
      <div className="space-y-5">
        {marcasVisiveis.map((m) => {
          const entr = m.itens.filter((i) => isEntregue(i.id)).length
          const todasEntregues = entr === m.itens.length
          return (
            <section key={m.id}>
              {/* Header da marca */}
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {m.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.logo_url}
                      alt={m.nome}
                      className="h-6 w-6 shrink-0 rounded object-contain"
                      style={{ background: 'white', padding: 1 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <span
                      className="h-6 w-6 shrink-0 rounded"
                      style={{ background: m.cor_marca ?? 'var(--muted)' }}
                    />
                  )}
                  <h2 className="truncate text-sm font-bold text-[var(--foreground)]">{m.nome}</h2>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--muted-foreground)]">
                    {entr}/{m.itens.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => marcarMarcaToda(m, todasEntregues ? 'pendente' : 'entregue')}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors
                    ${todasEntregues
                      ? 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                      : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                    }`}
                >
                  {todasEntregues ? 'Desmarcar tudo' : '✓ Marcar tudo'}
                </button>
              </div>

              {/* Itens */}
              <ul className="space-y-2">
                {m.itens.map((it) => {
                  const meta = it.tipo_conteudo ? TIPO_META[it.tipo_conteudo] : null
                  const Icon = meta?.Icon ?? FileText
                  const cor = meta?.color ?? '#94a3b8'
                  const done = isEntregue(it.id)
                  const prazo = fmtPrazo(it.prazo_limite)
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => toggleItem(it)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.99]
                          ${done
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--foreground)]/20'
                          }`}
                      >
                        {/* Checkbox grande */}
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all
                            ${done
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-[var(--border)] text-transparent'
                            }`}
                        >
                          <Check className="h-4 w-4" strokeWidth={3} />
                        </span>

                        {/* Ícone do tipo */}
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: `${cor}18` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: cor }} />
                        </span>

                        {/* Texto */}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className={`truncate text-sm font-semibold ${done ? 'text-emerald-300 line-through' : 'text-[var(--foreground)]'}`}>
                              {it.quantidade_prevista > 1 ? `${it.quantidade_prevista}× ` : ''}
                              {meta?.label ?? it.tipo_conteudo ?? 'Entrega'}
                            </span>
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--muted-foreground)]">
                            {it.canal && <span>{CANAL_LABEL[it.canal] ?? it.canal}</span>}
                            {prazo && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {prazo}
                              </span>
                            )}
                            {it.descricao && <span className="truncate">{it.descricao}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      {marcas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            Nenhuma marca com escopo cadastrado.
          </p>
        </div>
      )}
    </div>
  )
}

function FiltroChip({
  ativo, onClick, children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all
        ${ativo
          ? 'border-[var(--green-bright)]/40 bg-[var(--green-dim)]/20 text-[var(--green-bright)]'
          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
        }`}
    >
      {children}
    </button>
  )
}
