-- Seed inicial: edição CIA 2026 + dias + setores + modalidades + equipes + shows
-- Rodar depois da migration 0001_init

-- ============= EDIÇÃO =============
insert into edicoes (id, nome, ano, cidade, data_inicio, data_fim, ativa)
values ('00000000-0000-0000-0000-000000000001', 'CIA 2026', 2026, 'Uberaba', '2026-06-04', '2026-06-07', true)
on conflict (id) do nothing;

-- ============= DIAS =============
insert into dias_evento (edicao_id, data, nome_dia, tema) values
  ('00000000-0000-0000-0000-000000000001', '2026-06-04', 'Quinta', 'Copa do Mundo'),
  ('00000000-0000-0000-0000-000000000001', '2026-06-05', 'Sexta',  'Festa do Pijama'),
  ('00000000-0000-0000-0000-000000000001', '2026-06-06', 'Sábado', 'Festa a Fantasia'),
  ('00000000-0000-0000-0000-000000000001', '2026-06-07', 'Domingo','Arena das Campeãs')
on conflict do nothing;

-- ============= SETORES =============
insert into setores (edicao_id, nome, tipo, cor_hex) values
  ('00000000-0000-0000-0000-000000000001', 'SESI Clube',          'esportivo', '#5fb446'),
  ('00000000-0000-0000-0000-000000000001', 'UTC',                 'esportivo', '#5fb446'),
  ('00000000-0000-0000-0000-000000000001', 'Palco Principal',     'palco',     '#d7c69d'),
  ('00000000-0000-0000-0000-000000000001', 'Palco Eletrônico',    'palco',     '#c07adb'),
  ('00000000-0000-0000-0000-000000000001', 'Palco 360°',          'palco',     '#f59e0b'),
  ('00000000-0000-0000-0000-000000000001', 'Área de Festa',       'festa',     '#ec4899'),
  ('00000000-0000-0000-0000-000000000001', 'Camarotes',           'apoio',     '#94a3b8'),
  ('00000000-0000-0000-0000-000000000001', 'Base da Equipe',      'apoio',     '#64748b')
on conflict do nothing;

-- ============= MODALIDADES =============
insert into modalidades (edicao_id, nome, slug, icone, categorias, divisoes) values
  ('00000000-0000-0000-0000-000000000001', 'Basquete',         'basquete',     '🏀', '{Masculino,Feminino}', '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Vôlei',            'volei',        '🏐', '{Masculino,Feminino}', '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Peteca',           'peteca',       '🏸', '{Masculino,Feminino}', '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Futsal',           'futsal',       '⚽', '{Masculino,Feminino}', '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Handebol',         'handebol',     '🤾', '{Masculino,Feminino}', '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Vôlei de Praia',   'volei-praia',  '🏖️', '{Masculino,Feminino}', '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Futebol de Campo', 'futebol',      '🥅', '{Masculino}',          '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Fut7',             'fut7',         '🏟️', '{Masculino}',          '{}'),
  ('00000000-0000-0000-0000-000000000001', 'Cheer',            'cheer',        '🎀', '{}', '{"COED 1","COED 2.1","COED 2NT","COED 3 NT","Performance Cheer"}'),
  ('00000000-0000-0000-0000-000000000001', 'Bateria',          'bateria',      '🥁', '{}', '{"1ª Divisão","2ª Divisão","3ª Divisão"}')
on conflict (edicao_id, slug) do nothing;

-- ============= EQUIPES — atléticas Primeira Divisão =============
insert into equipes (edicao_id, nome, tipo, divisao, universidade) values
  ('00000000-0000-0000-0000-000000000001', 'ENGENHARIA UFU',    'atletica', '1ª Divisão', 'UFU'),
  ('00000000-0000-0000-0000-000000000001', 'MEDICINA UFMG',     'atletica', '1ª Divisão', 'UFMG'),
  ('00000000-0000-0000-0000-000000000001', 'ENG UFMG',          'atletica', '1ª Divisão', 'UFMG'),
  ('00000000-0000-0000-0000-000000000001', 'MED UFTM',          'atletica', '1ª Divisão', 'UFTM'),
  ('00000000-0000-0000-0000-000000000001', 'MED UFU',           'atletica', '1ª Divisão', 'UFU'),
  ('00000000-0000-0000-0000-000000000001', 'MONETÁRIA UFU',     'atletica', '1ª Divisão', 'UFU'),
  ('00000000-0000-0000-0000-000000000001', 'MED UNIUBE',        'atletica', '1ª Divisão', 'UNIUBE'),
  ('00000000-0000-0000-0000-000000000001', 'EDUCA UNIUBE',      'atletica', '1ª Divisão', 'UNIUBE'),
  ('00000000-0000-0000-0000-000000000001', 'DIREITO UFU',       'atletica', '1ª Divisão', 'UFU'),
  ('00000000-0000-0000-0000-000000000001', 'HUMANAS UFU',       'atletica', '1ª Divisão', 'UFU'),
  ('00000000-0000-0000-0000-000000000001', 'UNIFEI',            'atletica', '1ª Divisão', 'UNIFEI'),
  ('00000000-0000-0000-0000-000000000001', 'ITA',               'atletica', '1ª Divisão', 'ITA'),
  ('00000000-0000-0000-0000-000000000001', 'ENG UFTM',          'atletica', '1ª Divisão', 'UFTM'),
  ('00000000-0000-0000-0000-000000000001', 'EEFFTO UFMG',       'atletica', '1ª Divisão', 'UFMG'),
  ('00000000-0000-0000-0000-000000000001', 'GLORIOSA UFTM',     'atletica', '1ª Divisão', 'UFTM'),
  ('00000000-0000-0000-0000-000000000001', 'SAÚDE E ESPORTE',   'atletica', '1ª Divisão', null);

