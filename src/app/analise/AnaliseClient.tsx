'use client'

/**
 * AnaliseClient — Análise de Operação CIA 2026
 *
 * Pulso da cobertura audiovisual: produção de conteúdo, equipe, setores,
 * escala e cobertura esportiva. Dados consolidados do sistema.
 */

import React from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { Activity, FileText, Users, MapPin, Clapperboard, Megaphone, Bell, ArrowLeft } from 'lucide-react'

type Pair = [string, number]
interface Data {
  kpis: {
    conteudos: number; publicados: number; pctPub: number
    pessoas: number; pessoasAtivas: number; empresas: number
    setores: number; ytLives: number; jogosEnc: number; evJogo: number
    push: number; patrocinados: number; pautas: number
    shows: number; festas: number; patroc: number; escEsp: number; turnos: number
  }
  conteudoStatus: Pair[]; canais: Pair[]; formatos: Pair[]
  pipeline: { nome: string; n: number }[]
  roles: Pair[]; funcoes: Pair[]; setorTipos: Pair[]; turnoFuncoes: Pair[]
}

const PALETTE = ['#C79A1E', '#3d7a52', '#0891b2', '#9333ea', '#dc2626', '#ca8a04', '#65a30d', '#ea580c']

const LABELS: Record<string, string> = {
  publicado: 'Publicado', rascunho: 'Rascunho', arquivado: 'Arquivado', em_producao: 'Em produção',
  operador_esportivo: 'Operador esportivo', operador_fv: 'Operador FV', operador: 'Operador',
  lider_fv: 'Líder FV', coordenacao: 'Coordenação', admin: 'Admin', coordenador_esportivo: 'Coord. esportivo',
  lider_area: 'Líder de área', lider_cobertura: 'Líder cobertura',
  instagram_cia: 'Instagram CIA', instagram_jogo_rapido: 'IG Jogo Rápido', tiktok_cia: 'TikTok CIA',
  instagram_exp: 'Instagram EXP', instagram_nix: 'Instagram Nix', x_cia: 'X CIA', x_exp: 'X EXP',
  storymaker: 'Storymaker', foto: 'Foto', video: 'Vídeo', design: 'Design', social_media: 'Social media',
  editor: 'Editor', roaming: 'Roaming', esportivo: 'Esportivo', festa: 'Festa', apoio: 'Apoio', palco: 'Palco',
}
const lbl = (k: string) => LABELS[k] ?? k.replace(/_/g, ' ')

function Bars({ data, total }: { data: Pair[]; total?: number }) {
  const max = total ?? Math.max(...data.map(d => d[1]), 1)
  return (
    <div className="space-y-2">
      {data.map(([k, v], i) => (
        <div key={k} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-right text-[var(--muted-foreground)]">{lbl(k)}</span>
          <span className="h-4 flex-1 overflow-hidden rounded bg-[var(--muted)]">
            <span className="block h-full rounded" style={{ width: `${Math.max(3, v / max * 100)}%`, background: PALETTE[i % PALETTE.length] }} />
          </span>
          <span className="w-10 text-right font-bold tabular-nums text-[var(--foreground)]">{v}</span>
        </div>
      ))}
    </div>
  )
}

function Kpi({ n, label, sub, icon: Icon }: { n: number | string; label: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="cia-card flex flex-col rounded-2xl p-4">
      <Icon className="mb-2 text-[var(--gold-bright)]" size={20} />
      <span className="text-3xl font-black tabular-nums text-[var(--foreground)]">{n}</span>
      <span className="mt-0.5 text-sm font-semibold">{label}</span>
      {sub && <span className="text-xs text-[var(--muted-foreground)]">{sub}</span>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="cia-card rounded-2xl p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">{title}</h3>
      {children}
    </article>
  )
}

export function AnaliseClient({ data }: { data: Data }) {
  const k = data.kpis
  const pmax = Math.max(...data.pipeline.map(p => p.n), 1)
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 md:py-8 lg:px-10">
      <PageHeader
        eyebrow="CIA 2026 · Pulso da Cobertura"
        title="Análise de Operação"
        subtitle="Raio-X da produção audiovisual ao vivo — dados consolidados do sistema"
        action={<Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><ArrowLeft size={16} /> Início</Link>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi n={k.conteudos} label="Conteúdos" sub="produzidos" icon={FileText} />
        <Kpi n={`${k.pctPub}%`} label="Publicados" sub={`${k.publicados} no ar`} icon={Activity} />
        <Kpi n={k.pessoas} label="Pessoas" sub={`${k.pessoasAtivas} ativas · ${k.empresas} empresas`} icon={Users} />
        <Kpi n={k.setores} label="Setores" sub={`${k.ytLives} com YouTube Live`} icon={MapPin} />
        <Kpi n={k.jogosEnc} label="Jogos cobertos" sub={`${k.evJogo} eventos`} icon={Clapperboard} />
        <Kpi n={k.push} label="Dispositivos" sub="com acesso" icon={Bell} />
      </div>

      {/* Produção de Conteúdo */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight"><FileText className="text-[var(--gold-bright)]" size={20} /> Produção de Conteúdo</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Por status"><Bars data={data.conteudoStatus} total={k.conteudos} /></Card>
          <Card title="Por canal de publicação"><Bars data={data.canais} /></Card>
          <Card title="Por formato"><Bars data={data.formatos} /></Card>
          <Card title="Pipeline de produção (concluídos)">
            <div className="space-y-2">
              {data.pipeline.map((p, i) => (
                <div key={p.nome} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm text-[var(--muted-foreground)]">{p.nome}</span>
                  <span className="flex h-8 items-center rounded-lg px-3 text-sm font-black text-white" style={{ width: `${Math.max(18, p.n / pmax * 100)}%`, background: ['#0891b2', '#9333ea', '#3d7a52'][i] }}>{p.n}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{k.patrocinados} conteúdos patrocinados · {k.pautas} pautas</p>
          </Card>
        </div>
      </section>

      {/* Equipe */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight"><Users className="text-[var(--gold-bright)]" size={20} /> Equipe de Cobertura</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Por papel (role)"><Bars data={data.roles} total={k.pessoas} /></Card>
          <Card title="Por função principal"><Bars data={data.funcoes} /></Card>
        </div>
      </section>

      {/* Setores & Escala */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight"><MapPin className="text-[var(--gold-bright)]" size={20} /> Setores & Escala</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Setores por tipo"><Bars data={data.setorTipos} total={k.setores} /></Card>
          <Card title="Turnos de mídia por função"><Bars data={data.turnoFuncoes} /></Card>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">{k.setores} setores mapeados · {k.escEsp} escalas esportivas · {k.turnos} turnos de mídia</p>
      </section>

      {/* Cobertura & Eventos */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight"><Megaphone className="text-[var(--gold-bright)]" size={20} /> Cobertura & Eventos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi n={k.jogosEnc} label="Jogos encerrados" icon={Clapperboard} />
          <Kpi n={k.evJogo} label="Eventos de jogo" icon={Activity} />
          <Kpi n={k.shows} label="Shows" icon={Megaphone} />
          <Kpi n={k.festas} label="Festas" icon={Megaphone} />
          <Kpi n={k.patroc} label="Patrocinadores" icon={Megaphone} />
          <Kpi n={k.escEsp} label="Escalas esportivas" icon={Users} />
        </div>
      </section>

      <p className="pb-6 text-center text-xs text-[var(--muted-foreground)]">Análise de Operação · atualiza ao vivo com o sistema · CIA 2026</p>
    </div>
  )
}
