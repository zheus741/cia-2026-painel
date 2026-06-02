'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ListChecks, Film, Plus, Trash2, Wand2, Activity,
  Radio, Save, GripVertical, Star, Sparkles, Megaphone, Music2, Timer, ChevronDown,
} from 'lucide-react'
import {
  criarItemGrade, deletarItemGrade, atualizarItemGrade, gerarGradeDoLineup, recalcularHorarios, reordenarGrade,
  criarVT, deletarVT, setPrograma,
} from '../actions'
import { GRADE_TIPOS, parseYoutubeId, type VT, type GradeItem, type PatrocinadorRef, type LineupShow } from '../types'

// ── tokens (control-room dark) ───────────────────────────────────────────────
const C = {
  bg: '#070D0A', panel: 'rgba(250,247,240,0.035)', panelHi: 'rgba(250,247,240,0.06)',
  cream: '#FAF7F0', dim: 'rgba(250,247,240,0.60)', mute: 'rgba(250,247,240,0.34)', fade: 'rgba(250,247,240,0.14)',
  border: 'rgba(250,247,240,0.10)',
  gold: '#D4B36A', goldB: '#F0D04A', green: '#4aa06a', red: '#EF4444', blue: '#5C68E8', lav: '#B8A4E8',
}
const FD = 'var(--font-fraunces), Georgia, serif'
const FS = 'var(--font-geist), system-ui, sans-serif'
const tipoMeta = (t: string) => GRADE_TIPOS.find(x => x.value === t) ?? { label: t, cor: C.gold }
function fmtDur(seg: number) { if (!seg) return '—'; const m = Math.floor(seg / 60), s = seg % 60; return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ''}` : `${s}s` }
function fmtTotal(seg: number) { const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60); return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min` }

type DragPayload =
  | { kind: 'show'; data: LineupShow }
  | { kind: 'vt'; data: VT }
  | { kind: 'bloco'; data: { tipo: string; titulo: string; dur: number } }
  | { kind: 'reorder'; id: string }

const BLOCOS_GENERICOS = [
  { tipo: 'vinheta', titulo: 'Vinheta', dur: 20 },
  { tipo: 'fala', titulo: 'Fala / Apresentador', dur: 120 },
  { tipo: 'bumper', titulo: 'Bumper', dur: 8 },
  { tipo: 'intervalo', titulo: 'Intervalo', dur: 180 },
  { tipo: 'placa', titulo: 'Placa', dur: 15 },
  { tipo: 'encerramento', titulo: 'Encerramento', dur: 60 },
]
const DIAS_LABEL = ['Qui', 'Sex', 'Sáb', 'Dom']

