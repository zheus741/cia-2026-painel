// ─────────────────────────────────────────────────────────────────────────────
// jogos-sync-core.ts — núcleo reusável de importação/sync da TABELA DE JOGOS.
//
// Extraído de src/app/api/import-tabela/route.ts para ser chamado por:
//  - a rota /api/import-tabela (upload manual de XLSX, com auth de sessão)
//  - a action sincronizarTabelaJogos() (baixa a planilha mestre e aplica)
//
// Contém o parse (TABELA DIA NN + JOGOS ADIANTADOS) + insert/dedup/stamp.
// NÃO faz auth nem I/O de arquivo — recebe um WorkBook já lido e um client.
// ─────────────────────────────────────────────────────────────────────────────

import { revalidateTag } from 'next/cache'
import * as XLSX from 'xlsx'
import type { createClient } from '@/lib/supabase/server'
import { stampTodasAsChaves } from '@/lib/chaveamento/avanco'

type DbClient = Awaited<ReturnType<typeof createClient>>

// ── Planilha mestre de JOGOS (fonte da verdade) ───────────────────────────────
export const JOGOS_SHEET_ID =
  process.env.JOGOS_SHEET_ID ?? '1piRlCHWUdj2Y3rJbhqE99qaXmkJJ-k4yWor9iqnBLYg'
export const jogosXlsxUrl = (id = JOGOS_SHEET_ID) =>
  `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`

// ── Modalidade map: código Excel → dados completos ────────────────────────────
const MODALIDADE_MAP: Record<string, { nome: string; icone: string; duracao_min: number }> = {
  FF:   { nome: 'Futsal Feminino',         icone: '⚽',  duracao_min: 50 },
  FM:   { nome: 'Futsal Masculino',        icone: '⚽',  duracao_min: 50 },
  HM:   { nome: 'Handebol Masculino',      icone: '🤾',  duracao_min: 60 },
  HF:   { nome: 'Handebol Feminino',       icone: '🤾',  duracao_min: 60 },
  VM:   { nome: 'Vôlei Masculino',         icone: '🏐',  duracao_min: 90 },
  VF:   { nome: 'Vôlei Feminino',          icone: '🏐',  duracao_min: 90 },
  VPM:  { nome: 'Vôlei de Praia Masc.',    icone: '🏖️',  duracao_min: 60 },
  VPF:  { nome: 'Vôlei de Praia Fem.',     icone: '🏖️',  duracao_min: 60 },
  BM:   { nome: 'Basquete Masculino',      icone: '🏀',  duracao_min: 60 },
  BF:   { nome: 'Basquete Feminino',       icone: '🏀',  duracao_min: 60 },
  FC:   { nome: 'Futebol de Campo',        icone: '🏟️',  duracao_min: 90 },
  F7M:  { nome: 'Futebol 7 Masculino',     icone: '🥅',  duracao_min: 60 },
  F7:   { nome: 'Futebol 7 Masculino',     icone: '🥅',  duracao_min: 60 },
  F7F:  { nome: 'Futebol 7 Feminino',      icone: '🥅',  duracao_min: 60 },
  PM:   { nome: 'Peteca Masculino',        icone: '🏸',  duracao_min: 60 },
  PF:   { nome: 'Peteca Feminino',         icone: '🏸',  duracao_min: 60 },
  PETM: { nome: 'Peteca Masculino',        icone: '🏸',  duracao_min: 60 },
  PETF: { nome: 'Peteca Feminino',         icone: '🏸',  duracao_min: 60 },
  TCM:  { nome: 'Tênis de Campo Masc.',    icone: '🎾',  duracao_min: 60 },
  TCF:  { nome: 'Tênis de Campo Fem.',     icone: '🎾',  duracao_min: 60 },
  TMSM: { nome: 'Tênis de Mesa Masc.',     icone: '🏓',  duracao_min: 45 },
  TMSF: { nome: 'Tênis de Mesa Fem.',      icone: '🏓',  duracao_min: 45 },
}

const WEEKDAY_PT: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
}

function normalizarDivisao(raw: string): string {
  const v = raw.trim(); const u = v.toUpperCase()
  if (u === 'CYBERC' || u === 'CYBERCOTY' || u === 'CYBER' || u === 'CYBER CITY') return 'CYBER CITY'
  if (u === 'ATHEMP' || u === 'ATHEMPURA') return 'ATHEMPURA'
  if (u === 'ELDORA' || u === 'ELDORADO') return 'ELDORADO'
  if (u === 'ESPETA' || u === 'ESPETÁ' || u === 'ESPETACULO' || u === 'ESPETÁCULO') return 'ESPETÁCULO'
  if (u === 'ALLURA' || u === 'KAZURA' || u === 'URAH' || u === 'RANACH') return u
  return v
}

function toSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseTime(val: unknown): string | null {
  if (val === null || val === undefined) return null
  if (val instanceof Date) {
    return `${val.getUTCHours().toString().padStart(2, '0')}:${val.getUTCMinutes().toString().padStart(2, '0')}`
  }
  if (typeof val === 'number') {
    const totalMin = Math.round(val * 24 * 60)
    return `${(Math.floor(totalMin / 60) % 24).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`
  }
  if (typeof val === 'string') {
    const m = val.trim().match(/^(\d{1,2}):(\d{2})/)
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  }
  return null
}

function parseDate(val: unknown): string | null {
  if (val instanceof Date && val.getUTCFullYear() > 1900) {
    return `${val.getUTCFullYear()}-${(val.getUTCMonth() + 1).toString().padStart(2, '0')}-${val.getUTCDate().toString().padStart(2, '0')}`
  }
  return null
}

function parseTimeCompact(val: unknown): string | null {
  if (typeof val !== 'string') return null
  const s = val.trim().toUpperCase()
  const std = parseTime(s)
  if (std) return std
  const m = s.match(/^(\d{1,2})\s*H\s*(\d{2})?$/)
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${(m[2] ?? '00').padStart(2, '0')}`
}

function parseDateHeaderAdiantados(val: unknown, ano: number): string | null {
  if (typeof val !== 'string') return null
  const m = val.trim().match(/^(\d{1,2})\/(\d{1,2})\s*-/)
  if (!m) return null
  return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

interface ParsedGame {
  sport: string; date_str: string; hora: string; divisao: string
  mod_code: string; quadra: string; equipe_a: string; equipe_b: string
}

function parseSheet0(
  ws: XLSX.WorkSheet, sheetName: string,
  diasEvento: Array<{ data: string; nome_dia: string }>,
): { date_str: string; games: ParsedGame[] } {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })
  let date_str = ''
  if (rows.length > 0) { const d = parseDate(rows[0][0]); if (d) date_str = d }
  if (!date_str) {
    const m = sheetName.match(/^TABELA\s+DIA\s+(\d{1,2})/i)
    if (m) { const n = parseInt(m[1], 10); if (n >= 1 && n <= diasEvento.length) date_str = diasEvento[n - 1].data }
  }
  if (!date_str) return { date_str: '', games: [] }

  let currentSport = ''
  const games: ParsedGame[] = []
  for (const row of rows) {
    if (parseDate(row[0])) continue
    const nonNull = row.filter(v => v !== null && v !== undefined)
    if (nonNull.length >= 1 && nonNull.length <= 4 && typeof nonNull[0] === 'string') {
      const s = (nonNull[0] as string).trim()
      const looksLikeSportHeader =
        s.length >= 3 && !s.includes('—') && !s.includes('JOGOS') &&
        s !== 'HORA' && s !== 'X' && !/\d/.test(s) && parseTime(row[0]) === null
      if (looksLikeSportHeader) { currentSport = s; continue }
    }
    if (!currentSport) continue
    for (let g = 0; g < 3; g++) {
      const o = g * 10
      if (o + 8 >= row.length) continue
      const hora = parseTime(row[o])
      const div = row[o + 1], mod = row[o + 2], quad = row[o + 3], tA = row[o + 4], tB = row[o + 8]
      if (!hora || !tA || !tB) continue
      if (tA === 'ATLÉTICA' || tB === 'ATLÉTICA') continue
      if (typeof tA !== 'string' || typeof tB !== 'string') continue
      const modCode = mod ? String(mod).trim() : ''
      if (!MODALIDADE_MAP[modCode]) continue
      games.push({
        sport: currentSport, date_str, hora,
        divisao: div ? normalizarDivisao(String(div)) : '',
        mod_code: modCode, quadra: quad ? String(quad).trim() : '',
        equipe_a: tA.trim(), equipe_b: tB.trim(),
      })
    }
  }
  return { date_str, games }
}

function parseSheetAdiantados(ws: XLSX.WorkSheet, ano: number): ParsedGame[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })
  const games: ParsedGame[] = []
  let dateLeft = '', dateRight = ''
  for (const row of rows) {
    const dL = parseDateHeaderAdiantados(row[0], ano); if (dL) dateLeft = dL
    const dR = parseDateHeaderAdiantados(row[10], ano); if (dR) dateRight = dR
    const sides = [
      { off: 0, date_str: dateLeft, skip: !!dL },
      { off: 10, date_str: dateRight, skip: !!dR },
    ]
    for (const { off, date_str, skip } of sides) {
      if (skip || !date_str) continue
      const quadRaw = row[off], horaRaw = row[off + 1], divRaw = row[off + 2]
      const modRaw = row[off + 3], tARaw = row[off + 4], tBRaw = row[off + 8]
      let quadra = ''
      if (typeof quadRaw === 'string') {
        quadra = quadRaw.trim()
        if (quadra === 'UBERLÂNDIA' || quadra === 'UBERABA') continue
      } else if (quadRaw !== null && quadRaw !== undefined) continue
      const hora = parseTimeCompact(horaRaw) ?? parseTime(horaRaw)
      if (!hora) continue
      const modCode = modRaw ? String(modRaw).trim() : ''
      if (!modCode || !MODALIDADE_MAP[modCode]) continue
      if (typeof tARaw !== 'string' || typeof tBRaw !== 'string') continue
      const equipe_a = tARaw.trim(), equipe_b = tBRaw.trim()
      if (!equipe_a || !equipe_b || equipe_a === 'ATLÉTICA' || equipe_b === 'ATLÉTICA') continue
      const info = MODALIDADE_MAP[modCode]
      games.push({
        sport: info.nome, date_str, hora,
        divisao: divRaw ? normalizarDivisao(String(divRaw)) : '',
        mod_code: modCode, quadra, equipe_a, equipe_b,
      })
    }
  }
  return games
}

function parseWorkbook(
  wb: XLSX.WorkBook, anoEvento: number,
  diasEvento: Array<{ data: string; nome_dia: string }>,
): { games: ParsedGame[]; primary_date: string } {
  const sheet0Name = wb.SheetNames[0]
  const { date_str: primary_date, games: gamesMain } = parseSheet0(wb.Sheets[sheet0Name], sheet0Name, diasEvento)
  const adiantadosSheet = wb.Sheets['JOGOS ADIANTADOS']
  const gamesAdiantados = adiantadosSheet ? parseSheetAdiantados(adiantadosSheet, anoEvento) : []
  return { games: [...gamesMain, ...gamesAdiantados], primary_date }
}

// ── Stats de resposta ─────────────────────────────────────────────────────────
export interface ImportStats {
  date_str: string; dia_nome: string
  jogos_novos: number; jogos_existentes: number; jogos_total: number
  jogos_carimbados: number; modalidades_criadas: number; setores_criados: number
  dias_processados: Array<{ data: string; dia_nome: string; jogos_novos: number; jogos_existentes: number }>
  erros: string[]
}
export type ImportResult =
  | { ok: true; stats: ImportStats }
  | { ok: false; error: string; status: number }

// ── Núcleo: processa um WorkBook já lido ──────────────────────────────────────
export async function processarWorkbookJogos(
  supabase: DbClient, wb: XLSX.WorkBook, opts: { overwrite: boolean },
): Promise<ImportResult> {
  const overwrite = opts.overwrite

  const { data: edicao } = await supabase
    .from('edicoes').select('id, ano').eq('ativa', true).maybeSingle()
  if (!edicao) return { ok: false, error: 'Nenhuma edição ativa. Configure em /admin/edicoes.', status: 422 }
  const edicao_id = edicao.id
  const anoEvento = edicao.ano ?? new Date().getUTCFullYear()

  const { data: diasEventoRaw } = await supabase
    .from('dias_evento').select('id, data, nome_dia').eq('edicao_id', edicao_id).order('data', { ascending: true })
  const diasEventoAll = (diasEventoRaw ?? []) as Array<{ id: string; data: string; nome_dia: string }>

  // "TABELA DIA N" → N-ésimo dia OFICIAL (sentinela 00000000-0000-0001-0000-...).
  const SENTINEL = /^00000000-0000-0001-0000-/
  const diasOficiais = diasEventoAll.filter(d => SENTINEL.test(d.id)).sort((a, b) => a.data.localeCompare(b.data))
  const diasParaMapa = diasOficiais.length > 0 ? diasOficiais : diasEventoAll

  const { games, primary_date } = parseWorkbook(wb, anoEvento, diasParaMapa)
  if (games.length === 0) {
    if (diasEventoAll.length === 0) {
      return { ok: false, status: 422, error: 'A edição ativa não tem dias cadastrados. Cadastre os dias em /admin/dias, OU adicione a data na célula A1 da aba TABELA DIA 01.' }
    }
    return { ok: false, error: 'Nenhum jogo encontrado na planilha.', status: 422 }
  }

  const gamesByDate = new Map<string, ParsedGame[]>()
  for (const g of games) {
    if (!g.date_str) continue
    const arr = gamesByDate.get(g.date_str)
    if (arr) arr.push(g); else gamesByDate.set(g.date_str, [g])
  }
  if (gamesByDate.size === 0) return { ok: false, error: 'Data do evento não encontrada na planilha.', status: 422 }

  const datasOrdenadas = [...gamesByDate.keys()].sort()
  const diasMap = new Map<string, { id: string; nome: string }>()
  for (const data of datasOrdenadas) {
    let { data: dia } = await supabase
      .from('dias_evento').select('id, nome_dia').eq('edicao_id', edicao_id).eq('data', data).maybeSingle()
    if (!dia) {
      const weekday = WEEKDAY_PT[new Date(data + 'T12:00:00Z').getUTCDay()] ?? 'Dia'
      const { data: newDia, error: diaErr } = await supabase
        .from('dias_evento').insert({ edicao_id, data, nome_dia: weekday }).select('id, nome_dia').single()
      if (diaErr || !newDia) return { ok: false, error: `Erro ao criar dia ${data}: ${diaErr?.message}`, status: 500 }
      dia = newDia
    }
    diasMap.set(data, { id: dia.id, nome: dia.nome_dia })
  }

  if (overwrite) {
    const diaIds = [...diasMap.values()].map(d => d.id)
    if (diaIds.length > 0) await supabase.from('jogos').delete().in('dia_id', diaIds).eq('edicao_id', edicao_id)
  }

  // Modalidades
  const { data: existingMods } = await supabase.from('modalidades').select('id, slug').eq('edicao_id', edicao_id)
  const modMap: Record<string, string> = {}
  for (const m of existingMods ?? []) modMap[m.slug] = m.id
  let modalidades_criadas = 0
  for (const code of [...new Set(games.map(g => g.mod_code))]) {
    const info = MODALIDADE_MAP[code]; if (!info) continue
    const slug = toSlug(info.nome)
    if (!modMap[slug]) {
      const { data: created } = await supabase.from('modalidades').insert({ edicao_id, nome: info.nome, slug, icone: info.icone }).select('id').single()
      if (created) { modMap[slug] = created.id; modalidades_criadas++ }
    }
  }

  // Setores
  const { data: existingSetores } = await supabase.from('setores').select('id, nome').eq('edicao_id', edicao_id)
  const setorMap: Record<string, string> = {}
  for (const s of existingSetores ?? []) setorMap[s.nome.toLowerCase()] = s.id
  let setores_criados = 0
  for (const nome of [...new Set(games.map(g => g.quadra).filter(Boolean))]) {
    const key = nome.toLowerCase()
    if (!setorMap[key]) {
      const { data: created } = await supabase.from('setores').insert({ edicao_id, nome, tipo: 'esportivo' }).select('id').single()
      if (created) { setorMap[key] = created.id; setores_criados++ }
    }
  }

  // Insert + dedup por confronto
  let jogos_novos = 0, jogos_existentes = 0
  const erros: string[] = []
  const dias_processados: ImportStats['dias_processados'] = []
  const canonNome = (s: string | null | undefined) =>
    (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
  const confrontoKey = (modId: string, cat: string, div: string | null, a: string, b: string) =>
    [modId, canonNome(cat), canonNome(div), [canonNome(a), canonNome(b)].sort().join('~')].join('|')

  const { data: allExisting } = await supabase
    .from('jogos').select('id, modalidade_id, categoria, divisao, equipe_a_nome, equipe_b_nome').eq('edicao_id', edicao_id)
  const confrontoToId = new Map<string, string>()
  for (const j of allExisting ?? []) {
    confrontoToId.set(confrontoKey(j.modalidade_id, j.categoria ?? '', j.divisao, j.equipe_a_nome ?? '', j.equipe_b_nome ?? ''), j.id)
  }
  const toUpdate: Array<{ id: string; dia_id: string; setor_id: string | null; inicio: string; fim: string }> = []

  for (const data of datasOrdenadas) {
    const dia = diasMap.get(data)!, diaGames = gamesByDate.get(data)!, dia_id = dia.id
    const toInsert: Array<Record<string, unknown>> = []
    let dia_jogos_existentes = 0
    for (const g of diaGames) {
      const info = MODALIDADE_MAP[g.mod_code]
      const modId = modMap[toSlug(info.nome)]
      const setorId = g.quadra ? setorMap[g.quadra.toLowerCase()] ?? null : null
      const inicio = new Date(`${g.date_str}T${g.hora}:00-03:00`).toISOString()
      const fim = new Date(new Date(inicio).getTime() + info.duracao_min * 60000).toISOString()
      const codeUpper = g.mod_code.toUpperCase()
      let categoria: 'Masculino' | 'Feminino'
      if (codeUpper === 'FC' || codeUpper === 'F7M') categoria = 'Masculino'
      else if (codeUpper.endsWith('F')) categoria = 'Feminino'
      else categoria = 'Masculino'
      const ck = confrontoKey(modId, categoria, g.divisao || null, g.equipe_a, g.equipe_b)
      const existingId = confrontoToId.get(ck)
      if (existingId === '__novo__') { dia_jogos_existentes++; continue }
      if (existingId) { toUpdate.push({ id: existingId, dia_id, setor_id: setorId, inicio, fim }); dia_jogos_existentes++; continue }
      confrontoToId.set(ck, '__novo__')
      toInsert.push({
        edicao_id, modalidade_id: modId, dia_id, setor_id: setorId,
        divisao: g.divisao || null, categoria,
        equipe_a_nome: g.equipe_a, equipe_b_nome: g.equipe_b,
        inicio, fim_previsto: fim, status: 'agendado',
      })
    }
    let dia_jogos_novos = 0
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50)
      const { error } = await supabase.from('jogos').insert(batch).select('id')
      if (error) erros.push(`${data}: ${error.message}`); else dia_jogos_novos += batch.length
    }
    jogos_novos += dia_jogos_novos
    jogos_existentes += dia_jogos_existentes
    dias_processados.push({ data, dia_nome: dia.nome, jogos_novos: dia_jogos_novos, jogos_existentes: dia_jogos_existentes })
  }

  for (const u of toUpdate) {
    const { error } = await supabase.from('jogos')
      .update({ dia_id: u.dia_id, setor_id: u.setor_id, inicio: u.inicio, fim_previsto: u.fim }).eq('id', u.id)
    if (error) erros.push(`update ${u.id}: ${error.message}`)
  }

  // Carimba fase + bracket_num (chave). Sem isso, classificação/propagação quebram.
  let jogos_carimbados = 0
  try { jogos_carimbados = (await stampTodasAsChaves(supabase)).carimbados }
  catch (e) { erros.push(`stamp fases: ${String(e)}`) }

  const date_str_resp = primary_date && diasMap.has(primary_date) ? primary_date : datasOrdenadas[0]
  const dia_nome_resp = diasMap.get(date_str_resp)?.nome ?? ''

  if (setores_criados > 0) revalidateTag('lookup-setores', 'max')
  if (modalidades_criadas > 0) revalidateTag('lookup-modalidades', 'max')
  revalidateTag('lookup-dias', 'max')

  return {
    ok: true,
    stats: {
      date_str: date_str_resp, dia_nome: dia_nome_resp,
      jogos_novos, jogos_existentes, jogos_total: games.length,
      jogos_carimbados, modalidades_criadas, setores_criados, dias_processados, erros,
    },
  }
}

// ── Sync: baixa a planilha mestre e processa (para o botão / webhook futuro) ──
export async function sincronizarTabelaJogosCore(
  supabase: DbClient, opts: { overwrite?: boolean } = {},
): Promise<ImportResult> {
  let buffer: ArrayBuffer
  try {
    const res = await fetch(jogosXlsxUrl(), { cache: 'no-store', redirect: 'follow' })
    if (!res.ok) return { ok: false, error: `Falha ao baixar a planilha (HTTP ${res.status}). Confirme que ela está compartilhada para leitura.`, status: 502 }
    buffer = await res.arrayBuffer()
  } catch (e) {
    return { ok: false, error: `Erro de rede ao baixar a planilha: ${String(e)}`, status: 502 }
  }
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
  return processarWorkbookJogos(supabase, wb, { overwrite: opts.overwrite ?? false })
}
