'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Radio, Clock, AlertTriangle, Layers, ArrowUpRight, MapPin } from 'lucide-react'
import type { CoordJogo, CoordShow, CoordFesta } from './CoordDashboard'

// ─────────────────────────────────────────────────────────────────────────────
// HomeAgora — strip de comando AO VIVO (coordenação). Responde, em tempo real:
//   "o que vem agora?" · "o que tá no ar?" · "onde tô descoberto?" · "onde trava?"
// Tudo computado client-side do que o HomeClient já carrega. Tick 30s.
// ─────────────────────────────────────────────────────────────────────────────

interface ContentStats { total: number; rascunho: number; em_producao: number; publicado: number }

interface Props {
  jogos:    CoordJogo[]
  shows:    CoordShow[]
  festas:   CoordFesta[]
  turnosCoberturaAV: { setor_id: string; funcao: string; dia_id: string }[]
  contentStats: ContentStats
  diaAtualId: string | null
  setoresMap:    Record<string, string>
  modalidadesMap: Record<string, string>
}

function useNow(intervalMs = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function fmtFalta(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 1)  return 'agora'
  if (min < 60) return `em ${min}min`
  const h = Math.floor(min / 60), m = min % 60
  return m > 0 ? `em ${h}h${m}` : `em ${h}h`
}

