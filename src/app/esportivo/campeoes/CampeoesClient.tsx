'use client'

/**
 * CampeoesClient — Quadro de Campeões CIA 2026
 *
 * Consolida os títulos já definidos: campeões de divisão (1ª/2ª),
 * campeões das 8 conferências, campeões por modalidade, a Liga Super 8
 * e as finais em disputa (títulos saindo ao vivo).
 */

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Trophy, Crown, Medal, Zap, ArrowLeft, Radio, Clock } from 'lucide-react'
import type { ConferenciaMeta } from '@/lib/conferencias'

interface Campeao {
  id: string; nome: string; slug: string | null
  universidade: string | null; cor: string | null; logo: string | null; pontos: number
}
interface DivisaoCampea { nome: string; cor: string; campeao: Campeao | null }
interface ConfCampea { nome: string; cor: string; corAlt: string; icone: string; vibe: string; campeao: Campeao | null }
interface ModItem { modalidade: string; categoria: string | null; campeao: string }
interface ModGrupo { grupo: string; conf: ConferenciaMeta | null; items: ModItem[] }
interface Super8Standing { atletica_id: string; nome: string; slug: string | null; pontos: number; jogados: number; vitorias: number; derrotas: number; saldo: number }
interface Super8Resumo { total_jogos: number; jogos_encerrados: number; liga_montada: boolean; liga_finalizada: boolean }
interface Final { divisao: string; modalidade: string; categoria: string | null; inicio: string | null; aoVivo: boolean; a: string; b: string }

interface Props {
  divisoes: DivisaoCampea[]
  conferencias: ConfCampea[]
  modalidades: ModGrupo[]
  super8: { standings: Super8Standing[]; resumo: Super8Resumo } | null
  finais: Final[]
  totalModalidades: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function iniciais(nome: string): string {
  const w = nome.trim().split(/\s+/).filter(Boolean)
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function Avatar({ nome, cor, size = 44 }: { nome: string; cor: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-black"
      style={{ width: size, height: size, background: `${cor}22`, color: cor, border: `1.5px solid ${cor}55`, fontSize: size * 0.34 }}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  )
}

function AtleticaLink({ slug, children, className }: { slug: string | null; children: React.ReactNode; className?: string }) {
  if (!slug) return <span className={className}>{children}</span>
  return <Link href={`/atleticas/${slug}`} className={className}>{children}</Link>
}

const hora = (iso: string | null) => (iso ?? '').slice(11, 16)

// ── Componente ────────────────────────────────────────────────────────────────

export function CampeoesClient({ divisoes, conferencias, modalidades, super8, finais, totalModalidades }: Props) {
  const grupos = useMemo(() => ['Todos', ...modalidades.map(m => m.grupo)], [modalidades])
  const [filtro, setFiltro] = useState('Todos')
  const visiveis = filtro === 'Todos' ? modalidades : modalidades.filter(m => m.grupo === filtro)

  const s8lider = super8?.standings?.[0]
  const aoVivoCount = finais.filter(f => f.aoVivo).length
  const corDe = (grupo: string) => grupo.includes('1ª') ? '#C79A1E' : grupo.includes('2ª') ? '#3d7a52' : '#8a5f06'

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-10 px-4 py-6 sm:px-6 md:py-10 lg:px-10">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="cia-glass-gold cia-fade-in relative overflow-hidden rounded-3xl border border-[var(--gold-dim)] px-6 py-10 text-center sm:px-10 sm:py-14">
        <div className="cia-hero-orb cia-hero-orb-1" aria-hidden />
        <Link href="/esportivo" className="absolute left-5 top-5 inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
          <ArrowLeft size={16} /> Esportivo
        </Link>
        {(aoVivoCount > 0) && (
          <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#e11d48] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            {aoVivoCount} ao vivo
          </span>
        )}
        <p className="cia-gold-text mb-2 text-xs font-semibold uppercase tracking-[0.35em]">CIA 2026 · Copa Inter Atléticas</p>
        <h1 className="flex items-center justify-center gap-3 text-4xl font-black tracking-tight text-[var(--foreground)] sm:text-6xl">
          <Trophy className="text-[var(--gold-bright)]" size={48} strokeWidth={2.2} />
          Campeões
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted-foreground)] sm:text-base">
          Os títulos conquistados — e os que estão sendo decididos agora.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-sm">
          <span className="rounded-full bg-[var(--card)] px-4 py-1.5 font-semibold shadow-sm">{divisoes.filter(d => d.campeao).length + conferencias.filter(c => c.campeao).length} títulos gerais</span>
          <span className="rounded-full bg-[var(--card)] px-4 py-1.5 font-semibold shadow-sm">{totalModalidades} de modalidade</span>
          {finais.length > 0 && <span className="rounded-full bg-[var(--card)] px-4 py-1.5 font-semibold shadow-sm">{finais.length} finais em disputa</span>}
        </div>
      </header>

