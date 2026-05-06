import { createClient } from '@/lib/supabase/server'
import { UsuariosClient } from './UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, role, funcao_principal, ativo, criado_em')
    .order('nome')

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Administração</p>
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          Usuários
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {(data ?? []).length} membro{(data ?? []).length !== 1 ? 's' : ''} cadastrado{(data ?? []).length !== 1 ? 's' : ''}
          {' · '}novo membro entra como <span className="text-[var(--foreground)]">Operador</span> no primeiro login.
        </p>
      </div>

      <UsuariosClient usuarios={data ?? []} />
    </div>
  )
}
