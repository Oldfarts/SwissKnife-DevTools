import { SwissTool, Language, getText } from './types';
//import { jwtDecoderTool } from './jwtDecoder';
import { regexTesterTool } from './regexTester';
import { colorConverterTool } from './colorConverter';
import { jsonTools } from './jsonTools';
import { xmlTools } from './xmlTools';
import { jwtTools } from './jwtTools';
import { hashTools } from './hashTools';
import { encoderTools } from './encoderTools';
import { apiTools } from './apiTools';
import { dnsTools } from './dnsTools';
import { fileTools } from './fileTools';
import { sslTools } from './sslTools';
import { qrAnalyzerTool } from './qrAnalyzer';
import { requestReplayTool } from './requestReplayTool';
import { jwtPlaygroundTool } from './jwtPlaygroundTool';
import { apiDiffTool } from './apiDiffTool';
import { logAnalyzerTool } from './logAnalyzerTool';
import { jsonSchemaTool } from './jsonSchemaTool';
import { aiTestGeneratorTool } from './aiTestGeneratorTool';
import { fetchSwaggerTool } from './fetchSwaggerTool';
import { fetchSoapTool } from './fetchSoapTool';
import { aiSoapTestGeneratorTool } from './aiSoapTestGeneratorTool';
import { restUnitTestGeneratorTool } from './restUnitTestGeneratorTool';
import { soapUnitTestGeneratorTool } from './soapUnitTestGeneratorTool';
import { restPythonUnitTestGeneratorTool } from './restPythonUnitTestGeneratorTool';
import { soapPythonUnitTestGeneratorTool } from './soapPythonUnitTestGeneratorTool';
import { WorkflowManager } from './workflowStorage';
import registryData from "../../main/registry.json";

export * from './types';

// Varmistetaan että AVAILABLE_PLUGINS on varmasti taulukko
export const AVAILABLE_PLUGINS: any[] = Array.isArray(registryData) 
  ? registryData 
  : (registryData as any).default || [];

// Yksittäiset työkalut määriteltynä
export const JSON_FORMATTER_TOOL: SwissTool = {
  id: 'json-formatter',
  name: { fi: 'JSON Pretty Printer', en: 'JSON Pretty Printer' },
  category: { fi: 'Muotoilijat', en: 'Formatters' },
  description: {
    fi: 'Muotoilee ja siistii sekavan JSON-merkkijonon luettavaan muotoon.',
    en: 'Formats and beautifies raw JSON strings into a readable structure.'
  },
  type: 'local',
  inputs: [
    { key: 'rawJson', label: { fi: 'Raaka JSON-syöte', en: 'Raw JSON Input' }, type: 'textarea', placeholder: '{"hello":"world"}' },
    { key: 'indent', label: { fi: 'Sisennyksen välilyönnit', en: 'Indent Spaces' }, type: 'select', options: ['2', '4'], default: '2' }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      const parsed = JSON.parse(inputs.rawJson);
      const indentSpaces = parseInt(inputs.indent || '2', 10);
      return { success: true, data: JSON.stringify(parsed, null, indentSpaces) };
    } catch (err: any) {
      return {
        success: false,
        error: lang === 'fi' ? 'Virheellinen JSON: ' + err.message : 'Invalid JSON: ' + err.message
      };
    }
  }
};

export const REST_DNS_TOOL: SwissTool = {
  id: 'rest-dns-lookup',
  name: { fi: 'REST: DNS-haku', en: 'REST: DNS Lookup' },
  category: { fi: 'Verkko', en: 'Network' },
  description: {
    fi: 'Hakee verkkotunnuksen DNS-tietueet ulkoisen REST API -palvelun kautta.',
    en: 'Fetches domain DNS records via an external REST API.'
  },
  type: 'rest-api',
  endpoint: 'https://dns.google/resolve',
  inputs: [
    { key: 'name', label: { fi: 'Verkkotunnus (Domain)', en: 'Domain Name' }, type: 'text', placeholder: 'example.com' },
    { key: 'type', label: { fi: 'Tietuetyyppi', en: 'Record Type' }, type: 'select', options: ['A', 'AAAA', 'MX', 'TXT'], default: 'A' }
  ]
};

