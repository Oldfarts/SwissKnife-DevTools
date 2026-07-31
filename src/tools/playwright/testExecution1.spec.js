// This testExecution tests:
// 1. install plugins
// 2. REST import
// 3. ZAP vulnerability
// 4. and report 
// 5. and uninstalling the plugins
import { chromium } from 'playwright';
import fs from 'fs';

// Kirjoitetaan loki tiedostoon ja konsoliin
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync('suoritus-loki-rest.txt', logLine);
  } catch (err) {
    console.error('❌ Virhe lokitiedostoon kirjoituksessa:', err);
  }
  console.log(message);
}

(async () => {
  logToFile('🚀 Käynnistetään työnkulun testaus visuaalisessa tilassa...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. Siirrytään sivulle ja odotetaan
    logToFile('🌐 Siirrytään osoitteeseen http://localhost:5173/');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2500);

    // 2. Klikataan nappia '22'
    logToFile('👉 Klikataan nappia "Plugins"...');
    await page.getByRole('button', { name: '22' }).click();
    await page.waitForTimeout(2000);

    // 3. Klikataan elementtiä (div:nth-child(16))
    logToFile('📦 Valitaan elementti (div:nth-child(16))...');
    await page.locator('div:nth-child(16) > .px-4').click();
    await page.waitForTimeout(2000);

    // 4. Asennetaan plugin 4
    logToFile('📦 Asennetaan plugin 4...');
    await page.getByRole('button', { name: 'Install Plugin 🚀' }).nth(4).click();
    await page.waitForTimeout(2000);

    // 5. Asennetaan plugin 5
    logToFile('📦 Asennetaan plugin 5...');
    await page.getByRole('button', { name: 'Install Plugin 🚀' }).nth(5).click();
    await page.waitForTimeout(2000);

    // 6. Klikataan elementtiä (div:nth-child(9))
    logToFile('📦 Valitaan elementti (div:nth-child(9))...');
    await page.locator('div:nth-child(9) > .px-4').click();
    await page.waitForTimeout(2000);

    // 7. Luodaan uusi työnkulku
    logToFile('⚙️ Luodaan uusi työnkulku (New)...');
    await page.getByRole('button', { name: 'New' }).click();
    await page.waitForTimeout(2000);

    // 8. Lisätään ensimmäinen steppi ja valitaan combobox
    logToFile('➕ Lisätään ensimmäinen steppi...');
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('combobox').selectOption('owasp-zap-openapi-import');
    await page.waitForTimeout(2000);

    // 9. Lisätään toinen steppi ja valitaan combobox
    logToFile('➕ Lisätään toinen steppi...');
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('combobox').nth(1).selectOption('zap-start-scan-fixed-v2');
    await page.waitForTimeout(2000);

    // 10. Täytetään tekstikentät
    logToFile('✍️ Täytetään URL-kenttä...');
    await page.getByRole('textbox').nth(1).click();
    await page.waitForTimeout(1000);
    await page.getByRole('textbox').nth(1).fill('http://localhost:5173/mini-api.json');
    await page.waitForTimeout(2000);

    logToFile('✍️ Täytetään policy-kenttä...');
    await page.getByRole('textbox').nth(2).click();
    await page.waitForTimeout(1000);
    await page.getByRole('textbox').nth(2).fill('Default Policy');
    await page.waitForTimeout(2000);

    // 11. Lisätään kolmas steppi
    logToFile('➕ Lisätään kolmas steppi...');
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('combobox').nth(2).selectOption('owasp-zap-all-alerts');
    await page.waitForTimeout(2000);

    // 12. Ajetaan työnkulku
    logToFile('🚀 Ajetaan työnkulku (Run Workflow)...');
    await page.getByRole('button', { name: 'Run Workflow 🚀' }).click();
    await page.waitForTimeout(3000);

    // 13. Odotetaan tulosta "All OK"
    logToFile('⏳ Tarkistetaan tulos "All OK"...');
    await page.getByText('All OK').click();
    await page.waitForTimeout(2000);

    // 14. Siivotaan ja poistetaan asennukset
    logToFile('🧹 Siivotaan ja poistetaan asennukset...');
    await page.getByRole('button', { name: '22' }).click();
    await page.waitForTimeout(2000);

    logToFile('🗑️ Poistetaan ensimmäinen plugin...');
    await page.getByRole('button', { name: 'Uninstall' }).first().click();
    await page.waitForTimeout(1500);
    
    logToFile('🗑️ Poistetaan toinen plugin...');
    await page.getByRole('button', { name: 'Uninstall' }).first().click();
    await page.waitForTimeout(1500);
    
    logToFile('🗑️ Poistetaan kolmas plugin...');
    await page.getByRole('button', { name: 'Uninstall' }).first().click();
    await page.waitForTimeout(1500);
    
    logToFile('🗑️ Poistetaan viimeinen plugin...');
    await page.getByRole('button', { name: 'Uninstall' }).click();
    await page.waitForTimeout(1500);

    logToFile('✨ Kaikki testivaiheet suoritettu onnistuneesti!');
  } catch (err) {
    logToFile(`❌ Testi epäonnistui: ${err.message}`);
    process.exit(1);
  } finally {
    logToFile('🔒 Suljetaan selain...');
    await browser.close();
  }
})();