-- 0036: corrige política UPDATE em checklist_itens para não-coordenadores
--
-- Problema raiz:
--   A política "checklist_itens: update próprio ou coord+" (criada em 0007)
--   usa USING (operador_id = auth.uid() OR is_coord_or_admin()).
--
--   Itens criados por instanciar_checklist chegam com operador_id = NULL.
--   Em SQL, NULL = auth.uid() avalia como NULL (não TRUE), então o RLS
--   bloqueia qualquer UPDATE de usuário não-coord em itens nunca marcados.
--   Resultado: toda a equipe (exceto coord/admin) estava impossibilitada
--   de marcar qualquer item como feito.
--
-- Solução:
--   Adicionar "operador_id IS NULL" ao USING — itens não reclamados podem
--   ser atualizados por qualquer autenticado. Após o UPDATE, operador_id
--   passa a ser auth.uid(), então o WITH CHECK é satisfeito e o item fica
--   "reclamado" pelo operador que marcou primeiro.

DROP POLICY IF EXISTS "checklist_itens: update próprio ou coord+" ON public.checklist_itens;

CREATE POLICY "checklist_itens: update próprio ou coord+"
  ON public.checklist_itens FOR UPDATE TO authenticated
  USING  (operador_id IS NULL OR operador_id = auth.uid() OR is_coord_or_admin())
  WITH CHECK (operador_id = auth.uid() OR is_coord_or_admin());
