import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

// Tarkistetaanko löytyykö start-ZAP.bat tai suoraan ZAP:n asennuspolku
const batPath = path.resolve(__dirname, 'start-ZAP.bat')
const zapInstallPath = 'C:\\Program Files\\ZAP\\Zed Attack Proxy\\Zap.bat'

const isZapAvailable = fs.existsSync(batPath) || fs.existsSync(zapInstallPath)

if (isZapAvailable) {
  console.log('🚀 ZAP havaittu järjestelmästä. Käynnistetään taustalle...')
  exec(`start "ZAP Daemon" cmd /k "${batPath}"`, (err) => {
    if (err) {
      console.error('⚠️ ZAP:n käynnistys epäonnistui:', err)
    }
  })
} else {
  console.log('ℹ️ OWASP ZAP:ia ei löydetty koneelta. Jatketaan ilman sitä (ZAP-pluginit eivät toimi ennen asennusta).')
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