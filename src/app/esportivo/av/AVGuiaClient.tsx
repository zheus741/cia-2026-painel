'use client'

import * as React from 'react'
import Link from 'next/link'
import { Radio, MapPin, Printer, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import type { AVEvento, AVPraca } from './page'

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function tipoColor(tipo: AVEvento['tipo'], live: boolean): string {
  if (live) return '#ef4444'
  if (tipo === 'individual') return '#D4B36A'
  if (tipo === 'coletivo')  return '#4aa06a'
  if (tipo === 'show')      return '#B8A4E8'
  return '#6b7280'
}

function tipoBadge(tipo: AVEvento['tipo'], live: boolean) {
  if (live && tipo === 'coletivo') return { label: '● TRANSMISSÃO', color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.28)' }
  if (tipo === 'individual')       return { label: '★ INDIVIDUAL',  color: '#D4B36A', bg: 'rgba(212,179,106,0.10)', border: 'rgba(212,179,106,0.28)' }
  if (tipo === 'coletivo')         return { label: '⚡ COLETIVO',   color: '#4aa06a', bg: 'rgba(74,160,106,0.10)', border: 'rgba(74,160,106,0.25)' }
  if (tipo === 'show')             return { label: '🎤 SHOW',       color: '#B8A4E8', bg: 'rgba(184,164,232,0.10)', border: 'rgba(184,164,232,0.25)' }
  return { label: '🎉 FESTA', color: '#D8845F', bg: 'rgba(216,132,95,0.10)', border: 'rgba(216,132,95,0.25)' }
}

// base do nome da praça (UIRAP V01 → UIRAP, FUNEL Q01 → FUNEL)
const STRIP = /\s+(Q\d+|V\d+|VP\d+|B\d+|\d+|F7|CAMPO|OU|UIC)$/i
function basePraca(nome: string): string {
  return nome.replace(STRIP, '').trim()
}

// ─── props ────────────────────────────────────────────────────────────────────
interface Props {
  eventos: AVEvento[]
  setores: { id: string; nome: string; tem_youtube_live: boolean; endereco: string | null; notas_acesso: string | null }[]
  dias: { id: string; label: string; date: string; short: string }[]
}

// ─── component ────────────────────────────────────────────────────────────────
export function AVGuiaClient({ eventos, setores, dias }: Props) {
  const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const todayDia = dias.find(d => d.date === todaySP) ?? dias[0]
  const [diaId, setDiaId] = React.useState(todayDia.id)
  const [view, setView]   = React.useState<'praca' | 'hora'>('hora')
  const [expandedPracas, setExpandedPracas] = React.useState<Set<string>>(new Set())
  const [somenteLive, setSomenteLive]       = React.useState(false)

  const diaEvs = React.useMemo(
    () => eventos.filter(e => e.dia_id === diaId),
    [eventos, diaId]
  )

  const filtrados = somenteLive ? diaEvs.filter(e => e.tem_live) : diaEvs

  // Agrupamento por praça (agrupando quadras na mesma praça física)
  const pracas = React.useMemo<AVPraca[]>(() => {
    const map = new Map<string, AVPraca>()
    for (const ev of filtrados) {
      const key = ev.setor_id ?? '__sem_praça__'
      const base = basePraca(ev.setor_nome ?? 'Sem praça')
      if (!map.has(key)) {
        map.set(key, {
          setor_id: ev.setor_id,
          setor_nome: base,
          tem_live: ev.tem_live,
          eventos: [],
        })
      }
      map.get(key)!.eventos.push(ev)
      if (ev.tem_live) map.get(key)!.tem_live = true
    }
    return [...map.values()]
      .sort((a, b) => {
        if (a.tem_live !== b.tem_live) return a.tem_live ? -1 : 1
        const aFirst = a.eventos[0]?.inicio ?? ''
        const bFirst = b.eventos[0]?.inicio ?? ''
        return aFirst < bFirst ? -1 : 1
      })
  }, [filtrados])

  // Visão por hora (timeline linear)
  const porHora = React.useMemo(
    () => [...filtrados].sort((a, b) => (a.inicio < b.inicio ? -1 : 1)),
    [filtrados]
  )

  const setorInfo = React.useMemo(() => {
    const m = new Map<string, typeof setores[0]>()
    for (const s of setores) m.set(s.id, s)
    return m
  }, [setores])

  function togglePraca(id: string | null) {
    const k = id ?? '__sem_praça__'
    setExpandedPracas(prev => {
      const n = new Set(prev)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })
  }

  const totalLive = diaEvs.filter(e => e.tem_live).length
  const totalInd  = diaEvs.filter(e => e.tipo === 'individual').length

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 pb-20">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--green)]">Esportivo</p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Guia AV</h1>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Todas as praças e horários — foto &amp; vídeo
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] print:hidden"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>
        </div>
      </div>

      {/* Aviso crítico */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-3 print:border-yellow-400 print:bg-yellow-50">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--gold)]">Itens proibidos · FUNEL e CEMEA</p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Câmeras profissionais, drones, walkie-talkies, bastão de selfie e tripé são <strong>proibidos</strong> nessas praças (revista na entrada). Alinhe com a produção antes.
          </p>
        </div>
      </div>

      {/* Transmissão info */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3">
        <Radio className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">Grade de transmissão</p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            <strong>Com narração:</strong> Futsal, Basquete, Handebol e Vôlei no <strong>FUNEL</strong> · Futebol no <strong>Uberabão</strong>.{' '}
            <strong>Só imagem:</strong> +4 jogos por dia, definidos pela logística. Máx. 8 transmissões/dia.
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {/* Seleção de dia */}
        <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
          {dias.map(d => (
            <button
              key={d.id}
              onClick={() => setDiaId(d.id)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: diaId === d.id ? 'var(--green)' : 'transparent',
                color: diaId === d.id ? 'white' : 'var(--muted-foreground)',
              }}
            >
              {d.short}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
          {(['hora', 'praca'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? 'white' : 'var(--muted-foreground)',
              }}
            >
              {v === 'hora' ? '⏰ Por horário' : '📍 Por praça'}
            </button>
          ))}
        </div>

        {/* Só transmissão */}
        <button
          onClick={() => setSomenteLive(v => !v)}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{
            borderColor: somenteLive ? 'rgba(239,68,68,0.4)' : 'var(--border)',
            background: somenteLive ? 'rgba(239,68,68,0.10)' : 'transparent',
            color: somenteLive ? '#ef4444' : 'var(--muted-foreground)',
          }}
        >
          <Radio className="h-3 w-3" /> Só transmissão
        </button>
      </div>

      {/* Stats do dia */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
          <div className="text-2xl font-extrabold text-[var(--foreground)]">{diaEvs.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mt-0.5">Total eventos</div>
        </div>
        <div className="rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-3 text-center">
          <div className="text-2xl font-extrabold text-[var(--gold)]">{totalInd}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]/70 mt-0.5">Individuais</div>
        </div>
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-center">
          <div className="text-2xl font-extrabold text-red-500">{totalLive}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mt-0.5">Com transmissão</div>
        </div>
      </div>

      {/* ── VISÃO POR HORÁRIO ── */}
      {view === 'hora' && (
        <div className="space-y-1.5">
          {porHora.length === 0 && (
            <p className="text-center text-sm text-[var(--muted-foreground)] py-10">Sem eventos neste dia.</p>
          )}
          {porHora.map(ev => {
            const badge = tipoBadge(ev.tipo, ev.tem_live)
            const cor   = tipoColor(ev.tipo, ev.tem_live)
            return (
              <div
                key={ev.id}
                className="flex gap-3 items-start rounded-xl border bg-[var(--card)] px-4 py-3"
                style={{ borderColor: `${cor}22`, borderLeftWidth: 3, borderLeftColor: cor }}
              >
                {/* Hora */}
                <div className="shrink-0 w-10 text-right">
                  <span className="text-xs font-bold tabular-nums text-[var(--foreground)]">{fmtTime(ev.inicio)}</span>
                  {ev.fim && <div className="text-[9px] text-[var(--muted-foreground)] tabular-nums">{fmtTime(ev.fim)}</div>}
                </div>
                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                      style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                      {badge.label}
                    </span>
                    {ev.setor_nome && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                        <MapPin className="h-2.5 w-2.5" />
                        <strong>{basePraca(ev.setor_nome)}</strong>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-tight text-[var(--foreground)]">{ev.nome}</p>
                  {ev.equipe_a && ev.equipe_b && (
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{ev.equipe_a} × {ev.equipe_b}</p>
                  )}
                  {ev.divisao && (
                    <span className="inline-block mt-0.5 text-[9px] text-[var(--muted-foreground)] rounded px-1.5 py-0.5 bg-[var(--muted)]">{ev.divisao}</span>
                  )}
                </div>
                {ev.tem_live && (
                  <div className="shrink-0 flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5">
                    <Radio className="h-2.5 w-2.5 text-red-500" />
                    <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">Live</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── VISÃO POR PRAÇA ── */}
      {view === 'praca' && (
        <div className="space-y-3">
          {pracas.length === 0 && (
            <p className="text-center text-sm text-[var(--muted-foreground)] py-10">Sem eventos neste dia.</p>
          )}
          {pracas.map(p => {
            const k       = p.setor_id ?? '__sem_praça__'
            const open    = expandedPracas.has(k)
            const info    = p.setor_id ? setorInfo.get(p.setor_id) : null
            const evsSorted = [...p.eventos].sort((a, b) => a.inicio < b.inicio ? -1 : 1)
            const earliest  = evsSorted[0]?.inicio
            const latest    = evsSorted[evsSorted.length - 1]?.fim

            return (
              <div key={k} className="rounded-2xl border border-[var(--border)] overflow-hidden">
                {/* Cabeçalho da praça */}
                <button
                  onClick={() => togglePraca(p.setor_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--muted)]/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-extrabold tracking-tight text-[var(--foreground)]">
                        {p.setor_nome}
                      </span>
                      {p.tem_live && (
                        <span className="flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5">
                          <Radio className="h-2.5 w-2.5 text-red-500" />
                          <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">Transmissão</span>
                        </span>
                      )}
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]">
                        {p.eventos.length} evento{p.eventos.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {earliest && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 tabular-nums">
                        {fmtTime(earliest)}{latest ? ` → ${fmtTime(latest)}` : ''}{info?.endereco ? ` · ${info.endereco.split('—')[0].trim()}` : ''}
                      </p>
                    )}
                  </div>
                  {open ? <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />}
                </button>

                {/* Lista de eventos */}
                {open && (
                  <div className="border-t border-[var(--border)]">
                    {info?.notas_acesso && (
                      <div className="px-4 py-2 bg-[var(--muted)]/20 border-b border-[var(--border)]">
                        <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">{info.notas_acesso}</p>
                      </div>
                    )}
                    {evsSorted.map((ev, i) => {
                      const badge = tipoBadge(ev.tipo, ev.tem_live)
                      const cor   = tipoColor(ev.tipo, ev.tem_live)
                      return (
                        <div
                          key={ev.id}
                          className="flex gap-3 items-start px-4 py-3"
                          style={{
                            borderBottom: i < evsSorted.length - 1 ? '1px solid var(--border)' : 'none',
                            borderLeftWidth: 3, borderLeftColor: cor,
                          }}
                        >
                          <div className="shrink-0 w-10 text-right pt-0.5">
                            <span className="text-xs font-bold tabular-nums text-[var(--foreground)]">{fmtTime(ev.inicio)}</span>
                            {ev.fim && <div className="text-[9px] text-[var(--muted-foreground)] tabular-nums">{fmtTime(ev.fim)}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
                              style={{ color: badge.color, background: badge.bg }}>
                              {badge.label}
                            </span>
                            <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">{ev.nome}</p>
                            {ev.equipe_a && ev.equipe_b && (
                              <p className="text-xs text-[var(--muted-foreground)]">{ev.equipe_a} × {ev.equipe_b}</p>
                            )}
                            {ev.divisao && (
                              <span className="inline-block text-[9px] text-[var(--muted-foreground)] rounded px-1.5 py-0.5 bg-[var(--muted)] mt-0.5">{ev.divisao}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {/* Link como chegar */}
                    {info?.endereco && (
                      <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--muted)]/10">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(info.endereco)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--green)] hover:underline"
                        >
                          <MapPin className="h-3 w-3" /> Como chegar · {info.endereco.split('—')[0].trim()}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] w-full">Legenda</p>
        {[
          { label:'● TRANSMISSÃO', color:'#ef4444', bg:'rgba(239,68,68,0.10)' },
          { label:'★ INDIVIDUAL',  color:'#D4B36A', bg:'rgba(212,179,106,0.10)' },
          { label:'⚡ COLETIVO',   color:'#4aa06a', bg:'rgba(74,160,106,0.10)' },
          { label:'🎤 SHOW',       color:'#B8A4E8', bg:'rgba(184,164,232,0.10)' },
        ].map(l => (
          <span key={l.label} className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ color: l.color, background: l.bg }}>{l.label}</span>
        ))}
      </div>
    </div>
  )
}
