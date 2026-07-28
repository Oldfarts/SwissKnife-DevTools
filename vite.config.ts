import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

// 1. Käynnistetään ZAP, jos se löytyy
const zapBatPath = path.resolve(__dirname, 'start-ZAP.bat')
const zapInstallPath = 'C:\\Program Files\\ZAP\\Zed Attack Proxy\\Zap.bat'
const isZapAvailable = fs.existsSync(zapBatPath) || fs.existsSync(zapInstallPath)

if (isZapAvailable) {
  console.log('🚀 ZAP havaittu järjestelmästä. Käynnistetään...')
  const targetZap = fs.existsSync(zapBatPath) ? zapBatPath : zapInstallPath
  exec(`start "" cmd.exe /k "${targetZap}"`, (err) => {
    if (err) {
      console.error('⚠️ ZAP:n käynnistys epäonnistui:', err)
    }
  })
} else {
  console.log('ℹ️ OWASP ZAP:ia ei löydetty koneelta.')
}

// 2. Käynnistetään Playwright-serveri omassa cmd.exe-ikkunassaan
const playwrightBatPath = path.resolve(__dirname, 'src/tools/playwright/start-playwrightServer.bat')

if (fs.existsSync(playwrightBatPath)) {
  console.log('🚀 Playwright-serverin .bat havaittu. Käynnistetään uuteen cmd-ikkunaan...')
  exec(`start "" cmd.exe /k "${playwrightBatPath}"`, (err) => {
    if (err) {
      console.error('⚠️ Playwright-serverin käynnistys epäonnistui:', err)
    }
  })
} else {
  console.log('⚠️ Playwright-serverin .bat-tiedostoa ei löytynyt polusta:', playwrightBatPath)
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/zap-api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zap-api/, ''),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})