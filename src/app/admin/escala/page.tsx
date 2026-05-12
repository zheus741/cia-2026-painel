import { createClient } from '@/lib/supabase/server'
import { getCachedDias, getCachedSetores } from '@/lib/cache/lookups'
import { EscalaGrid } from './EscalaGrid'

export default async function EscalaPage() {
  const supabase = await createClient()

  // PERF: dias e setores servidos do cache (revalidate: 300s)
  const [
    dias,
    setores,
    { data: profiles },
    { data: turnos },
  ] = await Promise.all([
    getCachedDias(),
    getCachedSetores(),
    supabase
      .from('profiles')
      .select('id, nome, funcao_principal')
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('turnos')
      .select('id, dia_id, setor_id, funcao, inicio, fim, nome_pessoa, user_id, is_roaming, observacoes, setor:setor_id(nome), user:user_id(nome)')
      .order('inicio'),
  ])

  return (
    <div>
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-xl font-semibold">Escala de equipe</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Distribua a equipe por função, setor e turno. Adicione pessoas genéricas antes dos usuários se cadastrarem.
        </p>
      </div>

      <EscalaGrid
        dias={dias as { id: string; nome_dia: string; data: string }[]}
        setores={setores as { id: string; nome: string }[]}
        profiles={(profiles ?? []) as { id: string; nome: string; funcao_principal: string | null }[]}
        turnos={(turnos ?? []) as unknown as import('./EscalaGrid').Turno[]}
      />
    </div>
  )
}
