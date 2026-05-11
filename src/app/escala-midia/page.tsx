import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { EscalaMidiaLiderView } from './EscalaMidiaLiderView'

export default async function EscalaMidiaPage() {
  // PERF: requireProfile() cacheado — 1 round-trip total em vez de 2
  const me = await requireProfile()
  const user = { id: me.id }
  const supabase = await createClient()

  // Admin/coord → redirect to dedicated admin page
  if (me.role === 'admin' || me.role === 'coordenacao') {
    redirect('/admin/escala-midia')
  }

  const myFuncao = me.funcao_principal
  if (myFuncao !== 'foto' && myFuncao !== 'video') {
    // Not a media team member — nothing to show
    redirect('/minha-escala')
  }

  const isLider = me.role === 'lider_area'

  // Fetch all slots for this funcao (lider sees all; operador sees only theirs)
  let turnosQuery = supabase
    .from('turnos')
    .select('id, dia_id, setor_id, funcao, inicio, fim, nome_pessoa, user_id, is_roaming, observacoes, setor:setor_id(nome), user:user_id(nome), dia:dia_id(nome_dia, data)')
    .eq('funcao', myFuncao)
    .order('inicio')

  // For operadores, only show their own slot
  if (!isLider) {
    turnosQuery = turnosQuery.eq('user_id', user.id) as typeof turnosQuery
  }

  const [{ data: turnos }, { data: diasRaw }, { data: teamProfiles }] = await Promise.all([
    turnosQuery,
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    // Profiles of same funcao (for lider's assignment dropdown)
    isLider
      ? supabase
          .from('profiles')
          .select('id, nome, funcao_principal')
          .eq('ativo', true)
          .eq('funcao_principal', myFuncao)
          .order('nome')
      : supabase.from('profiles').select('id, nome, funcao_principal').eq('id', user.id),
  ])

  return (
    <EscalaMidiaLiderView
      funcao={myFuncao as 'foto' | 'video'}
      isLider={isLider}
      turnos={(turnos ?? []) as unknown as import('./EscalaMidiaLiderView').TurnoMidiaEx[]}
      dias={(diasRaw ?? []) as { id: string; nome_dia: string; data: string }[]}
      teamProfiles={(teamProfiles ?? []) as { id: string; nome: string; funcao_principal: string | null }[]}
    />
  )
}
