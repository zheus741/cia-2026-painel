'use client'

/**
 * BracketView — Chaveamento single-elimination CIA 2026
 *
 * Layout absoluto + SVG connectors. Paleta monocromatica verde CIA,
 * intensidade crescente rumo ao centro. Ouro somente na final.
 */

import Link from 'next/link'
import { Trophy, Crown, Radio, UserX } from 'lucide-react'
import type { JogoChave, ChaveConfig } from './ChaveamentoClient'
import {
  buildGames,
  canonTeamName,
  type BracketGame,
  type BracketSlot,
} from '@/lib/chaveamento/bracket-builder'

// ─── Layout ───────────────────────────────────────────────────────────────────
const CARD_H = 66
const COL_W  = 136
const GAP    = 16
const ROW_H  = 126
const HDR_H  = 30

// 16 teams → width ≈ 7×136 + 6×16 = 952+96 = 1048px, height = 3×126+66 = 444px

// ─── Design tokens ────────────────────────────────────────────────────────────
// Monocromatico: mesmo verde em intensidades crescentes por rodada
const T = {
  // Intensidade por rodada (L→R vai aumentando; espelhado no R←L)
  oitava: {
    bar:    'rgba(34,197,94,0.55)',
    border: 'rgba(34,197,94,0.18)',
    bg:     'rgba(34,197,94,0.03)',
    hdr:    'rgba(34,197,94,0.60)',
  },
  quarta: {
    bar:    'rgba(34,197,94,0.70)',
    border: 'rgba(34,197,94,0.25)',
    bg:     'rgba(34,197,94,0.05)',
    hdr:    'rgba(34,197,94,0.70)',
  },
  semi: {
    bar:    'rgba(34,197,94,0.90)',
    border: 'rgba(34,197,94,0.35)',
    bg:     'rgba(34,197,94,0.07)',
    hdr:    '#22c55e',
  },
  final: {
    bar:    '#e8b94f',
    border: 'rgba(232,185,79,0.40)',
    bg:     'rgba(232,185,79,0.06)',
    hdr:    '#e8b94f',
  },
  live: {
    bar:    '#ef4444',
    border: 'rgba(239,68,68,0.35)',
    bg:     'rgba(239,68,68,0.05)',
    hdr:    '#ef4444',
  },
  def: {  // "A definir"
    border: 'rgba(34,197,94,0.20)',
    bg:     'transparent',
  },
} as const

