import { createClient } from '@/lib/supabase/server'
import { PlacarBoard } from './PlacarClient'

const DIAS_FIXOS = [
  { id: '00000000-0000-0001-0000-000000000001', nome_dia: 'Quinta', data: '2026-06-04' },
  { id: '00000000-0000-0001-0000-000000000002', nome_dia: 'Sexta',  data: '2026-06-05' },
  { id: '00000000-0000-0001-0000-000000000003', nome_dia: 'Sábado', data: '2026-06-06' },
  { id: '00000000-0000-0001-0000-000000000004', nome_dia: 'Domingo', data: '2026-06-07' },
]

export default async function PlacarPage() {
  const supabase = await createClient()

  const [{ data: diasDB }, { data: jogosDB }] = await Promise.all([
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase
      .from('jogos')
      .select('id, equipe_a_nome, equipe_b_nome, placar_a, placar_b, status, inicio, dia_id, modalidade:modalidades(nome, icone), setor:setores(nome)')
      .order('inicio', { ascending: true, nullsFirst: false }),
  ])

  const dias = (diasDB?.length ? diasDB : DIAS_FIXOS) as { id: string; nome_dia: string; data: string }[]

  type Jogo = {
    id: string; equipe_a_nome: string | null; equipe_b_nome: string | null
    placar_a: number | null; placar_b: number | null; status: string
    inicio: string | null; dia_id: string
    modalidade: { nome: string; icone: string } | null
    setor: { nome: string } | null
  }

  const jogos: Jogo[] = (jogosDB ?? []).map((j) => ({
    ...j,
    modalidade: j.modalidade as unknown as { nome: string; icone: string } | null,
    setor: j.setor as unknown as { nome: string } | null,
  }))

  const jogosPorDia: Record<string, Jogo[]> = {}
  for (const dia of dias) jogosPorDia[dia.id] = []
  for (const jogo of jogos) {
    if (jogo.dia_id && jogosPorDia[jogo.dia_id]) {
      jogosPorDia[jogo.dia_id].push(jogo)
    }
  }

  // Dia ativo: prefere o dia com jogos ao_vivo, senão o mais próximo de hoje
  const hoje = new Date().toISOString().slice(0, 10)
  const diaAoVivo = dias.find((d) => (jogosPorDia[d.id] ?? []).some((j) => j.status === 'ao_vivo'))
  const diaHoje = dias.find((d) => d.data === hoje)
  const diaFuturo = dias.find((d) => d.data >= hoje)
  const diaAtivo = diaAoVivo?.id ?? diaHoje?.id ?? diaFuturo?.id ?? dias[0]?.id ?? ''

  const totalAoVivo = jogos.filter((j) => j.status === 'ao_vivo').length

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Guerra</p>
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          Placar Ao Vivo
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Gerencie o status e placar dos jogos em tempo real durante o evento.
          {totalAoVivo > 0 && (
            <span className="ml-2 font-semibold text-[var(--green-bright)]">
              {totalAoVivo} jogo{totalAoVivo > 1 ? 's' : ''} acontecendo agora
            </span>
          )}
        </p>
      </div>

      <PlacarBoard
        dias={dias}
        jogosPorDia={jogosPorDia as Record<string, Parameters<typeof PlacarBoard>[0]['jogosPorDia'][string]>}
        diaAtivo={diaAtivo}
      />
    </div>
  )
}
