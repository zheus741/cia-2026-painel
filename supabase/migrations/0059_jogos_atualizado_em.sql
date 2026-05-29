-- ════════════════════════════════════════════════════════════════════════════
-- 0059 · jogos.atualizado_em + trigger automático
-- ════════════════════════════════════════════════════════════════════════════
-- Quando 2 coords editam o MESMO jogo simultaneamente (ex: coord_esportivo
-- e admin trocando placar), o segundo update sobrescreve silenciosamente o
-- primeiro — last-write-wins sem aviso.
--
-- Solução leve: coluna atualizado_em + trigger BEFORE UPDATE.
-- Future: actions podem fazer .gte('atualizado_em', clientSnapshot) pra
-- detectar conflito (409 Conflict). Por enquanto, mig só prepara o terreno
-- sem mudar comportamento — risco zero.
-- ════════════════════════════════════════════════════════════════════════════

alter table jogos
  add column if not exists atualizado_em timestamptz default now();

-- Trigger function (reutilizável)
create or replace function set_atualizado_em()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_jogos_atualizado_em on jogos;
create trigger trg_jogos_atualizado_em
  before update on jogos
  for each row execute function set_atualizado_em();

-- Backfill: preenche valor pras rows existentes
update jogos set atualizado_em = coalesce(atualizado_em, criado_em, now())
 where atualizado_em is null;

-- Índice pra debug ("últimos jogos editados")
create index if not exists idx_jogos_atualizado_em
  on jogos(atualizado_em desc);

comment on column jogos.atualizado_em is
  'Timestamp da última edição. Atualizado automaticamente por trigger. Pode ser usado pra optimistic locking — client envia o valor lido e action checa antes de gravar.';