// Apufunktio työkalun suorittamiseen
export const executeSwissTool = async (
  tool: SwissTool,
  inputs: Record<string, any>,
  lang: Language = 'fi'
) => {
  if (tool.type === 'local' && tool.execute) {
    return await tool.execute(inputs, lang);
  }

  if (tool.type === 'rest-api' && tool.endpoint) {
    try {
      const { apiPath, ...restInputs } = inputs;
      
      // Jos apiPath on annettu, yhdistetään se endpointiin, muuten käytetään pelkkää endpointia
      let fullEndpoint = tool.endpoint;
      if (apiPath) {
        // Poistetaan mahdolliset ylimääräiset kauttaviivat
        const cleanBasePath = tool.endpoint.replace(/\/+$/, '');
        const cleanApiPath = apiPath.replace(/^\/+/, '');
        fullEndpoint = `${cleanBasePath}/${cleanApiPath}`;
      }

      // Siivotaan tyhjät syötteet pois query-parametreista, ettei ZAP saa turhia tyhjiä arvoja
      const filteredInputs = Object.fromEntries(
        Object.entries(restInputs).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      );
      
      const queryParams = new URLSearchParams(filteredInputs).toString();
      const targetEndpoint = fullEndpoint.replace('http://localhost:8080', '/zap-api');
      
      const finalUrl = queryParams ? `${targetEndpoint}?${queryParams}` : targetEndpoint;
      
      const response = await fetch(finalUrl);
      const text = await response.text();

      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error(
          lang === 'fi' 
            ? 'Palvelin palautti HTML-sivun (tarkista API-polku tai parametrit).' 
            : 'Server returned an HTML page (check API path or parameters).'
        );
      }

      const data = text ? JSON.parse(text) : null;
      return { success: response.ok, data };
    } catch (err: any) {
      return {
        success: false,
        error: lang === 'fi' ? 'REST API virhe: ' + err.message : 'REST API error: ' + err.message
      };
    }
  }

  return { 
    success: false, 
    error: lang === 'fi' ? 'Työkalun suoritustapaa ei löydetty.' : 'Tool execution method not found.' 
  };
};

// Kootaan kaikki työkalut yhteen taulukkoon
export const ALL_TOOLS: SwissTool[] = [
  ...jsonTools, // kehitys & data
  ...xmlTools, // kehitys & data
  ...apiTools, // kehitys & data
  apiDiffTool, // kehitys & data
  jsonSchemaTool, // kehitys & data
  requestReplayTool, // Verkko & API
  ...jwtTools, // Tietoturva & Auth
  jwtPlaygroundTool,
  ...hashTools, // Tietoturva & Kryptografia
  ...encoderTools, // Kehitys & data
  ...fileTools, // kehitys & data
  qrAnalyzerTool, // Tietoturva & Utilitetit
  logAnalyzerTool, // Tietoturva & Utilitetit
  //jwtDecoderTool,
  regexTesterTool, // Teksti & koodi
  colorConverterTool, // Muotoilu
  JSON_FORMATTER_TOOL, // Muotoilijat
  ...sslTools, // Verkko
  REST_DNS_TOOL, // Verkko
  ...dnsTools,
  aiTestGeneratorTool, // AI & Testaus
  fetchSwaggerTool, // Verkko & API
  fetchSoapTool, // Verkko & API
  aiSoapTestGeneratorTool, // AI & Testaus
  restUnitTestGeneratorTool, // AI & Testaus
  soapUnitTestGeneratorTool, // AI & Testaus
  restPythonUnitTestGeneratorTool, // AI & Testaus
  soapPythonUnitTestGeneratorTool, // AI & Testaus
  WorkflowManager, // Työnkulkujen hallinta 
];

