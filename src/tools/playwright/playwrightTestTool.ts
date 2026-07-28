import { SwissTool } from '../../tools/types';

export const playwrightTestTool: SwissTool = {
  id: 'playwright-web-tester',
  name: { 
    fi: 'Playwright Web-testaus & Kaappaus', 
    en: 'Playwright Web Testing & Snapshot' 
  },
  category: { 
    fi: 'Kehittäjän työkalut & AI', 
    en: 'Developer Tools & AI' 
  },
  description: { 
    fi: 'Aja automaattisia web-testauksia ja ota kuvakaappauksia annetusta URL-osoitteesta Playwrightin avulla.', 
    en: 'Run automated web tests and capture screenshots from a given URL using Playwright.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'targetUrl',
      label: { fi: 'Testattava URL-osoite', en: 'Target URL' },
      type: 'text',
      placeholder: { fi: 'https://example.com', en: 'https://example.com' },
      default: 'https://example.com'
    },
    {
      key: 'actionType',
      label: { fi: 'Testitoiminto', en: 'Test Action' },
      type: 'select',
      options: ['snapshot', 'check_status', 'extract_links'],
      default: 'snapshot'
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      const targetUrl = inputs.targetUrl?.trim();
      const actionType = inputs.actionType || 'snapshot';

      if (!targetUrl) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'Testattava URL-osoite vaaditaan.' : 'Target URL is required.' 
        };
      }

      // Kutsuu paikallista taustapalvelua (joka pyörittää Playwrightia taustalla)
      const response = await fetch('http://localhost:3000/api/playwright-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, action: actionType })
      });

      if (!response.ok) {
        throw new Error(`Paikallinen Playwright-palvelin vastasi virheellä: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: result.success,
        data: result.data || result
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'Playwright-ajo epäonnistui (varmista että taustapalvelu on käynnissä): ' : 'Playwright execution failed (ensure background service is running): ') + e.message 
      };
    }
  }
};