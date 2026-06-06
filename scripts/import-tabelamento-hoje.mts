// ─────────────────────────────────────────────────────────────────────────────
// import-tabelamento-hoje.mts — importa os JOGOS DE HOJE do tabelamento como
// FONTE DE VERDADE dos confrontos (o bracket gerado está mis-slottado).
//
// Para cada jogo do tabelamento (mod,cat,div,fase, timeA, timeB) garante uma
// linha em `jogos` com EXATAMENTE esses 2 times. Casa por sobreposição de time
// (claim guloso, evita 2 semis caírem na mesma linha); corrige slot errado;
// preenche bye; cria o que falta. NÃO mexe em jogo já encerrado.
//
//   DRY:   node --experimental-strip-types scripts/import-tabelamento-hoje.mts
//   APLICA:node --experimental-strip-types scripts/import-tabelamento-hoje.mts --apply
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { canonTeamName, fuzzyMatchTeam, resolveEquipeId } from '../src/lib/chaveamento/bracket-builder.ts'

const APPLY = process.argv.includes('--apply')
const env: Record<string, string> = {}
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]
}
const sb: any = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const tab = JSON.parse(readFileSync('/tmp/tab.json', 'utf8')) as any[]
const fixDiv = (d: string) => d === 'ALU' ? 'ALLURA' : d

// carrega tudo
const jogos: any[] = []
for (let o = 0; ; o += 1000) {
  const { data } = await sb.from('jogos').select('id,modalidade_id,edicao_id,bracket_num,categoria,divisao,fase,status,equipe_a_id,equipe_a_nome,equipe_b_id,equipe_b_nome,modalidade:modalidades(nome)').range(o, o + 999)
  if (!data || !data.length) break; jogos.push(...data); if (data.length < 1000) break
}
const { data: equipesRaw } = await sb.from('equipes').select('id,nome,edicao_id')
const { data: modsRaw } = await sb.from('modalidades').select('id,nome')

const modNome = (j: any) => { const m = Array.isArray(j.modalidade) ? j.modalidade[0] : j.modalidade; return m?.nome ?? '' }
const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const normDiv = (d: string) => norm(d).replace(/divis[ãa]o/g, '').replace(/[\s\-_·.ª°º]+/g, '')
const teamEq = (x: string, y: string) => { const a = canonTeamName(x), b = canonTeamName(y); return !!a && !!b && (a === b || fuzzyMatchTeam(a, b)) }
const TBD = (n: string) => !((n || '').trim())
const edicaoPadrao = (() => { const c: Record<string, number> = {}; for (const j of jogos) if (j.edicao_id) c[j.edicao_id] = (c[j.edicao_id] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] }) ()

const claimed = new Set<string>()
const plan: { action: string; tab: any; jogo?: any; note?: string }[] = []

for (const g0 of tab) {
  const g = { ...g0, div: fixDiv(g0.div) }
  const cands = jogos.filter(j => norm(modNome(j)) === norm(g.mod) && norm(j.categoria || '') === norm(g.cat) && normDiv(j.divisao || '') === normDiv(g.div) && j.fase === g.fase && !claimed.has(j.id))
  // pontua por sobreposição
  const scored = cands.map(j => {
    const lados = [j.equipe_a_nome, j.equipe_b_nome]
    const overlap = (teamEq(lados[0], g.a) || teamEq(lados[1], g.a) ? 1 : 0) + (teamEq(lados[0], g.b) || teamEq(lados[1], g.b) ? 1 : 0)
    const vazios = lados.filter(TBD).length
    return { j, overlap, vazios }
  }).sort((a, b) => b.overlap - a.overlap || b.vazios - a.vazios)
  const best = scored[0]
  if (best && best.overlap === 2) { claimed.add(best.j.id); plan.push({ action: 'OK', tab: g, jogo: best.j }); continue }
  if (best && best.overlap === 1) {
    if (best.j.status === 'encerrado') { plan.push({ action: 'CONFLITO_ENCERRADO', tab: g, jogo: best.j, note: 'jogo já encerrado com placar — não mexo' }); continue }
    claimed.add(best.j.id); plan.push({ action: best.vazios >= 1 ? 'FILL' : 'FIX_SLOT', tab: g, jogo: best.j }); continue
  }
  // sem sobreposição: usa linha vazia da mesma fase (claim) ou cria
  const vaziaLivre = scored.find(s => s.vazios === 2 && s.j.status !== 'encerrado')
  if (vaziaLivre) { claimed.add(vaziaLivre.j.id); plan.push({ action: 'SET_VAZIO', tab: g, jogo: vaziaLivre.j }); continue }
  plan.push({ action: 'CREATE', tab: g, note: cands.length ? `${cands.length} cand mas todas claimed/encerradas` : 'sem linha' })
}

