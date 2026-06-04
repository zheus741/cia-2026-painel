import { createClient } from '@/lib/supabase/server'
import { EscalaAVGrid } from './EscalaAVGrid'
import type { Dia, Setor, Parceiro, ProfileAV, TurnoAV, JogoPreview } from './EscalaAVGrid'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'

type RawModalidade = { nome: string } | { nome: string }[] | null

function flatMod(m: RawModalidade): string | null {
  if (!m) return null
  if (Array.isArray(m)) return m[0]?.nome ?? null
  return m.nome ?? null
}

export const dynamic = 'force-dynamic'

export default async function EscalaAVPage() {
  const supabase = await createClient()

  const [
    { data: dias },
    { data: setores },
    { data: parceiros },
    { data: profilesFV },
    { data: profilesAll },
    { data: turnosRaw },
    { data: jogosSetores },
    { data: showsSetores },
    { data: festasSetores },
  ] = await Promise.all([
    supabase
      .from('dias_evento')
      .select('id, nome_dia, data')
      .order('data'),

    supabase
      .from('setores')
      .select('id, nome, tipo, nucleo, tem_wifi, tem_ponto_apoio, alimentacao, maps_url, notas_acesso')
      .order('nome'),

    supabase
      .from('parceiros')
      .select('id, nome, tipo, cor_hex')
      .eq('ativo', true)
      .order('nome'),

    // Colaboradores = operadores e líderes de Foto/Vídeo (dropdown do dialog)
    supabase
      .from('profiles')
      .select('id, nome, funcao_principal, empresa_cobertura, role')
      .in('role', ['operador_fv', 'lider_fv'])
      .eq('ativo', true)
      .order('nome'),

    // Todos os perfis (leve) — para resolver o colaborador do turno
    supabase
      .from('profiles')
      .select('id, nome, funcao_principal, foto_url'),

    // Turnos SEM embed — turnos tem 2 FKs pra profiles (user_id + lider_area_id),
    // o que torna o embed ambíguo e quebra a query. Resolvemos os joins em JS.
    supabase
      .from('turnos')
      .select('id, dia_id, setor_id, funcao, user_id, prioridade, status_escala, parceiro_id, jogo_id, foco_label')
      .in('funcao', ['foto', 'video']),

    // Jogos completos para vincular ao turno
    supabase
      .from('jogos')
      .select(`
        id, dia_id, setor_id, inicio, status,
        equipe_a_nome, equipe_b_nome, divisao, categoria,
        modalidade:modalidade_id (nome)
      `)
      .not('setor_id', 'is', null)
      .order('inicio', { ascending: true }),
    supabase.from('shows').select('dia_id, setor_id').not('setor_id', 'is', null),
    supabase.from('festas').select('dia_id, setor_id').not('setor_id', 'is', null),
  ])

  // ── Resolve joins em JS (zero dependência de embed do PostgREST) ───────────
  const setorNome = new Map((setores ?? []).map(s => [s.id, s.nome as string]))
  const profMap   = new Map(
    (profilesAll ?? []).map(p => [p.id, p as {
      id: string; nome: string; funcao_principal: string | null; foto_url: string | null
    }]),
  )
  const parcMap   = new Map(
    (parceiros ?? []).map(p => [p.id, p as { nome: string; cor_hex: string }]),
  )

  // Constrói JogoPreview a partir da query
  const jogos: JogoPreview[] = (jogosSetores ?? []).map(j => ({
    id:            j.id as string,
    dia_id:        j.dia_id as string,
    setor_id:      j.setor_id as string | null,
    inicio:        j.inicio as string | null,
    status:        j.status as string | null,
    equipe_a_nome: j.equipe_a_nome as string | null,
    equipe_b_nome: j.equipe_b_nome as string | null,
    divisao:       j.divisao as string | null,
    categoria:     j.categoria as string | null,
    modalidade_nome: flatMod(j.modalidade as RawModalidade),
  }))
  const jogoMap = new Map(jogos.map(j => [j.id, j]))

  const turnos: TurnoAV[] = (turnosRaw ?? []).map(t => {
    const prof = t.user_id ? profMap.get(t.user_id) : undefined
    const parc = t.parceiro_id ? parcMap.get(t.parceiro_id) : undefined
    const jogo = t.jogo_id ? jogoMap.get(t.jogo_id) : undefined
    return {
      id:            t.id,
      dia_id:        t.dia_id,
      setor_id:      t.setor_id,
      funcao:        t.funcao,
      user_id:       t.user_id,
      prioridade:    t.prioridade,
      status_escala: t.status_escala,
      parceiro_id:   t.parceiro_id,
      jogo_id:       t.jogo_id ?? null,
      foco_label:    (t as { foco_label?: string | null }).foco_label ?? null,
      setor:    t.setor_id && setorNome.has(t.setor_id) ? { nome: setorNome.get(t.setor_id)! } : null,
      user:     prof
        ? { id: prof.id, nome: prof.nome, funcao_principal: prof.funcao_principal, foto_url: prof.foto_url }
        : null,
      parceiro: parc ? { nome: parc.nome, cor_hex: parc.cor_hex } : null,
      jogo:     jogo ?? null,
    }
  })

  const eventosSetores = [
    ...jogos.map(j => ({ dia_id: j.dia_id, setor_id: j.setor_id })),
    ...(showsSetores  ?? []),
    ...(festasSetores ?? []),
  ] as { dia_id: string; setor_id: string }[]

  return (
    <PageContainer size="wide" gap="default">
      <PageHeader
        eyebrow="Operacional · Mídia"
        title="Escala Foto & Vídeo"
        subtitle="Cobertura por setor — núcleos esportivo e festivo. O colaborador é notificado ao ser escalado."
      />

      <EscalaAVGrid
        dias={(dias ?? []) as Dia[]}
        setores={(setores ?? []) as Setor[]}
        parceiros={(parceiros ?? []) as Parceiro[]}
        profiles={(profilesFV ?? []) as ProfileAV[]}
        turnos={turnos}
        jogos={jogos}
        eventosSetores={eventosSetores}
      />
    </PageContainer>
  )
}
