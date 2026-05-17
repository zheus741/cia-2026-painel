'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Check, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  previewImportJogos,
  confirmImportJogos,
  type ImportPreview,
  type ImportMapping,
} from './actions'

interface Dia { id: string; nome_dia: string; data: string }
interface Setor { id: string; nome: string }
interface Modalidade { id: string; nome: string }

interface Props {
  dias: Dia[]
  setores: Setor[]
  modalidades: Modalidade[]
}

// Códigos compactos das modalidades — aceita formato curto (FF, PM) e
// formato do XLSX oficial CIA 2026 (PETF, PETM, TCF, TMSF, etc).
const MOD_LABEL: Record<string, string> = {
  // Futsal · Futebol · Fut7
  FF: 'Futsal Feminino', FM: 'Futsal Masculino',
  FC: 'Futebol de Campo Masc', F7: 'Fut7 Masculino', F7M: 'Fut7 Masculino',
  // Vôlei
  VF: 'Vôlei Feminino', VM: 'Vôlei Masculino',
  VPF: 'Vôlei de Praia Fem', VPM: 'Vôlei de Praia Masc',
  // Peteca
  PF: 'Peteca Feminino', PM: 'Peteca Masculino',
  PETF: 'Peteca Feminino', PETM: 'Peteca Masculino',
  // Handebol
  HF: 'Handebol Feminino', HM: 'Handebol Masculino',
  // Basquete
  BF: 'Basquete Feminino', BM: 'Basquete Masculino',
  // ── Fase A: Tênis ──────────────────────────────────────────────────
  TCF: 'Tênis de Campo Fem', TCM: 'Tênis de Campo Masc',
  TMSF: 'Tênis de Mesa Fem', TMSM: 'Tênis de Mesa Masc',
  // Aliases curtos (caso a planilha venha com 2 letras)
  TF: 'Tênis de Campo Fem', TM: 'Tênis de Campo Masc',
}

const MOD_CATEGORIA: Record<string, string> = {
  FF: 'Feminino', FM: 'Masculino', FC: 'Masculino', F7: 'Masculino', F7M: 'Masculino',
  VF: 'Feminino', VM: 'Masculino', VPF: 'Feminino', VPM: 'Masculino',
  PF: 'Feminino', PM: 'Masculino', PETF: 'Feminino', PETM: 'Masculino',
  HF: 'Feminino', HM: 'Masculino',
  BF: 'Feminino', BM: 'Masculino',
  // Tênis
  TCF: 'Feminino', TCM: 'Masculino',
  TMSF: 'Feminino', TMSM: 'Masculino',
  TF: 'Feminino', TM: 'Masculino',
}

const MOD_SLUG: Record<string, string> = {
  FF: 'futsal', FM: 'futsal',
  FC: 'futebol', F7: 'fut7', F7M: 'fut7',
  VF: 'volei', VM: 'volei',
  VPF: 'volei-praia', VPM: 'volei-praia',
  PF: 'peteca', PM: 'peteca', PETF: 'peteca', PETM: 'peteca',
  HF: 'handebol', HM: 'handebol',
  BF: 'basquete', BM: 'basquete',
  // Tênis
  TCF: 'tenis-campo', TCM: 'tenis-campo',
  TMSF: 'tenis-mesa', TMSM: 'tenis-mesa',
  TF: 'tenis-campo', TM: 'tenis-campo',
}

type Step = 'upload' | 'mapping' | 'done'

