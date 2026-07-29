// server.js
import express from 'express'
import cors from 'cors'
import db from './src/tools/sqlite/db.js'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// --- PLUGINIEN HALLINTA (Install / Uninstall / Launch) ---
app.post('/api/plugins/install', (req, res) => {
  let { pluginId, command } = req.body

  // Määritetään suoraan Javan käynnistyskomento jar-tiedostolle ZAP:n kansiossa
  // Tämä kiertää täysin kaikki Zap.bat-tiedoston ja polkujen välilyönti-ongelmat!
  const ZAP_JAR_CMD = 'java -Xmx512m -jar zap-2.17.0.jar'

  // Varakorjaus, jos komento puuttuu tai siinä on vanhoja polkuja
  if (!command || command === 'undefined' || command.includes('Program Files') || command.includes('PROGRA~1')) {
    if (pluginId === 'plugin-zap-runner') {
      command = ZAP_JAR_CMD
    } else if (pluginId === 'plugin-zap-daemon') {
      command = `${ZAP_JAR_CMD} -daemon`
    } else if (pluginId === 'plugin-playwright-server') {
      command = 'node src\\tools\\playwright\\playwrightServer.js'
    }
  }

  console.log(`📥 Asennetaan / Käynnistetään plugin: ${pluginId} komennolla: ${command}`)

  try {
    if (!command) {
      return res.status(400).json({ success: false, error: 'Komento puuttuu!' })
    }

    // Asetetaan aina työkansioksi ZAP:n varsinainen asennuskansio, josta löydetään jar-tiedosto
    let cwdOption = 'F:\\REACT-ohjelmat\\SwissKnife-DevTools'
    if (pluginId === 'plugin-zap-runner' || pluginId === 'plugin-zap-daemon') {
      cwdOption = 'C:\\Program Files\\ZAP\\Zed Attack Proxy'
    }

    // Avataan uuteen komentorivi-ikkunaan kiltisti
    spawn('cmd.exe', ['/k', command], {
      detached: true,
      shell: true,
      cwd: cwdOption,
      stdio: 'ignore'
    }).unref()

    res.json({ success: true, message: `Plugin ${pluginId} käynnistetty uuteen ikkunaan.` })
  } catch (err) {
    console.error('❌ Virhe pluginin käynnistyksessä:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. Poista / Sammuta plugin napista
app.post('/api/plugins/uninstall', (req, res) => {
  const { pluginId } = req.body
  console.log(`🗑️ Poistetaan / Sammutetaan plugin: ${pluginId}`)

  try {
    // Suljetaan oikea prosessi pluginin tyypin mukaan turvallisesti
    if (pluginId && pluginId.includes('zap')) {
      spawn('taskkill', ['/f', '/im', 'java.exe'], { shell: true, stdio: 'ignore' })
    } else if (pluginId && pluginId.includes('playwright')) {
      console.log('ℹ️ Playwright-taustapalvelu pysäytetty.')
    }

    res.json({ success: true, message: `Plugin ${pluginId} poistettu / sammutettu.` })
  } catch (err) {
    console.error('❌ Virhe pluginin poistossa:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// Vanha launch-reitti yhteensopivuuden vuoksi
app.post('/api/plugins/launch-server', (req, res) => {
  const { pluginId, command } = req.body
  try {
    spawn('start', ['cmd.exe', '/k', command || 'node server.js'], {
      detached: true,
      shell: true,
      stdio: 'ignore'
    }).unref()
    res.json({ success: true, message: `Plugin ${pluginId} käynnistetty.` })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- TIETOKANTA JA MUUT REITIT ---

app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ success: true, data: rows })
  })
})

app.post('/api/items', (req, res) => {
  const { name, description } = req.body
  if (!name) return res.status(400).json({ error: 'Nimi vaaditaan' })

  const query = `INSERT INTO items (name, description) VALUES (?, ?)`
  db.run(query, [name, description], function (err) {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ success: true, data: { id: this.lastID, name, description } })
  })
})

app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  const query = `SELECT id, username, role FROM users WHERE username = ? AND password = ?`
  db.get(query, [username, password], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message })
    if (row) {
      res.json({ success: true, message: 'Kirjautuminen onnistui!', user: row })
    } else {
      res.status(401).json({ success: false, error: 'Väärä käyttäjätunnus tai salasana' })
    }
  })
})

app.get('/api/login', (req, res) => {
  res.json({ success: true, message: 'Käytä POST-metodia kirjautumiseen.' })
})

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ success: true, data: rows })
  })
})

app.post('/api/products', (req, res) => {
  const { title, price, category } = req.body
  if (!title || price === undefined) {
    return res.status(400).json({ success: false, error: 'Otsikko ja hinta vaaditaan.' })
  }
  const query = `INSERT INTO products (title, price, category) VALUES (?, ?, ?)`
  db.run(query, [title, price, category || 'Yleinen'], function (err) {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ success: true, data: { id: this.lastID, title, price, category: category || 'Yleinen' } })
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Express-taustapalvelin pyörii osoitteessa: http://localhost:${PORT}`)
})