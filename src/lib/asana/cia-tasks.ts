/**
 * Asana — Copa Inter Atléticas
 * Fetch server-side com cache de 5 min (revalidate 300s).
 * Workspace: exp.rec.br (1155809898842124)
 * Projeto:   Copa Inter Atléticas (1166266970873585)
 */

const PAT      = process.env.ASANA_PAT
const WS_GID   = process.env.ASANA_WORKSPACE_GID  ?? '1155809898842124'
const PROJ_GID = process.env.ASANA_CIA_PROJECT_GID ?? '1166266970873585'

export interface AsanaTask {
  gid:      string
  name:     string
  due_on:   string | null
  assignee: { gid: string; name: string } | null
}

export interface AsanaCIAData {
  /** Contagens direto da API do projeto */
  total:      number
  completed:  number
  incomplete: number
  /** Vencidas recentes (jan/2026 → ontem) */
  overdue:    AsanaTask[]
  /** Vencendo hoje */
  today:      AsanaTask[]
  /** Dias do evento 04-07/jun — agrupados */
  eventDays:  { date: string; label: string; count: number; tasks: AsanaTask[] }[]
}

async function asanaGet(path: string, params: Record<string, string> = {}): Promise<unknown> {
  if (!PAT) return null
  const url = new URL(`https://app.asana.com/api/1.0${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${PAT}`, Accept: 'application/json' },
    // cache 5 min — todas as rotas que chamam esto devem ter revalidate <= 300
    next: { revalidate: 300 },
  })
  if (!res.ok) return null
  return res.json()
}

function todaySP(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

const EVENT_DAYS = [
  { date: '2026-06-04', label: 'Qui 04' },
  { date: '2026-06-05', label: 'Sex 05' },
  { date: '2026-06-06', label: 'Sáb 06' },
  { date: '2026-06-07', label: 'Dom 07' },
]

const OPT_FIELDS = 'gid,name,due_on,assignee.gid,assignee.name'

export async function fetchCIAAsanaData(): Promise<AsanaCIAData | null> {
  if (!PAT) return null

  const today = todaySP()

  // Requests em paralelo
  const [projRes, overdueRes, todayRes, eventRes] = await Promise.all([
    // Contagens do projeto
    asanaGet(`/projects/${PROJ_GID}`, { opt_fields: 'task_counts' }),

    // Vencidas (jan/2026 → ontem)
    asanaGet(`/workspaces/${WS_GID}/tasks/search`, {
      'projects.any':  PROJ_GID,
      completed:       'false',
      'due_on.after':  '2025-12-31',
      'due_on.before': today,
      opt_fields:      OPT_FIELDS,
      limit:           '100',
    }),

    // Hoje
    asanaGet(`/workspaces/${WS_GID}/tasks/search`, {
      'projects.any': PROJ_GID,
      completed:      'false',
      due_on:         today,
      opt_fields:     OPT_FIELDS,
      limit:          '100',
    }),

    // Dias do evento (04-07/jun)
    asanaGet(`/workspaces/${WS_GID}/tasks/search`, {
      'projects.any':  PROJ_GID,
      completed:       'false',
      'due_on.after':  '2026-06-03',
      'due_on.before': '2026-06-08',
      opt_fields:      OPT_FIELDS,
      limit:           '100',
    }),
  ])

  // Extrai task_counts
  const counts = (projRes as { data?: { task_counts?: { num_tasks: number; num_completed_tasks: number; num_incomplete_tasks: number } } } | null)
    ?.data?.task_counts

  const overdue = ((overdueRes as { data?: AsanaTask[] } | null)?.data ?? []).filter(t => t.name.trim())
  const today_  = ((todayRes  as { data?: AsanaTask[] } | null)?.data ?? []).filter(t => t.name.trim())
  const event   = ((eventRes  as { data?: AsanaTask[] } | null)?.data ?? []).filter(t => t.name.trim())

  // Agrupa por dia do evento
  const eventDays = EVENT_DAYS.map(d => {
    const tasks = event.filter(t => t.due_on === d.date)
    return { ...d, count: tasks.length, tasks }
  })

  return {
    total:      counts?.num_tasks              ?? 0,
    completed:  counts?.num_completed_tasks    ?? 0,
    incomplete: counts?.num_incomplete_tasks   ?? 0,
    overdue,
    today:      today_,
    eventDays,
  }
}