export function ImportJogosDialog({ dias, setores, modalidades }: Props) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<Step>('upload')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<ImportPreview | null>(null)
  const [inserted, setInserted] = React.useState<number | null>(null)

  // mapping state
  const [modMap, setModMap] = React.useState<Record<string, string>>({})
  const [setorMap, setSetorMap] = React.useState<Record<string, string>>({})
  const [diaMap, setDiaMap] = React.useState<Record<string, string>>({})
  const [dataMap, setDataMap] = React.useState<Record<string, string>>({})

  function reset() {
    setStep('upload')
    setLoading(false)
    setError(null)
    setPreview(null)
    setInserted(null)
    setModMap({})
    setSetorMap({})
    setDiaMap({})
    setDataMap({})
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData(e.currentTarget)
      const res = await previewImportJogos(fd)
      if (!res.ok || !res.preview) { setError(res.error ?? 'Erro ao processar arquivo.'); return }

      const p = res.preview
      setPreview(p)

      // Auto-fill modality map by slug matching
      const autoMod: Record<string, string> = {}
      for (const mod of p.mods) {
        const slug = MOD_SLUG[mod.toUpperCase()]
        const found = modalidades.find((m) => m.nome.toLowerCase().includes(slug ?? mod.toLowerCase()))
        if (found) autoMod[mod] = found.id
      }
      setModMap(autoMod)

      // Auto-fill setor map by name partial match
      const autoSetor: Record<string, string> = {}
      for (const q of p.quadras) {
        const qLow = q.toLowerCase()
        const found = setores.find((s) =>
          s.nome.toLowerCase().split(/\s+/).some((w) => w.length > 3 && qLow.includes(w))
        )
        if (found) autoSetor[q] = found.id
      }
      setSetorMap(autoSetor)

      // Auto-fill dia map by position
      const autoDia: Record<string, string> = {}
      const autoData: Record<string, string> = {}
      p.dias.forEach((nome, i) => {
        if (dias[i]) {
          autoDia[nome] = dias[i].id
          autoData[nome] = dias[i].data
        }
      })
      setDiaMap(autoDia)
      setDataMap(autoData)

      setStep('mapping')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const mapping: ImportMapping = {
        modalidades: modMap,
        categorias: Object.fromEntries(
          preview.mods.map((m) => [m, MOD_CATEGORIA[m.toUpperCase()] ?? 'Masculino'])
        ),
        setores: setorMap,
        dias: diaMap,
        datas: dataMap,
      }
      const res = await confirmImportJogos(preview.rows, mapping)
      if (!res.ok) { setError(res.error ?? 'Erro ao importar.'); return }
      setInserted(res.data ?? preview.total)
      setStep('done')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { reset(); setOpen(true) }}>
        <Upload className="mr-1.5 h-4 w-4" />
        Importar tabela
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar tabela de jogos (xlsx)</DialogTitle>
          </DialogHeader>

          {step === 'upload' && (
            <form onSubmit={handleUpload} className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Envie o arquivo xlsx no formato do tabelamento oficial CIA.
                As abas "TABELAMENTO DIA X" serão lidas automaticamente.
              </p>
              <input
                name="file"
                type="file"
                accept=".xlsx,.xls"
                required
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[var(--primary)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
              {error && <p className="flex items-center gap-1.5 text-sm text-red-500"><AlertCircle className="h-4 w-4" />{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Processar arquivo
                </Button>
              </DialogFooter>
            </form>
          )}

          {step === 'mapping' && preview && (
            <div className="space-y-5">
              <div className="rounded-md border border-[var(--border)] bg-[var(--muted)]/50 px-4 py-3 text-sm space-y-1">
                <p>
                  <span className="font-semibold">{preview.total} jogos</span> encontrados em{' '}
                  <span className="font-semibold">{preview.dias.length} dia(s)</span>.
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Jogos existentes para os dias importados serão substituídos — re-envios são seguros.
                  Dias não presentes no arquivo permanecem intactos.
                </p>
              </div>

              {/* Modalidades */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Modalidades</p>
                <div className="grid grid-cols-2 gap-2">
                  {preview.mods.map((mod) => (
                    <div key={mod} className="flex items-center gap-2">
                      <Badge variant="secondary" className="w-10 justify-center font-mono text-xs">{mod}</Badge>
                      <span className="text-xs text-[var(--muted-foreground)] w-28 shrink-0">{MOD_LABEL[mod.toUpperCase()] ?? mod}</span>
                      <Select value={modMap[mod] ?? ''} onValueChange={(v) => setModMap((p) => ({ ...p, [mod]: v }))}>
                        <SelectTrigger className="h-9 text-xs flex-1">
                          <SelectValue placeholder="— modalidade —" />
                        </SelectTrigger>
                        <SelectContent>
                          {modalidades.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dias */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Dias do evento</p>
                <div className="space-y-2">
                  {preview.dias.map((nome) => (
                    <div key={nome} className="flex items-center gap-2">
                      <span className="text-xs truncate w-48 shrink-0">{nome}</span>
                      <Select value={diaMap[nome] ?? ''} onValueChange={(v) => {
                        const d = dias.find((d) => d.id === v)
                        setDiaMap((p) => ({ ...p, [nome]: v }))
                        setDataMap((p) => ({ ...p, [nome]: d?.data ?? '' }))
                      }}>
                        <SelectTrigger className="h-9 text-xs flex-1">
                          <SelectValue placeholder="— dia —" />
                        </SelectTrigger>
                        <SelectContent>
                          {dias.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome_dia} · {d.data}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quadras */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Quadras / Setores</p>
                <div className="space-y-2">
                  {preview.quadras.map((q) => (
                    <div key={q} className="flex items-center gap-2">
                      <span className="text-xs truncate w-48 shrink-0">{q}</span>
                      <Select value={setorMap[q] ?? ''} onValueChange={(v) => setSetorMap((p) => ({ ...p, [q]: v }))}>
                        <SelectTrigger className="h-9 text-xs flex-1">
                          <SelectValue placeholder="— setor (opcional) —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem setor</SelectItem>
                          {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="flex items-center gap-1.5 text-sm text-red-500"><AlertCircle className="h-4 w-4" />{error}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
                <Button onClick={handleConfirm} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar {preview.total} jogos
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check className="h-6 w-6" />
              </div>
              <p className="text-center text-sm">
                <span className="font-semibold">{inserted} jogos</span> importados com sucesso.
              </p>
              <Button onClick={() => { reset(); setOpen(false) }}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
