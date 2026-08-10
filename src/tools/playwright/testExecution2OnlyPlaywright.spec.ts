import { chromium } from 'playwright';

export async function runSoapPlaywrightTest() {
  console.log('🚀 Käynnistetään SOAP-työnkulun testaus Playwrightilla...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🌐 Siirrytään osoitteeseen http://localhost:5173/');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2500);

    // Apufunktio valikon varmaan avaamiseen
    async function openPluginsMenu() {
      const pluginBtn = page.locator('button[title="Plugins"]').first();
      await pluginBtn.waitFor({ state: 'visible', timeout: 10000 });
      await pluginBtn.click();
      await page.waitForTimeout(2000);
    }

    // 1. Avataan valikko ja valitaan ensimmäinen SOAP-plugin
    await openPluginsMenu();
    console.log('📦 Valitaan elementti (div:nth-child(13))...');
    const elem13 = page.locator('div:nth-child(13) > .px-4').first();
    await elem13.waitFor({ state: 'visible', timeout: 10000 });
    await elem13.click();
    await page.waitForTimeout(2000);

    // 2. Avataan valikko uudelleen ja valitaan toinen SOAP-plugin
    await openPluginsMenu();
    console.log('📦 Valitaan elementti (div:nth-child(12))...');
    const elem12 = page.locator('div:nth-child(12) > .px-4').first();
    await elem12.waitFor({ state: 'visible', timeout: 10000 });
    await elem12.click();
    await page.waitForTimeout(3000);

    // 3. Luodaan uusi työnkulku
    console.log('⚙️ Luodaan uusi työnkulku (New)...');
    const newBtn = page.getByRole('button', { name: 'New' }).first();
    await newBtn.waitFor({ state: 'visible', timeout: 10000 });
    await newBtn.click();
    await page.waitForTimeout(2000);

    // 4. Lisätään ensimmäinen steppi (WSDL import)
    console.log('➕ Lisätään ensimmäinen steppi (WSDL import)...');
    const addStepBtn1 = page.getByRole('button', { name: 'Add Step' }).first();
    await addStepBtn1.waitFor({ state: 'visible', timeout: 10000 });
    await addStepBtn1.click();
    await page.waitForTimeout(1500);

    const combobox1 = page.getByRole('combobox').first();
    await combobox1.waitFor({ state: 'visible', timeout: 10000 });
    await combobox1.selectOption('soap-wsdl-import-or-test');
    await page.waitForTimeout(2000);

    // 5. Lisätään toinen steppi (SOAP generic API)
    console.log('➕ Lisätään toinen steppi (SOAP generic API)...');
    const addStepBtn2 = page.getByRole('button', { name: 'Add Step' }).first();
    await addStepBtn2.click();
    await page.waitForTimeout(1500);

    const combobox2 = page.getByRole('combobox').nth(1);
    await combobox2.waitFor({ state: 'visible', timeout: 10000 });
    await combobox2.selectOption('soap-generic-api');
    await page.waitForTimeout(2000);

    // 6. Täytetään SOAP URL-kenttä
    console.log('✍️ Täytetään SOAP URL-kenttä...');
    const urlTextbox = page.getByRole('textbox').nth(3);
    await urlTextbox.waitFor({ state: 'visible', timeout: 10000 });
    await urlTextbox.click();
    await urlTextbox.fill('http://localhost:3001/ws/myservice');
    await page.waitForTimeout(2000);

    // 7. Täytetään SOAP XML-pyyntö
    console.log('✍️ Täytetään SOAP XML-pyyntö...');
    const xmlTextbox = page.getByRole('textbox').nth(5);
    await xmlTextbox.waitFor({ state: 'visible', timeout: 10000 });
    await xmlTextbox.click();
    await xmlTextbox.fill('<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:loc="http://example.com/">\n  <soapenv:Header/>\n  <soapenv:Body>\n     <loc:GetInfo/>\n  </soapenv:Body>\n</soapenv:Envelope>');
    await page.waitForTimeout(2000);

    // 8. Ajetaan työnkulku
    console.log('🚀 Ajetaan SOAP-työnkulku (Run Workflow)...');
    const runBtn = page.getByRole('button', { name: /Run Workflow/i }).first();
    await runBtn.waitFor({ state: 'visible', timeout: 10000 });
    await runBtn.click();
    await page.waitForTimeout(4000);

    // 9. Tarkistetaan tulos
    console.log('⏳ Tarkistetaan tulos "All OK"...');
    const allOkText = page.getByText('All OK').first();
    await allOkText.waitFor({ state: 'visible', timeout: 15000 });
    await allOkText.click();
    await page.waitForTimeout(2000);

    // 10. Siivotaan ja poistetaan asennukset
    console.log('🧹 Siivotaan ja poistetaan asennukset...');
    await openPluginsMenu();

    for (let i = 0; i < 2; i++) {
      console.log(`🗑️ Poistetaan plugin ${i + 1}...`);
      try {
        const uninstallBtn = page.getByRole('button', { name: 'Uninstall' }).first();
        if (await uninstallBtn.isVisible({ timeout: 2000 })) {
          await uninstallBtn.click();
          await page.waitForTimeout(1500);
        }
      } catch (e) {
        break;
      }
    }

    console.log('✨ SOAP-testivaiheet suoritettu onnistuneesti!');
    return { success: true };

  } catch (err: any) {
    console.log(`❌ SOAP-testi epäonnistui: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    console.log('🔒 Suljetaan selain...');
    await browser.close();
  }
}
// Suoritetaan funktio automaattisesti, kun tiedosto ajetaan komentoriviltä
runSoapPlaywrightTest().catch(console.error);