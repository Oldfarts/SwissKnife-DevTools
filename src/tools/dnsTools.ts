import { SwissTool } from '../types';

export const dnsTools: SwissTool[] = [
  {
    id: 'dns-lookup',
    name: { fi: 'DNS-haku (Cloudflare DoH)', en: 'DNS Lookup (Cloudflare DoH)' },
    category: { fi: 'Verkko & API', en: 'Network & API' },
    description: { fi: 'Hakee verkkotunnuksen DNS-tietueet.', en: 'Fetches domain DNS records via Cloudflare DoH.' },
    type: 'local',
    inputs: [
      {
        key: 'domain',
        label: { fi: 'Verkkotunnus (Domain)', en: 'Domain' },
        type: 'text',
        placeholder: { fi: 'google.com', en: 'google.com' }
      },
      {
        key: 'type',
        label: { fi: 'Tietuetyyppi', en: 'Record Type' },
        type: 'select',
        options: ['A', 'AAAA', 'MX', 'TXT', 'NS'],
        default: 'A'
      }
    ],
    execute: async (inputs) => {
      try {
        if (!inputs.domain) return { success: false, error: 'Syötä verkkotunnus.' };
        const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${inputs.domain}&type=${inputs.type || 'A'}`, {
          headers: { accept: 'application/dns-json' }
        });
        const data = await res.json();
        return { success: res.ok, data };
      } catch (e: any) {
        return { success: false, error: 'DNS-haku epäonnistui: ' + e.message };
      }
    }
  }
];