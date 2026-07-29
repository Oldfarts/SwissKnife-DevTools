// server.js
import express from 'express'
import cors from 'cors'
import db from './src/tools/sqlite/db.js' // Haetaan moduuli omasta kansiostaan

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

// --- API-REITIT ---

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

// --- AUTENTIKOINTI & KÄYTTÄJÄT ---

// 1. Kirjautumistesti (POST)
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

// --- REST-TESTIDATA (PRODUCTS) ---
app.get('/api/login', (req, res) => {
  res.json({ success: true, message: 'Käytä POST-metodia kirjautumiseen (lähetä username ja password JSON-bodyssa).' })
})

// 2. Hae kaikki tuotteet (GET)
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message })
    res.json({ success: true, data: rows })
  })
})

app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message })
    if (!row) return res.status(404).json({ success: false, error: 'Tuotetta ei löydy' })
    res.json({ success: true, data: row })
  })
})

// 3. Lisää uusi tuote (POST)
app.post('/api/products', (req, res) => {
  const { title, price, category } = req.body
  if (!title || price === undefined) {
    return res.status(400).json({ success: false, error: 'Otsikko (title) ja hinta (price) vaaditaan.' })
  }

  const query = `INSERT INTO products (title, price, category) VALUES (?, ?, ?)`
  db.run(query, [title, price, category || 'Yleinen'], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message })
    res.json({
      success: true,
      data: { id: this.lastID, title, price, category: category || 'Yleinen' }
    })
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Express-taustapalvelin pyörii osoitteessa: http://localhost:${PORT}`)
})