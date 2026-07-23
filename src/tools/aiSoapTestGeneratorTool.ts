import { SwissTool } from '../types';

export const aiSoapTestGeneratorTool: SwissTool = {
  id: 'ai-soap-test-generator',
  name: { 
    fi: 'SOAP WSDL -> Testitapaukset', 
    en: 'SOAP WSDL -> Test Cases' 
  },
  category: { 
    fi: 'Kehittäjän työkalut & AI', 
    en: 'Developer Tools & AI' 
  },
  description: { 
    fi: 'Analysoi SOAP WSDL -määrittelyn ja generoi listan testitapauksista ja SOAP Envelope -esimerkeistä.', 
    en: 'Analyzes a SOAP WSDL definition and generates a list of test cases and SOAP Envelope examples.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'wsdlContent',
      label: { fi: 'WSDL / XML Sisältö', en: 'WSDL / XML Content' },
      type: 'textarea',
      placeholder: { fi: 'Liitä WSDL XML tähän tai anna edellisen vaiheen välittää se...', en: 'Paste WSDL XML here or let the previous step pass it...' },
      default: `<?xml version="1.0" encoding="utf-8"?>\n<definitions xmlns="http://schemas.xmlsoap.org/wsdl/">\n  <message name="CelsiusToFahrenheitSoapIn">\n    <part name="parameters" element="tns:CelsiusToFahrenheit" />\n  </message>\n</definitions>`
    },
    {
      key: 'testFramework',
      label: { fi: 'Testikehys / Formaatti', en: 'Test Framework / Format' },
      type: 'select',
      options: [
        { value: 'soapui', label: { fi: 'SoapUI / Postman XML', en: 'SoapUI / Postman XML' } },
        { value: 'jest', label: { fi: 'Jest / SuperTest (Node.js)', en: 'Jest / SuperTest (Node.js)' } },
        { value: 'pytest', label: { fi: 'PyTest (Python Zeep)', en: 'PyTest (Python Zeep)' } }
      ],
      default: 'soapui'
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      if (!inputs.wsdlContent) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'WSDL-määrittely vaaditaan.' : 'WSDL definition is required.' 
        };
      }

      const wsdl = inputs.wsdlContent;
      const testCases: any[] = [];
      let testIdCounter = 1;

      // Etsitään WSDL:stä operaatioita/metodeja (yksinkertainen regex-jäsentely WSDL/XML-rakenteelle)
      const operationMatches = wsdl.match(/<wsdl:operation\s+name="([^"]+)"|<operation\s+name="([^"]+)"/g) || [];
      const operations: string[] = [];

      operationMatches.forEach(match => {
        const nameMatch = match.match(/name="([^"]+)"/);
        if (nameMatch && nameMatch[1] && !operations.includes(nameMatch[1])) {
          operations.push(nameMatch[1]);
        }
      });

      // Jos operaatioita ei löytynyt suoraan, luodaan vähintään yleinen testitapaus
      if (operations.length === 0) {
        operations.push('GenericSoapOperation');
      }

      // Generoidaan testitapaukset kullekin löydetylle metodille
      operations.forEach(opName => {
        // 1. Happy Path
        testCases.push({
          id: `SOAP-TC-${testIdCounter++}`,
          type: 'Happy Path',
          operation: opName,
          description: lang === 'fi' 
            ? `Puvullinen/validi SOAP Envelope kutsu metodille ${opName} palauttaa asianmukaisen vastauksen (200 OK).`
            : `Valid SOAP Envelope request for operation ${opName} returns success response (200 OK).`,
          expectedStatus: 200,
          sampleEnvelope: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n  <soap:Body>\n    <${opName} xmlns="http://tempuri.org/">\n      <!-- Lisää arvot tähän -->\n    </${opName}>\n  </soap:Body>\n</soap:Envelope>`
        });

        // 2. Negative / Fault Test (Tyhjä tai viallinen Body)
        testCases.push({
          id: `SOAP-TC-${testIdCounter++}`,
          type: 'Fault Handling (Negative)',
          operation: opName,
          description: lang === 'fi'
            ? `Virheellinen tai puutteellinen XML-rakenne metodille ${opName} aiheuttaa SOAP Fault -vastauksen (500 Internal Server Error).`
            : `Invalid or malformed XML structure for ${opName} triggers a SOAP Fault response (500 Internal Server Error).`,
          expectedStatus: 500,
          sampleEnvelope: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n  <soap:Body>\n    <${opName}>\n      <MalformoidtuKentta>invalid</MalformoidtuKentta>\n    </${opName}>\n  </soap:Body>\n</soap:Envelope>`
        });
      });

      return {
        success: true,
        data: {
          framework: inputs.testFramework,
          totalOperationsFound: operations.length,
          totalTestCases: testCases.length,
          testCases: testCases,
          markdownReport: generateSoapMarkdownReport(testCases, inputs.testFramework, lang)
        }
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'SOAP-testitapausten generointi epäonnistui: ' : 'SOAP test case generation failed: ') + e.message 
      };
    }
  }
};

function generateSoapMarkdownReport(testCases: any[], framework: string, lang: string): string {
  let md = lang === 'fi' 
    ? `# Generoidut SOAP Testitapaukset (${framework.toUpperCase()})\n\n` 
    : `# Generated SOAP Test Cases (${framework.toUpperCase()})\n\n`;

  testCases.forEach(tc => {
    md += `### ${tc.id}: [${tc.type}] Operaatio: \`${tc.operation}\`\n`;
    md += `- **Kuvaus:** ${tc.description}\n`;
    md += `- **Odotettu Status:** \`${tc.expectedStatus}\`\n`;
    md += `- **Esimerkki SOAP Envelopesta:**\n\`\`\`xml\n${tc.sampleEnvelope}\n\`\`\`\n\n`;
  });

  return md;
}