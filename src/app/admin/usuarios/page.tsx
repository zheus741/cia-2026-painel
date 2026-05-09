import { createClient } from '@/lib/supabase/server'
import { UsuariosClient } from './UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, role, funcao_principal, foto_url, ativo, criado_em')
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="cia-page-header">
        <p className="cia-page-header__eyebrow">Administração</p>
        <h1 className="cia-page-header__title">Usuários</h1>
        <p className="cia-page-header__subtitle">
          {(data ?? []).length} membro{(data ?? []).length !== 1 ? 's' : ''} cadastrado{(data ?? []).length !== 1 ? 's' : ''}
          {' · '}novo membro entra como <span style={{ color: 'var(--ink-deep)' }}>Operador</span> no primeiro login.
        </p>
      </div>

      <UsuariosClient usuarios={data ?? []} />
    </div>
  )
}
