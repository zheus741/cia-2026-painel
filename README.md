# CIA 2026 · Painel de Cobertura

Central de comando da cobertura ao vivo da **Copa Inter Atléticas 2026** — Uberaba/MG · 04–07 de junho.

> Sistema interno (não-público) que substitui o Notion como fonte da verdade da operação de cobertura: escala, kanban de conteúdo, dashboard de redes, escopo de patrocínio, briefings e mapa do evento.

---

## Stack

- **Next.js 16** (App Router · Turbopack default · React 19.2)
- **Supabase** (Postgres + Auth magic-link + Realtime + RLS)
- **Tailwind 4** + **shadcn/ui primitives** + **lucide-react**
- **TypeScript 5** · zod · date-fns

## Estrutura

```
src/
├── app/
│   ├── layout.tsx           shell global, fontes, metadata
│   ├── page.tsx             home (autenticada) com grid de módulos
│   ├── login/page.tsx       magic-link
│   ├── auth/callback/       OAuth code exchange
│   └── actions.ts           server actions (signOut)
├── lib/
│   ├── utils.ts             cn() helper
│   └── supabase/
│       ├── client.ts        client browser
│       ├── server.ts        client server (RSC + actions)
│       └── proxy.ts         updateSession do middleware
├── components/
│   ├── cia-logo.tsx
│   └── ui/{button,input,label}.tsx
└── proxy.ts                 Next.js 16 proxy (ex-middleware)

supabase/
├── migrations/
│   └── 0001_init.sql        schema completo + RLS + triggers
└── seed.sql                 edição CIA 2026, dias, setores,
                             modalidades, 32 atléticas, 8 pipelines
```

## Setup local

### 1. Variáveis de ambiente

`.env.local` já está configurado com URL e publishable key do projeto Supabase. Veja `.env.example` pra estrutura.

### 2. Aplicar a migration no Supabase

**Opção A — via dashboard (mais simples):**
1. Acesse [https://app.supabase.com](https://app.supabase.com) → seu projeto
2. **SQL Editor** → **New query**
3. Cole o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e rode
4. Repita com [`supabase/seed.sql`](supabase/seed.sql)

**Opção B — via Supabase CLI** *(quando o time crescer)*:
```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref qnbbhxlsxajzhrgvccxw
supabase db push
```

### 3. Configurar Auth (magic-link)

No dashboard Supabase:
- **Authentication → Providers → Email** → habilitado, com **Confirm email** desligado
- **URL Configuration**:
  - Site URL: `http://localhost:4242` (dev) — depois trocar pro domínio prod
  - Redirect URLs: adicione `http://localhost:4242/auth/callback` e o domínio prod

### 4. Rodar local

```bash
npm run dev   # http://localhost:4242
```

> O preview do Claude Code roda na porta **4242** (configurado em `.claude/launch.json` na raiz do workspace). Ajuste se rodar fora desse contexto.

## Roles e RLS

| Role | Permissões |
|---|---|
| `admin` | tudo |
| `coordenacao` | edita escala, conteúdo, escopo, configs |
| `lider_area` | edita conteúdo da própria área (foto/vídeo/social…) |
| `operador` | vê própria escala + atualiza estágios que é dono |

Novos usuários entram como **`operador`** automaticamente (trigger `handle_new_user`). Admin promove via tabela `profiles`.

Pra criar o **primeiro admin** depois do schema rodado:
```sql
-- no SQL Editor, depois de fazer login uma vez:
update profiles set role = 'admin' where email = 'seu@email.com';
```

## Modelo de dados (resumo)

23 tabelas em 7 grupos:

- **Acesso**: `profiles`
- **Estrutura**: `edicoes`, `dias_evento`, `setores`, `modalidades`, `equipes`, `jogos`, `shows`, `festas`
- **Patrocínio**: `patrocinadores`, `escopo_itens`
- **Operação**: `turnos`, `pipeline_templates`, `conteudos`, `estagios_conteudo`, `handoffs`
- **Inspiração**: `tags`, `referencias`, `referencia_tags`, `conteudo_referencias`
- **Pautas/Wiki**: `pautas`, `docs`
- **Suporte**: `clima_cache`

Detalhes em [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

## Próximos sprints

| Sprint | Entrega |
|---|---|
| 0 ✅ | Setup, schema, auth, layout base |
| 1 | Cadastros (edição/dias/setores/modalidades/equipes/shows + import CSV de jogos) |
| 2 | Pessoas + escala (grade + timeline + detector de conflito) |
| 3 | Kanban de conteúdo (pipeline configurável + handoffs + SLA) |
| 4 | Dashboard de redes + heatmap de carga + alertas |
| 5 | Patrocinador (escopo, agregação) + mapa + clima |
| 6 | Wiki (substitui Notion) + pautas/roaming |
| 7 | Banco de referências + IA leve (auto-tag, sugestão contextual) + bookmarklet |
| 8 | Polish, treino da equipe, deploy prod |

## Comandos

```bash
npm run dev      # dev server (Turbopack)
npm run build    # build prod (Turbopack)
npm run start    # serve build
npm run lint     # eslint
```

## Deploy

Vercel — apontar pro repo, definir as 2 variáveis de ambiente. Domínio padrão `cia-2026-painel.vercel.app`; custom (`painel.copainteratleticas.com.br`) configurável depois.
