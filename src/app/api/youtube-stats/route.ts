/**
 * GET /api/youtube-stats?id=VIDEO_ID
 *
 * Puxa métricas reais de uma transmissão do YouTube via Data API v3.
 * Só precisa de uma API key (dados públicos do vídeo) — sem OAuth.
 * Configure YOUTUBE_API_KEY no ambiente (Vercel).
 *
 * Degrada com elegância: sem key ou sem id → { ok:false, reason }.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  const key = process.env.YOUTUBE_API_KEY

  if (!key) return NextResponse.json({ ok: false, reason: 'no_key' }, { headers: { 'cache-control': 'no-store' } })
  if (!id)  return NextResponse.json({ ok: false, reason: 'no_id' },  { headers: { 'cache-control': 'no-store' } })

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics,snippet&id=${id}&key=${key}`
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return NextResponse.json({ ok: false, reason: 'api_error', status: r.status }, { headers: { 'cache-control': 'no-store' } })
    const j = await r.json()
    const item = j?.items?.[0]
    if (!item) return NextResponse.json({ ok: false, reason: 'not_found' }, { headers: { 'cache-control': 'no-store' } })

    const live = item.liveStreamingDetails ?? {}
    const stats = item.statistics ?? {}
    const ended = !!live.actualEndTime
    const started = !!live.actualStartTime
    return NextResponse.json({
      ok: true,
      title: item.snippet?.title ?? null,
      concurrentViewers: live.concurrentViewers ? Number(live.concurrentViewers) : null,
      likes: stats.likeCount ? Number(stats.likeCount) : null,
      views: stats.viewCount ? Number(stats.viewCount) : null,
      startedAt: live.actualStartTime ?? null,
      live: started && !ended,
      ended,
    }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, reason: 'fetch_failed' }, { headers: { 'cache-control': 'no-store' } })
  }
}
