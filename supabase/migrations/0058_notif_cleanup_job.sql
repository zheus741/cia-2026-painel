-- ════════════════════════════════════════════════════════════════════════════
-- 0058 · Cleanup automático de notificações antigas
-- ════════════════════════════════════════════════════════════════════════════
-- Notificações sem limpeza ficam crescendo linearmente: 200 users × ~50 notifs
-- no evento = 10k. Em 6 meses sem cleanup, vai a dezenas de milhares.
-- Mesmo com índice (user_id, created_at desc), vacuum + dump aumenta.
--
-- Estratégia: cron diário às 04:30 BRT que apaga notificações LIDAS com
-- mais de 60 dias. Não-lidas ficam sempre (algumas podem ser realmente
-- importantes e ainda não vistas).
--
-- Idempotente — checa existência da extensão e job antes de criar.
-- ════════════════════════════════════════════════════════════════════════════

-- Ativa pg_cron (Supabase oferece em projetos pago; em free é ignorado)
do $$
begin
  create extension if not exists pg_cron;
exception
  when undefined_file then
    raise notice 'pg_cron não disponível neste plano — pule esta migration ou rode manualmente';
end $$;

-- Remove job antigo se existir, pra recriar com a definição atual
do $$
begin
  perform cron.unschedule('cleanup-notificacoes-antigas');
exception
  when others then null;
end $$;

-- Agenda: todo dia 07:30 UTC (04:30 BRT) — horário morto
do $$
begin
  perform cron.schedule(
    'cleanup-notificacoes-antigas',
    '30 7 * * *',  -- minute hour day_of_month month day_of_week
    $job$
      delete from notificacoes
       where lida = true
         and created_at < now() - interval '60 days'
    $job$
  );
exception
  when undefined_function then
    raise notice 'pg_cron.schedule não disponível — execute manualmente o DELETE periodicamente';
end $$;

comment on table notificacoes is
  'Notificações in-app. TTL automático: lidas > 60 dias apagadas via pg_cron job "cleanup-notificacoes-antigas" (mig 0058).';
