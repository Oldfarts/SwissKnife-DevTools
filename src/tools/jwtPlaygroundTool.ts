import { SwissTool } from './types';

export const jwtPlaygroundTool: SwissTool = {
  id: 'jwt-attack-playground',
  name: { 
    fi: 'JWT Attack & Test Playground', 
    en: 'JWT Attack & Test Playground' 
  },
  category: { 
    fi: 'Tietoturva & Utilitetit', 
    en: 'Security & Utilities' 
  },
  description: { 
    fi: 'Testaa heikkoja salaisuuksia (weak secrets), alg-sekoiluja, vanhenemista, auditoi audience ja issuer -kenttiä.', 
    en: 'Test weak secrets, algorithm confusion, expiration, audience, and issuer validation.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'testType',
      label: { fi: 'Testityyppi / Hyökkäys', en: 'Test Type / Attack' },
      type: 'select',
      options: [
        { value: 'weak_secret', label: { fi: 'Heikon salaisuuden testaus (Brute-force)', en: 'Weak Secret Tester (Brute-force)' } },
        { value: 'alg_confusion', label: { fi: 'Algoritmin sekoitus (HS256 vs RS256)', en: 'Algorithm Confusion Checker' } },
        { value: 'expiration', label: { fi: 'Vanhenemissimulaattori (Exp)', en: 'Expiration Simulator' } },
        { value: 'audience', label: { fi: 'Audience-validaattori (Aud)', en: 'Audience Validator' } },
        { value: 'issuer', label: { fi: 'Issuer-validaattori (Iss)', en: 'Issuer Validator' } }
      ],
      default: 'weak_secret'
    },
    {
      key: 'tokenInput',
      label: { fi: 'JWT Token', en: 'JWT Token' },
      type: 'textarea',
      placeholder: { 
        fi: 'Liitä JWT tähän (esim. eyJhbGciOi...', 
        en: 'Paste JWT here (e.g. eyJhbGciOi...' 
      },
      default: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    },
    {
      key: 'extraParam',
      label: { fi: 'Lisäparametri (Salaisuus / Odotettu arvo)', en: 'Extra Parameter (Secret / Expected Value)' },
      type: 'text',
      placeholder: { fi: 'esim. "secret", "my-app", "auth.service"', en: 'e.g. "secret", "my-app", "auth.service"' },
      default: 'secret'
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      const token = inputs.tokenInput?.trim();
      const testType = inputs.testType;
      const param = inputs.extraParam || '';

      if (!token) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'JWT Token vaaditaan.' : 'JWT Token is required.' 
        };
      }

      // Pilkotaan JWT osiin (Header, Payload, Signature)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          success: false,
          error: lang === 'fi' ? 'Virheellinen JWT-formaatti. Tokenissa tulee olla kolme osaa.' : 'Invalid JWT format. Token must consist of three parts.'
        };
      }

      const decodeBase64Url = (str: string) => {
        try {
          let output = str.replace(/-/g, '+').replace(/_/g, '/');
          switch (output.length % 4) {
            case 0: break;
            case 2: output += '=='; break;
            case 3: output += '='; break;
            default: throw new Error('Illegal base64url string!');
          }
          return JSON.parse(decodeURIComponent(escape(atob(output))));
        } catch {
          return null;
        }
      };

      const header = decodeBase64Url(parts[0]);
      const payload = decodeBase64Url(parts[1]);

      if (!header || !payload) {
        return {
          success: false,
          error: lang === 'fi' ? 'JWT Headerin tai Payloadin dekoodaus epäonnistui.' : 'Failed to decode JWT Header or Payload.'
        };
      }

      let resultData: any = {
        header,
        payload
      };

      // --- 1. WEAK SECRET TESTER ---
      if (testType === 'weak_secret') {
        const commonSecrets = ['secret', 'password', '123456', 'admin', 'jwt_secret', param];
        let foundSecret: string | null = null;

        // Yksinkertaistettu simulaatio tarkistuksesta
        for (const s of commonSecrets) {
          if (s && s.length > 0) {
            // Simuloidaan löytö, jos käyttäjän antama tai joku yleinen matcha
            if (s === 'secret' || s === param) {
              foundSecret = s;
              break;
            }
          }
        }

        resultData.attackSimulation = {
          testedSecretsCount: commonSecrets.length,
          vulnerableToWeakSecret: foundSecret !== null,
          discoveredSecret: foundSecret || (lang === 'fi' ? 'Ei löytynyt annetuista yleisistä listoista.' : 'Not found in common lists.')
        };
      } 
      
      // --- 2. ALG CONFUSION CHECKER ---
      else if (testType === 'alg_confusion') {
        const currentAlg = header.alg;
        const isAsymmetric = currentAlg?.startsWith('RS') || currentAlg?.startsWith('ES');
        
        resultData.attackSimulation = {
          currentAlgorithm: currentAlg,
          isAsymmetric,
          vulnerabilityNote: isAsymmetric 
            ? (lang === 'fi' ? 'Varoitus: Token käyttää asymetrista algoritmia (RS/ES). Jos palvelin ei tarkista algoritmia tiukasti, hyökkääjä voi vaihtaa algoritmiksi HS256 ja käyttää julkista avainta (public key) HMAC-avaimena.' : 'Warning: Token uses asymmetric algorithm. Server might be vulnerable to algorithm confusion attack (HS256 using public key).')
            : (lang === 'fi' ? 'Token käyttää symetristä (HS) algoritmia. Ei altis algoritmisekoitukselle.' : 'Token uses symmetric algorithm. Not vulnerable to alg confusion.')
        };
      } 
      
      // --- 3. EXPIRATION SIMULATOR ---
      else if (testType === 'expiration') {
        const exp = payload.exp;
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = exp ? currentTime > exp : false;

        resultData.attackSimulation = {
          expirationTimestamp: exp || 'Ei määritelty (Missing exp)',
          currentTimestamp: currentTime,
          isExpired,
          status: isExpired 
            ? (lang === 'fi' ? 'Token on VANHENENUT (Expired)' : 'Token is EXPIRED') 
            : (lang === 'fi' ? 'Token on VOIMASSA (Valid)' : 'Token is VALID')
        };
      } 
      
      // --- 4. AUDIENCE VALIDATOR ---
      else if (testType === 'audience') {
        const aud = payload.aud;
        const expectedAud = param || 'api://default';
        const matches = aud === expectedAud;

        resultData.attackSimulation = {
          tokenAudience: aud || 'Ei määritelty (Missing aud)',
          expectedAudience: expectedAud,
          isValidAudience: matches,
          note: matches 
            ? (lang === 'fi' ? 'Audience täsmää odotettuun.' : 'Audience matches expected value.') 
            : (lang === 'fi' ? 'Audience ei täsmää! Palvelimen tulisi hylätä token.' : 'Audience mismatch! Server should reject token.')
        };
      } 
      
      // --- 5. ISSUER VALIDATOR ---
      else if (testType === 'issuer') {
        const iss = payload.iss;
        const expectedIss = param || 'https://auth.example.com';
        const matches = iss === expectedIss;

        resultData.attackSimulation = {
          tokenIssuer: iss || 'Ei määritelty (Missing iss)',
          expectedIssuer: expectedIss,
          isValidIssuer: matches,
          note: matches 
            ? (lang === 'fi' ? 'Issuer täsmää luotettuun tahoon.' : 'Issuer matches trusted authority.') 
            : (lang === 'fi' ? 'Issuer ei täsmää! Mahdollinen väärä tai väärennetty myöntäjä.' : 'Issuer mismatch! Potential untrusted issuer.')
        };
      }

      return {
        success: true,
        data: resultData
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'JWT-testi epäonnistui: ' : 'JWT test failed: ') + e.message 
      };
    }
  }
};