import { SwissTool } from '../types';

export const hashTools: SwissTool[] = [
  {
    id: 'hash-generator',
    name: { fi: 'Hash-generaattori (SHA-256 / SHA-512)', en: 'Hash Generator' },
    category: { fi: 'Tietoturva & Kryptografia', en: 'Security & Crypto' },
    description: { fi: 'Laskee tekstille Web Crypto API:n avulla tiivisteen (hash).', en: 'Generates crypto hashes using Web Crypto API.' },
    type: 'local',
    inputs: [
      {
        key: 'text',
        label: { fi: 'Syöteteksti', en: 'Input Text' },
        type: 'textarea'
      },
      {
        key: 'algo',
        label: { fi: 'Algoritmi', en: 'Algorithm' },
        type: 'select',
        options: ['SHA-256', 'SHA-512', 'SHA-1'],
        default: 'SHA-256'
      }
    ],
    execute: async (inputs) => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(inputs.text || '');
        const hashBuffer = await crypto.subtle.digest(inputs.algo || 'SHA-256', data);
        const hashHex = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        return {
          success: true,
          data: {
            algorithm: inputs.algo || 'SHA-256',
            hash: hashHex
          }
        };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
  }
];