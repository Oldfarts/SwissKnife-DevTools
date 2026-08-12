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

// --- ALUSTETAAN SOAP-TESTIDATA TIETOKANTAAN ---
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS soap_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT,
    description TEXT,
    status TEXT,
    amount REAL,
    category TEXT
  )`, (err) => {
    if (!err) {
      db.get(`SELECT COUNT(*) as count FROM soap_items`, (err, row) => {
        if (!err && row && row.count === 0) {
          const stmt = db.prepare(`INSERT INTO soap_items (item_code, description, status, amount, category) VALUES (?, ?, ?, ?, ?)`)
          
          const testItems = [
            ['SOAP-001', 'Perustilaus - Lelu', 'PENDING', 49.99, 'Retail'],
            ['SOAP-002', 'Premium-tilaus - Elektroniikka', 'APPROVED', 599.00, 'Tech'],
            ['SOAP-003', 'Hylätty tilaus - Vanhentunut', 'REJECTED', 12.50, 'Misc'],
            ['SOAP-004', 'Yrityslisenssi - Ohjelmisto', 'APPROVED', 1250.00, 'B2B'],
            ['SOAP-005', 'Varastontarkistus pyyntö', 'PROCESSING', 0.00, 'Logistics']
          ];

          testItems.forEach(item => stmt.run(item))
          stmt.finalize()
          console.log('✅ Lisätty monipuolinen SOAP-testidata SQLite-tietokantaan!')
        }
      })
    }
  })
})

// --- PLUGINIEN HALLINTA (Install / Uninstall / Launch) ---
// Muuttujat prosessien seurantaan muistissa
let playwrightProcess = null;
let zapProcess = null;

// 1. ASENNUS / KÄYNNISTYS
app.post('/api/plugins/install', (req, res) => {
  let { pluginId, command } = req.body

  const ZAP_JAR_CMD = 'java -Xmx512m -jar zap-2.17.0.jar'

  if (!command || command === 'undefined' || command.includes('Program Files' ) || command.includes('PROGRA~1')) {
      if (pluginId === 'plugin-zap-runner') {
        command = ZAP_JAR_CMD
      } else if (pluginId === 'plugin-zap-daemon') {
        command = `${ZAP_JAR_CMD} -daemon`
      } else if (pluginId === 'plugin-playwright-server') {
        command = 'node start-playwright.js' // tai 'node src\\tools\\playwright\\playwrightServer.js' riippuen polustasi
      } else if (pluginId === 'plugin-sqlite-server') {
        command = 'node server.js'
      } else if (pluginId === 'plugin-workflow-test-rest') {
        command = 'npx tsx src/tools/playwright/testExecution1OnlyPlaywright.spec.ts'
      } else if (pluginId === 'plugin-workflow-test-soap') {
        command = 'npx tsx src/tools/playwright/testExecution2OnlyPlaywright.spec.ts'
      } else if (pluginId === 'plugin-selenium-runner') {
      command = 'npx tsx src\\tools\\selenium\\testRunner.ts'
      } else if (pluginId === 'plugin-workflow-agent') {
        command = 'npx tsx ./src/tools/playwright/securityAgent.ts'
      }
  }

  const localOrRestPlugins = [
    'utility-wait', 'aws-s3-checker', 'soap-generic-api', 'owasp-zap-generic-api',
    'owasp-zap-critical-alerts', 'owasp-zap-all-alerts', 'zap-start-scan-fixed-v2',
    'soap-start-scan-fixed', 'zap-generate-html-report', 'image-exif-reader',
    'image-exif-reader2', 'playwright-visual-regression', 'playwright-html-reporter',
    'owasp-zap-openapi-import', 'soap-wsdl-import-or-test', 'owasp-zap-proxy-status',
    'plugin-selenium-runner',
  ];

  if (!command && localOrRestPlugins.includes(pluginId)) {
    console.log(`ℹ️ Plugin ${pluginId} on paikallinen tai REST-pohjainen komponentti eikä vaadi erillistä palvelinprosessia.`);
    return res.json({ success: true, message: `Plugin ${pluginId} valmis käytettäväksi.` });
  }

  if (!command) {
    return res.status(400).json({ success: false, error: 'Komento puuttuu!' });
  }

  console.log(`📥 Asennetaan / Käynnistetään plugin: ${pluginId} komennolla: ${command}`)

  try {
    let cwdOption = 'F:\\REACT-ohjelmat\\SwissKnife-DevTools'
    if (pluginId === 'plugin-zap-runner' ||
        pluginId === 'plugin-zap-daemon') {

      // Jos vanha ZAP on vielä olemassa, suljetaan se ensin
      if (zapProcess?.pid) {
        spawn('taskkill', [
          '/PID',
          String(zapProcess.pid),
          '/T',
          '/F'
        ], {
          windowsHide: false
        });

        zapProcess = null;
      }

      const zapCommand =
        pluginId === 'plugin-zap-daemon'
          ? 'java -Xmx512m -jar zap-2.17.0.jar -daemon'
          : 'java -Xmx512m -jar zap-2.17.0.jar';

      zapProcess = spawn('cmd.exe', ['/k', zapCommand], {
        cwd: 'C:\\Program Files\\ZAP\\Zed Attack Proxy',
        detached: true,
        windowsHide: false,
        stdio: 'inherit'
      });

      zapProcess.unref();

      console.log(`🚀 ZAP CMD käynnistetty PID: ${zapProcess.pid}`);

      return res.json({
        success: true,
        message: `ZAP käynnistetty CMD-ikkunaan PID:llä ${zapProcess.pid}.`
      });
    }

    // Jos kyseessä on Playwright, otetaan käynnistyvästä prosessista viite talteen
    if (pluginId === 'plugin-playwright-server') {
      if (playwrightProcess) {
        try { spawn(`taskkill /pid ${playwrightProcess.pid} /f /t`, { shell: true, stdio: 'ignore' }); } catch (e) {}
      }

      playwrightProcess = spawn('cmd.exe', ['/c', command], {
        detached: true,
        shell: true,
        cwd: cwdOption,
        stdio: 'ignore'
      });
      playwrightProcess.unref();
      console.log(`🚀 Playwright käynnistetty PID:llä ${playwrightProcess.pid}`);
    }  else {
      // Käynnistetään erillisessä uudessa komentorivi-ikkunassa ('start cmd /k ...')
      const child = spawn('cmd.exe', ['/c', `start cmd.exe /k "${command}"`], {
        detached: true,
        shell: true,
        cwd: cwdOption,
        stdio: 'ignore'
      }).unref();
    }

    res.json({ success: true, message: `Plugin ${pluginId} käynnistetty uuteen ikkunaan.` })
  } catch (err) {
    console.error('❌ Virhe pluginin käynnistyksessä:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. SAMMUTUS / UNINSTALL
app.post('/api/plugins/uninstall', (req, res) => {
  const { pluginId } = req.body;
  console.log(`🗑️ Poistetaan / Sammutetaan plugin: ${pluginId}`);

  try {
    if (pluginId?.includes('zap')) {

      if (zapProcess?.pid) {

        console.log(
          `🛑 Suljetaan ZAP CMD-prosessipuu PID ${zapProcess.pid}`
        );

        spawn('taskkill', [
          '/PID',
          String(zapProcess.pid),
          '/T',
          '/F'
        ], {
          windowsHide: false
        });

        zapProcess = null;
      }
    } else if (pluginId && pluginId.includes('playwright')) {
      console.log('ℹ️ Pysäytetään Playwright-taustapalvelu tallennetun PID:n kautta...');

      // Käytetään sitä samaa toimivaa logiikkaa: tapetaan suoraan PID ja sen aliprosessit (/t)
      if (playwrightProcess && playwrightProcess.pid) {
        spawn(`taskkill /pid ${playwrightProcess.pid} /f /t`, { shell: true, stdio: 'ignore' });
        playwrightProcess = null;
      } else {
        // Varakarminaattori, jos muuttuja on ehtinyt nollautua
        spawn('taskkill', ['/f', '/im', 'node.exe', '/fi', 'WINDOWTITLE eq *playwright*'], { shell: true, stdio: 'ignore' });
      }
    }

    res.json({ success: true, message: `Plugin ${pluginId} poistettu / sammutettu.` });
  } catch (err) {
    console.error('❌ Virhe pluginin poistossa:', err);
    res.status(500).json({ success: false, error: err.message })
  }
});

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

// Laajennettu SOAP-reitti Expressissä
app.post('/ws/myservice', express.text({ type: '*/*' }), (req, res) => {
  console.log('📥 Vastaanotettu SOAP-pyyntö:', req.body)

  db.all(`SELECT * FROM soap_items`, [], (err, rows) => {
    if (err) {
      res.status(500).send('<soap:Envelope><soap:Body><Error>Tietokantavirhe</Error></soap:Body></soap:Envelope>')
      return
    }

    const itemsXml = rows.map(r => `
      <Item id="${r.id}">
        <code>${r.item_code}</code>
        <description>${r.description}</description>
        <status>${r.status}</status>
        <amount>${r.amount}</amount>
        <category>${r.category}</category>
      </Item>`).join('')
    
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Header/>
   <soapenv:Body>
      <GetInfoResponse>
         <TotalItems>${rows.length}</TotalItems>
         <Items>
            ${itemsXml}
         </Items>
      </GetInfoResponse>
   </soapenv:Body>
</soapenv:Envelope>`

    res.setHeader('Content-Type', 'text/xml; charset=utf-8')
    res.send(xmlResponse)
  })
})

