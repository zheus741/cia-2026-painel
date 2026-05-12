import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import {
  getSuper8Rows,
  computeSuper8Standings,
  summarizeSuper8,
  deriveParticipantes,
} from '@/lib/competicao/super8'
import { Super8Client } from './Super8Client'

export const dynamic  = 'force-dynamic'
export const metadata = { title: 'Liga Super 8 · CIA 2026' }

export default async function Super8Page() {
  await requireProfile()
  const supabase = await createClient()

  const { data: edicao } = await supabase
    .from('edicoes')
    .select('id, nome')
    .eq('ativa', true)
    .maybeSingle()

  if (!edicao) redirect('/esportivo')

  const rows           = await getSuper8Rows(edicao.id)
  const standings      = computeSuper8Standings(rows)
  const participantes  = deriveParticipantes(rows)
  const resumo         = summarizeSuper8(rows)

  return (
    <Super8Client
      edicaoNome={edicao.nome}
      rows={rows}
      standings={standings}
      participantes={participantes}
      resumo={resumo}
    />
  )
}
