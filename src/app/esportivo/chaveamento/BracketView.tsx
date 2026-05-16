'use client'

/**
 * BracketView — Chaveamento single-elimination CIA 2026
 *
 * Posicionamento absoluto por rodada + SVG overlay para conectores.
 * Desktop: cabe na tela sem scroll. Mobile: overflow-x auto.
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

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_H  = 68   // card height px
const COL_W   = 132  // column width px
const GAP     = 14   // gap between columns px
const ROW_H   = 140  // distance top→top between consecutive leaf rows px
const HDR_H   = 28   // column header height px
const QL_H    = 18   // quadrant label height px

// For 16 teams:
//   width  = 7 × 132 + 6 × 14 = 924 + 84 = 1008 px
//   height = 3 × 140 + 68 = 488 px (+ HDR_H + QL_H)

// ─── Palette ──────────────────────────────────────────────────────────────────
const ACCENT: Record<string, { color: string; subtle: string }> = {
  Q1: { color: '#22c55e', subtle: 'rgba(34,197,94,0.07)'    },
  Q2: { color: '#60a5fa', subtle: 'rgba(96,165,250,0.07)'   },
  Q3: { color: '#f59e0b', subtle: 'rgba(245,158,11,0.07)'   },
  Q4: { color: '#a78bfa', subtle: 'rgba(167,139,250,0.07)'  },
  gold:  { color: '#e8b94f', subtle: 'rgba(232,185,79,0.06)'  },
  green: { color: '#6ab87e', subtle: 'rgba(106,184,126,0.06)' },
  live:  { color: '#ef4444', subtle: 'rgba(239,68,68,0.05)'   },
}

const CONN_STROKE = 'rgba(74,138,92,0.32)'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtHora(ts: string | null): string {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
  } catch { return '' }
}
function fmtData(ts: string | null): string {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch { return '' }
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

// Canonical leaf ordering top→bottom per side
const LEAF_L = ['o_Q1_sup','o_Q1_inf','o_Q4_sup','o_Q4_inf','q_Q1','q_Q4','semL']
const LEAF_R = ['o_Q2_sup','o_Q2_inf','o_Q3_sup','o_Q3_inf','q_Q2','q_Q3','semR']

interface BPos { x: number; y: number }

function computeLayout(games: BracketGame[]) {
  const gm = new Map(games.map(g => [g.id, g]))
  const allDirect = (id: string) =>
    gm.get(id)?.slots.every(s => s.type === 'direct') ?? false

  // 1. Identify leaves in visual order
  const lLeaves = LEAF_L.filter(allDirect)
  const rLeaves = LEAF_R.filter(allDirect)
  const nLeaves = Math.max(lLeaves.length, rLeaves.length, 1)

  // 2. Assign row units to leaves
  const ru = new Map<string, number>()
  lLeaves.forEach((id, i) => ru.set(id, i))
  rLeaves.forEach((id, i) => ru.set(id, i))

  // 3. Recurse to parent positions
  function row(id: string): number {
    if (ru.has(id)) return ru.get(id)!
    const g = gm.get(id)
    if (!g) return (nLeaves - 1) / 2
    const feeders = g.slots
      .filter(s => s.type === 'feeder' && s.gameId)
      .map(s => s.gameId!)
    if (!feeders.length) {
      const r = (nLeaves - 1) / 2
      ru.set(id, r)
      return r
    }
    const v = feeders.reduce((s, f) => s + row(f), 0) / feeders.length
    ru.set(id, v)
    return v
  }
  games.forEach(g => row(g.id))

  // 4. Determine which round-columns are present
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
    const key = g.round === 'final' ? 'final' : `${g.round}-${g.side}`
    return cxk.get(key) ?? 0
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

// ─── SVG connector builder ────────────────────────────────────────────────────

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
      // slot[0] = left feeder (semiL), slot[1] = right feeder (semiR)
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
      // Feeders are to the RIGHT → connector from feeder.left to parent.right
      const f0p = pos.get(feeders[0])
      const f1p = feeders[1] ? pos.get(feeders[1]) : null
      if (f0p) {
        const mx = pp.x + COL_W + GAP / 2
        if (f1p && feeders.length === 2) {
          const c0 = f0p.y + CARD_H / 2
          const c1 = f1p.y + CARD_H / 2
          paths.push(
            `M ${f0p.x} ${c0} H ${mx}` +
            ` M ${mx} ${c0} V ${c1}` +
            ` M ${f1p.x} ${c1} H ${mx}` +
            ` M ${mx} ${pCY} H ${pp.x + COL_W}`,
          )
        } else {
          const fc = f0p.y + CARD_H / 2
          paths.push(
            Math.abs(fc - pCY) < 1
              ? `M ${f0p.x} ${fc} H ${pp.x + COL_W}`
              : `M ${f0p.x} ${fc} H ${mx} V ${pCY} H ${pp.x + COL_W}`,
          )
        }
      }
    } else {
      // L side: feeders to the LEFT → connector from feeder.right to parent.left
      const f0p = pos.get(feeders[0])
      const f1p = feeders[1] ? pos.get(feeders[1]) : null
      if (f0p) {
        const mx = f0p.x + COL_W + GAP / 2
        if (f1p && feeders.length === 2) {
          const c0 = f0p.y + CARD_H / 2
          const c1 = f1p.y + CARD_H / 2
          paths.push(
            `M ${f0p.x + COL_W} ${c0} H ${mx}` +
            ` M ${mx} ${c0} V ${c1}` +
            ` M ${f1p.x + COL_W} ${c1} H ${mx}` +
            ` M ${mx} ${pCY} H ${pp.x}`,
          )
        } else {
          const fc = f0p.y + CARD_H / 2
          paths.push(
            Math.abs(fc - pCY) < 1
              ? `M ${f0p.x + COL_W} ${fc} H ${pp.x}`
              : `M ${f0p.x + COL_W} ${fc} H ${mx} V ${pCY} H ${pp.x}`,
          )
        }
      }
    }
  }

  return paths
}

// ─── Enriched game ────────────────────────────────────────────────────────────

interface RSlot {
  display:  string
  pos?:     number
  canon?:   string
  isFeeder: boolean
}
interface EGame {
  bg:   BracketGame
  sA:   RSlot
  sB:   RSlot
  jogo: JogoChave | null
}

function rslot(slot: BracketSlot, seeds: string[]): RSlot {
  if (slot.type === 'feeder') return { display: 'A definir', isFeeder: true }
  if (!slot.pos) return { display: '?', isFeeder: false }
  const name = seeds[slot.pos - 1] ?? ''
  return {
    display:  name || `P${slot.pos}`,
    pos:      slot.pos,
    canon:    canonTeamName(name),
    isFeeder: false,
  }
}

function enrich(
  games: BracketGame[],
  seeds: string[],
  jogos: JogoChave[],
): EGame[] {
  return games.map(g => {
    const sA = rslot(g.slots[0], seeds)
    const sB = rslot(g.slots[1], seeds)
    let jogo: JogoChave | null = null
    if (sA.canon && sB.canon) {
      jogo = jogos.find(j => {
        const ja = canonTeamName(j.equipe_a_nome)
        const jb = canonTeamName(j.equipe_b_nome)
        return (
          (ja === sA.canon && jb === sB.canon) ||
          (ja === sB.canon && jb === sA.canon)
        )
      }) ?? null
    } else if (sA.canon) {
      jogo = jogos.find(j => {
        const ja = canonTeamName(j.equipe_a_nome)
        const jb = canonTeamName(j.equipe_b_nome)
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
  slot:       RSlot
  realName:   string | null
  cor:        string | null
  placar:     number | null
  isWin:      boolean
  isWO:       boolean
  showPlacar: boolean
}) {
  const displayName = realName ?? slot.display
  const hasTeam = !slot.isFeeder && !!slot.canon
  return (
    <div
      className={isWin ? 'bg-[var(--green-dim)]/10' : ''}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        paddingLeft: 7,
        paddingRight: 6,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Team color stripe */}
      <span
        style={{
          width: 2,
          height: 14,
          borderRadius: 2,
          background: hasTeam ? (cor ?? 'var(--muted-foreground)') : 'var(--border)',
          flexShrink: 0,
        }}
      />

      {/* Seed badge */}
      {slot.pos !== undefined && (
        <span
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            height: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 3,
            background: 'var(--muted)',
            padding: '0 3px',
            fontSize: 8,
            fontWeight: 700,
            color: 'var(--muted-foreground)',
          }}
        >
          P{slot.pos}
        </span>
      )}

      {/* Name */}
      <span
        style={{
          flex: 1,
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: slot.isFeeder
            ? 'var(--muted-foreground)'
            : isWO
            ? 'var(--muted-foreground)'
            : isWin
            ? 'var(--green-bright)'
            : !hasTeam
            ? 'var(--muted-foreground)'
            : 'var(--foreground)',
          opacity: (slot.isFeeder || !hasTeam) ? 0.45 : 1,
          fontStyle: slot.isFeeder ? 'italic' : 'normal',
          textDecoration: isWO ? 'line-through' : 'none',
        }}
      >
        {displayName}
      </span>

      {/* Score */}
      {showPlacar && (
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: isWin
              ? 'var(--green-bright)'
              : isWO
              ? 'var(--muted-foreground)'
              : 'var(--muted-foreground)',
            opacity: isWO ? 0.4 : 1,
          }}
        >
          {isWO ? '—' : (placar ?? 0)}
        </span>
      )}

      {/* Winner crown */}
      {isWin && <Crown style={{ width: 10, height: 10, color: '#e8b94f', flexShrink: 0 }} />}
    </div>
  )
}

