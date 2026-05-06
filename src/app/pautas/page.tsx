import { createClient } from '@/lib/supabase/server'
import { PautasBoard } from './PautasBoard'

export default async function PautasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pautas')
    .select(`
      id, titulo, descricao, status,
      setor:setores(nome),
      dia:dias_evento(nome_dia),
      autor:profiles(nome)
    `)
    .order('criado_em', { ascending: false })

  const pautas = (data ?? []).map((p) => ({
    ...p,
    setor: p.setor as unknown as { nome: string } | null,
    dia: p.dia as unknown as { nome_dia: string } | null,
    autor: p.autor as unknown as { nome: string } | null,
  }))

  const { data: edicao } = await supabase
    .from('edicoes')
    .select('id')
    .eq('ativa', true)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--accent)]">Roaming</p>
        <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold tracking-tight">
          Pautas
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Ideias de cobertura — da ideia ao conteúdo entregue.
        </p>
      </div>

      <PautasBoard
        pautas={pautas as Parameters<typeof PautasBoard>[0]['pautas']}
        edicaoId={edicao?.id ?? '00000000-0000-0000-0000-000000000001'}
      />
    </div>
  )
}
