import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { EscalaFVClient } from './EscalaFVClient'

export default async function EscalaAVPage() {
  const supabase = await createClient()
  const profile  = await requireProfile()

  const isCoord = ['admin', 'coordenacao'].includes(profile.role)

  const [{ data: dias }, { data: setores }, { data: turnos }, { data: profiles }] = await Promise.all([
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase.from('setores').select('id, nome, tipo').order('nome'),
    supabase
      .from('turnos')
      .select('id, dia_id, setor_id, funcao, inicio, fim, user_id, prioridade, briefing_editorial, conteudos_esperados')
      .in('funcao', ['foto', 'video'])
      .order('inicio'),
    supabase
      .from('profiles')
      .select('id, nome, funcao_principal')
      .in('funcao_principal', ['foto', 'video'])
      .eq('ativo', true)
      .order('nome'),
  ])

  return (
    <EscalaFVClient
      dias={dias ?? []}
      setores={setores ?? []}
      turnos={turnos ?? []}
      profiles={profiles ?? []}
      isCoord={isCoord}
    />
  )
}
