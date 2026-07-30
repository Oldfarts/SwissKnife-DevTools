import express from 'express';
import { chromium } from 'playwright';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// API-reitti Playwright-testeille
app.post('/api/playwright-test', async (req, res) => {
  const { url, action } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  let browser;
  try {
    // headless: false näyttää selaimen ruudulla, true ajaa sen taustalla
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 'domcontentloaded' on usein varmempi kuin networkidle, jos sivulla on jatkuvaa liikikennettä
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    let extraData = {};

    if (action === 'snapshot') {
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      extraData.screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
    } else if (action === 'extract_links') {
      extraData.links = await page.$$eval('a', anchors => anchors.map(a => a.href));
    }

    await browser.close();

    res.json({
      success: true,
      data: {
        url,
        title,
        actionExecuted: action,
        ...extraData,
        message: 'Playwright-testi suoritettu onnistuneesti!'
      }
    });

  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

// Portti 3002 tai mikä tahansa vapaa portti
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Playwright taustapalvelu pyörii osoitteessa http://localhost:${PORT}`);
});