type GameAccent = 'gold' | 'green' | 'normal' | string  // string = quad key

function MatchCard({ ent, accent }: { ent: EGame; accent: GameAccent }) {
  const { bg, sA, sB, jogo } = ent
  const isReal = jogo !== null
  const isLive = jogo?.status === 'ao_vivo'
  const isEnd  = jogo?.status === 'encerrado'
  const win    = jogo ? getWinner(jogo) : null

  const isDef = sA.isFeeder && sB.isFeeder

  // Resolve accent
  const pal =
    accent === 'gold'  ? ACCENT.gold :
    accent === 'green' ? ACCENT.green :
    isLive             ? ACCENT.live :
    ACCENT[accent]     ?? null

  const accentColor  = pal?.color  ?? 'var(--border)'
  const accentSubtle = pal?.subtle ?? 'transparent'

  // Card border / bg
  const cardBorder = isDef
    ? 'none'
    : pal
    ? `1px solid ${accentColor}44`
    : `1px solid var(--border)`

  const cardBg = isDef
    ? 'transparent'
    : isReal && pal
    ? accentSubtle
    : 'var(--card)'

  const content = (
    <div
      style={{
        width: COL_W,
        height: CARD_H,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        border: isDef ? '1.5px dashed rgba(74,138,92,0.22)' : cardBorder,
        background: cardBg,
        overflow: 'hidden',
        opacity: isDef ? 0.55 : 1,
        transition: 'box-shadow 0.15s, opacity 0.15s',
        ...(accent === 'gold' && isReal
          ? { boxShadow: '0 0 18px rgba(232,185,79,0.12), inset 0 0 0 1px rgba(232,185,79,0.20)' }
          : {}),
        ...(isLive
          ? { boxShadow: '0 0 12px rgba(239,68,68,0.15)' }
          : {}),
      }}
    >
      {/* Left accent bar + header row */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        {/* Accent bar */}
        {!isDef && (
          <div
            style={{
              width: 3,
              alignSelf: 'stretch',
              background: accentColor,
              borderRadius: '8px 0 0 0',
              flexShrink: 0,
            }}
          />
        )}

        {/* Header */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingLeft: isDef ? 8 : 5,
            paddingRight: 8,
            height: 16,
            borderBottom: `1px solid ${isDef ? 'rgba(74,138,92,0.15)' : 'var(--border)'}`,
            background: isDef ? 'transparent' : 'var(--muted)/20',
            opacity: isDef ? 0.7 : 1,
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isDef
                ? 'var(--muted-foreground)'
                : accent === 'gold'
                ? '#e8b94f'
                : accent === 'green'
                ? 'var(--green-bright)'
                : 'var(--muted-foreground)',
              opacity: isDef ? 0.5 : 0.8,
            }}
          >
            JOGO {bg.num}
          </span>

          {jogo?.inicio && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 7,
                color: 'var(--muted-foreground)',
                opacity: 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              {fmtData(jogo.inicio)} · {fmtHora(jogo.inicio)}
            </span>
          )}

          {isLive && (
            <Radio
              style={{ width: 8, height: 8, color: '#ef4444', flexShrink: 0 }}
              className="animate-pulse"
            />
          )}
          {jogo?.wo && !isLive && (
            <UserX style={{ width: 8, height: 8, color: '#ef4444', flexShrink: 0 }} />
          )}
        </div>
      </div>

      {/* Team A */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isDef && (
          <div style={{ width: 3, background: accentColor, flexShrink: 0 }} />
        )}
        <TeamRow
          slot={sA}
          realName={jogo?.equipe_a_nome ?? null}
          cor={jogo?.equipe_a?.cor_primaria ?? null}
          placar={jogo?.placar_a ?? null}
          isWin={win === 'a'}
          isWO={jogo?.wo === 'a' || jogo?.wo === 'duplo'}
          showPlacar={isLive || isEnd}
        />
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: isDef ? 'rgba(74,138,92,0.12)' : 'var(--border)',
          opacity: isDef ? 0.5 : 0.6,
          marginLeft: isDef ? 0 : 3,
        }}
      />

      {/* Team B */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isDef && (
          <div
            style={{
              width: 3,
              background: accentColor,
              flexShrink: 0,
              borderRadius: '0 0 0 8px',
            }}
          />
        )}
        <TeamRow
          slot={sB}
          realName={jogo?.equipe_b_nome ?? null}
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
        className="group"
      >
        <div
          style={{
            transition: 'transform 0.12s, opacity 0.12s',
          }}
          className="group-hover:scale-[1.015]"
        >
          {content}
        </div>
      </Link>
    )
  }
  return content
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  jogos:   JogoChave[]
  config:  ChaveConfig | null
}

