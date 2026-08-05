// executors/seleniumExecutor.ts
import { Builder, By, until, WebDriver } from 'selenium-webdriver';

export async function runSeleniumAutomation() {
  let driver: WebDriver = await new Builder().forBrowser('chrome').build();

  try {
    // Esimerkki: Siirrytään sivulle ja tarkistetaan otsikkomiina
    await driver.get('http://localhost:5173/');
    
    // Odotetaan, että elementti latautuu
    await driver.wait(until.elementLocated(By.css('body')), 5000);
    
    let title = await driver.getTitle();
    return { success: true, title };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    await driver.quit();
  }
}