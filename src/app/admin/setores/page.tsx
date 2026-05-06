import { createClient } from '@/lib/supabase/server'
import { CrudClient, type ColumnDef, type FieldDef } from '@/components/admin/crud-client'
import { createSetor, updateSetor, deleteSetor } from './actions'

interface Setor {
  id: string
  nome: string
  tipo: string
  endereco: string | null
  lat: number | null
  lng: number | null
  capacidade_pessoas: number | null
  cor_hex: string | null
  observacoes: string | null
  tipo_label: string
  coords_label: string
}

const TIPO_LABEL: Record<string, string> = {
  esportivo: 'Esportivo', palco: 'Palco', festa: 'Festa', apoio: 'Apoio', externo: 'Externo',
}

const fields: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'SESI Clube' },
  {
    name: 'tipo', label: 'Tipo', type: 'select', required: true, span: 'half',
    options: [
      { value: 'esportivo', label: 'Esportivo (ginásio, quadra)' }, { value: 'palco', label: 'Palco' },
      { value: 'festa', label: 'Área de festa' }, { value: 'apoio', label: 'Apoio (camarote, base, alimentação)' },
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

const columns: ColumnDef<Setor>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'tipo_label', label: 'Tipo' },
  { key: 'coords_label', label: 'Coordenadas' },
  { key: 'capacidade_pessoas', label: 'Capacidade' },
]

export default async function SetoresPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('setores').select('id, nome, tipo, endereco, lat, lng, capacidade_pessoas, cor_hex, observacoes').order('nome')

  const processed = (data ?? []).map((r) => ({
    ...r,
    tipo_label: TIPO_LABEL[r.tipo] ?? r.tipo,
    coords_label: r.lat && r.lng ? `${r.lat}, ${r.lng}` : '—',
  })) as Setor[]

  return (
    <CrudClient<Setor>
      entityLabel="Setor" entityLabelPlural="Setores"
      description="Locais físicos onde a equipe atua. Coordenadas alimentam o mapa."
      columns={columns} fields={fields} data={processed}
      onCreate={createSetor} onUpdate={updateSetor} onDelete={deleteSetor}
    />
  )
}
