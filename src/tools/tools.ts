import jsQR from 'jsqr';

// ----------------------------------------------------
// TYYPIT JA MÄÄRITTELYT
// ----------------------------------------------------

export type Language = 'fi' | 'en';

export interface LocalizedString {
  fi: string;
  en: string;
}

export interface ToolInput {
  key: string;
  label: LocalizedString;
  type: 'text' | 'textarea' | 'select' | 'color' | 'file';
  placeholder?: LocalizedString;
  options?: string[] | { value: string; label: LocalizedString }[];
  default?: any;
}

export interface SwissTool {
  id: string;
  name: LocalizedString;
  category: LocalizedString;
  description: LocalizedString;
  type: 'local' | 'rest-api';
  endpoint?: string;
  inputs: ToolInput[];
  execute?: (inputs: Record<string, any>, lang?: Language) => Promise<any>;
}

/**
 * Apufunktio kielen hakemiseen LocalizedString-oliolta
 */
export const getText = (obj: LocalizedString, lang: Language): string => {
  return obj[lang] || obj.fi;
};

// ----------------------------------------------------
// 1. QR-KOODIN ANALYSAATTORI
// ----------------------------------------------------
export const qrAnalyzerTool: SwissTool = {
  id: 'qr-analyzer',
  name: {
    fi: 'QR-koodin analysaattori',
    en: 'QR Code Analyzer'
  },
  category: {
    fi: 'Tietoturva & Utilitetit',
    en: 'Security & Utilities'
  },
  description: {
    fi: 'Lukee ja analysoi QR-koodin sisällön (URL, vCard, Wi-Fi, teksti) turvallisesti avaamatta sitä.',
    en: 'Reads and analyzes QR code contents (URL, vCard, Wi-Fi, text) safely without opening it.'
  },
  type: 'local',
  inputs: [
    {
      key: 'imageDataUrl',
      label: { fi: 'Valitse QR-koodin kuva', en: 'Select QR Code Image' },
      type: 'file'
    }
  ],
  execute: async (inputs: Record<string, any>, lang: Language = 'fi') => {
    const dataUrl = inputs.imageDataUrl;
    if (!dataUrl) {
      return {
        success: false,
        error: lang === 'fi' ? 'Valitse QR-koodin kuvatiedosto.' : 'Please select a QR code image file.'
      };
    }

    try {
      const img = new Image();
      img.src = dataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () =>
          reject(new Error(lang === 'fi' ? 'Kuvan lataaminen epäonnistui.' : 'Failed to load image.'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context failure');
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      const parseQR = typeof jsQR === 'function' ? jsQR : (jsQR as any).default;
      const code = parseQR(imageData.data, imageData.width, imageData.height);

      if (!code) {
        return {
          success: false,
          error:
            lang === 'fi'
              ? 'QR-koodia ei löytynyt kuvasta. Varmista että kuva on selkeä.'
              : 'No QR code found in the image. Ensure image is clear.'
        };
      }

      const rawText = code.data;
      let parsedType = lang === 'fi' ? 'Teksti / Tuntematon' : 'Text / Unknown';
      let details: Record<string, any> = {};

      if (rawText.startsWith('http://') || rawText.startsWith('https://')) {
        parsedType = 'URL (Nettiosoite)';
        try {
          const url = new URL(rawText);
          details = {
            Protocol: url.protocol,
            Host: url.hostname,
            Path: url.pathname,
            Params: Object.fromEntries(url.searchParams.entries())
          };
        } catch {
          // Virheellinen URL
        }
      } else if (rawText.startsWith('WIFI:')) {
        parsedType = 'Wi-Fi Network';
        const ssidMatch = rawText.match(/S:([^;]+);/);
        const passMatch = rawText.match(/P:([^;]+);/);
        const typeMatch = rawText.match(/T:([^;]+);/);
        details = {
          SSID: ssidMatch ? ssidMatch[1] : 'Unknown',
          Password: passMatch ? passMatch[1] : 'None / Hidden',
          Security: typeMatch ? typeMatch[1] : 'WPA/WPA2'
        };
      } else if (rawText.includes('BEGIN:VCARD')) {
        parsedType = 'vCard (Yhteystieto)';
        const nameMatch = rawText.match(/FN:(.+)/);
        const phoneMatch = rawText.match(/TEL.*:(.+)/);
        const emailMatch = rawText.match(/EMAIL.*:(.+)/);
        details = {
          Name: nameMatch ? nameMatch[1].trim() : '-',
          Phone: phoneMatch ? phoneMatch[1].trim() : '-',
          Email: emailMatch ? emailMatch[1].trim() : '-'
        };
      }

      return {
        success: true,
        data: {
          Type: parsedType,
          RawContent: rawText,
          Details: details
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error:
          err.message ||
          (lang === 'fi' ? 'QR-koodin analysointi epäonnistui.' : 'QR code analysis failed.')
      };
    }
  }
};

// ----------------------------------------------------
// 2. JSON MUOTOILIJA
// ----------------------------------------------------
export const jsonFormatterTool: SwissTool = {
  id: 'json-formatter',
  name: {
    fi: 'JSON Muotoilija',
    en: 'JSON Formatter'
  },
  category: {
    fi: 'Kehittäjän työkalut',
    en: 'Developer Tools'
  },
  description: {
    fi: 'Siistii ja validoi JSON-merkkijonon.',
    en: 'Formats and validates JSON string.'
  },
  type: 'local',
  inputs: [
    {
      key: 'jsonInput',
      label: { fi: 'Syötä JSON', en: 'Input JSON' },
      type: 'textarea',
      placeholder: { fi: '{"avain": "arvo"}', en: '{"key": "value"}' }
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      const parsed = JSON.parse(inputs.jsonInput || '{}');
      return {
        success: true,
        data: JSON.stringify(parsed, null, 2)
      };
    } catch (err: any) {
      return {
        success: false,
        error: (lang === 'fi' ? 'Virheellinen JSON: ' : 'Invalid JSON: ') + err.message
      };
    }
  }
};

// ----------------------------------------------------
// 3. HTTP REQUEST & REPLAY (Esimerkki lokalisoiduista optioista)
// ----------------------------------------------------
export const requestReplayTool: SwissTool = {
  id: 'request-replay',
  name: {
    fi: 'HTTP Pyynnön toistaja',
    en: 'HTTP Request & Replay'
  },
  category: {
    fi: 'Kehittäjän työkalut',
    en: 'Developer Tools'
  },
  description: {
    fi: 'Suorittaa, muokkaa ja toistaa HTTP-pyyntöjä.',
    en: 'Executes, edits, and replays HTTP requests.'
  },
  type: 'local',
  inputs: [
    {
      key: 'action',
      label: {
        fi: 'Toiminto',
        en: 'Action'
      },
      type: 'select',
      options: [
        { 
          value: 'execute', 
          label: { fi: 'Suorita pyyntö', en: 'Execute Request' } 
        },
        { 
          value: 'edit_replay', 
          label: { fi: 'Muokkaa ja toista', en: 'Edit & Replay' } 
        },
        { 
          value: 'compare', 
          label: { fi: 'Vertaile vastauksia', en: 'Compare Responses' } 
        }
      ],
      default: 'execute'
    },
    {
      key: 'url',
      label: { fi: 'Kohde-URL', en: 'Target URL' },
      type: 'text',
      placeholder: { fi: 'https://api.example.com/data', en: 'https://api.example.com/data' }
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    return {
      success: true,
      data: {
        action: inputs.action,
        url: inputs.url,
        message: lang === 'fi' ? 'Pyyntö simuloitu onnistuneesti.' : 'Request simulated successfully.'
      }
    };
  }
};

// ----------------------------------------------------
// KAIKKIEN TYÖKALUJEN KOKOOMA
// ----------------------------------------------------
export const ALL_TOOLS: SwissTool[] = [
  qrAnalyzerTool,
  jsonFormatterTool,
  requestReplayTool
];