// Laajempi SOAP-metodi / reitti (Esim. GetProductDetails)
app.post('/ws/productservice', express.text({ type: '*/*' }), (req, res) => {
  console.log('📥 Vastaanotettu SOAP Product -pyyntö:', req.body)

  // Yksinkertainen regex-haku XML:stä, jolla napataan pyydetty tuotekoodi (esim. <itemCode>SOAP-002</itemCode>)
  const match = req.body.match(/<itemCode>(.*?)<\/itemCode>/)
  const itemCode = match ? match[1] : 'SOAP-001'

  // Haetaan kyseinen tuote SQLite-kannasta
  db.get(`SELECT * FROM soap_items WHERE item_code = ?`, [itemCode], (err, row) => {
    if (err || !row) {
      // Jos tuotetta ei löydy, palautetaan SOAP Fault tai virheviesti XML:nä
      const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <soapenv:Fault>
         <faultcode>Server</faultcode>
         <faultstring>Tuotetta koodilla '${itemCode}' ei löytynyt.</faultstring>
      </soapenv:Fault>
   </soapenv:Body>
</soapenv:Envelope>`
      res.setHeader('Content-Type', 'text/xml; charset=utf-8')
      res.status(404).send(errorResponse)
      return
    }

    // Jos tuote löytyy, palautetaan onnistunut SOAP-vastaus
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Header/>
   <soapenv:Body>
      <GetProductDetailsResponse xmlns="http://example.com/">
         <Product>
            <Code>${row.item_code}</Code>
            <Description>${row.description}</Description>
            <Status>${row.status}</Status>
            <Amount>${row.amount}</Amount>
            <Category>${row.category}</Category>
         </Product>
      </GetProductDetailsResponse>
   </soapenv:Body>
</soapenv:Envelope>`

    res.setHeader('Content-Type', 'text/xml; charset=utf-8')
    res.send(xmlResponse)
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Express-taustapalvelin pyörii osoitteessa: http://localhost:${PORT}`)
})