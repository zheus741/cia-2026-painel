import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { getSuper8Rows, summarizeSuper8, deriveParticipantes } from '@/lib/competicao/super8'
import { Super8AdminClient } from './Super8AdminClient'

export const dynamic  = 'force-dynamic'
export const metadata = { title: 'Liga Super 8 · Admin · CIA 2026' }

export default async function Super8AdminPage() {
  const profile = await requireProfile()
  if (!['admin', 'coordenacao'].includes(profile.role)) redirect('/')

  const supabase = await createClient()

  const { data: edicao } = await supabase
    .from('edicoes')
    .select('id, nome')
    .eq('ativa', true)
    .maybeSingle()
  if (!edicao) redirect('/admin/edicoes')

  // Atléticas disponíveis (todas as 64 da divisão de acesso + 32 das outras)
  const { data: atleticas } = await supabase
    .from('equipes')
    .select('id, nome, slug, divisao, conferencia, cor_primaria, universidade')
    .eq('tipo', 'atletica')
    .order('nome')

  // Modalidades
  const { data: modalidades } = await supabase
    .from('modalidades')
    .select('id, nome, icone')
    .order('nome')

  const rows           = await getSuper8Rows(edicao.id)
  const participantes  = deriveParticipantes(rows)
  const resumo         = summarizeSuper8(rows)

  return (
    <Super8AdminClient
      edicaoNome={edicao.nome}
      atleticas={atleticas ?? []}
      modalidades={modalidades ?? []}
      rows={rows}
      participantes={participantes}
      resumo={resumo}
    />
  )
}
