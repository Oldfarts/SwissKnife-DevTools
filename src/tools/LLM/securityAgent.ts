import { chromium } from 'playwright';
import { runRestPlaywrightTest } from './testExecution1.spec.ts';
import { runSoapPlaywrightTest } from './testExecution2.spec.ts';
import { analyzeFailure, DEFAULT_AGENT_STRATEGY } from './agentHelpers.ts';
import { ALL_TOOLS, AVAILABLE_PLUGINS } from '../index.ts';
import fs from 'fs/promises';

const capturedLogLines: string[] = [];
const originalConsoleLog = console.log.bind(console);
const originalConsoleError = console.error.bind(console);
let isCapturing = false;

type TestCasePlan = {
  id: string;
  name: string;
  description: string;
  status: 'planned' | 'passed' | 'failed' | 'skipped';
  details: string[];
};

type ExecutionMode = 'all' | 'dynamic' | 'fixed';

function parseExecutionMode(argv: string[]): ExecutionMode {
  const modeFlagIndex = argv.findIndex((arg) => arg === '--mode' || arg.startsWith('--mode='));
  if (modeFlagIndex === -1) {
    return 'all';
  }

  const rawValue = argv[modeFlagIndex] === '--mode'
    ? argv[modeFlagIndex + 1]
    : argv[modeFlagIndex].split('=')[1];

  switch (rawValue?.toLowerCase()) {
    case 'dynamic':
      return 'dynamic';
    case 'fixed':
      return 'fixed';
    default:
      return 'all';
  }
}

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

function logAgent(message: string) {
  const timestamp = new Date().toISOString();
  const entry = `[🤖 ITSEKORJAUTUVA AGENTTI ${timestamp}] ${message}`;
  capturedLogLines.push(entry);
  console.log(entry);
}

