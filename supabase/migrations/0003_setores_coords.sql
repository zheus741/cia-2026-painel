-- Coordenadas aproximadas dos setores CIA 2026 em Uberaba/MG
-- Ajuste pelos valores reais em /admin/setores após confirmar os endereços

update setores set
  lat        = -19.7566,
  lng        = -47.9421,
  endereco   = 'Av. Guilherme Ferreira, Uberaba/MG',
  capacidade_pessoas = 1200
where nome = 'SESI Clube'
  and edicao_id = '00000000-0000-0000-0000-000000000001';

update setores set
  lat        = -19.7338,
  lng        = -47.9155,
  endereco   = 'Uberaba/MG',
  capacidade_pessoas = 800
where nome = 'UTC'
  and edicao_id = '00000000-0000-0000-0000-000000000001';

-- Palcos e festa — agrupados na área principal do evento
update setores set
  lat        = -19.7639,
  lng        = -47.9365,
  endereco   = 'Centro de Eventos, Uberaba/MG',
  capacidade_pessoas = 5000
where nome = 'Palco Principal'
  and edicao_id = '00000000-0000-0000-0000-000000000001';

update setores set
  lat        = -19.7642,
  lng        = -47.9368,
  endereco   = 'Centro de Eventos, Uberaba/MG',
  capacidade_pessoas = 3000
where nome = 'Palco Eletrônico'
  and edicao_id = '00000000-0000-0000-0000-000000000001';

update setores set
  lat        = -19.7637,
  lng        = -47.9362,
  endereco   = 'Centro de Eventos, Uberaba/MG',
  capacidade_pessoas = 2000
where nome = 'Palco 360°'
  and edicao_id = '00000000-0000-0000-0000-000000000001';

update setores set
  lat        = -19.7644,
  lng        = -47.9360,
  endereco   = 'Centro de Eventos, Uberaba/MG',
  capacidade_pessoas = 4000
where nome = 'Área de Festa'
  and edicao_id = '00000000-0000-0000-0000-000000000001';

update setores set
  lat        = -19.7648,
  lng        = -47.9355,
  endereco   = 'Centro de Eventos, Uberaba/MG'
where nome = 'Camarotes'
  and edicao_id = '00000000-0000-0000-0000-000000000001';

update setores set
  lat        = -19.7633,
  lng        = -47.9370,
  endereco   = 'Centro de Eventos, Uberaba/MG'
where nome = 'Base da Equipe'
  and edicao_id = '00000000-0000-0000-0000-000000000001';
