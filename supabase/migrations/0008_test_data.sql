-- =========================================================================
-- CIA 2026 — Dados de Teste
-- Patrocinadores · Jogos · Pautas · Wiki · Checklists
-- (apagar/substituir com dados reais antes do evento)
-- =========================================================================

-- ── PATROCINADORES ────────────────────────────────────────────────────────────

insert into patrocinadores (id, edicao_id, nome, slug, cota, contato_nome, contato_email, ativo) values
  ('00000000-0000-0009-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Patrocinador Master A', 'master-a', 'Master',
   'Carlos Souza', 'carlos@master-a.com.br', true),
  ('00000000-0000-0009-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Patrocinador Ouro B', 'ouro-b', 'Ouro',
   'Ana Lima', 'ana@ouro-b.com.br', true),
  ('00000000-0000-0009-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Apoiador C', 'apoio-c', 'Apoio',
   'Paulo Ramos', 'paulo@apoio-c.com.br', true)
on conflict (id) do nothing;

-- Escopo de cada patrocinador
insert into escopo_itens (patrocinador_id, tipo_conteudo, canal, quantidade_prevista, descricao, status) values
  ('00000000-0000-0009-0000-000000000001', 'story_rapido',    'instagram_stories', 20, '20 stories de marca ao longo do evento',      'pendente'),
  ('00000000-0000-0009-0000-000000000001', 'reels',           'instagram_reels',    4, '1 reels por dia',                             'pendente'),
  ('00000000-0000-0009-0000-000000000001', 'card_patrocinado','instagram_feed',      2, 'Abertura + Encerramento',                     'pendente'),
  ('00000000-0000-0009-0000-000000000002', 'story_rapido',    'instagram_stories', 10, '10 stories de menção',                        'pendente'),
  ('00000000-0000-0009-0000-000000000002', 'card_patrocinado','instagram_feed',      1, 'Card patrocinado de highlights',              'pendente'),
  ('00000000-0000-0009-0000-000000000003', 'story_rapido',    'instagram_stories',  5, 'Menção nos stories do maior jogo da semana',   'pendente');

-- ── JOGOS ─────────────────────────────────────────────────────────────────────
-- 6 jogos por dia · Quinta → Domingo · 08h–20h
-- Setores: SESI=...001  UTC=...002
-- Modalidades: Futsal=...001 Volei=...004 Basquete=...005
--              Handebol=...006 FutSociety=...003 Natação=...007
--              Atletismo=...008 TenisMesa=...009 Cheer=...010 Bateria=...011

insert into jogos
  (edicao_id, modalidade_id, dia_id, setor_id,
   categoria, divisao, fase,
   equipe_a_nome, equipe_b_nome,
   inicio, fim_previsto, status)
values

-- ── QUINTA 04/jun ─────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000001', -- Futsal
   '00000000-0000-0001-0000-000000000001', -- Quinta
   '00000000-0000-0002-0000-000000000001', -- SESI
   'Masculino','1ª Divisão','Grupo A',
   'AA Eng UFU','AA Eng UFMG',
   '2026-06-04T08:00:00-03:00','2026-06-04T09:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000004', -- Vôlei
   '00000000-0000-0001-0000-000000000001',
   '00000000-0000-0002-0000-000000000002', -- UTC
   'Feminino','1ª Divisão','Grupo A',
   'AA Med UFTM','AA Med USP',
   '2026-06-04T09:30:00-03:00','2026-06-04T11:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000005', -- Basquete
   '00000000-0000-0001-0000-000000000001',
   '00000000-0000-0002-0000-000000000002', -- UTC
   'Masculino','1ª Divisão','Grupo A',
   'AA Eng PUC-MG','AA Eng UFRJ',
   '2026-06-04T11:00:00-03:00','2026-06-04T12:30:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000006', -- Handebol
   '00000000-0000-0001-0000-000000000001',
   '00000000-0000-0002-0000-000000000001', -- SESI
   'Masculino','1ª Divisão','Grupo A',
   'AA Dir UFU','AA Med UnB',
   '2026-06-04T13:00:00-03:00','2026-06-04T14:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000001', -- Futsal
   '00000000-0000-0001-0000-000000000001',
   '00000000-0000-0002-0000-000000000001',
   'Feminino','1ª Divisão','Grupo A',
   'AA Med UFMG','AA Med UFRGS',
   '2026-06-04T15:00:00-03:00','2026-06-04T16:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000009', -- Tênis de Mesa
   '00000000-0000-0001-0000-000000000001',
   '00000000-0000-0002-0000-000000000002',
   'Masculino','Único','Grupos',
   'AA Eng UNICAMP','AA Eng UFSC',
   '2026-06-04T17:00:00-03:00','2026-06-04T18:00:00-03:00','agendado'),

