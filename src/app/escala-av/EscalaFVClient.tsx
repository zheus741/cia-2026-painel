'use client'

import * as React from 'react'
import { Aperture, Clock, Users, AlertCircle } from 'lucide-react'
import { assignOperadorFV } from './actions'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Dia    { id: string; nome_dia: string; data: string }
interface Setor  { id: string; nome: string; tipo: string }
interface Turno  {
  id:                  string
  dia_id:              string
  setor_id:            string | null
  funcao:              'foto' | 'video'
  inicio:              string
  fim:                 string
  user_id:             string | null
  prioridade:          string | null
  briefing_editorial:  string | null
  conteudos_esperados: string | null
}
interface Perfil { id: string; nome: string; funcao_principal: string | null }

interface Props {
  dias:      Dia[]
  setores:   Setor[]
  turnos:    Turno[]
  profiles:  Perfil[]
  isCoord:   boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatData(iso: string): string {
  return new Date(iso + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day:     '2-digit',
    month:   '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

const PRIORIDADE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  alta:  { bg: 'rgba(220,38,38,0.10)',  color: '#dc2626', label: 'Alta' },
  media: { bg: 'rgba(234,179,8,0.12)',  color: '#b45309', label: 'Média' },
  baixa: { bg: 'rgba(46,107,66,0.10)', color: '#2e6b42', label: 'Baixa' },
}

const FUNCAO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  foto:  { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Foto' },
  video: { bg: 'rgba(124,58,237,0.10)', color: '#7c3aed', label: 'Vídeo' },
}

// ── TurnoCard ──────────────────────────────────────────────────────────────────

function TurnoCard({
  turno,
  setorNome,
  profiles,
}: {
  turno:     Turno
  setorNome: string | null
  profiles:  Perfil[]
}) {
  const [isPending, startTransition] = React.useTransition()

  const funcaoStyle    = FUNCAO_STYLE[turno.funcao]    ?? FUNCAO_STYLE.foto
  const prioridadeData = turno.prioridade ? (PRIORIDADE_STYLE[turno.prioridade] ?? null) : null

  // Only profiles with matching funcao_principal
  const candidatos = profiles.filter(p => p.funcao_principal === turno.funcao)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value === '' ? null : e.target.value
    startTransition(async () => {
      await assignOperadorFV(turno.id, value)
    })
  }

  return (
    <div
      className="rounded-xl border p-4 transition-opacity"
      style={{
        background:   'var(--card)',
        borderColor:  'var(--border)',
        opacity:      isPending ? 0.55 : 1,
      }}
    >
      {/* Top row: badges + horário */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Funcao badge */}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: funcaoStyle.bg, color: funcaoStyle.color }}
        >
          <Aperture style={{ width: 10, height: 10 }} aria-hidden />
          {funcaoStyle.label}
        </span>

