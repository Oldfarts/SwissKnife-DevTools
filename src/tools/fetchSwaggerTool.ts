import { SwissTool } from '../types';

// 1. Tässä on uusi työkalu
export const fetchSwaggerTool: SwissTool = {
  id: 'fetch-swagger-url',
  name: { 
    fi: 'Hae OpenAPI / Swagger URL:stä', 
    en: 'Fetch OpenAPI / Swagger from URL' 
  },
  category: { 
    fi: 'Verkko & API', 
    en: 'Network & API' 
  },
  description: { 
    fi: 'Hakee Swagger/OpenAPI JSON -määrittelyn annetusta URL-osoitteesta.', 
    en: 'Fetches Swagger/OpenAPI JSON specification from a given URL.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'url',
      label: { fi: 'Swagger / OpenAPI JSON URL', en: 'Swagger / OpenAPI JSON URL' },
      type: 'text',
      placeholder: { fi: 'https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json', en: 'https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json' },
      default: 'https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json'
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      if (!inputs.url) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'URL-osoite vaaditaan.' : 'URL is required.' 
        };
      }

      const res = await fetch(inputs.url);
      if (!res.ok) {
        return {
          success: false,
          error: (lang === 'fi' ? 'HTTP-virhe: ' : 'HTTP error: ') + res.status
        };
      }

      const jsonText = await res.text();
      JSON.parse(jsonText); // Varmistetaan että on validia JSONia

      return {
        success: true,
        data: jsonText
      };
    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'Swaggerin haku epäonnistui: ' : 'Failed to fetch Swagger: ') + e.message 
      };
    }
  }
};
