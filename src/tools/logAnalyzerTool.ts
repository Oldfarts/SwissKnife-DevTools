import { SwissTool } from '../types';

export const logAnalyzerTool: SwissTool = {
  id: 'log-analyzer',
  name: { 
    fi: 'Älykäs Log Analyzer', 
    en: 'Smart Log Analyzer' 
  },
  category: { 
    fi: 'Tietoturva & Utilitetit', 
    en: 'Security & Utilities' 
  },
  description: { 
    fi: 'Analysoi Apache, Nginx, Node, Android, Windows ja Linux logit. Löytää automaattisesti virheet, varoitukset, stacktracet, IP:t ja top-ongelmat.', 
    en: 'Analyzes Apache, Nginx, Node, Android, Windows, and Linux logs. Automatically finds errors, warnings, stack traces, IPs, and top issues.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'logInput',
      label: { fi: 'Liitä loki tähän', en: 'Paste logs here' },
      type: 'textarea',
      placeholder: { 
        fi: 'Liitä Apache/Nginx, Node, Android (Logcat) tai järjestelmän lokia tähän...', 
        en: 'Paste Apache/Nginx, Node, Android (Logcat) or system logs here...' 
      },
      default: `2026-06-06T12:00:01Z [ERROR] [IP: 192.168.1.50] Database connection timeout after 5000ms
2026-06-06T12:00:02Z [WARN] [IP: 192.168.1.50] Deprecated API usage in /api/v1/login
2026-06-06T12:00:05Z [ERROR] [IP: 10.0.0.15] Uncaught Exception: TypeError: Cannot read properties of undefined (reading 'id')
    at getUser (/app/controllers/user.js:45:23)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
2026-06-06T12:00:06Z [ERROR] [IP: 192.168.1.50] Database connection timeout after 5000ms
192.168.1.99 - - [06/Jun/2026:12:01:00 +0000] "GET /slow-query-endpoint HTTP/1.1" 500 5230 - 3250ms`
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      const rawLogs = inputs.logInput;
      if (!rawLogs) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'Lokisisältö vaaditaan analysointiin.' : 'Log content is required for analysis.' 
        };
      }

      const lines = rawLogs.split(/\r?\n/);
      
      let errorCount = 0;
      let warningCount = 0;
      const errorsList: string[] = [];
      const warningsList: string[] = [];
      const stackTraces: string[] = [];
      const ipAddressesSet = new Set<string>();
      const slowRequests: string[] = [];
      const lineFrequency: Record<string, number> = {};

      let currentStackTrace = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Laske rivien toistuvuutta (siivotaan aikaleimat pois vertailusta, jotta toistuvat rivit löytyvät tehokkaammin)
        const normalizedLine = line.replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '').trim();
        if (normalizedLine.length > 3) {
          lineFrequency[normalizedLine] = (lineFrequency[normalizedLine] || 0) + 1;
        }

        // IP-osoitteiden haku (IPv4)
        const ipMatches = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
        if (ipMatches) {
          ipMatches.forEach(ip => ipAddressesSet.add(ip));
        }

        // Virheiden ja varoitusten tunnistus
        const upperLine = line.toUpperCase();
        if (upperLine.includes('ERROR') || upperLine.includes('FATAL') || upperLine.includes('ERR!') || upperLine.includes(' [E] ')) {
          errorCount++;
          errorsList.push(line);
        } else if (upperLine.includes('WARN') || upperLine.includes('WARNING') || upperLine.includes(' [W] ')) {
          warningCount++;
          warningsList.push(line);
        }

        // Hitaat pyynnöt (esim. ms-merkinnät tai "slow" sanan esiintyminen)
        if (upperLine.includes('SLOW') || /\b([3-9]\d{3}|\d{5,})ms\b/.test(line)) {
          slowRequests.push(line);
        }

        // Stack trace -tunnistus (alkaa tyypillisesti sanalla "at " tai sisältää tiedostopolun ja rivinumeron suluissa)
        if (line.trim().startsWith('at ') || line.includes('.js:') || line.includes('.java:') || line.includes('.py:')) {
          currentStackTrace += line + '\n';
        } else if (currentStackTrace) {
          stackTraces.push(currentStackTrace.trim());
          currentStackTrace = '';
        }
      }

      if (currentStackTrace) {
        stackTraces.push(currentStackTrace.trim());
      }

      // Top 10 toistuvat / yleisimmät ongelmat / rivit
      const topIssues = Object.entries(lineFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([content, count]) => ({ count, content }));

      return {
        success: true,
        data: {
          summary: {
            totalLines: lines.length,
            errors: errorCount,
            warnings: warningCount,
            uniqueIPsCount: ipAddressesSet.size,
            stackTracesFound: stackTraces.length,
            slowRequestsFound: slowRequests.length
          },
          uniqueIPs: Array.from(ipAddressesSet),
          errors: errorsList.slice(0, 20), // Näytetään max 20 uusinta/löytynyttä
          warnings: warningsList.slice(0, 20),
          stackTraces,
          slowRequests,
          topIssues
        }
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'Lokien analysointi epäonnistui: ' : 'Log analysis failed: ') + e.message 
      };
    }
  }
};