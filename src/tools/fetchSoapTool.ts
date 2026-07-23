import { SwissTool } from './types';

export const fetchSoapTool: SwissTool = {
  id: 'fetch-soap-wsdl',
  name: { 
    fi: 'Hae SOAP WSDL / Metodit URL:stä', 
    en: 'Fetch SOAP WSDL / Methods from URL' 
  },
  category: { 
    fi: 'Verkko & API', 
    en: 'Network & API' 
  },
  description: { 
    fi: 'Hakee SOAP WSDL -määrittelyn ja listaa sen metodit tai välittää sisällön eteenpäin.', 
    en: 'Fetches SOAP WSDL definition and lists its methods or passes the content forward.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'url',
      label: { fi: 'SOAP WSDL URL-osoite', en: 'SOAP WSDL URL' },
      type: 'text',
      placeholder: { fi: 'https://www.dneonline.com/calculator.asmx?WSDL', en: 'https://www.dneonline.com/calculator.asmx?WSDL' },
      default: 'https://www.dneonline.com/calculator.asmx?WSDL'
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

      // Kierretään CORS-rajoitukset samalla proxylogiikalla kuin Swaggerissa
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(inputs.url)}`;
      const res = await fetch(proxyUrl);
      
      if (!res.ok) {
        return {
          success: false,
          error: (lang === 'fi' ? 'HTTP-virhe WSDL-haussa: ' : 'HTTP error fetching WSDL: ') + res.status
        };
      }

      const wrapper = await res.json();
      const wsdlText = wrapper && wrapper.contents ? wrapper.contents : '';

      // Yksinkertainen tarkistus, että kyseessä on XML/WSDL
      if (!wsdlText.includes('<definitions') && !wsdlText.includes('<wsdl:definitions') && !wsdlText.includes('xml')) {
        return {
          success: false,
          error: lang === 'fi' ? 'Annettu osoite ei vaikuta kelvolliselta WSDL/XML-tiedostolta.' : 'The provided URL does not appear to be a valid WSDL/XML file.'
        };
      }

      return {
        success: true,
        data: wsdlText
      };
    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'SOAP WSDL:n haku epäonnistui: ' : 'Failed to fetch SOAP WSDL: ') + e.message 
      };
    }
  }
};