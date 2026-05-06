import { createClient } from '@/lib/supabase/server'
import { Music, Swords, PartyPopper } from 'lucide-react'

const DIAS = [
  { id: '00000000-0000-0001-0000-000000000001', label: 'Quinta 04/jun' },
  { id: '00000000-0000-0001-0000-000000000002', label: 'Sexta 05/jun' },
  { id: '00000000-0000-0001-0000-000000000003', label: 'Sábado 06/jun' },
  { id: '00000000-0000-0001-0000-000000000004', label: 'Domingo 07/jun' },
]

function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

interface Evento {
  id: string
  nome: string
  tipo: 'show' | 'jogo' | 'festa'
  inicio: string
  fim: string | null
  local: string
  detalhe: string | null
  badge?: string
}

export default async function CronogramaPage() {
  const supabase = await createClient()

  const [showsRes, jogosRes, festasRes] = await Promise.all([
    supabase.from('shows').select(`
      id, nome, tipo, inicio, fim_previsto, embaixador,
      dia_id, setor:setores(nome)
    `).order('inicio'),
    supabase.from('jogos').select(`
      id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto,
      categoria, divisao, fase,
      dia_id,
      modalidade:modalidades(nome, icone),
      setor:setores(nome)
    `).order('inicio'),
    supabase.from('festas').select(`
      id, nome, tema, inicio, fim_previsto, dia_id, setor:setores(nome)
    `).order('inicio'),
  ])

  // Agrupar por dia
  const byDia: Record<string, Evento[]> = {}
  DIAS.forEach((d) => { byDia[d.id] = [] })

  for (const s of showsRes.data ?? []) {
    const setor = s.setor as unknown as { nome: string } | null
    byDia[s.dia_id]?.push({
      id: s.id, nome: s.nome, tipo: 'show',
      inicio: s.inicio, fim: s.fim_previsto,
      local: setor?.nome ?? '—',
      detalhe: s.tipo === 'dj_set' ? 'DJ Set' : 'Show',
      badge: s.embaixador ? 'Embaixador' : undefined,
    })
  }

  for (const j of jogosRes.data ?? []) {
    const setor = j.setor as unknown as { nome: string } | null
    const mod = j.modalidade as unknown as { nome: string; icone: string } | null
    const titulo = j.equipe_a_nome && j.equipe_b_nome
      ? `${j.equipe_a_nome} × ${j.equipe_b_nome}`
      : (mod?.nome ?? 'Jogo')
    byDia[j.dia_id]?.push({
      id: j.id, nome: titulo, tipo: 'jogo',
      inicio: j.inicio, fim: j.fim_previsto,
      local: setor?.nome ?? '—',
      detalhe: [mod?.nome, j.categoria, j.fase].filter(Boolean).join(' · '),
    })
  }

  for (const f of festasRes.data ?? []) {
    const setor = f.setor as unknown as { nome: string } | null
    byDia[f.dia_id]?.push({
      id: f.id, nome: f.nome, tipo: 'festa',
      inicio: f.inicio, fim: f.fim_previsto,
      local: setor?.nome ?? '—',
      detalhe: f.tema ?? null,
    })
  }

  // ordenar por horário dentro de cada dia
  DIAS.forEach((d) => {
    byDia[d.id]?.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
  })

  const tipoStyle: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
    show: {
      icon: <Music className="h-3.5 w-3.5" />,
      bg: 'bg-purple-900/20', border: 'border-purple-700/40', text: 'text-purple-300',
    },
    jogo: {
      icon: <Swords className="h-3.5 w-3.5" />,
      bg: 'bg-[var(--green-dim)]/20', border: 'border-[var(--green-dim)]/40', text: 'text-[var(--green-bright)]',
    },
    festa: {
      icon: <PartyPopper className="h-3.5 w-3.5" />,
      bg: 'bg-pink-900/20', border: 'border-pink-700/40', text: 'text-pink-300',
    },
  }

  const totalEventos = Object.values(byDia).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Programação</p>
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          Cronograma
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {totalEventos} eventos · 04–07 junho 2026 · Uberaba/MG
        </p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(tipoStyle).map(([tipo, style]) => (
          <span key={tipo} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}>
            {style.icon}
            {tipo === 'show' ? 'Shows & DJs' : tipo === 'jogo' ? 'Jogos' : 'Festas'}
          </span>
        ))}
      </div>

      {/* Grid por dia */}
      <div className="grid gap-8 lg:grid-cols-2">
        {DIAS.map((dia) => {
          const eventos = byDia[dia.id] ?? []
          return (
            <div key={dia.id}>
              <h2 className="mb-4 border-b border-[var(--border)] pb-2 text-base font-bold">
                {dia.label}
                <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                  {eventos.length} eventos
                </span>
              </h2>

              {eventos.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Sem eventos cadastrados.</p>
              ) : (
                <div className="space-y-2">
                  {eventos.map((ev) => {
                    const style = tipoStyle[ev.tipo]
                    return (
                      <div
                        key={ev.id}
                        className={`flex gap-3 rounded-lg border p-3 ${style.bg} ${style.border}`}
                      >
                        {/* Horário */}
                        <div className="w-20 shrink-0 text-right">
                          <p className="text-xs font-semibold tabular-nums text-[var(--foreground)]">
                            {fmt(ev.inicio)}
                          </p>
                          {ev.fim && (
                            <p className="text-[10px] text-[var(--muted-foreground)]">
                              até {fmt(ev.fim)}
                            </p>
                          )}
                        </div>

                        {/* Divider */}
                        <div className={`w-px shrink-0 rounded-full ${style.text} opacity-30`}
                          style={{ background: 'currentColor' }} />

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 shrink-0 ${style.text}`}>{style.icon}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug">
                                {ev.nome}
                                {ev.badge && (
                                  <span className="ml-2 rounded bg-[var(--gold-dim)]/30 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--gold)] border border-[var(--gold-dim)]/50">
                                    {ev.badge}
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                                {ev.local}{ev.detalhe ? ` · ${ev.detalhe}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
