import { SwissTool } from './types';

export const sslTools: SwissTool[] = [
  {
    id: 'ssl-checker',
    name: { fi: 'SSL/TLS Varmenne-analyysi', en: 'SSL/TLS Certificate Analysis' },
    category: { fi: 'Verkko', en: 'Network' },
    description: { 
      fi: 'Tarkistaa palvelimen SSL-sertifikaatin tila- ja voimassaolotiedot ulkoisesta rajapinnasta.', 
      en: 'Checks SSL certificate status and validity via an external API.' 
    },
    type: 'local',
    inputs: [
      { 
        key: 'domain', 
        label: { fi: 'Verkkosivun osoite / Domain', en: 'Domain' }, 
        type: 'text', 
        placeholder: { fi: 'esim. google.com', en: 'e.g. google.com' } 
      }
    ],
    execute: async (inputs, lang = 'fi') => {
      let domain = inputs.domain?.trim().toLowerCase() || '';
      domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      if (!domain) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'Syötä verkkosivun osoite (esim. google.com).' : 'Please enter a valid domain.' 
        };
      }

      try {
        const response = await fetch(
          `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=false&expand=dns_names&expand=issuer`
        );

        if (!response.ok) {
          throw new Error(
            lang === 'fi' ? `Rajapintavirhe: ${response.statusText}` : `API error: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data || data.length === 0) {
          return {
            success: false,
            error: lang === 'fi' ? 'Sertifikaattitietoja ei löytynyt annetulle osoitteelle.' : 'No certificates found for this domain.'
          };
        }

        const latestCert = data[0];
        const notAfter = new Date(latestCert.not_after);
        const notBefore = new Date(latestCert.not_before);
        const isExpired = Date.now() > notAfter.getTime();

        return {
          success: true,
          data: {
            domain: domain,
            status: isExpired ? (lang === 'fi' ? 'Vanhentunut ❌' : 'Expired ❌') : (lang === 'fi' ? 'Voimassa ✅' : 'Valid ✅'),
            issuer: latestCert.issuer?.name || 'Tuntematon / Unknown',
            valid_from: notBefore.toLocaleString(),
            valid_until: notAfter.toLocaleString(),
            dns_names: latestCert.dns_names
          }
        };
      } catch (err: any) {
        return {
          success: false,
          error: (lang === 'fi' ? 'SSL-analyysi epäonnistui: ' : 'SSL analysis failed: ') + err.message
        };
      }
    }
  }
];