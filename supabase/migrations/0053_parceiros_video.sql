-- ════════════════════════════════════════════════════════════════════════════
-- 0053 · Garante ENTAOTOMA e NIX VIDEO ativos (cobertura de vídeo)
-- ════════════════════════════════════════════════════════════════════════════
-- Complemento da 0052 que cuidou de CURUCLICKS / OLHARR / INDIE CLICKS.
-- Estas duas existiam no seed original 0009 mas em alguns ambientes
-- ficaram inativas — quando o coord vai escalar um Líder FV de Vídeo,
-- o dropdown só mostra "sem empresa".
--
-- Idempotente: insert se não existe, reativa se foi desativada.
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  -- ENTAOTOMA (cobertura de vídeo)
  if not exists (select 1 from parceiros where upper(nome) = 'ENTAOTOMA') then
    insert into parceiros (nome, tipo, cor_hex, ativo)
    values ('ENTAOTOMA', 'video', '#1a5c5c', true);
  else
    update parceiros
       set ativo = true
     where upper(nome) = 'ENTAOTOMA';
  end if;

  -- NIX VIDEO (cobertura de vídeo)
  if not exists (select 1 from parceiros where upper(nome) = 'NIX VIDEO') then
    insert into parceiros (nome, tipo, cor_hex, ativo)
    values ('NIX VIDEO', 'video', '#4a2e6b', true);
  else
    update parceiros
       set ativo = true
     where upper(nome) = 'NIX VIDEO';
  end if;
end $$;
