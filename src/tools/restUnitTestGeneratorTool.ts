import { SwissTool } from './types';

export const restUnitTestGeneratorTool: SwissTool = {
  id: 'rest-unit-test-generator',
  name: { 
    fi: 'REST OpenAPI -> Unit-testikoodi (Jest)', 
    en: 'REST OpenAPI -> Unit Test Code (Jest)' 
  },
  category: { 
    fi: 'Kehittäjän työkalut & AI', 
    en: 'Developer Tools & AI' 
  },
  description: { 
    fi: 'Generoi valmista Jest-testikoodia REST-rajapinnoille OpenAPI/Swagger-määrittelyn pohjalta (sis. INSERT/POST/PUT).', 
    en: 'Generates ready-to-use Jest test code for REST APIs based on an OpenAPI/Swagger definition including INSERT/POST/PUT.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'openApiContent',
      label: { fi: 'OpenAPI / Swagger Sisältö tai URL (JSON/YAML)', en: 'OpenAPI / Swagger Content or URL (JSON/YAML)' },
      type: 'textarea',
      placeholder: { fi: 'Liitä OpenAPI JSON/YAML tai URL osoite...', en: 'Paste OpenAPI JSON/YAML or URL...' },
      default: ''
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      if (!inputs.openApiContent) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'OpenAPI-määrittely tai URL vaaditaan.' : 'OpenAPI definition or URL is required.' 
        };
      }

      let content = inputs.openApiContent.trim();

      if (content.startsWith('http://') || content.startsWith('https://')) {
        try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(content)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const wrapper = await res.json();
            if (wrapper && wrapper.contents) {
              content = wrapper.contents;
            }
          }
        } catch (fetchErr) {
          return {
            success: false,
            error: (lang === 'fi' ? 'OpenAPI-tiedoston haku URL-osoitteesta epäonnistui: ' : 'Failed to fetch OpenAPI from URL: ') + (fetchErr as any).message
          };
        }
      }

      let spec: any;
      try {
        spec = JSON.parse(content);
      } catch (err) {
        return {
          success: false,
          error: lang === 'fi' ? 'OpenAPI-määrittelyn tulee olla validia JSON-muotoa.' : 'OpenAPI definition must be valid JSON format.'
        };
      }

      const paths = spec.paths || {};
      let code = `import request from 'supertest';\n\n`;
      code += `describe('REST API Automated Tests (${spec.info?.title || 'API'})', () => {\n`;

      Object.keys(paths).forEach(pathKey => {
        const pathItem = paths[pathKey];
        const methods = ['get', 'post', 'put', 'delete', 'patch'];

        methods.forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];
            const summary = operation.summary || operation.operationId || `${method.toUpperCase()} ${pathKey}`;
            const upperMethod = method.toUpperCase();

            // Käsittely INSERT / CREATE / UPDATE -pyynnöille (POST, PUT, PATCH)
            let requestBodyCode = '';
            if (['POST', 'PUT', 'PATCH'].includes(upperMethod)) {
              // Haetaan skeema joko requestBodysta tai parametreista
              const schema = operation.requestBody?.content?.['application/json']?.schema 
                || operation.requestBody?.content?.['application/x-www-form-urlencoded']?.schema;
              
              if (schema && schema.properties) {
                const bodyObj: any = {};
                Object.keys(schema.properties).forEach(propName => {
                  const prop = schema.properties[propName];
                  const pType = (prop.type || 'string').toLowerCase();
                  
                  if (pType.includes('int') || pType.includes('number') || pType.includes('decimal')) {
                    bodyObj[propName] = Math.floor(Math.random() * 50) + 1;
                  } else if (pType.includes('boolean')) {
                    bodyObj[propName] = true;
                  } else {
                    bodyObj[propName] = `Test${Math.floor(Math.random() * 100)}`;
                  }
                });
                requestBodyCode = `        .send(${JSON.stringify(bodyObj, null, 10).replace(/\n/g, '\n      ')})\n`;
              } else {
                // Generoidaan oletusinsertti-data, jos tarkkaa skeemaa ei löydy suoraan
                requestBodyCode = `        .send({\n          name: 'Test Item',\n          value: ${Math.floor(Math.random() * 100)}\n        })\n`;
              }
            }

            // Oletettu statuskoodi (INSERT / POST luo usein 201 Created, muut 200 OK)
            let expectedStatus = 200;
            if (upperMethod === 'POST') expectedStatus = 201;
            if (operation.responses) {
              if (operation.responses['201']) expectedStatus = 201;
              else if (operation.responses['204']) expectedStatus = 204;
            }

            code += `  describe('${upperMethod} ${pathKey}', () => {\n`;
            code += `    it('${summary} - should execute successfully with test data', async () => {\n`;
            code += `      const response = await request(apiEndpointUrl)\n`;
            code += `        .${method}('${pathKey}')\n`;
            
            if (['POST', 'PUT', 'PATCH'].includes(upperMethod)) {
              code += `        .set('Content-Type', 'application/json')\n`;
              code += requestBodyCode;
            }
            
            code += `        ;\n\n`;
            code += `      expect(response.status).toBe(${expectedStatus});\n`;
            code += `    });\n`;
            code += `  });\n\n`;
          }
        });
      });

      code += `});\n`;

      return {
        success: true,
        data: {
          testCode: code,
          fileExtension: '.spec.ts',
          suggestedFilename: 'rest.generated.spec.ts'
        }
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'REST-testikoodin generointi epäonnistui: ' : 'REST test code generation failed: ') + e.message 
      };
    }
  }
};