'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { Activity, Users, ThumbsUp, Eye, Radio, Clock, ListChecks, AlertTriangle, Settings2 } from 'lucide-react'
import { setPrograma } from '../actions'
import { GRADE_TIPOS, type ProgramaConfig, type GradeItem, type ChecklistItem, type EquipeItem } from '../types'

const C = {
  bg: '#070D0A', card: 'rgba(250,247,240,0.04)', cream: '#FAF7F0',
  dim: 'rgba(250,247,240,0.62)', mute: 'rgba(250,247,240,0.34)', fade: 'rgba(250,247,240,0.16)',
  border: 'rgba(250,247,240,0.10)', gold: '#D4B36A', goldB: '#F0D04A', green: '#4aa06a', red: '#EF4444', blue: '#5C68E8',
}
const FD = 'var(--font-fraunces), Georgia, serif'
const FS = 'var(--font-geist), system-ui, sans-serif'
const tipoMeta = (t: string) => GRADE_TIPOS.find(x => x.value === t) ?? { label: t, cor: C.gold }

interface YtData { ok: boolean; reason?: string; title?: string | null; concurrentViewers?: number | null; likes?: number | null; views?: number | null; startedAt?: string | null; live?: boolean; ended?: boolean }

// 'HH:MM[:SS]' → minutos do dia (ou null)
function horaParaMin(h: string | null): number | null {
  if (!h) return null
  const [hh, mm] = h.split(':').map(Number)
  if (Number.isNaN(hh)) return null
  return hh * 60 + (mm || 0)
}