        {/* Prioridade badge */}
        {prioridadeData && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: prioridadeData.bg, color: prioridadeData.color }}
          >
            {prioridadeData.label}
          </span>
        )}

        {/* Horário */}
        <span
          className="ml-auto inline-flex items-center gap-1 text-xs"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Clock style={{ width: 11, height: 11 }} aria-hidden />
          {formatHora(turno.inicio)} → {formatHora(turno.fim)}
        </span>
      </div>

      {/* Setor */}
      {setorNome && (
        <p
          className="mb-2 text-xs font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          {setorNome}
        </p>
      )}

      {/* Briefing */}
      {turno.briefing_editorial && (
        <p
          className="mb-3 text-[11px] leading-relaxed"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {turno.briefing_editorial}
        </p>
      )}

      {/* Operador select */}
      <div className="flex items-center gap-2">
        <Users style={{ width: 13, height: 13, flexShrink: 0, color: 'var(--muted-foreground)' }} aria-hidden />
        <select
          defaultValue={turno.user_id ?? ''}
          onChange={handleChange}
          disabled={isPending}
          aria-label="Selecionar operador"
          className="flex-1 rounded-lg border bg-transparent px-2 py-1.5 text-xs transition-colors focus:outline-none focus:ring-1"
          style={{
            borderColor:  'var(--border)',
            color:        'var(--foreground)',
            background:   'var(--background)',
            cursor:       isPending ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">Não atribuído</option>
          {candidatos.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>

        {/* Spinner enquanto pending */}
        {isPending && (
          <svg
            aria-label="Salvando…"
            className="animate-spin"
            style={{ width: 14, height: 14, color: '#7c3aed', flexShrink: 0 }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
      </div>
    </div>
  )
}

// ── EscalaFVClient ─────────────────────────────────────────────────────────────

export function EscalaFVClient({ dias, setores, turnos, profiles, isCoord: _isCoord }: Props) {
  const [diaAtivo, setDiaAtivo] = React.useState<string>(dias[0]?.id ?? '')

  const setorMap = React.useMemo(
    () => new Map(setores.map(s => [s.id, s.nome])),
    [setores],
  )

  const turnosDoDia = React.useMemo(
    () => turnos.filter(t => t.dia_id === diaAtivo),
    [turnos, diaAtivo],
  )

  // Agrupa turnos por setor (null = sem setor)
  const grupos = React.useMemo(() => {
    const map = new Map<string | null, Turno[]>()
    for (const t of turnosDoDia) {
      const key = t.setor_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    // Sort: setores com nome primeiro, null por último
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === null) return 1
      if (b === null) return -1
      return (setorMap.get(a) ?? '').localeCompare(setorMap.get(b) ?? '', 'pt-BR')
    })
  }, [turnosDoDia, setorMap])

  return (
    <div style={{ color: 'var(--foreground)' }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div
        className="mb-6 border-b pb-5"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}
          >
            <Aperture style={{ width: 18, height: 18, color: '#7c3aed' }} aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
              Escala Foto &amp; Vídeo
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Designação de operadores
            </p>
          </div>
        </div>
      </div>

      {/* ── Day tabs ─────────────────────────────────────────── */}
      {dias.length > 0 ? (
        <>
          <div
            className="mb-6 flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Dias do evento"
          >
            {dias.map(dia => {
              const active = dia.id === diaAtivo
              return (
                <button
                  key={dia.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDiaAtivo(dia.id)}
                  className="shrink-0 rounded-lg border px-4 py-2 text-xs font-semibold transition-all"
                  style={{
                    background:   active ? 'rgba(124,58,237,0.12)' : 'var(--card)',
                    borderColor:  active ? 'rgba(124,58,237,0.35)' : 'var(--border)',
                    color:        active ? '#7c3aed'               : 'var(--muted-foreground)',
                  }}
                >
                  <span className="capitalize">{dia.nome_dia ?? formatData(dia.data)}</span>
                </button>
              )
            })}
          </div>

          {/* ── Turnos do dia ─────────────────────────────────── */}
          {turnosDoDia.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 rounded-2xl border py-12 text-center"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <AlertCircle style={{ width: 32, height: 32, color: 'var(--muted-foreground)', opacity: 0.4 }} aria-hidden />
              <p style={{ color: 'var(--muted-foreground)' }} className="text-sm">
                Nenhum turno foto/vídeo cadastrado para este dia.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {grupos.map(([setorId, turnosGrupo]) => (
                <section key={setorId ?? '__sem_setor'}>
                  <h2
                    className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {setorId ? (setorMap.get(setorId) ?? 'Setor desconhecido') : 'Sem setor'}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {turnosGrupo.map(turno => (
                      <TurnoCard
                        key={turno.id}
                        turno={turno}
                        setorNome={turno.setor_id ? (setorMap.get(turno.setor_id) ?? null) : null}
                        profiles={profiles}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          className="flex flex-col items-center gap-2 rounded-2xl border py-12 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <AlertCircle style={{ width: 32, height: 32, color: 'var(--muted-foreground)', opacity: 0.4 }} aria-hidden />
          <p style={{ color: 'var(--muted-foreground)' }} className="text-sm">
            Nenhum dia de evento encontrado.
          </p>
        </div>
      )}
    </div>
  )
}
