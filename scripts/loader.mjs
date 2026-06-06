// Loader p/ rodar módulos do app (Next) no node --experimental-strip-types:
//  • resolve alias  @/x        → src/x
//  • resolve import relativo sem extensão → tenta .ts/.tsx/.mts/.js
//  • stub  'server-only'             → módulo vazio
//  • stub  '@/lib/supabase/server'   → createClient que lança se chamado
//    (nunca é chamado: sempre passamos dbOverride / service client)
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SRC_BASE = new URL('../src/', import.meta.url)
const EXTS = ['.ts', '.tsx', '.mts', '.js', '.mjs']

async function isFile(url) {
  try { return (await stat(fileURLToPath(url))).isFile() } catch { return false }
}
async function resolveFile(baseUrl) {
  if (await isFile(baseUrl)) return baseUrl
  for (const e of EXTS) { const u = new URL(baseUrl.href + e); if (await isFile(u)) return u }
  for (const e of EXTS) { const u = new URL(baseUrl.href.replace(/\/?$/, '/') + 'index' + e); if (await isFile(u)) return u }
  return null
}

const STUB_EMPTY = 'data:text/javascript,export {}'
const STUB_SERVER = 'data:text/javascript,export function createClient(){throw new Error("createClient() chamado no CLI — use dbOverride")}'

export async function resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: STUB_EMPTY, shortCircuit: true }
  if (specifier === '@/lib/supabase/server') return { url: STUB_SERVER, shortCircuit: true }

  let base = null
  if (specifier.startsWith('@/')) base = new URL(specifier.slice(2), SRC_BASE)
  else if (specifier.startsWith('./') || specifier.startsWith('../')) base = new URL(specifier, context.parentURL)
  if (base) {
    const r = await resolveFile(base)
    if (r) return { url: r.href, shortCircuit: true }
  }
  return next(specifier, context)
}