export function BracketView({ jogos, config }: Props) {
  if (!config) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]/20" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Chave sem configuração cadastrada.
        </p>
      </div>
    )
  }

  const bracketGames = buildGames(config.num_teams)
  const enriched     = enrich(bracketGames, config.seeds, jogos)
  const { pos, cols, totalW, totalH } = computeLayout(bracketGames)
  const connPaths = buildPaths(bracketGames, pos)

  // Quadrant region labels: appear above the first oitava of each quadrant
  const QUAD_LABELS: Array<{ gameId: string; quadKey: string; label: string }> = [
    { gameId: 'o_Q1_sup', quadKey: 'Q1', label: 'Quadrante 1' },
    { gameId: 'o_Q4_sup', quadKey: 'Q4', label: 'Quadrante 4' },
    { gameId: 'o_Q2_sup', quadKey: 'Q2', label: 'Quadrante 2' },
    { gameId: 'o_Q3_sup', quadKey: 'Q3', label: 'Quadrante 3' },
  ]
  const quadLabels = QUAD_LABELS.flatMap(({ gameId, quadKey, label }) => {
    const p = pos.get(gameId)
    if (!p) return []
    return [{ x: p.x, y: p.y, color: ACCENT[quadKey].color, label, quadKey }]
  })

  // Extra space above cards: header row + optional quadrant labels
  const hasQuadLabels = quadLabels.length > 0
  const extraTop = HDR_H + (hasQuadLabels ? QL_H + 6 : 0)
  const fullH    = totalH + extraTop

  // Champion
  const finalGame = enriched.find(e => e.bg.round === 'final')
  const champ = (() => {
    if (!finalGame?.jogo || finalGame.jogo.status !== 'encerrado') return null
    const w    = getWinner(finalGame.jogo)
    const nome = w === 'a' ? finalGame.jogo.equipe_a_nome
                : w === 'b' ? finalGame.jogo.equipe_b_nome
                : null
    const cor  = w === 'a' ? finalGame.jogo.equipe_a?.cor_primaria
                : w === 'b' ? finalGame.jogo.equipe_b?.cor_primaria
                : null
    return nome ? { nome, cor: cor ?? null } : null
  })()

  return (
    <div className="space-y-3">
      {/* Bracket wrapper */}
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--card)]/20 p-3 md:p-4"
        style={{ overflowX: 'auto' }}
      >
        {/* Fixed-size bracket container */}
        <div
          style={{
            position: 'relative',
            width:  totalW,
            height: fullH,
            minWidth: totalW,
          }}
        >

          {/* ── Column headers ── */}
          {cols.map(col => {
            const isFinal = col.key === 'final'
            const isSemi  = col.key === 'semi-L' || col.key === 'semi-R'
            return (
              <div
                key={col.key}
                style={{
                  position:      'absolute',
                  left:          col.x,
                  top:           0,
                  width:         COL_W,
                  height:        HDR_H,
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'center',
                  borderBottom:  '1px solid var(--border)',
                  marginBottom:  4,
                }}
              >
                <span
                  style={{
                    fontSize:      9,
                    fontWeight:    700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: isFinal ? '#e8b94f'
                         : isSemi  ? 'var(--green-bright)'
                         : 'var(--muted-foreground)',
                    opacity: isFinal ? 1 : isSemi ? 0.85 : 0.5,
                  }}
                >
                  {col.label}
                </span>
              </div>
            )
          })}

          {/* ── Quadrant labels ── */}
          {quadLabels.map(ql => (
            <div
              key={ql.quadKey}
              style={{
                position:   'absolute',
                left:       ql.x,
                top:        HDR_H + 4,
                width:      COL_W,
                height:     QL_H,
                display:    'flex',
                alignItems: 'center',
                gap:        5,
              }}
            >
              <div
                style={{
                  width:        5,
                  height:       5,
                  borderRadius: '50%',
                  background:   ql.color,
                  flexShrink:   0,
                }}
              />
              <span
                style={{
                  fontSize:      8,
                  fontWeight:    700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color:         ql.color,
                  opacity:       0.8,
                }}
              >
                {ql.label}
              </span>
            </div>
          ))}

          {/* ── SVG connector overlay ── */}
          <svg
            style={{
              position:      'absolute',
              left:          0,
              top:           extraTop,
              width:         totalW,
              height:        totalH,
              pointerEvents: 'none',
              overflow:      'visible',
            }}
            fill="none"
          >
            {connPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke={CONN_STROKE}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {/* ── Game cards ── */}
          {enriched.map(ent => {
            const p = pos.get(ent.bg.id)
            if (!p) return null

            const q      = ent.bg.quad  // 'Q1'|'Q2'|'Q3'|'Q4'|undefined
            const accent: GameAccent =
              ent.bg.round === 'final' ? 'gold'
            : ent.bg.round === 'semi'  ? 'green'
            : q                        ? q
            :                            'normal'

            return (
              <div
                key={ent.bg.id}
                style={{
                  position: 'absolute',
                  left:     p.x,
                  top:      p.y + extraTop,
                }}
              >
                <MatchCard ent={ent} accent={accent} />
              </div>
            )
          })}

        </div>

        {/* Mobile hint */}
        <p className="mt-2 text-center text-[9px] text-[var(--muted-foreground)]/35 md:hidden">
          ← deslize para ver toda a chave →
        </p>
      </div>

      {/* Champion banner */}
      {champ && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/8 via-amber-300/4 to-transparent p-8">
          <Crown className="h-10 w-10 text-amber-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
            Campeão
          </p>
          <p
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: champ.cor ?? 'var(--foreground)' }}
          >
            {champ.nome}
          </p>
        </div>
      )}
    </div>
  )
}
