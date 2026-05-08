import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // segundos

// ── Auth check ────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  // Vercel envia Authorization: Bearer <secret>
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const triggeredBy =
    req.headers.get('x-vercel-cron') === '1' ? 'cron' : 'manual'

  const supabase = createServiceClient()
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)             // 2026-06-04
  const storagePath = `backups/cia2026-${dateStr}.json`

  try {
    // ── Lê todos os dados relevantes ──────────────────────────────────────────

    const [
      { data: conteudos   },
      { data: turnos      },
      { data: jogos       },
      { data: shows       },
      { data: festas      },
      { data: profiles    },
      { data: ckItens     },
      { data: notificacoes},
    ] = await Promise.all([
      supabase.from('conteudos').select(`
        id, titulo, tipo, status, prioridade,
        dia_id, setor_id, patrocinador_id, jogo_id, show_id, festa_id,
        canal_publicacao, briefing, link_publicado,
        criado_por, criado_em, atualizado_em
      `).order('criado_em'),

      supabase.from('turnos').select(`
        id, user_id, dia_id, setor_id, funcao, inicio, fim,
        parceiro_id, prioridade, status_escala
      `).order('inicio'),

      supabase.from('jogos').select(
        'id, dia_id, setor_id, modalidade_id, inicio, fim, placar_a, placar_b'
      ),

      supabase.from('shows').select(
        'id, dia_id, setor_id, nome, inicio, fim'
      ),

      supabase.from('festas').select(
        'id, dia_id, setor_id, nome, inicio, fim'
      ),

      supabase.from('profiles').select(
        'id, nome, role, funcao_principal, parceiro_id'
      ),

      supabase.from('checklist_itens').select(
        'id, instancia_id, label, status, operador_id, concluido_em'
      ),

      supabase.from('notificacoes').select(
        'id, user_id, tipo, titulo, lida, created_at'
      ).gte('created_at', `${dateStr}T00:00:00Z`), // só as de hoje
    ])

    const totals = {
      conteudos:    conteudos?.length    ?? 0,
      turnos:       turnos?.length       ?? 0,
      jogos:        jogos?.length        ?? 0,
      shows:        shows?.length        ?? 0,
      festas:       festas?.length       ?? 0,
      profiles:     profiles?.length     ?? 0,
      ck_itens:     ckItens?.length      ?? 0,
      notificacoes: notificacoes?.length ?? 0,
    }

    const payload = {
      exported_at:  now.toISOString(),
      triggered_by: triggeredBy,
      version:      '2026-05-08',
      totals,
      data: {
        conteudos:    conteudos    ?? [],
        turnos:       turnos       ?? [],
        jogos:        jogos        ?? [],
        shows:        shows        ?? [],
        festas:       festas       ?? [],
        profiles:     profiles     ?? [],
        checklist_itens: ckItens   ?? [],
        notificacoes_hoje: notificacoes ?? [],
      },
    }

    const json = JSON.stringify(payload, null, 2)
    const bytes = Buffer.byteLength(json, 'utf8')

    // ── Salva no Supabase Storage ─────────────────────────────────────────────

    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(storagePath, json, {
        contentType: 'application/json',
        upsert: true,          // sobrescreve se rodou duas vezes no mesmo dia
      })

    if (uploadError) {
      throw new Error(`Storage upload: ${uploadError.message}`)
    }

    // ── Registra no log ───────────────────────────────────────────────────────

    await supabase.from('daily_exports').insert({
      exported_at:  now.toISOString(),
      storage_path: storagePath,
      size_bytes:   bytes,
      totals,
      status:       'ok',
      triggered_by: triggeredBy,
    })

    return NextResponse.json({
      ok:    true,
      path:  storagePath,
      bytes,
      totals,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/daily-export]', msg)

    // Tenta logar o erro mesmo assim
    try {
      await supabase.from('daily_exports').insert({
        exported_at:  now.toISOString(),
        storage_path: storagePath,
        status:       'erro',
        error_msg:    msg,
        triggered_by: triggeredBy,
      })
    } catch { /* ignora */ }

    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
