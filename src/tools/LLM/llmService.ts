// llmService.ts
import ollama from 'ollama';

export async function generateAgentPlan(tools: any[]) {
  // Muunnetaan koko työkaluvalikoima kevyempään muotoon LLM:lle
  const mappedTools = tools.map(t => ({
    id: t.id,
    name: typeof t.name === 'object' ? (t.name.en || t.name.fi) : t.name
  }));

  const prompt = `
    Olet QA-automaatioagentti. Tässä on järjestelmän työkalulista (${mappedTools.length} kpl):
    ${JSON.stringify(mappedTools, null, 2)}

    Tehtäväsi: Luo testisuunnitelma KAIKILLE yllä oleville työkaluille (tee jokaiselle oma askel listaan).
    Palauta VAIN puhtaana JSON-objektina ilman markdown-muotoiluja.

    Käytä tätä tarkkaa rakennetta:
    {
      "steps": [
        {
          "id": "työkalun id listasta",
          "name": "työkalun nimi listasta",
          "description": "Testataan työkalua",
          "selector": "button",
          "testData": {}
        }
      ]
    }
  `;

  try {
    const response = await ollama.chat({
      model: 'qwen',
      messages: [{ role: 'user', content: prompt }],
      format: 'json'
    });

    return JSON.parse(response.message.content);
  } catch (e) {
    console.error('Virhe LLM-suunnitelman generoinnissa:', e);
    return { steps: [] };
  }
}