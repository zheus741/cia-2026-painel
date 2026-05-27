export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { buildLineupFromShows, EMPTY_LINEUP, type ShowRow, type DiaRow, type SetorRow } from '@/lib/lineup-data'
import { LineupClient } from './LineupClient'

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'

// Edição: somente admin. Coord/lider/operador (incluindo FV) só visualizam.
const ALLOWED_EDIT_ROLES = new Set(['admin'])

export default async function LineupPage() {
  const profile = await requireProfile()
  const canEdit = ALLOWED_EDIT_ROLES.has(profile.role ?? '')

  const supabase = await createClient()

  const [{ data: shows }, { data: dias }, { data: setores }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, nome, tipo, inicio, fim_previsto, duracao_minutos, dia_id, setor_id, ordem_no_palco, embaixador')
      .eq('edicao_id', EDICAO_ID)
      .order('inicio'),
    supabase
      .from('dias_evento')
      .select('id, data')
      .eq('edicao_id', EDICAO_ID)
      .order('data'),
    supabase
      .from('setores')
      .select('id, nome')
      .eq('edicao_id', EDICAO_ID)
      .eq('tipo', 'palco'),
  ])

  const lineup = (shows && dias && setores)
    ? buildLineupFromShows(shows as ShowRow[], dias as DiaRow[], setores as SetorRow[])
    : EMPTY_LINEUP

  // Lookup pra editar — precisamos saber (stageId → setorId)
  const palcoSetorMap = Object.fromEntries(
    (setores as SetorRow[] | null ?? []).map(s => [s.nome, s.id]),
  )

  return (
    <AppShell section="Line Up" fullWidth>
      <LineupClient
        lineup={lineup}
        canEdit={canEdit}
        palcoSetorMap={palcoSetorMap}
      />
    </AppShell>
  )
}
