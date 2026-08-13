import type { SwissTool, Language } from './types.ts';

// REST API -tester #/api-proxy/post
// Tämä sen takia, että lokaalisti ei voi kaikkea kysyä!!!

export const apiTools: SwissTool[] = [
  {
    id: 'api-tester',
    name: { fi: 'REST API-tester', en: 'REST API -tester' },
    category: { fi: 'Verkko & API', en: 'Network & API' },
    description: { fi: 'Lähetä kustomoituja HTTP-pyyntöjä REST API -rajapintoihin.', en: 'Send custom HTTP requests to REST APIs.' },
    type: 'local',
    inputs: [
      {
        key: 'url',
        label: { fi: 'URL-osoite', en: 'URL Endpoint' },
        type: 'text',
        placeholder: { fi: 'https://httpbin.org/post', en: 'https://httpbin.org/post' },
        default: 'http://localhost:5173/mini-api.json'
      },
      {
        key: 'method',
        label: { fi: 'Metodi', en: 'Method' },
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'GET'
      },
      {
        key: 'body',
        label: { fi: 'Pyyntökeho (JSON)', en: 'Request Body (JSON)' },
        type: 'textarea',
        placeholder: { fi: '{"name": "test"}', en: '{"name": "test"}' },
        default: '{\n  "name": "SwissKnifeUser",\n  "test": true\n}'
      }
    ],
    execute: async (inputs) => {
      try {
        if (!inputs.url) {
          return { success: false, error: 'URL-osoite vaaditaan.' };
        }

        // Muutetaan lokaalit ZAP-kutsut automaattisesti käyttämään Viten proxya (CORS-kierto)
        let targetUrl = inputs.url;
        if (targetUrl.startsWith('http://localhost:8080')) {
          targetUrl = targetUrl.replace('http://localhost:8080', '/zap-api');
        } else if (targetUrl.startsWith('/JSON')) {
          targetUrl = '/zap-api' + targetUrl;
        }

        const method = inputs.method || 'GET';
        const options: RequestInit = {
          method: method,
          headers: { 'Content-Type': 'application/json' }
        };

        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && inputs.body) {
          options.body = inputs.body;
        }

        const res = await fetch(targetUrl, options); // Käytetään muokattua osoitetta!
        const responseData = await res.text();

        return {
          success: res.ok,
          data: {
            status: res.status,
            statusText: res.statusText,
            data: responseData
          }
        };
      } catch (e: any) {
        return { success: false, error: 'API-pyyntö epäonnistui: ' + e.message };
      }
    }
  },
  {
    id: 'soap-tester',
    name: { fi: 'SOAP API -tester', en: 'SOAP API -tester' },
    category: { fi: 'Verkko & API', en: 'Network & API' },
    description: { fi: 'Lähetä SOAP XML -kutsuja vanhemmille rajapinnoille.', en: 'Send SOAP XML requests to legacy APIs.' },
    type: 'local',
inputs: [
      {
        key: 'url',
        label: { fi: 'SOAP Endpoint URL', en: 'SOAP Endpoint URL' },
        type: 'text',
        placeholder: { fi: 'http://localhost:3001/ws/productservice', en: 'http://localhost:3001/ws/productservice' },
        default: 'http://localhost:3001/ws/productservice'
      },
      {
        key: 'action',
        label: { fi: 'SOAPAction Header (valinnainen)', en: 'SOAPAction Header (optional)' },
        type: 'text',
        placeholder: { fi: 'http://example.com/GetProductDetails', en: 'http://example.com/GetProductDetails' },
        default: ''
      },
      {
        key: 'body',
        label: { fi: 'SOAP Envelope (XML)', en: 'SOAP Envelope (XML)' },
        type: 'textarea',
        placeholder: { fi: '<soap:Envelope>...</soap:Envelope>', en: '<soap:Envelope>...</soap:Envelope>' },
        default: `<?xml version="1.0" encoding="utf-8"?>\n<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">\n  <soapenv:Header/>\n  <soapenv:Body>\n    <GetProductDetails>\n      <itemCode>SOAP-002</itemCode>\n    </GetProductDetails>\n  </soapenv:Body>\n</soapenv:Envelope>`
      }
    ],
    execute: async (inputs) => {
      try {
        if (!inputs.url) {
          return { success: false, error: 'URL-osoite vaaditaan.' };
        }
        // SOAP-testerin execute-funktioon:
        let targetUrl = inputs.url;
        if (targetUrl.startsWith('http://localhost:8080')) {
          targetUrl = targetUrl.replace('http://localhost:8080', '/zap-api');
        } else if (targetUrl.startsWith('/JSON')) {
          targetUrl = '/zap-api' + targetUrl;
        }

        if (!inputs.body) {
          return { success: false, error: 'SOAP Envelope XML vaaditaan.' };
        }

        const headers: Record<string, string> = {
          'Content-Type': 'text/xml; charset=utf-8',
        };

        if (inputs.action) {
          headers['SOAPAction'] = inputs.action;
        }

        const options: RequestInit = {
          method: 'POST',
          headers: headers,
          body: inputs.body
        };

        const res = await fetch(targetUrl, options);
        const responseData = await res.text();

        return {
          success: res.ok,
          data: {
            status: res.status,
            statusText: res.statusText,
            data: responseData
          }
        };
      } catch (e: any) {
        return { success: false, error: 'SOAP-pyyntö epäonnistui: ' + e.message };
      }
    }
  }
];