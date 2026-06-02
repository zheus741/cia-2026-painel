import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { processarWorkbookJogos } from '@/lib/planilha/jogos-sync-core'

// Wrapper fino: auth + validação de arquivo. Toda a lógica de parse/insert/
// dedup/stamp vive em src/lib/planilha/jogos-sync-core.ts (reusada pela action
// de sincronização da planilha mestre).

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Não autenticado.' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!profile || !['admin', 'coordenacao'].includes(profile.role)) {
      return NextResponse.json({ ok: false, error: 'Sem permissão.' }, { status: 403 })
    }

    const form      = await req.formData()
    const file      = form.get('file') as File | null
    const overwrite = form.get('overwrite') === 'true'
    if (!file) return NextResponse.json({ ok: false, error: 'Arquivo não enviado.' }, { status: 400 })

    const ALLOWED_MIME = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!ALLOWED_MIME.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ ok: false, error: 'Tipo inválido. Envie .xlsx ou .xls.' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'Arquivo muito grande. Limite: 20 MB.' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const wb     = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })

    const result = await processarWorkbookJogos(supabase, wb, { overwrite })
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true, stats: result.stats })
  } catch (e) {
    console.error('[import-tabela]', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
