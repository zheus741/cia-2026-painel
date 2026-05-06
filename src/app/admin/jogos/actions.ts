'use server'

import { createClient } from '@/lib/supabase/server'
import {
  parseFormData,
  requireCoordOrAdmin,
  requireEdicaoAtivaId,
  safe,
  type ActionResult,
} from '@/lib/admin/actions-helper'

const SCHEMA = [
  { name: 'dia_id', type: 'nullable_text' as const },
  { name: 'setor_id', type: 'nullable_text' as const },
  { name: 'modalidade_id', type: 'nullable_text' as const },
  { name: 'categoria', type: 'nullable_text' as const },
  { name: 'divisao', type: 'nullable_text' as const },
  { name: 'fase', type: 'nullable_text' as const },
  { name: 'equipe_a_nome', type: 'nullable_text' as const },
  { name: 'equipe_b_nome', type: 'nullable_text' as const },
  { name: 'inicio', type: 'datetime' as const },
  { name: 'fim_previsto', type: 'datetime' as const },
  { name: 'observacoes', type: 'nullable_text' as const },
]

export async function createJogo(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('jogos').insert({ ...data, edicao_id, status: 'agendado' })
    if (error) throw error
  })
}

export async function updateJogo(id: string, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const data = parseFormData(fd, SCHEMA)
    const { error } = await supabase.from('jogos').update(data).eq('id', id)
    if (error) throw error
  })
}

export async function deleteJogo(id: string): Promise<ActionResult> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const { error } = await supabase.from('jogos').delete().eq('id', id)
    if (error) throw error
  })
}

// ─── Xlsx import ──────────────────────────────────────────────────────────────

export interface JogoImportRow {
  dia_nome: string           // sheet name, e.g. "TABELAMENTO DIA 1 (19)"
  quadra: string             // court name from the sheet header
  horario: string | null     // "08:00"
  mod_codigo: string         // "FF", "FM", "FC", etc.
  divisao: string | null
  fase: string | null
  jogo_num: number | null
  equipe_a: string | null
  equipe_b: string | null
}

export interface ImportPreview {
  rows: JogoImportRow[]
  quadras: string[]
  mods: string[]
  dias: string[]
  total: number
}

/** Parses the uploaded xlsx and returns a preview without writing to DB. */
export async function previewImportJogos(fd: FormData): Promise<ActionResult & { preview?: ImportPreview }> {
  return safe(async () => {
    await requireCoordOrAdmin()

    const file = fd.get('file') as File | null
    if (!file) throw new Error('Nenhum arquivo enviado.')
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls'))
      throw new Error('Apenas arquivos .xlsx ou .xls são aceitos.')

    const buffer = Buffer.from(await file.arrayBuffer())
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    const DAY_SHEET_RE = /TABELAMENTO DIA/i
    const daySheets = wb.SheetNames.filter((n) => DAY_SHEET_RE.test(n))
    if (daySheets.length === 0)
      throw new Error('Nenhuma aba "TABELAMENTO DIA X" encontrada no arquivo.')

    const rows: JogoImportRow[] = []
    const quadrasSet = new Set<string>()
    const modsSet = new Set<string>()

    for (const sheetName of daySheets) {
      const ws = wb.Sheets[sheetName]
      const raw: (string | number | Date | null)[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: null,
        blankrows: false,
      })

      // Find the header row: contains "HORÁRIO" and "MOD"
      let headerRowIdx = -1
      for (let i = 0; i < Math.min(raw.length, 10); i++) {
        const r = raw[i]
        if (r && r.some((c) => String(c ?? '').includes('HORÁRIO'))) {
          headerRowIdx = i
          break
        }
      }
      if (headerRowIdx < 0) continue

      // Court names are one row above the header, at col 0, 11, 22, …
      const courtRow = raw[headerRowIdx - 1] ?? []

      // Each court block is 11 columns wide: [time, mod, div, fase, jogo, atkA, scoreA, x, scoreB, atkB, sep]
      const BLOCK = 11

      const courts: string[] = []
      for (let col = 0; col < (raw[headerRowIdx]?.length ?? 0); col += BLOCK) {
        const name = String(courtRow[col] ?? '').trim()
        courts.push(name || `Quadra ${courts.length + 1}`)
      }

      // Parse data rows
      for (let ri = headerRowIdx + 1; ri < raw.length; ri++) {
        const row = raw[ri]
        if (!row) continue

        for (let bi = 0; bi < courts.length; bi++) {
          const base = bi * BLOCK
          const modRaw = String(row[base + 1] ?? '').trim()
          if (!modRaw || modRaw === 'MOD') continue

          const timeRaw = row[base]
          let horario: string | null = null
          if (timeRaw instanceof Date) {
            horario = `${String(timeRaw.getUTCHours()).padStart(2, '0')}:${String(timeRaw.getUTCMinutes()).padStart(2, '0')}`
          } else if (timeRaw) {
            horario = String(timeRaw).trim() || null
          }

          const equipeA = String(row[base + 5] ?? '').trim() || null
          const equipeB = String(row[base + 9] ?? '').trim() || null
          if (!equipeA && !equipeB) continue

          const quadra = courts[bi]
          quadrasSet.add(quadra)
          modsSet.add(modRaw)

          rows.push({
            dia_nome: sheetName,
            quadra,
            horario,
            mod_codigo: modRaw,
            divisao: String(row[base + 2] ?? '').trim() || null,
            fase: String(row[base + 3] ?? '').trim() || null,
            jogo_num: typeof row[base + 4] === 'number' ? (row[base + 4] as number) : null,
            equipe_a: equipeA,
            equipe_b: equipeB,
          })
        }
      }
    }

    return {
      rows,
      quadras: [...quadrasSet].sort(),
      mods: [...modsSet].sort(),
      dias: daySheets,
      total: rows.length,
    }
  })
}