-- ── SEXTA 05/jun ──────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000007', -- Natação
   '00000000-0000-0001-0000-000000000002', -- Sexta
   '00000000-0000-0002-0000-000000000001',
   'Misto','Único','Classificatória',
   'Equipes Bloco A','Equipes Bloco B',
   '2026-06-05T08:00:00-03:00','2026-06-05T10:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000003', -- Futebol Society
   '00000000-0000-0001-0000-000000000002',
   '00000000-0000-0002-0000-000000000001',
   'Masculino','Único','Grupo B',
   'AA Eng UFV','AA Eng UFSJ',
   '2026-06-05T09:00:00-03:00','2026-06-05T10:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000004', -- Vôlei
   '00000000-0000-0001-0000-000000000002',
   '00000000-0000-0002-0000-000000000002',
   'Masculino','1ª Divisão','Grupo B',
   'AA Eng UFRGS','AA Eng UNIFEI',
   '2026-06-05T10:30:00-03:00','2026-06-05T12:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000005', -- Basquete
   '00000000-0000-0001-0000-000000000002',
   '00000000-0000-0002-0000-000000000002',
   'Feminino','1ª Divisão','Semifinal',
   'AA Med USP','AA Med UFMG',
   '2026-06-05T12:00:00-03:00','2026-06-05T13:30:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000008', -- Atletismo
   '00000000-0000-0001-0000-000000000002',
   '00000000-0000-0002-0000-000000000001',
   'Misto','Único','Classificatória',
   'Bloco Masculino','Bloco Feminino',
   '2026-06-05T14:00:00-03:00','2026-06-05T16:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000001', -- Futsal
   '00000000-0000-0001-0000-000000000002',
   '00000000-0000-0002-0000-000000000001',
   'Masculino','1ª Divisão','Semifinal',
   'AA Eng UFU','AA Eng PUC-MG',
   '2026-06-05T16:00:00-03:00','2026-06-05T17:00:00-03:00','agendado'),

-- ── SÁBADO 06/jun ─────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000010', -- Cheer
   '00000000-0000-0001-0000-000000000003', -- Sábado
   '00000000-0000-0002-0000-000000000003', -- Palco Principal
   'COED 1','COED 1','Classificatória',
   'Cheer Eng UFU','Cheer UFMG',
   '2026-06-06T08:00:00-03:00','2026-06-06T09:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000011', -- Bateria
   '00000000-0000-0001-0000-000000000003',
   '00000000-0000-0002-0000-000000000003',
   'Misto','1ª Divisão','Classificatória',
   'Bateria Eng UFU','Bateria UFMG',
   '2026-06-06T09:30:00-03:00','2026-06-06T10:30:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000001', -- Futsal
   '00000000-0000-0001-0000-000000000003',
   '00000000-0000-0002-0000-000000000001',
   'Masculino','1ª Divisão','Final',
   'AA Eng UFU','AA Eng UFMG',
   '2026-06-06T12:00:00-03:00','2026-06-06T13:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000004', -- Vôlei
   '00000000-0000-0001-0000-000000000003',
   '00000000-0000-0002-0000-000000000002',
   'Masculino','1ª Divisão','Final',
   'AA Med UFTM','AA Eng UFRGS',
   '2026-06-06T14:00:00-03:00','2026-06-06T15:30:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000005', -- Basquete
   '00000000-0000-0001-0000-000000000003',
   '00000000-0000-0002-0000-000000000002',
   'Masculino','1ª Divisão','Final',
   'AA Eng PUC-MG','AA Med USP',
   '2026-06-06T16:00:00-03:00','2026-06-06T17:30:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000006', -- Handebol
   '00000000-0000-0001-0000-000000000003',
   '00000000-0000-0002-0000-000000000001',
   'Masculino','1ª Divisão','Final',
   'AA Dir UFU','AA Med UFMG',
   '2026-06-06T18:00:00-03:00','2026-06-06T19:00:00-03:00','agendado'),

