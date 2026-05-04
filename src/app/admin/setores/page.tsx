import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { Badge } from '@/components/ui/badge'
import { createSetor, updateSetor, deleteSetor } from './actions'

interface Setor {
  id: string
  nome: string
  tipo: 'esportivo' | 'palco' | 'festa' | 'apoio' | 'externo'
  endereco: string | null
  lat: number | null
  lng: number | null
  capacidade_pessoas: number | null
  cor_hex: string | null
  observacoes: string | null
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'SESI Clube' },
  {
    name: 'tipo',
    label: 'Tipo',
    type: 'select',
    required: true,
    span: 'half',
    options: [
      { value: 'esportivo', label: 'Esportivo (ginásio, quadra)' },
      { value: 'palco', label: 'Palco' },
      { value: 'festa', label: 'Área de festa' },
      { value: 'apoio', label: 'Apoio (camarote, base, alimentação)' },
      { value: 'externo', label: 'Externo (cidade)' },
    ],
  },
  { name: 'cor_hex', label: 'Cor (hex)', type: 'color', span: 'half' },
  { name: 'endereco', label: 'Endereço', type: 'text' },
  { name: 'lat', label: 'Latitude', type: 'text', span: 'half', helper: 'ex: -19.7476' },
  { name: 'lng', label: 'Longitude', type: 'text', span: 'half', helper: 'ex: -47.9319' },
  { name: 'capacidade_pessoas', label: 'Capacidade (pessoas)', type: 'number', span: 'half' },
  { name: 'observacoes', label: 'Observações', type: 'textarea' },
]

const tipoBadge: Record<string, { variant: 'default' | 'accent' | 'success' | 'warning' | 'secondary'; label: string }> = {
  esportivo: { variant: 'success', label: 'Esportivo' },
  palco: { variant: 'accent', label: 'Palco' },
  festa: { variant: 'warning', label: 'Festa' },
  apoio: { variant: 'secondary', label: 'Apoio' },
  externo: { variant: 'secondary', label: 'Externo' },
}

const columns: ColumnDef<Setor>[] = [
  {
    key: 'nome',
    label: 'Nome',
    render: (r) => (
      <div className="flex items-center gap-2">
        {r.cor_hex && (
          <span
            className="inline-block h-3 w-3 rounded-full border border-[var(--border)]"
            style={{ background: r.cor_hex }}
          />
        )}
        <span>{r.nome}</span>
      </div>
    ),
  },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (r) => {
      const t = tipoBadge[r.tipo]
      return <Badge variant={t.variant}>{t.label}</Badge>
    },
  },
  {
    key: 'coords',
    label: 'Coordenadas',
    render: (r) =>
      r.lat && r.lng ? (
        <span className="font-mono text-xs">{r.lat}, {r.lng}</span>
      ) : (
        '—'
      ),
  },
  { key: 'capacidade_pessoas', label: 'Capacidade' },
]

export default async function SetoresPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('setores')
    .select('id, nome, tipo, endereco, lat, lng, capacidade_pessoas, cor_hex, observacoes')
    .order('nome')

  return (
    <CrudClient<Setor>
      entityLabel="Setor"
      entityLabelPlural="Setores"
      description="Locais físicos onde a equipe atua. Coordenadas alimentam o mapa."
      columns={columns}
      fields={fields}
      data={(data ?? []) as Setor[]}
      onCreate={createSetor}
      onUpdate={updateSetor}
      onDelete={deleteSetor}
    />
  )
}
