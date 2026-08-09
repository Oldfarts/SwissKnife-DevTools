import { runRestPlaywrightTest } from './testExecution1.spec.ts';
import { runSoapPlaywrightTest } from './testExecution2.spec.ts';
import { analyzeFailure, DEFAULT_AGENT_STRATEGY, inspectUi } from './agentHelpers';
import fs from 'fs/promises';

function logAgent(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[🤖 ITSEKORJAUTUVA AGENTTI ${timestamp}] ${message}`);
}

async function runAgentPipeline() {
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
`.trim();

  try {
    await fs.writeFile('ajon-yhteenveto.txt', reportContent);
    logAgent('📄 Yhteenveto kirjoitettu onnistuneesti tiedostoon: ajon-yhteenveto.txt');
  } catch (err) {
    console.error('❌ Yhteenvedon kirjoitus epäonnistui:', err);
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