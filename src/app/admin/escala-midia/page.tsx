import { createClient } from '@/lib/supabase/server'
import { getCachedDias, getCachedSetores } from '@/lib/cache/lookups'
import { EscalaMidiaAdminGrid } from './EscalaMidiaAdminGrid'

export default async function EscalaMidiaAdminPage() {
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
      .in('funcao_principal', ['foto', 'video'])
      .order('nome'),
    supabase
      .from('turnos')
      .select('id, dia_id, setor_id, funcao, inicio, fim, nome_pessoa, user_id, is_roaming, observacoes, setor:setor_id(nome), user:user_id(nome)')
      .in('funcao', ['foto', 'video'])
      .order('inicio'),
  ])

  return (
    <div>
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Operacional
        </p>
        <h1 className="mt-1 text-xl font-semibold">Escala Mídia</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Gerencie os slots de foto e vídeo. Crie os turnos e os líderes de equipe fazem a atribuição dos membros.
        </p>
      </div>

      <EscalaMidiaAdminGrid
        dias={dias as { id: string; nome_dia: string; data: string }[]}
        setores={setores as { id: string; nome: string }[]}
        profiles={(profiles ?? []) as { id: string; nome: string; funcao_principal: string | null }[]}
        turnos={(turnos ?? []) as unknown as import('./EscalaMidiaAdminGrid').TurnoMidia[]}
      />
    </div>
  )
}
