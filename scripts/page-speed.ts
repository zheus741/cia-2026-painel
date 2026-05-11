/**
 * Teste de velocidade real — mede o tempo das queries SSR de cada rota.
 *
 * Cada rota no App Router roda Server Components que fazem N queries antes
 * de retornar HTML. Esse script replica essas queries com a MESMA forma e
 * cronometra, simulando exatamente o que o usuário sente ao navegar.
 *
 * Uso: npx tsx scripts/page-speed.ts
 *
 * O número que importa é o WALL TIME — quanto o usuário espera entre
 * "clicar no link" e "ver o conteúdo". Em produção (Vercel) some ~50ms
 * de RTT até o servidor.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] }),
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Faltam env vars'); process.exit(1) }

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

type Step = { label: string; ms: number }
type Route = { name: string; description: string; run: () => Promise<Step[]> }

async function timed(label: string, fn: () => unknown): Promise<Step> {
  const t = performance.now()
  await fn()
  return { label, ms: performance.now() - t }
}

const ROUTES: Route[] = [
  {
    name: '/conteudos',
    description: 'Kanban (mais pesado — 1 query c/ 7 joins + 5 paralelas)',
    run: async () => {
      const auth = await timed('auth.getUser()', () =>
        supabase.from('profiles').select('id').limit(1))
      const me = await timed('profile.me', () =>
        supabase.from('profiles').select('role, funcao_principal').limit(1).maybeSingle())
      const parallel = performance.now()
      await Promise.all([
        supabase.from('edicoes').select('id').eq('ativa', true).maybeSingle(),
        supabase.from('conteudos').select(`
          id, titulo, tipo, status, prioridade,
          dia_id, setor_id, patrocinador_id, jogo_id, show_id, festa_id, modalidade_id,
          canal_publicacao, briefing, horario_previsto, link_publicado,
          responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id,
          dia:dia_id (nome_dia, data),
          setor:setor_id (nome),
          patrocinador:patrocinador_id (nome),
          jogo:jogo_id (equipe_a_nome, equipe_b_nome, modalidade:modalidade_id (nome, icone)),
          show:show_id (nome, inicio),
          festa:festa_id (nome, tema, inicio),
          modalidade:modalidade_id (nome, icone)
        `).order('dia_id', { ascending: true, nullsFirst: false }),
        supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
        supabase.from('setores').select('id, nome').order('nome'),
        supabase.from('patrocinadores').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('profiles').select('id, nome, foto_url').eq('ativo', true).order('nome'),
      ])
      return [auth, me, { label: 'queries paralelas (6)', ms: performance.now() - parallel }]
    },
  },
  {
    name: '/perfil',
    description: 'Página pessoal com agenda + kanban + KPIs',
    run: async () => {
      const auth = await timed('auth.getUser()', () => supabase.from('profiles').select('id').limit(1))
      const parallel = performance.now()
      await Promise.all([
        supabase.from('profiles').select('id, nome, email, foto_url, role, funcao_principal, bio').limit(1).maybeSingle(),
        supabase.from('turnos').select('id, funcao, inicio, fim, setor:setor_id(nome), dia:dia_id(nome_dia, data)').order('inicio'),
        supabase.from('conteudos').select('id, titulo, status, tipo, dia_id, responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id').limit(50),
      ])
      return [auth, { label: 'queries paralelas (3)', ms: performance.now() - parallel }]
    },
  },
  {
    name: '/escala-midia',
    description: 'Grid de escala (turnos + dias + setores + perfis)',
    run: async () => {
      const auth = await timed('auth.getUser()', () => supabase.from('profiles').select('id').limit(1))
      const me = await timed('profile.me', () =>
        supabase.from('profiles').select('role, funcao_principal').limit(1).maybeSingle())
      const parallel = performance.now()
      await Promise.all([
        supabase.from('turnos').select('id, dia_id, setor_id, funcao, inicio, fim, nome_pessoa, user_id, is_roaming, observacoes, setor:setor_id(nome), user:user_id(nome), dia:dia_id(nome_dia, data)'),
        supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
        supabase.from('setores').select('id, nome').order('nome'),
        supabase.from('profiles').select('id, nome, funcao_principal').eq('ativo', true).order('nome'),
      ])
      return [auth, me, { label: 'queries paralelas (4)', ms: performance.now() - parallel }]
    },
  },
  {
    name: '/esportivo',
    description: 'Lista de jogos com chaveamento (269 jogos)',
    run: async () => {
      const auth = await timed('auth.getUser()', () => supabase.from('profiles').select('id').limit(1))
      const jogos = await timed('jogos (todos c/ joins)', () =>
        supabase.from('jogos').select('id, modalidade_id, dia_id, setor_id, categoria, divisao, fase, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome, inicio, fim_previsto, status, placar_a, placar_b, modalidade:modalidade_id(nome, icone), dia:dia_id(nome_dia, data), setor:setor_id(nome)').order('inicio'))
      return [auth, jogos]
    },
  },
  {
    name: '/pautas',
    description: 'Board de pautas (8 hoje, ~300 no D-Day)',
    run: async () => {
      const auth = await timed('auth.getUser()', () => supabase.from('profiles').select('id').limit(1))
      const pautas = await timed('pautas + edicoes', () =>
        Promise.all([
          supabase.from('pautas').select('id, titulo, descricao, status, autor_id, criado_em').order('criado_em', { ascending: false }),
          supabase.from('edicoes').select('id, nome').eq('ativa', true).maybeSingle(),
        ]))
      return [auth, pautas]
    },
  },
  {
    name: '/' /* HomeMetrics */,
    description: 'Home dashboard (várias agregações)',
    run: async () => {
      const auth = await timed('auth.getUser()', () => supabase.from('profiles').select('id').limit(1))
      const parallel = performance.now()
      await Promise.all([
        supabase.from('conteudos').select('id, status, tipo, dia_id'),
        supabase.from('turnos').select('id, dia_id, funcao, user_id'),
        supabase.from('jogos').select('id, status, inicio'),
        supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
      ])
      return [auth, { label: 'agregações (4)', ms: performance.now() - parallel }]
    },
  },
]

