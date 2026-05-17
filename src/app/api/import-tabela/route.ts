import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

// ── Modalidade map: código Excel → dados completos ────────────────────────────

const MODALIDADE_MAP: Record<string, { nome: string; icone: string; duracao_min: number }> = {
  // Coletivas tradicionais
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
  F7F:  { nome: 'Futebol 7 Feminino',      icone: '🥅',  duracao_min: 60 },
  // Peteca — aceita códigos curto e do XLSX
  PM:   { nome: 'Peteca Masculino',        icone: '🏸',  duracao_min: 60 },
  PF:   { nome: 'Peteca Feminino',         icone: '🏸',  duracao_min: 60 },
  PETM: { nome: 'Peteca Masculino',        icone: '🏸',  duracao_min: 60 },
  PETF: { nome: 'Peteca Feminino',         icone: '🏸',  duracao_min: 60 },
  // ── Fase A: Tênis ────────────────────────────────────────────────
  TCM:  { nome: 'Tênis de Campo Masc.',    icone: '🎾',  duracao_min: 60 },
  TCF:  { nome: 'Tênis de Campo Fem.',     icone: '🎾',  duracao_min: 60 },
  TMSM: { nome: 'Tênis de Mesa Masc.',     icone: '🏓',  duracao_min: 45 },
  TMSF: { nome: 'Tênis de Mesa Fem.',      icone: '🏓',  duracao_min: 45 },
}

const WEEKDAY_PT: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta',  5: 'Sexta',  6: 'Sábado',
}