function logAgentSummary(message: string) {
  capturedLogLines.push(message);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLocalizedPatterns(value: string) {
  const normalized = value.trim().toLowerCase();
  const aliases = new Set<string>([normalized]);

  const translations: Record<string, string[]> = {
    'developer tools': ['developer tools', 'kehittäjän työkalut'],
    'kehittäjän työkalut': ['kehittäjän työkalut', 'developer tools'],
    'cloud services': ['cloud services', 'pilvipalvelut'],
    'pilvipalvelut': ['pilvipalvelut', 'cloud services'],
    'external plugins': ['external plugins', 'ulkopuoliset pluginit'],
    'ulkopuoliset pluginit': ['ulkopuoliset pluginit', 'external plugins'],
    'dev & data': ['dev & data', 'kehitys & data'],
    'other': ['other', 'muut'],
    'muut': ['muut', 'other'],
  };

  for (const [key, variants] of Object.entries(translations)) {
    if (key === normalized || variants.includes(normalized)) {
      variants.forEach((variant) => aliases.add(variant));
    }
  }

  if (normalized.includes('tool')) {
    aliases.add(normalized.replace(/tool/g, 'työkalu'));
  }
  if (normalized.includes('työkalu')) {
    aliases.add(normalized.replace(/työkalu/g, 'tool'));
  }

  return [...aliases].filter(Boolean);
}

function buildToolNameAliases(tool: { id: string; name?: string | { fi?: string; en?: string }; type?: string; category?: string | { fi?: string; en?: string } }) {
  const names = [
    typeof tool.name === 'string' ? tool.name : tool.name?.fi || tool.name?.en || tool.id,
    typeof tool.name === 'object' ? tool.name?.fi : undefined,
    typeof tool.name === 'object' ? tool.name?.en : undefined,
    tool.id,
  ].filter(Boolean) as string[];

  const aliases = new Set<string>();
  names.forEach((name) => {
    const baseAliases = buildLocalizedPatterns(name);
    baseAliases.forEach((alias) => aliases.add(alias));
    const compact = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (compact) {
      aliases.add(compact);
      aliases.add(compact.replace(/\s+/g, ''));
    }
  });

  return [...aliases];
}

async function expandToolCategories(page: any, categoryName?: string) {
  const defaultCategoryCandidates = [
    'Dev & Data',
    'Kehitys & Data',
    'Network & API',
    'Verkko & API',
    'Security & Crypto',
    'Tietoturva & Kryptografia',
    'Developer Tools',
    'Kehittäjän työkalut',
    'Cloud Services',
    'Pilvipalvelut',
    'External Plugins',
    'Ulkopuoliset pluginit',
    'Other',
    'Muut',
  ];

  const candidates = [categoryName, ...defaultCategoryCandidates].filter(Boolean) as string[];
  const uniqueCandidates = [...new Set(candidates.flatMap((candidate) => buildLocalizedPatterns(candidate)))];

  for (const candidate of uniqueCandidates) {
    const categoryButton = page.getByRole('button', { name: new RegExp(escapeRegExp(candidate), 'i') }).first();
    if (await categoryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categoryButton.click();
      await page.waitForTimeout(400);
    }
  }
}

async function findAndOpenToolInUi(page: any, toolNames: string | string[], categoryName?: string) {
  const candidates = Array.isArray(toolNames) ? toolNames : [toolNames];

  // 1. Ensisijainen tapa: Etsitään valikon/kategorioiden kautta osittaistuella (like)
  logAgent(`📂 Etsitään työkalua valikosta / kategorioista osittaistuella...`);
  await expandToolCategories(page, categoryName);

  const patterns = [...new Set(candidates.flatMap((name) => buildLocalizedPatterns(name)))];

  for (const candidate of patterns) {
    const locator = page.getByText(new RegExp(escapeRegExp(candidate), 'i'), { exact: false });
    const count = await locator.count();

    if (count === 1) {
      const targetElement = locator.first();
      await targetElement.click();
      logAgent(`✅ Löytyi valikosta yksiselitteisellä osumalla hakusanalla: "${candidate}"`);
      return targetElement;
    } else if (count > 1) {
      logAgent(`⚠️ Löytyi ${count} osumaa hakusanalla "${candidate}". Yritetään tarkentaa...`);
      for (let i = 0; i < count; i++) {
        const item = locator.nth(i);
        const text = await item.textContent() || '';
        if (text.toLowerCase().includes(candidate.toLowerCase())) {
          await item.click();
          logAgent(`✅ Tarkennettu osuma valittu (${text.trim()})`);
          return item;
        }
      }
      const firstItem = locator.first();
      await firstItem.click();
      return firstItem;
    }
  }

  // 2. Toissijainen tapa (Fallback): Jos valikosta ei löytynyt, kokeillaan hakukenttää
  logAgent(`ℹ️ Valikosta ei löytynyt sopivaa, kokeillaan hakukenttää...`);
  const primarySearchTerm = candidates.find(c => !/[äöå]/i.test(c)) || candidates.get?.(0) || candidates[0] || '';
  
  const searchInput = page.locator('input[type="search"], input[type="text"], input').first();
  if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    logAgent(`🔍 Kirjoitetaan hakukenttään: "${primarySearchTerm}"`);
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.fill(primarySearchTerm);
    await page.waitForTimeout(1000);

    const resultLocator = page.getByText(new RegExp(escapeRegExp(primarySearchTerm), 'i'), { exact: false });
    const resultCount = await resultLocator.count();

    if (resultCount >= 1) {
      const target = resultLocator.first();
      await target.click();
      logAgent(`✅ Löytyi hakukentän kautta!`);
      return target;
    }
  }

  return null;
}

