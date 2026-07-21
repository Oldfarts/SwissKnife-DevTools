import { SwissTool } from './types';

export const apiTools: SwissTool[] = [
  {
    id: 'api-tester',
    name: { fi: 'REST API-tester', en: 'REST API Tester' },
    category: { fi: 'Verkko & API', en: 'Network & API' },
    description: { fi: 'Lähetä kustomoituja HTTP-pyyntöjä REST API -rajapintoihin.', en: 'Send custom HTTP requests to REST APIs.' },
    type: 'local',
    inputs: [
      {
        key: 'url',
        label: { fi: 'URL-osoite', en: 'URL Endpoint' },
        type: 'text',
        placeholder: { fi: 'https://httpbin.org/post', en: 'https://httpbin.org/post' },
        default: 'https://httpbin.org/post'
      },
      {
        key: 'method',
        label: { fi: 'Metodi', en: 'Method' },
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'POST'
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
        const method = inputs.method || 'GET';
        const options: RequestInit = {
          method: method,
          headers: { 'Content-Type': 'application/json' }
        };

        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && inputs.body) {
          options.body = inputs.body;
        }

        const res = await fetch(inputs.url, options);
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
    name: { fi: 'SOAP API -tester', en: 'SOAP API Tester' },
    category: { fi: 'Verkko & API', en: 'Network & API' },
    description: { fi: 'Lähetä SOAP XML -kutsuja vanhemmille rajapinnoille.', en: 'Send SOAP XML requests to legacy APIs.' },
    type: 'local',
    inputs: [
      {
        key: 'url',
        label: { fi: 'SOAP Endpoint URL', en: 'SOAP Endpoint URL' },
        type: 'text',
        placeholder: { fi: 'https://httpbin.org/post', en: 'https://httpbin.org/post' },
        default: 'https://httpbin.org/post'
      },
      {
        key: 'action',
        label: { fi: 'SOAPAction Header (valinnainen)', en: 'SOAPAction Header (optional)' },
        type: 'text',
        placeholder: { fi: 'https://www.w3schools.com/xml/CelsiusToFahrenheit', en: 'https://www.w3schools.com/xml/CelsiusToFahrenheit' },
        default: 'https://www.w3schools.com/xml/CelsiusToFahrenheit'
      },
      {
        key: 'body',
        label: { fi: 'SOAP Envelope (XML)', en: 'SOAP Envelope (XML)' },
        type: 'textarea',
        placeholder: { fi: '<soap:Envelope>...</soap:Envelope>', en: '<soap:Envelope>...</soap:Envelope>' },
        default: `<?xml version="1.0" encoding="utf-8"?>\n<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n  <soap:Body>\n    <CelsiusToFahrenheit xmlns="https://www.w3schools.com/xml/">\n      <Celsius>25</Celsius>\n    </CelsiusToFahrenheit>\n  </soap:Body>\n</soap:Envelope>`
      }
    ],
    execute: async (inputs) => {
      try {
        if (!inputs.url) {
          return { success: false, error: 'URL-osoite vaaditaan.' };
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

        const res = await fetch(inputs.url, options);
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