export function HomeAgora({
  jogos, shows, festas, turnosCoberturaAV, contentStats, diaAtualId, setoresMap, modalidadesMap,
}: Props) {
  const now = useNow()
  const ms = now?.getTime() ?? 0

  // ── 1. Próximo evento (jogo/show/festa que ainda não começou) ──────────────
  type Ev = { nome: string; sub: string | null; local: string | null; inicio: number; href: string }
  const proximo: Ev | null = (() => {
    if (!now) return null
    const evs: Ev[] = []
    for (const j of jogos) {
      if (!j.inicio || j.status === 'encerrado' || j.status === 'ao_vivo') continue
      const t = new Date(j.inicio).getTime()
      if (t <= ms) continue
      evs.push({
        nome:   j.equipe_a_nome && j.equipe_b_nome ? `${j.equipe_a_nome} × ${j.equipe_b_nome}` : 'Jogo',
        sub:    j.modalidade_id ? (modalidadesMap[j.modalidade_id] ?? null) : null,
        local:  j.setor_id ? (setoresMap[j.setor_id] ?? null) : null,
        inicio: t, href: '/placar',
      })
    }
    for (const s of shows) {
      if (!s.inicio) continue
      const t = new Date(s.inicio).getTime(); if (t <= ms) continue
      evs.push({ nome: s.nome, sub: 'Show', local: s.setor_id ? (setoresMap[s.setor_id] ?? null) : null, inicio: t, href: '/lineup' })
    }
    for (const f of festas) {
      if (!f.inicio) continue
      const t = new Date(f.inicio).getTime(); if (t <= ms) continue
      evs.push({ nome: f.nome, sub: 'Festa', local: f.setor_id ? (setoresMap[f.setor_id] ?? null) : null, inicio: t, href: '/cronograma' })
    }
    evs.sort((a, b) => a.inicio - b.inicio)
    return evs[0] ?? null
  })()

  // ── 2. Ao vivo agora (jogos com status ao_vivo) ────────────────────────────
  const aoVivo = jogos.filter(j => j.status === 'ao_vivo')

  // ── 3. Gargalo do pipeline (maior coluna não-publicada) ────────────────────
  const gargalo = contentStats.em_producao >= contentStats.rascunho
    ? { n: contentStats.em_producao, label: 'em produção' }
    : { n: contentStats.rascunho, label: 'em rascunho' }

  // ── 4. Praças sem cobertura (jogo rolando agora, setor sem foto/vídeo) ──────
  const pracasDescobertas: string[] = (() => {
    if (!now) return []
    // setores cobertos hoje (têm ao menos 1 turno foto/vídeo)
    const cobertos = new Set<string>()
    for (const t of turnosCoberturaAV) {
      if (diaAtualId && t.dia_id !== diaAtualId) continue
      if (t.setor_id && (t.funcao === 'foto' || t.funcao === 'video')) cobertos.add(t.setor_id)
    }
    const desc = new Set<string>()
    for (const j of jogos) {
      if (!j.inicio || !j.setor_id) continue
      const ini = new Date(j.inicio).getTime()
      const fim = j.fim_previsto ? new Date(j.fim_previsto).getTime() : ini + 90 * 60_000
      const rolando = (ms >= ini && ms <= fim) || j.status === 'ao_vivo'
      if (rolando && !cobertos.has(j.setor_id)) desc.add(setoresMap[j.setor_id] ?? j.setor_id)
    }
    return [...desc]
  })()

  const cards = [
    {
      key: 'proximo', href: proximo?.href ?? '/cronograma',
      icon: Clock, accent: '#5C68E8',
      eyebrow: 'Próximo',
      value: proximo && now ? fmtFalta(proximo.inicio - ms) : '—',
      title: proximo?.nome ?? 'Nada agendado',
      meta:  proximo ? [proximo.sub, proximo.local].filter(Boolean).join(' · ') : null,
      live: false,
    },
    {
      key: 'aovivo', href: '/placar',
      icon: Radio, accent: '#DC2626',
      eyebrow: 'No ar agora',
      value: `${aoVivo.length}`,
      title: aoVivo.length === 0 ? 'Nenhum jogo ao vivo' : aoVivo.length === 1 ? 'jogo ao vivo' : 'jogos ao vivo',
      meta:  aoVivo.length > 0 ? aoVivo.slice(0, 2).map(j => `${j.equipe_a_nome ?? '?'}×${j.equipe_b_nome ?? '?'}`).join(' · ') : null,
      live: aoVivo.length > 0,
    },
    {
      key: 'gargalo', href: '/conteudos',
      icon: Layers, accent: gargalo.n >= 15 ? '#C46B4A' : '#2e6b42',
      eyebrow: 'Gargalo',
      value: `${gargalo.n}`,
      title: gargalo.label,
      meta:  `${contentStats.publicado} publicados · ${contentStats.total} no total`,
      live: false,
    },
    {
      key: 'cobertura', href: '/esportivo/escala',
      icon: pracasDescobertas.length > 0 ? AlertTriangle : MapPin,
      accent: pracasDescobertas.length > 0 ? '#C46B4A' : '#2e6b42',
      eyebrow: 'Cobertura AV',
      value: `${pracasDescobertas.length}`,
      title: pracasDescobertas.length === 0 ? 'tudo coberto' : pracasDescobertas.length === 1 ? 'praça descoberta' : 'praças descobertas',
      meta:  pracasDescobertas.length > 0 ? pracasDescobertas.slice(0, 3).join(' · ') : null,
      live: pracasDescobertas.length > 0,
    },
  ]

  return (
    <section style={{ padding: '4px 24px 8px' }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-2 flex items-center gap-2">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2e6b42', boxShadow: '0 0 8px rgba(46,107,66,0.6)' }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,15,11,0.5)' }}>
            Agora
          </span>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          {cards.map(c => {
            const Icon = c.icon
            return (
              <Link
                key={c.key}
                href={c.href}
                className="group relative overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
                style={{ borderColor: 'rgba(10,15,11,0.08)', background: 'var(--card)' }}
              >
                <div className="flex items-center justify-between">
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    width: 30, height: 30, borderRadius: 9,
                    background: `${c.accent}14`, justifyContent: 'center',
                  }}>
                    <Icon style={{ width: 15, height: 15, color: c.accent, strokeWidth: 2 }} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {c.live && <span className="cia-agora-dot" style={{ background: c.accent }} aria-hidden />}
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(10,15,11,0.4)' }}>{c.eyebrow}</span>
                    <ArrowUpRight style={{ width: 12, height: 12, color: 'rgba(10,15,11,0.25)' }} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-dm-sans), system-ui', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0F0B', lineHeight: 1 }}>
                    {c.value}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(10,15,11,0.55)' }}>{c.title}</span>
                </div>

                {c.meta && (
                  <p style={{ marginTop: 4, fontSize: 11, color: 'rgba(10,15,11,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.meta}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      <style>{`
        .cia-agora-dot { width: 6px; height: 6px; border-radius: 50%; animation: ciaAgoraPulse 1.6s ease-out infinite; }
        @keyframes ciaAgoraPulse { 0% { box-shadow: 0 0 0 0 currentColor; opacity: 1 } 70% { box-shadow: 0 0 0 5px transparent; opacity: .6 } 100% { box-shadow: 0 0 0 0 transparent; opacity: 1 } }
      `}</style>
    </section>
  )
}
