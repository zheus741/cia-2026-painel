import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth/current-user'
import { ImportClient } from '@/app/admin/importar/ImportClient'
import { FileSpreadsheet } from 'lucide-react'

// Acessível a admin e coordenador_esportivo
export default async function ImportarEsportivoPage() {
  const profile = await requireProfile()
  if (!['admin', 'coordenador_esportivo'].includes(profile.role)) {
    redirect('/')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Automação Esportiva
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Importar Tabela de Jogos</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Envie o arquivo <span className="font-mono text-xs font-semibold">TABELAMENTO CIA</span> de cada dia.
          O sistema cria automaticamente as modalidades, setores e todos os jogos —
          já disponíveis no placar ao vivo e na agenda.
        </p>
      </div>

      <div className="cia-metric-card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
          Como funciona
        </p>
        <ol className="space-y-2 text-sm">
          {[
            'Arraste ou selecione o arquivo XLSX do dia correspondente.',
            'O sistema lê a data na célula A1 e localiza (ou cria) o dia do evento.',
            'Modalidades e setores novos são criados automaticamente.',
            'Todos os jogos são inseridos. Já aparecem no placar ao vivo e na agenda.',
            'Para corrigir uma tabela já importada, ative "Substituir jogos existentes".',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: 'var(--green)', color: '#fff' }}
              >
                {i + 1}
              </span>
              <span className="text-[var(--muted-foreground)]">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="cia-metric-card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
          Modalidades reconhecidas
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { code: 'FF/FM',   label: 'Futsal',          icon: '⚽' },
            { code: 'HM/HF',   label: 'Handebol',        icon: '🤾' },
            { code: 'VM/VF',   label: 'Vôlei',           icon: '🏐' },
            { code: 'BM/BF',   label: 'Basquete',        icon: '🏀' },
            { code: 'VPM/VPF', label: 'Vôlei de Praia',  icon: '🏖️' },
            { code: 'FC',      label: 'Futebol de Campo', icon: '🏟️' },
          ].map(({ code, label, icon }) => (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-xs"
            >
              <span>{icon}</span>
              <span className="font-medium">{label}</span>
              <span className="font-mono text-[10px] text-[var(--muted-foreground)]">{code}</span>
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--green)]" />
          <h2 className="text-base font-semibold">Enviar arquivo</h2>
        </div>
        <ImportClient />
      </div>
    </div>
  )
}
