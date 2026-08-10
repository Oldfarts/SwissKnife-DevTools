import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';

function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync('suoritus-loki-selenium.txt', logLine);
  } catch (err) {
    console.error('❌ Virhe lokitiedostoon kirjoituksessa:', err);
  }
  console.log(message);
}

export async function runTest() {
  logToFile('🚀 Käynnistetään työnkulun testaus Seleniumilla...');
  
  const options = new chrome.Options();
  options.windowSize({ width: 1920, height: 1080 });
  options.addArguments('--start-maximized');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');

  let driver: WebDriver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  async function clickElement(selectorType: 'css' | 'xpath', selectorValue: string, description: string, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logToFile(`👉 ${description} (yritys ${attempt}/${maxAttempts})...`);
        const locator = selectorType === 'css' ? By.css(selectorValue) : By.xpath(selectorValue);
        
        let element = await driver.wait(until.elementLocated(locator), 20000);
        await driver.wait(until.elementIsVisible(element), 10000);
        
        await driver.executeScript("arguments[0].click();", element);
        await driver.sleep(1500);
        return; 
      } catch (err: any) {
        if (attempt === maxAttempts) {
          throw new Error(`Epäonnistui kohdassa "${description}": ${err.message}`);
        }
        logToFile(`⚠️ Huomio: "${description}" epäonnistui, yritetään uudelleen...`);
        await driver.sleep(2000);
      }
    }
  }

  try {
// 1. Siirrytään sivulle ja otetaan ikkunan kahva talteen
    logToFile('🌐 Siirrytään osoitteeseen http://localhost:5173/');
    await driver.get('http://localhost:5173/');
    
    const mainWindow = await driver.getWindowHandle();
    await driver.switchTo().window(mainWindow); // Pakotetaan fokus tähän ikkunaan

    await driver.manage().window().maximize();
    await driver.sleep(8000);

    // 1. Klikataan Plugins
    await clickElement('css', 'button[title="Plugins"]', 'Klikataan nappia "Plugins"');
    await driver.sleep(5000);

    // 2. Asennetaan plugin 4 ja odotetaan rauhassa että asennusote rauhoittuu
    await clickElement('xpath', "(//button[contains(., 'Install Plugin 🚀')])[4]", 'Asennetaan plugin 4');
    logToFile('⏳ Odotetaan että plugin 4 asennus valmistuu...');
    await driver.sleep(10000); 

    // 3. Avataan Plugins uudelleen (varmistetaan että valikko on auki)
    await clickElement('css', 'button[title="Plugins"]', 'Klikataan nappia "Plugins" uudelleen');
    await driver.sleep(5000);

    // 4. Asennetaan plugin 5
    await clickElement('xpath', "(//button[contains(., 'Install Plugin 🚀')])[5]", 'Asennetaan plugin 5');
    await driver.sleep(10000);

    // 5. Luodaan uusi työnkulku
    await clickElement('xpath', "//button[text()='New']", 'Luodaan uusi työnkulku (New)');
    await driver.sleep(5000);

    // 6. Lisätään ensimmäinen steppi
    await clickElement('xpath', "//button[text()='Add Step']", 'Lisätään ensimmäinen steppi');
    let select1 = await driver.wait(async () => {
      let elements = await driver.findElements(By.css('select'));
      return elements.length > 0 ? elements[0] : null;
    }, 10000);
    await select1.sendKeys('owasp-zap-openapi-import');
    await driver.sleep(10000);

    // 7. Lisätään toinen steppi
    await clickElement('xpath', "//button[text()='Add Step']", 'Lisätään toinen steppi');
    let select2 = await driver.wait(async () => {
      let elements = await driver.findElements(By.css('select'));
      return elements.length > 1 ? elements[1] : null;
    }, 10000);
    await select2.sendKeys('zap-start-scan-fixed-v2');
    await driver.sleep(10000);

    // 8. Täytetään URL-kenttä
    logToFile('✍️ Täytetään URL-kenttä...');
    let textboxes = await driver.wait(async () => {
      let boxes = await driver.findElements(By.css('input[type="text"]'));
      return boxes.length > 1 ? boxes : null;
    }, 10000);
    await textboxes[1].click();
    await textboxes[1].clear();
    await textboxes[1].sendKeys('http://localhost:5173/mini-api.json');
    await driver.sleep(10000);

    // 9. Täytetään policy-kenttä
    logToFile('✍️ Täytetään policy-kenttä...');
    textboxes = await driver.findElements(By.css('input[type="text"]'));
    if (textboxes[2]) {
      await textboxes[2].click();
      await textboxes[2].clear();
      await textboxes[2].sendKeys('Default Policy');
    }
    await driver.sleep(10000);

    // 10. Lisätään kolmas steppi
    await clickElement('xpath', "//button[text()='Add Step']", 'Lisätään kolmas steppi');
    let select3 = await driver.wait(async () => {
      let elements = await driver.findElements(By.css('select'));
      return elements.length > 2 ? elements[2] : null;
    }, 10000);
    await select3.sendKeys('owasp-zap-all-alerts');
    await driver.sleep(10000);

    // 11. Ajetaan työnkulku
    await clickElement('xpath', "//button[contains(text(), 'Run Workflow')]", 'Ajetaan työnkulku (Run Workflow)');
    await driver.sleep(10000);

    // 12. Odotetaan tulosta "All OK"
    await clickElement('xpath', "//*[contains(text(), 'All OK')]", 'Tarkistetaan ja klikataan tulosta "All OK"');
    await driver.sleep(10000);

    // 13. Siivotaan
    logToFile('🧹 Siivotaan ja poistetaan asennukset...');
    await clickElement('css', 'button[title="Plugins"]', 'Avataan Plugins-valikko siivousta varten');
    await driver.sleep(10000);

    for (let i = 0; i < 4; i++) {
      logToFile(`🗑️ Poistetaan plugin ${i + 1}...`);
      try {
        let uninstallBtns = await driver.findElements(By.xpath("//button[text()='Uninstall']"));
        if (uninstallBtns.length > 0) {
          await uninstallBtns[0].click();
          await driver.sleep(1500);
        }
      } catch (e) {}
    }

    logToFile('✨ Kaikki testivaiheet suoritettu onnistuneesti!');
    return { success: true, message: 'Selenium workflow test passed successfully' };

  } catch (err: any) {
    logToFile(`❌ Testi epäonnistui: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    logToFile('🔒 Suljetaan selain...');
    await driver.quit();
  }
}

// Ajetaan testi suoraan heti kun tiedosto suoritetaan
runTest().then(result => {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(err => {
  console.error('❌ Vakava virhe:', err);
  process.exit(1);
});