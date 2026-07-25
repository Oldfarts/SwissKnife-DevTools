import { SwissTool } from './types';

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