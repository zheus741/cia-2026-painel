import { createClient } from '@/lib/supabase/server'
import { UsuariosClient } from './UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()

  // Busca em paralelo: perfis + parceiros ativos (fonte das empresas de cobertura)
  const [{ data: usuarios }, { data: parceiros }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nome, email, telefone, role, funcao_principal, empresa_cobertura, foto_url, ativo, criado_em, aprovado')
      // Pendentes primeiro (aprovado=false), depois ordem alfabética
      .order('aprovado', { ascending: true })
      .order('nome'),
    supabase
      .from('parceiros')
      .select('nome, tipo')
      .eq('ativo', true)
      .order('nome'),
  ])

  return (
    <div className="space-y-6">
      <div className="cia-page-header">
        <p className="cia-page-header__eyebrow">Administração</p>
        <h1 className="cia-page-header__title">Usuários</h1>
        <p className="cia-page-header__subtitle">
          {(usuarios ?? []).length} membro{(usuarios ?? []).length !== 1 ? 's' : ''} cadastrado{(usuarios ?? []).length !== 1 ? 's' : ''}
          {' · '}novo membro entra como <span style={{ color: 'var(--ink-deep)' }}>Operador</span> no primeiro login.
        </p>
      </div>

      <UsuariosClient
        usuarios={usuarios ?? []}
        parceiros={(parceiros ?? []) as Array<{ nome: string; tipo: string | null }>}
      />
    </div>
  )
}
