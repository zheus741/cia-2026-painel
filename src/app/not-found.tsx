import Link from 'next/link'
import { Compass, Home, Camera, Trophy, Lightbulb } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
      {/* Numerão 404 */}
      <div
        className="relative mb-2 select-none font-extrabold leading-none tracking-[-0.06em]"
        style={{
          fontSize: 'clamp(96px, 16vw, 180px)',
          color: 'transparent',
          backgroundImage:
            'linear-gradient(135deg, var(--green), var(--green-bright), var(--gold))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        }}
      >
        404
      </div>

      <p
        className="text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--accent)' }}
      >
        Fora de campo
      </p>
      <h1
        className="mt-1 max-w-md text-center text-2xl font-extrabold tracking-tight md:text-3xl"
        style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}
      >
        Essa página entrou em W.O.
      </h1>
      <p
        className="mt-3 max-w-sm text-center text-sm leading-relaxed"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Saiu de campo sem avisar, mudou de nome ou nunca existiu. Acontece —
        até na Copa Inter Atléticas. Usa um dos atalhos abaixo pra voltar pra
        transmissão.
      </p>

      <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-2 md:grid-cols-4">
        <ShortcutCard icon={Home}      label="Início"    href="/" />
        <ShortcutCard icon={Camera}    label="Conteúdos" href="/conteudos" />
        <ShortcutCard icon={Trophy}    label="Esportivo" href="/esportivo" />
        <ShortcutCard icon={Lightbulb} label="Pautas"    href="/pautas" />
      </div>

      <p
        className="mt-8 inline-flex items-center gap-1.5 text-[11px]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <Compass className="h-3 w-3" aria-hidden="true" />
        O menu no topo tem todas as seções — o árbitro confirma
      </p>
    </div>
  )
}

function ShortcutCard({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 transition-all"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--card)',
        textDecoration: 'none',
        color: 'var(--muted-foreground)',
      }}
    >
      <Icon
        className="h-4 w-4 transition-colors group-hover:text-[var(--green-bright)]"
        aria-hidden
      />
      <span className="text-[11px] font-semibold transition-colors group-hover:text-[var(--foreground)]">
        {label}
      </span>
    </Link>
  )
}
