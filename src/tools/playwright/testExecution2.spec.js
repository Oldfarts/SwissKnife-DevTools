// This testExecutionSoap tests:
// 1. install SOAP plugins
// 2. SOAP WSDL import and generic API
// 3. run SOAP workflow and check response
// 4. and uninstalling the plugins
import { chromium } from 'playwright';
import fs from 'fs';

// Kirjoitetaan loki tiedostoon ja konsoliin
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync('suoritus-loki-soap.txt', logLine);
  } catch (err) {
    console.error('❌ Virhe lokitiedostoon kirjoituksessa:', err);
  }
  console.log(message);
}

(async () => {
  logToFile('🚀 Käynnistetään SOAP-työnkulun testaus visuaalisessa tilassa...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. Siirrytään sivulle ja odotetaan
    logToFile('🌐 Siirrytään osoitteeseen http://localhost:5173/');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2500);

    // 2. Klikataan nappia '22'
    logToFile('👉 Klikataan nappia "22"...');
    await page.getByRole('button', { name: '22' }).click();
    await page.waitForTimeout(2000);

    // 3. Valitaan ensimmäinen elementti (div:nth-child(13))
    logToFile('📦 Valitaan elementti (div:nth-child(13))...');
    await page.locator('div:nth-child(13) > .px-4').click();
    await page.waitForTimeout(2000);

    // 4. Valitaan toinen elementti (div:nth-child(12))
    logToFile('📦 Valitaan elementti (div:nth-child(12))...');
    await page.locator('div:nth-child(12) > .px-4').click();
    await page.waitForTimeout(2000);

    // 5. Luodaan uusi työnkulku
    logToFile('⚙️ Luodaan uusi työnkulku (New)...');
    await page.getByRole('button', { name: 'New' }).click();
    await page.waitForTimeout(2000);

    // 6. Lisätään ensimmäinen steppi ja valitsemastasi comboboxista WSDL import
    logToFile('➕ Lisätään ensimmäinen steppi (WSDL import)...');
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('combobox').selectOption('soap-wsdl-import-or-test');
    await page.waitForTimeout(2000);

    // 7. Lisätään toinen steppi ja valitaan SOAP generic API
    logToFile('➕ Lisätään toinen steppi (SOAP generic API)...');
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('combobox').nth(1).selectOption('soap-generic-api');
    await page.waitForTimeout(2000);

    // 8. Täytetään palvelun URL-osoite
    logToFile('✍️ Täytetään SOAP URL-kenttä...');
    await page.getByRole('textbox').nth(3).click();
    await page.waitForTimeout(1000);
    await page.getByRole('textbox').nth(3).fill('http://localhost:3001/ws/myservice');
    await page.waitForTimeout(2000);

    // 9. Täytetään SOAP-pyynnön XML-sisältö
    logToFile('✍️ Täytetään SOAP XML-pyyntö...');
    await page.getByRole('textbox').nth(5).click();
    await page.waitForTimeout(1000);
    await page.getByRole('textbox').nth(5).fill('<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:loc="http://example.com/">\n   <soapenv:Header/>\n   <soapenv:Body>\n      <loc:GetInfo/>\n   </soapenv:Body>\n</soapenv:Envelope>');
    await page.waitForTimeout(2000);

    // 10. Ajetaan työnkulku
    logToFile('🚀 Ajetaan SOAP-työnkulku (Run Workflow)...');
    await page.getByRole('button', { name: 'Run Workflow 🚀' }).click();
    await page.waitForTimeout(3000);

    // 11. Odotetaan tulosta "All OK"
    logToFile('⏳ Tarkistetaan tulos "All OK"...');
    await page.getByText('All OK').click();
    await page.waitForTimeout(2000);

    // 12. Siivotaan ja poistetaan asennukset
    logToFile('🧹 Siivotaan ja poistetaan asennukset...');
    await page.getByRole('button', { name: '22' }).click();
    await page.waitForTimeout(2000);

    logToFile('🗑️ Poistetaan ensimmäinen plugin...');
    await page.getByRole('button', { name: 'Uninstall' }).nth(1).click();
    await page.waitForTimeout(1500);

    logToFile('🗑️ Poistetaan toinen plugin...');
    await page.getByRole('button', { name: 'Uninstall' }).click();
    await page.waitForTimeout(1500);

    logToFile('✨ SOAP-testivaiheet suoritettu onnistuneesti!');
  } catch (err) {
    logToFile(`❌ SOAP-testi epäonnistui: ${err.message}`);
    process.exit(1);
  } finally {
    logToFile('🔒 Suljetaan selain...');
    await browser.close();
  }
})();