'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uniqueChannel } from '@/lib/supabase/channel-name'
import { Radio, Copy, Check, Power, Music, User, Award, Megaphone, Tv2, X, Trash2, Film, SkipForward, ListChecks, Play, Square } from 'lucide-react'
import Link from 'next/link'
import { setBroadcast, logBroadcast, limparTudo, irParaSegmento, rollVT, pararVT, type BroadcastPatch } from '../actions'
import { ESCALETA_TIPOS, type BroadcastEstado, type PatrocinadorRef, type VT, type EscaletaItem } from '../types'

const C = {
  bg: '#0A1410', card: 'rgba(250,247,240,0.04)', cardHi: 'rgba(250,247,240,0.07)',
  cream: '#FAF7F0', dim: 'rgba(250,247,240,0.62)', mute: 'rgba(250,247,240,0.34)',
  border: 'rgba(250,247,240,0.10)', gold: '#D4B36A', green: '#4aa06a', greenDeep: '#2e6b42', red: '#EF4444',
}
const FD = 'var(--font-fraunces), Georgia, serif'
const FS = 'var(--font-geist), system-ui, sans-serif'

interface LineupItem { id: string; nome: string; inicio: string | null; setor: string }

export function RegieClient({
  estadoInicial, patrocinadores, lineup, vts, escaleta,
}: {
  estadoInicial: BroadcastEstado
  patrocinadores: PatrocinadorRef[]
  lineup: LineupItem[]
  vts: VT[]
  escaleta: EscaletaItem[]
}) {
  const [e, setE] = useState<BroadcastEstado>(estadoInicial)
  const [, startTransition] = useTransition()

  // Inputs locais
  const [gcTipo, setGcTipo] = useState<'artista' | 'credito'>('artista')
  const [gcTitulo, setGcTitulo] = useState('')
  const [gcSub, setGcSub] = useState('')
  const [gcDet, setGcDet] = useState('')
  const [npMusica, setNpMusica] = useState('')
  const [npArtista, setNpArtista] = useState('')
  const [patrocModo, setPatrocModo] = useState('apresenta')
  const [crawlTxt, setCrawlTxt] = useState(estadoInicial.crawl_texto ?? '')
  const [placaT, setPlacaT] = useState('')
  const [placaL1, setPlacaL1] = useState('')
  const [placaL2, setPlacaL2] = useState('')
  const [copied, setCopied] = useState(false)

  // Realtime: mantém multi-operador sincronizado
  useEffect(() => {
    const sb = createClient()
    const ch = sb.channel(uniqueChannel('broadcast-regie'))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'broadcast_estado' }, (p) => {
        setE(prev => ({ ...prev, ...(p.new as BroadcastEstado) }))
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [])

  const apply = useCallback((patch: BroadcastPatch, log?: { acao: string; rotulo: string; patrocId?: string | null }) => {
    setE(prev => ({ ...prev, ...patch } as BroadcastEstado))
    startTransition(async () => {
      await setBroadcast(patch)
      if (log) await logBroadcast(log.acao, log.rotulo, patch, log.patrocId)
    })
  }, [])

  function copiarOverlay() {
    navigator.clipboard.writeText(`${window.location.origin}/broadcast/overlay`)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const patrocAtual = e.patroc_id ? patrocinadores.find(p => p.id === e.patroc_id) : null

  return (
    <div style={{ minHeight: '100%', background: C.bg, color: C.cream, fontFamily: FS, padding: '16px 20px' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', color: C.green, textTransform: 'uppercase' }}>Broadcast · Palco Principal</p>
          <h1 style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1 }}>Régie</h1>
        </div>
        <Clock />
        <div style={{ flex: 1 }} />
        {/* AO VIVO master */}
        <button
          onClick={() => apply({ ao_vivo: !e.ao_vivo }, { acao: 'ao_vivo', rotulo: e.ao_vivo ? 'Saiu do ar' : 'Entrou no ar' })}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '10px 18px', cursor: 'pointer',
            border: `1.5px solid ${e.ao_vivo ? C.red : C.border}`,
            background: e.ao_vivo ? 'rgba(239,68,68,0.15)' : C.card,
            color: e.ao_vivo ? C.red : C.dim, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em',
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: e.ao_vivo ? C.red : C.mute, boxShadow: e.ao_vivo ? `0 0 10px ${C.red}` : 'none' }} />
          {e.ao_vivo ? 'NO AR' : 'FORA DO AR'}
        </button>
        <Link href="/broadcast/preparar"
          style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '9px 12px', border: `1px solid ${C.border}`, background: C.card, color: C.dim, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          <ListChecks size={14} /> Preparar
        </Link>
        <a href="/broadcast/overlay" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '9px 12px', border: `1px solid ${C.border}`, background: C.card, color: C.dim, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          <Tv2 size={14} /> Ver overlay
        </a>
        <button onClick={copiarOverlay}
          style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '9px 12px', border: `1px solid ${C.border}`, background: C.card, color: copied ? C.green : C.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado!' : 'Link p/ operador'}
        </button>
      </div>

      {/* ── ESCALETA RUNNER ── */}
      {escaleta.length > 0 && <EscaletaRunner escaleta={escaleta} estado={e} onSegmento={(it) => { setE(prev => ({ ...prev, segmento_id: it.id, segmento_titulo: it.titulo })); startTransition(() => { irParaSegmento({ id: it.id, titulo: it.titulo, duracao_seg: it.duracao_seg }) }) }} />}

      {/* ── TALLY (no ar agora) ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: C.mute, textTransform: 'uppercase' }}>No ar:</span>
        {e.mosca_on   && <Tag label="Mosca" />}
        {e.gc_on      && <Tag label={`GC: ${e.gc_titulo ?? ''}`} live />}
        {e.np_on      && <Tag label={`♪ ${e.np_musica ?? ''}`} live />}
        {e.patroc_on  && <Tag label={`Patroc: ${patrocAtual?.nome ?? ''}`} live />}
        {e.placa_on   && <Tag label={`Placa: ${e.placa_tipo ?? ''}`} live />}
        {e.crawl_on   && <Tag label="Crawl" live />}
        {!e.gc_on && !e.np_on && !e.patroc_on && !e.placa_on && !e.crawl_on && <span style={{ fontSize: 12, color: C.mute }}>— só a mosca</span>}
        <div style={{ flex: 1 }} />
        <button onClick={() => { limparTudo(); setE(prev => ({ ...prev, gc_on: false, np_on: false, patroc_on: false, placa_on: false, crawl_on: false })) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '8px 14px', border: `1px solid ${C.red}55`, background: 'rgba(239,68,68,0.10)', color: C.red, fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em' }}>
          <Trash2 size={14} /> LIMPAR TUDO
        </button>
      </div>

      {/* ── GRID DE PAINÉIS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 12 }}>

        {/* GC / Lower third */}
        <Painel icon={<User size={15} />} titulo="GC · Lower Third" ativo={e.gc_on}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['artista', 'credito'] as const).map(t => (
              <button key={t} onClick={() => setGcTipo(t)}
                style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${gcTipo === t ? C.gold : C.border}`, background: gcTipo === t ? `${C.gold}1a` : 'transparent', color: gcTipo === t ? C.gold : C.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {t === 'artista' ? 'Artista' : 'Crédito'}
              </button>
            ))}
          </div>
          <Input value={gcTitulo} onChange={setGcTitulo} placeholder={gcTipo === 'artista' ? 'Nome do artista' : 'Nome'} />
          <Input value={gcSub} onChange={setGcSub} placeholder={gcTipo === 'artista' ? '@instagram' : 'Função (Apresentador…)'} />
          {gcTipo === 'artista' && <Input value={gcDet} onChange={setGcDet} placeholder="Atlética / cidade (opcional)" />}
          {lineup.length > 0 && gcTipo === 'artista' && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '6px 0' }}>
              {lineup.slice(0, 8).map(l => (
                <button key={l.id} onClick={() => setGcTitulo(l.nome)}
                  style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, border: `1px solid ${C.border}`, background: C.card, color: C.dim, cursor: 'pointer' }}>
                  {l.nome}
                </button>
              ))}
            </div>
          )}
          <ArTirar
            arDisabled={!gcTitulo.trim()}
            onAr={() => apply({ gc_on: true, gc_tipo: gcTipo, gc_titulo: gcTitulo, gc_subtitulo: gcSub || null, gc_detalhe: gcDet || null }, { acao: 'gc_ar', rotulo: `${gcTipo}: ${gcTitulo}` })}
            onTirar={() => apply({ gc_on: false })}
            ativo={e.gc_on}
          />
        </Painel>

        {/* Now Playing */}
        <Painel icon={<Music size={15} />} titulo="Tocando Agora" ativo={e.np_on}>
          <Input value={npMusica} onChange={setNpMusica} placeholder="Nome da música" />
          <Input value={npArtista} onChange={setNpArtista} placeholder="Artista (opcional)" />
          <ArTirar
            arDisabled={!npMusica.trim()}
            onAr={() => apply({ np_on: true, np_musica: npMusica, np_artista: npArtista || null }, { acao: 'np_ar', rotulo: `♪ ${npMusica}` })}
            onTirar={() => apply({ np_on: false })}
            ativo={e.np_on}
          />
        </Painel>

        {/* VT — cue + countdown */}
        <Painel icon={<Film size={15} />} titulo="VT · Cue" ativo={!!e.vt_on}>
          {e.vt_on && e.vt_fim_ts ? (
            <div style={{ marginBottom: 10, textAlign: 'center', padding: '10px', borderRadius: 10, background: 'rgba(92,104,232,0.12)', border: `1px solid #5C68E855` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: '#8b95f0' }}>NO AR: {e.vt_nome}</div>
              <Countdown alvo={e.vt_fim_ts} grande />
              <div style={{ fontSize: 10, color: C.mute, marginTop: 2 }}>volta em…</div>
            </div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
            {vts.length === 0 && <p style={{ fontSize: 11, color: C.mute }}>Sem VTs. Cadastre em <Link href="/broadcast/preparar" style={{ color: C.gold }}>Preparar</Link>.</p>}
            {vts.map(vt => {
              const p = vt.patroc_id ? patrocinadores.find(x => x.id === vt.patroc_id) : null
              return (
                <button key={vt.id}
                  onClick={() => { setE(prev => ({ ...prev, vt_on: true, vt_nome: vt.nome, vt_fim_ts: new Date(Date.now() + vt.duracao_seg * 1000).toISOString() })); startTransition(() => { rollVT(vt.nome, vt.duracao_seg, vt.patroc_id) }) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.cream, cursor: 'pointer', textAlign: 'left' }}>
                  <Play size={13} style={{ color: '#5C68E8', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vt.nome}{p && <span style={{ color: C.mute }}> · {p.nome}</span>}</span>
                  <span style={{ fontSize: 11, color: C.mute, fontVariantNumeric: 'tabular-nums' }}>{fmtDurShort(vt.duracao_seg)}</span>
                </button>
              )
            })}
          </div>
          <button onClick={() => { setE(prev => ({ ...prev, vt_on: false })); startTransition(() => { pararVT() }) }} disabled={!e.vt_on} style={tirarStyle(!!e.vt_on)}>
            <Square size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />ENCERRAR VT
          </button>
        </Painel>

        {/* Patrocinador */}
        <Painel icon={<Megaphone size={15} />} titulo="Patrocinador" ativo={e.patroc_on}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
            {[['apresenta', 'Apresenta'], ['apoio', 'Apoio'], ['card', 'Patrocínio']].map(([v, lbl]) => (
              <button key={v} onClick={() => setPatrocModo(v)}
                style={{ flex: 1, padding: '5px', borderRadius: 8, border: `1px solid ${patrocModo === v ? C.gold : C.border}`, background: patrocModo === v ? `${C.gold}1a` : 'transparent', color: patrocModo === v ? C.gold : C.dim, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
            {patrocinadores.map(p => (
              <button key={p.id}
                onClick={() => apply({ patroc_on: true, patroc_id: p.id, patroc_modo: patrocModo }, { acao: 'patroc_ar', rotulo: `${patrocModo}: ${p.nome}`, patrocId: p.id })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${e.patroc_id === p.id && e.patroc_on ? C.red : C.border}`,
                  background: e.patroc_id === p.id && e.patroc_on ? 'rgba(239,68,68,0.10)' : C.card,
                }}>
                {p.logo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.logo_url} alt={p.nome} style={{ height: 22, maxWidth: '100%', objectFit: 'contain', background: '#fff', borderRadius: 3, padding: 2 }} />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: C.cream }}>{p.nome}</span>}
                <span style={{ fontSize: 8, color: C.mute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{p.cota ?? p.nome}</span>
              </button>
            ))}
          </div>
          <button onClick={() => apply({ patroc_on: false })} disabled={!e.patroc_on}
            style={tirarStyle(e.patroc_on)}>TIRAR</button>
        </Painel>

        {/* Placa full-screen */}
        <Painel icon={<Award size={15} />} titulo="Placa / Tela Cheia" ativo={e.placa_on}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {[['abertura', 'Abertura'], ['a_seguir', 'A Seguir'], ['premiacao', 'Premiação'], ['encerramento', 'Encerramento']].map(([v, lbl]) => (
              <button key={v} onClick={() => setPlacaT(v)}
                style={{ flex: 1, minWidth: 70, padding: '6px', borderRadius: 8, border: `1px solid ${placaT === v ? C.gold : C.border}`, background: placaT === v ? `${C.gold}1a` : 'transparent', color: placaT === v ? C.gold : C.dim, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                {lbl}
              </button>
            ))}
          </div>
          {(placaT === 'a_seguir' || placaT === 'premiacao' || placaT === 'encerramento') && (
            <>
              <Input value={placaL1} onChange={setPlacaL1} placeholder={placaT === 'premiacao' ? 'Atlética campeã' : placaT === 'encerramento' ? 'Mensagem (ex: Amanhã tem mais)' : 'Atração (ex: Banda X)'} />
              {placaT !== 'encerramento' && <Input value={placaL2} onChange={setPlacaL2} placeholder={placaT === 'premiacao' ? 'Pontuação (ex: 1.234 pts)' : 'Horário (ex: 22h00)'} />}
            </>
          )}
          <ArTirar
            arDisabled={!placaT}
            onAr={() => {
              const payload = placaT === 'a_seguir' ? { titulo: placaL1, linha1: placaL2 }
                : placaT === 'premiacao' ? { titulo: 'Campeão', linha1: placaL1, linha2: placaL2 }
                : placaT === 'encerramento' ? { titulo: 'Obrigado!', linha1: placaL1 }
                : { titulo: 'AO VIVO · PALCO PRINCIPAL' }
              apply({ placa_on: true, placa_tipo: placaT, placa_payload: payload }, { acao: 'placa_ar', rotulo: `Placa ${placaT}: ${placaL1}` })
            }}
            onTirar={() => apply({ placa_on: false })}
            ativo={e.placa_on}
          />
        </Painel>

        {/* Crawl */}
        <Painel icon={<Radio size={15} />} titulo="Crawl / Letreiro" ativo={e.crawl_on}>
          <textarea value={crawlTxt} onChange={ev => setCrawlTxt(ev.target.value)} placeholder="Texto que rola no rodapé…" rows={2}
            style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.cream, fontSize: 12, padding: '8px 10px', resize: 'vertical', fontFamily: FS, marginBottom: 8 }} />
          <ArTirar
            arDisabled={!crawlTxt.trim()}
            onAr={() => apply({ crawl_on: true, crawl_texto: crawlTxt }, { acao: 'crawl_ar', rotulo: 'Crawl' })}
            onTirar={() => apply({ crawl_on: false })}
            ativo={e.crawl_on}
          />
        </Painel>

        {/* Mosca */}
        <Painel icon={<Power size={15} />} titulo="Mosca / Bug" ativo={e.mosca_on}>
          <p style={{ fontSize: 11, color: C.mute, marginBottom: 10 }}>Logo CIA + selo AO VIVO no canto. Deixe sempre ligada durante a transmissão.</p>
          <button onClick={() => apply({ mosca_on: !e.mosca_on })}
            style={{ width: '100%', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 12, letterSpacing: '0.06em',
              border: `1px solid ${e.mosca_on ? C.green : C.border}`, background: e.mosca_on ? `${C.green}1a` : C.card, color: e.mosca_on ? C.green : C.dim }}>
            {e.mosca_on ? '● MOSCA LIGADA' : 'MOSCA DESLIGADA'}
          </button>
        </Painel>
      </div>
    </div>
  )
}

function fmtDurShort(seg: number) {
  const m = Math.floor(seg / 60), s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Escaleta Runner — segmento atual / próximo / TAKE NEXT ────────────────────
function EscaletaRunner({ escaleta, estado, onSegmento }: {
  escaleta: EscaletaItem[]
  estado: BroadcastEstado
  onSegmento: (it: EscaletaItem) => void
}) {
  const idx = estado.segmento_id ? escaleta.findIndex(i => i.id === estado.segmento_id) : -1
  const atual = idx >= 0 ? escaleta[idx] : null
  const prox = escaleta[idx + 1] ?? (idx < 0 ? escaleta[0] : null)
  const meta = (t: string) => ESCALETA_TIPOS.find(x => x.value === t) ?? { label: t, cor: C.gold }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      {/* Atual */}
      <div style={{ flex: 2, minWidth: 240, background: C.card, border: `1px solid ${atual ? C.red + '40' : C.border}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: atual ? C.red : C.mute }}>● NO AR AGORA</div>
          {atual ? (
            <>
              <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: 22, lineHeight: 1.05, marginTop: 2 }}>{atual.titulo}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: meta(atual.tipo).cor }}>{meta(atual.tipo).label}</span>
            </>
          ) : <div style={{ fontSize: 14, color: C.mute, marginTop: 4 }}>Nenhum segmento no ar</div>}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          {atual && estado.segmento_fim_ts && <Countdown alvo={estado.segmento_fim_ts} />}
        </div>
      </div>
      {/* Próximo + TAKE */}
      <div style={{ flex: 1.4, minWidth: 220, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: C.gold }}>PRÓXIMO</div>
          {prox ? (
            <div style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 700, fontSize: 18, lineHeight: 1.05, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prox.titulo}</div>
          ) : <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>Fim da escaleta</div>}
        </div>
        <button
          onClick={() => prox && onSegmento(prox)}
          disabled={!prox}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px', borderRadius: 10, border: `1px solid ${C.green}`, background: prox ? `${C.green}22` : C.card, color: prox ? C.green : C.mute, fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', cursor: prox ? 'pointer' : 'not-allowed', opacity: prox ? 1 : 0.5 }}>
          <SkipForward size={16} /> TAKE
        </button>
      </div>
    </div>
  )
}

// ── Countdown — conta regressiva até um timestamp ISO ─────────────────────────
function Countdown({ alvo, grande }: { alvo: string; grande?: boolean }) {
  const [rest, setRest] = useState(0)
  useEffect(() => {
    const tick = () => setRest(Math.round((new Date(alvo).getTime() - Date.now()) / 1000))
    tick(); const i = setInterval(tick, 250); return () => clearInterval(i)
  }, [alvo])
  const neg = rest < 0
  const abs = Math.abs(rest)
  const txt = `${neg ? '+' : ''}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
  const cor = neg ? C.red : abs <= 10 ? C.gold : C.cream
  return (
    <span style={{ fontFamily: FD, fontStyle: 'italic', fontWeight: 800, fontSize: grande ? 34 : 24, color: cor, fontVariantNumeric: 'tabular-nums', lineHeight: 1, display: 'block' }}>{txt}</span>
  )
}

// ── UI helpers ───────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState('')
  useEffect(() => { const f = () => setT(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' })); f(); const i = setInterval(f, 1000); return () => clearInterval(i) }, [])
  return <span style={{ fontFamily: FD, fontStyle: 'italic', fontSize: 22, fontWeight: 700, color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{t}</span>
}

function Tag({ label, live }: { label: string; live?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '4px 10px', border: `1px solid ${live ? C.red + '55' : C.border}`, background: live ? 'rgba(239,68,68,0.10)' : C.card, color: live ? C.red : C.dim, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {live && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />}{label}
    </span>
  )
}

function Painel({ icon, titulo, ativo, children }: { icon: React.ReactNode; titulo: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${ativo ? C.red + '40' : C.border}`, borderRadius: 14, padding: 14, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ color: ativo ? C.red : C.gold }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.dim }}>{titulo}</span>
        {ativo && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: C.red, letterSpacing: '0.1em' }}>● NO AR</span>}
      </div>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.cream, fontSize: 13, padding: '8px 10px', marginBottom: 7, fontFamily: FS, outline: 'none' }} />
  )
}

