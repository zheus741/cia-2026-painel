-- Fix: UPPER(NEW.funcao) falha porque funcao é enum funcao_equipe, não text.
-- Solução: cast explícito para text antes do UPPER().

CREATE OR REPLACE FUNCTION public.notify_turno_escala()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setor_nome TEXT;
  v_dia_txt    TEXT;
  v_titulo     TEXT;
  v_corpo      TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.user_id IS NOT DISTINCT FROM NEW.user_id
       AND OLD.setor_id IS NOT DISTINCT FROM NEW.setor_id
       AND OLD.inicio IS NOT DISTINCT FROM NEW.inicio
       AND OLD.funcao IS NOT DISTINCT FROM NEW.funcao
    THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT nome INTO v_setor_nome FROM setores WHERE id = NEW.setor_id;

  SELECT nome_dia || ' ' || TO_CHAR(data, 'DD/MM')
    INTO v_dia_txt
    FROM dias_evento WHERE id = NEW.dia_id;

  IF TG_OP = 'INSERT' THEN
    v_titulo := 'Voce foi escalado';
    v_corpo  :=
      COALESCE(v_dia_txt, '?') || ' - '
      || COALESCE(v_setor_nome, 'Sem setor') || ' - '
      || UPPER(NEW.funcao::text) || ' - '
      || TO_CHAR(NEW.inicio AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
      || ' ate '
      || TO_CHAR(NEW.fim   AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  ELSE
    v_titulo := 'Sua escala foi atualizada';
    v_corpo  :=
      COALESCE(v_dia_txt, '?') || ' - '
      || COALESCE(v_setor_nome, 'Sem setor') || ' - '
      || UPPER(NEW.funcao::text);
  END IF;

  INSERT INTO notificacoes (user_id, tipo, titulo, corpo, payload)
  VALUES (
    NEW.user_id,
    CASE TG_OP WHEN 'INSERT' THEN 'turno_criado' ELSE 'turno_atualizado' END,
    v_titulo,
    v_corpo,
    jsonb_build_object(
      'turno_id', NEW.id,
      'dia_id',   NEW.dia_id,
      'setor_id', NEW.setor_id,
      'funcao',   NEW.funcao
    )
  );

  RETURN NEW;
END;
$$;
