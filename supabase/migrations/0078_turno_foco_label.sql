-- Foco da cobertura quando NÃO é um jogo da tabela `jogos`.
-- Ex: "🥁 Desafio de Baterias · 3ª Divisão", "📣 Cheerleading", "🏊 Natação".
-- Baterias/cheer/individuais não têm linha em `jogos` (não têm setor/agenda no
-- sistema), então o foco fica guardado como rótulo. Mutuamente exclusivo com
-- jogo_id na prática: jogo real → jogo_id; resto → foco_label.
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS foco_label text;

COMMENT ON COLUMN turnos.foco_label IS
  'Rótulo do foco da cobertura quando não é um jogo (bateria, cheer, individual). Exclusivo com jogo_id.';
