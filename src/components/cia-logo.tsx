import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CiaLogoProps {
  className?: string
  showText?: boolean
  size?: number
}

export function CiaLogo({ className, showText = true, size = 36 }: CiaLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/assets/logo.png"
        alt="CIA 2026"
        width={size}
        height={size}
        className="shrink-0 drop-shadow-sm"
        priority
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="font-bold tracking-widest text-sm"
            style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--gold)' }}
          >
            CIA 2026
          </span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Painel · Cobertura
          </span>
        </div>
      )}
    </div>
  )
}
