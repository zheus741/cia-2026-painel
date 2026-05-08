-- 0009: parceiros, escala foto/video e notificacoes

CREATE TABLE IF NOT EXISTS parceiros (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  tipo       TEXT CHECK (tipo IN ('foto', 'video', 'ambos')) DEFAULT 'ambos',
  cor_hex    TEXT DEFAULT '#2e6b42',
  ativo      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO parceiros (nome, tipo, cor_hex) VALUES
  ('OLHARR',     'foto',  '#2e6b42'),
  ('ENTAOTOMA',  'video', '#1a5c5c'),
  ('NIX VIDEO',  'video', '#4a2e6b'),
  ('CURUCLICKS', 'ambos', '#b07a0a')
ON CONFLICT DO NOTHING;

ALTER TABLE parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parceiros_read_all" ON parceiros
  FOR SELECT USING (TRUE);

CREATE POLICY "parceiros_write_coord" ON parceiros
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'coordenacao')
    )
  );

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES parceiros(id);

ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS parceiro_id         UUID REFERENCES parceiros(id),
  ADD COLUMN IF NOT EXISTS prioridade          TEXT CHECK (prioridade IN ('alta', 'media', 'baixa')) DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS briefing_editorial  TEXT,
  ADD COLUMN IF NOT EXISTS conteudos_esperados TEXT,
  ADD COLUMN IF NOT EXISTS status_escala       TEXT CHECK (status_escala IN ('rascunho', 'confirmado', 'em_campo', 'finalizado', 'faltou')) DEFAULT 'rascunho';

ALTER TABLE setores
  ADD COLUMN IF NOT EXISTS tem_wifi        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tem_ponto_apoio BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alimentacao     TEXT CHECK (alimentacao IN ('praca_staff', 'voucher', 'nenhuma')),
  ADD COLUMN IF NOT EXISTS maps_url        TEXT,
  ADD COLUMN IF NOT EXISTS notas_acesso    TEXT;

CREATE TABLE IF NOT EXISTS notificacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  corpo      TEXT,
  lida       BOOLEAN DEFAULT FALSE,
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificacoes_own" ON notificacoes
  FOR ALL USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION notify_turno_escala()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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
      || UPPER(NEW.funcao) || ' - '
      || TO_CHAR(NEW.inicio AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
      || ' ate '
      || TO_CHAR(NEW.fim   AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  ELSE
    v_titulo := 'Sua escala foi atualizada';
    v_corpo  :=
      COALESCE(v_dia_txt, '?') || ' - '
      || COALESCE(v_setor_nome, 'Sem setor') || ' - '
      || UPPER(NEW.funcao);
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

DROP TRIGGER IF EXISTS trg_notify_turno ON turnos;

CREATE TRIGGER trg_notify_turno
  AFTER INSERT OR UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION notify_turno_escala();
