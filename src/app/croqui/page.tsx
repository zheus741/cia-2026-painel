import { createClient } from '@/lib/supabase/server'
import { MapaInterativoClient } from './MapaInterativoClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Croqui do Evento · CIA 2026',
  description: 'Mapa interativo do Centro Park — palcos, bares, banheiros, serviços e acessos.',
}

export default async function CroquiPage() {
  const supabase = await createClient()
  const nowISO = new Date().toISOString()

  const [setoresRes, jogosVivoRes, showsAtivosRes, festasAtivasRes] = await Promise.all([
    supabase
      .from('setores')
      .select('id, nome, tipo, capacidade_pessoas, cor_hex, observacoes'),
    supabase
      .from('jogos')
      .select(`
        id, status, equipe_a_nome, equipe_b_nome, placar_a, placar_b, setor_id, teste, divisao,
        modalidade:modalidades(nome, icone),
        setor:setores(id, nome)
      `)
      .eq('status', 'ao_vivo'),
    supabase
      .from('shows')
      .select('id, nome, tipo, embaixador, inicio, fim_previsto, setor_id, setor:setores(id, nome)')
      .lte('inicio', nowISO)
      .gte('fim_previsto', nowISO)
      .order('inicio', { ascending: true }),
    supabase
      .from('festas')
      .select('id, nome, tema, inicio, fim_previsto, setor_id, setor:setores(id, nome)')
      .lte('inicio', nowISO)
      .gte('fim_previsto', nowISO)
      .order('inicio', { ascending: true }),
  ])

  // Normaliza joins do Supabase (single record que vem como array)
  const arr = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v ?? null

  type RawSetorJoin = { id: string; nome: string } | { id: string; nome: string }[] | null
  type RawMod = { nome: string; icone: string } | { nome: string; icone: string }[] | null

  const jogosVivo = (jogosVivoRes.data ?? []).map(j => ({
    ...j,
    modalidade: arr(j.modalidade as RawMod),
    setor: arr(j.setor as RawSetorJoin),
  }))
  const showsAtivos = (showsAtivosRes.data ?? []).map(s => ({
    ...s,
    setor: arr(s.setor as RawSetorJoin),
  }))
  const festasAtivas = (festasAtivasRes.data ?? []).map(f => ({
    ...f,
    setor: arr(f.setor as RawSetorJoin),
  }))

  return (
    <MapaInterativoClient
      setores={setoresRes.data ?? []}
      jogosVivo={jogosVivo}
      showsAtivos={showsAtivos}
      festasAtivas={festasAtivas}
    />
  )
}
