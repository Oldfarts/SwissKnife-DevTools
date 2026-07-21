import { SwissTool, Language, getText } from './types';
import { jwtDecoderTool } from './jwtDecoder';
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

export * from './types';

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

// Kootaan kaikki työkalut yhteen taulukkoon
export const ALL_TOOLS: SwissTool[] = [
  ...jsonTools,
  ...xmlTools,
  ...jwtTools,
  ...hashTools,
  ...encoderTools,
  ...apiTools,
  ...dnsTools,
  ...fileTools,
  ...sslTools,
  qrAnalyzerTool,      // Yksittäiset oliot ilman pistetriplaa (...)
  //jwtDecoderTool,
  regexTesterTool,
  colorConverterTool,
  JSON_FORMATTER_TOOL,
  REST_DNS_TOOL
];