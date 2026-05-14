import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { createClient } from '@/lib/supabase/server'
import { EscalaClient, type Setor, type Dia, type Perfil, type Escala } from './EscalaClient'

const ALLOWED = ['admin', 'coordenador_esportivo', 'operador_esportivo']

export default async function EscalaPage() {
  const profile = await requireProfile()
  if (!ALLOWED.includes(profile.role)) redirect('/')

  const supabase = await createClient()
  const isCoord = profile.role === 'admin' || profile.role === 'coordenador_esportivo'

  const [setoresRes, diasRes, escalasRes, perfisRes] = await Promise.all([
    supabase.from('setores').select('id, nome').order('nome'),
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase
      .from('escalas_esportivo')
      .select('id, setor_id, dia_id, user_id, confirmado_em, criado_em, perfil:profiles(id, nome)')
      .order('criado_em'),
    isCoord
      ? supabase.from('profiles').select('id, nome, role').eq('ativo', true).order('nome')
      : Promise.resolve({ data: [] as Perfil[] }),
  ])

  const arr = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v

  const escalas = (escalasRes.data ?? []).map(e => ({
    ...e,
    perfil: arr(e.perfil as unknown as { id: string; nome: string } | { id: string; nome: string }[] | null),
  })) as Escala[]

  return (
    <div className="space-y-8">
      <EscalaClient
        setores={(setoresRes.data ?? []) as Setor[]}
        dias={(diasRes.data ?? []) as Dia[]}
        escalas={escalas}
        perfis={(perfisRes.data ?? []) as Perfil[]}
        isCoord={isCoord}
        userId={profile.id}
      />
    </div>
  )
}
