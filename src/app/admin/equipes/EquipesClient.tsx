'use client'

/**
 * Wrapper Client do CrudClient pra Equipes.
 *
 * Mesma razão do PatrocinadoresClient: cardRender (função → JSX) não pode
 * cruzar a fronteira Server→Client. Esse wrapper roda no cliente.
 */

import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { EquipeCard } from './EquipeCard'

interface Equipe {
  id: string
  nome: string
  slug: string | null
  tipo: string
  divisao: string | null
  universidade: string | null
  logo_url: string | null
  cor_primaria: string | null
  tipo_label: string
}

interface Props {
  data: Equipe[]
  fields: FieldDef[]
  columns: ColumnDef<Equipe>[]
  onCreate: (formData: FormData) => Promise<{ ok: boolean; error?: string }>
  onUpdate: (id: string, formData: FormData) => Promise<{ ok: boolean; error?: string }>
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>
}

export function EquipesClient({ data, fields, columns, onCreate, onUpdate, onDelete }: Props) {
  return (
    <CrudClient<Equipe>
      entityLabel="Equipe" entityLabelPlural="Equipes"
      eyebrow="Gestão"
      description="Atléticas, baterias e times de cheer participantes. Já carregamos 89 equipes no seed."
      columns={columns} fields={fields} data={data}
      onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete}
      searchKeys={['nome', 'tipo_label', 'divisao', 'universidade']}
      cardOnly
      cardRender={(e, { onEdit, onDelete: onDel }) => (
        <EquipeCard e={e} onEdit={onEdit} onDelete={onDel} />
      )}
    />
  )
}
