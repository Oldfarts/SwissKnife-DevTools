import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Määritellään __dirname ES-moduuleille
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tuodaan sama suoritusmoottori, jota WorkflowBuilder käyttää!
import { executeSwissTool } from './index.ts';



const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const timeArg = args.find(arg => arg.startsWith('--time='));
const workflowArg = args.find(arg => arg.startsWith('--workflow='));

const mode = modeArg ? modeArg.split('=')[1] : 'cron';
const timeValue = timeArg ? timeArg.split('=')[1] : '0 22 * * *';
const workflowPath = workflowArg ? workflowArg.split('=')[1] : path.resolve(__dirname, '../src/example-workflows/työnkulku.json');

function logTimer(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try { fs.appendFileSync('ajastin-loki.txt', logLine); } catch (e) {}
  console.log(message);
}

// Ladataan työnkulku muistiin käynnistyksessä
let currentWorkflow = null;

try {
  if (fs.existsSync(workflowPath)) {
    const rawData = fs.readFileSync(workflowPath, 'utf8');
    currentWorkflow = JSON.parse(rawData);
    if (!currentWorkflow.name || !Array.isArray(currentWorkflow.steps)) {
      throw new Error('Virheellinen työnkulkutiedosto: nimi ja steps-taulukko vaaditaan.');
    }
    logTimer(`✅ Työnkulku ladattu muistiin: "${currentWorkflow.name}" (${currentWorkflow.steps.length} vaihetta)`);
  } else {
    logTimer(`❌ Virhe: Työnkulkutiedostoa ei löytynyt polusta: ${workflowPath}`);
  }
} catch (error) {
  logTimer(`❌ Virhe työnkulun latauksessa: ${error.message}`);
}

logTimer(`🚀 Ajastin käynnistetty. Tila: [${mode}], Aika: [${timeValue}]`);

let isExecuting = false;

// SAMA SUORITUSLOGIIKKA KUIN WORKFLOWBUILDERISSA
async function runWorkflow() {
  if (isExecuting) {
    logTimer('⚠️ Edellinen työnkulku on vielä käynnissä. Ohitetaan tämä ajo.');
    return;
  }

  if (!currentWorkflow || !currentWorkflow.steps) {
    logTimer('❌ Ei työnkulun vaiheita muistissa.');
    return;
  }

  isExecuting = true;
  logTimer(`▶️ Ajastin heräsi! Suoritetaan työnkulku: "${currentWorkflow.name}"`);

  try {
    let previousOutput = '';

    for (let i = 0; i < currentWorkflow.steps.length; i++) {
      const step = currentWorkflow.steps[i];
      
      // Haetaan työkalu rekisteristä (oletuksena projectin tool-listasta tai indexistä)
      // Koska executeSwissTool vaastii tool-objektin, luodaan minimiobjekti tarvittaessa tai haetaan suoraan
      const tool = { id: step.toolId, inputs: step.inputs }; 

      logTimer(`👉 Vaihe #${i + 1} (${step.toolId}) alkaa...`);

      const currentInputs = { ...step.inputs };

      // Siirretään edellisen stepin tulos eteenpäin samalla logiikalla kuin UI:ssa
      if (previousOutput && currentInputs) {
        // Etsitään sopiva kenttä dynaamisesti
        const firstKey = Object.keys(currentInputs)[0];
        if (firstKey && !currentInputs[firstKey]) {
          currentInputs[firstKey] = typeof previousOutput === 'string' 
            ? previousOutput 
            : (previousOutput.url || previousOutput.name || JSON.stringify(previousOutput));
        }
      }

      let res;
      try {
        res = await executeSwissTool(
          tool,
          currentInputs,
          'fi', // Oletuskieli
          (progress, message) => {
            logTimer(`   [Edistyminen] ${progress}%: ${message || ''}`);
          }
        );
      } catch (err) {
        res = { success: false, error: err.message };
      }

      if (res && res.success === false) {
        logTimer(`   ❌ Vaihe #${i + 1} epäonnistui: ${res.error || 'Tuntematon virhe'}`);
      } else {
        logTimer(`   ✅ Vaihe #${i + 1} valmis.`);
      }

      previousOutput = res?.data ?? res;
    }

    logTimer(`✨ Työnkulku "${currentWorkflow.name}" suoritettu onnistuneesti loppuun!`);
  } catch (error) {
    logTimer(`❌ Vakava virhe työnkulussa: ${error.message}`);
  } finally {
    isExecuting = false;
  }
}

if (mode === 'cron') {
  cron.schedule(timeValue, () => {
    runWorkflow();
  });
} else {
  const intervalMs = parseInt(timeValue) * 60 * 1000;
  setInterval(() => {
    runWorkflow();
  }, intervalMs);
}