async function main() {
  console.log(`\n⚡ Teste de velocidade — queries SSR por rota`)
  console.log(`   alvo: ${URL}`)
  console.log(`   ⚠️  números aqui são SÓ o banco. Em produção some 30-80ms de RTT.\n`)

  // warm-up — primeira query sempre vem mais lenta (cold connection)
  console.log(`🔥 warm-up...`)
  await supabase.from('profiles').select('id').limit(1)

  for (const route of ROUTES) {
    console.log(`\n━━━ ${route.name}`)
    console.log(`    ${route.description}`)

    // mede 3 vezes para ter média
    const runs: Step[][] = []
    for (let i = 0; i < 3; i++) {
      const t = performance.now()
      const steps = await route.run()
      const total = performance.now() - t
      runs.push([...steps, { label: 'TOTAL', ms: total }])
    }

    // média por step
    const stepNames = runs[0].map(s => s.label)
    for (const name of stepNames) {
      const samples = runs.map(r => r.find(s => s.label === name)!.ms).sort((a, b) => a - b)
      const median = samples[1]
      const max = samples[samples.length - 1]
      const bar = name === 'TOTAL' ? '█'.repeat(Math.min(30, Math.floor(median / 30))) : ''
      const flag = median > 800 ? ' 🚨' : median > 400 ? ' ⚠️ ' : ''
      console.log(`    ${name.padEnd(28)} ${median.toFixed(0).padStart(5)}ms  (max ${max.toFixed(0)}ms) ${bar}${flag}`)
    }
  }

  console.log(`\n📌 Referência (UX percebida):`)
  console.log(`   < 200ms: instantâneo`)
  console.log(`   200-500ms: bom`)
  console.log(`   500-1000ms: notável — usuário sente lag`)
  console.log(`   > 1000ms: ruim — clica e "não acontece nada"\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