async function runLocalToolPlaywrightTest(plan: TestCasePlan, strategy: typeof DEFAULT_AGENT_STRATEGY) {
  logAgent(`🚀 Käynnistetään sisäisen työkalun Playwright-testaus: ${plan.name}`);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000);

    const openToolsButton = page.getByRole('button', { name: /Open Tools|Avaa työkalut/i }).first();
    if (await openToolsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openToolsButton.click();
      await page.waitForTimeout(2500);
    }

    const toolName = plan.details.find((d) => d.startsWith('Kohde:'))?.replace(/^Kohde:\s*/, '').trim() || plan.name;
    const toolCategory = plan.details.find((d) => d.startsWith('Kategoria:'))?.replace(/^Kategoria:\s*/, '').trim();
    const toolAliases = plan.details
      .filter((d) => d.startsWith('Hakusanat:'))
      .flatMap((d) => d.replace(/^Hakusanat:\s*/, '').split('|').map((a) => a.trim()).filter(Boolean));

    const toolTarget = await findAndOpenToolInUi(page, toolAliases.length > 0 ? toolAliases : [toolName], toolCategory);

    if (toolTarget) {
      await page.waitForTimeout(1500);
      logAgent(`🧰 Valittiin sisäinen työkalu UI:ssa: ${toolName}`);
    } else {
      return { success: false, error: `Tool not found in UI or did not respond: ${toolName}` };
    }

    const runToolButton = page.getByRole('button', { name: /Run Tool|Suorita työkalu/i }).first();
    if (await runToolButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      logAgent(`🔘 Löydettiin suorituspainike. Klikataan sitä...`);
      await runToolButton.click();
      
      try {
        await page.waitForFunction(
          () => {
            const text = document.body.innerText || '';
            return /execution succeed|onnistui|success|execution failed|virhe|error/i.test(text);
          },
          { timeout: 8000 }
        );
        logAgent(`⚡ Ajo valmistui ja tulos havaittiin.`);
      } catch (e) {
        logAgent(`⚠️ Työkalu ei vastannut tai odotusaika ylittyi.`);
        return { success: false, error: 'Tool execution timed out or did not respond' };
      }
    } else {
      logAgent(`⚠️ Suorituspainiketta ei löytynyt, työkalu ei vastaa odotetusti.`);
      return { success: false, error: 'Run Tool button not found, tool unresponsive' };
    }

    // Tiukka virheentarkistus elementeille ja sisällölle
    const errorLocator = page.locator('text=/execution failed|virhe|invalid|epäonnistui|error|failed/i');
    const hasErrorElement = await errorLocator.count() > 0;

    const pageText = await page.locator('body').textContent() || '';

    if (hasErrorElement) {
      logAgent(`❌ Havaittiin virheelementti tai virheteksti (esim. Execution failed) käyttöliittymässä.`);
      return { success: false, error: 'UI element reported execution failed or error state' };
    }

    const hasSuccessText = /execution succeed|onnistui|success|tulos|result/i.test(pageText);

    if (!hasSuccessText) {
      logAgent(`⚠️ Puuttuva onnistumisilmoitus sivulla.`);
      return { success: false, error: 'No success message detected on page' };
    }

    return { success: true }; 

  } catch (error) {
    return { success: false, error: String(error) };
  } finally {
    await browser.close();
  }
}

