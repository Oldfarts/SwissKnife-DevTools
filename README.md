# 🛠️ SwissKnife DevTools – Modulaarinen Kehittäjän Työkalupakki

SwissKnife on modulaarinen, puhtaasti selaimessa toimiva työkaluarkkitehtuuri kehittäjille ja ylläpitäjille. Ohjelman ytimenä on **plugin-pohjainen rakenne**: käyttöliittymä (`SwissKnifeUI.tsx`) ja hallintalogiikka on erotettu täysin itse työkaluista (`*.ts`-tiedostot). Tämän ansiosta työkaluja on helppo lisätä, poistaa tai siirtää sellaisenaan myös muihin projekteihin.

## 🚀 Asennusohjeet WINDOWSille

Näillä ohjeilla saat projektin kloonattua ja käynnistettyä omalla koneellasi:

1. **Kloonaa repositorio tai lataa projekti:**
   ```bash
   git clone <repositorion-url>
   cd SwissKnife-DevTools

2. **Asenna tarvittavat riippuvuudet:**
   ```bash
   npm install

3. **Asenna Playwright-selaimet (tarvitaan automaatiotesteille):**
   ```bash
   npx playwright install

4. **OWASP ZAP, lataa ja asenna se os.https://www.zaproxy.org/download/**

Versio 2.17.0 on itsellä asennettuna.

5. **OWASP ZAP & API Key -asetukset (No Key / Avaimeton tila):**

6. **Käynnistä kehityspalvelin (käynnistää automaattisesti myös ZAP:n ja Playwright-taustapalvelun, mikäli asennettu):**
   ```bash
   npm run dev


6.1 **Intro**

Oletuksena OWASP ZAP vaatii API-avaimen (API key) kaikkien skriptien, proxyn ja API-kutsujen yhteydessä turvallisuussyistä. Kun kehitetään paikallisesti (esim. SwissKnife DevTools -projektin sisällä tai automaatiotesteissä), API-avaimen kysely tai sen puuttumisesta johtuvat `401 Unauthorized` -virheet halutaan usein kytkeä pois päältä.

Tässä ovat tavat, miten OWASP ZAP saadaan ajettua ilman API-avainta (**No Key**):
-config api.disablekey=true: Tämä parametri kertoo ZAP:lle, että API-kutsuja voi tehdä vapaasti ilman apikey-muuttujaa.

6.2.**Manuaalinen käynnistys komentoriviltä ilman avainta**

Jos käynnistät ZAP:n manuaalisesti erillisestä .bat-tiedostosta tai komentoriviltä daemon-tilassa, lisää komennon perään sama konfiguraatiolipuke:

"C:\Program Files\ZAP\Zed Attack Proxy\Zap.bat" -daemon -port 8080 -config api.disablekey=true


6.3.**ZAP:n käyttöliittymän (GUI) kautta tehdyt asetukset**

Jos avaat ZAP:n graafisen käyttöliittymän ja haluat poistaa API-avaimen pysyvästi käytöstä:
Avaa ZAP GUI.
Siirry ylävalikosta kohtaan: Tools -> Options.
Etsi vasemman reunan valikosta API.
Poista rasti ruudusta kohdasta: "Use API key" (Käytä API-avainta).
Paina OK.

⚠️ Turvallisuushuomautus: API-avaimen poistaminen käytöstä (api.disablekey=true) on turvallista vain omalla paikallisella kehityskoneellasi (localhost), jossa muut verkon laitteet eivät pääse käsiksi ZAP:n porttiin 8080. Älä koskaan käytä tätä asetusta julkisessa verkossa tai tuotantoympäristössä.

---

## 🧩 Modulaarinen Plugin-arkkitehtuuri

Kaikki ohjelman työkalut noudattavat yhtenäistä `SwissTool`-rajapintaa (`types.ts`). Jokainen työkalu on itsenäinen moduuli, joka määrittelee omat syötteensä, kategoriansa, kielitukensa (FI/EN) ja suorituslogiikkansa (`execute`).

---

## 🛠️ Työkalukokonaisuudet (Moduulit)

Projekti pitää sisällään seuraavat kattavat työkalukategoriat:

### 1. JSON-työkalut (`jsonTools.ts`)
* Muotoilu (Pretty print), validointi ja virheidenjäljitys.
* Minifiointi ja rakenteen tarkastelu.

