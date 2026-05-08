'use server'

import { createClient } from '@/lib/supabase/server'

const EDICAO_ID = '00000000-0000-0000-0000-000000000001'

interface CapturaParams {
  midiaDraftUrl:  string
  midiaDraftTipo: 'foto' | 'video'
  tipo:           string   // tipo_conteudo enum value
  titulo:         string
}

export async function createConteudoCaptura(
  params: CapturaParams,
): Promise<{ ok: boolean; conteudoId?: string; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado' }

  // Busca o dia_id que corresponde a hoje (ou ao dia mais próximo do evento)
  const hoje = new Date().toISOString().slice(0, 10)
  const { data: diaDados } = await supabase
    .from('dias_evento')
    .select('id, data')
    .eq('edicao_id', EDICAO_ID)
    .order('data', { ascending: true })

  const dias = diaDados ?? []

  // Pega o dia exato de hoje, ou o mais próximo futuro, ou o último
  let diaId: string | null = null
  const diaExato = dias.find((d) => d.data === hoje)
  if (diaExato) {
    diaId = diaExato.id
  } else {
    const futuro = dias.find((d) => d.data > hoje)
    diaId = futuro?.id ?? dias[dias.length - 1]?.id ?? null
  }

  // Busca setor do turno ativo agora (se houver)
  const agora = new Date().toISOString()
  const { data: turnoAtivo } = await supabase
    .from('turnos')
    .select('setor_id')
    .eq('user_id', user.id)
    .lte('inicio', agora)
    .gte('fim',    agora)
    .maybeSingle()

  const setorId = turnoAtivo?.setor_id ?? null

  const { data: conteudo, error } = await supabase
    .from('conteudos')
    .insert({
      edicao_id:       EDICAO_ID,
      titulo:          params.titulo.trim() || 'Captura rápida',
      tipo:            params.tipo,
      status:          'rascunho',
      prioridade:      3,
      dia_id:          diaId,
      setor_id:        setorId,
      midia_draft_url: params.midiaDraftUrl,
      midia_draft_tipo: params.midiaDraftTipo,
      criado_por:      user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[captura] insert error:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true, conteudoId: conteudo.id }
}
