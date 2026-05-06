import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { createUsuario, updateUsuario, deleteUsuario } from './actions'

interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string | null
  role: string
  funcao_principal: string | null
  funcoes_adicionais: string[] | null
  bio: string | null
  ativo: boolean
  nome_email: string
  role_label: string
  funcao_label: string
  adicionais_label: string
  status_label: string
}

const FUNCOES = [
  { value: 'foto', label: 'Foto' }, { value: 'video', label: 'Vídeo' },
  { value: 'social', label: 'Social Media' }, { value: 'reporter', label: 'Repórter' },
  { value: 'editor', label: 'Editor' }, { value: 'drone', label: 'Drone' },
  { value: 'roaming', label: 'Roaming' }, { value: 'coordenacao', label: 'Coordenação' },
  { value: 'producao', label: 'Produção' }, { value: 'design', label: 'Design' },
]

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', coordenacao: 'Coordenação', lider_area: 'Líder', operador: 'Operador',
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, span: 'half' },
  { name: 'telefone', label: 'Telefone', type: 'text', placeholder: '(00) 00000-0000', span: 'half' },
  { name: 'role', label: 'Permissão (role)', type: 'select', required: true, span: 'half', options: [{ value: 'admin', label: 'Admin (vê e edita tudo)' }, { value: 'coordenacao', label: 'Coordenação' }, { value: 'lider_area', label: 'Líder de área' }, { value: 'operador', label: 'Operador' }] },
  { name: 'funcao_principal', label: 'Função principal', type: 'select', span: 'half', options: FUNCOES },
  { name: 'funcoes_adicionais', label: 'Funções adicionais', type: 'tags', placeholder: 'foto, video, drone', helper: `Slugs separados por vírgula. Disponíveis: ${FUNCOES.map((f) => f.value).join(', ')}` },
  { name: 'ativo', label: 'Ativo', type: 'boolean', defaultValue: true },
  { name: 'bio', label: 'Bio / observações', type: 'textarea' },
]

const columns: ColumnDef<Usuario>[] = [
  { key: 'nome_email', label: 'Pessoa' },
  { key: 'role_label', label: 'Permissão' },
  { key: 'funcao_label', label: 'Função' },
  { key: 'adicionais_label', label: 'Adicionais' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'status_label', label: 'Status' },
]

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('id, nome, email, telefone, role, funcao_principal, funcoes_adicionais, bio, ativo').order('nome')

  const processed = (data ?? []).map((r) => ({
    ...r,
    nome_email: `${r.nome} (${r.email})`,
    role_label: ROLE_LABEL[r.role] ?? r.role,
    funcao_label: FUNCOES.find((f) => f.value === r.funcao_principal)?.label ?? r.funcao_principal ?? '—',
    adicionais_label: r.funcoes_adicionais?.join(', ') ?? '—',
    status_label: r.ativo ? 'Ativo' : 'Inativo',
  })) as Usuario[]

  return (
    <CrudClient<Usuario>
      entityLabel="Usuário" entityLabelPlural="Usuários"
      description="Membros da equipe de cobertura. Usuário entra como operador no 1º login; promova aqui."
      columns={columns} fields={fields} data={processed}
      onCreate={createUsuario} onUpdate={updateUsuario} onDelete={deleteUsuario}
    />
  )
}
