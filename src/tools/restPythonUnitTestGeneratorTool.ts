import { SwissTool } from './types';

export const restPythonUnitTestGeneratorTool: SwissTool = {
  id: 'rest-python-unit-test-generator',
  name: { 
    fi: 'REST OpenAPI -> Python Unit-testit (unittest)', 
    en: 'REST OpenAPI -> Python Unit Tests (unittest)' 
  },
  category: { 
    fi: 'Kehittäjän työkalut & AI', 
    en: 'Developer Tools & AI' 
  },
  description: { 
    fi: 'Generoi valmista Python unittest -testikoodia REST-rajapinnoille OpenAPI/Swagger-määrityksen pohjalta.', 
    en: 'Generates ready-to-use Python unittest code for REST APIs based on an OpenAPI/Swagger definition.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'openApiContent',
      label: { fi: 'OpenAPI / Swagger Sisältö (JSON)', en: 'OpenAPI / Swagger Content (JSON)' },
      type: 'textarea',
      placeholder: { fi: 'Liitä OpenAPI JSON tähän...', en: 'Paste OpenAPI JSON here...' },
      default: ''
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      if (!inputs.openApiContent) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'OpenAPI-määrittely vaaditaan.' : 'OpenAPI definition is required.' 
        };
      }

      let spec: any;
      try {
        spec = JSON.parse(inputs.openApiContent.trim());
      } catch (err) {
        return {
          success: false,
          error: lang === 'fi' ? 'OpenAPI-määrittelyn tulee olla validia JSON-muotoa.' : 'OpenAPI definition must be valid JSON format.'
        };
      }

      const paths = spec.paths || {};
      let code = `import unittest\nimport requests\n\n`;
      code += `class TestRestApi(${spec.info?.title ? `unittest.TestCase # ${spec.info.title}` : 'unittest.TestCase'}):\n\n`;
      code += `    BASE_URL = "http://localhost:3000${spec.servers?.[0]?.url || ''}"\n\n`;

      Object.keys(paths).forEach(pathKey => {
        const pathItem = paths[pathKey];
        const methods = ['get', 'post', 'put', 'delete', 'patch'];

        methods.forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];
            const upperMethod = method.toUpperCase();
            const opId = operation.operationId || `${method}_${pathKey.replace(/[\/{}]/g, '_')}`;
            const cleanOpId = opId.replace(/[^a-zA-Z0-9_]/g, '_');

            // Oletusstatuskoodi
            let expectedStatus = 200;
            if (upperMethod === 'POST') expectedStatus = 201;
            if (operation.responses?.['201']) expectedStatus = 201;
            else if (operation.responses?.['204']) expectedStatus = 204;

            // Payload POST/PUT/PATCH-pyynnöille
            let payloadCode = '';
            if (['POST', 'PUT', 'PATCH'].includes(upperMethod)) {
              const schema = operation.requestBody?.content?.['application/json']?.schema;
              if (schema && schema.properties) {
                const bodyObj: any = {};
                Object.keys(schema.properties).forEach(propName => {
                  const prop = schema.properties[propName];
                  const pType = (prop.type || 'string').toLowerCase();
                  if (pType.includes('int') || pType.includes('number')) {
                    bodyObj[propName] = Math.floor(Math.random() * 50) + 1;
                  } else if (pType.includes('boolean')) {
                    bodyObj[propName] = True;
                  } else {
                    bodyObj[propName] = `Test${Math.floor(Math.random() * 100)}`;
                  }
                });
                // Muunnetaan Python-ystävälliseksi (True / False / None)
                let jsonStr = JSON.stringify(bodyObj, null, 12)
                  .replace(/true/g, 'True')
                  .replace(/false/g, 'False');
                payloadCode = `        payload = ${jsonStr}\n`;
              } else {
                payloadCode = `        payload = {"name": "Test Item"}\n`;
              }
            }

            // Muunnetaan URL-polkumuuttujat (esim. /pet/{petId} -> /pet/1)
            const pyPath = pathKey.replace(/\{([^}]+)\}/g, '1');

            code += `    def test_${method}_${cleanOpId}(self):\n`;
            code += `        ""\"Testaa ${upperMethod} ${pathKey}""\"\n`;
            code += `        url = f"{self.BASE_URL}${pyPath}"\n`;
            
            if (['POST', 'PUT', 'PATCH'].includes(upperMethod)) {
              code += payloadCode;
              code += `        response = requests.${method}(url, json=payload)\n`;
            } else {
              code += `        response = requests.${method}(url)\n`;
            }
            
            code += `        self.assertEqual(response.status_code, ${expectedStatus})\n\n`;
          }
        });
      });

      code += `if __name__ == '__main__':\n`;
      code += `    unittest.main()\n`;

      return {
        success: true,
        data: {
          testCode: code,
          fileExtension: '.py',
          suggestedFilename: 'test_rest_api.py'
        }
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'Python-testikoodin generointi epäonnistui: ' : 'Python test code generation failed: ') + e.message 
      };
    }
  }
};