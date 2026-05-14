'use client'

/**
 * Wrapper Client do CrudClient pra Patrocinadores.
 *
 * Por que existir: o page.tsx é Server Component (async). Não pode passar
 * `cardRender` (função → JSX) direto pra um Client Component. RSC só serializa
 * dados, não closures. Esse arquivo move a função pro lado cliente.
 */

import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { PatrocinadorCard } from './PatrocinadorCard'

interface Patrocinador {
  id: string
  nome: string
  slug: string | null
  logo_url: string | null
  cor_marca: string | null
  cota: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  ativo: boolean
  status_label: string
}

interface Props {
  data: Patrocinador[]
  fields: FieldDef[]
  columns: ColumnDef<Patrocinador>[]
  onCreate: (formData: FormData) => Promise<{ ok: boolean; error?: string }>
  onUpdate: (id: string, formData: FormData) => Promise<{ ok: boolean; error?: string }>
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>
}

export function PatrocinadoresClient({ data, fields, columns, onCreate, onUpdate, onDelete }: Props) {
  return (
    <CrudClient<Patrocinador>
      entityLabel="Patrocinador" entityLabelPlural="Patrocinadores"
      eyebrow="Gestão"
      description="Cadastre cada patrocinador. Escopo de entregas (X stories, Y reels) será gerenciado dentro de cada um."
      columns={columns} fields={fields} data={data}
      onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete}
      searchKeys={['nome', 'cota', 'contato_nome', 'contato_email']}
      cardOnly
      cardRender={(p, { onEdit, onDelete: onDel }) => (
        <PatrocinadorCard p={p} onEdit={onEdit} onDelete={onDel} />
      )}
    />
  )
}