-- ── DOMINGO 07/jun ────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000010', -- Cheer
   '00000000-0000-0001-0000-000000000004', -- Domingo
   '00000000-0000-0002-0000-000000000003',
   'COED 1','COED 1','Final',
   'Cheer UNICAMP','Cheer PUC-Rio',
   '2026-06-07T08:00:00-03:00','2026-06-07T09:30:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000011', -- Bateria
   '00000000-0000-0001-0000-000000000004',
   '00000000-0000-0002-0000-000000000003',
   'Misto','1ª Divisão','Final',
   'Bateria Eng UFMG','Bateria Med USP',
   '2026-06-07T10:00:00-03:00','2026-06-07T11:30:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000002', -- Futebol de Campo
   '00000000-0000-0001-0000-000000000004',
   '00000000-0000-0002-0000-000000000001',
   'Masculino','1ª Divisão','Final',
   'AA Eng UNICAMP','AA Med UFRJ',
   '2026-06-07T11:00:00-03:00','2026-06-07T12:30:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000009', -- Tênis de Mesa
   '00000000-0000-0001-0000-000000000004',
   '00000000-0000-0002-0000-000000000002',
   'Masculino','Único','Final',
   'AA Eng UFU','AA Eng UFSC',
   '2026-06-07T13:00:00-03:00','2026-06-07T14:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000007', -- Natação
   '00000000-0000-0001-0000-000000000004',
   '00000000-0000-0002-0000-000000000001',
   'Misto','Único','Final',
   'Bloco Masculino Final','Bloco Feminino Final',
   '2026-06-07T14:00:00-03:00','2026-06-07T16:00:00-03:00','agendado'),

  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0003-0000-000000000001', -- Futsal
   '00000000-0000-0001-0000-000000000004',
   '00000000-0000-0002-0000-000000000001',
   'Feminino','1ª Divisão','Final',
   'AA Med UFMG','AA Med UFTM',
   '2026-06-07T16:00:00-03:00','2026-06-07T17:00:00-03:00','agendado');

-- ── PAUTAS (Roaming) ──────────────────────────────────────────────────────────

