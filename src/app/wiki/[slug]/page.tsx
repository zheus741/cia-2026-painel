import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WikiDocView, type DocData } from './WikiDocView'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function WikiDocPage({ params }: Props) {
  const { slug } = await params
  const supabase  = await createClient()

  const [{ data: doc }, { data: { user } }] = await Promise.all([
    supabase
      .from('docs')
      .select('id, titulo, slug, conteudo_md, categoria, funcao, atualizado_em, autor:profiles!autor_id(nome)')
      .eq('slug', slug)
      .eq('publicado', true)
      .single(),
    supabase.auth.getUser(),
  ])

  if (!doc) notFound()

  let canEdit = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    canEdit = ['admin', 'coordenacao'].includes(profile?.role ?? '')
  }

  const autor = (Array.isArray(doc.autor) ? doc.autor[0] : doc.autor) as { nome: string | null } | null

  return (
    <WikiDocView
      doc={{ ...doc, autor } as DocData}
      canEdit={canEdit}
    />
  )
}
