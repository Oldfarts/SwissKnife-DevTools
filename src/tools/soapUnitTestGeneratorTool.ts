import { SwissTool } from './types';

export const soapUnitTestGeneratorTool: SwissTool = {
  id: 'soap-unit-test-generator',
  name: { 
    fi: 'SOAP WSDL -> Unit-testikoodi (Jest)', 
    en: 'SOAP WSDL -> Unit Test Code (Jest)' 
  },
  category: { 
    fi: 'Kehittäjän työkalut & AI', 
    en: 'Developer Tools & AI' 
  },
  description: { 
    fi: 'Generoi valmista Jest-testikoodia SOAP XML kutsuille WSDL-määrittelyn tai URL-osoitteen pohjalta dynaamisilla ja muotoilluilla testiarvoilla.', 
    en: 'Generates ready-to-use Jest test code for SOAP XML requests with dynamically generated and formatted test values.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'wsdlContent',
      label: { fi: 'WSDL / XML Sisältö tai URL', en: 'WSDL / XML Content or URL' },
      type: 'textarea',
      placeholder: { fi: 'Liitä WSDL XML tai URL osoite...', en: 'Paste WSDL XML or URL...' },
      default: ''
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      if (!inputs.wsdlContent) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'WSDL-määrittely tai URL vaaditaan.' : 'WSDL definition or URL is required.' 
        };
      }

      let wsdl = inputs.wsdlContent.trim();

      if (wsdl.startsWith('http://') || wsdl.startsWith('https://')) {
        try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(wsdl)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const wrapper = await res.json();
            if (wrapper && wrapper.contents) {
              wsdl = wrapper.contents;
            }
          }
        } catch (fetchErr) {
          return {
            success: false,
            error: (lang === 'fi' ? 'WSDL-tiedoston haku URL-osoitteesta epäonnistui: ' : 'Failed to fetch WSDL from URL: ') + (fetchErr as any).message
          };
        }
      }

      let operations: string[] = [];
      const allNameMatches = wsdl.match(/name="([^"]+)"/g) || [];
      
      const ignoredNames = [
        's0', 'tns', 'parameters', 'Body', 'Envelope', 'Header', 
        'SoapIn', 'SoapOut', 'HttpGet', 'HttpPost', 'service', 'binding', 'port', 'portType'
      ];

      allNameMatches.forEach(match => {
        const nameMatch = match.match(/name="([^"]+)"/);
        if (nameMatch && nameMatch[1]) {
          let opName = nameMatch[1];
          if (
            opName.length > 2 &&
            !ignoredNames.includes(opName) &&
            !opName.endsWith('Soap') &&
            !opName.endsWith('Soap12') &&
            !opName.includes('Service') &&
            !opName.includes('Binding')
          ) {
            if (['Add', 'Subtract', 'Multiply', 'Divide', 'CelsiusToFahrenheit', 'FahrenheitToCelsius'].includes(opName) || !opName.includes('Response')) {
              if (opName.endsWith('Response')) {
                opName = opName.replace('Response', '');
              }
              if (!operations.includes(opName) && !ignoredNames.includes(opName)) {
                operations.push(opName);
              }
            }
          }
        }
      });

      if (operations.length === 0 || (operations.length === 1 && operations[0] === 'SoapOperation')) {
        if (wsdl.toLowerCase().includes('calculator')) {
          operations = ['Add', 'Subtract', 'Multiply', 'Divide'];
        } else {
          operations = ['SoapOperation'];
        }
      }

      const getParametersForOperation = (opName: string) => {
        const params: { name: string; type: string }[] = [];
        const index = wsdl.indexOf(`name="${opName}"`);
        
        if (index !== -1) {
          const snippet = wsdl.substring(index, index + 600);
          const innerElements = snippet.match(/<s:element[^>]+>|<element[^>]+>/g) || [];
          
          innerElements.forEach(el => {
            const nameM = el.match(/name="([^"]+)"/);
            const typeM = el.match(/type="([^"]+)"/);
            if (nameM && nameM[1]) {
              const pName = nameM[1];
              if (pName !== opName && !pName.endsWith('Response') && !pName.endsWith('Result')) {
                let pType = typeM ? typeM[1] : 's:string';
                if (pType.includes(':')) pType = pType.split(':')[1];
                if (!params.some(p => p.name === pName)) {
                  params.push({ name: pName, type: pType });
                }
              }
            }
          });
        }

        if (params.length === 0 && ['Add', 'Subtract', 'Multiply', 'Divide'].includes(opName)) {
          return [
            { name: 'intA', type: 'int' },
            { name: 'intB', type: 'int' }
          ];
        }

        return params;
      };

      let code = `import request from 'supertest';\n\n`;
      code += `describe('SOAP Web Service Automated Tests', () => {\n`;

      operations.forEach(op => {
        const params = getParametersForOperation(op);
        let innerXml = '';
        
        if (params.length > 0) {
          params.forEach(p => {
            let randomVal: any = 'test';
            const lowerType = p.type.toLowerCase();
            if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('double') || lowerType.includes('float')) {
              randomVal = Math.floor(Math.random() * 50) + 1;
            } else if (lowerType.includes('boolean')) {
              randomVal = true;
            } else {
              randomVal = `Test${Math.floor(Math.random() * 100)}`;
            }
            innerXml += `            <${p.name}>${randomVal}</${p.name}>\n`;
          });
        } else {
          innerXml = `            <!-- Add test parameters here -->\n`;
        }

        // Muotoillaan SOAP Envelope siististi sisennettynä XML-rakenteena
        const soapEnvelopeFormatted = 
          `<?xml version="1.0" encoding="utf-8"?>\n` +
          `      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n` +
          `        <soap:Body>\n` +
          `          <${op} xmlns="http://tempuri.org/">\n` +
          `${innerXml}` +
          `          </${op}>\n` +
          `        </soap:Body>\n` +
          `      </soap:Envelope>`;

        code += `  describe('${op}', () => {\n`;
        code += `    it('should return 200 OK with valid SOAP Envelope and test data', async () => {\n`;
        code += `      const soapEnvelope = \`${soapEnvelopeFormatted}\`;\n\n`;
        code += `      const response = await request(soapEndpointUrl)\n`;
        code += `        .post('/')\n`;
        code += `        .set('Content-Type', 'text/xml; charset=utf-8')\n`;
        code += `        .send(soapEnvelope);\n\n`;
        code += `      expect(response.status).toBe(200);\n`;
        code += `      expect(response.text).toContain('<${op}Response');\n`;
        code += `    });\n`;
        code += `  });\n\n`;
      });

      code += `});\n`;

      return {
        success: true,
        data: {
          testCode: code,
          fileExtension: '.spec.ts',
          suggestedFilename: 'soap.generated.spec.ts'
        }
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'SOAP-testikoodin generointi epäonnistui: ' : 'SOAP test code generation failed: ') + e.message 
      };
    }
  }
};