const CONN_COLOR = 'rgba(34,197,94,0.40)'
const CONN_W     = 2

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtHora(ts: string | null): string {
  if (!ts) return ''
  try { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) }
  catch { return '' }
}
function fmtData(ts: string | null): string {
  if (!ts) return ''
  try { return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
  catch { return '' }
}
function getWinner(j: JogoChave): 'a' | 'b' | null {
  if (j.status !== 'encerrado') return null
  if (j.wo === 'a') return 'b'
  if (j.wo === 'b') return 'a'
  if (j.placar_a != null && j.placar_b != null) {
    if (j.placar_a > j.placar_b) return 'a'
    if (j.placar_b > j.placar_a) return 'b'
  }
  return null
}

// ─── Position computation ─────────────────────────────────────────────────────
const LEAF_L = ['o_Q1_sup','o_Q1_inf','o_Q4_sup','o_Q4_inf','q_Q1','q_Q4','semL']
const LEAF_R = ['o_Q2_sup','o_Q2_inf','o_Q3_sup','o_Q3_inf','q_Q2','q_Q3','semR']

interface BPos { x: number; y: number }

function computeLayout(games: BracketGame[]) {
  const gm = new Map(games.map(g => [g.id, g]))
  const allDirect = (id: string) =>
    gm.get(id)?.slots.every(s => s.type === 'direct') ?? false

  const lLeaves = LEAF_L.filter(allDirect)
  const rLeaves = LEAF_R.filter(allDirect)
  const nLeaves = Math.max(lLeaves.length, rLeaves.length, 1)

  const ru = new Map<string, number>()
  lLeaves.forEach((id, i) => ru.set(id, i))
  rLeaves.forEach((id, i) => ru.set(id, i))

  function row(id: string): number {
    if (ru.has(id)) return ru.get(id)!
    const g = gm.get(id)
    if (!g) return (nLeaves - 1) / 2
    const f = g.slots.filter(s => s.type === 'feeder' && s.gameId).map(s => s.gameId!)
    if (!f.length) { const v = (nLeaves - 1) / 2; ru.set(id, v); return v }
    const v = f.reduce((s, fid) => s + row(fid), 0) / f.length
    ru.set(id, v); return v
  }
  games.forEach(g => row(g.id))

  const rounds = new Set(games.map(g => g.round))
  const colDefs: Array<{ key: string; label: string }> = []
  if (rounds.has('oitava')) colDefs.push({ key: 'oitava-L', label: 'Oitavas' })
  if (rounds.has('quarta')) colDefs.push({ key: 'quarta-L', label: 'Quartas' })
  if (rounds.has('semi'))   colDefs.push({ key: 'semi-L',   label: 'Semifinal' })
  colDefs.push({ key: 'final', label: 'Final' })
  if (rounds.has('semi'))   colDefs.push({ key: 'semi-R',   label: 'Semifinal' })
  if (rounds.has('quarta')) colDefs.push({ key: 'quarta-R', label: 'Quartas' })
  if (rounds.has('oitava')) colDefs.push({ key: 'oitava-R', label: 'Oitavas' })

  const cols = colDefs.map((c, i) => ({ ...c, x: i * (COL_W + GAP) }))
  const cxk  = new Map(cols.map(c => [c.key, c.x]))

  function gx(g: BracketGame): number {
    return cxk.get(g.round === 'final' ? 'final' : `${g.round}-${g.side}`) ?? 0
  }

  const pos = new Map<string, BPos>()
  games.forEach(g => pos.set(g.id, { x: gx(g), y: row(g.id) * ROW_H }))

  return {
    pos,
    cols,
    totalW: cols.length * COL_W + (cols.length - 1) * GAP,
    totalH: (nLeaves - 1) * ROW_H + CARD_H,
    nLeaves,
  }
}

// ─── SVG connectors ───────────────────────────────────────────────────────────
function buildPaths(games: BracketGame[], pos: Map<string, BPos>): string[] {
  const paths: string[] = []

  for (const game of games) {
    const feeders = game.slots
      .filter(s => s.type === 'feeder' && s.gameId)
      .map(s => s.gameId!)
    if (!feeders.length) continue

    const pp = pos.get(game.id)
    if (!pp) continue
    const pCY = pp.y + CARD_H / 2

    if (game.round === 'final') {
      const lId = game.slots[0].type === 'feeder' ? (game.slots[0].gameId ?? null) : null
      const rId = game.slots[1].type === 'feeder' ? (game.slots[1].gameId ?? null) : null
      if (lId) {
        const fp = pos.get(lId)
        if (fp) {
          const fCY = fp.y + CARD_H / 2
          const mx  = fp.x + COL_W + GAP / 2
          paths.push(
            Math.abs(fCY - pCY) < 1
              ? `M ${fp.x + COL_W} ${fCY} H ${pp.x}`
              : `M ${fp.x + COL_W} ${fCY} H ${mx} V ${pCY} H ${pp.x}`,
          )
        }
      }
      if (rId) {
        const fp = pos.get(rId)
        if (fp) {
          const fCY = fp.y + CARD_H / 2
          const mx  = pp.x + COL_W + GAP / 2
          paths.push(
            Math.abs(fCY - pCY) < 1
              ? `M ${fp.x} ${fCY} H ${pp.x + COL_W}`
              : `M ${fp.x} ${fCY} H ${mx} V ${pCY} H ${pp.x + COL_W}`,
          )
        }
      }
    } else if (game.side === 'R') {
      const f0p = pos.get(feeders[0])
      const f1p = feeders[1] ? pos.get(feeders[1]) : null
      if (f0p) {
        const mx = pp.x + COL_W + GAP / 2
        if (f1p && feeders.length === 2) {
          const c0 = f0p.y + CARD_H / 2, c1 = f1p.y + CARD_H / 2
          paths.push(`M ${f0p.x} ${c0} H ${mx} M ${mx} ${c0} V ${c1} M ${f1p.x} ${c1} H ${mx} M ${mx} ${pCY} H ${pp.x + COL_W}`)
        } else {
          const fc = f0p.y + CARD_H / 2
          paths.push(Math.abs(fc - pCY) < 1
            ? `M ${f0p.x} ${fc} H ${pp.x + COL_W}`
            : `M ${f0p.x} ${fc} H ${mx} V ${pCY} H ${pp.x + COL_W}`)
        }
      }
    } else {
      const f0p = pos.get(feeders[0])
      const f1p = feeders[1] ? pos.get(feeders[1]) : null
      if (f0p) {
        const mx = f0p.x + COL_W + GAP / 2
        if (f1p && feeders.length === 2) {
          const c0 = f0p.y + CARD_H / 2, c1 = f1p.y + CARD_H / 2
          paths.push(`M ${f0p.x + COL_W} ${c0} H ${mx} M ${mx} ${c0} V ${c1} M ${f1p.x + COL_W} ${c1} H ${mx} M ${mx} ${pCY} H ${pp.x}`)
        } else {
          const fc = f0p.y + CARD_H / 2
          paths.push(Math.abs(fc - pCY) < 1
            ? `M ${f0p.x + COL_W} ${fc} H ${pp.x}`
            : `M ${f0p.x + COL_W} ${fc} H ${mx} V ${pCY} H ${pp.x}`)
        }
      }
    }
  }

  return paths
}

// ─── Quadrant background regions ──────────────────────────────────────────────
// Retângulos sutis no SVG para agrupar visualmente os jogos de cada Q
interface QRegion { x: number; y: number; w: number; h: number; q: string; label: string }

function buildQRegions(pos: Map<string, BPos>): QRegion[] {
  const regions: QRegion[] = []
  const pairs: Array<[string, string, string, string]> = [
    ['o_Q1_sup','o_Q1_inf','Q1','Q1'],
    ['o_Q4_sup','o_Q4_inf','Q4','Q4'],
    ['o_Q2_sup','o_Q2_inf','Q2','Q2'],
    ['o_Q3_sup','o_Q3_inf','Q3','Q3'],
  ]
  for (const [supId, infId, q, label] of pairs) {
    const sup = pos.get(supId)
    const inf = pos.get(infId)
    if (!sup) continue
    const topY = sup.y - 6
    const botY = (inf ?? sup).y + CARD_H + 6
    regions.push({
      x: sup.x - 4,
      y: topY,
      w: COL_W + 8,
      h: botY - topY,
      q,
      label,
    })
  }
  return regions
}

// ─── Enrich ───────────────────────────────────────────────────────────────────
interface RSlot { display: string; pos?: number; canon?: string; isFeeder: boolean }
interface EGame  { bg: BracketGame; sA: RSlot; sB: RSlot; jogo: JogoChave | null }

function rslot(slot: BracketSlot, seeds: string[]): RSlot {
  if (slot.type === 'feeder') return { display: 'A definir', isFeeder: true }
  if (!slot.pos) return { display: '?', isFeeder: false }
  const name = seeds[slot.pos - 1] ?? ''
  return { display: name || `P${slot.pos}`, pos: slot.pos, canon: canonTeamName(name), isFeeder: false }
}

function enrich(games: BracketGame[], seeds: string[], jogos: JogoChave[]): EGame[] {
  return games.map(g => {
    const sA = rslot(g.slots[0], seeds)
    const sB = rslot(g.slots[1], seeds)
    let jogo: JogoChave | null = null
    if (sA.canon && sB.canon) {
      jogo = jogos.find(j => {
        const ja = canonTeamName(j.equipe_a_nome), jb = canonTeamName(j.equipe_b_nome)
        return (ja === sA.canon && jb === sB.canon) || (ja === sB.canon && jb === sA.canon)
      }) ?? null
    } else if (sA.canon) {
      jogo = jogos.find(j => {
        const ja = canonTeamName(j.equipe_a_nome), jb = canonTeamName(j.equipe_b_nome)
        return ja === sA.canon || jb === sA.canon
      }) ?? null
    }
    return { bg: g, sA, sB, jogo }
  })
}

// ─── Card components ──────────────────────────────────────────────────────────

function TeamRow({
  slot, realName, cor, placar, isWin, isWO, showPlacar,
}: {
  slot: RSlot; realName: string | null; cor: string | null
  placar: number | null; isWin: boolean; isWO: boolean; showPlacar: boolean
}) {
  const display  = realName ?? slot.display
  const hasTeam  = !slot.isFeeder && !!slot.canon

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 5,
      paddingLeft: 8, paddingRight: 7, minHeight: 0, overflow: 'hidden',
      background: isWin ? 'rgba(34,197,94,0.07)' : 'transparent',
    }}>
      {/* Colour stripe */}
      <span style={{
        width: 2, height: 12, borderRadius: 2, flexShrink: 0,
        background: hasTeam ? (cor ?? 'var(--muted-foreground)') : 'var(--border)',
        opacity: hasTeam ? 1 : 0.4,
      }} />

      {/* Seed */}
      {slot.pos !== undefined && (
        <span style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          height: 13, borderRadius: 3, padding: '0 3px',
          background: 'var(--muted)', fontSize: 8, fontWeight: 700,
          color: 'var(--muted-foreground)', letterSpacing: '0.04em',
        }}>
          P{slot.pos}
        </span>
      )}

      {/* Name */}
      <span style={{
        flex: 1, fontSize: 10, fontWeight: 600, lineHeight: 1.1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: slot.isFeeder || !hasTeam ? 'var(--muted-foreground)'
             : isWO                      ? 'var(--muted-foreground)'
             : isWin                     ? '#22c55e'
             :                             'var(--foreground)',
        opacity: (slot.isFeeder || !hasTeam) ? 0.40 : isWO ? 0.45 : 1,
        fontStyle: slot.isFeeder ? 'italic' : 'normal',
        textDecoration: isWO ? 'line-through' : 'none',
      }}>
        {display}
      </span>

      {/* Score */}
      {showPlacar && (
        <span style={{
          flexShrink: 0, fontSize: 12, fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: isWin ? '#22c55e' : 'var(--muted-foreground)',
          opacity: isWO ? 0.35 : 0.9,
        }}>
          {isWO ? '—' : (placar ?? 0)}
        </span>
      )}

      {/* Crown */}
      {isWin && <Crown style={{ width: 10, height: 10, color: '#e8b94f', flexShrink: 0 }} />}
    </div>
  )
}

