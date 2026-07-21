import { SwissTool } from './types';

export const jwtTools: SwissTool[] = [
  // 1. JWT DEKOODERI
  {
    id: 'jwt-decoder',
    name: { fi: 'JWT-dekooderi', en: 'JWT Decoder' },
    category: { fi: 'Tietoturva & Auth', en: 'Security & Auth' },
    description: { fi: 'Purkaa JWT-tokenin (Header & Payload) ilman avainta.', en: 'Decodes JWT token Header and Payload.' },
    type: 'local',
    inputs: [
      {
        key: 'token',
        label: { fi: 'Syötä JWT Token', en: 'Input JWT Token' },
        type: 'textarea',
        placeholder: { fi: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', en: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
      }
    ],
    execute: async (inputs) => {
      try {
        const rawToken = (inputs.token || '').trim();
        const parts = rawToken.split('.');
        if (parts.length !== 3) {
          return { success: false, error: 'Virheellinen JWT-rakenne (pitää olla 3 osaa eroteltuna pisteellä).' };
        }

        const decodeBase64Url = (str: string) => {
          let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          return JSON.parse(atob(base64));
        };

        return {
          success: true,
          data: {
            header: decodeBase64Url(parts[0]),
            payload: decodeBase64Url(parts[1]),
            signature: parts[2]
          }
        };
      } catch (e: any) {
        return { success: false, error: 'Dekoodaus epäonnistui: ' + e.message };
      }
    }
  },

  // 2. JWT ENKOODERI / GENERAATTORI (HMAC SHA-256)
  {
    id: 'jwt-encoder',
    name: { fi: 'JWT-enkooderi (HS256)', en: 'JWT Encoder (HS256)' },
    category: { fi: 'Tietoturva & Auth', en: 'Security & Auth' },
    description: {
      fi: 'Luo ja allekirjoittaa validin JWT-tokenin (HS256) annetulla salaisuudella (Secret Key).',
      en: 'Creates and signs a valid JWT token (HS256) using a secret key.'
    },
    type: 'local',
    inputs: [
      {
        key: 'secret',
        label: { fi: 'Salainen avain (Secret Key)', en: 'Secret Key' },
        type: 'text',
        placeholder: { fi: 'esim. super-secret-key-123', en: 'e.g. super-secret-key-123' },
        default: 'secret-key'
      },
      {
        key: 'payload',
        label: { fi: 'Payload (JSON)', en: 'Payload (JSON)' },
        type: 'textarea',
        placeholder: { fi: '{\n  "sub": "1234567890",\n  "name": "Matti Meikäläinen",\n  "admin": true\n}', en: '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "admin": true\n}' },
        default: '{\n  "sub": "1234567890",\n  "name": "Matti Meikäläinen",\n  "admin": true\n}'
      }
    ],
    execute: async (inputs) => {
      try {
        const secret = inputs.secret || '';
        const payloadRaw = inputs.payload || '{}';

        // Validoidaan että payload on kelvollista JSONia
        let parsedPayload: any;
        try {
          parsedPayload = JSON.parse(payloadRaw);
        } catch (e) {
          return { success: false, error: 'Payload on oltava kelvollista JSON-muotoa.' };
        }

        // Standardi HS256 otsake
        const header = { alg: 'HS256', typ: 'JWT' };

        // Base64URL-koodausapufunktio
        const base64UrlEncode = (str: string) => {
          const base64 = btoa(unescape(encodeURIComponent(str)));
          return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        };

        const encodedHeader = base64UrlEncode(JSON.stringify(header));
        const encodedPayload = base64UrlEncode(JSON.stringify(parsedPayload));

        const dataToSign = `${encodedHeader}.${encodedPayload}`;

        // Allekirjoitetaan HMAC SHA-256:lla käyttäen selaimen Web Crypto APIa
        const encoder = new TextEncoder();
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign(
          'HMAC',
          cryptoKey,
          encoder.encode(dataToSign)
        );

        // Muunnetaan allekirjoitus Base64URL-muotoon
        const signatureBytes = new Uint8Array(signatureBuffer);
        let binaryString = '';
        for (let i = 0; i < signatureBytes.byteLength; i++) {
          binaryString += String.fromCharCode(signatureBytes[i]);
        }
        const encodedSignature = btoa(binaryString)
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');

        const token = `${dataToSign}.${encodedSignature}`;

        return {
          success: true,
          data: {
            token: token,
            header: header,
            payload: parsedPayload
          }
        };
      } catch (e: any) {
        return { success: false, error: 'JWT-luonti epäonnistui: ' + e.message };
      }
    }
  }
];