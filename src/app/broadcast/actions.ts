'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { safe, type ActionResult } from '@/lib/admin/actions-helper'
import { requireProfile } from '@/lib/auth/current-user'

const CANAL = 'palco-principal'
const PAPEIS_REGIE = ['admin', 'coordenacao', 'lider_fv', 'lider_area', 'coordenador_esportivo']

export interface BroadcastPatch {
  mosca_on?: boolean
  ao_vivo?: boolean
  gc_on?: boolean
  gc_tipo?: string | null
  gc_titulo?: string | null
  gc_subtitulo?: string | null
  gc_detalhe?: string | null
  np_on?: boolean
  np_musica?: string | null
  np_artista?: string | null
  patroc_on?: boolean
  patroc_id?: string | null
  patroc_modo?: string | null
  placa_on?: boolean
  placa_tipo?: string | null
  placa_payload?: unknown
  crawl_on?: boolean
  crawl_texto?: string | null
}

async function guard() {
  const profile = await requireProfile()
  if (!PAPEIS_REGIE.includes(profile.role ?? '')) {
    throw new Error('Sem permissão para operar a Régie.')
  }
  return profile
}

/** Aplica um patch parcial no estado ao vivo (merge). */
export async function setBroadcast(patch: BroadcastPatch): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const { error } = await sb
      .from('broadcast_estado')
      .update({ ...patch, updated_at: new Date().toISOString(), updated_by: profile.id })
      .eq('id', CANAL)
    if (error) throw error
  })
}

/** Registra uma entrada no as-run (pós-produção / relatório de patrocínio). */
export async function logBroadcast(
  acao: string,
  rotulo: string | null,
  payload?: unknown,
  patrocId?: string | null,
): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_log').insert({
      canal: CANAL, acao, rotulo,
      payload: payload ?? null,
      patroc_id: patrocId ?? null,
      criado_por: profile.id,
    })
    if (error) throw error
  })
}

/** Botão de pânico: tira tudo do ar (mantém mosca + ao_vivo). */
export async function limparTudo(): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_estado').update({
      gc_on: false, np_on: false, patroc_on: false, placa_on: false, crawl_on: false, vt_on: false,
      updated_at: new Date().toISOString(), updated_by: profile.id,
    }).eq('id', CANAL)
    if (error) throw error
  })
}

// ═══════════════════════════ FASE 2 — PRÉ ═══════════════════════════════════

// ── VTs ──────────────────────────────────────────────────────────────────────
export async function criarVT(nome: string, duracao_seg: number, patroc_id: string | null, descricao: string | null): Promise<ActionResult> {
  return safe(async () => {
    await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_vt').insert({ canal: CANAL, nome, duracao_seg, patroc_id, descricao, ordem: Date.now() })
    if (error) throw error
  })
}
export async function deletarVT(id: string): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_vt').delete().eq('id', id); if (error) throw error })
}

// ── Escaleta ─────────────────────────────────────────────────────────────────
export async function criarItemEscaleta(item: { tipo: string; titulo: string; duracao_seg: number; vt_id?: string | null; notas?: string | null }): Promise<ActionResult> {
  return safe(async () => {
    await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_escaleta').insert({ canal: CANAL, ...item, ordem: Date.now() })
    if (error) throw error
  })
}
export async function atualizarItemEscaleta(id: string, patch: { titulo?: string; duracao_seg?: number; tipo?: string; ordem?: number; status?: string }): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_escaleta').update(patch).eq('id', id); if (error) throw error })
}
export async function deletarItemEscaleta(id: string): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_escaleta').delete().eq('id', id); if (error) throw error })
}

