'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, safe, type ActionResult } from '@/lib/admin/actions-helper'

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface LineupPerfInput {
  nome:    string
  start:   string    // "HH:MM" — pode ser pós-meia-noite (ex: "03:30")
  end:     string    // "HH:MM"
  diaId:   string    // UUID do dia (a data base de start)
  setorId: string    // UUID do palco
  tipo?:   string    // 'show' | 'dj_set' | 'banda' | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Constrói um ISO string com fuso -03:00 a partir de:
 * - dataBase: "2026-06-04" (a data do dia_evento)
 * - hhmm:     "23:50" ou "03:30" (pós-meia-noite vai pra dataBase+1)
 *
 * Regra de pós-meia-noite: se hora < 12, é dia seguinte.
 */
function buildIso(dataBase: string, hhmm: string): string {
  const [hh, mm] = hhmm.split(':').map(Number)
  const isOvernight = hh < 12

  if (!isOvernight) {
    return `${dataBase}T${hhmm}:00-03:00`
  }

  // Dia seguinte
  const [y, m, d] = dataBase.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d))
  next.setUTCDate(next.getUTCDate() + 1)
  const yy = next.getUTCFullYear()
  const mmStr = String(next.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(next.getUTCDate()).padStart(2, '0')
  return `${yy}-${mmStr}-${dd}T${hhmm}:00-03:00`
}

function durationMin(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h < 12 ? (h + 24) * 60 + m : h * 60 + m
  }
  return Math.max(1, toMin(end) - toMin(start))
}

function validateInput(input: LineupPerfInput): string | null {
  if (!input.nome?.trim())  return 'Nome do artista é obrigatório'
  if (!input.start || !/^\d{2}:\d{2}$/.test(input.start)) return 'Horário de início inválido'
  if (!input.end   || !/^\d{2}:\d{2}$/.test(input.end))   return 'Horário de fim inválido'
  if (!input.diaId)         return 'Dia inválido'
  if (!input.setorId)       return 'Palco inválido'
  const dur = durationMin(input.start, input.end)
  if (dur < 1 || dur > 600) return 'Duração inválida (1–600 min)'
  return null
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function createLineupPerf(input: LineupPerfInput): Promise<ActionResult> {
  return safe(async () => {
    await requireAdmin()
    const err = validateInput(input)
    if (err) throw new Error(err)

    const supabase = await createClient()

    // Busca data base do dia
    const { data: dia, error: diaErr } = await supabase
      .from('dias_evento')
      .select('data')
      .eq('id', input.diaId)
      .single()
    if (diaErr || !dia) throw new Error('Dia não encontrado')

    const inicioIso = buildIso(dia.data, input.start)
    const fimIso    = buildIso(dia.data, input.end)
    const duracao   = durationMin(input.start, input.end)

    // Ordem no palco — pega o max + 1
    const { data: maxRow } = await supabase
      .from('shows')
      .select('ordem_no_palco')
      .eq('dia_id', input.diaId)
      .eq('setor_id', input.setorId)
      .order('ordem_no_palco', { ascending: false })
      .limit(1)
      .maybeSingle()
    const ordem = (maxRow?.ordem_no_palco ?? 0) + 1

    const { error } = await supabase.from('shows').insert({
      edicao_id:        EDICAO_ID,
      dia_id:           input.diaId,
      setor_id:         input.setorId,
      nome:             input.nome.trim(),
      tipo:             input.tipo ?? 'show',
      inicio:           inicioIso,
      fim_previsto:     fimIso,
      duracao_minutos:  duracao,
      embaixador:       false,
      ordem_no_palco:   ordem,
    })
    if (error) throw error

    revalidatePath('/lineup')
    revalidatePath('/agenda')
  })
}

export async function updateLineupPerf(id: string, input: LineupPerfInput): Promise<ActionResult> {
  return safe(async () => {
    await requireAdmin()
    const err = validateInput(input)
    if (err) throw new Error(err)

    const supabase = await createClient()

    const { data: dia, error: diaErr } = await supabase
      .from('dias_evento')
      .select('data')
      .eq('id', input.diaId)
      .single()
    if (diaErr || !dia) throw new Error('Dia não encontrado')

    const inicioIso = buildIso(dia.data, input.start)
    const fimIso    = buildIso(dia.data, input.end)
    const duracao   = durationMin(input.start, input.end)

    const { error } = await supabase
      .from('shows')
      .update({
        nome:             input.nome.trim(),
        tipo:             input.tipo ?? 'show',
        dia_id:           input.diaId,
        setor_id:         input.setorId,
        inicio:           inicioIso,
        fim_previsto:     fimIso,
        duracao_minutos:  duracao,
      })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/lineup')
    revalidatePath('/agenda')
  })
}

export async function deleteLineupPerf(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('shows').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/lineup')
    revalidatePath('/agenda')
  })
}
