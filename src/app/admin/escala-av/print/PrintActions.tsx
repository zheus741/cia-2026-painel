'use client'

/**
 * Botões de ação que aparecem só na tela (no-print).
 * Foca em "Imprimir" (Ctrl+P → Salvar PDF), troca de dia e voltar.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'

interface Props {
  dias: Array<{ id: string; nome_dia: string; data: string }>
  currentDia: string
  all: boolean
  diasIds: string[]
}

export function PrintActions({ dias, currentDia, all }: Props) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link
        href="/admin/escala-av"
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      >
        <ArrowLeft className="h-3 w-3" />
        Voltar à escala
      </Link>

      <select
        value={all ? '__all__' : currentDia}
        onChange={(e) => {
          const v = e.target.value
          if (v === '__all__') router.replace('/admin/escala-av/print?all=1')
          else router.replace(`/admin/escala-av/print?dia=${v}`)
        }}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
      >
        {dias.map(d => (
          <option key={d.id} value={d.id}>{d.nome_dia} · {d.data}</option>
        ))}
        <option value="__all__">— Todos os dias —</option>
      </select>

      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5"
      >
        <Printer className="h-4 w-4" />
        Imprimir / Salvar PDF
      </button>

      <p style={{ width: '100%', margin: 0 }}>
        Use <strong>Ctrl+P</strong> (ou <strong>⌘+P</strong> no Mac) → Destino: <strong>Salvar como PDF</strong>. Recomendado: A4 paisagem.
      </p>
    </div>
  )
}
