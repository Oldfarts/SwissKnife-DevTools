import { SwissTool } from '../types';

export const encoderTools: SwissTool[] = [
  {
    id: 'encoders-decoders',
    name: { fi: 'Yleiset Muunnokset (Base64 / URL / Hex)', en: 'General Encoders / Decoders' },
    category: { fi: 'Kehitys & Data', en: 'Dev & Data' },
    description: { fi: 'Koodaa tai pura tekstiä eri formaatteihin.', en: 'Encode or decode text in various formats.' },
    type: 'local',
    inputs: [
      {
        key: 'mode',
        label: { fi: 'Toiminto', en: 'Operation' },
        type: 'select',
        options: [
          'Base64 Encode',
          'Base64 Decode',
          'URL Encode',
          'URL Decode',
          'Text -> Hex',
          'Hex -> Text'
        ],
        default: 'Base64 Encode'
      },
      {
        key: 'text',
        label: { fi: 'Teksti', en: 'Text' },
        type: 'textarea'
      }
    ],
    execute: async (inputs) => {
      try {
        const text = inputs.text || '';
        let result = '';

        switch (inputs.mode) {
          case 'Base64 Encode':
            result = btoa(unescape(encodeURIComponent(text)));
            break;
          case 'Base64 Decode':
            result = decodeURIComponent(escape(atob(text)));
            break;
          case 'URL Encode':
            result = encodeURIComponent(text);
            break;
          case 'URL Decode':
            result = decodeURI(text);
            break;
          case 'Text -> Hex':
            result = Array.from(new TextEncoder().encode(text))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' ');
            break;
          case 'Hex -> Text':
            const hexes = text.replace(/\s+/g, '').match(/.{1,2}/g) || [];
            const bytes = new Uint8Array(hexes.map((h: string) => parseInt(h, 16)));
            result = new TextDecoder().decode(bytes);
            break;
        }

        return { success: true, data: result };
      } catch (e: any) {
        return { success: false, error: 'Muunnos epäonnistui: ' + e.message };
      }
    }
  }
];