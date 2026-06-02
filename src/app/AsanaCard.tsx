'use client'

import { ExternalLink, AlertTriangle, CalendarCheck, Flame, CheckCircle2 } from 'lucide-react'
import type { AsanaCIAData } from '@/lib/asana/cia-tasks'

interface Props {
  data: AsanaCIAData
}

export function AsanaCard({ data }: Props) {
  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(10,15,11,0.08)',
      borderRadius: 16,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Asana logo mark */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: '#F06A6A',
            flexShrink: 0,
          }}>
            {/* Asana "three dots" mark */}
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <circle cx="8"  cy="5" r="4" fill="white" />
              <circle cx="2"  cy="8" r="2" fill="white" />
              <circle cx="14" cy="8" r="2" fill="white" />
            </svg>
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0F0B', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Asana · CIA 2026
            </div>
            <div style={{ fontSize: 11, color: 'rgba(10,15,11,0.45)', fontWeight: 500, marginTop: 1 }}>
              Copa Inter Atléticas
            </div>
          </div>
        </div>
        <a
          href="https://app.asana.com/1/1155809898842124/project/1166266970873585"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 11px',
            borderRadius: 999,
            border: '1px solid rgba(10,15,11,0.12)',
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(10,15,11,0.6)',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
            flexShrink: 0,
          }}
        >
          Abrir
          <ExternalLink style={{ width: 10, height: 10 }} />
        </a>
      </div>

      {/* Barra de progresso */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(10,15,11,0.55)', letterSpacing: '-0.01em' }}>
            Progresso geral
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#2e6b42' }}>
            {pct}% · {data.completed.toLocaleString('pt-BR')}/{data.total.toLocaleString('pt-BR')}
          </span>
        </div>
        <div style={{
          height: 8,
          borderRadius: 99,
          background: 'rgba(10,15,11,0.07)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 99,
            background: pct >= 90 ? '#2e6b42' : pct >= 70 ? '#c8973a' : '#e05151',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(10,15,11,0.40)', fontWeight: 500 }}>
          {data.incomplete} em aberto
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(10,15,11,0.06)' }} />

      {/* Pills de status */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Vencidas */}
        <StatusPill
          icon={<AlertTriangle style={{ width: 11, height: 11 }} />}
          label="Vencidas"
          count={data.overdue.length}
          color={data.overdue.length > 0 ? '#e05151' : '#2e6b42'}
          bg={data.overdue.length > 0 ? 'rgba(224,81,81,0.08)' : 'rgba(46,107,66,0.08)'}
        />
        {/* Hoje */}
        <StatusPill
          icon={<Flame style={{ width: 11, height: 11 }} />}
          label="Para hoje"
          count={data.today.length}
          color={data.today.length > 0 ? '#c8973a' : 'rgba(10,15,11,0.4)'}
          bg={data.today.length > 0 ? 'rgba(200,151,58,0.10)' : 'rgba(10,15,11,0.05)'}
        />
        {/* Evento total */}
        <StatusPill
          icon={<CalendarCheck style={{ width: 11, height: 11 }} />}
          label="No evento"
          count={data.eventDays.reduce((s, d) => s + d.count, 0)}
          color="rgba(10,15,11,0.55)"
          bg="rgba(10,15,11,0.05)"
        />
      </div>

      {/* Tarefas hoje — primeiras 5 */}
      {data.today.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,15,11,0.40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            Hoje · {data.today.length} tarefas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.today.slice(0, 5).map(t => (
              <div key={t.gid} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 8px',
                borderRadius: 7,
                background: 'rgba(200,151,58,0.06)',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#c8973a', flexShrink: 0,
                }} />
                <span style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#0A0F0B',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {t.name}
                </span>
                {t.assignee && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'rgba(10,15,11,0.45)',
                    flexShrink: 0,
                    maxWidth: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {t.assignee.name}
                  </span>
                )}
              </div>
            ))}
            {data.today.length > 5 && (
              <div style={{ fontSize: 11, color: 'rgba(10,15,11,0.40)', fontWeight: 500, paddingLeft: 8, paddingTop: 2 }}>
                + {data.today.length - 5} mais
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dias do evento */}
      {data.eventDays.some(d => d.count > 0) && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,15,11,0.40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            Dias do evento
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {data.eventDays.map(d => (
              <div key={d.date} style={{
                padding: '8px 10px',
                borderRadius: 9,
                background: d.count > 0 ? 'rgba(46,107,66,0.07)' : 'rgba(10,15,11,0.03)',
                border: d.count > 0 ? '1px solid rgba(46,107,66,0.15)' : '1px solid transparent',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,15,11,0.45)', letterSpacing: '-0.01em' }}>
                  {d.label}
                </div>
                <div style={{
                  marginTop: 2,
                  fontSize: 18,
                  fontWeight: 800,
                  color: d.count > 0 ? '#2e6b42' : 'rgba(10,15,11,0.20)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}>
                  {d.count}
                </div>
                <div style={{ fontSize: 9, fontWeight: 500, color: 'rgba(10,15,11,0.35)', marginTop: 1 }}>
                  {d.count === 1 ? 'tarefa' : 'tarefas'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vencidas — top 3 */}
      {data.overdue.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,15,11,0.40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            ⚠ Vencidas recentes ({data.overdue.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {data.overdue.slice(0, 3).map(t => (
              <div key={t.gid} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(224,81,81,0.05)',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e05151', flexShrink: 0 }} />
                <span style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#0A0F0B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {t.name}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#e05151', flexShrink: 0 }}>
                  {t.due_on}
                </span>
              </div>
            ))}
            {data.overdue.length > 3 && (
              <div style={{ fontSize: 11, color: '#e05151', fontWeight: 500, paddingLeft: 8 }}>
                + {data.overdue.length - 3} vencidas
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tudo ok */}
      {data.overdue.length === 0 && data.today.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2e6b42' }}>
          <CheckCircle2 style={{ width: 14, height: 14 }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Sem pendências urgentes</span>
        </div>
      )}
    </div>
  )
}

// ── StatusPill ─────────────────────────────────────────────────────────────

function StatusPill({
  icon,
  label,
  count,
  color,
  bg,
}: {
  icon:  React.ReactNode
  label: string
  count: number
  color: string
  bg:    string
}) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      borderRadius: 999,
      background: bg,
      color,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      flexShrink: 0,
    }}>
      {icon}
      <span style={{ fontWeight: 800 }}>{count}</span>
      <span style={{ fontWeight: 500, opacity: 0.75 }}>{label}</span>
    </div>
  )
}
