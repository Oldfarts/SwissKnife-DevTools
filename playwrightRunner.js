// playwrightRunner.js
const { chromium } = require('playwright');

async function runBrowserTest(targetUrl) {
  // Käynnistetään selain (headless = true tarkoittaa ilman näkyvää ikkunaa)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Siirrytään kohteeseen
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // Otetaan esimerkiksi kuvakaappaus tai kerätään otsikko ja elementit
    const title = await page.title();
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBase64 = screenshotBuffer.toString('base64');

    await browser.close();

    return {
      success: true,
      data: {
        title,
        url: targetUrl,
        screenshot: `data:image/png;base64,${screenshotBase64}`,
        message: 'Playwright-testi suoritettu onnistuneesti!'
      }
    };
  } catch (error) {
    await browser.close();
    return { success: false, error: error.message };
  }
}

// Otetaan argumentit vastaan komentoriviltä tai kutsutaan suoraan
const urlArg = process.argv[2] || 'https://example.com';
runBrowserTest(urlArg).then(res => console.log(JSON.stringify(res)));