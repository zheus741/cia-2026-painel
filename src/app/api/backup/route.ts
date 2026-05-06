import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Verificar role — só admin ou coordenação podem exportar
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin', 'coordenacao'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  // Buscar todos os conteúdos
  const { data: conteudos, error } = await supabase
    .from('conteudos')
    .select(`
      id, titulo, tipo, status, prioridade,
      dia_id, setor_id, patrocinador_id, jogo_id, show_id, festa_id, modalidade_id,
      canal_publicacao, briefing, horario_previsto, link_publicado,
      responsavel_captacao_id, responsavel_design_id, responsavel_edicao_id,
      criado_por, criado_em, atualizado_em,
      dia:dia_id (nome_dia, data),
      setor:setor_id (nome),
      patrocinador:patrocinador_id (nome)
    `)
    .order('criado_em', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const payload = {
    backup_em:  new Date().toISOString(),
    total:      conteudos?.length ?? 0,
    fonte:      'CIA 2026 Painel',
    conteudos:  conteudos ?? [],
  }

  const filename = `cia2026-backup-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
