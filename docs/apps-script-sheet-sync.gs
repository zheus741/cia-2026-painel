/**
 * CIA 2026 — Sincronização Planilha → Painel (realtime)
 * ─────────────────────────────────────────────────────
 * Cole este script no editor de Apps Script da planilha de resultados
 * (Extensões → Apps Script), ajuste as 2 constantes abaixo, salve e rode
 * uma vez a função `instalarGatilho` (autoriza e cria o gatilho onEdit).
 *
 * A partir daí, toda edição na planilha dispara o webhook do painel, que
 * relê os resultados e atualiza os jogos automaticamente (~2s).
 */

// 1) URL do painel + rota do webhook (troque pelo domínio de produção):
const WEBHOOK_URL = 'https://SEU-DOMINIO.vercel.app/api/sheet-sync';

// 2) Mesmo valor configurado na env SHEET_SYNC_SECRET do painel:
const SECRET = 'COLE-O-MESMO-SEGREDO-AQUI';

/** Dispara o webhook (debounce de 4s pra não floodar em edições rápidas). */
function dispararSync() {
  const props = PropertiesService.getScriptProperties();
  const agora = Date.now();
  const ultimo = Number(props.getProperty('ultimoSync') || 0);
  // Marca pendência e agenda; evita 1 request por tecla.
  props.setProperty('pendente', '1');
  if (agora - ultimo < 4000) return;
  enviar_();
}

function enviar_() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ultimoSync', String(Date.now()));
  props.deleteProperty('pendente');
  try {
    UrlFetchApp.fetch(WEBHOOK_URL + '?secret=' + encodeURIComponent(SECRET), {
      method: 'post',
      muteHttpExceptions: true,
    });
  } catch (e) {
    // silencioso — o gatilho de tempo (abaixo) cobre falhas pontuais
  }
}

/** Gatilho de edição — chamado automaticamente a cada alteração. */
function aoEditar(e) {
  dispararSync();
}

/** Backup: roda a cada 1 min e envia se houver edição pendente. */
function syncPeriodico() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('pendente') === '1') enviar_();
}

/** Rode UMA VEZ pra instalar os gatilhos (vai pedir autorização). */
function instalarGatilho() {
  const ss = SpreadsheetApp.getActive();
  // Remove gatilhos antigos deste script
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  // onEdit instalável (pode usar UrlFetchApp)
  ScriptApp.newTrigger('aoEditar').forSpreadsheet(ss).onEdit().create();
  // Backup periódico de 1 min
  ScriptApp.newTrigger('syncPeriodico').timeBased().everyMinutes(1).create();
  // Testa uma chamada agora
  enviar_();
}
