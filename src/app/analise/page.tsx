import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { redirect } from 'next/navigation'
import { AnaliseClient } from './AnaliseClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Análise de Operação · CIA 2026' }

const CAN_VIEW = ['admin', 'coordenacao', 'coordenador_esportivo', 'lider_area', 'lider_fv', 'lider_cobertura']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const by = (arr: any[], k: string): [string, number][] => {
  const m: Record<string, number> = {}
  for (const r of arr) { const v = String(r[k] ?? '(vazio)'); m[v] = (m[v] || 0) + 1 }
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const split = (arr: any[], k: string): [string, number][] => {
  const m: Record<string, number> = {}
  for (const r of arr) { if (!r[k]) continue; for (const v of String(r[k]).split(',')) { const x = v.trim(); if (x) m[x] = (m[x] || 0) + 1 } }
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

export default async function AnalisePage() {
  const profile = await requireProfile()
  if (!CAN_VIEW.includes(profile.role)) redirect('/')

  const supabase = await createClient()
  const head = (t: string) => supabase.from(t).select('*', { count: 'exact', head: true })

  const [
    { data: ct }, { data: pf }, { data: st }, { data: tu },
    shows, festas, patroc, pautas, escEsp, evJogo, push, jogosEnc,
  ] = await Promise.all([
    supabase.from('conteudos').select('status, tipo, canal_publicacao, publicado_em, patrocinador_id, status_captacao, status_design, status_edicao'),
    supabase.from('profiles').select('role, funcao_principal, ativo, empresa_cobertura'),
    supabase.from('setores').select('tipo, nucleo, tem_youtube_live'),
    supabase.from('turnos').select('funcao'),
    head('shows'), head('festas'), head('patrocinadores'), head('pautas'),
    head('escalas_esportivo'), head('eventos_jogo'), head('push_subscriptions'),
    supabase.from('jogos').select('*', { count: 'exact', head: true }).eq('status', 'encerrado'),
  ])

  const conteudos = ct ?? []
  const pessoas = pf ?? []
  const setores = st ?? []
  const turnos = tu ?? []

  const pub = conteudos.filter(c => c.status === 'publicado').length
  const conc = (k: string) => conteudos.filter(c => (c as Record<string, unknown>)[k] === 'concluido').length

  const data = {
    kpis: {
      conteudos: conteudos.length,
      publicados: pub,
      pctPub: conteudos.length ? Math.round(pub / conteudos.length * 100) : 0,
      pessoas: pessoas.length,
      pessoasAtivas: pessoas.filter(p => p.ativo).length,
      empresas: new Set(pessoas.map(p => p.empresa_cobertura).filter(Boolean)).size,
      setores: setores.length,
      ytLives: setores.filter(s => s.tem_youtube_live).length,
      jogosEnc: jogosEnc.count ?? 0,
      evJogo: evJogo.count ?? 0,
      push: push.count ?? 0,
      patrocinados: conteudos.filter(c => c.patrocinador_id).length,
      pautas: pautas.count ?? 0,
      shows: shows.count ?? 0,
      festas: festas.count ?? 0,
      patroc: patroc.count ?? 0,
      escEsp: escEsp.count ?? 0,
      turnos: turnos.length,
    },
    conteudoStatus: by(conteudos, 'status'),
    canais: split(conteudos, 'canal_publicacao').slice(0, 8),
    formatos: split(conteudos, 'tipo').slice(0, 8),
    pipeline: [
      { nome: 'Captação', n: conc('status_captacao') },
      { nome: 'Design', n: conc('status_design') },
      { nome: 'Edição', n: conc('status_edicao') },
    ],
    roles: by(pessoas, 'role'),
    funcoes: by(pessoas, 'funcao_principal').filter(([k]) => k !== '(vazio)').slice(0, 10),
    setorTipos: by(setores, 'tipo'),
    turnoFuncoes: by(turnos, 'funcao').slice(0, 10),
  }

  return <AnaliseClient data={data} />
}
