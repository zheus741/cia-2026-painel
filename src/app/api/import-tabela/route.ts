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
  F7:   { nome: 'Futebol 7 Masculino',     icone: '🥅',  duracao_min: 60 },  // código curto usado na planilha
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

// Normaliza valores da coluna DIV: abreviações de conferências → nome
// canônico (ALLURA/KAZURA/CYBER CITY/ESPETÁCULO/ELDORADO/ATHEMPURA/URAH/
// RANACH). Divisões reais (1ª, 2ª) ou valores desconhecidos passam direto.
function normalizarDivisao(raw: string): string {
  const v = raw.trim()
  const u = v.toUpperCase()
  if (u === 'CYBERC' || u === 'CYBERCOTY' || u === 'CYBER' || u === 'CYBER CITY') return 'CYBER CITY'
  if (u === 'ATHEMP' || u === 'ATHEMPURA') return 'ATHEMPURA'
  if (u === 'ELDORA' || u === 'ELDORADO') return 'ELDORADO'
  if (u === 'ESPETA' || u === 'ESPETÁ' || u === 'ESPETACULO' || u === 'ESPETÁCULO') return 'ESPETÁCULO'
  if (u === 'ALLURA' || u === 'KAZURA' || u === 'URAH' || u === 'RANACH') return u
  return v
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

/**
 * Converte strings de hora compactas tipo "08H", "20h30", "00H", "21H30"
 * para "HH:MM". Retorna null se não bater.
 */
function parseTimeCompact(val: unknown): string | null {
  if (typeof val !== 'string') return null
  const s = val.trim().toUpperCase()
  // Primeiro tenta o formato padrão "HH:MM"
  const std = parseTime(s)
  if (std) return std
  // "HH" + "H" + opcional "MM"
  const m = s.match(/^(\d{1,2})\s*H\s*(\d{2})?$/)
  if (!m) return null
  const h = m[1].padStart(2, '0')
  const min = (m[2] ?? '00').padStart(2, '0')
  return `${h}:${min}`
}

/** Detecta header "DD/MM - DIA_SEMANA" e devolve YYYY-MM-DD (usando ano informado). */
function parseDateHeaderAdiantados(val: unknown, ano: number): string | null {
  if (typeof val !== 'string') return null
  const m = val.trim().match(/^(\d{1,2})\/(\d{1,2})\s*-/)
  if (!m) return null
  const d  = m[1].padStart(2, '0')
  const mo = m[2].padStart(2, '0')
  return `${ano}-${mo}-${d}`
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

/** Extrai jogos da aba principal (TABELA DIA NN) — 3 grupos de 10 colunas.
 *  Prioriza data da célula A1; se ausente, infere pelo nome da aba ("TABELA DIA N")
 *  mapeando N → diasEvento[N-1].data. Retorna [] se não houver como resolver a data.
 */
function parseSheet0(
  ws: XLSX.WorkSheet,
  sheetName: string,
  diasEvento: Array<{ data: string; nome_dia: string }>,
): { date_str: string; games: ParsedGame[] } {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })

  // 1) Tenta A1 (prioridade)
  let date_str = ''
  if (rows.length > 0) {
    const d = parseDate(rows[0][0])
    if (d) date_str = d
  }

  // 2) Fallback: infere pelo nome da aba "TABELA DIA N"
  if (!date_str) {
    const m = sheetName.match(/^TABELA\s+DIA\s+(\d{1,2})/i)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= 1 && n <= diasEvento.length) {
        date_str = diasEvento[n - 1].data
      }
    }
  }

  if (!date_str) {
    console.warn(`[import-tabela] aba "${sheetName}": sem data em A1 e sem mapeamento no nome — pulando.`)
    return { date_str: '', games: [] }
  }

  let currentSport  = ''
  const games: ParsedGame[] = []

  for (const row of rows) {
    // (data já resolvida acima; pula a linha de header se for a A1 com data)
    if (parseDate(row[0])) continue

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
        divisao:  div  ? normalizarDivisao(String(div))  : '',
        mod_code: modCode,
        quadra:   quad ? String(quad).trim() : '',
        equipe_a: tA.trim(),
        equipe_b: tB.trim(),
      })
    }
  }

  return { date_str, games }
}

/**
 * Extrai jogos da aba "JOGOS ADIANTADOS".
 * Dois blocos lado-a-lado (cols 0-9 = Uberlândia; cols 10-19 = Uberaba),
 * cada um com seus próprios headers de data "DD/MM - DIA".
 * Cada linha de jogo: [local, hora_range, div, mod, A, _, "X", _, B].
 */
