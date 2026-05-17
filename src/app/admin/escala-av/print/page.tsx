import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { PrintActions } from './PrintActions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Escala Foto & Vídeo — Impressão' }

interface PageProps {
  searchParams: Promise<{ dia?: string; all?: string }>
}

interface TurnoRow {
  id: string
  funcao: 'foto' | 'video' | string
  inicio: string
  fim: string
  setor: { nome: string } | null
  user: { nome: string } | null
  parceiro: { nome: string; cor_hex: string } | null
  briefing_editorial: string | null
  prioridade: string | null
}

function fmtHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
  } catch { return '' }
}

function fmtData(date: string): string {
  try {
    return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch { return date }
}

export default async function EscalaAVPrintPage({ searchParams }: PageProps) {
  const profile = await requireProfile()
  if (!['admin', 'coordenacao'].includes(profile.role)) redirect('/')

  const supabase = await createClient()
  const params = await searchParams
  const all = params.all === '1' || params.all === 'true'

  // Dias do evento
  const { data: dias } = await supabase
    .from('dias_evento')
    .select('id, nome_dia, data')
    .order('data')

  if (!dias || dias.length === 0) {
    return (
      <main className="p-12 text-center">
        <p>Nenhum dia de evento cadastrado.</p>
      </main>
    )
  }

  // Filtra dia(s) a renderizar
  const diasARenderizar = all
    ? dias
    : dias.filter(d => params.dia === d.id || (!params.dia && d.id === dias[0].id))

  if (diasARenderizar.length === 0) {
    return (
      <main className="p-12 text-center">
        <p>Dia não encontrado.</p>
      </main>
    )
  }

  // Setores ordenados
  const { data: setores } = await supabase
    .from('setores')
    .select('id, nome')
    .order('nome')

  // Turnos foto/video
  const { data: turnosRaw } = await supabase
    .from('turnos')
    .select(`
      id, dia_id, setor_id, funcao, inicio, fim, briefing_editorial, prioridade,
      setor:setores(nome),
      user:profiles(nome),
      parceiro:parceiros(nome, cor_hex)
    `)
    .in('funcao', ['foto', 'video'])
    .order('inicio')

  type Raw = {
    id: string; dia_id: string; setor_id: string | null
    funcao: 'foto' | 'video' | string
    inicio: string; fim: string
    briefing_editorial: string | null; prioridade: string | null
    setor: { nome: string } | { nome: string }[] | null
    user: { nome: string } | { nome: string }[] | null
    parceiro: { nome: string; cor_hex: string } | { nome: string; cor_hex: string }[] | null
  }
  function arr<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? v[0] ?? null : v }
  const turnos: Array<TurnoRow & { dia_id: string; setor_id: string | null }> = (turnosRaw as Raw[] ?? []).map(t => ({
    id: t.id, dia_id: t.dia_id, setor_id: t.setor_id,
    funcao: t.funcao, inicio: t.inicio, fim: t.fim,
    briefing_editorial: t.briefing_editorial, prioridade: t.prioridade,
    setor: arr(t.setor) as { nome: string } | null,
    user: arr(t.user) as { nome: string } | null,
    parceiro: arr(t.parceiro) as { nome: string; cor_hex: string } | null,
  }))

  const now = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })

  return (
    <main>
      <div className="print-actions no-print">
        <PrintActions diasIds={diasARenderizar.map(d => d.id)} all={all} dias={dias} currentDia={params.dia ?? dias[0].id} />
      </div>

      {diasARenderizar.map((dia, idx) => {
        const turnosDoDia = turnos.filter(t => t.dia_id === dia.id)
        const totalFoto = turnosDoDia.filter(t => t.funcao === 'foto').length
        const totalVideo = turnosDoDia.filter(t => t.funcao === 'video').length

        // Agrupa por setor
        const turnosPorSetor = new Map<string, typeof turnosDoDia>()
        for (const t of turnosDoDia) {
          const k = t.setor_id ?? '__sem_setor__'
          if (!turnosPorSetor.has(k)) turnosPorSetor.set(k, [])
          turnosPorSetor.get(k)!.push(t)
        }

        // Lista de setores que têm turnos
        const setoresAtivos = (setores ?? []).filter(s => turnosPorSetor.has(s.id))

        return (
          <section key={dia.id} className={idx > 0 ? 'print-day-section' : ''}>
            <header className="print-header">
              <div>
                <h1 className="print-title">Escala Foto &amp; Vídeo · {dia.nome_dia}</h1>
                <p className="print-subtitle">{fmtData(dia.data)} · CIA 2026 Uberaba</p>
              </div>
              <div className="print-meta">
                <div>📸 {totalFoto} foto · 🎬 {totalVideo} vídeo</div>
                <div>{setoresAtivos.length} {setoresAtivos.length === 1 ? 'setor' : 'setores'}</div>
                <div>Emitido: {now}</div>
              </div>
            </header>

            {setoresAtivos.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                Nenhum turno cadastrado neste dia.
              </p>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Praça</th>
                    <th style={{ width: '35%' }}>📸 Foto</th>
                    <th style={{ width: '35%' }}>🎬 Vídeo</th>
                    <th style={{ width: '10%' }}>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {setoresAtivos.map(setor => {
                    const ts = turnosPorSetor.get(setor.id) ?? []
                    const fotoTs = ts.filter(t => t.funcao === 'foto').sort((a, b) => a.inicio.localeCompare(b.inicio))
                    const videoTs = ts.filter(t => t.funcao === 'video').sort((a, b) => a.inicio.localeCompare(b.inicio))
                    const briefings = ts.map(t => t.briefing_editorial).filter(Boolean) as string[]
                    const altaPrioridade = ts.some(t => t.prioridade === 'alta')

                    return (
                      <tr key={setor.id}>
                        <td>
                          <div className="print-setor">{setor.nome}</div>
                          {altaPrioridade && <div className="print-warning">⚠ ALTA PRIORIDADE</div>}
                        </td>

                        <td className="print-cell-foto">
                          {fotoTs.length === 0 ? (
                            <span className="print-warning">⚠ sem cobertura</span>
                          ) : (
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                              {fotoTs.map(t => (
                                <li key={t.id} style={{ marginBottom: 3 }}>
                                  {t.parceiro && (
                                    <span
                                      className="print-partner"
                                      style={{ background: `${t.parceiro.cor_hex}20`, color: t.parceiro.cor_hex }}
                                    >
                                      {t.parceiro.nome}
                                    </span>
                                  )}
                                  <span className="print-name">{t.user?.nome ?? '—'}</span>{' '}
                                  <span className="print-time">{fmtHora(t.inicio)}–{fmtHora(t.fim)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>

                        <td className="print-cell-video">
                          {videoTs.length === 0 ? (
                            <span className="print-warning">⚠ sem cobertura</span>
                          ) : (
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                              {videoTs.map(t => (
                                <li key={t.id} style={{ marginBottom: 3 }}>
                                  {t.parceiro && (
                                    <span
                                      className="print-partner"
                                      style={{ background: `${t.parceiro.cor_hex}20`, color: t.parceiro.cor_hex }}
                                    >
                                      {t.parceiro.nome}
                                    </span>
                                  )}
                                  <span className="print-name">{t.user?.nome ?? '—'}</span>{' '}
                                  <span className="print-time">{fmtHora(t.inicio)}–{fmtHora(t.fim)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>

                        <td>
                          {briefings.length > 0 && (
                            <div style={{ fontSize: 9.5, color: '#4b5563' }}>
                              {briefings.slice(0, 2).map((b, i) => (
                                <div key={i}>· {b}</div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <footer className="print-footer">
              CIA 2026 · Uberaba/MG · Documento gerado em {now}
            </footer>
          </section>
        )
      })}
    </main>
  )
}
