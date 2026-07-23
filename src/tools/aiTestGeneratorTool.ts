import { SwissTool } from './types';

export const aiTestGeneratorTool: SwissTool = {
  id: 'ai-swagger-test-generator',
  name: { 
    fi: 'Swagger -> Unit Testitapaukset', 
    en: 'Swagger -> Unit Test Cases' 
  },
  category: { 
    fi: 'Kehittäjän työkalut & AI', 
    en: 'Developer Tools & AI' 
  },
  description: { 
    fi: 'Analysoi Swagger/OpenAPI-määrittelyn ja generoi listan unit-testitapauksista (happy path & edge cases).', 
    en: 'Analyzes a Swagger/OpenAPI definition and generates a list of unit test cases (happy path & edge cases).' 
  },
  type: 'local',
  inputs: [
    {
      key: 'swaggerJson',
      label: { fi: 'OpenAPI / Swagger JSON', en: 'OpenAPI / Swagger JSON' },
      type: 'textarea',
      placeholder: { fi: 'Liitä OpenAPI JSON tähän...', en: 'Paste OpenAPI JSON here...' },
      default: JSON.stringify({
        openapi: "3.0.0",
        paths: {
          "/users": {
            post: {
              summary: "Create a user",
              parameters: [{ name: "X-Request-ID", in: "header", required: true }],
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        username: { type: "string" },
                        age: { type: "integer" }
                      },
                      required: ["username"]
                    }
                  }
                }
              },
              responses: {
                "201": { description: "Created" },
                "400": { description: "Bad Request" }
              }
            }
          }
        }
      }, null, 2)
    },
    {
      key: 'testFramework',
      label: { fi: 'Testikehys / Kieli', en: 'Test Framework / Language' },
      type: 'select',
      options: [
        { value: 'jest', label: { fi: 'Jest / TypeScript (Node.js)', en: 'Jest / TypeScript (Node.js)' } },
        { value: 'pytest', label: { fi: 'PyTest (Python)', en: 'PyTest (Python)' } },
        { value: 'junit', label: { fi: 'JUnit (Java)', en: 'JUnit (Java)' } }
      ],
      default: 'jest'
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      if (!inputs.swaggerJson) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'OpenAPI-määrittely vaaditaan.' : 'OpenAPI definition is required.' 
        };
      }

      let spec;
      try {
        spec = JSON.parse(inputs.swaggerJson);
      } catch (e: any) {
        return {
          success: false,
          error: (lang === 'fi' ? 'Virheellinen JSON-formaatti: ' : 'Invalid JSON format: ') + e.message
        };
      }

      const paths = spec.paths || {};
      const testCases: any[] = [];
      let testIdCounter = 1;

      // Käydään läpi endpointit ja metodit ja rakennetaan testitapaukset automaattisesti
      for (const [path, methods] of Object.entries<any>(paths)) {
        for (const [method, operation] of Object.entries<any>(methods)) {
          const upperMethod = method.toUpperCase();
          const summary = operation.summary || operation.description || 'No description';

          // 1. Happy Path -testitapaus
          testCases.push({
            id: `TC-${testIdCounter++}`,
            type: 'Happy Path',
            endpoint: `${upperMethod} ${path}`,
            description: lang === 'fi' 
              ? `Pitäisi palauttaa onnistunut vastaus (esim. 200/201) kun syötteet ovat validit (${summary}).`
              : `Should return success response when valid inputs are provided (${summary}).`,
            expectedStatus: upperMethod === 'POST' ? 201 : 200,
            payloadType: 'Valid'
          });

          // 2. Puuttuvat pakolliset kentät / Parametrit (Edge case / Negative test)
          const parameters = operation.parameters || [];
          const hasRequiredParams = parameters.some((p: any) => p.required);
          const requestBodySchema = operation.requestBody?.content?.['application/json']?.schema;
          const requiredBodyFields = requestBodySchema?.required || [];

          if (hasRequiredParams || requiredBodyFields.length > 0) {
            testCases.push({
              id: `TC-${testIdCounter++}`,
              type: 'Negative / Validation',
              endpoint: `${upperMethod} ${path}`,
              description: lang === 'fi'
                ? `Pitäisi palauttaa virhe (400 Bad Request) jos pakolliset kentät (${[...requiredBodyFields].join(', ')}) puuttuvat.`
                : `Should return 400 Bad Request if mandatory fields (${[...requiredBodyFields].join(', ')}) are missing.`,
              expectedStatus: 400,
              payloadType: 'Missing Required Fields'
            });
          }

          // 3. Virheellinen autentikointi / Headerit (jos vaadittu)
          if (parameters.some((p: any) => p.in === 'header')) {
            testCases.push({
              id: `TC-${testIdCounter++}`,
              type: 'Security',
              endpoint: `${upperMethod} ${path}`,
              description: lang === 'fi'
                ? `Pitäisi palauttaa 401/403, jos pakolliset header-parametrit puuttuvat.`
                : `Should return 401/403 if required header parameters are missing.`,
              expectedStatus: 401,
              payloadType: 'Unauthorized'
            });
          }
        }
      }

      // Jos sovelluksessanne on oikea AI-integraatio (OpenAI / Claude API), voit korvata/rikastaa 
      // yllä olevan deterministisen sääntölogiikan kutsumalla tekoälymallia tähän kohtaan.
      // Esim: const aiResponse = await callLLM(inputs.swaggerJson, inputs.testFramework);

      return {
        success: true,
        data: {
          framework: inputs.testFramework,
          totalTestCases: testCases.length,
          testCases: testCases,
          markdownReport: generateMarkdownReport(testCases, inputs.testFramework, lang)
        }
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'Testitapausten generointi epäonnistui: ' : 'Test case generation failed: ') + e.message 
      };
    }
  }
};

// Apufunktio siistin Markdown-raportin tulostamiseen UI:hin
function generateMarkdownReport(testCases: any[], framework: string, lang: string): string {
  let md = lang === 'fi' 
    ? `# Generoidut Unit-testitapaukset (${framework.toUpperCase()})\n\n` 
    : `# Generated Unit Test Cases (${framework.toUpperCase()})\n\n`;

  testCases.forEach(tc => {
    md += `### ${tc.id}: [${tc.type}] ${tc.endpoint}\n`;
    md += `- **Kuvaus / Tavoite:** ${tc.description}\n`;
    md += `- **Odotettu HTTP Status:** \`${tc.expectedStatus}\`\n`;
    md += `- **Testin tyyppi:** ${tc.payloadType}\n\n`;
  });

  return md;
}