insert into pautas (edicao_id, titulo, descricao, status, setor_id, dia_id) values
  ('00000000-0000-0000-0000-000000000001',
   'Aquecimento das baterias antes da entrada',
   'Capturar o camarim das baterias antes de entrarem no palco — sempre tem conteúdo bom nos bastidores',
   'ideia', null, null),

  ('00000000-0000-0000-0000-000000000001',
   'Reação da torcida no gol decisivo',
   'Posicionar câmera virada para a arquibancada no momento dos pênaltis',
   'aprovada',
   '00000000-0000-0002-0000-000000000001', -- SESI
   '00000000-0000-0001-0000-000000000003'), -- Sábado

  ('00000000-0000-0000-0000-000000000001',
   'Bastidores do Pedro Sampaio',
   'Tentar acesso ao camarote/backstage antes do show das 23h de sábado',
   'em_execucao',
   '00000000-0000-0002-0000-000000000003', -- Palco Principal
   '00000000-0000-0001-0000-000000000003'), -- Sábado

  ('00000000-0000-0000-0000-000000000001',
   'Entrevista com capitão da equipe campeã',
   'Pegar declaração logo após a final de futsal masculino',
   'entregue',
   '00000000-0000-0002-0000-000000000001',
   '00000000-0000-0001-0000-000000000004'), -- Domingo

  ('00000000-0000-0000-0000-000000000001',
   'Time-lapse da montagem do palco',
   'Drone fixo ou câmera em posição alta para capturar a montagem durante o dia',
   'ideia',
   '00000000-0000-0002-0000-000000000003', null),

  ('00000000-0000-0000-0000-000000000001',
   'Moodboard das fantasias da Festa Fantasia',
   'Coletar fotos das fantasias mais criativas — candidatas a post de feed',
   'aprovada',
   '00000000-0000-0002-0000-000000000006', -- Área de Festa
   '00000000-0000-0001-0000-000000000003'), -- Sábado

  ('00000000-0000-0000-0000-000000000001',
   'Vlog do dia de domingo da equipe',
   'Câmera seguindo alguém da coord o dia todo — da abertura das finais até o encerramento',
   'ideia', null,
   '00000000-0000-0001-0000-000000000004'),

  ('00000000-0000-0000-0000-000000000001',
   'Cobertura natação — provas de revezamento',
   'As provas de revezamento sempre geram mais tensão — priorizar',
   'descartada',
   '00000000-0000-0002-0000-000000000001', null);

-- ── WIKI / DOCS ───────────────────────────────────────────────────────────────

