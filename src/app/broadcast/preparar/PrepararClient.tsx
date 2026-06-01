'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ListChecks, Film, ClipboardList, Plus, Trash2, Wand2, RotateCcw, Clock, Tv2 } from 'lucide-react'
import {
  criarItemEscaleta, deletarItemEscaleta, gerarEscaletaDoLineup,
  criarVT, deletarVT, toggleChecklist, resetChecklist,
} from '../actions'
import { ESCALETA_TIPOS, type VT, type EscaletaItem, type ChecklistItem, type PatrocinadorRef } from '../types'

function fmtDur(seg: number) {
  if (!seg) return '—'
  const m = Math.floor(seg / 60), s = seg % 60
  return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ''}` : `${s}s`
}
const tipoMeta = (t: string) => ESCALETA_TIPOS.find(x => x.value === t) ?? { label: t, cor: '#888' }

export function PrepararClient({
  escaleta, vts, checklist, patrocinadores,
}: {
  escaleta: EscaletaItem[]
  vts: VT[]
  checklist: ChecklistItem[]
  patrocinadores: PatrocinadorRef[]
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const refresh = () => router.refresh()

  // Checklist
  const feitos = checklist.filter(c => c.feito).length
  const pct = checklist.length ? Math.round(feitos / checklist.length * 100) : 0
  const porCategoria = checklist.reduce<Record<string, ChecklistItem[]>>((acc, c) => {
    (acc[c.categoria] ??= []).push(c); return acc
  }, {})

  // Escaleta — novo item
  const [novoTipo, setNovoTipo] = useState('atracao')
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaDur, setNovaDur] = useState('')

  // VT — novo
  const [vtNome, setVtNome] = useState('')
  const [vtDur, setVtDur] = useState('30')
  const [vtPatroc, setVtPatroc] = useState('')

  const duracaoTotal = escaleta.reduce((acc, i) => acc + (i.duracao_seg || 0), 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 pb-20">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--green)]">Broadcast · Pré-produção</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Preparar transmissão</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Escaleta, VTs e checklist antes de abrir o ar</p>
        </div>
        <Link href="/broadcast/regie" className="inline-flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
          <Tv2 className="h-4 w-4" /> Ir para a Régie
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* ── ESCALETA ── */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[var(--green)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Escaleta · espelho</h2>
              <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]">
                {escaleta.length} itens · {fmtDur(duracaoTotal)}
              </span>
            </div>
            <button
              onClick={() => { if (confirm('Gerar escaleta a partir do line-up do Palco Principal? Isso substitui a escaleta atual.')) start(async () => { await gerarEscaletaDoLineup(); refresh() }) }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-2.5 py-1.5 text-[11px] font-bold text-[var(--gold)] hover:bg-[var(--gold)]/20"
            >
              <Wand2 className="h-3.5 w-3.5" /> Gerar do line-up
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-1.5 mb-3">
            {escaleta.length === 0 && <p className="text-sm text-[var(--muted-foreground)] py-6 text-center">Escaleta vazia. Gere do line-up ou adicione itens abaixo.</p>}
            {escaleta.map((item, i) => {
              const meta = tipoMeta(item.tipo)
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" style={{ borderLeftWidth: 3, borderLeftColor: meta.cor }}>
                  <span className="w-5 text-right text-xs font-mono text-[var(--muted-foreground)]">{i + 1}</span>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: meta.cor, background: `${meta.cor}1a` }}>{meta.label}</span>
                  <span className="flex-1 text-sm font-semibold truncate">{item.titulo}</span>
                  <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] tabular-nums"><Clock className="h-3 w-3" />{fmtDur(item.duracao_seg)}</span>
                  <button onClick={() => start(async () => { await deletarItemEscaleta(item.id); refresh() })} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )
            })}
          </div>

          {/* Add item */}
          <div className="flex gap-2 flex-wrap items-end border-t border-[var(--border)] pt-3">
            <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs">
              {ESCALETA_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} placeholder="Título do item" className="h-9 flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
            <input value={novaDur} onChange={e => setNovaDur(e.target.value)} placeholder="seg" type="number" className="h-9 w-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm" />
            <button
              disabled={!novoTitulo.trim()}
              onClick={() => start(async () => { await criarItemEscaleta({ tipo: novoTipo, titulo: novoTitulo, duracao_seg: Number(novaDur) || 0 }); setNovoTitulo(''); setNovaDur(''); refresh() })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 text-sm font-bold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </section>

        <div className="space-y-5">
          {/* ── CHECKLIST GO-LIVE ── */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[var(--green)]" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Checklist Go-Live</h2>
              </div>
              <button onClick={() => start(async () => { await resetChecklist(); refresh() })} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]" title="Resetar"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
            {/* Progresso */}
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-[var(--muted)] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--gold)' }} />
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: pct === 100 ? 'var(--green)' : 'var(--gold)' }}>{pct}%</span>
            </div>
            {pct === 100 && <p className="mb-2 text-center text-xs font-bold text-[var(--green)]">✓ Tudo pronto pra abrir o ar</p>}
            {Object.entries(porCategoria).map(([cat, itens]) => (
              <div key={cat} className="mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/60 mb-1">{cat}</p>
                {itens.map(c => (
                  <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="checkbox" checked={c.feito} onChange={() => start(async () => { await toggleChecklist(c.id, !c.feito); refresh() })} className="h-4 w-4 rounded" />
                    <span className={`text-[13px] ${c.feito ? 'line-through text-[var(--muted-foreground)]' : ''}`}>{c.texto}</span>
                  </label>
                ))}
              </div>
            ))}
          </section>

          {/* ── BIBLIOTECA DE VTs ── */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Film className="h-4 w-4 text-[var(--green)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Biblioteca de VTs</h2>
              <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]">{vts.length}</span>
            </div>
            <div className="space-y-1.5 mb-3">
              {vts.length === 0 && <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">Nenhuma VT cadastrada.</p>}
              {vts.map(vt => {
                const p = vt.patroc_id ? patrocinadores.find(x => x.id === vt.patroc_id) : null
                return (
                  <div key={vt.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                    <Film className="h-3.5 w-3.5 text-[var(--blue,#5C68E8)] shrink-0" />
                    <span className="flex-1 text-sm font-semibold truncate">{vt.nome}{p && <span className="text-[var(--muted-foreground)] font-normal"> · {p.nome}</span>}</span>
                    <span className="text-xs text-[var(--muted-foreground)] tabular-nums">{fmtDur(vt.duracao_seg)}</span>
                    <button onClick={() => start(async () => { await deletarVT(vt.id); refresh() })} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )
              })}
            </div>
            {/* Add VT */}
            <div className="flex gap-2 flex-wrap items-end border-t border-[var(--border)] pt-3">
              <input value={vtNome} onChange={e => setVtNome(e.target.value)} placeholder="Nome da VT" className="h-9 flex-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
              <input value={vtDur} onChange={e => setVtDur(e.target.value)} placeholder="seg" type="number" className="h-9 w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm" />
              <select value={vtPatroc} onChange={e => setVtPatroc(e.target.value)} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs max-w-[110px]">
                <option value="">Sem patroc.</option>
                {patrocinadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <button
                disabled={!vtNome.trim()}
                onClick={() => start(async () => { await criarVT(vtNome, Number(vtDur) || 30, vtPatroc || null, null); setVtNome(''); setVtDur('30'); setVtPatroc(''); refresh() })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 text-sm font-bold text-white disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
