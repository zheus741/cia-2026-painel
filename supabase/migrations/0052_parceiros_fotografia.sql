-- ════════════════════════════════════════════════════════════════════════════
-- 0052 · Garante que CURUCLICKS e OLHARR aparecem ativos no dropdown
-- ════════════════════════════════════════════════════════════════════════════
-- A migration 0009 inseria essas empresas, mas em alguns ambientes elas
-- ficaram inativas ou sumiram. Este script é idempotente e seguro:
-- - Insere se não existe
-- - Reativa se foi desativada
-- - tipo='ambos' para que apareçam tanto no dropdown de Foto quanto Vídeo
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  -- CURUCLICKS
  if not exists (select 1 from parceiros where upper(nome) = 'CURUCLICKS') then
    insert into parceiros (nome, tipo, cor_hex, ativo)
    values ('CURUCLICKS', 'ambos', '#b07a0a', true);
  else
    update parceiros
       set ativo = true,
           tipo  = coalesce(tipo, 'ambos')
     where upper(nome) = 'CURUCLICKS';
  end if;

  -- OLHARR (marca correta com duplo R)
  if not exists (select 1 from parceiros where upper(nome) = 'OLHARR') then
    insert into parceiros (nome, tipo, cor_hex, ativo)
    values ('OLHARR', 'ambos', '#2e6b42', true);
  else
    update parceiros
       set ativo = true,
           tipo  = coalesce(tipo, 'ambos')
     where upper(nome) = 'OLHARR';
  end if;

  -- Garante que Indie Clicks aparece em ambos também (estava só foto)
  update parceiros
     set tipo = 'ambos',
         ativo = true
   where upper(nome) = 'INDIE CLICKS';
end $$;
