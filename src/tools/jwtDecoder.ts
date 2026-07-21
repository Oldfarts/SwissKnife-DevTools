import { SwissTool } from './types';

export const jwtDecoderTool: SwissTool = {
  id: 'jwt-decoder',
  name: { fi: 'JWT-dekooderi2', en: 'JWT Decoder2' },
  category: { fi: 'Tietoturva & Auth', en: 'Security & Auth' },
  description: {
    fi: 'Pura JSON Web Token (Header, Payload & Signature) turvallisesti paikallisesti.',
    en: 'Decode JSON Web Tokens (Header, Payload & Signature) securely in your browser.'
  },
  type: 'local',
  inputs: [
    { key: 'token', label: { fi: 'JWT Token', en: 'JWT Token' }, type: 'textarea', placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      const parts = inputs.token.trim().split('.');
      if (parts.length !== 3) {
        return {
          success: false,
          error: lang === 'fi' 
            ? 'Virheellinen JWT. Tokenin tulee sisältää 3 osaa pisteellä eroteltuna.' 
            : 'Invalid JWT structure. Token must contain 3 parts separated by dots.'
        };
      }

      const decodeBase64Url = (str: string) => {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) { base64 += '='; }
        return JSON.parse(atob(base64));
      };

      return {
        success: true,
        data: {
          Header: decodeBase64Url(parts[0]),
          Payload: decodeBase64Url(parts[1]),
          Signature: parts[2]
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: (lang === 'fi' ? 'Purku epäonnistui: ' : 'Decoding failed: ') + err.message
      };
    }
  }
};