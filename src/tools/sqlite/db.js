import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.resolve(__dirname, 'database.sqlite')
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Virhe tietokannan avauksessa:', err.message)
  } else {
    console.log('✅ Yhdistetty SQLite-tietokantaan:', dbPath)
  }
})

db.serialize(() => {
  // 1. Käyttäjätaulu (simppeli auth-testaukseen)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )`)

  // 2. REST-testidatataulu (tuotteet)
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT,
    in_stock INTEGER DEFAULT 1
  )`)

  // 3. SOAP-testidatataulu
  db.run(`CREATE TABLE IF NOT EXISTS soap_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE'
  )`)

  // Lisätään oletustestidataa automaattisesti, jos taulut ovat tyhjiä
  db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO users (username, password, role) VALUES ('admin', 'salasana123', 'admin')`)
      db.run(`INSERT INTO users (username, password, role) VALUES ('testi_kayttaja', 'testi123', 'user')`)
      console.log('👤 Testikäyttäjät lisätty kantaan (admin / salasana123)')
    }
  })

  db.get(`SELECT COUNT(*) as count FROM products`, (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO products (title, price, category) VALUES ('Testituote A', 19.99, 'Elektroniikka')`)
      db.run(`INSERT INTO products (title, price, category) VALUES ('Testituote B', 9.50, 'Kirjat')`)
      console.log('📦 REST-testidata lisätty kantaan (products)')
    }
  })

  db.get(`SELECT COUNT(*) as count FROM soap_items`, (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO soap_items (item_code, description, status) VALUES ('SOAP-001', 'Esimerkki SOAP-tilaus', 'PENDING')`)
      db.run(`INSERT INTO soap_items (item_code, description, status) VALUES ('SOAP-002', 'Toinen SOAP-tilaus', 'APPROVED')`)
      console.log('📜 SOAP-testidata lisätty kantaan (soap_items)')
    }
  })
})

export default db