insert into docs (edicao_id, titulo, slug, conteudo_md, categoria, funcao, ordem, publicado) values

  ('00000000-0000-0000-0000-000000000001',
   'Briefing Geral — CIA 2026',
   'briefing-geral',
   E'# Briefing Geral — CIA 2026\n\n## Sobre o Evento\n\nA **Copa Inter Atléticas 2026** acontece de **04 a 07 de junho** em **Uberaba/MG**, reunindo cerca de **100 pessoas** na equipe de cobertura da Olharr.\n\n## Identidade Visual\n\n- Paleta: verde militar, dourado, preto\n- Fonte de título: Orbitron (futurista)\n- Tom: épico, intenso, competitivo mas festivo\n\n## Canais\n\n| Canal | Frequência |\n|-------|------------|\n| Instagram Stories | Tempo real (o dia todo) |\n| Instagram Feed | 2–4 posts/dia |\n| Instagram Reels | 1–2/dia |\n| TikTok | 1/dia |\n\n## Prioridades\n\n1. Cobertura ao vivo dos jogos decisivos\n2. Shows (Pedro Sampaio embaixador = prioridade máxima)\n3. Ativações de patrocinadores\n4. Bastidores e roaming\n\n## Contatos de emergência\n\n- Coordenação: **Zheus** — (34) 99999-0001\n- Técnico: **Mateus** — (34) 99999-0002',
   'briefing', null, 1, true),

  ('00000000-0000-0000-0000-000000000001',
   'Guia de Fotografia',
   'guia-foto',
   E'# Guia de Fotografia — CIA 2026\n\n## Configurações recomendadas\n\n### Jogos internos (ginásio)\n- ISO: 1600–6400\n- Velocidade: mínimo 1/500s\n- Abertura: f/2.8 ou mais aberta\n- Foco: AI Servo / tracking contínuo\n\n### Shows (palco noturno)\n- ISO: 800–3200\n- Velocidade: 1/200s (movimento do artista)\n- Abertura: f/1.8–f/2.8\n\n## O que capturar por tipo\n\n### Jogo\n1. Aquecimento / warm-up\n2. Momento de gol / ponto decisivo\n3. Reação da torcida / banco\n4. Foto de resultado (placar)\n5. Comemoração / protocolo\n\n### Show\n1. Abertura (primeiros 2 min)\n2. Ápice da música mais famosa\n3. Interação artista–plateia\n4. Foto panorâmica com luz do palco\n\n## Entrega\n\n- Fotos selecionadas → pasta Drive `CIA2026/FOTO/[dia]` em até 1h\n- Mínimo 10 fotos editadas por jogo\n- Formato: JPG, mínimo 2000px no lado maior',
   'manual', 'foto', 2, true),

  ('00000000-0000-0000-0000-000000000001',
   'Guia de Vídeo',
   'guia-video',
   E'# Guia de Vídeo — CIA 2026\n\n## Formatos e specs\n\n| Formato | Resolução | FPS | Ratio |\n|---------|-----------|-----|-------|\n| Stories | 1080×1920 | 30 | 9:16 |\n| Reels | 1080×1920 | 30–60 | 9:16 |\n| Feed | 1080×1350 | 30 | 4:5 |\n| TikTok | 1080×1920 | 30–60 | 9:16 |\n\n## Checklist de captura de jogo\n\n- [ ] Plano geral da quadra (estabelecimento)\n- [ ] Close-up de expressão dos jogadores\n- [ ] Slow motion de lances decisivos\n- [ ] Reação do banco\n- [ ] Celebração pós-resultado\n\n## Edição — prazos SLA\n\n| Tipo | Prazo |\n|------|-------|\n| Story Rápido | 0 min (ao vivo) |\n| Story Editado | 15 min |\n| Reels | 60 min |\n| Card Feed | 30 min |\n\n## Software aprovado\n\n- Edição mobile: CapCut\n- Edição desktop: Premiere / DaVinci\n- Trilha: biblioteca aprovada pela coord (sem copyright)',
   'manual', 'video', 3, true),

  ('00000000-0000-0000-0000-000000000001',
   'Guia de Social Media',
   'guia-social',
   E'# Guia de Social Media — CIA 2026\n\n## Tom de voz\n\n- **Não seja jornalístico, seja presente.** Fale como quem está lá.\n- Use gírias do universo universitário com moderação\n- Emojis: sim, mas sem exagero (1–2 por legenda)\n- Hashtags: máximo 5 por post\n\n## Hashtags oficiais\n\n`#CIA2026` `#CopaInterAtleticas` `#Uberaba2026`\n\n## Legendas por tipo\n\n### Jogo\n```\n[Nome A] x [Nome B] 🔥 [resultado]\n\nFase: [grupo/semi/final] | [modalidade]\n#CIA2026 #[modalidade] #CopaInterAtleticas\n```\n\n### Show\n```\n[Artista] em Uberaba 🎤✨\n\nCIA 2026 | [dia da semana]\n#CIA2026 #[artista] #CopaInterAtleticas\n```\n\n## Aprovação\n\n- Stories: pode postar direto\n- Feed e Reels: passa pela coord antes\n- Card patrocinado: aprovação da coord + patrocinador',
   'manual', 'social', 4, true),

  ('00000000-0000-0000-0000-000000000001',
   'Guia do Drone',
   'guia-drone',
   E'# Guia do Drone — CIA 2026\n\n## Equipamento\n\n- Modelo: DJI Air 3 (confirmar antes do evento)\n- Piloto certificado: verificar ANAC\n\n## Restrições de voo\n\n- **Não voar** durante shows com público aglomerado sem autorização\n- Altura máxima: 120m\n- Distância mínima de pessoas: 30m\n- Sem voo noturno sem autorização específica\n\n## Janelas de voo autorizadas\n\n| Momento | Local | Observação |\n|---------|-------|------------|\n| Manhã (07h–09h) | Complexo esportivo | Antes da abertura ao público |\n| Intervalos de jogo | Quadra principal | Max 5 min |\n| Abertura da festa | Área externa | Antes da lotação |\n\n## Shots prioritários\n\n1. Aéreo do complexo completo (panorama)\n2. Overhead do ginásio durante final\n3. Revealing shot do palco à noite\n4. Time-lapse do pôr do sol + acendimento do palco',
   'manual', 'drone', 5, true),

  ('00000000-0000-0000-0000-000000000001',
   'Protocolo de Coordenação',
   'protocolo-coord',
   E'# Protocolo de Coordenação — CIA 2026\n\n## Estrutura da equipe\n\n```\nCoordenação (Zheus + Mateus)\n├── Líder Foto (2 fotógrafos)\n├── Líder Vídeo (3 videomakers)\n├── Líder Social (2 social media)\n├── Drone (1 piloto)\n└── Roaming (2–3 repórteres)\n```\n\n## Comunicação\n\n- Grupo principal: WhatsApp "CIA 2026 — Equipe"\n- Urgente: ligar diretamente\n- Aprovações de post: mandar no grupo de aprovação\n\n## Escala de turnos\n\nCada operador cobre um turno de 4–6h. Ninguém fica mais de 8h seguidas sem pausa.\n\n## Emergências\n\n1. **Equipamento quebrou** → avisar coord imediatamente, ir para base\n2. **Perdeu credencial** → base da equipe, falar com produção do evento\n3. **Problema de saúde** → informar coord, substituição acionada\n\n## Check-in diário\n\nTodos os dias às **07h30**, grupo do WhatsApp: ✅ se estiver bem e no local.',
   'briefing', 'coordenacao', 6, true),

  ('00000000-0000-0000-0000-000000000001',
   'Guia de Edição e Design',
   'guia-design',
   E'# Guia de Edição e Design — CIA 2026\n\n## Identidade visual\n\n- Fundo: preto profundo (#060C07)\n- Verde principal: #4A8A5C\n- Dourado: #C8973A\n- Fonte título: Orbitron (Google Fonts)\n- Fonte corpo: Inter\n\n## Templates disponíveis\n\nTodos os templates ficam na pasta:\n`Drive > CIA2026 > DESIGN > Templates`\n\n| Template | Uso |\n|----------|-----|\n| Card Resultado | Pós-jogo |\n| Card Artista | Anúncio de show |\n| Story Live | Durante jogos |\n| Card Patrocinado | Ativações |\n\n## Diretrizes de cor por modalidade\n\n- Futsal/Futebol: verde\n- Cheer: roxo\n- Bateria: dourado\n- Shows: gradiente dark\n\n## Aprovação de artes\n\n- Cards sem patrocínio: coord visual\n- Cards com marca do patrocinador: coord + patrocinador (via WhatsApp)',
   'manual', 'design', 7, true);

