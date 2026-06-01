'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { safe, type ActionResult } from '@/lib/admin/actions-helper'
import { requireProfile } from '@/lib/auth/current-user'

const CANAL = 'palco-principal'
const PAPEIS = ['admin', 'coordenacao', 'lider_fv', 'lider_area', 'coordenador_esportivo']

async function guard() {
  const profile = await requireProfile()
  if (!PAPEIS.includes(profile.role ?? '')) throw new Error('Sem permissão.')
  return profile
}

// ── Config do programa (termômetro / YouTube / ao vivo) ──────────────────────
export async function setPrograma(patch: {
  ao_vivo?: boolean
  youtube_url?: string | null
  youtube_video_id?: string | null
  programa_titulo?: string | null
}): Promise<ActionResult> {
  return safe(async () => {
    const profile = await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_estado')
      .update({ ...patch, updated_at: new Date().toISOString(), updated_by: profile.id })
      .eq('id', CANAL)
    if (error) throw error
  })
}

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

// ── Grade de programação ─────────────────────────────────────────────────────
export async function criarItemGrade(item: { tipo: string; titulo: string; duracao_seg: number; horario?: string | null; responsavel?: string | null; vt_id?: string | null; notas?: string | null }): Promise<ActionResult> {
  return safe(async () => {
    await guard()
    const sb = createServiceClient()
    const { error } = await sb.from('broadcast_escaleta').insert({ canal: CANAL, ...item, ordem: Date.now() })
    if (error) throw error
  })
}
export async function atualizarItemGrade(id: string, patch: { titulo?: string; duracao_seg?: number; tipo?: string; horario?: string | null; responsavel?: string | null; notas?: string | null; status?: string }): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_escaleta').update(patch).eq('id', id); if (error) throw error })
}
export async function deletarItemGrade(id: string): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_escaleta').delete().eq('id', id); if (error) throw error })
}

/** Gera a grade automaticamente a partir do line-up do Palco Principal. */
export async function gerarGradeDoLineup(): Promise<ActionResult> {
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
    await sb.from('broadcast_escaleta').delete().eq('canal', CANAL)

    const hhmm = (iso: string | null) => iso
      ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
      : null

    let ordem = 1
    const itens: Record<string, unknown>[] = []
    const primeiro = palco[0]?.inicio ? new Date(palco[0].inicio!) : null
    const aberturaHora = primeiro ? new Date(primeiro.getTime() - 10 * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : null

    itens.push({ canal: CANAL, ordem: ordem++, tipo: 'vinheta', titulo: 'Vinheta de abertura', duracao_seg: 20, horario: aberturaHora })
    itens.push({ canal: CANAL, ordem: ordem++, tipo: 'fala', titulo: 'Boas-vindas — apresentador', duracao_seg: 120, horario: aberturaHora })
    for (const s of palco) {
      const dur = s.inicio && s.fim_previsto
        ? Math.max(60, Math.round((new Date(s.fim_previsto).getTime() - new Date(s.inicio).getTime()) / 1000))
        : 1800
      itens.push({ canal: CANAL, ordem: ordem++, tipo: 'atracao', titulo: s.nome, duracao_seg: dur, horario: hhmm(s.inicio) })
      itens.push({ canal: CANAL, ordem: ordem++, tipo: 'bumper', titulo: 'Bumper / transição', duracao_seg: 8, horario: hhmm(s.fim_previsto) })
    }
    itens.push({ canal: CANAL, ordem: ordem++, tipo: 'encerramento', titulo: 'Encerramento + créditos', duracao_seg: 60 })
    const { error } = await sb.from('broadcast_escaleta').insert(itens)
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

// ── Equipe (call sheet) ──────────────────────────────────────────────────────
export async function atualizarEquipe(id: string, patch: { nome?: string; funcao?: string; contato?: string | null }): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_equipe').update(patch).eq('id', id); if (error) throw error })
}
export async function criarEquipe(funcao: string, nome: string): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_equipe').insert({ canal: CANAL, funcao, nome, ordem: Date.now() }); if (error) throw error })
}
export async function deletarEquipe(id: string): Promise<ActionResult> {
  return safe(async () => { await guard(); const sb = createServiceClient(); const { error } = await sb.from('broadcast_equipe').delete().eq('id', id); if (error) throw error })
}
