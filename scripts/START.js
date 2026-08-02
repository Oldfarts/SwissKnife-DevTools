import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const action = process.argv[2] || 'dev'
const subMode = process.argv[3] || 'interval' // Valittavissa: interval tai cron

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
    openInNewWindow(`"${zapBatPath}" -port 8081`)
  } else if (fs.existsSync(zapInstallPath)) {
    openInNewWindow(`"${zapInstallPath}" -port 8081`)
  } else {
    console.log('ℹ️ OWASP ZAP:ia ei löydetty koneelta.')
  }
}

function startBackendServer() {
  const serverPath = path.resolve(__dirname, '../server.js')
  if (fs.existsSync(serverPath)) {
    console.log('🚀 Käynnistetään Express-taustapalvelin uuteen cmd-ikkunaan...')
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
  startBackendServer()
}

// UUSI FUNKTIO: Käynnistää tausta-ajastimen uuteen ikkunaan
function startTimer() {
  // Varmista että tämä polku osoittaa oikeasti timerService.js -tiedostoosi!
  const timerScriptPath = path.resolve(__dirname, '../src/tools/timerService.js')
  
  // Koska ajo on tyyliä: npm run dev:timer:custom-workflow (eli timer interval 5 polku...)
  const customMode = process.argv[3] || 'interval';
  const customTime = process.argv[4] || '5';
  const customWorkflow = process.argv[5] || 'F:\\REACT-ohjelmat\\SwissKnife-DevTools\\src\\example-workflows\\työnkulku.json';
  
  if (fs.existsSync(timerScriptPath)) {
    console.log(`⏰ Käynnistetään tausta-ajastin työnkululla: [${customWorkflow}]...`)
    // Välitetään parametrit eteenpäin timerService.js:lle
    openInNewWindow(`node "${timerScriptPath}" --mode=${customMode} --time="${customTime}" --workflow="${customWorkflow}"`)
  } else {
    console.log(`⚠️ Ajastimen skriptiä ei löytynyt polusta: ${timerScriptPath}`)
  }
}

function startVite() {
  console.log('⚡ Käynnistetään Vite-kehityspalvelin...')
  const viteProcess = spawn('npx', ['vite'], {
    stdIO: 'inherit',
    shell: true
  })

  viteProcess.on('close', (code) => {
    process.exit(code)
  })
}

// Switch-case valinta
switch (action) {
  case 'dev':
    startBackendServer()
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

  case 'timer':
    startBackendServer()
    startZap()  // testi!!!
    startTimer() // Käynnistää ajastinpalvelun (tukee --mode=interval tai --mode=cron)
    startVite()
    break

  case 'all':
    startBackendServer()
    startZap()
    startPlaywright()
    startTimer()
    startVite()
    break

  default:
    console.log(`❌ Tuntematon komento: "${action}".`)
}