import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/current-user'
import { PlacarBoard } from './PlacarClient'
import { PageHeader } from '@/components/page-header'
import { Tv2 } from 'lucide-react'

const CAN_EDIT_ROLES = ['admin', 'coordenador_esportivo']

const DIAS_FIXOS = [
  { id: '00000000-0000-0001-0000-000000000001', nome_dia: 'Quinta', data: '2026-06-04' },
  { id: '00000000-0000-0001-0000-000000000002', nome_dia: 'Sexta',  data: '2026-06-05' },
  { id: '00000000-0000-0001-0000-000000000003', nome_dia: 'Sábado', data: '2026-06-06' },
  { id: '00000000-0000-0001-0000-000000000004', nome_dia: 'Domingo', data: '2026-06-07' },
]

export default async function PlacarPage() {
  const profile = await requireProfile()
  const canEdit = CAN_EDIT_ROLES.includes(profile.role)
  const supabase = await createClient()

  const [diasRes, jogosRes] = await Promise.all([
    supabase.from('dias_evento').select('id, nome_dia, data').order('data'),
    supabase
      .from('jogos')
      .select(`
        id, equipe_a_id, equipe_b_id, equipe_a_nome, equipe_b_nome,
        placar_a, placar_b, penaltis_a, penaltis_b, sets, ao_vivo_em, status, wo, inicio, dia_id, setor_id, divisao, fase, categoria, teste,
        modalidade:modalidades(nome, icone),
        setor:setores(nome),
        equipe_a:equipe_a_id(slug, divisao, conferencia, cor_primaria, universidade, logo_url),
        equipe_b:equipe_b_id(slug, divisao, conferencia, cor_primaria, universidade, logo_url)
      `)
      .order('inicio', { ascending: true, nullsFirst: false }),
  ])

  // Falha explícita: error.tsx mostra mensagem clara em vez de tela vazia silenciosa.
  if (jogosRes.error) throw new Error(`Falha ao carregar jogos: ${jogosRes.error.message}`)

  const diasDB = diasRes.data
  const jogosDB = jogosRes.data

  // PERF: pre-fetch de eventos_jogo em UMA query para todos os jogos
  // ao_vivo/encerrado. Antes cada card disparava 1 query no useEffect (N+1).
  // Com 30 jogos ativos = 30 round-trips. Agora 1.
  const jogosComEventos = (jogosDB ?? [])
    .filter(j => j.status === 'ao_vivo' || j.status === 'encerrado')
    .map(j => j.id)
  let eventosPorJogo: Record<string, unknown[]> = {}
  if (jogosComEventos.length > 0) {
    const { data: eventosDB } = await supabase
      .from('eventos_jogo')
      .select('id, jogo_id, tipo, equipe, minuto, criado_em')
      .in('jogo_id', jogosComEventos)
      .order('criado_em')
    for (const e of (eventosDB ?? []) as Array<{ jogo_id: string }>) {
      if (!eventosPorJogo[e.jogo_id]) eventosPorJogo[e.jogo_id] = []
      eventosPorJogo[e.jogo_id].push(e)
    }
  }
  // No-op TypeScript guard
  void eventosPorJogo

  const dias = (diasDB?.length ? diasDB : DIAS_FIXOS) as { id: string; nome_dia: string; data: string }[]

  type EquipeRef = { slug: string; divisao: string | null; conferencia: string | null; cor_primaria: string | null; universidade: string | null; logo_url: string | null }
  type Jogo = {
    id: string
    equipe_a_id: string | null; equipe_b_id: string | null
    equipe_a_nome: string | null; equipe_b_nome: string | null
    placar_a: number | null; placar_b: number | null
    penaltis_a: number | null; penaltis_b: number | null
    sets: { a: number; b: number }[] | null; ao_vivo_em: string | null
    status: string; wo: 'a' | 'b' | 'duplo' | null
    inicio: string | null; dia_id: string; setor_id: string | null
    divisao: string | null; fase: string | null; categoria: string | null; teste: boolean | null
    modalidade: { nome: string; icone: string } | null
    setor: { nome: string } | null
    equipe_a: EquipeRef | null
    equipe_b: EquipeRef | null
  }

  const arr = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)

  const jogos: Jogo[] = (jogosDB ?? []).map((j) => ({
    ...j,
    modalidade: arr(j.modalidade as unknown as { nome: string; icone: string } | { nome: string; icone: string }[] | null),
    setor:      arr(j.setor      as unknown as { nome: string } | { nome: string }[] | null),
    equipe_a:   arr(j.equipe_a   as unknown as EquipeRef | EquipeRef[] | null),
    equipe_b:   arr(j.equipe_b   as unknown as EquipeRef | EquipeRef[] | null),
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
    <div className="mx-auto w-full max-w-[1640px] space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12">
      <PageHeader
        eyebrow="Esportivo · Sala de Comando"
        title="Placar Ao Vivo"
        subtitle={
          totalAoVivo > 0
            ? `${totalAoVivo} jogo${totalAoVivo > 1 ? 's acontecendo' : ' acontecendo'} agora — atualização em tempo real`
            : 'Controle o status e placar dos jogos durante a Copa Inter Atléticas 2026.'
        }
        action={
          <a
            href="/tv/placar"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--gold-bright)]/40 bg-gradient-to-r from-[var(--gold-bright)]/15 to-[var(--gold-bright)]/5 px-4 py-2 text-sm font-bold uppercase tracking-wider text-[var(--gold-bright)] transition-all hover:border-[var(--gold-bright)]/60 hover:from-[var(--gold-bright)]/25 hover:to-[var(--gold-bright)]/10"
            title="Abre placar em modo TV (transmissão/projeção)"
          >
            <Tv2 className="h-3.5 w-3.5" />
            Modo TV
            <span className="text-[9px] opacity-50 transition-transform group-hover:translate-x-0.5">↗</span>
          </a>
        }
      />

      <PlacarBoard
        dias={dias}
        jogosPorDia={jogosPorDia as Record<string, Parameters<typeof PlacarBoard>[0]['jogosPorDia'][string]>}
        diaAtivo={diaAtivo}
        canEdit={canEdit}
        eventosPorJogo={eventosPorJogo as Parameters<typeof PlacarBoard>[0]['eventosPorJogo']}
      />
    </div>
  )
}
