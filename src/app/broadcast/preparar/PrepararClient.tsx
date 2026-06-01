'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ListChecks, Film, ClipboardList, Plus, Trash2, Wand2, RotateCcw, Clock, Activity, Users, Radio, Save } from 'lucide-react'
import {
  criarItemGrade, deletarItemGrade, atualizarItemGrade, gerarGradeDoLineup,
  criarVT, deletarVT, toggleChecklist, resetChecklist,
  atualizarEquipe, criarEquipe, deletarEquipe, setPrograma,
} from '../actions'
import { GRADE_TIPOS, parseYoutubeId, type VT, type GradeItem, type ChecklistItem, type EquipeItem, type PatrocinadorRef } from '../types'

function fmtDur(seg: number) {
  if (!seg) return '—'
  const m = Math.floor(seg / 60), s = seg % 60
  return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ''}` : `${s}s`
}
const tipoMeta = (t: string) => GRADE_TIPOS.find(x => x.value === t) ?? { label: t, cor: '#888' }

export function PrepararClient({
  grade, vts, checklist, equipe, patrocinadores, programaTitulo, youtubeUrl,
}: {
  grade: GradeItem[]
  vts: VT[]
  checklist: ChecklistItem[]
  equipe: EquipeItem[]
  patrocinadores: PatrocinadorRef[]
  programaTitulo: string
  youtubeUrl: string
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const refresh = () => router.refresh()

  // Programa (título + youtube)
  const [titulo, setTitulo] = useState(programaTitulo)
  const [yt, setYt] = useState(youtubeUrl)
  const [savedCfg, setSavedCfg] = useState(false)

  // Checklist
  const feitos = checklist.filter(c => c.feito).length
  const pct = checklist.length ? Math.round(feitos / checklist.length * 100) : 0
  const porCategoria = checklist.reduce<Record<string, ChecklistItem[]>>((acc, c) => { (acc[c.categoria] ??= []).push(c); return acc }, {})

  // Grade — novo item
  const [nHora, setNHora] = useState('')
  const [nTipo, setNTipo] = useState('atracao')
  const [nTitulo, setNTitulo] = useState('')
  const [nResp, setNResp] = useState('')
  const [nDur, setNDur] = useState('')

  // VT — novo
  const [vtNome, setVtNome] = useState('')
  const [vtDur, setVtDur] = useState('30')
  const [vtPatroc, setVtPatroc] = useState('')

  const duracaoTotal = grade.reduce((acc, i) => acc + (i.duracao_seg || 0), 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 pb-20">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--green)]">Broadcast · Pré-produção</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Preparar transmissão</h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">Grade de programação, VTs, equipe e checklist antes de abrir o ar</p>
        </div>
        <Link href="/broadcast/termometro" className="inline-flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
          <Activity className="h-4 w-4" /> Termômetro ao vivo
        </Link>
      </div>

      {/* Config do programa */}
      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Título do programa</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Palco Principal · Quinta" className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
          </div>
          <div className="flex-[2] min-w-[220px]">
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]"><Radio className="h-3.5 w-3.5 text-red-500" /> Link da transmissão (YouTube)</label>
            <input value={yt} onChange={e => setYt(e.target.value)} placeholder="https://youtube.com/watch?v=… ou /live/…" className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
            {yt && !parseYoutubeId(yt) && <p className="mt-1 text-[10px] text-amber-600">Não consegui identificar o ID do vídeo nesse link.</p>}
          </div>
          <button
            onClick={() => start(async () => { await setPrograma({ programa_titulo: titulo || null, youtube_url: yt || null, youtube_video_id: parseYoutubeId(yt) }); setSavedCfg(true); setTimeout(() => setSavedCfg(false), 1800); refresh() })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3 text-sm font-bold text-[var(--background)]"
          >
            <Save className="h-4 w-4" /> {savedCfg ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* ── GRADE DE PROGRAMAÇÃO ── */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[var(--green)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Grade de Programação</h2>
              <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]">{grade.length} blocos · {fmtDur(duracaoTotal)}</span>
            </div>
            <button onClick={() => { if (confirm('Gerar grade a partir do line-up do Palco Principal? Substitui a grade atual.')) start(async () => { await gerarGradeDoLineup(); refresh() }) }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-2.5 py-1.5 text-[11px] font-bold text-[var(--gold)] hover:bg-[var(--gold)]/20">
              <Wand2 className="h-3.5 w-3.5" /> Gerar do line-up
            </button>
          </div>

          {/* Cabeçalho colunas */}
          <div className="hidden sm:flex items-center gap-2 px-3 pb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/50">
            <span className="w-12">Hora</span><span className="w-16">Tipo</span><span className="flex-1">Bloco</span><span className="w-24">Responsável</span><span className="w-12 text-right">Dur.</span><span className="w-5" />
          </div>

          <div className="space-y-1 mb-3">
            {grade.length === 0 && <p className="text-sm text-[var(--muted-foreground)] py-6 text-center">Grade vazia. Gere do line-up ou adicione blocos abaixo.</p>}
            {grade.map((item) => {
              const meta = tipoMeta(item.tipo)
              return (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2" style={{ borderLeftWidth: 3, borderLeftColor: meta.cor }}>
                  <input
                    defaultValue={item.horario?.slice(0, 5) ?? ''} type="time"
                    onBlur={e => { const v = e.target.value || null; if (v !== (item.horario?.slice(0, 5) ?? null)) start(async () => { await atualizarItemGrade(item.id, { horario: v }) }) }}
                    className="w-[4.5rem] shrink-0 rounded border border-transparent bg-transparent text-xs font-mono font-semibold tabular-nums hover:border-[var(--border)] focus:border-[var(--green)] outline-none px-1 py-0.5"
                  />
                  <span className="w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-[9px] font-bold uppercase" style={{ color: meta.cor, background: `${meta.cor}1a` }}>{meta.label}</span>
                  <input defaultValue={item.titulo} onBlur={e => { if (e.target.value !== item.titulo) start(async () => { await atualizarItemGrade(item.id, { titulo: e.target.value }) }) }}
                    className="flex-1 min-w-0 rounded border border-transparent bg-transparent text-sm font-semibold hover:border-[var(--border)] focus:border-[var(--green)] outline-none px-1.5 py-0.5" />
                  <input defaultValue={item.responsavel ?? ''} placeholder="—" onBlur={e => { if (e.target.value !== (item.responsavel ?? '')) start(async () => { await atualizarItemGrade(item.id, { responsavel: e.target.value || null }) }) }}
                    className="hidden sm:block w-24 shrink-0 rounded border border-transparent bg-transparent text-xs text-[var(--muted-foreground)] hover:border-[var(--border)] focus:border-[var(--green)] outline-none px-1 py-0.5" />
                  <span className="w-12 shrink-0 text-right text-xs text-[var(--muted-foreground)] tabular-nums">{fmtDur(item.duracao_seg)}</span>
                  <button onClick={() => start(async () => { await deletarItemGrade(item.id); refresh() })} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )
            })}
          </div>

          {/* Add bloco */}
          <div className="flex gap-2 flex-wrap items-end border-t border-[var(--border)] pt-3">
            <input value={nHora} onChange={e => setNHora(e.target.value)} type="time" className="h-9 w-[5rem] rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs" />
            <select value={nTipo} onChange={e => setNTipo(e.target.value)} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs">
              {GRADE_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={nTitulo} onChange={e => setNTitulo(e.target.value)} placeholder="Bloco" className="h-9 flex-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
            <input value={nResp} onChange={e => setNResp(e.target.value)} placeholder="Responsável" className="h-9 w-28 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs" />
            <input value={nDur} onChange={e => setNDur(e.target.value)} placeholder="seg" type="number" className="h-9 w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm" />
            <button disabled={!nTitulo.trim()}
              onClick={() => start(async () => { await criarItemGrade({ tipo: nTipo, titulo: nTitulo, duracao_seg: Number(nDur) || 0, horario: nHora || null, responsavel: nResp || null }); setNTitulo(''); setNResp(''); setNDur(''); setNHora(''); refresh() })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 text-sm font-bold text-white disabled:opacity-40">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </section>

        <div className="space-y-5">
          {/* ── CHECKLIST ── */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[var(--green)]" /><h2 className="text-sm font-bold uppercase tracking-wider">Checklist Go-Live</h2></div>
              <button onClick={() => start(async () => { await resetChecklist(); refresh() })} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]" title="Resetar"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-[var(--muted)] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--gold)' }} /></div>
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

          {/* ── EQUIPE ── */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-[var(--green)]" /><h2 className="text-sm font-bold uppercase tracking-wider">Equipe do programa</h2></div>
            <div className="space-y-1.5">
              {equipe.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 text-[11px] font-semibold text-[var(--muted-foreground)] truncate">{m.funcao}</span>
                  <input defaultValue={m.nome} placeholder="Nome…" onBlur={e => { if (e.target.value !== m.nome) start(async () => { await atualizarEquipe(m.id, { nome: e.target.value }) }) }}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-sm" />
                  <button onClick={() => start(async () => { await deletarEquipe(m.id); refresh() })} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <AddEquipe onAdd={(f, n) => start(async () => { await criarEquipe(f, n); refresh() })} />
          </section>

          {/* ── VTs ── */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-3 flex items-center gap-2"><Film className="h-4 w-4 text-[var(--green)]" /><h2 className="text-sm font-bold uppercase tracking-wider">Biblioteca de VTs</h2><span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]">{vts.length}</span></div>
            <div className="space-y-1.5 mb-3">
              {vts.length === 0 && <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">Nenhuma VT cadastrada.</p>}
              {vts.map(vt => {
                const p = vt.patroc_id ? patrocinadores.find(x => x.id === vt.patroc_id) : null
                return (
                  <div key={vt.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                    <Film className="h-3.5 w-3.5 text-[#5C68E8] shrink-0" />
                    <span className="flex-1 text-sm font-semibold truncate">{vt.nome}{p && <span className="text-[var(--muted-foreground)] font-normal"> · {p.nome}</span>}</span>
                    <span className="text-xs text-[var(--muted-foreground)] tabular-nums">{fmtDur(vt.duracao_seg)}</span>
                    <button onClick={() => start(async () => { await deletarVT(vt.id); refresh() })} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 flex-wrap items-end border-t border-[var(--border)] pt-3">
              <input value={vtNome} onChange={e => setVtNome(e.target.value)} placeholder="Nome da VT" className="h-9 flex-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
              <input value={vtDur} onChange={e => setVtDur(e.target.value)} placeholder="seg" type="number" className="h-9 w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm" />
              <select value={vtPatroc} onChange={e => setVtPatroc(e.target.value)} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs max-w-[110px]">
                <option value="">Sem patroc.</option>
                {patrocinadores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <button disabled={!vtNome.trim()}
                onClick={() => start(async () => { await criarVT(vtNome, Number(vtDur) || 30, vtPatroc || null, null); setVtNome(''); setVtDur('30'); setVtPatroc(''); refresh() })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 text-sm font-bold text-white disabled:opacity-40">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function AddEquipe({ onAdd }: { onAdd: (funcao: string, nome: string) => void }) {
  const [funcao, setFuncao] = useState('')
  const [nome, setNome] = useState('')
  return (
    <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-3">
      <input value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Função" className="h-9 w-36 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-sm" />
      <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-sm" />
      <button disabled={!funcao.trim()} onClick={() => { onAdd(funcao, nome); setFuncao(''); setNome('') }} className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--green)] px-3 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /></button>
    </div>
  )
}
