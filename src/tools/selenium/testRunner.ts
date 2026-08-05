import fs from 'fs';
import path from 'path';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  title?: string;
}

// Pääfunktio, joka suorittaa kaikki Selenium-testit annetusta kansiosta
async function main() {
  const testsDir = path.resolve('src/tools/selenium/tests');
  console.log('🚀 Käynnistetään Selenium-testisarja...');
  
  const results = await runAllSeleniumTests(testsDir);
  
  console.log('📊 TESTIEN LOPPUTULOKSET:', results);
}

// Käynnistetään pääfunktio, jos tiedosto suoritetaan suoraan
main();

// Funktio, joka suorittaa kaikki testit annetusta kansiosta
export async function runAllSeleniumTests(testsDir: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  if (!fs.existsSync(testsDir)) {
    throw new Error(`Testikansiota ei löydy polusta: ${testsDir}`);
  }

  // Etsitään kaikki .ts tai .js tiedostot annetusta kansiosta
  const files = fs.readdirSync(testsDir).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
  
  console.log(`📂 Löydetty ${files.length} testitiedostoa kansiosta: ${testsDir}`);

  for (const file of files) {
    const testName = path.basename(file, path.extname(file));
    const fullPath = path.resolve(testsDir, file);
    
    console.log(`🚀 Suoritetaan testi: ${testName}...`);

    try {
      // Tuodaan testi dynaamisesti lennossa
      // Huom: Käytettäessä tsx-työkalua dynaaminen import toimii suoraan myös .ts tiedostoille
      const testModule = await import(`file://${fullPath}`);
      
      // Oletetaan, että testitiedostossa on exportattuna funktio, esim. runTest tai sama kuin aiemmin
      const testFunction = testModule.runTest || testModule.runSeleniumAutomation;

      if (typeof testFunction !== 'function') {
        throw new Error(`Tiedostosta ${file} ei löytynyt kelvollista testifunktiota (runTest / runSeleniumAutomation).`);
      }

      // Suoritetaan testi
      const testResult = await testFunction();
      
      results.push({
        testName,
        success: testResult.success !== false,
        title: testResult.title,
        error: testResult.error
      });

      console.log(`✅ Testi ${testName} läpäisty!`);
    } catch (err: any) {
      console.error(`❌ Testi ${testName} epäonnistui:`, err.message);
      results.push({
        testName,
        success: false,
        error: err.message
      });
    }
  }

  return results;
}