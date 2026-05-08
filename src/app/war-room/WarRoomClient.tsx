'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertTriangle, CheckCircle2, Clock, Users,
  MapPin, Camera, Video, RefreshCw, Wifi,
} from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Dia { id: string; label: string; full: string; data: string }

export interface TurnoRow {
  id: string
  funcao: string
  inicio: string
  fim: string
  status_escala: string | null
  user_id: string
  user: { id: string; nome: string | null; funcao_principal: string | null } | null
  setor: { id: string; nome: string } | null
}

interface ConteudoStatus { id: string; status: string }

export interface CapturaRow {
  id: string
  titulo: string
  tipo: string
  midia_draft_url: string | null
  midia_draft_tipo: string | null
  criado_em: string
  user: { nome: string | null } | null
}

interface Props {
  dias:             Dia[]
  defaultDiaId:     string
  initialTurnos:    TurnoRow[]
  initialConteudos: ConteudoStatus[]
  initialCapturas:  CapturaRow[]
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  em_campo:   { label: 'Em campo',   color: '#22c55e', pulse: true  },
  confirmado: { label: 'Confirmado', color: '#f59e0b', pulse: false },
  finalizado: { label: 'Finalizado', color: '#6ab87e', pulse: false },
  faltou:     { label: 'Faltou',     color: '#ef4444', pulse: false },
  rascunho:   { label: 'Aguardando', color: '#64748b', pulse: false },
}

const FUNCAO_ICON: Record<string, string> = {
  foto: '📸', video: '🎬', drone: '🚁',
  social: '📱', editor: '✂️', reporter: '🎙️',
  design: '🎨', coordenacao: '🎯', producao: '⚙️', roaming: '🔄',
}

