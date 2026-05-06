-- =========================================================================
-- CIA 2026 — Seed completo
-- Edição · Dias · Setores (com coords) · Modalidades · Pipeline templates
-- =========================================================================

-- ── Edição ────────────────────────────────────────────────────────────────────
insert into edicoes (id, nome, ano, cidade, data_inicio, data_fim, ativa)
values ('00000000-0000-0000-0000-000000000001', 'CIA 2026', 2026, 'Uberaba', '2026-06-04', '2026-06-07', true)
on conflict (id) do nothing;

-- ── Dias ──────────────────────────────────────────────────────────────────────
insert into dias_evento (id, edicao_id, data, nome_dia, tema) values
  ('00000000-0000-0001-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-04', 'Quinta',  'Abertura CIA 2026'),
  ('00000000-0000-0001-0000-000000000002', '00000000-0000-0000-0000-000000000001', '2026-06-05', 'Sexta',   'Semifinais'),
  ('00000000-0000-0001-0000-000000000003', '00000000-0000-0000-0000-000000000001', '2026-06-06', 'Sábado',  'Finals Day'),
  ('00000000-0000-0001-0000-000000000004', '00000000-0000-0000-0000-000000000001', '2026-06-07', 'Domingo', 'Grande Final CIA')
on conflict (edicao_id, data) do nothing;

