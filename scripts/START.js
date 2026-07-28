import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const action = process.argv[2] || 'dev'

function startZap() {
  const zapBatPath = path.resolve(__dirname, '../start-ZAP.bat')
  const zapInstallPath = 'C:\\Program Files\\ZAP\\Zed Attack Proxy\\Zap.bat'
  const isZapAvailable = fs.existsSync(zapBatPath) || fs.existsSync(zapInstallPath)

  if (isZapAvailable) {
    console.log('🚀 ZAP havaittu järjestelmästä. Käynnistetään...')
    const targetZap = fs.existsSync(zapBatPath) ? zapBatPath : zapInstallPath
    exec(`start "" cmd.exe /k "${targetZap}"`, (err) => {
      if (err) console.error('⚠️ ZAP:n käynnistys epäonnistui:', err)
    })
  } else {
    console.log('ℹ️ OWASP ZAP:ia ei löydetty koneelta.')
  }
}

function startPlaywright() {
  const playwrightBatPath = path.resolve(__dirname, '../src/tools/playwright/start-playwrightServer.bat')

  if (fs.existsSync(playwrightBatPath)) {
    console.log('🚀 Playwright-serverin .bat havaittu. Käynnistetään uuteen cmd-ikkunaan...')
    exec(`start "" cmd.exe /k "${playwrightBatPath}"`, (err) => {
      if (err) console.error('⚠️ Playwright-serverin käynnistys epäonnistui:', err)
    })
  } else {
    console.log('⚠️ Playwright-serverin .bat-tiedostoa ei löytynyt polusta:', playwrightBatPath)
  }
}

function startVite() {
  console.log('⚡ Käynnistetään Vite-kehityspalvelin...')
  // Käynnistetään vite nykyiseen terminaali-ikkunaan
  const viteProcess = exec('npx vite', (err) => {
    if (err) console.error('⚠️ Viten käynnistys epäonnistui:', err)
  })

  viteProcess.stdout.pipe(process.stdout)
  viteProcess.stderr.pipe(process.stderr)
}

// Switch-case valinta
switch (action) {
  case 'dev':
    // Pelkkä Vite (kuten ennen vanhaan npm run dev)
    startVite()
    break

  case 'zap':
    // Käynnistää ZAP:n JA Viten
    startZap()
    startVite()
    break

  case 'playwright':
    // Käynnistää Playwrightin JA Viten
    startPlaywright()
    startVite()
    break

  case 'all':
    // Käynnistää ZAP:n, Playwrightin JA Viten
    startZap()
    startPlaywright()
    startVite()
    break

  default:
    console.log(`❌ Tuntematon komento: "${action}".`)
}