async function loadOrGenerateTestPlans(): Promise<TestCasePlan[]> {
  const planFilePath = 'test-plan.json';

  try {
    const fileData = await fs.readFile(planFilePath, 'utf-8');
    const parsed = JSON.parse(fileData);
    
    if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
      logAgent(`📂 Löydettiin testisuunnitelma tiedostosta: ${planFilePath} (${parsed.steps.length} kpl)`);
      
      return parsed.steps.map((step: any, index: number) => {
        const matchingTool = ALL_TOOLS.find(t => t.id === step.id) || ALL_TOOLS[index % ALL_TOOLS.length];
        const toolAliases = buildToolNameAliases(matchingTool as any);
        const categoryName = typeof matchingTool.category === 'object' ? matchingTool.category.en || matchingTool.category.fi : matchingTool.category;
        const toolName = typeof matchingTool.name === 'object' ? (matchingTool.name.en || matchingTool.name.fi) : matchingTool.name;

        return {
          id: matchingTool.id || `tool-${index}`,
          name: `Dynamic tool test: ${toolName}`,
          description: step.description || `Testataan työkalua ${toolName}`,
          status: 'planned' as const,
          details: [
            `Kohde: ${toolName}`,
            `Tyyppi: ${matchingTool.type || 'local'}`,
            `Kategoria: ${categoryName || 'Dev & Data'}`,
            `Hakusanat: ${toolAliases.join(' | ')}`,
            `Testiarvot: ${JSON.stringify(step.testData || {})}`
          ]
        };
      });
    }
  } catch (e) {
    logAgent(`ℹ️ Testisuunnitelmatiedostoa ei löytynyt. Luodaan automaattisesti kaikille ${ALL_TOOLS.length} työkalulle...`);
  }

  const allSteps = ALL_TOOLS.map(t => ({
    id: t.id,
    name: typeof t.name === 'object' ? (t.name.en || t.name.fi) : t.name,
    description: `Testataan työkalua ${t.id}`,
    selector: "button",
    testData: {}
  }));

  await fs.writeFile(planFilePath, JSON.stringify({ steps: allSteps }, null, 2), 'utf-8');
  logAgent(`💾 Tallennettiin testisuunnitelma tiedostoon: ${planFilePath}`);

  return loadOrGenerateTestPlans();
}

