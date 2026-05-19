-- 0035: substitui políticas RLS com WITH CHECK (true) por verificações reais
--
-- Cada tabela foi analisada antes de alterar:
--   • Quem escreve no app?      → determina a role exigida
--   • O app usa service client? → se sim, a política é só uma barreira REST
--   • A tabela tem autor_id?    → se sim, usar auth.uid() é mais preciso
--
-- Avisos que PERMANECEM intencionais após esta migração:
--   • Nenhum — todos os 11 rls_policy_always_true são corrigidos aqui
--
-- ─── 1. pautas ───────────────────────────────────────────────────────────────
-- app usa service client (bypassa RLS); política protege REST direto.
-- Inserção deve ser atribuída ao próprio usuário.
DROP POLICY IF EXISTS "pautas: insert autenticado" ON public.pautas;
CREATE POLICY "pautas: insert autenticado"
  ON public.pautas FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid());

-- ─── 2. handoffs ─────────────────────────────────────────────────────────────
-- Handoffs registram transições de conteúdo entre usuários.
-- from_user_id deve ser o próprio usuário criando o registro.
DROP POLICY IF EXISTS "handoffs: insert autenticado" ON public.handoffs;
CREATE POLICY "handoffs: insert autenticado"
  ON public.handoffs FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- ─── 3. referencias ──────────────────────────────────────────────────────────
-- Referências de moodboard têm autor_id; restringir ao próprio usuário.
DROP POLICY IF EXISTS "referencias: insert autenticado" ON public.referencias;
CREATE POLICY "referencias: insert autenticado"
  ON public.referencias FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid());

-- ─── 4. referencia_tags ──────────────────────────────────────────────────────
-- Tabela de junção sem coluna de usuário. Restringir a quem pode vincular tags
-- de referência: dono da referência ou lider+.
DROP POLICY IF EXISTS "referencia_tags: insert autenticado" ON public.referencia_tags;
CREATE POLICY "referencia_tags: insert autenticado"
  ON public.referencia_tags FOR INSERT TO authenticated
  WITH CHECK (
    is_lider_or_above()
    OR EXISTS (
      SELECT 1 FROM public.referencias r
      WHERE r.id = referencia_id AND r.autor_id = auth.uid()
    )
  );

-- ─── 5. checklist_itens ──────────────────────────────────────────────────────
-- Inserts reais vêm da função instanciar_checklist (SECURITY DEFINER, bypassa RLS).
-- Inserts diretos via REST devem ser restritos a coord+.
DROP POLICY IF EXISTS "checklist_itens: insert autenticado" ON public.checklist_itens;
CREATE POLICY "checklist_itens: insert coord+"
  ON public.checklist_itens FOR INSERT TO authenticated
  WITH CHECK (is_coord_or_admin());

-- ─── 6. chave_config ─────────────────────────────────────────────────────────
-- Configuração de chaveamento, gerida pelo app via requireCoordOrAdmin().
-- A política ALL com (true) permitia qualquer authenticated alterar tudo.
DROP POLICY IF EXISTS "chave_config_admin" ON public.chave_config;
CREATE POLICY "chave_config: write coord+"
  ON public.chave_config FOR ALL TO authenticated
  USING (is_coord_or_admin())
  WITH CHECK (is_coord_or_admin());

-- ─── 7. escalas_esportivo ────────────────────────────────────────────────────
-- Gerida pelo app via requireCoordEsportivo() → roles: admin, coordenador_esportivo.
-- is_coord_or_admin() cobre 'admin' + 'coordenacao'; adicionamos 'coordenador_esportivo'.
-- Usamos auth_role() diretamente pois não existe helper para esse papel.
DROP POLICY IF EXISTS "delete" ON public.escalas_esportivo;
DROP POLICY IF EXISTS "insert" ON public.escalas_esportivo;
DROP POLICY IF EXISTS "update" ON public.escalas_esportivo;
CREATE POLICY "escalas_esportivo: write coord-esportivo+"
  ON public.escalas_esportivo FOR ALL TO authenticated
  USING (auth_role() IN ('admin', 'coordenacao', 'coordenador_esportivo'))
  WITH CHECK (auth_role() IN ('admin', 'coordenacao', 'coordenador_esportivo'));

-- ─── 8. eventos_jogo ─────────────────────────────────────────────────────────
-- Placar ao vivo, gerido pelo app via requireCoordOrAdmin().
DROP POLICY IF EXISTS "delete_authenticated" ON public.eventos_jogo;
DROP POLICY IF EXISTS "insert_authenticated" ON public.eventos_jogo;
CREATE POLICY "eventos_jogo: write coord+"
  ON public.eventos_jogo FOR ALL TO authenticated
  USING (is_coord_or_admin())
  WITH CHECK (is_coord_or_admin());
