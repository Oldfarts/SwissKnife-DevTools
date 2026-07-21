import { SwissTool } from '../types';

export const jsonTools: SwissTool[] = [
  {
    id: 'json-formatter',
    name: { fi: 'JSON Muotoilija / Validointi', en: 'JSON Formatter / Validator' },
    category: { fi: 'Kehitys & Data', en: 'Dev & Data' },
    description: { fi: 'Siistii, muotoilee ja validoi JSON-merkkijonon.', en: 'Formats and validates JSON strings.' },
    type: 'local',
    inputs: [
      {
        key: 'jsonInput',
        label: { fi: 'Syötä JSON-teksti', en: 'Input JSON Text' },
        type: 'textarea',
        placeholder: { fi: '{"foo":"bar"}', en: '{"foo":"bar"}' }
      }
    ],
    execute: async (inputs) => {
      try {
        const parsed = JSON.parse(inputs.jsonInput || '');
        return { success: true, data: JSON.stringify(parsed, null, 2) };
      } catch (e: any) {
        return { success: false, error: 'Virheellinen JSON: ' + e.message };
      }
    }
  }
];