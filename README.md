# 🛠️ SwissKnife DevTools – Modulaarinen Kehittäjän Työkalupakki

SwissKnife on modulaarinen, puhtaasti selaimessa toimiva työkaluarkkitehtuuri kehittäjille ja ylläpitäjille. Ohjelman ytimenä on **plugin-pohjainen rakenne**: käyttöliittymä (`SwissKnifeUI.tsx`) ja hallintalogiikka on erotettu täysin itse työkaluista (`*.ts`-tiedostot). Tämän ansiosta työkaluja on helppo lisätä, poistaa tai siirtää sellaisenaan myös muihin projekteihin.

---

## 🧩 Modulaarinen Plugin-arkkitehtuuri

Kaikki ohjelman työkalut noudattavat yhtenäistä `SwissTool`-rajapintaa (`types.ts`). Jokainen työkalu on itsenäinen moduuli, joka määrittelee omat syötteensä, kategoriansa, kielitukensa (FI/EN) ja suorituslogiikkansa (`execute`).

Voit siirtää minkä tahansa alla olevista työkaluista tai kokonaisia kategoriatiedostoja toiseen projektiin yksinkertaisesti viemällä kyseisen tiedoston ja varmistamalla, että kohdeohjelma tukee `SwissTool`-formaattia.

---

## 🛠️ Työkalukokonaisuudet (Moduulit)

Projekti pitää sisällään seuraavat kattavat työkalukategoriat:

### 1. JSON-työkalut (`jsonTools.ts`)
*   Muotoilu (Pretty print), validointi ja virheidenjäljitys.
*   Minifiointi ja rakenteen tarkastelu.

### 2. XML-työkalut (`xmlTools.ts`)
*   XML-rakenteen validointi, jäsentleminen ja siistiminen.

### 3. JWT-dekooderi (`jwtTools.ts`)
*   JSON Web Tokenien (JWT) purku.
*   Näyttää Header-, Payload- ja Signature-osat selkeästi eriteltynä ilman salaisuuksien paljastamista.

### 4. Hash-työkalut (`hashTools.ts`)
*   Turvalliset kryptografiset tiivisteet suoraan selaimessa (`MD5`, `SHA-1`, `SHA-256`, `SHA-512`).

### 5. Kuvien EXIF-luku (`imageTools.ts`)
*   Kuvatiedostojen (JPEG/PNG) metadata-analyysi.
*   Näyttää kameran tiedot, kuvausajan, resoluution ja mahdolliset sijaintitiedot.

### 6. PDF-analyysi (`documentTools.ts`)
*   PDF-tiedostojen metatietojen ja rakenteen tarkastelu.

### 7. APK-analyysi (`binaryTools.ts`)
*   Androidin APK-asennuspakettien perusanalyysi ja metatietojen luku.

### 8. QR-analyysi (`qrTools.ts`)
*   QR-koodien luku kuvatiedostoista ja koodien generointi tekstistä/URL-osoitteista.

### 9. DNS-työkalut (`dnsTools.ts`)
*   Verkkotunnusten nimipalvelintietojen ja DNS-tietueiden tarkastelutyökalut.

### 10. SSL-työkalut (`sslTools.ts`)
*   Sertifikaattien voimassaolon, myöntäjien ja tietojen tarkistus.

### 11. API-testaus (`apiTools.ts`)
*   **REST API -tester:** Kustomoidut HTTP-pyynnöt (GET, POST, PUT, PATCH, DELETE) JSON-kehikoilla.
*   **SOAP API -tester:** XML-pohjaiset SOAP-kutsut mukautetuilla otsikoilla ja `Envelope`-pohjilla.
*   *Sisältää rullaavan ja skaalautuvan tulosikkunan (vaaka- ja pystyvieritykset).*

### 12. Muunnokset (`converterTools.ts`)
*   Reaaliaikaiset koodaukset ja dekoodaukset: `Base64`, `URL Encoding`, `Hex`, `Binary` ja merkkijonojen muunnokset.

---

## 📋 Järjestelmävaatimukset

*   [Node.js](https://nodejs.org/) (suosituksena LTS-versio)

---

## ⚙️ Asennusohjeet

1. **Hae tai kloonaa repositorio:**
   ```bash
   git clone https://github.com/Oldfarts/SwissKnife-DevTools
   cd <projektin-kansio>
Asenna riippuvuudet (esim. Lucide-ikoneita varten):

Bash
npm install
▶️ Ohjelman käynnistys
Käynnistä kehitysympäristö paikallisesti:

Bash
npm run dev
Komento käynnistää Vite-palvelimen, ja ohjelma aukeaa selaimeen osoitteeseen:
👉 http://localhost:5173
