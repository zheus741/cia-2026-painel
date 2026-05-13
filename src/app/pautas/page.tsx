import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { PautasBoard } from './PautasBoard'

const BLOCKED_ROLES = ['operador', 'coordenador_esportivo', 'operador_esportivo']

export default async function PautasPage() {
  const profile = await requireProfile()
  if (BLOCKED_ROLES.includes(profile.role)) redirect('/')

  const supabase = await createClient()

  const { data } = await supabase
    .from('pautas')
    .select(`
      id, titulo, descricao, status,
      setor:setores(nome),
      dia:dias_evento(nome_dia),
      autor:profiles(nome)
    `)
    .order('criado_em', { ascending: false })

  const pautas = (data ?? []).map((p) => ({
    ...p,
    setor: p.setor as unknown as { nome: string } | null,
    dia: p.dia as unknown as { nome_dia: string } | null,
    autor: p.autor as unknown as { nome: string } | null,
  }))

  const { data: edicao } = await supabase
    .from('edicoes')
    .select('id')
    .eq('ativa', true)
    .maybeSingle()

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
      />
    </div>
  )
}
