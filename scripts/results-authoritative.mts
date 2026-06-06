// results-authoritative.mts — aplica resultados de TIME de um CSV como FONTE DE
// VERDADE (corrige slot errado do bracket + grava placar). Claim guloso por
// (mod,cat,div,fase) evita duplicar; cria só se não houver slot. Pula individuais.
//   DRY:   node --experimental-strip-types scripts/results-authoritative.mts "<csv>" "<div>"
//   APLICA:... "<csv>" "<div>" --apply
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { parseAba } from '../src/lib/planilha/parse-resultados.ts'
import { canonTeamName, fuzzyMatchTeam, resolveEquipeId } from '../src/lib/chaveamento/bracket-builder.ts'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const file = args.find(a => a.endsWith('.csv'))!
const divArg = args.find(a => !a.endsWith('.csv') && a !== '--apply') ?? '2ª'
const env: Record<string, string> = {}
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2] }
const sb: any = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
async function retry<T>(fn: () => Promise<T>, n = 40): Promise<T> { let e; for (let i = 0; i < n; i++) { try { return await fn() } catch (x) { e = x; await sleep(2000) } } throw e }

const res = parseAba(readFileSync(file, 'utf8'), divArg).filter(r => !/ - /.test(r.timeA) && !/VENCEDOR/i.test(r.timeA) && !/VENCEDOR/i.test(r.timeB))
console.log(`\n📄 ${file} [div ${divArg}] — ${APPLY ? 'APLICAR' : 'DRY'} · resultados de TIME: ${res.length}`)

const jogos = await retry(async () => { const j: any[] = []; for (let o = 0; ; o += 500) { const { data, error } = await sb.from('jogos').select('id,modalidade_id,edicao_id,dia_id,categoria,divisao,fase,status,placar_a,placar_b,penaltis_a,penaltis_b,equipe_a_id,equipe_a_nome,equipe_b_id,equipe_b_nome,modalidade:modalidades(nome)').range(o, o + 499); if (error) throw error; if (!data?.length) break; j.push(...data); if (data.length < 500) break } return j })
const { data: eqs } = await retry(async () => { const r = await sb.from('equipes').select('id,nome,edicao_id'); if (r.error) throw r.error; return r })

const modNome = (j: any) => { const m = Array.isArray(j.modalidade) ? j.modalidade[0] : j.modalidade; return m?.nome ?? '' }
const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const normDiv = (d: string) => norm(d).replace(/divis[ãa]o/g, '').replace(/[\s\-_·.ª°º]+/g, '')
const teamEq = (x: string, y: string) => { const a = canonTeamName(x), b = canonTeamName(y); return !!a && !!b && (a === b || fuzzyMatchTeam(a, b)) }
const TBD = (n: string) => !((n || '').trim())
const wantDiv = normDiv(divArg)
const ed = (() => { const c: Record<string, number> = {}; for (const j of jogos) if (j.edicao_id) c[j.edicao_id] = (c[j.edicao_id] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] })()
const eqR = (n: string) => { const id = resolveEquipeId(n, (eqs || []).filter((e: any) => e.edicao_id === ed) as any[]); const e = (eqs || []).find((x: any) => x.id === id); return { id: id || null, nome: e?.nome || n } }