// resumo
const byA: Record<string, number> = {}
for (const p of plan) byA[p.action] = (byA[p.action] || 0) + 1
console.log(`\n🗓️  IMPORT TABELAMENTO HOJE — ${APPLY ? 'APLICAR' : 'DRY-RUN'}  (${tab.length} jogos)\n`)
for (const [a, n] of Object.entries(byA).sort((x, y) => y[1] - x[1])) console.log(`   ${a}: ${n}`)

const eqsEdicao = (equipesRaw || []).filter((e: any) => !edicaoPadrao || e.edicao_id === edicaoPadrao)
// resolve {id, nome canônico}: prefere o NOME do banco (corrige typos do tabelamento)
const eqResolve = (nome: string): { id: string | null; nome: string } => {
  const id = resolveEquipeId(nome, eqsEdicao as any[])
  if (id) { const e = (equipesRaw || []).find((x: any) => x.id === id); if (e) return { id, nome: e.nome } }
  return { id: null, nome: nome }
}
const findSibling = (g: any) =>
  jogos.find(j => norm(modNome(j)) === norm(g.mod) && norm(j.categoria || '') === norm(g.cat) && normDiv(j.divisao || '') === normDiv(g.div))
  ?? jogos.find(j => norm(modNome(j)) === norm(g.mod) && norm(j.categoria || '') === norm(g.cat))
  ?? jogos.find(j => norm(modNome(j)) === norm(g.mod))
const resolveMod = (g: any, sibling?: any) => sibling?.modalidade_id ?? (modsRaw || []).find((m: any) => norm(m.nome) === norm(g.mod))?.id

function show(action: string) {
  const list = plan.filter(p => p.action === action)
  if (!list.length) return
  console.log(`\n── ${action} (${list.length}) ──`)
  for (const p of list.slice(0, 60)) {
    const g = p.tab
    const cur = p.jogo ? `banco "${p.jogo.equipe_a_nome || '∅'}" x "${p.jogo.equipe_b_nome || '∅'}" [${p.jogo.status}]` : (p.note || '')
    console.log(`   [${g.div}] ${g.mod} ${g.cat} ${g.fase} (J${g.jogo}): ${g.a} x ${g.b}  →  ${cur}`)
  }
}
for (const a of ['FIX_SLOT', 'FILL', 'SET_VAZIO', 'CREATE', 'CONFLITO_ENCERRADO']) show(a)

if (APPLY) {
  console.log('\n⚙️  Aplicando...')
  let upd = 0, ins = 0, err = 0
  for (const p of plan) {
    try {
      const g = p.tab
      const ra = eqResolve(g.a), rb = eqResolve(g.b)
      if (p.action === 'FILL' || p.action === 'FIX_SLOT' || p.action === 'SET_VAZIO') {
        await sb.from('jogos').update({ equipe_a_id: ra.id, equipe_a_nome: ra.nome, equipe_b_id: rb.id, equipe_b_nome: rb.nome }).eq('id', p.jogo.id)
        upd++
      } else if (p.action === 'CREATE') {
        const sibling = findSibling(g)
        const modId = resolveMod(g, sibling)
        if (!modId || !edicaoPadrao) { err++; console.log('   ⚠️ sem modalidade_id/edicao p/', g.mod, g.div); continue }
        const bnum = parseInt(String(g.jogo), 10)
        const base = {
          edicao_id: sibling?.edicao_id ?? edicaoPadrao, modalidade_id: modId, categoria: g.cat,
          divisao: sibling && normDiv(sibling.divisao || '') === normDiv(g.div) ? sibling.divisao : g.div,
          fase: g.fase, status: 'agendado',
          equipe_a_id: ra.id, equipe_a_nome: ra.nome, equipe_b_id: rb.id, equipe_b_nome: rb.nome,
        }
        // tenta com bracket_num; se colidir no índice único (outra semi já tem
        // esse bnum), reinsere com bnum=null (o match de resultado é por time).
        let r = await sb.from('jogos').insert({ ...base, bracket_num: Number.isNaN(bnum) ? null : bnum })
        if (r.error) r = await sb.from('jogos').insert({ ...base, bracket_num: null })
        if (r.error) { err++; console.log('   erro insert:', g.mod, g.div, g.fase, '·', r.error.message?.slice(0, 80)) }
        else ins++
      }
    } catch (e: any) { err++; console.log('   erro:', e.message?.slice(0, 80)) }
  }
  console.log(`\n✅ atualizados=${upd} criados=${ins} erros=${err}`)
}
