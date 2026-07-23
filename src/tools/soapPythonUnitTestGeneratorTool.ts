import { SwissTool } from './types';

export const soapPythonUnitTestGeneratorTool: SwissTool = {
  id: 'soap-python-unit-test-generator',
  name: { 
    fi: 'SOAP WSDL -> Python Unit-testit (unittest)', 
    en: 'SOAP WSDL -> Python Unit Tests (unittest)' 
  },
  category: { 
    fi: 'Kehittäjän työkalut & AI', 
    en: 'Developer Tools & AI' 
  },
  description: { 
    fi: 'Generoi valmista Python unittest -testikoodia SOAP XML kutsuille WSDL-määrittelyn pohjalta.', 
    en: 'Generates ready-to-use Python unittest code for SOAP XML requests based on a WSDL definition.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'wsdlContent',
      label: { fi: 'WSDL / XML Sisältö', en: 'WSDL / XML Content' },
      type: 'textarea',
      placeholder: { fi: 'Liitä WSDL XML tähän...', en: 'Paste WSDL XML here...' },
      default: ''
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

      const wsdl = inputs.wsdlContent.trim();
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
            !opName.includes('Service')
          ) {
            if (opName.endsWith('Response')) opName = opName.replace('Response', '');
            if (!operations.includes(opName) && !ignoredNames.includes(opName)) {
              operations.push(opName);
            }
          }
        }
      });

      if (operations.length === 0) {
        operations = ['SoapOperation'];
      }

      let code = `import unittest\nimport requests\n\n`;
      code += `class TestSoapService(unittest.TestCase):\n\n`;
      code += `    ENDPOINT_URL = "http://localhost:8080/soap-endpoint"\n\n`;

      operations.forEach(op => {
        const soapEnvelope = 
`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <${op} xmlns="http://tempuri.org/">
            <intA>5</intA>
            <intB>10</intB>
        </${op}>
    </soap:Body>
</soap:Envelope>`;

        code += `    def test_${op.toLowerCase()}(self):\n`;
        code += `        ""\"Testaa SOAP-operaatio ${op}""\"\n`;
        code += `        soap_envelope = """${soapEnvelope}"""\n\n`;
        code += `        headers = {'Content-Type': 'text/xml; charset=utf-8'}\n`;
        code += `        response = requests.post(self.ENDPOINT_URL, data=soap_envelope, headers=headers)\n\n`;
        code += `        self.assertEqual(response.status_code, 200)\n`;
        code += `        self.assertIn("<${op}Response", response.text)\n\n`;
      });

      code += `if __name__ == '__main__':\n`;
      code += `    unittest.main()\n`;

      return {
        success: true,
        data: {
          testCode: code,
          fileExtension: '.py',
          suggestedFilename: 'test_soap_service.py'
        }
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'Python SOAP-testikoodin generointi epäonnistui: ' : 'Python SOAP test code generation failed: ') + e.message 
      };
    }
  }
};