-- ════════════════════════════════════════════════════════════════════════════
-- 0057 · Corrige comportamento de FOREIGN KEYs em DELETE
-- ════════════════════════════════════════════════════════════════════════════
-- Problemas detectados:
--
-- 1. turnos.user_id ON DELETE CASCADE
--    Se admin deleta um perfil sem querer (ou pra "desativar"), apaga TODA
--    escala histórica do usuário. Padrão correto: desativar via profiles.ativo
--    + RESTRICT em turnos.
--
-- 2. jogos.modalidade_id / equipe_a_id / equipe_b_id sem ON DELETE definido
--    → default NO ACTION → ao tentar deletar modalidade/equipe usada, erro
--    críptico bloqueia operação no admin durante o evento.
--    Padrão correto: equipes podem ser substituídas (SET NULL — mantém o
--    equipe_a_nome como snapshot); modalidade é estrutural (RESTRICT explícito).
--
-- 3. conteudos.jogo_id / responsavel_*_id similar
--
-- Idempotente: usa DO blocks que checam constraint type antes de alterar.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Helper inline pra trocar tipo de FK ─────────────────────────────────────
do $$
declare
  v_constraint_name text;
begin
  -- ── turnos.user_id: CASCADE → RESTRICT ──
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.turnos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.turnos'::regclass and attname = 'user_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table turnos drop constraint %I', v_constraint_name);
  end if;
  alter table turnos
    add constraint turnos_user_id_fkey
    foreign key (user_id) references profiles(id) on delete restrict;

  -- ── jogos.equipe_a_id: NO ACTION → SET NULL ──
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.jogos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.jogos'::regclass and attname = 'equipe_a_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table jogos drop constraint %I', v_constraint_name);
  end if;
  alter table jogos
    add constraint jogos_equipe_a_id_fkey
    foreign key (equipe_a_id) references equipes(id) on delete set null;

  -- ── jogos.equipe_b_id: NO ACTION → SET NULL ──
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.jogos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.jogos'::regclass and attname = 'equipe_b_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table jogos drop constraint %I', v_constraint_name);
  end if;
  alter table jogos
    add constraint jogos_equipe_b_id_fkey
    foreign key (equipe_b_id) references equipes(id) on delete set null;

  -- ── conteudos.jogo_id: NO ACTION → SET NULL ──
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.conteudos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.conteudos'::regclass and attname = 'jogo_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table conteudos drop constraint %I', v_constraint_name);
  end if;
  alter table conteudos
    add constraint conteudos_jogo_id_fkey
    foreign key (jogo_id) references jogos(id) on delete set null;

  -- ── modalidade_id em jogos: explicita RESTRICT (era default NO ACTION) ──
  select conname into v_constraint_name
    from pg_constraint
   where conrelid = 'public.jogos'::regclass
     and contype = 'f'
     and conkey  = array[(
       select attnum from pg_attribute
        where attrelid = 'public.jogos'::regclass and attname = 'modalidade_id'
     )];
  if v_constraint_name is not null then
    execute format('alter table jogos drop constraint %I', v_constraint_name);
  end if;
  alter table jogos
    add constraint jogos_modalidade_id_fkey
    foreign key (modalidade_id) references modalidades(id) on delete restrict;
end $$;