const claimed = new Set<string>()
const plan: any[] = []
for (const r of res) {
  const cands = jogos.filter(j => !claimed.has(j.id) && r.inc.every((k: string) => norm(modNome(j)).includes(k)) && !r.exc.some((k: string) => norm(modNome(j)).includes(k)) && norm(j.categoria || '') === norm(r.categoria || '') && normDiv(j.divisao || '') === wantDiv && j.fase === r.fase)
  const scored = cands.map(j => { const ov = (teamEq(j.equipe_a_nome, r.timeA) || teamEq(j.equipe_b_nome, r.timeA) ? 1 : 0) + (teamEq(j.equipe_a_nome, r.timeB) || teamEq(j.equipe_b_nome, r.timeB) ? 1 : 0); return { j, ov, vaz: [j.equipe_a_nome, j.equipe_b_nome].filter(TBD).length } }).sort((a, b) => b.ov - a.ov || b.vaz - a.vaz)
  const best = scored[0]
  // orientação: timeA→slotA se best.j.equipe_a casa timeA (ou vazio)
  const swap = best && best.ov >= 1 ? (teamEq(best.j.equipe_b_nome, r.timeA) || teamEq(best.j.equipe_a_nome, r.timeB)) : false
  if (best && best.ov === 2) {
    const pa = swap ? r.placarB : r.placarA, pb = swap ? r.placarA : r.placarB
    const pna = swap ? r.penB : r.penA, pnb = swap ? r.penA : r.penB
    if (best.j.status === 'encerrado' && best.j.placar_a === pa && best.j.placar_b === pb) { claimed.add(best.j.id); plan.push({ a: 'OK', r }); continue }
    claimed.add(best.j.id); plan.push({ a: 'APPLY', r, j: best.j, pa, pb, pna, pnb }); continue
  }
  // ov==1: claim e SOBRESCREVE o slot (corrige par errado, inclusive Frankenstein
  // já encerrado com placar trocado — CSV é a fonte de verdade no mata-mata).
  if (best && best.ov === 1) { claimed.add(best.j.id); plan.push({ a: best.j.status === 'encerrado' ? 'FIX_ENC' : 'FIX', r, j: best.j }); continue }
  const vazia = scored.find(s => s.vaz === 2 && s.j.status !== 'encerrado')
  if (vazia) { claimed.add(vazia.j.id); plan.push({ a: 'SETVAZIO', r, j: vazia.j }); continue }
  plan.push({ a: 'CREATE', r })
}
const by: Record<string, number> = {}; for (const p of plan) by[p.a] = (by[p.a] || 0) + 1
console.log('  plano:', JSON.stringify(by))
for (const p of plan.filter(p => p.a === 'CONFLITO_ENC').slice(0, 20)) console.log(`   ⚠️ CONFLITO ENCERRADO: ${p.r.modalidadeLabel} ${p.r.categoria} ${p.r.fase} ${p.r.timeA} ${p.r.placarA}x${p.r.placarB} ${p.r.timeB} | banco ${p.j.equipe_a_nome} ${p.j.placar_a}x${p.j.placar_b} ${p.j.equipe_b_nome}`)

if (APPLY) {
  let upd = 0, ins = 0, err = 0
  for (const p of plan) {
    try {
      const r = p.r
      if (p.a === 'APPLY') {
        await retry(async () => { const { error } = await sb.from('jogos').update({ placar_a: p.pa, placar_b: p.pb, status: 'encerrado', ...(p.pna != null && p.pnb != null ? { penaltis_a: p.pna, penaltis_b: p.pnb } : {}) }).eq('id', p.j.id); if (error) throw error }); upd++
      } else if (p.a === 'FIX' || p.a === 'FIX_ENC' || p.a === 'SETVAZIO' || p.a === 'CREATE') {
        const ra = eqR(r.timeA), rb = eqR(r.timeB)
        const body: any = { equipe_a_id: ra.id, equipe_a_nome: ra.nome, equipe_b_id: rb.id, equipe_b_nome: rb.nome, placar_a: r.placarA, placar_b: r.placarB, status: 'encerrado', ...(r.penA != null && r.penB != null ? { penaltis_a: r.penA, penaltis_b: r.penB } : {}) }
        if (p.a === 'CREATE') {
          const sib = jogos.find(j => r.inc.every((k: string) => norm(modNome(j)).includes(k)) && !r.exc.some((k: string) => norm(modNome(j)).includes(k)) && norm(j.categoria || '') === norm(r.categoria || '') && normDiv(j.divisao || '') === wantDiv)
          if (!sib) { console.log('   ⚠️ sem sibling', r.modalidadeLabel, r.categoria); err++; continue }
          await retry(async () => { const { error } = await sb.from('jogos').insert({ edicao_id: sib.edicao_id, modalidade_id: sib.modalidade_id, categoria: sib.categoria, divisao: sib.divisao, fase: r.fase, dia_id: sib.dia_id, bracket_num: null, ...body }); if (error) throw error }); ins++
        } else {
          await retry(async () => { const { error } = await sb.from('jogos').update(body).eq('id', p.j.id); if (error) throw error }); upd++
        }
      }
    } catch (e: any) { err++; console.log('   erro:', p.r.modalidadeLabel, e?.message?.slice(0, 60)) }
  }
  console.log(`\n✅ atualizados=${upd} criados=${ins} erros=${err}`)
}
