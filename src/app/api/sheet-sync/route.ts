import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  buscarResultadosDasAbas, casarResultados, aplicarResultadoNoJogo,
  JOGO_SELECT_COLS, type DbClient, type JogoRow,
} from '@/lib/planilha/sync-core'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Webhook de sincronização Planilha → Painel.
 *
 * Disparado pela planilha (Apps Script onEdit) a cada edição. Relê a planilha,
 * casa com os jogos e aplica os resultados de casamento ÚNICO que diferem do
 * banco (novo ou sobrescreve). Ambíguo / sem-casar são ignorados (reportados).
 *
 * Idempotente: editar uma célula irrelevante não muda nada. Apagar resultado
 * NÃO reverte (só aplicamos placares preenchidos).
 *
 * Auth: ?secret=<SHEET_SYNC_SECRET> ou header Authorization: Bearer <secret>.
 */
function autorizado(req: NextRequest): boolean {
  const secret = process.env.SHEET_SYNC_SECRET
  if (!secret) return false
  const url = new URL(req.url)
  if (url.searchParams.get('secret') === secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function sincronizar() {
  const supabase = createServiceClient() as unknown as DbClient

  const { data: jogosRaw } = await supabase.from('jogos').select(JOGO_SELECT_COLS)
  const jogos = (jogosRaw ?? []) as JogoRow[]

  const { resultados, abasComErro } = await buscarResultadosDasAbas()
  const itens = casarResultados(jogos, resultados)

  let aplicados = 0, jaIguais = 0, erros = 0, semCasar = 0, ambiguos = 0
  for (const it of itens) {
    if (it.status === 'sem_jogo' || it.status === 'sem_modalidade') { semCasar++; continue }
    if (it.status === 'ambiguo') { ambiguos++; continue }
    if (it.status === 'igual')   { jaIguais++; continue }
    // novo OU conflito (planilha manda) → aplica
    const r = await aplicarResultadoNoJogo(supabase, it)
    if (r === 'aplicado') aplicados++
    else if (r === 'erro') erros++
    else jaIguais++
  }

  return {
    ok: true,
    lidos: resultados.length,
    aplicados, jaIguais, erros, semCasar, ambiguos,
    abasComErro,
  }
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await sincronizar())
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

// GET pra teste manual no navegador (mesmo secret).
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await sincronizar())
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
