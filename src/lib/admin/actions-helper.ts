import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { ok: boolean; error?: string }

export async function getEdicaoAtivaId() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('edicoes')
    .select('id')
    .eq('ativa', true)
    .maybeSingle()
  return data?.id as string | undefined
}

export async function requireEdicaoAtivaId(): Promise<string> {
  const id = await getEdicaoAtivaId()
  if (!id)
    throw new Error('Nenhuma edição ativa cadastrada. Cadastre uma edição primeiro.')
  return id
}

/**
 * Lê FormData do dialog. Coerce arrays JSON-stringificadas e booleanos.
 */
export function parseFormData<T extends Record<string, unknown>>(
  fd: FormData,
  schema: { name: string; type: 'text' | 'array' | 'number' | 'boolean' | 'date' | 'datetime' | 'nullable_text' }[],
): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const f of schema) {
    const raw = fd.get(f.name)
    if (raw === null || raw === undefined || raw === '') {
      if (f.type === 'nullable_text') out[f.name] = null
      continue
    }
    const s = String(raw)
    if (f.type === 'array') {
      try {
        out[f.name] = JSON.parse(s)
      } catch {
        out[f.name] = s.split(',').map((x) => x.trim()).filter(Boolean)
      }
    } else if (f.type === 'number') {
      const n = Number(s)
      out[f.name] = Number.isFinite(n) ? n : null
    } else if (f.type === 'boolean') {
      out[f.name] = s === 'true'
    } else if (f.type === 'datetime') {
      out[f.name] = s ? new Date(s).toISOString() : null
    } else {
      out[f.name] = s
    }
  }
  return out as Partial<T>
}

/**
 * Tenta executar e devolve {ok,error} sem lançar.
 */
export async function safe<T>(
  fn: () => Promise<T>,
): Promise<ActionResult & { data?: T }> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch (e) {
    // PostgrestError (Supabase) is a plain object — not instanceof Error
    let msg = 'Erro desconhecido.'
    if (e instanceof Error) {
      msg = e.message
    } else if (e && typeof e === 'object') {
      const pe = e as Record<string, unknown>
      msg = String(pe.message ?? pe.details ?? pe.hint ?? pe.code ?? 'Erro desconhecido.')
    }
    console.error('[safe]', e)
    return { ok: false, error: msg }
  }
}

export async function requireCoordOrAdmin() {
  const supabase = await createClient()
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('Não autenticado.')
  const { data: p } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', u.user.id)
    .maybeSingle()
  if (!p || !['admin', 'coordenacao'].includes(p.role)) {
    throw new Error('Sem permissão. Apenas admin ou coordenação podem alterar.')
  }
}

export async function requireLiderOrAbove() {
  const supabase = await createClient()
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('Não autenticado.')
  const { data: p } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', u.user.id)
    .maybeSingle()
  if (!p || !['admin', 'coordenacao', 'lider_area'].includes(p.role)) {
    throw new Error('Sem permissão.')
  }
}
