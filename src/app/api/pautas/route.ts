import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { titulo, descricao, edicao_id } = body

  if (!titulo?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('pautas')
    .insert({ titulo: titulo.trim(), descricao: descricao?.trim() || null, edicao_id, autor_id: user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

const VALID_PAUTA_STATUSES = ['ideia', 'aprovada', 'em_execucao', 'entregue', 'descartada'] as const

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 })

  if (!VALID_PAUTA_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  }

  // Verifica role — coord/admin podem editar qualquer pauta; outros só a própria
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isCoordOrAdmin = ['admin', 'coordenacao'].includes(profile?.role ?? '')

  const query = supabase.from('pautas').update({ status }).eq('id', id)
  const { error } = isCoordOrAdmin
    ? await query
    : await query.eq('autor_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
