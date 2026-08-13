import type { SwissTool, Language } from './types.ts';

export const fetchSwaggerTool: SwissTool[] = [{
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
      placeholder: { fi: 'http://localhost:5173/mini-api.json', en: 'http://localhost:5173/mini-api.json' },
      default: 'http://localhost:5173/mini-api.json'
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

      // Haetaan suoraan annetusta URL-osoitteesta ilman ulkoista proxya
      const res = await fetch(inputs.url);
      
      if (!res.ok) {
        return {
          success: false,
          error: (lang === 'fi' ? 'HTTP-virhe: ' : 'HTTP error: ') + res.status
        };
      }

      const jsonText = await res.text();
      
      // Tarkistetaan ettei palautunut virhe-html:ää
      if (jsonText.trim().startsWith('<') || jsonText.includes('<!DOCTYPE html>')) {
        return {
          success: false,
          error: lang === 'fi' ? 'Palvelin palautti HTML-sivun JSON-tiedoston sijaan (tarkista osoite).' : 'Server returned an HTML page instead of JSON (check URL).'
        };
      }

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
}];