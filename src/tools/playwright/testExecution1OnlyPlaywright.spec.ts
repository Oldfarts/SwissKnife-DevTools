import { chromium } from 'playwright';

export async function runRestPlaywrightTest() {
  console.log('🚀 Käynnistetään REST-työnkulun testaus Playwrightilla...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🌐 Siirrytään osoitteeseen http://localhost:5173/');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(3000);

    // 0. SIVUN RIVIMÄÄRÄ / ASETUS (jos tarpeen)
    console.log('⚙️ Asetetaan näkymän asetukset (nappi "25")...');
    try {
      const page25Btn = page.getByRole('button', { name: '25' }).first();
      if (await page25Btn.isVisible({ timeout: 3000 })) {
        await page25Btn.click();
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      // Jatketaan, jos nappia ei löydy tai se on jo valittuna
    }

    async function openPluginsMenu() {
      console.log('👉 Avataan Plugins-valikko...');
      await page.waitForTimeout(1500);
      const pluginBtn = page.locator('button[title="Plugins"]').first();
      await pluginBtn.waitFor({ state: 'visible', timeout: 15000 });
      await pluginBtn.click();
      await page.waitForTimeout(2000);
    }

    // 1. ASENNETAAN ENSILLINEN PLUGIN (Install Plugin 4 / nth(4))
    await openPluginsMenu();
    console.log('📦 Asennetaan ensimmäinen plugin (Install Plugin 🚀 nth(4))...');
    const installBtn4 = page.getByRole('button', { name: 'Install Plugin 🚀' }).nth(4);
    await installBtn4.waitFor({ state: 'visible', timeout: 10000 });
    await installBtn4.click();
    console.log('⏳ Odotetaan 5s pluginin asentumista...');
    await page.waitForTimeout(5000);

    // 2. ASENNETAAN TOINEN PLUGIN (Install Plugin 5 / nth(5))
    await openPluginsMenu();
    console.log('📦 Asennetaan toinen plugin (Install Plugin 🚀 nth(5))...');
    const installBtn5 = page.getByRole('button', { name: 'Install Plugin 🚀' }).nth(5);
    await installBtn5.waitFor({ state: 'visible', timeout: 10000 });
    await installBtn5.click();
    console.log('⏳ Odotetaan 5s pluginin asentumista...');
    await page.waitForTimeout(5000);

    // 3. VALITAAN ELEMENTIT JÄRJESTYKSESSÄ (9 -> 11 -> 20)
    await openPluginsMenu();
    console.log('📦 Valitaan elementti (div:nth-child(9))...');
    const elem9 = page.locator('div:nth-child(9) > .px-4').first();
    await elem9.waitFor({ state: 'visible', timeout: 10000 });
    await elem9.click();
    await page.waitForTimeout(2000);

    await openPluginsMenu();
    console.log('📦 Valitaan elementti (div:nth-child(11))...');
    const elem11 = page.locator('div:nth-child(11) > .px-4').first();
    await elem11.waitFor({ state: 'visible', timeout: 10000 });
    await elem11.click();
    await page.waitForTimeout(2000);

    await openPluginsMenu();
    console.log('📦 Valitaan elementti (div:nth-child(20))...');
    const elem20 = page.locator('div:nth-child(20) > .px-4').first();
    await elem20.waitFor({ state: 'visible', timeout: 10000 });
    await elem20.click();
    await page.waitForTimeout(3000);

    // 4. LUODAAN UUSI TYÖNKULKU
    console.log('⚙️ Luodaan uusi työnkulku (New)...');
    const newBtn = page.getByRole('button', { name: 'New' }).first();
    await newBtn.waitFor({ state: 'visible', timeout: 10000 });
    await newBtn.click();
    await page.waitForTimeout(2000);

    // 5. ENSIMMÄINEN STEPPI
    console.log('➕ Lisätään ensimmäinen steppi...');
    const addStepBtn1 = page.getByRole('button', { name: 'Add Step' }).first();
    await addStepBtn1.waitFor({ state: 'visible', timeout: 10000 });
    await addStepBtn1.click();
    await page.waitForTimeout(2000);

    const combobox1 = page.getByRole('combobox').first();
    await combobox1.waitFor({ state: 'visible', timeout: 15000 });
    await combobox1.selectOption('owasp-zap-openapi-import');
    await page.waitForTimeout(2000);

    // 6. TOINEN STEPPI
    console.log('➕ Lisätään toinen steppi...');
    const addStepBtn2 = page.getByRole('button', { name: 'Add Step' }).first();
    await addStepBtn2.waitFor({ state: 'visible', timeout: 10000 });
    await addStepBtn2.click();
    await page.waitForTimeout(2000);

    const combobox2 = page.getByRole('combobox').nth(1);
    await combobox2.waitFor({ state: 'visible', timeout: 15000 });
    await combobox2.selectOption('zap-start-scan-fixed-v2');
    await page.waitForTimeout(2000);

    // 7. URL-KENTTÄ
    console.log('✍️ Täytetään URL-kenttä...');
    const urlTextbox = page.getByRole('textbox').nth(1);
    await urlTextbox.waitFor({ state: 'visible', timeout: 10000 });
    await urlTextbox.click();
    await urlTextbox.fill('http://localhost:5173/mini-api.json');
    await page.waitForTimeout(2000);

    // 8. POLICY-KENTTÄ
    console.log('✍️ Täytetään policy-kenttä...');
    const policyTextbox = page.getByRole('textbox').nth(2);
    await policyTextbox.waitFor({ state: 'visible', timeout: 10000 });
    await policyTextbox.click();
    await policyTextbox.fill('Default Policy');
    await page.waitForTimeout(2000);

    // 9. KOLMAS STEPPI
    console.log('➕ Lisätään kolmas steppi...');
    const addStepBtn3 = page.getByRole('button', { name: 'Add Step' }).first();
    await addStepBtn3.waitFor({ state: 'visible', timeout: 10000 });
    await addStepBtn3.click();
    await page.waitForTimeout(2000);

    const combobox3 = page.getByRole('combobox').nth(2);
    await combobox3.waitFor({ state: 'visible', timeout: 15000 });
    await combobox3.selectOption('owasp-zap-all-alerts');
    await page.waitForTimeout(2000);

    // 10. AJETAAN TYÖNKULKU
    console.log('🚀 Ajetaan työnkulku (Run Workflow)...');
    const runBtn = page.getByRole('button', { name: /Run Workflow/i }).first();
    await runBtn.waitFor({ state: 'visible', timeout: 10000 });
    await runBtn.click();
    await page.waitForTimeout(4000);

    // 11. TARKISTETAAN TULOS
    console.log('⏳ Tarkistetaan tulos "All OK"...');
    const allOkText = page.getByText('All OK').first();
    await allOkText.waitFor({ state: 'visible', timeout: 15000 });
    await allOkText.click();
    await page.waitForTimeout(2000);

    // 12. SIIVOUS
    console.log('🧹 Siivotaan ja poistetaan asennukset...');
    await openPluginsMenu();

    for (let i = 0; i < 4; i++) {
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

    console.log('✨ REST-testivaiheet suoritettu onnistuneesti!');
    return { success: true };

  } catch (err: any) {
    console.log(`❌ REST-testi epäonnistui: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    console.log('🔒 Suljetaan selain...');
    await browser.close();
  }
}
// Suoritetaan funktio automaattisesti, kun tiedosto ajetaan komentoriviltä
runRestPlaywrightTest().catch(console.error);