### 2. XML-työkalut (`xmlTools.ts`)
* XML-rakenteen validointi, jäsenteleminen ja siistiminen.

### 3. JWT-dekooderi (`jwtTools.ts`)
* JSON Web Tokenien (JWT) purku.
* Näyttää Header-, Payload- ja Signature-osat selkeästi eriteltynä ilman salaisuuksien paljastamista.

### 4. Hash-työkalut (`hashTools.ts`)
* Turvalliset kryptografiset tiivisteet suoraan selaimessa (`MD5`, `SHA-1`, `SHA-256`, `SHA-512`).

### 5. Kuvien EXIF-luku (`imageTools.ts`)
* Kuvatiedostojen (JPEG/PNG) metadata-analyysi.
* Näyttää kameran tiedot, kuvausajan, resoluution ja mahdolliset sijaintitiedot.

### 6. QR-analyysi (`qrTools.ts`)
* QR-koodien luku kuvatiedostoista ja koodien generointi tekstistä/URL-osoitteista.

### 7. DNS-työkalut (`dnsTools.ts`)
* Verkkotunnusten nimipalvelintietojen ja DNS-tietueiden tarkastelutyökalut.

### 8. SSL-työkalut (`sslTools.ts`)
* Sertifikaattien voimassaolon, myöntäjien ja tietojen tarkistus.

### 9. API-testaus & Testikoodigeneraattorit (`apiTools.ts`, `restUnitTestGeneratorTool.ts`, `soapUnitTestGeneratorTool.ts`, jne.)
* **REST API -tester:** Kustomoidut HTTP-pyynnöt (GET, POST, PUT, PATCH, DELETE) JSON-kehikoilla.
* **SOAP API -tester:** XML-pohjaiset SOAP-kutsut mukautetuilla otsikoilla ja `Envelope`-pohjilla.
* **OpenAPI/Swagger -> Jest & Python Unittest Generator:** Generoi automaattisesti valmista unit-testikoodia REST- ja SOAP-rajapinnoille.

### 10. Muunnokset (`converterTools.ts`)
* Reaaliaikaiset koodaukset ja dekoodaukset: `Base64`, `URL Encoding`, `Hex`, `Binary` ja merkkijonojen muunnokset.

### 11. Automatisoidut Työnkulut (`WorkflowBuilder.tsx` & `WorkflowStorage.ts`)
* Mahdollistaa useamman työkalun ketjuttamisen automatisoiduiksi työnkuluiksi (reseptit).
* Sisältää tuonnin ja viennin JSON-tiedostoina (`WorkflowManager`).
* Sisältää esimerkki tiedoston `\SwissKnife-DevTools\src\example-workflows\Työnkulku.json`.

<img width="1919" height="1033" alt="image" src="https://github.com/user-attachments/assets/098671c3-f0b4-47e1-b40c-842b2da86a4b" />
---

## 🤖 Kehittäjän Työkalut & Taustapalvelut (Playwright & OWASP ZAP)

Projekti sisältää valmiit integrointi- ja automatisointityökalut selaimen ohjaukseen sekä tietoturvatestaukseen:

### Playwright (Selainautomaatio & Testit)
Sijainti: `src\tools\playwright\`
* **Käynnistys:** Voit käynnistää Playwright-taustapalvelun erilliseen komentorivi-ikkunaan suoraan Vite-kehityspalvelimen kautta tai ajamalla projektin juuresta `start-playwrightServer.bat`.
* **Testien ajaminen UI-tilassa:**
  ```bash
  cd src\tools\playwright
  npx playwright test testRestExecution.spec.js --ui

Tallennus (Codegen):
<img width="776" height="33" alt="image" src="https://github.com/user-attachments/assets/f73dd453-42e8-4eec-af06-a53a171a36fc" />

OWASP ZAP (Tietoturva & Daemon)
Sijainti: start-ZAP.bat / C:\Program Files\ZAP\Zed Attack Proxy\Zap.bat

Käynnistys: ZAP voidaan käynnistää automaattisesti taustalle (Daemon-tilassa portissa 8080 ilman API-avainrajoituksia) suoraan vite.config.ts-tiedoston kautta kehitysympäristön käynnistyessä (npm run dev).

Proxy-tuki: Vite-kehityspalvelin välittää automaattisesti pyynnöt osoitteesta /zap-api suoraan paikalliselle ZAP-rajapinnalle.
