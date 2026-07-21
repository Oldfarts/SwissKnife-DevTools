import { SwissTool } from './types';

export const regexTesterTool: SwissTool = {
  id: 'regex-tester',
  name: { fi: 'RegEx-testaaja', en: 'RegEx Tester' },
  category: { fi: 'Teksti & Koodi', en: 'Text & Code' },
  description: {
    fi: 'Testaa säännöllisiä lausekkeita (RegEx) syötetekstiin ja näe täsmäykset lennosta.',
    en: 'Test Regular Expressions (RegEx) against text and see real-time matches.'
  },
  type: 'local',
  inputs: [
    { key: 'pattern', label: { fi: 'RegEx-lauseke', en: 'RegEx Pattern' }, type: 'text', placeholder: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}' },
    { key: 'flags', label: { fi: 'Liput (Flags)', en: 'Flags' }, type: 'text', default: 'gi', placeholder: 'gi' },
    { key: 'text', label: { fi: 'Testattava teksti', en: 'Test Text' }, type: 'textarea', placeholder: 'test@example.com' }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      if (!inputs.pattern || !inputs.text) {
        return {
          success: false,
          error: lang === 'fi' ? 'Syötä lauseke ja teksti.' : 'Please provide pattern and text.'
        };
      }
      const regex = new RegExp(inputs.pattern, inputs.flags || '');
      const matches = [...inputs.text.matchAll(regex)];

      return {
        success: true,
        data: {
          totalMatches: matches.length,
          matches: matches.map((m, i) => ({
            index: i + 1,
            match: m[0],
            position: m.index,
            groups: m.groups || null
          }))
        }
      };
    } catch (err: any) {
      return { success: false, error: (lang === 'fi' ? 'RegEx-virhe: ' : 'RegEx Error: ') + err.message };
    }
  }
};