function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s atrás`
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`
  return `${Math.floor(s / 3600)}h atrás`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WarRoomClient({
  dias, defaultDiaId,
  initialTurnos, initialConteudos, initialCapturas,
}: Props) {
  const [diaId,     setDiaId]     = useState(defaultDiaId)
  const [turnos,    setTurnos]    = useState<TurnoRow[]>(initialTurnos)
  const [conteudos, setConteudos] = useState<ConteudoStatus[]>(initialConteudos)
  const [capturas,  setCapturas]  = useState<CapturaRow[]>(initialCapturas)
  const [updatedAt, setUpdatedAt] = useState(new Date())
  const [loading,   setLoading]   = useState(false)
  const supabase = createClient()
  const diaIdRef = useRef(diaId)
  diaIdRef.current = diaId

  // ── Fetch completo para o dia ─────────────────────────────────────────────
  const refetch = useCallback(async (id: string) => {
    setLoading(true)
    const [turnosRes, contRes, capRes] = await Promise.all([
      supabase
        .from('turnos')
        .select(`id, funcao, inicio, fim, status_escala, user_id,
          user:profiles!user_id(id, nome, funcao_principal),
          setor:setores(id, nome)`)
        .eq('dia_id', id)
        .order('inicio'),
      supabase
        .from('conteudos')
        .select('id, status')
        .eq('dia_id', id),
      supabase
        .from('conteudos')
        .select('id, titulo, tipo, midia_draft_url, midia_draft_tipo, criado_em, user:profiles!criado_por(nome)')
        .eq('dia_id', id)
        .eq('status', 'rascunho')
        .not('midia_draft_url', 'is', null)
        .order('criado_em', { ascending: false })
        .limit(20),
    ])
    const norm = (rows: Record<string, unknown>[]): TurnoRow[] =>
      rows.map((r) => ({
        ...r,
        user:  Array.isArray(r.user)  ? (r.user[0]  ?? null) : r.user  ?? null,
        setor: Array.isArray(r.setor) ? (r.setor[0] ?? null) : r.setor ?? null,
      })) as unknown as TurnoRow[]

    const normCap = (rows: Record<string, unknown>[]): CapturaRow[] =>
      rows.map((r) => ({
        ...r,
        user: Array.isArray(r.user) ? (r.user[0] ?? null) : r.user ?? null,
      })) as unknown as CapturaRow[]

    setTurnos(norm((turnosRes.data ?? []) as Record<string, unknown>[]))
    setConteudos(contRes.data ?? [])
    setCapturas(normCap((capRes.data ?? []) as Record<string, unknown>[]))
    setUpdatedAt(new Date())
    setLoading(false)
  }, [])

  // Troca de dia
  useEffect(() => {
    refetch(diaId)
  }, [diaId, refetch])

  // ── Realtime: turnos ──────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('war-room-turnos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' }, () => {
        refetch(diaIdRef.current)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  // ── Realtime: conteudos ───────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('war-room-conteudos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conteudos' }, () => {
        refetch(diaIdRef.current)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  // ── Derivados ─────────────────────────────────────────────────────────────

  // Agrupa turnos por pessoa (pode ter múltiplos turnos no mesmo dia)
  const pessoasMap = new Map<string, { user: TurnoRow['user']; turnos: TurnoRow[] }>()
  for (const t of turnos) {
    if (!t.user_id) continue
    if (!pessoasMap.has(t.user_id)) pessoasMap.set(t.user_id, { user: t.user, turnos: [] })
    pessoasMap.get(t.user_id)!.turnos.push(t)
  }
  const pessoas = Array.from(pessoasMap.values())

  // Status mais relevante por pessoa (em_campo > confirmado > finalizado > faltou > rascunho)
  const STATUS_PRIORITY = ['em_campo', 'confirmado', 'finalizado', 'faltou', 'rascunho']
  function bestStatus(ts: TurnoRow[]): string {
    for (const s of STATUS_PRIORITY) {
      if (ts.some((t) => t.status_escala === s)) return s
    }
    return 'rascunho'
  }

  const emCampo  = pessoas.filter((p) => bestStatus(p.turnos) === 'em_campo')
  const aguardando = pessoas.filter((p) => ['confirmado', 'rascunho'].includes(bestStatus(p.turnos)))
  const faltou   = pessoas.filter((p) => bestStatus(p.turnos) === 'faltou')
  const finalizado = pessoas.filter((p) => bestStatus(p.turnos) === 'finalizado')

  // Setores — quentes (>=1 em_campo) vs frios (nenhum em_campo)
  const setoresMap = new Map<string, { nome: string; total: number; emCampo: number; pessoas: string[] }>()
  for (const t of turnos) {
    if (!t.setor) continue
    if (!setoresMap.has(t.setor.id)) {
      setoresMap.set(t.setor.id, { nome: t.setor.nome, total: 0, emCampo: 0, pessoas: [] })
    }
    const s = setoresMap.get(t.setor.id)!
    s.total++
    if (t.status_escala === 'em_campo') {
      s.emCampo++
      const nome = t.user?.nome?.split(' ')[0] ?? '?'
      if (!s.pessoas.includes(nome)) s.pessoas.push(nome)
    }
  }
  const setores = Array.from(setoresMap.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  const setoresFrios    = setores.filter((s) => s.emCampo === 0)
  const setoresQuentes  = setores.filter((s) => s.emCampo > 0)

  // Kanban counts
  const kanbanCounts = conteudos.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {})

  const diaSel = dias.find((d) => d.id === diaId)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col" style={{ background: '#080f09' }}>

      {/* ── Top bar ── */}
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
        style={{ borderColor: 'rgba(46,107,66,0.20)', background: 'rgba(0,0,0,0.30)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-green-400">
            War Room
          </span>
          <span className="text-xs text-white/30">·</span>
          <span className="text-xs text-white/50">{diaSel?.full}</span>
        </div>

        {/* Dia tabs */}
        <div className="flex items-center gap-1">
          {dias.map((d) => (
            <button
              key={d.id}
              onClick={() => setDiaId(d.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
              style={
                d.id === diaId
                  ? { background: '#2e6b42', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }
              }
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-white/30">
            <Wifi className="h-3 w-3" />
            <span>
              {updatedAt.toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                timeZone: 'America/Sao_Paulo',
              })}
            </span>
          </div>
          <button
            onClick={() => refetch(diaId)}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-white/40 transition-colors hover:text-white/70"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Alerta setores frios ── */}
      {setoresFrios.length > 0 && (
        <div
          className="flex shrink-0 items-center gap-2 px-5 py-2"
          style={{ background: 'rgba(239,68,68,0.10)', borderBottom: '1px solid rgba(239,68,68,0.20)' }}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <span className="text-xs font-semibold text-red-400">
            {setoresFrios.length} setor{setoresFrios.length > 1 ? 'es' : ''} sem cobertura:
          </span>
          <span className="text-xs text-red-300/70">
            {setoresFrios.map((s) => s.nome).join(' · ')}
          </span>
        </div>
      )}

      {/* ── Grid principal ── */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">

        {/* ── Col esquerda: Equipe ── */}
        <div
          className="flex w-full flex-col border-r md:w-[340px] lg:w-[400px]"
          style={{ borderColor: 'rgba(46,107,66,0.15)' }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(46,107,66,0.12)' }}
          >
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">Equipe</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-green-400 font-bold">{emCampo.length}</span>
              <span className="text-white/25">em campo</span>
              <span className="text-white/25">·</span>
              <span className="text-amber-400 font-bold">{aguardando.length}</span>
              <span className="text-white/25">aguard.</span>
              {faltou.length > 0 && (
                <>
                  <span className="text-white/25">·</span>
                  <span className="text-red-400 font-bold">{faltou.length}</span>
                  <span className="text-white/25">faltou</span>
                </>
              )}
            </div>
          </div>

          {/* Lista de pessoas */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {pessoas.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-xs text-white/25">Nenhum turno cadastrado para este dia</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {[
                  { list: emCampo,   title: 'Em campo',   color: '#22c55e' },
                  { list: aguardando, title: 'Aguardando', color: '#f59e0b' },
                  { list: faltou,    title: 'Faltou',     color: '#ef4444' },
                  { list: finalizado, title: 'Finalizado', color: '#6ab87e' },
                ].map(({ list, title, color }) =>
                  list.length > 0 ? (
                    <div key={title}>
                      <div
                        className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest"
                        style={{ color, background: `${color}08` }}
                      >
                        {title} ({list.length})
                      </div>
                      {list.map(({ user, turnos: ts }) => {
                        const status = bestStatus(ts)
                        const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.rascunho
                        const setoresUnicos = [...new Set(ts.map((t) => t.setor?.nome).filter(Boolean))]
                        const funcoesUnicas = [...new Set(ts.map((t) => t.funcao))]
                        return (
                          <div
                            key={user?.id ?? Math.random()}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
                          >
                            {/* Status dot */}
                            <div className="relative shrink-0">
                              <div
                                className={`h-2 w-2 rounded-full ${cfg.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: cfg.color }}
                              />
                            </div>

                            {/* Avatar */}
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{ background: `${cfg.color}25`, border: `1px solid ${cfg.color}40` }}
                            >
                              {(user?.nome ?? '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('')}
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs font-semibold text-white/85">
                                  {user?.nome ?? '—'}
                                </span>
                                <span className="text-[10px] text-white/30">
                                  {funcoesUnicas.map((f) => FUNCAO_ICON[f] ?? f).join(' ')}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/35">
                                {setoresUnicos.length > 0 && (
                                  <>
                                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">{setoresUnicos.join(', ')}</span>
                                  </>
                                )}
                                <span className="text-white/20">·</span>
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                <span>{fmt(ts[0]!.inicio)}–{fmt(ts[ts.length - 1]!.fim)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Col direita ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* ── Row superior: Setores + Kanban ── */}
          <div
            className="flex min-h-0 flex-1 flex-col gap-0 md:flex-row"
            style={{ borderBottom: '1px solid rgba(46,107,66,0.12)' }}
          >

            {/* Setores */}
            <div
              className="flex min-h-0 flex-col border-b md:w-1/2 md:border-b-0 md:border-r"
              style={{ borderColor: 'rgba(46,107,66,0.12)' }}
            >
              <div
                className="flex shrink-0 items-center gap-2 px-4 py-3"
                style={{ borderBottom: '1px solid rgba(46,107,66,0.10)' }}
              >
                <MapPin className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Setores</span>
                <span className="ml-auto text-[10px]">
                  <span className="text-green-400 font-bold">{setoresQuentes.length}</span>
                  <span className="text-white/25"> quentes · </span>
                  <span className="text-red-400 font-bold">{setoresFrios.length}</span>
                  <span className="text-white/25"> frios</span>
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {setores.length === 0 ? (
                  <div className="flex h-20 items-center justify-center">
                    <p className="text-xs text-white/25">Nenhum setor com turno</p>
                  </div>
                ) : (
                  <div className="divide-y p-2" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {setores.map((s) => {
                      const quente = s.emCampo > 0
                      return (
                        <div key={s.nome} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                          {/* Indicator */}
                          <div
                            className={`h-2 w-2 shrink-0 rounded-full ${quente ? 'animate-pulse' : ''}`}
                            style={{ background: quente ? '#22c55e' : '#ef4444' }}
                          />

                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold" style={{ color: quente ? '#e2f5e8' : '#fca5a5' }}>
                              {s.nome}
                            </span>
                            {quente && s.pessoas.length > 0 && (
                              <p className="mt-0.5 truncate text-[10px] text-white/35">
                                {s.pessoas.join(', ')}
                              </p>
                            )}
                          </div>

                          {/* Badge */}
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
                            style={
                              quente
                                ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80' }
                                : { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                            }
                          >
                            {quente ? `${s.emCampo}/${s.total}` : 'FRIO'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Kanban snapshot */}
            <div className="flex min-h-0 flex-col md:w-1/2">
              <div
                className="flex shrink-0 items-center gap-2 px-4 py-3"
                style={{ borderBottom: '1px solid rgba(46,107,66,0.10)' }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Kanban</span>
                <span className="ml-auto text-[10px] text-white/30">{conteudos.length} total</span>
              </div>

              <div className="flex flex-1 flex-col justify-center gap-3 p-5">
                {[
                  { key: 'rascunho',     label: 'Rascunho',     color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
                  { key: 'em_producao',  label: 'Em produção',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
                  { key: 'publicado',    label: 'Publicado',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
                  { key: 'arquivado',    label: 'Arquivado',    color: '#475569', bg: 'rgba(71,85,105,0.10)'   },
                ].map(({ key, label, color, bg }) => {
                  const n = kanbanCounts[key] ?? 0
                  const pct = conteudos.length > 0 ? Math.round((n / conteudos.length) * 100) : 0
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <span className="w-24 shrink-0 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>
                        {label}
                      </span>
                      <div className="relative flex-1">
                        <div className="h-5 w-full overflow-hidden rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="flex h-full items-center justify-end pr-2 transition-all duration-700"
                            style={{ width: `${Math.max(pct, n > 0 ? 8 : 0)}%`, background: bg }}
                          />
                        </div>
                      </div>
                      <span
                        className="w-8 shrink-0 text-right text-lg font-bold tabular-nums leading-none"
                        style={{ color, fontFamily: 'Orbitron, monospace' }}
                      >
                        {n}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Row inferior: Capturas pendentes ── */}
          <div className="flex min-h-0 flex-col" style={{ maxHeight: '220px' }}>
            <div
              className="flex shrink-0 items-center gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid rgba(46,107,66,0.10)' }}
            >
              <Camera className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                Capturas pendentes
              </span>
              {capturas.length > 0 && (
                <span
                  className="ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
                  style={{ background: 'rgba(245,158,11,0.20)', color: '#fbbf24' }}
                >
                  {capturas.length}
                </span>
              )}
              <span className="ml-auto text-[10px] text-white/25">aguardando editor</span>
            </div>

            <div className="min-h-0 overflow-x-auto overflow-y-hidden">
              {capturas.length === 0 ? (
                <div className="flex h-20 items-center justify-center">
                  <p className="text-xs text-white/20">Nenhuma captura aguardando edição</p>
                </div>
              ) : (
                <div className="flex gap-3 p-3">
                  {capturas.map((c) => (
                    <div
                      key={c.id}
                      className="flex w-36 shrink-0 flex-col gap-2 rounded-xl p-3 transition-colors"
                      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}
                    >
                      {/* Thumb / icon */}
                      <div
                        className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg"
                        style={{ background: 'rgba(0,0,0,0.30)' }}
                      >
                        {c.midia_draft_tipo === 'foto' && c.midia_draft_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.midia_draft_url}
                            alt={c.titulo}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <Video className="h-6 w-6 text-amber-400/60" />
                        )}
                      </div>
                      <div>
                        <p className="truncate text-[10px] font-semibold text-white/75">{c.titulo}</p>
                        <p className="text-[9px] text-white/30">
                          {c.user?.nome?.split(' ')[0] ?? '?'} · {timeAgo(c.criado_em)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
