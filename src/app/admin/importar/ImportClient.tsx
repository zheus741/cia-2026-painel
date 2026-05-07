'use client'

import * as React from 'react'
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, Trophy, MapPin, Calendar, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImportStats {
  date_str:            string
  dia_nome:            string
  jogos_novos:         number
  jogos_existentes:    number
  jogos_total:         number
  modalidades_criadas: number
  setores_criados:     number
  erros:               string[]
}

export function ImportClient() {
  const [file,      setFile]      = React.useState<File | null>(null)
  const [overwrite, setOverwrite] = React.useState(false)
  const [loading,   setLoading]   = React.useState(false)
  const [result,    setResult]    = React.useState<{ ok: boolean; stats?: ImportStats; error?: string } | null>(null)
  const [dragging,  setDragging]  = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function onFileChange(f: File | null) {
    if (!f) return
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      alert('Somente arquivos .xlsx ou .xls são aceitos.')
      return
    }
    setFile(f)
    setResult(null)
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('overwrite', overwrite ? 'true' : 'false')
      const res  = await fetch('/api/import-tabela', { method: 'POST', body: form })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ ok: false, error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null)
    setResult(null)
    setOverwrite(false)
  }

  return (
    <div className="space-y-6">

      {/* Drop zone */}
      <div
        className={cn(
          'relative cursor-pointer rounded-2xl border-2 border-dashed transition-all',
          dragging
            ? 'border-[var(--green)] bg-[var(--green)]/[0.06]'
            : file
              ? 'border-[var(--green)]/40 bg-[var(--green)]/[0.03]'
              : 'border-[var(--border)] hover:border-[var(--green)]/40 hover:bg-[var(--green)]/[0.02]',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false)
          onFileChange(e.dataTransfer.files[0] ?? null)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />

        <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
          {file ? (
            <>
              <FileSpreadsheet className="h-12 w-12 text-[var(--green)]" />
              <div>
                <p className="font-semibold text-[var(--foreground)]">{file.name}</p>
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                  {(file.size / 1024).toFixed(0)} KB · clique para trocar
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-[var(--muted-foreground)]" />
              <div>
                <p className="font-semibold">Arraste a tabela aqui</p>
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                  ou clique para selecionar · <span className="font-mono text-xs">.xlsx</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Options */}
      {file && !result && (
        <div className="cia-metric-card space-y-4 p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <div
              onClick={() => setOverwrite(v => !v)}
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition-colors flex items-center justify-center',
                overwrite
                  ? 'border-[var(--destructive)] bg-[var(--destructive)]'
                  : 'border-[var(--border)] hover:border-[var(--destructive)]/50',
              )}
            >
              {overwrite && <span className="text-[10px] font-bold text-white">✓</span>}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Substituir jogos existentes do dia
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Se marcado, <span className="font-semibold text-[var(--destructive)]">apaga todos os jogos</span> desse dia antes de importar.
                Use quando for corrigir uma tabela já importada.
                Por padrão, duplicatas são ignoradas.
              </p>
            </div>
          </label>

          <div className="flex gap-3">
            <Button
              size="sm"
              onClick={handleImport}
              disabled={loading}
              className="gap-2"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando…</>
                : <><Upload className="h-4 w-4" /> Importar</>
              }
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={cn(
          'cia-metric-card overflow-hidden',
          result.ok ? '' : 'border-red-200 bg-red-50',
        )}>
          {result.ok && result.stats ? (
            <>
              {/* Success header */}
              <div className="flex items-center gap-3 border-b border-[var(--border)] p-5">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--green)]" />
                <div>
                  <p className="font-bold text-[var(--foreground)]">Importação concluída</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {result.stats.dia_nome} · {result.stats.date_str}
                  </p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-4">
                {[
                  { icon: Trophy,   label: 'Jogos novos',    value: result.stats.jogos_novos,         color: 'text-[var(--green)]' },
                  { icon: Trophy,   label: 'Já existiam',    value: result.stats.jogos_existentes,    color: 'text-[var(--muted-foreground)]' },
                  { icon: Calendar, label: 'Modalidades',    value: result.stats.modalidades_criadas, color: 'text-blue-700' },
                  { icon: MapPin,   label: 'Setores novos',  value: result.stats.setores_criados,     color: 'text-purple-700' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex flex-col gap-1 p-4">
                    <Icon className={cn('h-4 w-4', color)} />
                    <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
                  </div>
                ))}
              </div>

              {/* Errors */}
              {result.stats.erros.length > 0 && (
                <div className="border-t border-[var(--border)] p-4">
                  <p className="mb-2 text-xs font-semibold text-orange-700">
                    {result.stats.erros.length} erro(s) durante importação:
                  </p>
                  {result.stats.erros.map((e, i) => (
                    <p key={i} className="text-xs text-orange-600 font-mono">{e}</p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 border-t border-[var(--border)] p-4">
                <Button size="sm" onClick={reset} variant="outline" className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Nova importação
                </Button>
                <a href="/admin/jogos">
                  <Button size="sm" variant="outline">Ver jogos →</Button>
                </a>
                <a href="/placar">
                  <Button size="sm" variant="outline">Placar ao vivo →</Button>
                </a>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-700">Erro na importação</p>
                <p className="mt-1 text-sm text-red-600">{result.error}</p>
                <Button size="sm" variant="outline" onClick={reset} className="mt-4">
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