-- ============= EQUIPES — atléticas Segunda Divisão =============
insert into equipes (edicao_id, nome, tipo, divisao, universidade) values
  ('00000000-0000-0000-0000-000000000001', 'BRUTUS UFSJ',       'atletica', '2ª Divisão', 'UFSJ'),
  ('00000000-0000-0000-0000-000000000001', 'UNICAMP LIMEIRA',   'atletica', '2ª Divisão', 'UNICAMP'),
  ('00000000-0000-0000-0000-000000000001', 'AGRÁRIAS UFU',      'atletica', '2ª Divisão', 'UFU'),
  ('00000000-0000-0000-0000-000000000001', 'DIREITO UFMG',      'atletica', '2ª Divisão', 'UFMG'),
  ('00000000-0000-0000-0000-000000000001', 'LAUNAERP',          'atletica', '2ª Divisão', null),
  ('00000000-0000-0000-0000-000000000001', 'LAUCB',             'atletica', '2ª Divisão', 'UCB'),
  ('00000000-0000-0000-0000-000000000001', 'MED UNIFENAS',      'atletica', '2ª Divisão', 'UNIFENAS'),
  ('00000000-0000-0000-0000-000000000001', 'ENG PUC',           'atletica', '2ª Divisão', 'PUC'),
  ('00000000-0000-0000-0000-000000000001', 'DIREITO USP',       'atletica', '2ª Divisão', 'USP'),
  ('00000000-0000-0000-0000-000000000001', 'CAAP UFABC',        'atletica', '2ª Divisão', 'UFABC'),
  ('00000000-0000-0000-0000-000000000001', 'UNIFRAN',           'atletica', '2ª Divisão', 'UNIFRAN'),
  ('00000000-0000-0000-0000-000000000001', 'UEMG FRUTAL',       'atletica', '2ª Divisão', 'UEMG'),
  ('00000000-0000-0000-0000-000000000001', 'FAEFI UFU',         'atletica', '2ª Divisão', 'UFU'),
  ('00000000-0000-0000-0000-000000000001', 'LAU UNIPAM',        'atletica', '2ª Divisão', 'UNIPAM'),
  ('00000000-0000-0000-0000-000000000001', 'DIREITO PUC',       'atletica', '2ª Divisão', 'PUC'),
  ('00000000-0000-0000-0000-000000000001', 'FACE UFMG',         'atletica', '2ª Divisão', 'UFMG');

-- ============= PIPELINE TEMPLATES =============
insert into pipeline_templates (nome, tipo_conteudo, patrocinado, estagios, sla_por_estagio) values
  ('Story rápido',           'story_rapido',       false, '{captura,publicacao}',                                    '{"captura":0,"publicacao":10}'),
  ('Story editado',          'story_editado',      false, '{captura,edicao_video,publicacao}',                       '{"captura":0,"edicao_video":20,"publicacao":10}'),
  ('Reels',                  'reels',              false, '{captura,edicao_video,aprovacao_coord,publicacao}',       '{"captura":0,"edicao_video":40,"aprovacao_coord":15,"publicacao":10}'),
  ('Card feed',              'card_feed',          false, '{pesquisa,design_arte,publicacao}',                       '{"pesquisa":15,"design_arte":40,"publicacao":10}'),
  ('Card patrocinado',       'card_patrocinado',   true,  '{pesquisa,design_arte,aprovacao_coord,aprovacao_patro,publicacao}', '{"pesquisa":15,"design_arte":40,"aprovacao_coord":15,"aprovacao_patro":30,"publicacao":10}'),
  ('Texto / legenda',        'texto_legenda',      false, '{redacao,aprovacao_coord,publicacao}',                    '{"redacao":15,"aprovacao_coord":10,"publicacao":5}'),
  ('Repost',                 'repost',             false, '{pesquisa,publicacao}',                                   '{"pesquisa":10,"publicacao":5}'),
  ('Cobertura ao vivo',      'cobertura_ao_vivo',  false, '{captura,publicacao}',                                    '{"captura":0,"publicacao":5}');
