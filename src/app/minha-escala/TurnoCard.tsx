'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Loader2, Wifi, WifiOff, Navigation } from 'lucide-react'
import { updateStatusEscala } from '@/app/admin/escala-av/actions'
import { TurnoComments } from '@/components/TurnoComments'

const STATUS_CONFIG = {
  rascunho:   { label: 'Rascunho',   bg: 'rgba(148,163,184,0.12)', text: '#64748b', border: 'rgba(148,163,184,0.30)' },
  confirmado: { label: 'Confirmado', bg: 'rgba(46,107,66,0.10)',   text: '#2e6b42', border: 'rgba(46,107,66,0.25)'  },
  em_campo:   { label: 'Em campo',   bg: 'rgba(59,130,246,0.12)',  text: '#2563eb', border: 'rgba(59,130,246,0.30)' },
  finalizado: { label: 'Finalizado', bg: 'rgba(16,185,129,0.10)',  text: '#059669', border: 'rgba(16,185,129,0.25)' },
  faltou:     { label: 'Faltou',     bg: 'rgba(239,68,68,0.10)',   text: '#dc2626', border: 'rgba(239,68,68,0.25)'  },
}

const PRIORIDADE_CONFIG = {
  alta:  { label: 'Alta',  bg: 'rgba(239,68,68,0.10)',  text: '#dc2626' },
  media: { label: 'Média', bg: 'rgba(234,179,8,0.10)',  text: '#b45309' },
  baixa: { label: 'Baixa', bg: 'rgba(46,107,66,0.08)',  text: '#2e6b42' },
}

export interface TurnoCardData {
  id:                  string
  funcao:              string
  inicio:              string
  fim:                 string
  is_roaming:          boolean
  observacoes:         string | null
  prioridade:          string | null
  briefing_editorial:  string | null
  conteudos_esperados: string | null
  status_escala:       string | null
  comentarios_count?:  number
  dia:     { nome_dia: string; data: string } | null
  setor:   { nome: string; tem_wifi: boolean | null; maps_url: string | null; notas_acesso: string | null } | null
  parceiro: { nome: string; cor_hex: string } | null
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function durMin(inicio: string, fim: string): number {
  return Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000)
}