-- ── CHECKLIST INSTÂNCIAS (vinculadas a shows) ─────────────────────────────────
-- Pedro Sampaio (show de sábado) — template show
-- Nattan (show de sexta) — template show
-- Futsal Final sábado — template jogo
-- Festa Fantasia — template festa

-- Nota: após insert, chame instanciar_checklist para gerar os itens
-- Aqui já chamamos via select para cada instância

do $$
declare
  inst_pedro    uuid;
  inst_nattan   uuid;
  inst_festa    uuid;
  show_pedro    uuid;
  show_nattan   uuid;
begin
  -- pega ID do show Pedro Sampaio
  select id into show_pedro from shows where nome = 'Pedro Sampaio' limit 1;
  -- pega ID do show Nattan
  select id into show_nattan from shows where nome = 'Nattan' limit 1;

  -- instância show Pedro Sampaio
  if show_pedro is not null then
    insert into checklist_instancias
      (template_id, edicao_id, dia_id, show_id)
    values
      ('00000000-0000-0007-0000-000000000002',   -- template show
       '00000000-0000-0000-0000-000000000001',
       '00000000-0000-0001-0000-000000000003',   -- Sábado
       show_pedro)
    returning id into inst_pedro;
    perform instanciar_checklist(inst_pedro);
  end if;

  -- instância show Nattan
  if show_nattan is not null then
    insert into checklist_instancias
      (template_id, edicao_id, dia_id, show_id)
    values
      ('00000000-0000-0007-0000-000000000002',
       '00000000-0000-0000-0000-000000000001',
       '00000000-0000-0001-0000-000000000002',   -- Sexta
       show_nattan)
    returning id into inst_nattan;
    perform instanciar_checklist(inst_nattan);
  end if;

  -- instância Festa Fantasia
  insert into checklist_instancias
    (template_id, edicao_id, dia_id, festa_id)
  values
    ('00000000-0000-0007-0000-000000000003',     -- template festa
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0001-0000-000000000003',     -- Sábado
     '00000000-0000-0005-0000-000000000004')     -- Festa a Fantasia
  returning id into inst_festa;
  perform instanciar_checklist(inst_festa);

  -- instância ativação patrocinador Master A
  declare inst_patro uuid;
  begin
    insert into checklist_instancias
      (template_id, edicao_id, patrocinador_id)
    values
      ('00000000-0000-0007-0000-000000000004',   -- template ativação
       '00000000-0000-0000-0000-000000000001',
       '00000000-0000-0009-0000-000000000001')
    returning id into inst_patro;
    perform instanciar_checklist(inst_patro);
  end;