function parseSheetAdiantados(ws: XLSX.WorkSheet, ano: number): ParsedGame[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })
  const games: ParsedGame[] = []
  let dateLeft  = ''  // contexto de data lado Uberlândia (col 0)
  let dateRight = ''  // contexto de data lado Uberaba   (col 10)

  for (const row of rows) {
    // Atualiza data quando aparece header em qualquer lado.
    // Importante: o header só "consome" o próprio lado — o outro lado pode
    // ainda conter um jogo na mesma linha.
    const dL = parseDateHeaderAdiantados(row[0],  ano)
    if (dL) dateLeft  = dL
    const dR = parseDateHeaderAdiantados(row[10], ano)
    if (dR) dateRight = dR

    // Tenta parsear cada lado independente (pula só o lado que virou header)
    const sides: Array<{ off: number; date_str: string; skip: boolean }> = [
      { off: 0,  date_str: dateLeft,  skip: !!dL },
      { off: 10, date_str: dateRight, skip: !!dR },
    ]

    for (const { off, date_str, skip } of sides) {
      if (skip) continue
      if (!date_str) continue
      const quadRaw = row[off]
      const horaRaw = row[off + 1]
      const divRaw  = row[off + 2]
      const modRaw  = row[off + 3]
      const tARaw   = row[off + 4]
      const tBRaw   = row[off + 8]

      // Quadra é opcional (linhas-continuação aparecem sem local). Mas se vier,
      // tem que ser string — e skipa cabeçalho de cidade.
      let quadra = ''
      if (typeof quadRaw === 'string') {
        quadra = quadRaw.trim()
        if (quadra === 'UBERLÂNDIA' || quadra === 'UBERABA') continue
      } else if (quadRaw !== null && quadRaw !== undefined) {
        continue
      }

      // hora pode vir como "08:00 - 09:00" ou "08H" / "20h30"
      const hora = parseTimeCompact(horaRaw) ?? parseTime(horaRaw)
      if (!hora) continue

      const modCode = modRaw ? String(modRaw).trim() : ''
      if (!modCode || !MODALIDADE_MAP[modCode]) continue  // silencioso

      if (typeof tARaw !== 'string' || typeof tBRaw !== 'string') continue
      const equipe_a = tARaw.trim()
      const equipe_b = tBRaw.trim()
      if (!equipe_a || !equipe_b) continue
      if (equipe_a === 'ATLÉTICA' || equipe_b === 'ATLÉTICA') continue

      // sport = nome amigável da modalidade (cabeçalho não existe nesta aba)
      const info = MODALIDADE_MAP[modCode]
      games.push({
        sport:    info.nome,
        date_str,
        hora,
        divisao:  divRaw ? normalizarDivisao(String(divRaw)) : '',
        mod_code: modCode,
        quadra,
        equipe_a,
        equipe_b,
      })
    }
  }

  return games
}