export function PrepararClient({
  grade, vts, patrocinadores, lineup, programaTitulo, youtubeUrl,
}: {
  grade: GradeItem[]; vts: VT[]
  patrocinadores: PatrocinadorRef[]; lineup: LineupShow[]; programaTitulo: string; youtubeUrl: string
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const refresh = () => router.refresh()

  const [items, setItems] = useState<GradeItem[]>(grade)
  useEffect(() => { setItems(grade) }, [grade])

  const dragRef = useRef<DragPayload | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const [overId, setOverId] = useState<string | null>(null)

  const [tab, setTab] = useState<'lineup' | 'vts' | 'blocos'>('lineup')
  const [dia, setDia] = useState(1)

  const [cfgOpen, setCfgOpen] = useState(!programaTitulo)
  const [titulo, setTitulo] = useState(programaTitulo)
  const [yt, setYt] = useState(youtubeUrl)
  const [savedCfg, setSavedCfg] = useState(false)
  const [horaIni, setHoraIni] = useState('')

  const [vtNome, setVtNome] = useState(''); const [vtDur, setVtDur] = useState('30'); const [vtPatroc] = useState('')

  const duracaoTotal = items.reduce((a, i) => a + (i.duracao_seg || 0), 0)
  const lineupDia = lineup.filter(s => s.dia === dia)

  const addItem = useCallback((novo: { tipo: string; titulo: string; duracao_seg: number; horario?: string | null; vt_id?: string | null }) => {
    const tmp: GradeItem = { id: `tmp-${Date.now()}`, ordem: Date.now(), tipo: novo.tipo, titulo: novo.titulo, duracao_seg: novo.duracao_seg, horario: novo.horario ?? null, responsavel: null, vt_id: novo.vt_id ?? null, notas: null, status: 'pendente' }
    setItems(prev => [...prev, tmp])
    start(async () => { await criarItemGrade({ tipo: novo.tipo, titulo: novo.titulo, duracao_seg: novo.duracao_seg, horario: novo.horario ?? null, vt_id: novo.vt_id ?? null }); refresh() })
  }, [])

  function handleDrop(targetId?: string) {
    const p = dragRef.current; dragRef.current = null; setDropActive(false); setOverId(null)
    if (!p) return
    if (p.kind === 'reorder') { doReorder(p.id, targetId); return }
    if (p.kind === 'show') addItem({ tipo: 'atracao', titulo: p.data.nome, duracao_seg: p.data.duracao_seg, horario: p.data.horario })
    else if (p.kind === 'vt') addItem({ tipo: 'vt', titulo: `VT · ${p.data.nome}`, duracao_seg: p.data.duracao_seg, vt_id: p.data.id })
    else if (p.kind === 'bloco') addItem({ tipo: p.data.tipo, titulo: p.data.titulo, duracao_seg: p.data.dur })
  }

  function doReorder(id: string, targetId?: string) {
    const arr = [...items]
    const from = arr.findIndex(x => x.id === id)
    if (from < 0) return
    const [moved] = arr.splice(from, 1)
    let to = targetId ? arr.findIndex(x => x.id === targetId) : arr.length
    if (to < 0) to = arr.length
    arr.splice(to, 0, moved)
    setItems(arr)
    const prevO = arr[to - 1]?.ordem ?? 0
    const nextO = arr[to + 1]?.ordem ?? prevO + 2000
    start(async () => { await reordenarGrade(moved.id, (prevO + nextO) / 2); refresh() })
  }

  return (
    <div style={{ minHeight: '100%', background: C.bg, color: C.cream, fontFamily: FS, padding: '14px 18px' }}>
      <style>{`
        .pp-card{transition:transform .15s ease, border-color .15s ease;}
        .pp-card:hover{transform:translateY(-1px);}
        .pp-grab{cursor:grab;} .pp-grab:active{cursor:grabbing;}
        @keyframes ppIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .pp-edit{transition:border-color .15s, background .15s;}
        .pp-edit:hover{border-color:rgba(250,247,240,0.18)!important;}
        .pp-edit:focus{border-color:#4aa06a!important;background:rgba(250,247,240,0.04)!important;}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:rgba(250,247,240,.14);border-radius:3px}
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', color: C.green, textTransform: 'uppercase' }}>Broadcast · Pré-produção</p>
          <h1 style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1 }}>Montar transmissão</h1>
        </div>
        <div style={{ flex: 1 }} />
        <Stat label="Blocos" valor={String(items.length)} />
        <Stat label="Duração" valor={fmtTotal(duracaoTotal)} accent={C.gold} />
        <button onClick={() => setCfgOpen(o => !o)} style={btnGhost}>
          <Radio size={14} style={{ color: C.red }} /> Config <ChevronDown size={13} style={{ transform: cfgOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        <Link href="/broadcast/termometro" style={{ ...btnGhost, background: C.green, color: '#fff', border: 'none' }}>
          <Activity size={14} /> Termômetro
        </Link>
      </div>

      {/* CONFIG */}
      {cfgOpen && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 14, padding: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, animation: 'ppIn .2s ease' }}>
          <Field label="Título do programa" w={200}><input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Palco Principal · Quinta" style={inp} /></Field>
          <Field label="Link da transmissão (YouTube)" w={300}><input value={yt} onChange={e => setYt(e.target.value)} placeholder="https://youtube.com/watch?v=… ou /live/…" style={inp} /></Field>
          <button onClick={() => start(async () => { await setPrograma({ programa_titulo: titulo || null, youtube_url: yt || null, youtube_video_id: parseYoutubeId(yt) }); setSavedCfg(true); setTimeout(() => setSavedCfg(false), 1600); refresh() })}
            style={{ ...btnSolid, background: savedCfg ? C.green : C.cream, color: '#070D0A' }}><Save size={14} /> {savedCfg ? 'Salvo!' : 'Salvar'}</button>
          {yt && !parseYoutubeId(yt) && <span style={{ fontSize: 11, color: C.gold }}>⚠ não identifiquei o ID do vídeo</span>}
        </div>
      )}

      {/* BUILDER */}
      <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', gap: 14, alignItems: 'start' }}>

        {/* PALETTE */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', position: 'sticky', top: 12 }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {([['lineup', 'Line-up', Music2], ['vts', 'VTs', Film], ['blocos', 'Blocos', Sparkles]] as const).map(([k, lbl, Icon]) => (
              <button key={k} onClick={() => setTab(k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 8px', background: tab === k ? C.panelHi : 'transparent', border: 'none', borderBottom: `2px solid ${tab === k ? C.gold : 'transparent'}`, color: tab === k ? C.cream : C.mute, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FS }}>
                <Icon size={14} /> {lbl}
              </button>
            ))}
          </div>

          <div style={{ padding: 12, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            {tab === 'lineup' && (
              <>
                <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                  {DIAS_LABEL.map((d, i) => (
                    <button key={d} onClick={() => setDia(i + 1)} style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${dia === i + 1 ? C.green : C.border}`, background: dia === i + 1 ? `${C.green}22` : 'transparent', color: dia === i + 1 ? C.green : C.mute, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{d}</button>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: C.mute, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><GripVertical size={11} /> Arraste pra grade — ou clique pra adicionar</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lineupDia.length === 0 && <p style={{ fontSize: 12, color: C.mute, padding: '20px 0', textAlign: 'center' }}>Sem shows nesse dia.</p>}
                  {lineupDia.map(s => (
                    <div key={s.id} className="pp-card pp-grab" draggable
                      onDragStart={() => { dragRef.current = { kind: 'show', data: s } }}
                      onClick={() => addItem({ tipo: 'atracao', titulo: s.nome, duracao_seg: s.duracao_seg, horario: s.horario })}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 10, background: C.panelHi, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.green}` }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {s.embaixador && <Star size={11} style={{ color: C.goldB, fill: C.goldB, flexShrink: 0 }} />}
                          <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</span>
                        </div>
                        <div style={{ fontSize: 10, color: C.mute, marginTop: 1 }}>{s.horario ?? '--:--'} · {fmtDur(s.duracao_seg)}</div>
                      </div>
                      <Plus size={15} style={{ color: C.green, flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'vts' && (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: C.mute, textTransform: 'uppercase', marginBottom: 7 }}>Criar rápido</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                  {([['Abertura', 20], ['Encerramento', 60], ['Bumper', 8], ['Recap', 45]] as const).map(([n, d]) => (
                    <button key={n} onClick={() => start(async () => { await criarVT(`VT ${n}`, d, null, null); refresh() })}
                      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 999, border: `1px dashed ${C.blue}55`, background: `${C.blue}12`, color: C.lav, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={11} /> {n}
                    </button>
                  ))}
                </div>
                {patrocinadores.length > 0 && (
                  <>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: C.mute, textTransform: 'uppercase', marginBottom: 7 }}>VT de patrocinador</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                      {patrocinadores.map(p => (
                        <button key={p.id} onClick={() => start(async () => { await criarVT(`VT ${p.nome}`, 30, p.id, null); refresh() })}
                          style={{ fontSize: 11, padding: '5px 10px', borderRadius: 999, border: `1px dashed ${C.gold}55`, background: `${C.gold}12`, color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Megaphone size={10} /> {p.nome}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: C.mute, textTransform: 'uppercase', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}><GripVertical size={11} /> Biblioteca ({vts.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {vts.length === 0 && <p style={{ fontSize: 12, color: C.mute, padding: '12px 0', textAlign: 'center' }}>Crie VTs nos botões acima.</p>}
                  {vts.map(vt => {
                    const p = vt.patroc_id ? patrocinadores.find(x => x.id === vt.patroc_id) : null
                    return (
                      <div key={vt.id} className="pp-card pp-grab" draggable
                        onDragStart={() => { dragRef.current = { kind: 'vt', data: vt } }}
                        onClick={() => addItem({ tipo: 'vt', titulo: `VT · ${vt.nome}`, duracao_seg: vt.duracao_seg, vt_id: vt.id })}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: C.panelHi, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.blue}` }}>
                        <Film size={13} style={{ color: C.blue, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vt.nome}{p && <span style={{ color: C.mute }}> · {p.nome}</span>}</span>
                        <span style={{ fontSize: 10, color: C.mute }}>{fmtDur(vt.duracao_seg)}</span>
                        <button onClick={e => { e.stopPropagation(); start(async () => { await deletarVT(vt.id); refresh() }) }} style={{ background: 'none', border: 'none', color: C.fade, cursor: 'pointer', padding: 0 }}><Trash2 size={13} /></button>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 10, alignItems: 'center' }}>
                  <input value={vtNome} onChange={e => setVtNome(e.target.value)} placeholder="VT personalizada" style={{ ...inp, flex: 1, minWidth: 0 }} />
                  <input value={vtDur} onChange={e => setVtDur(e.target.value)} type="number" style={{ ...inp, width: 52 }} />
                  <button disabled={!vtNome.trim()} onClick={() => start(async () => { await criarVT(vtNome, Number(vtDur) || 30, vtPatroc || null, null); setVtNome(''); refresh() })} style={{ ...btnSolid, background: C.green, color: '#fff', padding: '8px 10px', opacity: vtNome.trim() ? 1 : 0.4 }}><Plus size={14} /></button>
                </div>
              </>
            )}

            {tab === 'blocos' && (
              <>
                <p style={{ fontSize: 10, color: C.mute, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><GripVertical size={11} /> Arraste ou clique pra adicionar</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {BLOCOS_GENERICOS.map(b => {
                    const m = tipoMeta(b.tipo)
                    return (
                      <div key={b.tipo} className="pp-card pp-grab" draggable
                        onDragStart={() => { dragRef.current = { kind: 'bloco', data: b } }}
                        onClick={() => addItem({ tipo: b.tipo, titulo: b.titulo, duracao_seg: b.dur })}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 10, background: C.panelHi, border: `1px solid ${C.border}`, borderLeft: `3px solid ${m.cor}` }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: m.cor, width: 56, textTransform: 'uppercase' }}>{m.label}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{b.titulo}</span>
                        <span style={{ fontSize: 10, color: C.mute }}>{fmtDur(b.dur)}</span>
                        <Plus size={14} style={{ color: m.cor }} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* GRADE */}
        <div
          onDragOver={e => { e.preventDefault(); if (dragRef.current && dragRef.current.kind !== 'reorder') setDropActive(true) }}
          onDragLeave={e => { if (e.currentTarget === e.target) setDropActive(false) }}
          onDrop={() => handleDrop()}
          style={{ background: dropActive ? `${C.green}0c` : C.panel, border: `1px ${dropActive ? 'dashed' : 'solid'} ${dropActive ? C.green : C.border}`, borderRadius: 16, padding: 14, minHeight: 420, transition: 'background .15s, border-color .15s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <ListChecks size={16} style={{ color: C.green }} />
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Grade de Programação</h2>
            <span style={{ fontSize: 10, color: C.mute, background: C.panelHi, borderRadius: 999, padding: '2px 8px' }}>{items.length} blocos · {fmtTotal(duracaoTotal)}</span>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input value={horaIni} onChange={e => setHoraIni(e.target.value)} type="time" style={{ ...inp, width: 92, padding: '6px 8px' }} title="Hora de início" />
              <button disabled={!horaIni} onClick={() => start(async () => { await recalcularHorarios(horaIni); refresh() })} style={{ ...btnGhost, opacity: horaIni ? 1 : 0.5, padding: '7px 10px' }} title="Recalcular horários em sequência"><Timer size={13} /> Horários</button>
            </div>
            <button onClick={() => { if (confirm('Gerar grade do line-up do Palco Principal? Substitui a atual.')) start(async () => { await gerarGradeDoLineup(); refresh() }) }} style={{ ...btnGhost, color: C.gold, borderColor: `${C.gold}40` }}>
              <Wand2 size={13} /> Gerar do line-up
            </button>
          </div>

          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '60px 20px', textAlign: 'center' }}>
              <Sparkles size={28} style={{ color: C.fade }} />
              <p style={{ fontSize: 14, color: C.dim, maxWidth: 340 }}>Arraste shows do <strong style={{ color: C.green }}>line-up</strong>, <strong style={{ color: C.blue }}>VTs</strong> e <strong style={{ color: C.gold }}>blocos</strong> da esquerda pra montar a grade.</p>
              <button onClick={() => start(async () => { await gerarGradeDoLineup(); refresh() })} style={{ ...btnSolid, background: C.gold, color: '#070D0A', marginTop: 4 }}><Wand2 size={14} /> Gerar automático do line-up</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {items.map((item, i) => {
                const m = tipoMeta(item.tipo)
                const isOver = overId === item.id
                return (
                  <div key={item.id} draggable
                    onDragStart={() => { dragRef.current = { kind: 'reorder', id: item.id } }}
                    onDragOver={e => { e.preventDefault(); if (dragRef.current?.kind === 'reorder') setOverId(item.id) }}
                    onDrop={e => { e.stopPropagation(); handleDrop(item.id) }}
                    className="pp-card"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: C.panelHi, border: `1px solid ${isOver ? C.green : C.border}`, borderLeft: `3px solid ${m.cor}` }}>
                    <GripVertical size={14} className="pp-grab" style={{ color: C.fade, flexShrink: 0 }} />
                    <span style={{ width: 18, textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.fade, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <input className="pp-edit" defaultValue={item.horario?.slice(0, 5) ?? ''} type="time"
                      onBlur={e => { const v = e.target.value || null; if (v !== (item.horario?.slice(0, 5) ?? null)) start(async () => { await atualizarItemGrade(item.id, { horario: v }) }) }}
                      style={{ width: 70, background: 'transparent', border: `1px solid transparent`, borderRadius: 6, color: C.gold, fontSize: 12, fontWeight: 700, fontFamily: FS, fontVariantNumeric: 'tabular-nums', padding: '3px 4px' }} />
                    <span style={{ width: 64, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 800, color: m.cor, background: `${m.cor}1a`, borderRadius: 5, padding: '3px 4px', textTransform: 'uppercase' }}>{m.label}</span>
                    <input className="pp-edit" defaultValue={item.titulo}
                      onBlur={e => { if (e.target.value !== item.titulo) start(async () => { await atualizarItemGrade(item.id, { titulo: e.target.value }) }) }}
                      style={{ flex: 1, minWidth: 0, background: 'transparent', border: `1px solid transparent`, borderRadius: 6, color: C.cream, fontSize: 14, fontWeight: 600, fontFamily: FD, fontStyle: 'italic', padding: '3px 6px' }} />
                    <input className="pp-edit" defaultValue={item.responsavel ?? ''} placeholder="resp."
                      onBlur={e => { if (e.target.value !== (item.responsavel ?? '')) start(async () => { await atualizarItemGrade(item.id, { responsavel: e.target.value || null }) }) }}
                      style={{ width: 84, background: 'transparent', border: `1px solid transparent`, borderRadius: 6, color: C.dim, fontSize: 11, fontFamily: FS, padding: '3px 6px' }} />
                    <input className="pp-edit" defaultValue={item.duracao_seg ? String(Math.round(item.duracao_seg / 60)) : ''} type="number" placeholder="min"
                      onBlur={e => { const seg = (Number(e.target.value) || 0) * 60; if (seg !== item.duracao_seg) start(async () => { await atualizarItemGrade(item.id, { duracao_seg: seg }) }) }}
                      style={{ width: 44, background: 'transparent', border: `1px solid transparent`, borderRadius: 6, color: C.dim, fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontFamily: FS, padding: '3px 4px' }} />
                    <button onClick={() => { setItems(prev => prev.filter(x => x.id !== item.id)); start(async () => { await deletarItemGrade(item.id); refresh() }) }} style={{ background: 'none', border: 'none', color: C.fade, cursor: 'pointer', padding: 0, flexShrink: 0 }}><Trash2 size={14} /></button>
                  </div>
                )
              })}
              <div onDragOver={e => { e.preventDefault(); if (dragRef.current?.kind === 'reorder') setOverId(null) }} onDrop={e => { e.stopPropagation(); handleDrop() }}
                style={{ height: 30, borderRadius: 8, border: `1px dashed ${C.border}`, opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.mute, marginTop: 2 }}>
                soltar aqui pro fim
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { borderRadius: 8, border: `1px solid ${C.border}`, background: C.panelHi, color: C.cream, fontSize: 13, padding: '8px 10px', fontFamily: FS, outline: 'none', width: '100%' }
const btnGhost: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '8px 12px', border: `1px solid ${C.border}`, background: C.panel, color: C.dim, fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', fontFamily: FS }
const btnSolid: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '8px 14px', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: FS }

function Stat({ label, valor, accent }: { label: string; valor: string; accent?: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: 22, lineHeight: 1, color: accent ?? C.cream, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: C.mute, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}
function Field({ label, w, children }: { label: string; w: number; children: React.ReactNode }) {
  return (
    <div style={{ flex: `1 1 ${w}px`, minWidth: Math.min(w, 160) }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mute, textTransform: 'uppercase', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}
