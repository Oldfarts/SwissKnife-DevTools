// src/tools/selenium/seleniumCheck.ts
import { Builder, By, until, WebDriver } from 'selenium-webdriver';

// Muutetaan testilogiikka funktioksi, jota testijuoksuttaja voi kutsua
export async function runTest() {
  let driver: WebDriver = await new Builder().forBrowser('chrome').build();

  try {
    await driver.get('http://localhost:5173/');
    await driver.wait(until.elementLocated(By.css('body')), 5000);
    let title = await driver.getTitle();
    return { success: true, title };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    await driver.quit();
  }
}

// (Valinnainen) Jos haluat edelleen ajaa tämän yksittäisenä tiedostona suoraan terminaalista, 
// voit pitää alla olevan tarkistuksen lopussa:
if (process.argv[1] && process.argv[1].endsWith('seleniumCheck.ts')) {
  runTest().then(result => {
    console.log(JSON.stringify(result));
  });
}