/** Gera a escaleta automaticamente a partir do line-up do Palco Principal. */
export async function gerarEscaletaDoLineup(): Promise<ActionResult> {
  return safe(async () => {
    await guard()
    const sb = createServiceClient()
    const { data: shows } = await sb
      .from('shows')
      .select('id, nome, inicio, fim_previsto, setor:setores(nome)')
      .order('inicio')
    type Row = { nome: string; inicio: string | null; fim_previsto: string | null; setor: { nome: string } | { nome: string }[] | null }
    const palco = ((shows ?? []) as Row[]).filter(s => {
      const setor = Array.isArray(s.setor) ? s.setor[0] : s.setor
      return /PALCO/i.test(setor?.nome ?? '')
    })
    // limpa escaleta atual
    await sb.from('broadcast_escaleta').delete().eq('canal', CANAL)

    let ordem = 1
    const itens: { canal: string; ordem: number; tipo: string; titulo: string; duracao_seg: number }[] = []
    itens.push({ canal: CANAL, ordem: ordem++, tipo: 'vinheta', titulo: 'Vinheta de abertura', duracao_seg: 20 })
    itens.push({ canal: CANAL, ordem: ordem++, tipo: 'fala', titulo: 'Boas-vindas — apresentador', duracao_seg: 120 })
    for (const s of palco) {
      const dur = s.inicio && s.fim_previsto
        ? Math.max(60, Math.round((new Date(s.fim_previsto).getTime() - new Date(s.inicio).getTime()) / 1000))
        : 1800
      itens.push({ canal: CANAL, ordem: ordem++, tipo: 'atracao', titulo: s.nome, duracao_seg: dur })
      itens.push({ canal: CANAL, ordem: ordem++, tipo: 'bumper', titulo: 'Bumper / transição', duracao_seg: 8 })
    }
    itens.push({ canal: CANAL, ordem: ordem++, tipo: 'encerramento', titulo: 'Encerramento + créditos', duracao_seg: 60 })
    const { error } = await sb.from('broadcast_escaleta').insert(itens)
    if (error) throw error
  })
}

/** Coloca um segmento no ar (runner): marca status + grava ponteiro/timer no estado. */
export async function irParaSegmento(item: { id: string; titulo: string; duracao_seg: number }): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    // segmento anterior → concluído
    await sb.from('broadcast_escaleta').update({ status: 'concluido' }).eq('canal', CANAL).eq('status', 'no_ar')
    await sb.from('broadcast_escaleta').update({ status: 'no_ar' }).eq('id', item.id)
    const fim = item.duracao_seg > 0 ? new Date(Date.now() + item.duracao_seg * 1000).toISOString() : null
    const { error } = await sb.from('broadcast_estado').update({
      segmento_id: item.id, segmento_titulo: item.titulo, segmento_fim_ts: fim,
      updated_at: new Date().toISOString(), updated_by: profile.id,
    }).eq('id', CANAL)
    if (error) throw error
  })
}

// ── VT cue (roll) ────────────────────────────────────────────────────────────
export async function rollVT(nome: string, duracao_seg: number, patrocId?: string | null): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const fim = new Date(Date.now() + duracao_seg * 1000).toISOString()
    const { error } = await sb.from('broadcast_estado').update({
      vt_on: true, vt_nome: nome, vt_fim_ts: fim,
      updated_at: new Date().toISOString(), updated_by: profile.id,
    }).eq('id', CANAL)
    if (error) throw error
    await sb.from('broadcast_log').insert({ canal: CANAL, acao: 'vt_ar', rotulo: `VT: ${nome}`, patroc_id: patrocId ?? null, criado_por: profile.id })
  })
}
export async function pararVT(): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_estado').update({ vt_on: false, updated_at: new Date().toISOString(), updated_by: profile.id }).eq('id', CANAL)
    if (error) throw error
  })
}

// ── Checklist ────────────────────────────────────────────────────────────────
export async function toggleChecklist(id: string, feito: boolean): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_checklist').update({ feito }).eq('id', id); if (error) throw error })
}
export async function resetChecklist(): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_checklist').update({ feito: false }).eq('canal', CANAL); if (error) throw error })
}