export function TurnoCard({ turno }: { turno: TurnoCardData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const status  = (turno.status_escala ?? 'rascunho') as keyof typeof STATUS_CONFIG
  const stCfg   = STATUS_CONFIG[status] ?? STATUS_CONFIG.rascunho
  const prio    = (turno.prioridade ?? 'media') as keyof typeof PRIORIDADE_CONFIG
  const prioCfg = PRIORIDADE_CONFIG[prio] ?? PRIORIDADE_CONFIG.media
  const dur     = durMin(turno.inicio, turno.fim)

  function changeStatus(next: 'confirmado' | 'em_campo' | 'finalizado') {
    startTransition(async () => {
      await updateStatusEscala(turno.id, next)
      router.refresh()
    })
  }

  // Próxima ação disponível baseada no status
  const nextAction =
    status === 'rascunho'   ? { label: 'Confirmar',  next: 'confirmado' as const, color: '#2e6b42' } :
    status === 'confirmado' ? { label: 'Cheguei',    next: 'em_campo'   as const, color: '#2563eb' } :
    status === 'em_campo'   ? { label: 'Finalizei',  next: 'finalizado' as const, color: '#059669' } :
    null

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4 transition-all"
      style={{
        background:  'rgba(16,29,18,0.01)',
        borderColor: 'rgba(46,107,66,0.12)',
      }}
    >
      {/* ── Cabeçalho: horário + status ── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className="tabular-nums text-xl font-bold"
            style={{ fontFamily: 'Orbitron, monospace', color: '#101d12' }}
          >
            {fmtTime(turno.inicio)}
          </span>
          <span className="mx-1.5 text-sm text-[var(--muted-foreground)]">–</span>
          <span
            className="tabular-nums text-xl font-bold"
            style={{ fontFamily: 'Orbitron, monospace', color: '#101d12' }}
          >
            {fmtTime(turno.fim)}
          </span>
          <span className="ml-2 text-xs text-[var(--muted-foreground)]">
            ({dur < 60
              ? `${dur}min`
              : `${Math.floor(dur / 60)}h${dur % 60 > 0 ? `${dur % 60}m` : ''}`})
          </span>
        </div>

        {/* Status badge */}
        <span
          className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold"
          style={{
            background: stCfg.bg,
            color:      stCfg.text,
            border:     `1px solid ${stCfg.border}`,
          }}
        >
          {stCfg.label}
        </span>
      </div>

      {/* ── Função + Prioridade + Empresa ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{
            background: turno.funcao === 'foto' ? 'rgba(124,58,237,0.10)' : 'rgba(26,92,92,0.10)',
            color:      turno.funcao === 'foto' ? '#7c3aed' : '#1a5c5c',
          }}
        >
          {turno.funcao === 'foto' ? '📸 FOTO' : '🎬 VÍDEO'}
        </span>

        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: prioCfg.bg, color: prioCfg.text }}
        >
          {prioCfg.label}
        </span>

        {turno.parceiro && (
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: `${turno.parceiro.cor_hex}15`,
              color:       turno.parceiro.cor_hex,
              border:      `1px solid ${turno.parceiro.cor_hex}30`,
            }}
          >
            {turno.parceiro.nome}
          </span>
        )}
      </div>

      {/* ── Setor + venue info ── */}
      {turno.setor && (
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {turno.setor.nome}
              </span>
              {turno.setor.tem_wifi ? (
                <Wifi className="h-3 w-3 text-[var(--green-bright)]" />
              ) : (
                <WifiOff className="h-3 w-3 text-[var(--muted-foreground)] opacity-30" />
              )}
            </div>
            {turno.setor.notas_acesso && (
              <p className="mt-0.5 text-[10px] text-amber-600">
                ⚠️ {turno.setor.notas_acesso}
              </p>
            )}
          </div>
          {turno.setor.maps_url && (
            <a
              href={turno.setor.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition-all hover:shadow-sm"
              style={{
                borderColor: 'rgba(46,107,66,0.25)',
                color:       '#2e6b42',
                background:  'rgba(46,107,66,0.06)',
              }}
            >
              <Navigation className="h-3 w-3" />
              Maps
            </a>
          )}
        </div>
      )}

      {/* ── Briefing editorial ── */}
      {turno.briefing_editorial && (
        <div
          className="rounded-xl border-l-2 pl-3 py-2 text-[11px] italic text-[var(--muted-foreground)] leading-relaxed"
          style={{ borderColor: '#2e6b42', background: 'rgba(46,107,66,0.04)' }}
        >
          {turno.briefing_editorial}
        </div>
      )}

      {/* ── Conteúdos esperados ── */}
      {turno.conteudos_esperados && (
        <div className="text-[11px] text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">Entregas: </span>
          {turno.conteudos_esperados}
        </div>
      )}

      {/* ── Botão de próxima ação ── */}
      {nextAction && status !== 'finalizado' && status !== 'faltou' && (
        <button
          onClick={() => changeStatus(nextAction.next)}
          disabled={pending}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-[0.98]"
          style={{
            background: nextAction.color,
            color:      '#fff',
            opacity:    pending ? 0.7 : 1,
          }}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            nextAction.label
          )}
        </button>
      )}

      {status === 'finalizado' && (
        <div className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-[#059669]"
          style={{ background: 'rgba(16,185,129,0.08)' }}>
          ✓ Turno finalizado
        </div>
      )}

      {/* ── Comentários ── */}
      <TurnoComments
        turnoId={turno.id}
        initialCount={turno.comentarios_count ?? 0}
      />
    </div>
  )
}