// ── Parsing helpers ────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Converte célula do Excel (Date, string, number) para "HH:MM" */
function parseTime(val: unknown): string | null {
  if (val === null || val === undefined) return null
  if (val instanceof Date) {
    const h = val.getUTCHours(), m = val.getUTCMinutes()
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
  if (typeof val === 'number') {
    const totalMin = Math.round(val * 24 * 60)
    const h = Math.floor(totalMin / 60) % 24, m = totalMin % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
  if (typeof val === 'string') {
    const m = val.trim().match(/^(\d{1,2}):(\d{2})/)
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  }
  return null
}

/** Converte célula do Excel para "YYYY-MM-DD" */
function parseDate(val: unknown): string | null {
  if (val instanceof Date && val.getUTCFullYear() > 1900) {
    const y = val.getUTCFullYear()
    const mo = (val.getUTCMonth() + 1).toString().padStart(2, '0')
    const d  = val.getUTCDate().toString().padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return null
}

interface ParsedGame {
  sport:     string
  date_str:  string
  hora:      string
  divisao:   string
  mod_code:  string
  quadra:    string
  equipe_a:  string
  equipe_b:  string
}

/** Extrai todos os jogos do workbook — estrutura 3 grupos de 10 colunas */
function parseWorkbook(wb: XLSX.WorkBook): { date_str: string; games: ParsedGame[] } {
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })

  let date_str      = ''
  let currentSport  = ''
  const games: ParsedGame[] = []

  for (const row of rows) {
    // Linha 1: data do evento
    if (!date_str) {
      const d = parseDate(row[0])
      if (d) { date_str = d; continue }
    }

    const nonNull = row.filter(v => v !== null && v !== undefined)

    // Cabeçalho de esporte (ex: "FUTSAL", "HANDEBOL", "VOLEI DE PRAIA MASCULINO")
    if (
      nonNull.length >= 1 && nonNull.length <= 4 &&
      typeof nonNull[0] === 'string'
    ) {
      const s = (nonNull[0] as string).trim()
      const looksLikeSportHeader =
        s.length >= 3 &&
        !s.includes('—') &&
        !s.includes('JOGOS') &&
        s !== 'HORA' && s !== 'X' &&
        !/\d/.test(s) &&
        parseTime(row[0]) === null
      if (looksLikeSportHeader) {
        currentSport = s
        continue
      }
    }

    if (!currentSport) continue

    // Tenta 3 grupos de 10 colunas cada
    for (let g = 0; g < 3; g++) {
      const o    = g * 10
      if (o + 8 >= row.length) continue
      const hora = parseTime(row[o])
      const div  = row[o + 1]
      const mod  = row[o + 2]
      const quad = row[o + 3]
      const tA   = row[o + 4]
      const tB   = row[o + 8]

      if (!hora || !tA || !tB) continue
      if (tA === 'ATLÉTICA' || tB === 'ATLÉTICA') continue
      if (typeof tA !== 'string' || typeof tB !== 'string') continue
      const modCode = mod ? String(mod).trim() : ''
      if (!MODALIDADE_MAP[modCode]) continue  // ignora códigos desconhecidos

      games.push({
        sport:    currentSport,
        date_str,
        hora,
        divisao:  div  ? String(div).trim()  : '',
        mod_code: modCode,
        quadra:   quad ? String(quad).trim() : '',
        equipe_a: tA.trim(),
        equipe_b: tB.trim(),
      })
    }
  }

  return { date_str, games }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!profile || !['admin', 'coordenacao'].includes(profile.role)) {
      return NextResponse.json({ ok: false, error: 'Sem permissão.' }, { status: 403 })
    }

    // Parse form
    const form      = await req.formData()
    const file      = form.get('file') as File | null
    const overwrite = form.get('overwrite') === 'true'
    if (!file) return NextResponse.json({ ok: false, error: 'Arquivo não enviado.' }, { status: 400 })

    // Validação server-side de tipo e tamanho
    const ALLOWED_MIME = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!ALLOWED_MIME.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ ok: false, error: 'Tipo inválido. Envie .xlsx ou .xls.' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'Arquivo muito grande. Limite: 20 MB.' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const wb     = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
    const { date_str, games } = parseWorkbook(wb)

    if (!date_str) return NextResponse.json({ ok: false, error: 'Data do evento não encontrada na planilha (célula A1).' }, { status: 422 })
    if (games.length === 0) return NextResponse.json({ ok: false, error: 'Nenhum jogo encontrado na planilha.' }, { status: 422 })

    // Edição ativa
    const { data: edicao } = await supabase
      .from('edicoes').select('id').eq('ativa', true).maybeSingle()
    if (!edicao) return NextResponse.json({ ok: false, error: 'Nenhuma edição ativa. Configure em /admin/edicoes.' }, { status: 422 })
    const edicao_id = edicao.id

    // Dia do evento — cria se não existir
    let { data: dia } = await supabase
      .from('dias_evento').select('id, nome_dia').eq('edicao_id', edicao_id).eq('data', date_str).maybeSingle()

    if (!dia) {
      const dateObj = new Date(date_str + 'T12:00:00Z')
      const weekday = WEEKDAY_PT[dateObj.getUTCDay()] ?? 'Dia'
      const { data: newDia, error: diaErr } = await supabase
        .from('dias_evento')
        .insert({ edicao_id, data: date_str, nome_dia: weekday })
        .select('id, nome_dia').single()
      if (diaErr || !newDia) return NextResponse.json({ ok: false, error: `Erro ao criar dia: ${diaErr?.message}` }, { status: 500 })
      dia = newDia
    }
    const dia_id = dia.id

    // Overwrite: remove jogos existentes do dia
    if (overwrite) {
      await supabase.from('jogos').delete().eq('dia_id', dia_id).eq('edicao_id', edicao_id)
    }

    // Modalidades — upsert por slug
    const { data: existingMods } = await supabase
      .from('modalidades').select('id, slug').eq('edicao_id', edicao_id)
    const modMap: Record<string, string> = {}  // slug → id
    for (const m of existingMods ?? []) modMap[m.slug] = m.id

    const uniqueCodes = [...new Set(games.map(g => g.mod_code))]
    let modalidades_criadas = 0

    for (const code of uniqueCodes) {
      const info = MODALIDADE_MAP[code]
      if (!info) continue
      const slug = toSlug(info.nome)
      if (!modMap[slug]) {
        const { data: created } = await supabase
          .from('modalidades')
          .insert({ edicao_id, nome: info.nome, slug, icone: info.icone })
          .select('id').single()
        if (created) { modMap[slug] = created.id; modalidades_criadas++ }
      }
    }

    // Setores — upsert por nome
    const { data: existingSetores } = await supabase
      .from('setores').select('id, nome').eq('edicao_id', edicao_id)
    const setorMap: Record<string, string> = {}  // nome.lower → id
    for (const s of existingSetores ?? []) setorMap[s.nome.toLowerCase()] = s.id

    const uniqueQuadras = [...new Set(games.map(g => g.quadra).filter(Boolean))]
    let setores_criados = 0

    for (const nome of uniqueQuadras) {
      const key = nome.toLowerCase()
      if (!setorMap[key]) {
        const { data: created } = await supabase
          .from('setores')
          .insert({ edicao_id, nome, tipo: 'esportivo' })
          .select('id').single()
        if (created) { setorMap[key] = created.id; setores_criados++ }
      }
    }

    // Jogos — verificar duplicatas e inserir
    const { data: existingJogos } = await supabase
      .from('jogos')
      .select('inicio, equipe_a_nome, equipe_b_nome')
      .eq('dia_id', dia_id).eq('edicao_id', edicao_id)

    const existingSet = new Set(
      (existingJogos ?? []).map(j => `${j.inicio}|${j.equipe_a_nome}|${j.equipe_b_nome}`)
    )

    const toInsert = []
    let jogos_existentes = 0

    for (const g of games) {
      const info     = MODALIDADE_MAP[g.mod_code]
      const modSlug  = toSlug(info.nome)
      const modId    = modMap[modSlug]
      const setorId  = g.quadra ? setorMap[g.quadra.toLowerCase()] ?? null : null

      // Montar timestamp de início
      const inicio = new Date(`${g.date_str}T${g.hora}:00-03:00`).toISOString()
      const fim    = new Date(new Date(inicio).getTime() + info.duracao_min * 60000).toISOString()

      const key = `${inicio}|${g.equipe_a}|${g.equipe_b}`
      if (existingSet.has(key)) { jogos_existentes++; continue }

      // Deriva categoria do código da modalidade (FF/HF/VF/VPF/BF/F7F = Feminino, resto = Masculino)
      // Códigos terminados em 'F' ou contendo 'F' representam feminino, exceto 'FC' (Futebol de Campo)
      const codeUpper = g.mod_code.toUpperCase()
      let categoria: 'Masculino' | 'Feminino'
      if (codeUpper === 'FC' || codeUpper === 'F7M') {
        categoria = 'Masculino'
      } else if (codeUpper.endsWith('F')) {
        categoria = 'Feminino'
      } else {
        categoria = 'Masculino'
      }

      toInsert.push({
        edicao_id,
        modalidade_id: modId,
        dia_id,
        setor_id:      setorId,
        divisao:       g.divisao || null,
        categoria,
        equipe_a_nome: g.equipe_a,
        equipe_b_nome: g.equipe_b,
        inicio,
        fim_previsto:  fim,
        status:        'agendado',
      })
      existingSet.add(key)
    }

    // Inserir em batches de 50
    let jogos_novos = 0
    const erros: string[] = []
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50)
      const { error, count } = await supabase.from('jogos').insert(batch).select('id')
      if (error) erros.push(error.message)
      else jogos_novos += batch.length
    }

    // Invalida caches lookup pra que novos setores/modalidades apareçam
    // imediatamente nos filtros (Escala, Esportivo Hub, etc.) sem esperar
    // os 5min do TTL do unstable_cache.
    // Next.js 16: revalidateTag exige 2 args (tag, profile). 'max' = invalida tudo.
    if (setores_criados > 0)     revalidateTag('lookup-setores', 'max')
    if (modalidades_criadas > 0) revalidateTag('lookup-modalidades', 'max')
    // Cache de dias só revalida se algo mudou de fato (sempre seguro)
    revalidateTag('lookup-dias', 'max')

    return NextResponse.json({
      ok: true,
      stats: {
        date_str,
        dia_nome:           dia.nome_dia,
        jogos_novos,
        jogos_existentes,
        jogos_total:        games.length,
        modalidades_criadas,
        setores_criados,
        erros,
      },
    })
  } catch (e) {
    console.error('[import-tabela]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
