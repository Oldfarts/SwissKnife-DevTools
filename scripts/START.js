import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const action = process.argv[2] || 'dev'

function startZap() {
  // Korjattu polku: siirrytään scripts-kansiosta yhdestä tasosta ylöspäin juureen
  const zapBatPath = path.resolve(__dirname, '../scripts/start-ZAP.bat')
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

function startBackendServer() {
  const serverPath = path.resolve(__dirname, '../server.js')
  if (fs.existsSync(serverPath)) {
    console.log('🚀 Käynnistetään Express-taustapalvelin uuteen cmd-ikkunaan...')
    // Avataan node server.js omaan cmd.exe-ikkunaan (/k pitää ikkunan auki)
    exec(`start "" cmd.exe /k "node ${serverPath}"`, (err) => {
      if (err) console.error('⚠️ Taustapalvelimen käynnistys epäonnistui:', err)
    })
  } else {
    console.log('ℹ️ server.js -tiedostoa ei löytynyt juuresta.')
  }
}

function startVite() {
  console.log('⚡ Käynnistetään Vite-kehityspalvelin...')
  const viteProcess = exec('npx vite', (err) => {
    if (err) console.error('⚠️ Viten käynnistys epäonnistui:', err)
  })

  viteProcess.stdout.pipe(process.stdout)
  viteProcess.stderr.pipe(process.stderr)
}

// Switch-case valinta
switch (action) {
  case 'dev':
    // Pelkkä Vite + Taustapalvelin (tai pelkkä Vite, miten haluat)
    startBackendServer()
    startVite()
    break

  case 'zap':
    startZap()
    startBackendServer()
    startVite()
    break

  case 'playwright':
    startPlaywright()
    startBackendServer()
    startVite()
    break

  case 'all':
    // Käynnistää kaiken: ZAP, Playwright, Express-taustapalvelin JA Vite
    startZap()
    startPlaywright()
    startBackendServer()
    startVite()
    break

  default:
    console.log(`❌ Tuntematon komento: "${action}".`)
}