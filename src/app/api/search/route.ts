import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/search?q=<termo>
 *
 * Busca global em paralelo nas tabelas principais.
 * Retorna no máximo 5 resultados por categoria pra não inundar o palette.
 * Categorias: atléticas, jogos, conteúdos, usuários, setores.
 *
 * Auth: requer usuário autenticado.
 */

export interface SearchResult {
  id:        string
  type:      'atletica' | 'jogo' | 'conteudo' | 'usuario' | 'setor' | 'praca'
  title:     string
  subtitle?: string
  href:      string
}

const LIMIT_PER_CATEGORY = 5

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q   = (url.searchParams.get('q') ?? '').trim()

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] satisfies SearchResult[] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ results: [] satisfies SearchResult[] }, { status: 401 })
  }

  // Busca em paralelo: ilike (case-insensitive). Limite low pra performance.
  const pattern = `%${q}%`

  const [atleticasRes, jogosRes, conteudosRes, usuariosRes, setoresRes] = await Promise.all([
    // Atléticas: por nome ou universidade
    supabase
      .from('equipes')
      .select('id, nome, slug, universidade')
      .or(`nome.ilike.${pattern},universidade.ilike.${pattern}`)
      .limit(LIMIT_PER_CATEGORY),
    // Jogos: por nome de equipe A/B
    supabase
      .from('jogos')
      .select('id, dia_id, equipe_a_nome, equipe_b_nome, status, inicio, modalidade:modalidades(nome)')
      .or(`equipe_a_nome.ilike.${pattern},equipe_b_nome.ilike.${pattern}`)
      .order('inicio', { ascending: false, nullsFirst: false })
      .limit(LIMIT_PER_CATEGORY),
    // Conteúdos: por título
    supabase
      .from('conteudos')
      .select('id, titulo, tipo, status')
      .ilike('titulo', pattern)
      .limit(LIMIT_PER_CATEGORY),
    // Usuários: por nome ou email (só ativos)
    supabase
      .from('profiles')
      .select('id, nome, email, role')
      .or(`nome.ilike.${pattern},email.ilike.${pattern}`)
      .eq('ativo', true)
      .limit(LIMIT_PER_CATEGORY),
    // Setores
    supabase
      .from('setores')
      .select('id, nome, tipo')
      .ilike('nome', pattern)
      .limit(LIMIT_PER_CATEGORY),
  ])

  const results: SearchResult[] = []

  // Atléticas
  for (const a of atleticasRes.data ?? []) {
    results.push({
      id:       `atletica-${a.id}`,
      type:     'atletica',
      title:    a.nome,
      subtitle: a.universidade ?? undefined,
      href:     a.slug ? `/atleticas/${a.slug}` : '/atleticas',
    })
  }

  // Jogos
  for (const j of jogosRes.data ?? []) {
    const mod = Array.isArray(j.modalidade) ? j.modalidade[0]?.nome : (j.modalidade as { nome: string } | null)?.nome
    const time = j.inicio ? new Date(j.inicio).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }) : ''
    results.push({
      id:       `jogo-${j.id}`,
      type:     'jogo',
      title:    `${j.equipe_a_nome ?? '?'} × ${j.equipe_b_nome ?? '?'}`,
      subtitle: [mod, time].filter(Boolean).join(' · ') || undefined,
      href:     `/placar?dia=${j.dia_id}#jogo-${j.id}`,
    })
  }

  // Conteúdos
  for (const c of conteudosRes.data ?? []) {
    results.push({
      id:       `conteudo-${c.id}`,
      type:     'conteudo',
      title:    c.titulo,
      subtitle: [c.tipo, c.status].filter(Boolean).join(' · ') || undefined,
      href:     `/conteudos`, // futuro: deep-link com filter ?id=
    })
  }

  // Usuários
  for (const u of usuariosRes.data ?? []) {
    results.push({
      id:       `usuario-${u.id}`,
      type:     'usuario',
      title:    u.nome,
      subtitle: [u.role, u.email].filter(Boolean).join(' · ') || undefined,
      href:     `/admin/usuarios`,
    })
  }

  // Setores
  for (const s of setoresRes.data ?? []) {
    results.push({
      id:       `setor-${s.id}`,
      type:     'praca',
      title:    s.nome,
      subtitle: s.tipo ?? 'Praça',
      href:     `/esportivo/escala#setor-${s.id}`,
    })
  }

  return NextResponse.json({ results })
}
