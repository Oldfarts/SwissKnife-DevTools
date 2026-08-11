export const jsonFormatterTool: SwissTool = {
  id: 'json-formatter1',
  name: { fi: 'JSON Pretty Printer', en: 'JSON Pretty Printer' },
  category: { fi: 'Kehitys & Data', en: 'Dev & Data' },
  description: {
    fi: 'Muotoilee ja siistii sekavan JSON-merkkijonon luettavaan muotoon.',
    en: 'Formats and beautifies raw JSON strings into a readable structure.'
  },
  type: 'local',
  inputs: [
    { 
      key: 'rawJson', 
      label: { fi: 'Raaka JSON-syöte', en: 'Raw JSON Input' }, 
      type: 'textarea', 
      placeholder: '{"hello":"world"}',
      default: '{"hello":"world"}' // <-- LISÄTÄÄN TÄMÄ OLETUSARVOKSI
    },
    { key: 'indent', label: { fi: 'Sisennyksen välilyönnit', en: 'Indent Spaces' }, type: 'select', options: ['2', '4'], default: '2' }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      // Varmistetaan vielä koodin puolella turvaverkko: jos syöte on tyhjä, käytetään oletusta
      const rawInput = inputs.rawJson || '{"hello":"world"}';
      const parsed = JSON.parse(rawInput);
      const indentSpaces = parseInt(inputs.indent || '2', 10);
      return { success: true, data: JSON.stringify(parsed, null, indentSpaces) };
    } catch (err: any) {
      return {
        success: false,
        error: lang === 'fi' ? 'Virheellinen JSON: ' + err.message : 'Invalid JSON: ' + err.message
      };
    }
  }
};