/** Extrai todos os jogos do workbook combinando aba principal + "JOGOS ADIANTADOS". */
function parseWorkbook(
  wb: XLSX.WorkBook,
  anoEvento: number,
  diasEvento: Array<{ data: string; nome_dia: string }>,
): { games: ParsedGame[]; primary_date: string } {
  const sheet0Name = wb.SheetNames[0]
  const ws0 = wb.Sheets[sheet0Name]
  const { date_str: primary_date, games: gamesMain } = parseSheet0(ws0, sheet0Name, diasEvento)

  const adiantadosSheet = wb.Sheets['JOGOS ADIANTADOS']
  const gamesAdiantados = adiantadosSheet ? parseSheetAdiantados(adiantadosSheet, anoEvento) : []

  return { games: [...gamesMain, ...gamesAdiantados], primary_date }
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

    // Edição ativa (obtida antes do parse pra saber o ano dos jogos adiantados)
    const { data: edicao } = await supabase
      .from('edicoes').select('id, ano').eq('ativa', true).maybeSingle()
    if (!edicao) return NextResponse.json({ ok: false, error: 'Nenhuma edição ativa. Configure em /admin/edicoes.' }, { status: 422 })
    const edicao_id = edicao.id
    const anoEvento = edicao.ano ?? new Date().getUTCFullYear()

    // Dias do evento — usados como fallback pra resolver a data da aba principal
    // quando a célula A1 estiver vazia (mapeia "TABELA DIA N" → N-ésimo dia).
    const { data: diasEventoRaw } = await supabase
      .from('dias_evento')
      .select('id, data, nome_dia')
      .eq('edicao_id', edicao_id)
      .order('data', { ascending: true })
    const diasEventoAll = (diasEventoRaw ?? []) as Array<{ id: string; data: string; nome_dia: string }>

    // BUG FIX: "TABELA DIA N" deve mapear para o N-ésimo dia OFICIAL do evento
    // (04–07/06), NÃO para diasEvento[N-1] que incluía os dias de pré-evento
    // (30/05–03/06, jogos adiantados). Os 4 dias oficiais têm IDs sentinela
    // 00000000-0000-0001-0000-00000000000N. Antes, "DIA 01" caía em 30/05.
    const SENTINEL = /^00000000-0000-0001-0000-/
    const diasOficiais = diasEventoAll
      .filter(d => SENTINEL.test(d.id))
      .sort((a, b) => a.data.localeCompare(b.data))
    // Fallback: se nenhum dia sentinela existir, usa todos (comportamento antigo).
    const diasParaMapa = diasOficiais.length > 0 ? diasOficiais : diasEventoAll
    const diasEvento = diasEventoAll as Array<{ data: string; nome_dia: string }>

    const buffer = await file.arrayBuffer()
    const wb     = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
    const { games, primary_date } = parseWorkbook(wb, anoEvento, diasParaMapa)

    if (games.length === 0) {
      if (diasEvento.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'A edição ativa não tem dias cadastrados. Cadastre os dias do evento em /admin/dias antes de importar, OU adicione a data na célula A1 da aba TABELA DIA 01.',
        }, { status: 422 })
      }
      return NextResponse.json({ ok: false, error: 'Nenhum jogo encontrado na planilha.' }, { status: 422 })
    }

    // Agrupa jogos por data
    const gamesByDate = new Map<string, ParsedGame[]>()
    for (const g of games) {
      if (!g.date_str) continue
      const arr = gamesByDate.get(g.date_str)
      if (arr) arr.push(g)
      else gamesByDate.set(g.date_str, [g])
    }
    if (gamesByDate.size === 0) {
      return NextResponse.json({ ok: false, error: 'Data do evento não encontrada na planilha.' }, { status: 422 })
    }

    // Garante todos os dias_evento (ordena cronologicamente)
    const datasOrdenadas = [...gamesByDate.keys()].sort()
    const diasMap = new Map<string, { id: string; nome: string }>()
    for (const data of datasOrdenadas) {
      let { data: dia } = await supabase
        .from('dias_evento').select('id, nome_dia').eq('edicao_id', edicao_id).eq('data', data).maybeSingle()
      if (!dia) {
        const dateObj = new Date(data + 'T12:00:00Z')
        const weekday = WEEKDAY_PT[dateObj.getUTCDay()] ?? 'Dia'
        const { data: newDia, error: diaErr } = await supabase
          .from('dias_evento')
          .insert({ edicao_id, data, nome_dia: weekday })
          .select('id, nome_dia').single()
        if (diaErr || !newDia) return NextResponse.json({ ok: false, error: `Erro ao criar dia ${data}: ${diaErr?.message}` }, { status: 500 })
        dia = newDia
      }
      diasMap.set(data, { id: dia.id, nome: dia.nome_dia })
    }

    // Overwrite: remove jogos existentes de TODOS os dias processados
    if (overwrite) {
      const diaIds = [...diasMap.values()].map(d => d.id)
      if (diaIds.length > 0) {
        await supabase.from('jogos').delete().in('dia_id', diaIds).eq('edicao_id', edicao_id)
      }
    }

    // Modalidades — upsert por slug (globais por edição)
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

    // Setores — upsert por nome (globais por edição)
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

    // Insere jogos dia a dia
    let jogos_novos      = 0
    let jogos_existentes = 0   // = atualizados (mesmo confronto já existia)
    const erros: string[] = []
    const dias_processados: Array<{ data: string; dia_nome: string; jogos_novos: number; jogos_existentes: number }> = []

    // ── DEDUP GLOBAL POR CONFRONTO ────────────────────────────────────────────
    // Chave = modalidade + categoria + divisão + par de times (sem ordem, sem
    // hora). Imune a: reimport, mesmo jogo em dias diferentes, times invertidos.
    // Se o confronto já existe → ATUALIZA (dia/horário/quadra) em vez de duplicar.
    const canonNome = (s: string | null | undefined) =>
      (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
    const confrontoKey = (modId: string, cat: string, div: string | null, a: string, b: string) =>
      [modId, canonNome(cat), canonNome(div), [canonNome(a), canonNome(b)].sort().join('~')].join('|')

    const { data: allExisting } = await supabase
      .from('jogos')
      .select('id, modalidade_id, categoria, divisao, equipe_a_nome, equipe_b_nome')
      .eq('edicao_id', edicao_id)
    const confrontoToId = new Map<string, string>()
    for (const j of allExisting ?? []) {
      confrontoToId.set(confrontoKey(j.modalidade_id, j.categoria ?? '', j.divisao, j.equipe_a_nome ?? '', j.equipe_b_nome ?? ''), j.id)
    }
    const toUpdate: Array<{ id: string; dia_id: string; setor_id: string | null; inicio: string; fim: string }> = []

    for (const data of datasOrdenadas) {
      const dia       = diasMap.get(data)!
      const diaGames  = gamesByDate.get(data)!
      const dia_id    = dia.id

      const toInsert: Array<Record<string, unknown>> = []
      let dia_jogos_existentes = 0

      for (const g of diaGames) {
        const info     = MODALIDADE_MAP[g.mod_code]
        const modSlug  = toSlug(info.nome)
        const modId    = modMap[modSlug]
        const setorId  = g.quadra ? setorMap[g.quadra.toLowerCase()] ?? null : null

        const inicio = new Date(`${g.date_str}T${g.hora}:00-03:00`).toISOString()
        const fim    = new Date(new Date(inicio).getTime() + info.duracao_min * 60000).toISOString()

        // Deriva categoria do código da modalidade
        const codeUpper = g.mod_code.toUpperCase()
        let categoria: 'Masculino' | 'Feminino'
        if (codeUpper === 'FC' || codeUpper === 'F7M') categoria = 'Masculino'
        else if (codeUpper.endsWith('F'))              categoria = 'Feminino'
        else                                           categoria = 'Masculino'

        const ck = confrontoKey(modId, categoria, g.divisao || null, g.equipe_a, g.equipe_b)
        const existingId = confrontoToId.get(ck)
        if (existingId === '__novo__') { dia_jogos_existentes++; continue } // dup dentro do próprio arquivo
        if (existingId) {
          // Confronto já no banco → atualiza data/horário/quadra (não duplica).
          toUpdate.push({ id: existingId, dia_id, setor_id: setorId, inicio, fim })
          dia_jogos_existentes++
          continue
        }
        confrontoToId.set(ck, '__novo__')

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
      }

      // Inserir em batches de 50
      let dia_jogos_novos = 0
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50)
        const { error } = await supabase.from('jogos').insert(batch).select('id')
        if (error) erros.push(`${data}: ${error.message}`)
        else dia_jogos_novos += batch.length
      }

      jogos_novos      += dia_jogos_novos
      jogos_existentes += dia_jogos_existentes
      dias_processados.push({
        data,
        dia_nome:         dia.nome,
        jogos_novos:      dia_jogos_novos,
        jogos_existentes: dia_jogos_existentes,
      })
    }

    // Atualiza os confrontos que já existiam (data/horário/quadra), sem duplicar.
    for (const u of toUpdate) {
      const { error } = await supabase
        .from('jogos')
        .update({ dia_id: u.dia_id, setor_id: u.setor_id, inicio: u.inicio, fim_previsto: u.fim })
        .eq('id', u.id)
      if (error) erros.push(`update ${u.id}: ${error.message}`)
    }

    // Data "principal" da resposta = primary_date (aba TABELA DIA NN) se existir,
    // senão a primeira data cronológica encontrada.
    const date_str_resp = primary_date && diasMap.has(primary_date) ? primary_date : datasOrdenadas[0]
    const dia_nome_resp = diasMap.get(date_str_resp)?.nome ?? ''

    // Invalida caches lookup
    if (setores_criados > 0)     revalidateTag('lookup-setores', 'max')
    if (modalidades_criadas > 0) revalidateTag('lookup-modalidades', 'max')
    revalidateTag('lookup-dias', 'max')

    return NextResponse.json({
      ok: true,
      stats: {
        date_str:           date_str_resp,
        dia_nome:           dia_nome_resp,
        jogos_novos,
        jogos_existentes,
        jogos_total:        games.length,
        modalidades_criadas,
        setores_criados,
        dias_processados,
        erros,
      },
    })
  } catch (e) {
    console.error('[import-tabela]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
