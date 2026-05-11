import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/service'
import { getConferencia } from '@/lib/conferencias'

export const runtime = 'edge'

// Cores das divisões (replicado pra evitar import client-side)
const DIV_COLORS: Record<string, string> = {
  '1ª Divisão': '#F0D04A',
  '2ª Divisão': '#6AB87E',
  'Super 08':   '#E89A6F',
}

const FASE_LABEL: Record<string, string> = {
  grupos: 'Fase de Grupos', oitavas: 'Oitavas', quartas: 'Quartas',
  semifinal: 'Semifinal', final: 'Final',
}

interface Params { id: string }

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { id } = await ctx.params
  const supabase = createServiceClient()

  const { data: jogo, error } = await supabase
    .from('jogos')
    .select(`
      id, status, equipe_a_nome, equipe_b_nome, placar_a, placar_b,
      divisao, fase, categoria, inicio, fim_previsto,
      modalidade:modalidades(nome, icone),
      equipe_a:equipe_a_id(conferencia, divisao, universidade),
      equipe_b:equipe_b_id(conferencia, divisao, universidade)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !jogo) {
    return new Response('Jogo não encontrado', { status: 404 })
  }

  type Mod = { nome: string; icone: string } | { nome: string; icone: string }[] | null
  type Eq  = { conferencia: string | null; divisao: string | null; universidade: string | null } | { conferencia: string | null; divisao: string | null; universidade: string | null }[] | null
  const arr = <T,>(v: T | T[] | null): T | null => Array.isArray(v) ? (v[0] ?? null) : v
  const modalidade = arr(jogo.modalidade as Mod)
  const equipe_a = arr(jogo.equipe_a as Eq)
  const equipe_b = arr(jogo.equipe_b as Eq)

  const placarA = jogo.placar_a ?? 0
  const placarB = jogo.placar_b ?? 0
  const winA = placarA > placarB
  const winB = placarB > placarA
  const draw = placarA === placarB && jogo.status === 'encerrado'

  // Cor acento por equipe (conferência se Super 08, senão divisão)
  const accentFor = (eq: typeof equipe_a, fallbackDiv: string | null): string => {
    if (eq?.conferencia) {
      return getConferencia(eq.conferencia)?.cor ?? '#94a3b8'
    }
    const div = eq?.divisao ?? fallbackDiv
    return (div && DIV_COLORS[div]) || '#94a3b8'
  }
  const accentA = accentFor(equipe_a, jogo.divisao)
  const accentB = accentFor(equipe_b, jogo.divisao)
  const divisao = jogo.divisao ?? equipe_a?.divisao ?? equipe_b?.divisao ?? null
  const divColor = divisao ? DIV_COLORS[divisao] : null
  const fase = jogo.fase ? (FASE_LABEL[jogo.fase] ?? jogo.fase) : null

  const statusLabel = jogo.status === 'encerrado'
    ? 'Resultado Final'
    : jogo.status === 'ao_vivo'
    ? 'Ao Vivo'
    : 'Próximo Jogo'

  const dataFmt = jogo.inicio
    ? new Date(jogo.inicio).toLocaleString('pt-BR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })
    : null

  return new ImageResponse(
    (
      <div style={{
        width: 1080, height: 1080,
        display: 'flex', flexDirection: 'column',
        background: '#070b09',
        color: '#fafaf0',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}>
        {/* Atmosphere — radial green orb + accent orbs */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          backgroundImage: `radial-gradient(50% 40% at 0% 0%, ${accentA}30 0%, transparent 60%), radial-gradient(50% 40% at 100% 100%, ${accentB}30 0%, transparent 60%), radial-gradient(70% 50% at 50% 50%, rgba(46,107,66,0.20) 0%, transparent 70%)`,
        }} />

        {/* Subtle border ring */}
        <div style={{
          position: 'absolute', inset: 28, display: 'flex',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 32,
        }} />

        {/* CONTENT */}
        <div style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          width: '100%', height: '100%',
          padding: '64px 72px',
        }}>

          {/* Top strip: CIA brand + status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 18, letterSpacing: 8, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
                CIA 2026
              </span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.30)' }}>
                Copa Inter Atléticas · Uberaba
              </span>
            </div>

            <div style={{ flex: 1, display: 'flex' }} />

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', borderRadius: 999,
              background: jogo.status === 'ao_vivo' ? 'rgba(239,68,68,0.16)' : 'rgba(255,255,255,0.06)',
              border: jogo.status === 'ao_vivo' ? '1px solid rgba(239,68,68,0.40)' : '1px solid rgba(255,255,255,0.10)',
            }}>
              {jogo.status === 'ao_vivo' && (
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: '#ef4444',
                  display: 'flex',
                }} />
              )}
              <span style={{
                fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase',
                color: jogo.status === 'ao_vivo' ? '#fca5a5' : 'rgba(255,255,255,0.65)',
              }}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Modality + division pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32 }}>
            {modalidade && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                <span style={{ fontSize: 28 }}>{modalidade.icone}</span>
                <span>{modalidade.nome}</span>
              </div>
            )}
            {jogo.categoria && (
              <span style={{
                fontSize: 18, color: 'rgba(255,255,255,0.55)',
                padding: '4px 12px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.10)',
                display: 'flex',
              }}>{jogo.categoria}</span>
            )}
            {divisao && divColor && (
              <span style={{
                fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase',
                padding: '6px 14px', borderRadius: 999,
                background: `${divColor}20`, color: divColor,
                border: `1px solid ${divColor}40`,
                display: 'flex',
              }}>{divisao}</span>
            )}
            {fase && (
              <span style={{
                fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase',
                padding: '6px 14px', borderRadius: 999,
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.60)',
                border: '1px solid rgba(255,255,255,0.10)',
                display: 'flex',
              }}>{fase}</span>
            )}
          </div>

          {/* Score row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 28, marginTop: 60,
          }}>
            {/* Team A */}
            <div style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-end', textAlign: 'right',
              gap: 10,
            }}>
              <div style={{
                fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
                color: accentA,
                opacity: 0.92,
                display: 'flex',
              }}>
                {equipe_a?.universidade ?? ' '}
              </div>
              <div style={{
                fontSize: 56, fontWeight: 900, letterSpacing: -2, lineHeight: 1,
                color: winA ? '#fafaf0' : (winB || draw ? 'rgba(255,255,255,0.55)' : '#fafaf0'),
                maxWidth: 380,
                display: 'flex',
              }}>
                {jogo.equipe_a_nome ?? '—'}
              </div>
              <div style={{
                fontSize: 220, fontWeight: 900, letterSpacing: -8, lineHeight: 0.85,
                color: winA ? accentA : (winB ? 'rgba(255,255,255,0.30)' : '#fafaf0'),
                marginTop: 4,
                display: 'flex',
              }}>
                {placarA}
              </div>
            </div>

            {/* VS center */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              paddingTop: 100,
            }}>
              <div style={{
                width: 1, height: 80,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
              }} />
              <span style={{
                fontSize: 22, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.40)',
                display: 'flex',
              }}>
                vs
              </span>
              <div style={{
                width: 1, height: 80,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
              }} />
            </div>

            {/* Team B */}
            <div style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', textAlign: 'left',
              gap: 10,
            }}>
              <div style={{
                fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
                color: accentB,
                opacity: 0.92,
                display: 'flex',
              }}>
                {equipe_b?.universidade ?? ' '}
              </div>
              <div style={{
                fontSize: 56, fontWeight: 900, letterSpacing: -2, lineHeight: 1,
                color: winB ? '#fafaf0' : (winA || draw ? 'rgba(255,255,255,0.55)' : '#fafaf0'),
                maxWidth: 380,
                display: 'flex',
              }}>
                {jogo.equipe_b_nome ?? '—'}
              </div>
              <div style={{
                fontSize: 220, fontWeight: 900, letterSpacing: -8, lineHeight: 0.85,
                color: winB ? accentB : (winA ? 'rgba(255,255,255,0.30)' : '#fafaf0'),
                marginTop: 4,
                display: 'flex',
              }}>
                {placarB}
              </div>
            </div>
          </div>

          {/* Footer strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 'auto', paddingTop: 40,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)' }}>
                {dataFmt ?? 'CIA 2026'}
              </span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
                Cobertura: Olharr · 04 → 07 jun 2026
              </span>
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.30)',
              display: 'flex',
            }}>
              cia2026.olharr.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      headers: {
        // 60s cache, 5min stale-while-revalidate
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
