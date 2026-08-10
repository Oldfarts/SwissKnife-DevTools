import { runRestPlaywrightTest } from './testExecution1.spec.ts';
import { runSoapPlaywrightTest } from './testExecution2.spec.ts';
import { analyzeFailure, DEFAULT_AGENT_STRATEGY } from './agentHelpers.ts';
import fs from 'fs/promises';

const capturedLogLines: string[] = [];
const originalConsoleLog = console.log.bind(console);
const originalConsoleError = console.error.bind(console);
let isCapturing = false;

function installLogCapture() {
  if (isCapturing) {
    return;
  }

  console.log = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(' ');
    capturedLogLines.push(message);
    originalConsoleLog(message);
  };

  console.error = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(' ');
    capturedLogLines.push(message);
    originalConsoleError(message);
  };

  isCapturing = true;
}

function restoreLogCapture() {
  if (!isCapturing) {
    return;
  }

  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  isCapturing = false;
}

function logAgent(message: string) {
  const timestamp = new Date().toISOString();
  const entry = `[🤖 ITSEKORJAUTUVA AGENTTI ${timestamp}] ${message}`;
  capturedLogLines.push(entry);
  console.log(entry);
}

function logAgentSummary(message: string) {
  capturedLogLines.push(message);
}

async function runAgentPipeline() {
  installLogCapture();
  logAgent('Käynnistetään autonominen ja dynaaminen agenttiputki (REST + SOAP)...');

  const startTime = new Date();
  const maxAttempts = 3;

  // ==========================================
  // 1. REST-TESTIN AJOSILMUKKA
  // ==========================================
  logAgent('--- Aloitetaan REST-testiputki ---');
  let restSuccess = false;
  let restAttempts = 0;
  let lastRestError = '';
  let restStrategy = { ...DEFAULT_AGENT_STRATEGY };

  while (restAttempts < maxAttempts && !restSuccess) {
    restAttempts++;
    logAgent(`REST-yritys ${restAttempts}/${maxAttempts}: Suoritetaan testiputki...`);

    const result = await runRestPlaywrightTest(restStrategy);

    if (result.success) {
      restSuccess = true;
      logAgent('✨ REST-testiputki läpäisty täydellisesti!');
    } else {
      lastRestError = result.error || 'Tuntematon virhe';
      logAgent(`⚠️ Havainto: REST-testi kohtasi virheen: "${lastRestError}"`);

      const analysis = analyzeFailure(lastRestError, restStrategy);
      restStrategy = analysis.updatedStrategy;
      logAgent(`🧠 Agentin analyysi: ${analysis.reason}`);
      logAgent(`🛠️ Suositus: ${analysis.suggestedAction}`);

      if (restAttempts < maxAttempts && analysis.shouldRetry) {
        logAgent(`🔄 Itsekorjaus: Odotetaan ${restStrategy.retryDelayMs} ms ennen uutta REST-yritystä...`);
        await new Promise(resolve => setTimeout(resolve, restStrategy.retryDelayMs));
      }
    }
  }

  // ==========================================
  // 2. SOAP-TESTIN AJOSILMUKKA
  // ==========================================
  logAgent('--- Aloitetaan SOAP-testiputki ---');
  let soapSuccess = false;
  let soapAttempts = 0;
  let lastSoapError = '';
  let soapStrategy = { ...DEFAULT_AGENT_STRATEGY };

  while (soapAttempts < maxAttempts && !soapSuccess) {
    soapAttempts++;
    logAgent(`SOAP-yritys ${soapAttempts}/${maxAttempts}: Suoritetaan testiputki...`);

    const result = await runSoapPlaywrightTest(soapStrategy);

    if (result.success) {
      soapSuccess = true;
      logAgent('✨ SOAP-testiputki läpäisty täydellisesti!');
    } else {
      lastSoapError = result.error || 'Tuntematon virhe';
      logAgent(`⚠️ Havainto: SOAP-testi kohtasi virheen: "${lastSoapError}"`);

      const analysis = analyzeFailure(lastSoapError, soapStrategy);
      soapStrategy = analysis.updatedStrategy;
      logAgent(`🧠 Agentin analyysi: ${analysis.reason}`);
      logAgent(`🛠️ Suositus: ${analysis.suggestedAction}`);

      if (soapAttempts < maxAttempts && analysis.shouldRetry) {
        logAgent(`🔄 Itsekorjaus: Odotetaan ${soapStrategy.retryDelayMs} ms ennen uutta SOAP-yritystä...`);
        await new Promise(resolve => setTimeout(resolve, soapStrategy.retryDelayMs));
      }
    }
  }

  // ==========================================
  // RAPORTOINTI JA LOPPUYHTEENVETO TIEDOSTOON
  // ==========================================
  const endTime = new Date();
  const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  const allSuccess = restSuccess && soapSuccess;
  const logSection = capturedLogLines.length > 0
    ? capturedLogLines.map((entry) => `- ${entry}`).join('\n')
    : '- Ei lokiviestejä tallennettu.';

  const reportContent = `
=========================================
🤖 ITSEKORJAUTUVAN AGENTIN AJORAPORTTI
=========================================
Ajo suoritettu: ${endTime.toISOString()}
Kokonaiskesto: ${durationSec} sekuntia

TULOKSET:
- REST Workflow Test: ${restSuccess ? '✅ LÄPÄISTY' : '❌ EPÄONNISTUI'} (Yrityksiä: ${restAttempts})
${lastRestError ? `  Viimeisin REST-virhe: ${lastRestError}` : ''}

- SOAP Workflow Test: ${soapSuccess ? '✅ LÄPÄISTY' : '❌ EPÄONNISTUI'} (Yrityksiä: ${soapAttempts})
${lastSoapError ? `  Viimeisin SOAP-virhe: ${lastSoapError}` : ''}

LOPPUTULOS: ${allSuccess ? 'KAIKKI AJOT ONNISTUIVAT ✨' : 'AJOPUTKI KESKEYTYI VIRHEISIIN ❌'}

=========================================
AJO LOKI:
=========================================
${logSection}
=========================================
`.trim();

  try {
    await fs.writeFile('ajon-yhteenveto.txt', reportContent);
    logAgentSummary('📄 Yhteenveto kirjoitettu onnistuneesti tiedostoon: ajon-yhteenveto.txt');
  } catch (err) {
    logAgentSummary(`❌ Yhteenvedon kirjoitus epäonnistui: ${err}`);
  }

  if (allSuccess) {
    logAgent('🎯 Kaikki ajot valmiina ja läpäisty!');
    process.exit(0);
  } else {
    logAgent('❌ Agenttiputki päättyi virheisiin.');
    process.exit(1);
  }
}

runAgentPipeline();