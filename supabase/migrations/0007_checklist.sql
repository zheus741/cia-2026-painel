-- =========================================================================
-- CIA 2026 — Sistema de Checklist Operacional
-- Um checklist por evento (jogo/show/festa/ativação), preenchido em campo
-- =========================================================================

-- ── ENUMS ────────────────────────────────────────────────────────────────────

create type tipo_checklist as enum (
  'jogo',
  'show',
  'festa',
  'ativacao_patrocinador'
);

create type status_checklist_item as enum (
  'pendente',
  'feito',
  'nao_aplica'
);

-- ── TEMPLATES ─────────────────────────────────────────────────────────────────
-- Define as listas padrão de itens por tipo de evento

create table checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  edicao_id uuid references edicoes(id) on delete cascade,  -- null = global
  nome text not null,
  tipo tipo_checklist not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index idx_ck_templates_tipo on checklist_templates(tipo);

create table checklist_template_itens (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  label text not null,
  obrigatorio boolean not null default true,
  funcao_requerida funcao_equipe,        -- null = qualquer funcao pode marcar
  canal canal_publicacao,                -- se o item é postar em canal específico
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create index idx_ck_template_itens_template on checklist_template_itens(template_id);

-- ── INSTÂNCIAS ───────────────────────────────────────────────────────────────
-- Uma instância = checklist concreto para um evento específico

create table checklist_instancias (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references checklist_templates(id),
  edicao_id uuid not null references edicoes(id) on delete cascade,
  dia_id uuid references dias_evento(id),
  -- vínculo do evento (apenas um deve ser preenchido)
  jogo_id uuid references jogos(id),
  show_id uuid references shows(id),
  festa_id uuid references festas(id),
  patrocinador_id uuid references patrocinadores(id),
  -- meta
  nome_override text,                   -- se quiser sobrescrever o nome gerado
  responsavel_id uuid references profiles(id),
  criado_em timestamptz not null default now(),
  -- garante no máximo uma instância do mesmo template por evento
  constraint ck_instancia_um_vinculo check (
    (jogo_id is not null)::int +
    (show_id is not null)::int +
    (festa_id is not null)::int +
    (patrocinador_id is not null)::int <= 1
  )
);

create index idx_ck_instancias_jogo on checklist_instancias(jogo_id);
create index idx_ck_instancias_show on checklist_instancias(show_id);
create index idx_ck_instancias_festa on checklist_instancias(festa_id);
create index idx_ck_instancias_patrocinador on checklist_instancias(patrocinador_id);
create index idx_ck_instancias_dia on checklist_instancias(dia_id);

-- ── ITENS DE INSTÂNCIA ────────────────────────────────────────────────────────
-- Os itens reais que o operador marca em campo

create table checklist_itens (
  id uuid primary key default uuid_generate_v4(),
  instancia_id uuid not null references checklist_instancias(id) on delete cascade,
  template_item_id uuid references checklist_template_itens(id),
  label text not null,                  -- copiado do template item (imutável)
  obrigatorio boolean not null default true,
  ordem integer not null default 0,
  status status_checklist_item not null default 'pendente',
  operador_id uuid references profiles(id),
  feito_em timestamptz,
  link_post text,                       -- URL do post (stories, reels, etc.)
  observacao text,
  criado_em timestamptz not null default now()
);

create index idx_ck_itens_instancia on checklist_itens(instancia_id);
create index idx_ck_itens_operador on checklist_itens(operador_id);
create index idx_ck_itens_status on checklist_itens(status);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table checklist_templates enable row level security;
alter table checklist_template_itens enable row level security;
alter table checklist_instancias enable row level security;
alter table checklist_itens enable row level security;

-- leitura: qualquer autenticado
create policy "checklist_templates: ler autenticado"
  on checklist_templates for select to authenticated using (true);
create policy "checklist_template_itens: ler autenticado"
  on checklist_template_itens for select to authenticated using (true);
create policy "checklist_instancias: ler autenticado"
  on checklist_instancias for select to authenticated using (true);
create policy "checklist_itens: ler autenticado"
  on checklist_itens for select to authenticated using (true);

-- escrita templates/instâncias: coord+admin
create policy "checklist_templates: write coord+"
  on checklist_templates for all to authenticated
  using (is_coord_or_admin()) with check (is_coord_or_admin());
create policy "checklist_template_itens: write coord+"
  on checklist_template_itens for all to authenticated
  using (is_coord_or_admin()) with check (is_coord_or_admin());
create policy "checklist_instancias: write coord+"
  on checklist_instancias for all to authenticated
  using (is_coord_or_admin()) with check (is_coord_or_admin());

-- itens: qualquer autenticado pode marcar (operador em campo)
create policy "checklist_itens: insert autenticado"
  on checklist_itens for insert to authenticated with check (true);
create policy "checklist_itens: update próprio ou coord+"
  on checklist_itens for update to authenticated
  using (operador_id = auth.uid() or is_coord_or_admin())
  with check (operador_id = auth.uid() or is_coord_or_admin());
create policy "checklist_itens: delete coord+"
  on checklist_itens for delete to authenticated
  using (is_coord_or_admin());

-- ── FUNÇÃO: instanciar checklist ──────────────────────────────────────────────
-- Cria itens concretos a partir do template

create or replace function instanciar_checklist(p_instancia_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into checklist_itens (instancia_id, template_item_id, label, obrigatorio, ordem)
  select
    p_instancia_id,
    ti.id,
    ti.label,
    ti.obrigatorio,
    ti.ordem
  from checklist_instancias ci
  join checklist_template_itens ti on ti.template_id = ci.template_id
  where ci.id = p_instancia_id
  order by ti.ordem;
end;
$$;

-- ── SEED: Templates padrão CIA 2026 ──────────────────────────────────────────

-- Template IDs fixos para FK em seeds futuros
-- jogo:               00000000-0000-0007-0000-000000000001
-- show:               00000000-0000-0007-0000-000000000002
-- festa:              00000000-0000-0007-0000-000000000003
-- ativacao_patr:      00000000-0000-0007-0000-000000000004

insert into checklist_templates (id, edicao_id, nome, tipo) values
  ('00000000-0000-0007-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Cobertura de Jogo', 'jogo'),
  ('00000000-0000-0007-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Cobertura de Show', 'show'),
  ('00000000-0000-0007-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Cobertura de Festa', 'festa'),
  ('00000000-0000-0007-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'Ativação de Patrocinador', 'ativacao_patrocinador')
on conflict (id) do nothing;

-- ── Itens: Jogo ───────────────────────────────────────────────────────────────
insert into checklist_template_itens (template_id, label, obrigatorio, funcao_requerida, canal, ordem) values
  ('00000000-0000-0007-0000-000000000001', 'Chegada ao local confirmada',               true,  null,          null,                     1),
  ('00000000-0000-0007-0000-000000000001', 'Foto de aquecimento / warm-up postada',     true,  'foto',        'instagram_stories',      2),
  ('00000000-0000-0007-0000-000000000001', 'Story de abertura do jogo publicado',       true,  null,          'instagram_stories',      3),
  ('00000000-0000-0007-0000-000000000001', 'Cobertura ao vivo ativa (stories rodando)', true,  null,          'instagram_stories',      4),
  ('00000000-0000-0007-0000-000000000001', 'Momento decisivo registrado (foto/vídeo)', true,  'foto',        null,                     5),
  ('00000000-0000-0007-0000-000000000001', 'Resultado postado nos stories',             true,  null,          'instagram_stories',      6),
  ('00000000-0000-0007-0000-000000000001', 'Resultado postado no feed (card)',          true,  'social',      'instagram_feed',         7),
  ('00000000-0000-0007-0000-000000000001', 'Reels do jogo publicado',                  false, 'editor',      'instagram_reels',        8),
  ('00000000-0000-0007-0000-000000000001', 'TikTok do jogo publicado',                 false, 'editor',      'tiktok',                 9);

-- ── Itens: Show ───────────────────────────────────────────────────────────────
insert into checklist_template_itens (template_id, label, obrigatorio, funcao_requerida, canal, ordem) values
  ('00000000-0000-0007-0000-000000000002', 'Chegada ao palco confirmada',               true,  null,          null,                     1),
  ('00000000-0000-0007-0000-000000000002', 'Story de abertura / soundcheck publicado', true,  null,          'instagram_stories',      2),
  ('00000000-0000-0007-0000-000000000002', 'Cobertura ao vivo ativa (stories)',         true,  null,          'instagram_stories',      3),
  ('00000000-0000-0007-0000-000000000002', 'Foto/vídeo do ápice do show capturada',    true,  'foto',        null,                     4),
  ('00000000-0000-0007-0000-000000000002', 'Encerramento do show registrado',           true,  null,          'instagram_stories',      5),
  ('00000000-0000-0007-0000-000000000002', 'Post de feed (foto) publicado',             true,  'social',      'instagram_feed',         6),
  ('00000000-0000-0007-0000-000000000002', 'Reels do show publicado',                  false, 'editor',      'instagram_reels',        7),
  ('00000000-0000-0007-0000-000000000002', 'TikTok do show publicado',                 false, 'editor',      'tiktok',                 8);

-- ── Itens: Festa ──────────────────────────────────────────────────────────────
insert into checklist_template_itens (template_id, label, obrigatorio, funcao_requerida, canal, ordem) values
  ('00000000-0000-0007-0000-000000000003', 'Chegada ao espaço confirmada',              true,  null,          null,                     1),
  ('00000000-0000-0007-0000-000000000003', 'Story de abertura da festa publicado',      true,  null,          'instagram_stories',      2),
  ('00000000-0000-0007-0000-000000000003', 'Cobertura roaming ativa (stories)',         true,  'roaming',     'instagram_stories',      3),
  ('00000000-0000-0007-0000-000000000003', 'Foto principal da festa capturada',         true,  'foto',        null,                     4),
  ('00000000-0000-0007-0000-000000000003', 'Clipe curto / boomerang publicado',         false, null,          'instagram_stories',      5),
  ('00000000-0000-0007-0000-000000000003', 'Post de feed da festa publicado',           true,  'social',      'instagram_feed',         6),
  ('00000000-0000-0007-0000-000000000003', 'Reels da festa publicado',                  false, 'editor',      'instagram_reels',        7),
  ('00000000-0000-0007-0000-000000000003', 'Story de encerramento publicado',           true,  null,          'instagram_stories',      8);

-- ── Itens: Ativação Patrocinador ──────────────────────────────────────────────
insert into checklist_template_itens (template_id, label, obrigatorio, funcao_requerida, canal, ordem) values
  ('00000000-0000-0007-0000-000000000004', 'Briefing da ativação recebido e lido',      true,  null,          null,                     1),
  ('00000000-0000-0007-0000-000000000004', 'Material de marca confirmado (logo/arte)',  true,  'design',      null,                     2),
  ('00000000-0000-0007-0000-000000000004', 'Equipe no ponto de ativação',               true,  null,          null,                     3),
  ('00000000-0000-0007-0000-000000000004', 'Story de ativação publicado',               true,  null,          'instagram_stories',      4),
  ('00000000-0000-0007-0000-000000000004', 'Menção à marca confirmada nos stories',     true,  'social',      'instagram_stories',      5),
  ('00000000-0000-0007-0000-000000000004', 'Foto da ação publicada no feed',            true,  'social',      'instagram_feed',         6),
  ('00000000-0000-0007-0000-000000000004', 'Card patrocinado publicado',                false, 'design',      'instagram_feed',         7),
  ('00000000-0000-0007-0000-000000000004', 'Reels da ativação publicado',               false, 'editor',      'instagram_reels',        8),
  ('00000000-0000-0007-0000-000000000004', 'Links dos posts enviados para relatório',   true,  'coordenacao', null,                     9);