-- ── Setores (inclui coords — migration 0003 vira no-op idempotente) ───────────
insert into setores (id, edicao_id, nome, tipo, lat, lng, endereco, capacidade_pessoas, cor_hex) values
  ('00000000-0000-0002-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'SESI Clube',      'esportivo', -19.7566, -47.9421, 'Av. Guilherme Ferreira, Uberaba/MG', 1200, '#4a8a5c'),
  ('00000000-0000-0002-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'UTC',             'esportivo', -19.7338, -47.9155, 'Uberaba/MG',                          800, '#4a8a5c'),
  ('00000000-0000-0002-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Palco Principal', 'palco',     -19.7639, -47.9365, 'Centro de Eventos, Uberaba/MG',      5000, '#c8973a'),
  ('00000000-0000-0002-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Palco Eletrônico','palco',     -19.7642, -47.9368, 'Centro de Eventos, Uberaba/MG',      3000, '#c8973a'),
  ('00000000-0000-0002-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Palco 360°',      'palco',     -19.7637, -47.9362, 'Centro de Eventos, Uberaba/MG',      2000, '#c8973a'),
  ('00000000-0000-0002-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Área de Festa',   'festa',     -19.7644, -47.9360, 'Centro de Eventos, Uberaba/MG',      4000, '#ec4899'),
  ('00000000-0000-0002-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   'Camarotes',       'apoio',     -19.7648, -47.9355, 'Centro de Eventos, Uberaba/MG',      null, '#64748b'),
  ('00000000-0000-0002-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   'Base da Equipe',  'apoio',     -19.7633, -47.9370, 'Centro de Eventos, Uberaba/MG',      null, '#64748b')
on conflict (id) do nothing;

-- ── Modalidades ───────────────────────────────────────────────────────────────
insert into modalidades (id, edicao_id, nome, slug, icone, categorias, setor_principal_id) values
  ('00000000-0000-0003-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Futsal',          'futsal',         '⚽', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000001'),
  ('00000000-0000-0003-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Futebol de Campo','futebol',        '🏟️', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000001'),
  ('00000000-0000-0003-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Futebol Society', 'futebol-society','⚽', array['Masculino'],            '00000000-0000-0002-0000-000000000001'),
  ('00000000-0000-0003-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Vôlei',           'volei',          '🏐', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000002'),
  ('00000000-0000-0003-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Basquete',        'basquete',       '🏀', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000002'),
  ('00000000-0000-0003-0000-000000000006', '00000000-0000-0000-0000-000000000001',
   'Handebol',        'handebol',       '🤾', array['Masculino','Feminino'], '00000000-0000-0002-0000-000000000002'),
  ('00000000-0000-0003-0000-000000000007', '00000000-0000-0000-0000-000000000001',
   'Natação',         'natacao',        '🏊', array['Masculino','Feminino'], null),
  ('00000000-0000-0003-0000-000000000008', '00000000-0000-0000-0000-000000000001',
   'Atletismo',       'atletismo',      '🏃', array['Masculino','Feminino'], null),
  ('00000000-0000-0003-0000-000000000009', '00000000-0000-0000-0000-000000000001',
   'Tênis de Mesa',   'tenis-mesa',     '🏓', array['Masculino','Feminino'], null),
  ('00000000-0000-0003-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'Cheer',           'cheer',          '📣', array[]::text[],              null),
  ('00000000-0000-0003-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   'Bateria',         'bateria',        '🥁', array[]::text[],              null),
  ('00000000-0000-0003-0000-000000000012', '00000000-0000-0000-0000-000000000001',
   'Xadrez',          'xadrez',         '♟️', array['Masculino','Feminino'], null)
on conflict (edicao_id, slug) do nothing;

-- ── Pipeline templates ────────────────────────────────────────────────────────
insert into pipeline_templates (id, nome, tipo_conteudo, patrocinado, estagios, sla_por_estagio) values
  ('00000000-0000-0004-0000-000000000001',
   'Story Rápido', 'story_rapido', false,
   array['captura','publicacao']::tipo_estagio[],
   '{"captura": 0, "publicacao": 0}'::jsonb),

  ('00000000-0000-0004-0000-000000000002',
   'Story Editado', 'story_rapido', false,
   array['captura','edicao_foto','redacao','publicacao']::tipo_estagio[],
   '{"captura": 0, "edicao_foto": 15, "redacao": 10, "publicacao": 0}'::jsonb),

  ('00000000-0000-0004-0000-000000000003',
   'Reels', 'reels', false,
   array['captura','edicao_video','redacao','aprovacao_coord','publicacao']::tipo_estagio[],
   '{"captura": 0, "edicao_video": 60, "redacao": 15, "aprovacao_coord": 15, "publicacao": 0}'::jsonb),

  ('00000000-0000-0004-0000-000000000004',
   'Card Feed', 'card_feed', false,
   array['captura','edicao_foto','design_arte','redacao','aprovacao_coord','publicacao']::tipo_estagio[],
   '{"captura": 0, "edicao_foto": 20, "design_arte": 30, "redacao": 10, "aprovacao_coord": 10, "publicacao": 0}'::jsonb),

  ('00000000-0000-0004-0000-000000000005',
   'Card Patrocinado', 'card_patrocinado', true,
   array['captura','edicao_foto','design_arte','redacao','aprovacao_coord','aprovacao_patro','publicacao']::tipo_estagio[],
   '{"captura": 0, "edicao_foto": 20, "design_arte": 30, "redacao": 10, "aprovacao_coord": 10, "aprovacao_patro": 20, "publicacao": 0}'::jsonb),

  ('00000000-0000-0004-0000-000000000006',
   'Cobertura Ao Vivo', 'cobertura_ao_vivo', false,
   array['captura','publicacao']::tipo_estagio[],
   '{"captura": 0, "publicacao": 0}'::jsonb),

  ('00000000-0000-0004-0000-000000000007',
   'Texto / Legenda', 'texto_legenda', false,
   array['pesquisa','redacao','aprovacao_coord','publicacao']::tipo_estagio[],
   '{"pesquisa": 10, "redacao": 20, "aprovacao_coord": 10, "publicacao": 0}'::jsonb)
on conflict (id) do nothing;

-- ── Tags base ─────────────────────────────────────────────────────────────────
insert into tags (nome, slug, categoria, cor_hex) values
  ('Esportes',      'esportes',       'tema',     '#4a8a5c'),
  ('Shows',         'shows',          'tema',     '#c8973a'),
  ('Festas',        'festas',         'tema',     '#ec4899'),
  ('Bastidores',    'bastidores',     'tema',     '#64748b'),
  ('Abertura',      'abertura',       'tema',     '#c8973a'),
  ('Final',         'final',          'tema',     '#e8b94f'),
  ('Quinta',        'quinta',         'dia',      '#4a8a5c'),
  ('Sexta',         'sexta',          'dia',      '#4a8a5c'),
  ('Sábado',        'sabado',         'dia',      '#4a8a5c'),
  ('Domingo',       'domingo',        'dia',      '#4a8a5c'),
  ('Patrocinado',   'patrocinado',    'patrocinio','#c8973a'),
  ('Urgente',       'urgente',        'vibe',     '#dc2626'),
  ('Moodboard',     'moodboard',      'vibe',     '#8b3a2a')
on conflict (slug, categoria) do nothing;
