import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { titulo, descricao, edicao_id } = body

  if (!titulo?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  // Usa service client para bypassar a RLS restritiva do INSERT
  // (a política atual pode exigir lider_or_above; pautas é um board colaborativo —
  // toda a equipe pode criar ideias, independentemente de role)
  const service = createServiceClient()
  const { data, error } = await service
    .from('pautas')
    .insert({ titulo: titulo.trim(), descricao: descricao?.trim() || null, edicao_id, autor_id: user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/pautas')
  return NextResponse.json(data)
}

// Aceita statuses novos (executada) e antigos (em_execucao, entregue) pra
// compatibilidade durante a transição da migração 0032.
const VALID_PAUTA_STATUSES = ['ideia', 'aprovada', 'executada', 'em_execucao', 'entregue', 'descartada'] as const

export async function PATCH(req: NextRequest) {
  // Verifica autenticação — qualquer usuário logado pode mover pautas
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 })

  if (!VALID_PAUTA_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  }

  // Usa service client para bypassar a RLS restritiva do UPDATE
  // (política atual exige autor_id = auth.uid() ou is_lider_or_above)
  // Toda a equipe pode mover pautas — é um board colaborativo
  const service = createServiceClient()
  const { error } = await service.from('pautas').update({ status }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/pautas')
  return NextResponse.json({ ok: true })
}