function tirarStyle(ativo: boolean): React.CSSProperties {
  return { width: '100%', padding: '9px', borderRadius: 8, cursor: ativo ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 12, letterSpacing: '0.06em', border: `1px solid ${ativo ? C.red + '55' : C.border}`, background: ativo ? 'rgba(239,68,68,0.10)' : C.card, color: ativo ? C.red : C.mute, opacity: ativo ? 1 : 0.5 }
}

function ArTirar({ onAr, onTirar, ativo, arDisabled }: { onAr: () => void; onTirar: () => void; ativo: boolean; arDisabled?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 7 }}>
      <button onClick={onAr} disabled={arDisabled}
        style={{ flex: 2, padding: '10px', borderRadius: 8, cursor: arDisabled ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', border: `1px solid ${C.green}`, background: arDisabled ? C.card : `${C.green}22`, color: arDisabled ? C.mute : C.green, opacity: arDisabled ? 0.5 : 1 }}>
        ● NO AR
      </button>
      <button onClick={onTirar} disabled={!ativo}
        style={{ flex: 1, padding: '10px', borderRadius: 8, cursor: ativo ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 12, border: `1px solid ${C.border}`, background: C.card, color: ativo ? C.cream : C.mute, opacity: ativo ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <X size={13} /> Tirar
      </button>
    </div>
  )
}
