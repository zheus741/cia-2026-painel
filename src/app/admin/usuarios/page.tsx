import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createUsuario, updateUsuario, deleteUsuario } from './actions'

interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string | null
  role: 'admin' | 'coordenacao' | 'lider_area' | 'operador'
  funcao_principal: string | null
  funcoes_adicionais: string[] | null
  bio: string | null
  ativo: boolean
}

const FUNCOES = [
  { value: 'foto', label: 'Foto' },
  { value: 'video', label: 'Vídeo' },
  { value: 'social', label: 'Social Media' },
  { value: 'reporter', label: 'Repórter' },
  { value: 'editor', label: 'Editor' },
  { value: 'drone', label: 'Drone' },
  { value: 'roaming', label: 'Roaming' },
  { value: 'coordenacao', label: 'Coordenação' },
  { value: 'producao', label: 'Produção' },
  { value: 'design', label: 'Design' },
]

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, span: 'half' },
  { name: 'telefone', label: 'Telefone', type: 'text', placeholder: '(00) 00000-0000', span: 'half' },
  {
    name: 'role',
    label: 'Permissão (role)',
    type: 'select',
    required: true,
    span: 'half',
    options: [
      { value: 'admin', label: 'Admin (vê e edita tudo)' },
      { value: 'coordenacao', label: 'Coordenação' },
      { value: 'lider_area', label: 'Líder de área' },
      { value: 'operador', label: 'Operador' },
    ],
  },
  {
    name: 'funcao_principal',
    label: 'Função principal',
    type: 'select',
    span: 'half',
    options: FUNCOES,
  },
  {
    name: 'funcoes_adicionais',
    label: 'Funções adicionais',
    type: 'tags',
    placeholder: 'foto, video, drone',
    helper: `Slugs separados por vírgula. Disponíveis: ${FUNCOES.map((f) => f.value).join(', ')}`,
  },
  { name: 'ativo', label: 'Ativo', type: 'boolean', defaultValue: true },
  { name: 'bio', label: 'Bio / observações', type: 'textarea' },
]

const roleBadge: Record<string, { variant: 'default' | 'accent' | 'success' | 'warning' | 'secondary'; label: string }> = {
  admin: { variant: 'default', label: 'Admin' },
  coordenacao: { variant: 'accent', label: 'Coordenação' },
  lider_area: { variant: 'warning', label: 'Líder' },
  operador: { variant: 'secondary', label: 'Operador' },
}

const columns: ColumnDef<Usuario>[] = [
  {
    key: 'nome',
    label: 'Pessoa',
    render: (r) => (
      <div>
        <p className="font-medium">{r.nome}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{r.email}</p>
      </div>
    ),
  },
  {
    key: 'role',
    label: 'Permissão',
    render: (r) => {
      const b = roleBadge[r.role]
      return <Badge variant={b.variant}>{b.label}</Badge>
    },
  },
  {
    key: 'funcao_principal',
    label: 'Função',
    render: (r) =>
      r.funcao_principal ? (
        <Badge variant="outline">
          {FUNCOES.find((f) => f.value === r.funcao_principal)?.label ?? r.funcao_principal}
        </Badge>
      ) : (
        '—'
      ),
  },
  {
    key: 'funcoes_adicionais',
    label: 'Adicionais',
    render: (r) =>
      r.funcoes_adicionais?.length ? (
        <div className="flex flex-wrap gap-1">
          {r.funcoes_adicionais.map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px]">
              {f}
            </Badge>
          ))}
        </div>
      ) : (
        '—'
      ),
  },
  { key: 'telefone', label: 'Telefone' },
  {
    key: 'ativo',
    label: 'Status',
    render: (r) =>
      r.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>,
  },
]

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, role, funcao_principal, funcoes_adicionais, bio, ativo')
    .order('nome')

  return (
    <CrudClient<Usuario>
      entityLabel="Usuário"
      entityLabelPlural="Usuários"
      description="Membros da equipe de cobertura. Usuário entra como operador no 1º login; promova aqui."
      columns={columns}
      fields={fields}
      data={(data ?? []) as Usuario[]}
      onCreate={createUsuario}
      onUpdate={updateUsuario}
      onDelete={deleteUsuario}
    />
  )
}