end $$;

-- ── CONTEÚDOS DE TESTE ────────────────────────────────────────────────────────

insert into conteudos
  (edicao_id, titulo, tipo, status, prioridade, dia_id, setor_id, canal_publicacao, pipeline_template_id)
values
  ('00000000-0000-0000-0000-000000000001',
   'Abertura — Chegada das equipes ao SESI',
   'story_rapido', 'publicado', 2,
   '00000000-0000-0001-0000-000000000001',
   '00000000-0000-0002-0000-000000000001',
   'instagram_stories',
   '00000000-0000-0004-0000-000000000001'),

  ('00000000-0000-0000-0000-000000000001',
   'Futsal M — AA Eng UFU × AA Eng UFMG | Gol do título',
   'reels', 'em_producao', 1,
   '00000000-0000-0001-0000-000000000001',
   '00000000-0000-0002-0000-000000000001',
   'instagram_reels',
   '00000000-0000-0004-0000-000000000003'),

  ('00000000-0000-0000-0000-000000000001',
   'Pedro Sampaio — Palco Principal Sábado',
   'card_feed', 'rascunho', 1,
   '00000000-0000-0001-0000-000000000003',
   '00000000-0000-0002-0000-000000000003',
   'instagram_feed',
   '00000000-0000-0004-0000-000000000004'),

  ('00000000-0000-0000-0000-000000000001',
   'Bastidores Cheer COED 1 — Final Sábado',
   'story_editado', 'rascunho', 2,
   '00000000-0000-0001-0000-000000000003',
   '00000000-0000-0002-0000-000000000003',
   'instagram_stories',
   '00000000-0000-0004-0000-000000000002'),

  ('00000000-0000-0000-0000-000000000001',
   'Ativação Patrocinador Master A — Arena Estendida',
   'card_patrocinado', 'em_producao', 1,
   '00000000-0000-0001-0000-000000000001',
   '00000000-0000-0002-0000-000000000006',
   'instagram_feed',
   '00000000-0000-0004-0000-000000000005'),

  ('00000000-0000-0000-0000-000000000001',
   'GBR Long Set Domingo — Encerramento CIA 2026',
   'reels', 'rascunho', 2,
   '00000000-0000-0001-0000-000000000004',
   '00000000-0000-0002-0000-000000000003',
   'instagram_reels',
   '00000000-0000-0004-0000-000000000003');
