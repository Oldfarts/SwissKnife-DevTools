# 🛠️ SwissKnife DevTools – Modulaarinen Kehittäjän Työkalupakki

SwissKnife on modulaarinen, puhtaasti selaimessa toimiva työkaluarkkitehtuuri kehittäjille ja ylläpitäjille. Ohjelman ytimenä on **plugin-pohjainen rakenne**: käyttöliittymä (`SwissKnifeUI.tsx`) ja hallintalogiikka on erotettu täysin itse työkaluista (`*.ts`-tiedostot). Tämän ansiosta työkaluja on helppo lisätä, poistaa tai siirtää sellaisenaan myös muihin projekteihin.

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
* Sisältää esimerkki tiedoston \SwissKnife-DevTools\src\example-workflows\Työnkulku.json

<img width="1919" height="1033" alt="image" src="https://github.com/user-attachments/assets/098671c3-f0b4-47e1-b40c-842b2da86a4b" />
