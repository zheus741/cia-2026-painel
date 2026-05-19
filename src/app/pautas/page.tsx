import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { PautasBoard } from './PautasBoard'

export const dynamic = 'force-dynamic'

const BLOCKED_ROLES = ['coordenador_esportivo', 'operador_esportivo']

export default async function PautasPage() {
  const profile = await requireProfile()
  if (BLOCKED_ROLES.includes(profile.role)) redirect('/')

  const supabase = await createClient()

  // Pautas tem 2 FKs pra profiles (autor_id e responsavel_id), então o join
  // precisa especificar qual usar — caso contrário PostgREST retorna erro
  // "more than one relationship was found" e quebra a query inteira.
  // Tenta buscar com referencias; se a coluna ainda não existir, busca sem ela.
  let { data, error: fetchError } = await supabase
    .from('pautas')
    .select(`
      id, titulo, descricao, referencias, status, criado_em, setor_id, dia_id,
      setor:setores(nome),
      dia:dias_evento(nome_dia),
      autor:profiles!autor_id(nome)
    `)
    .order('criado_em', { ascending: false })

  if (fetchError?.message?.includes('referencias')) {
    const fallback = await supabase
      .from('pautas')
      .select(`
        id, titulo, descricao, status, criado_em, setor_id, dia_id,
        setor:setores(nome),
        dia:dias_evento(nome_dia),
        autor:profiles!autor_id(nome)
      `)
      .order('criado_em', { ascending: false })
    data = fallback.data as typeof data
  }

  // Normaliza status antigos (em_execucao, entregue) pra 'executada' no front,
  // garantindo compatibilidade caso a migração 0032 ainda não tenha rodado.
  const normalizeStatus = (s: string): string =>
    s === 'em_execucao' || s === 'entregue' ? 'executada' : s

  const pautas = (data ?? []).map((p) => ({
    ...p,
    status: normalizeStatus(p.status),
    referencias: (p.referencias ?? []) as string[],
    setor_id: (p.setor_id ?? null) as string | null,
    dia_id: (p.dia_id ?? null) as string | null,
    setor: p.setor as unknown as { nome: string } | null,
    dia: p.dia as unknown as { nome_dia: string } | null,
    autor: p.autor as unknown as { nome: string } | null,
  }))

  // Setores e dias pra dropdowns de edição no modal
  const [{ data: setores }, { data: dias }, { data: edicao }] = await Promise.all([
    supabase.from('setores').select('id, nome').order('nome'),
    supabase.from('dias_evento').select('id, nome_dia').order('nome_dia'),
    supabase.from('edicoes').select('id').eq('ativa', true).maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <div className="cia-page-header">
        <p className="cia-page-header__eyebrow">Roaming</p>
        <h1 className="cia-page-header__title">Pautas</h1>
        <p className="cia-page-header__subtitle">Ideias de cobertura — da ideia ao conteúdo entregue.</p>
      </div>

      <PautasBoard
        pautas={pautas as Parameters<typeof PautasBoard>[0]['pautas']}
        edicaoId={edicao?.id ?? '00000000-0000-0000-0000-000000000001'}
        currentUserName={profile.nome}
        setores={setores ?? []}
        dias={dias ?? []}
      />
    </div>
  )
}
