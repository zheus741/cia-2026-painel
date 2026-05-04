import { cn } from '@/lib/utils'

interface CiaLogoProps {
  className?: string
  showText?: boolean
}

export function CiaLogo({ className, showText = true }: CiaLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 shrink-0"
      >
        <path
          d="M16 2 L19.5 12.5 L30 12.5 L21.5 19.5 L25 30 L16 23 L7 30 L10.5 19.5 L2 12.5 L12.5 12.5 Z"
          fill="var(--gold)"
          stroke="var(--gold-dark)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight">CIA 2026</span>
          <span className="text-[10px] text-[var(--muted-foreground)] tracking-wider uppercase">
            Painel · Cobertura
          </span>
        </div>
      )}
    </div>
  )
}
