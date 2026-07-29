import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const action = process.argv[2] || 'dev'

// Yksinkertaistettu ja luotettava tapa avata uusi CMD-ikkuna Windowsissa
function openInNewWindow(commandToRun) {
  console.log(`🚀 Avataan uuteen cmd-ikkunaan: ${commandToRun}`)
  
  spawn('start', ['cmd.exe', '/k', commandToRun], {
    detached: true,
    shell: true,
    stdio: 'ignore'
  }).unref()
}

function startZap() {
  const zapBatPath = path.resolve(__dirname, '../scripts/start-ZAP.bat')
  const zapInstallPath = 'C:\\Program Files\\ZAP\\Zed Attack Proxy\\Zap.bat'
  
  if (fs.existsSync(zapBatPath)) {
    // Lisätään -port 8081 komentoriviparametriksi bat-tiedoston perään
    openInNewWindow(`"${zapBatPath}" -port 8081`)
  } else if (fs.existsSync(zapInstallPath)) {
    // Jos käynnistetään suoraan Zap.bat, annetaan portti-argumentti sille
    openInNewWindow(`"${zapInstallPath}" -port 8081`)
  } else {
    console.log('ℹ️ OWASP ZAP:ia ei löydetty koneelta.')
  }
}

function startBackendServer() {
  const serverPath = path.resolve(__dirname, '../server.js')
  if (fs.existsSync(serverPath)) {
    console.log('🚀 Käynnistetään Express-taustapalvelin uuteen cmd-ikkunaan...')
    // Käytetään samaa turvallista openInNewWindow-funktiota
    openInNewWindow(`node "${serverPath}"`)
  } else {
    console.log('ℹ️ server.js -tiedostoa ei löytynyt juuresta.')
  }
}

function startPlaywright() {
  const playwrightBatPath = path.resolve(__dirname, '../src/tools/playwright/start-playwrightServer.bat')

  if (fs.existsSync(playwrightBatPath)) {
    openInNewWindow(`"${playwrightBatPath}"`)
  } else {
    console.log('⚠️ Playwright-serverin .bat-tiedostoa ei löytynyt polusta:', playwrightBatPath)
  }
}

function startSqlite() {
  // Koska startBackendServer() tekee jo saman, estetään tuplakäynnistys tai käytetään tarvittaessa suoraan sitä
  startBackendServer()
}

function startVite() {
  console.log('⚡ Käynnistetään Vite-kehityspalvelin...')
  const viteProcess = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true
  })

  viteProcess.on('close', (code) => {
    process.exit(code)
  })
}

// Switch-case valinta
switch (action) {
  case 'dev':
    startBackendServer() // <-- LISÄTTY TÄHÄN, että taustapalvelin käynnistyy aina
    startVite()
    break

  case 'zap':
    startBackendServer()
    startZap()
    startVite()
    break

  case 'playwright':
    startBackendServer()
    startPlaywright()
    startVite()
    break

  case 'sqlite':
    startSqlite()
    startVite()
    break

  case 'all':
    startBackendServer()
    startZap()
    startPlaywright()
    startVite()
    break

  default:
    console.log(`❌ Tuntematon komento: "${action}".`)
}