      {/* ── Acontecendo agora (finais em disputa) ────────────────────────── */}
      {finais.length > 0 && (
        <section className="cia-fade-in space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Radio className="text-[#e11d48]" size={22} /> Acontecendo agora
            <span className="text-sm font-normal text-[var(--muted-foreground)]">· finais valendo título</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {finais.map((f, i) => (
              <article key={i} className="cia-card relative flex flex-col gap-2 rounded-2xl p-4"
                style={f.aoVivo ? { borderColor: '#e11d48', boxShadow: '0 0 0 1px #e11d4855' } : undefined}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wide" style={{ color: corDe(f.divisao) }}>
                    {f.modalidade}{f.categoria ? ` · ${f.categoria}` : ''}
                  </span>
                  {f.aoVivo
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-[#e11d48] px-2 py-0.5 font-bold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> AO VIVO</span>
                    : <span className="inline-flex items-center gap-1 text-[var(--muted-foreground)]"><Clock size={12} /> {hora(f.inicio) || '—'}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex-1 truncate text-right text-sm font-bold">{f.a}</span>
                  <span className="shrink-0 rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-black text-[var(--muted-foreground)]">VS</span>
                  <span className="flex-1 truncate text-sm font-bold">{f.b}</span>
                </div>
                <span className="text-center text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">{f.divisao} · final</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Campeões de Divisão ──────────────────────────────────────────── */}
      <section className="cia-fade-in space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Crown className="text-[var(--gold-bright)]" size={22} /> Campeões de Divisão
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {divisoes.map(d => (
            <article key={d.nome} className="cia-card relative overflow-hidden rounded-2xl p-6" style={{ borderTop: `4px solid ${d.cor}` }}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{d.nome}</p>
              {d.campeao ? (
                <div className="mt-2 flex items-center gap-4">
                  <Avatar nome={d.campeao.nome} cor={d.cor} size={56} />
                  <div className="min-w-0">
                    <AtleticaLink slug={d.campeao.slug} className="block truncate text-2xl font-black leading-tight text-[var(--foreground)] hover:underline sm:text-3xl">
                      {d.campeao.nome}
                    </AtleticaLink>
                    {d.campeao.universidade && <p className="truncate text-sm text-[var(--muted-foreground)]">{d.campeao.universidade}</p>}
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold" style={{ background: `${d.cor}22`, color: d.cor }}>
                      <Trophy size={14} /> {d.campeao.pontos} pts
                    </span>
                  </div>
                </div>
              ) : <p className="mt-3 text-[var(--muted-foreground)]">A definir</p>}
              <Crown className="pointer-events-none absolute -bottom-3 -right-3 opacity-[0.07]" size={120} style={{ color: d.cor }} />
            </article>
          ))}
        </div>
      </section>

      {/* ── Liga Super 08 ────────────────────────────────────────────────── */}
      {super8 && super8.resumo.liga_montada && (
        <section className="cia-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Zap className="text-[var(--gold-bright)]" size={22} /> Liga Super 8
            </h2>
            <Link href="/esportivo/super-8" className="text-sm font-semibold text-[var(--green-bright)] hover:underline">tabela completa →</Link>
          </div>
          <div className="cia-card rounded-2xl p-5">
            {super8.resumo.liga_finalizada && s8lider ? (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-[var(--gold-dim)] px-4 py-3">
                <Trophy className="text-[var(--gold-bright)]" size={28} />
                <div><p className="text-xs font-bold uppercase tracking-wide text-[var(--gold)]">Campeã Super 8</p>
                  <p className="text-xl font-black">{s8lider.nome}</p></div>
              </div>
            ) : (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-semibold text-[var(--muted-foreground)]">
                <Radio size={14} className="text-[var(--green-bright)]" /> Em andamento · {super8.resumo.jogos_encerrados}/{super8.resumo.total_jogos} jogos
              </p>
            )}
            <ol className="space-y-1">
              {super8.standings.slice(0, 8).map((s, i) => (
                <li key={s.atletica_id} className="flex items-center gap-3 rounded-lg px-2 py-1.5" style={{ background: i === 0 ? 'var(--gold-dim)' : 'transparent' }}>
                  <span className="w-6 text-center text-sm font-bold tabular-nums text-[var(--muted-foreground)]">{i + 1}º</span>
                  <AtleticaLink slug={s.slug} className="flex-1 truncate font-semibold hover:underline">{s.nome}</AtleticaLink>
                  <span className="text-xs text-[var(--muted-foreground)] tabular-nums">{s.vitorias}V · {s.derrotas}D</span>
                  <span className="w-12 text-right font-black tabular-nums">{s.pontos}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── Campeões de Conferência ──────────────────────────────────────── */}
      <section className="cia-fade-in space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Medal className="text-[var(--gold-bright)]" size={22} /> Campeões de Conferência
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {conferencias.map(c => (
            <article key={c.nome} className="cia-card relative overflow-hidden rounded-2xl p-5" style={{ borderTop: `4px solid ${c.cor}` }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: c.cor }}>{c.nome}</p>
                <span className="text-lg" style={{ color: c.cor }}>{c.icone}</span>
              </div>
              {c.campeao ? (
                <div className="mt-3 flex items-center gap-3">
                  <Avatar nome={c.campeao.nome} cor={c.cor} size={42} />
                  <div className="min-w-0">
                    <AtleticaLink slug={c.campeao.slug} className="block truncate text-lg font-black leading-tight hover:underline">{c.campeao.nome}</AtleticaLink>
                    <span className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: c.cor }}><Trophy size={13} /> {c.campeao.pontos} pts</span>
                  </div>
                </div>
              ) : <p className="mt-2 text-sm text-[var(--muted-foreground)]">A definir</p>}
            </article>
          ))}
        </div>
      </section>

      {/* ── Campeões por Modalidade ──────────────────────────────────────── */}
      <section className="cia-fade-in space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Medal className="text-[var(--gold-bright)]" size={22} /> Campeões por Modalidade
          <span className="text-sm font-normal text-[var(--muted-foreground)]">· {totalModalidades} títulos</span>
        </h2>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {grupos.map(g => (
            <button key={g} onClick={() => setFiltro(g)}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition"
              style={filtro === g ? { background: 'var(--foreground)', color: 'var(--card)' } : { background: 'var(--card)', color: 'var(--muted-foreground)' }}>
              {g}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map(grp => (
            <article key={grp.grupo} className="cia-card rounded-2xl p-5" style={{ borderTop: `4px solid ${grp.conf?.cor ?? corDe(grp.grupo)}` }}>
              <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em]" style={{ color: grp.conf?.cor ?? 'var(--foreground)' }}>
                {grp.conf?.icone} {grp.grupo}
                <span className="ml-auto text-xs font-normal text-[var(--muted-foreground)]">{grp.items.length}</span>
              </p>
              <ul className="space-y-1.5">
                {grp.items.map((it, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-[var(--muted-foreground)]">{it.modalidade}{it.categoria ? <span className="opacity-70"> · {it.categoria}</span> : null}</span>
                    <span className="shrink-0 font-bold text-[var(--foreground)]">{it.campeao}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <p className="pb-6 text-center text-xs text-[var(--muted-foreground)]">
        Atualiza ao vivo conforme as finais são lançadas · CIA 2026
      </p>
    </div>
  )
}