export function TermometroClient({
  config, grade, checklist, equipe,
}: {
  config: ProgramaConfig
  grade: GradeItem[]
  checklist: ChecklistItem[]
  equipe: EquipeItem[]
}) {
  const [, start] = useTransition()
  const [aoVivo, setAoVivo] = useState(config.ao_vivo)
  const [now, setNow] = useState(() => new Date())
  const [yt, setYt] = useState<YtData | null>(null)

  // relógio
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])

  // polling YouTube
  const fetchYt = useCallback(async () => {
    if (!config.youtube_video_id) return
    try {
      const r = await fetch(`/api/youtube-stats?id=${config.youtube_video_id}`)
      setYt(await r.json())
    } catch { /* mantém último */ }
  }, [config.youtube_video_id])
  useEffect(() => {
    if (!config.youtube_video_id) return
    fetchYt(); const i = setInterval(fetchYt, 30_000); return () => clearInterval(i)
  }, [config.youtube_video_id, fetchYt])

  const liveReal = aoVivo || yt?.live === true

  // bloco atual da grade (por horário)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const comHora = grade.map(g => ({ g, min: horaParaMin(g.horario) })).filter(x => x.min != null) as { g: GradeItem; min: number }[]
  comHora.sort((a, b) => a.min - b.min)
  let atual: GradeItem | null = null, prox: GradeItem | null = null, proxMin: number | null = null
  for (const x of comHora) {
    if (x.min <= nowMin) atual = x.g
    else if (prox == null) { prox = x.g; proxMin = x.min }
  }
  const minutosProxBloco = proxMin != null ? proxMin - nowMin : null
  // atraso: bloco atual deveria ter acabado (hora + duração) e ainda é o atual
  const atualMin = atual ? horaParaMin(atual.horario) : null
  const atrasado = atual && atualMin != null && atual.duracao_seg > 0 && (nowMin > atualMin + atual.duracao_seg / 60 + 1)

  // progresso da grade
  const totalBlocos = grade.length
  const concluidos = comHora.filter(x => x.min < nowMin).length
  const pctGrade = totalBlocos > 0 ? Math.round(concluidos / totalBlocos * 100) : 0

  // checklist
  const ckFeitos = checklist.filter(c => c.feito).length
  const ckPct = checklist.length ? Math.round(ckFeitos / checklist.length * 100) : 0

  // tempo no ar
  const tempoNoAr = yt?.startedAt ? elapsed(yt.startedAt, now) : null

  function toggleAoVivo() {
    const v = !aoVivo; setAoVivo(v); start(() => { setPrograma({ ao_vivo: v }) })
  }

  return (
    <div style={{ minHeight: '100%', background: C.bg, color: C.cream, fontFamily: FS, padding: '16px 20px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', color: C.green, textTransform: 'uppercase' }}>Broadcast · Termômetro</p>
          <h1 style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {config.programa_titulo || 'Palco Principal'}
          </h1>
        </div>
        <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 24, fontWeight: 700, color: C.dim, fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' })}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={toggleAoVivo}
          style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '10px 20px', cursor: 'pointer',
            border: `1.5px solid ${liveReal ? C.red : C.border}`, background: liveReal ? 'rgba(239,68,68,0.15)' : C.card,
            color: liveReal ? C.red : C.dim, fontWeight: 800, fontSize: 14, letterSpacing: '0.1em' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: liveReal ? C.red : C.mute, boxShadow: liveReal ? `0 0 12px ${C.red}` : 'none' }} />
          {liveReal ? 'NO AR' : 'FORA DO AR'}
        </button>
        <Link href="/broadcast/preparar" style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '9px 12px', border: `1px solid ${C.border}`, background: C.card, color: C.dim, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          <Settings2 size={14} /> Preparar
        </Link>
      </div>

      {/* ── YOUTUBE — números reais ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        {!config.youtube_video_id ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
            <Radio size={20} style={{ color: C.red }} />
            <span style={{ fontSize: 13, color: C.dim }}>Cole o link da transmissão em <Link href="/broadcast/preparar" style={{ color: C.gold }}>Preparar</Link> pra ver espectadores, likes e tempo no ar em tempo real.</span>
          </div>
        ) : yt && !yt.ok && yt.reason === 'no_key' ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, background: C.card, border: `1px solid ${C.gold}40`, borderRadius: 14, padding: '16px 18px' }}>
            <AlertTriangle size={18} style={{ color: C.gold }} />
            <span style={{ fontSize: 13, color: C.dim }}>Falta configurar a chave da API do YouTube (<code style={{ color: C.gold }}>YOUTUBE_API_KEY</code>) no servidor. Os dados reais aparecem assim que ela for adicionada.</span>
          </div>
        ) : (
          <>
            <Metric icon={<Users size={16} />} label="Espectadores agora" valor={yt?.concurrentViewers != null ? fmt(yt.concurrentViewers) : '—'} accent={C.red} grande live={liveReal} />
            <Metric icon={<ThumbsUp size={16} />} label="Likes" valor={yt?.likes != null ? fmt(yt.likes) : '—'} accent={C.gold} />
            <Metric icon={<Eye size={16} />} label="Visualizações" valor={yt?.views != null ? fmt(yt.views) : '—'} accent={C.cream} />
            <Metric icon={<Radio size={16} />} label="Tempo no ar" valor={tempoNoAr ?? '—:—'} accent={C.green} />
          </>
        )}
      </div>

      {/* ── LINHA: no ar agora · progresso · checklist ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 14 }}>
        {/* NO AR AGORA (grade) */}
        <Card titulo="No ar agora · grade" accent={atrasado ? C.red : C.green}>
          {atual ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: tipoMeta(atual.tipo).cor }}>{tipoMeta(atual.tipo).label}</span>
                {atual.horario && <span style={{ fontSize: 11, color: C.mute, fontVariantNumeric: 'tabular-nums' }}>{atual.horario.slice(0, 5)}</span>}
                {atrasado && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: C.red, background: 'rgba(239,68,68,0.12)', borderRadius: 999, padding: '2px 8px' }}>⚠ ATRASADO</span>}
              </div>
              <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: 26, lineHeight: 1.05, marginTop: 4 }}>{atual.titulo}</div>
              {atual.responsavel && <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>resp: {atual.responsavel}</div>}
            </>
          ) : <div style={{ fontSize: 14, color: C.mute }}>Programa ainda não começou pela grade.</div>}
          {prox && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: C.gold }}>PRÓXIMO</span>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prox.titulo}</span>
              {minutosProxBloco != null && <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: minutosProxBloco <= 2 ? C.gold : C.dim }}>em {minutosProxBloco}min</span>}
            </div>
          )}
        </Card>

        {/* PROGRESSO DA GRADE */}
        <Card titulo="Progresso do programa" accent={C.gold}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 900, fontSize: 44, color: C.gold, lineHeight: 1 }}>{pctGrade}%</span>
            <span style={{ fontSize: 12, color: C.mute }}>{concluidos}/{totalBlocos} blocos</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: C.card, overflow: 'hidden', marginTop: 10 }}>
            <div style={{ height: '100%', width: `${pctGrade}%`, background: C.gold, transition: 'width 1s ease' }} />
          </div>
        </Card>

        {/* CHECKLIST HEALTH */}
        <Card titulo="Checklist Go-Live" accent={ckPct === 100 ? C.green : C.gold}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 900, fontSize: 44, color: ckPct === 100 ? C.green : C.gold, lineHeight: 1 }}>{ckPct}%</span>
            <span style={{ fontSize: 12, color: C.mute }}>{ckFeitos}/{checklist.length}</span>
          </div>
          {liveReal && ckPct < 100
            ? <p style={{ fontSize: 11, color: C.red, marginTop: 8, fontWeight: 600 }}>⚠ No ar com checklist incompleto</p>
            : ckPct === 100 ? <p style={{ fontSize: 11, color: C.green, marginTop: 8 }}>✓ Tudo pronto</p>
            : <Link href="/broadcast/preparar" style={{ fontSize: 11, color: C.gold, marginTop: 8, display: 'inline-block' }}>completar →</Link>}
        </Card>
      </div>

      {/* ── GRADE TIMELINE + EQUIPE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
        <Card titulo={`Grade · ${grade.length} blocos`} accent={C.green} icon={<ListChecks size={15} />}>
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {grade.length === 0 && <p style={{ fontSize: 12, color: C.mute }}>Grade vazia. Monte em <Link href="/broadcast/preparar" style={{ color: C.gold }}>Preparar</Link>.</p>}
            {grade.map(g => {
              const m = tipoMeta(g.tipo)
              const gMin = horaParaMin(g.horario)
              const isAtual = atual?.id === g.id
              const passou = gMin != null && gMin < nowMin && !isAtual
              return (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, background: isAtual ? 'rgba(74,160,106,0.12)' : 'transparent', border: `1px solid ${isAtual ? C.green + '40' : 'transparent'}`, opacity: passou ? 0.42 : 1, borderLeft: `3px solid ${m.cor}` }}>
                  <span style={{ width: 42, fontSize: 11, fontWeight: 700, color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{g.horario?.slice(0, 5) ?? '—'}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: m.cor, width: 60 }}>{m.label}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isAtual ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.titulo}</span>
                  {isAtual && <span style={{ fontSize: 8, fontWeight: 800, color: C.green, letterSpacing: '0.1em' }}>● NO AR</span>}
                </div>
              )
            })}
          </div>
        </Card>

        <Card titulo="Equipe do programa" accent={C.blue} icon={<Users size={15} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {equipe.filter(m => m.nome).length === 0 && <p style={{ fontSize: 12, color: C.mute }}>Sem equipe definida. Preencha em <Link href="/broadcast/preparar" style={{ color: C.gold }}>Preparar</Link>.</p>}
            {equipe.filter(m => m.nome).map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: C.mute, width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.funcao}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.nome}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── helpers UI ────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString('pt-BR') }
function elapsed(startedISO: string, now: Date) {
  const s = Math.max(0, Math.floor((now.getTime() - new Date(startedISO).getTime()) / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

function Metric({ icon, label, valor, accent, grande, live }: { icon: React.ReactNode; label: string; valor: string; accent: string; grande?: boolean; live?: boolean }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${grande && live ? accent + '55' : C.border}`, borderRadius: 16, padding: '14px 18px', position: 'relative', overflow: 'hidden' }}>
      {grande && live && <div style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mute, marginBottom: 6 }}>
        <span style={{ color: accent }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 900, fontSize: grande ? 52 : 36, color: accent, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
    </div>
  )
}

function Card({ titulo, accent, icon, children }: { titulo: string; accent: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        {icon && <span style={{ color: accent }}>{icon}</span>}
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent }}>{titulo}</span>
      </div>
      {children}
    </div>
  )
}