async function runAgentPipeline() {
  installLogCapture();
  const selectedMode = parseExecutionMode(process.argv.slice(2));
  logAgent(`Käynnistetään autonominen ja dynaaminen agenttiputki (Tiedosto + Playwright)...`);
  logAgent(`🧭 Valittu suoritusmuoto: ${selectedMode}`);

  const startTime = new Date();
  const maxAttempts = 3;
  const runFixedTests = selectedMode === 'all' || selectedMode === 'fixed';
  const runDynamicTests = selectedMode === 'all' || selectedMode === 'dynamic';

  const generatedToolTests = runDynamicTests ? await loadOrGenerateTestPlans() : [];

  const testPlans: TestCasePlan[] = [
    {
      id: 'rest-flow',
      name: 'REST workflow smoke test',
      description: 'Tarkistaa REST-työnkulun perusinstallaation.',
      status: 'planned',
      details: ['Avaa sovellus', 'Suorita workflow', 'Tarkista tulos']
    },
    {
      id: 'soap-flow',
      name: 'SOAP workflow smoke test',
      description: 'Tarkistaa SOAP-työnkulun WSDL- ja SOAP-pyynnön käsittelyn.',
      status: 'planned',
      details: ['Avaa sovellus', 'Syötä SOAP-pyyntö', 'Tarkista tulos']
    },
    ...generatedToolTests,
  ];

  const fixedPlans = testPlans.filter((plan) => plan.id === 'rest-flow' || plan.id === 'soap-flow');
  const dynamicPlans = testPlans.filter((plan) => !plan.id.includes('flow'));

  if (!runFixedTests) {
    fixedPlans.forEach((plan) => {
      plan.status = 'skipped';
      plan.details.push('Ohitettu, koska valittu suoritusmuoto oli dynamic.');
    });
  }

  if (!runDynamicTests) {
    dynamicPlans.forEach((plan) => {
      plan.status = 'skipped';
      plan.details.push('Ohitettu, koska valittu suoritusmuoto oli fixed.');
    });
  }

async function executeGeneratedCase(plan: TestCasePlan, strategy: typeof DEFAULT_AGENT_STRATEGY) {
  const caseName = plan.name;
  logAgent(`🧪 Suoritetaan dynaaminen testitapaus: ${caseName}`);
  let attempts = 0;
  let success = false;
  let currentStrategy = { ...strategy };

  while (attempts < maxAttempts && !success) {
    attempts++;

    // Jos tämä on toinen tai kolmas yritys (epäselvä / mennyt uudelle kierrokselle), 
    // generoidaan tarvittaessa testidataa, jos se oli tyhjä {}
    const testDataDetailIndex = plan.details.findIndex(d => d.startsWith('Testiarvot:'));
    if (attempts > 1 && testDataDetailIndex !== -1) {
      logAgent(`🧠 Yritys ${attempts}: Generoidaan dynaamista testidataa testille ${caseName}...`);
      
      // Luodaan älykkäästi testidataa työkalun tyypin tai nimen perusteella
      const generatedMockData = plan.name.toLowerCase().includes('json') 
        ? { input: '{"test": "data", "valid": true}' }
        : plan.name.toLowerCase().includes('hash') || plan.name.toLowerCase().includes('crypto')
        ? { input: 'Salasana123!' }
        : { query: 'test-value', payload: 'sample' };

      plan.details[testDataDetailIndex] = `Testiarvot: ${JSON.stringify(generatedMockData)}`;
      logAgent(`✨ Generoitu testidata: ${JSON.stringify(generatedMockData)}`);
    }

    const result = await runLocalToolPlaywrightTest(plan, currentStrategy);

    if (result.success) {
      plan.status = 'passed';
      plan.details.push('Testitapaus läpäistiin onnistuneesti.');
      logAgent(`✅ Testitapaus läpäisty: ${caseName}`);
      return true;
    } else {
      const analysis = analyzeFailure(result.error || 'Työkalu ei vastannut', currentStrategy);
      currentStrategy = analysis.updatedStrategy;
      logAgent(`⚠️ Yritys ${attempts}/${maxAttempts} epäonnistui. Syy: ${analysis.reason}`);

      if (attempts >= maxAttempts) {
        plan.status = 'failed';
        plan.details.push(`Epäonnistui / Ei vastannut: ${result.error}`);
        logAgent(`❌ Testitapaus epäonnistui lopullisesti / Ei vastannut: ${caseName}`);
      } else {
        logAgent(`🔄 Odotetaan ${currentStrategy.retryDelayMs} ms ennen uutta yritystä...`);
        await new Promise((res) => setTimeout(res, currentStrategy.retryDelayMs));
      }
    }
  }

  if (plan.status === 'planned') {
    plan.status = 'failed';
    plan.details.push('Testi ei vastannut tai sen suoritus keskeytyi.');
  }

  return false;
}

  // --- REST & SOAP AJOSILMUKAT ---
  let restSuccess = false, restAttempts = 0, restStrategy = { ...DEFAULT_AGENT_STRATEGY };
  if (runFixedTests) {
    while (restAttempts < maxAttempts && !restSuccess) {
      restAttempts++;
      const result = await runRestPlaywrightTest(restStrategy);
      if (result.success) {
        restSuccess = true;
        testPlans.find(p => p.id === 'rest-flow')!.status = 'passed';
      } else {
        const analysis = analyzeFailure(result.error || 'Virhe', restStrategy);
        restStrategy = analysis.updatedStrategy;
        await new Promise(r => setTimeout(r, restStrategy.retryDelayMs));
      }
    }
    const restPlan = testPlans.find(p => p.id === 'rest-flow');
    if (restPlan && restPlan.status === 'planned') {
      restPlan.status = 'failed';
      restPlan.details.push('REST-työkalu ei vastannut.');
    }
  }

  let soapSuccess = false, soapAttempts = 0, soapStrategy = { ...DEFAULT_AGENT_STRATEGY };
  if (runFixedTests) {
    while (soapAttempts < maxAttempts && !soapSuccess) {
      soapAttempts++;
      const result = await runSoapPlaywrightTest(soapStrategy);
      if (result.success) {
        soapSuccess = true;
        testPlans.find(p => p.id === 'soap-flow')!.status = 'passed';
      } else {
        const analysis = analyzeFailure(result.error || 'Virhe', soapStrategy);
        soapStrategy = analysis.updatedStrategy;
        await new Promise(r => setTimeout(r, soapStrategy.retryDelayMs));
      }
    }
    const soapPlan = testPlans.find(p => p.id === 'soap-flow');
    if (soapPlan && soapPlan.status === 'planned') {
      soapPlan.status = 'failed';
      soapPlan.details.push('SOAP-työkalu ei vastannut.');
    }
  }

  // --- DYNAAMISTEN TESTIEN LOOPPAUS ---
  if (runDynamicTests) {
    logAgent(`--- Aloitetaan dynaamiset testitapaukset (${dynamicPlans.length} kpl) ---`);
    for (const plan of dynamicPlans) {
      await executeGeneratedCase(plan, { ...DEFAULT_AGENT_STRATEGY });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Varmistetaan vielä kerran katsomalla läpi, ettei yhtään "planned"-tilaan jäänyttä unohdeta
  testPlans.forEach(plan => {
    if (plan.status === 'planned') {
      plan.status = 'failed';
      plan.details.push('Testi ei vastannut tai ohitettiin virheellisesti.');
    }
  });

  // --- LASKURIT JA RAPORTOINTI ---
  const passedCount = testPlans.filter(p => p.status === 'passed').length;
  const failedCount = testPlans.filter(p => p.status === 'failed').length;
  const skippedCount = testPlans.filter(p => p.status === 'skipped').length;
  const totalCount = testPlans.length;

  const failedTests = testPlans.filter(p => p.status === 'failed');

  const endTime = new Date();
  const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  const allSuccess = failedCount === 0;

  const testPlanSection = testPlans
    .map((plan) => `- [${plan.status.toUpperCase()}] ${plan.name}\n  ${plan.description}\n  ${plan.details.map((detail) => `    • ${detail}`).join('\n')}`)
    .join('\n\n');

  const failedSummarySection = failedTests.length > 0
    ? failedTests.map(f => `❌ ${f.name} (ID: ${f.id})\n   Syy / Viimeisin tila: ${f.details[f.details.length - 1]}`).join('\n\n')
    : '✨ Ei epäonnistuneita tai vastaamattomia testejä!';

  const reportContent = `
=========================================
🤖 ITSEKORJAUTUVA AGENTIN AJORAPORTTI (LLM)
=========================================
Ajo suoritettu: ${endTime.toISOString()}
Kokonaiskesto: ${durationSec} sekuntia

📊 TESTITULOSTEN YHTEENVETO:
- Yhteensä: ${totalCount} kpl
- ✅ Läpäisty: ${passedCount} kpl
- ❌ Epäonnistunut / Ei vastannut: ${failedCount} kpl
- ⏭️ Ohitettu: ${skippedCount} kpl

LOPPUTULOS: ${allSuccess ? 'KAIKKI TESTIT LÄPÄISTY ✨' : `AJOPUTKI KESKEYTYI VIRHEISIIN (${failedCount} kpl epäonnistui / ei vastannut) ❌`}

=========================================
❌ EPÄONNISTUNEET TAI VASTAAMATTOMAT TESTIT:
=========================================
${failedSummarySection}

=========================================
TESTISUUNNITELMA (TIEDOSTO + PLAYWRIGHT):
=========================================
${testPlanSection}

=========================================
AJO LOKI:
=========================================
${capturedLogLines.map(e => `- ${e}`).join('\n')}
=========================================
`.trim();

  await fs.writeFile('ajon-yhteenveto.txt', reportContent);
  logAgentSummary('📄 Yhteenveto kirjoitettu tiedostoon: ajon-yhteenveto.txt');
  
  if (failedCount > 0) {
    logAgent(`❌ Ajossa epäonnistui tai ei vastannut yhteensä ${failedCount} testitapausta. Tarkista tiedosto ajon-yhteenveto.txt`);
  }

  process.exit(allSuccess ? 0 : 1);
}

runAgentPipeline();