export interface ImportMapping {
  // mod_codigo -> modalidade_id
  modalidades: Record<string, string>
  // mod_codigo -> categoria (Masculino / Feminino)
  categorias: Record<string, string>
  // quadra name -> setor_id
  setores: Record<string, string>
  // dia_nome -> dia_id
  dias: Record<string, string>
  // base date for timestamp construction (YYYY-MM-DD), per dia
  datas: Record<string, string>
}

export async function confirmImportJogos(
  rows: JogoImportRow[],
  mapping: ImportMapping,
): Promise<ActionResult & { data?: number }> {
  return safe(async () => {
    await requireCoordOrAdmin()
    const supabase = await createClient()
    const edicao_id = await requireEdicaoAtivaId()

    const FASE_MAP: Record<string, string> = {
      OF: 'oitavas', QF: 'quartas', SF: 'semifinal', F: 'final',
      G: 'grupos', GF: 'grupos', GR: 'grupos',
    }

    const inserts = rows.map((r) => {
      const dia_id = mapping.dias[r.dia_nome] ?? null
      const setor_id = mapping.setores[r.quadra] ?? null
      const modalidade_id = mapping.modalidades[r.mod_codigo] ?? null
      const data = mapping.datas[r.dia_nome] ?? null

      let inicio: string | null = null
      if (data && r.horario) {
        inicio = new Date(`${data}T${r.horario}:00`).toISOString()
      }

      return {
        edicao_id,
        dia_id,
        setor_id,
        modalidade_id,
        categoria: mapping.categorias[r.mod_codigo] ?? null,
        divisao: r.divisao,
        fase: r.fase ? (FASE_MAP[r.fase.toUpperCase()] ?? r.fase.toLowerCase()) : null,
        equipe_a_nome: r.equipe_a,
        equipe_b_nome: r.equipe_b,
        inicio,
        status: 'agendado',
      }
    })

    // Replace-by-day: delete existing games for each day present in this import,
    // then re-insert. This makes uploads idempotent — day 1 can be re-uploaded
    // with corrections without touching day 2, 3, or 4.
    const diaIds = [...new Set(inserts.map((r) => r.dia_id).filter(Boolean))]
    if (diaIds.length > 0) {
      const { error: delErr } = await supabase
        .from('jogos')
        .delete()
        .in('dia_id', diaIds as string[])
        .eq('edicao_id', edicao_id)
      if (delErr) throw delErr
    }

    const { error } = await supabase.from('jogos').insert(inserts)
    if (error) throw error
    return inserts.length
  })
}
