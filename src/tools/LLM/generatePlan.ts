// llmService.ts -lisäys tai oma skripti
import fs from 'fs/promises';
import ollama from 'ollama';
import { ALL_TOOLS } from '../index.ts';

async function createPlanFileWithQwen() {
  const mappedTools = ALL_TOOLS.map(t => ({
    id: t.id,
    name: typeof t.name === 'object' ? (t.name.en || t.name.fi) : t.name
  }));

  const prompt = `
    Olet QA-automaatioagentti. Tässä on järjestelmän työkalulista (${mappedTools.length} kpl):
    ${JSON.stringify(mappedTools, null, 2)}

    Luo testisuunnitelma KAIKILLE näille työkaluille. 
    Palauta VAIN puhtaana JSON-objektina ilman mitään muita tekstejä tai markdown-muotoiluja tällä rakenteella:
    {
      "steps": [
        {
          "id": "tähän id",
          "name": "tähän nimi",
          "description": "Testataan työkalua",
          "selector": "button",
          "testData": {}
        }
      ]
    }
  `;

  const response = await ollama.chat({
    model: 'qwen',
    messages: [{ role: 'user', content: prompt }],
    format: 'json'
  });

  await fs.writeFile('test-plan.json', response.message.content, 'utf-8');
  console.log('✨ Qwen loi testisuunnitelman tiedostoon test-plan.json!');
}