function MatchCard({ ent }: { ent: EGame }) {
  const { bg, sA, sB, jogo } = ent
  const isReal  = jogo !== null
  const isLive  = jogo?.status === 'ao_vivo'
  const isEnd   = jogo?.status === 'encerrado'
  const win     = jogo ? getWinner(jogo) : null
  const isDef   = sA.isFeeder && sB.isFeeder
  const isWO    = !!jogo?.wo && jogo.wo !== null

  // Pick token set by round (live overrides all)
  const tok = isLive ? T.live
    : bg.round === 'final' ? T.final
    : bg.round === 'semi'  ? T.semi
    : bg.round === 'quarta'? T.quarta
    :                        T.oitava

  const card = (
    <div style={{
      width: COL_W, height: CARD_H,
      display: 'flex', flexDirection: 'column',
      borderRadius: 8,
      border: isDef
        ? `1.5px dashed ${T.def.border}`
        : `1px solid ${tok.border}`,
      background: isDef ? T.def.bg : (isReal ? tok.bg : 'transparent'),
      overflow: 'hidden',
      opacity: isDef ? 0.5 : 1,
      transition: 'box-shadow 0.15s',
      ...(bg.round === 'final' && isReal ? {
        boxShadow: '0 0 24px rgba(232,185,79,0.15), inset 0 0 0 1px rgba(232,185,79,0.25)',
      } : {}),
      ...(isLive ? { boxShadow: '0 0 16px rgba(239,68,68,0.18)' } : {}),
    }}>

      {/* Header row: left bar + meta */}
      <div style={{
        display: 'flex', flexShrink: 0, height: 18,
        borderBottom: isDef
          ? '1px solid rgba(34,197,94,0.12)'
          : `1px solid ${tok.border}`,
        background: isDef ? 'transparent' : `${tok.bg}`,
      }}>
        {/* Left accent bar */}
        {!isDef && (
          <div style={{
            width: 3, flexShrink: 0,
            background: tok.bar,
            borderRadius: '7px 0 0 0',
          }} />
        )}

        {/* Meta */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          paddingLeft: isDef ? 8 : 5, paddingRight: 7, gap: 4,
        }}>
          <span style={{
            fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: isDef ? 'var(--muted-foreground)' : tok.hdr,
            opacity: isDef ? 0.4 : 1,
          }}>
            {isDef ? `Jogo ${bg.num}` : `JOGO ${bg.num}`}
          </span>

          {jogo?.inicio && (
            <span style={{
              marginLeft: 'auto', fontSize: 7, whiteSpace: 'nowrap',
              color: 'var(--muted-foreground)', opacity: 0.5,
            }}>
              {fmtData(jogo.inicio)} · {fmtHora(jogo.inicio)}
            </span>
          )}

          {isLive && <Radio style={{ width: 8, height: 8, color: '#ef4444', flexShrink: 0 }} className="animate-pulse" />}
          {isWO && !isLive && <UserX style={{ width: 8, height: 8, color: '#f87171', flexShrink: 0, opacity: 0.7 }} />}
        </div>
      </div>

      {/* Team A */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isDef && <div style={{ width: 3, background: tok.bar, flexShrink: 0 }} />}
        <TeamRow
          slot={sA} realName={jogo?.equipe_a_nome ?? null}
          cor={jogo?.equipe_a?.cor_primaria ?? null}
          placar={jogo?.placar_a ?? null}
          isWin={win === 'a'}
          isWO={jogo?.wo === 'a' || jogo?.wo === 'duplo'}
          showPlacar={isLive || isEnd}
        />
      </div>

      {/* Divider */}
      <div style={{
        height: 1, flexShrink: 0,
        background: isDef ? 'rgba(34,197,94,0.10)' : tok.border,
        marginLeft: isDef ? 0 : 3,
      }} />

      {/* Team B */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isDef && <div style={{ width: 3, background: tok.bar, flexShrink: 0, borderRadius: '0 0 0 7px' }} />}
        <TeamRow
          slot={sB} realName={jogo?.equipe_b_nome ?? null}
          cor={jogo?.equipe_b?.cor_primaria ?? null}
          placar={jogo?.placar_b ?? null}
          isWin={win === 'b'}
          isWO={jogo?.wo === 'b' || jogo?.wo === 'duplo'}
          showPlacar={isLive || isEnd}
        />
      </div>
    </div>
  )

  if (isReal) {
    return (
      <Link
        href={`/placar?dia=${jogo!.dia_id}#jogo-${jogo!.id}`}
        style={{ display: 'block', textDecoration: 'none' }}
      >
        <div style={{ transition: 'transform 0.12s, box-shadow 0.12s' }}
          className="hover:scale-[1.018]">
          {card}
        </div>
      </Link>
    )
  }
  return card
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function BracketView({ jogos, config }: { jogos: JogoChave[]; config: ChaveConfig | null }) {
  if (!config) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
        <p className="text-sm text-[var(--muted-foreground)]">Chave sem configuração cadastrada.</p>
      </div>
    )
  }

  const bracketGames  = buildGames(config.num_teams)
  const enriched      = enrich(bracketGames, config.seeds, jogos)
  const { pos, cols, totalW, totalH } = computeLayout(bracketGames)
  const connPaths = buildPaths(bracketGames, pos)
  const qRegions  = buildQRegions(pos)

  // Q label positions (above each quadrant first game)
  const Q_IDS: Array<{ id: string; label: string }> = [
    { id: 'o_Q1_sup', label: 'Quadrante 1' },
    { id: 'o_Q4_sup', label: 'Quadrante 4' },
    { id: 'o_Q2_sup', label: 'Quadrante 2' },
    { id: 'o_Q3_sup', label: 'Quadrante 3' },
  ]
  const qLabels = Q_IDS.flatMap(({ id, label }) => {
    const p = pos.get(id)
    return p ? [{ x: p.x, y: p.y, label }] : []
  })
  const hasQLabels = qLabels.length > 0
  const QLABEL_SPACE = hasQLabels ? 22 : 0
  const extraTop = HDR_H + QLABEL_SPACE
  const fullH    = totalH + extraTop

  // Champion
  const fin  = enriched.find(e => e.bg.round === 'final')
  const champ = (() => {
    if (!fin?.jogo || fin.jogo.status !== 'encerrado') return null
    const w = getWinner(fin.jogo)
    const nome = w === 'a' ? fin.jogo.equipe_a_nome : w === 'b' ? fin.jogo.equipe_b_nome : null
    const cor  = w === 'a' ? fin.jogo.equipe_a?.cor_primaria : w === 'b' ? fin.jogo.equipe_b?.cor_primaria : null
    return nome ? { nome, cor: cor ?? null } : null
  })()

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--card)]/20 p-3 md:p-5"
        style={{ overflowX: 'auto' }}
      >
        <div style={{ position: 'relative', width: totalW, height: fullH, minWidth: totalW }}>

          {/* ── Column headers ── */}
          {cols.map(col => {
            const isFin  = col.key === 'final'
            const isSemi = col.key === 'semi-L' || col.key === 'semi-R'
            return (
              <div key={col.key} style={{
                position: 'absolute', left: col.x, top: 0,
                width: COL_W, height: HDR_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: isFin
                  ? '1px solid rgba(232,185,79,0.30)'
                  : isSemi
                  ? '1px solid rgba(34,197,94,0.25)'
                  : '1px solid var(--border)',
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: isFin ? '#e8b94f' : isSemi ? '#22c55e' : 'var(--muted-foreground)',
                  opacity: isFin ? 1 : isSemi ? 0.85 : 0.45,
                }}>
                  {col.label}
                </span>
              </div>
            )
          })}

          {/* ── Quadrant labels ── */}
          {qLabels.map((ql, i) => (
            <div key={i} style={{
              position: 'absolute', left: ql.x, top: HDR_H + 3,
              width: COL_W, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'rgba(34,197,94,0.7)', flexShrink: 0,
              }} />
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: '#22c55e', opacity: 0.65,
              }}>
                {ql.label}
              </span>
            </div>
          ))}

          {/* ── SVG: quadrant regions + connectors ── */}
          <svg style={{
            position: 'absolute', left: 0, top: extraTop,
            width: totalW, height: totalH,
            pointerEvents: 'none', overflow: 'visible',
          }} fill="none">

            {/* Quadrant background regions */}
            {qRegions.map((r, i) => (
              <g key={i}>
                <rect
                  x={r.x} y={r.y} width={r.w} height={r.h}
                  rx={10} ry={10}
                  fill="rgba(34,197,94,0.04)"
                  stroke="rgba(34,197,94,0.12)"
                  strokeWidth={1}
                />
                {/* Q label inside region — top right corner */}
                <text
                  x={r.x + r.w - 8}
                  y={r.y + 14}
                  fontSize={9}
                  fontWeight={700}
                  fill="rgba(34,197,94,0.45)"
                  textAnchor="end"
                  fontFamily="system-ui"
                  letterSpacing="0.1em"
                >
                  {r.label}
                </text>
              </g>
            ))}

            {/* Connector lines */}
            {connPaths.map((d, i) => (
              <path
                key={i} d={d}
                stroke={CONN_COLOR}
                strokeWidth={CONN_W}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {/* ── Game cards ── */}
          {enriched.map(ent => {
            const p = pos.get(ent.bg.id)
            if (!p) return null
            return (
              <div key={ent.bg.id} style={{
                position: 'absolute', left: p.x, top: p.y + extraTop,
              }}>
                <MatchCard ent={ent} />
              </div>
            )
          })}

        </div>

        <p className="mt-2 text-center text-[9px] text-[var(--muted-foreground)]/30 md:hidden">
          ← deslize para ver toda a chave →
        </p>
      </div>

      {/* Champion */}
      {champ && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/8 via-amber-300/4 to-transparent p-8">
          <Crown className="h-10 w-10 text-amber-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Campeão</p>
          <p className="text-2xl font-extrabold" style={{ color: champ.cor ?? 'var(--foreground)' }}>
            {champ.nome}
          </p>
        </div>
      )}
    </div>
  )
}
