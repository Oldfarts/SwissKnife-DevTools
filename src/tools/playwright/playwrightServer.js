import express from 'express';
import { chromium } from 'playwright';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

// API-reitti Playwright-testeille (hoitaa selaimen ajon taustalla)
app.post('/api/playwright-test', async (req, res) => {
  const { url, action } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle' });

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

// Käynnistetään taustapalvelu oikeassa paikassa tiedoston lopussa
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Playwright taustapalvelu pyörii osoitteessa http://localhost:${PORT}`);
});