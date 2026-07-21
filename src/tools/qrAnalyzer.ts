import jsQR from 'jsqr';
import { SwissTool, Language } from '../types';

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
    fi: 'Lukee ja analysoi QR-koodin sisällön turvallisesti avaamatta sitä. Huom! Käytä staattisia (Static) QR-koodeja — dynaamiset koodit sisältävät usein vain väliaikaisen uudelleenohjauslinkin (esim. qrto.org).',
    en: 'Reads and analyzes QR code contents safely without opening it. Note: Use Static QR codes — dynamic codes often only contain a temporary redirect link.'
  },
  type: 'local',
  inputs: [
    {
      key: 'imageDataUrl',
      label: { 
        fi: 'Valitse QR-koodin kuva (mieluiten staattinen / Static QR)', 
        en: 'Select QR Code Image (preferably Static QR)' 
      },
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

      const rawText = code.data.trim();
      let parsedType = lang === 'fi' ? 'Teksti / Tuntematon' : 'Text / Unknown';
      let details: Record<string, any> = {};

      // Jos tunnistetaan dynaamisen generaattorin linkki, annetaan käyttäjälle vinkki
      let note: string | undefined = undefined;
      if (rawText.includes('qrto.org') || rawText.includes('qrco.de') || rawText.includes('me-qr.com')) {
        note = lang === 'fi'
          ? 'Tämä vaikuttaa dynaamiselta QR-koodilta (uudelleenohjauspalvelu). Jos koodi ei toimi, luo uusi koodi valitsemalla "Static QR".'
          : 'This appears to be a dynamic QR code redirect. If it fails, create a new one using "Static QR".';
      }

      const hasProtocol = rawText.startsWith('http://') || rawText.startsWith('https://');
      const isDomainLike = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(rawText);

      if (hasProtocol || isDomainLike) {
        parsedType = 'URL (Nettiosoite)';
        try {
          const formattedUrl = hasProtocol ? rawText : `https://${rawText}`;
          const url = new URL(formattedUrl);
          details = {
            Protocol: hasProtocol ? url.protocol : 'https: (oletus)',
            Host: url.hostname,
            Port: url.port || (url.protocol === 'https:' ? '443' : '80'),
            Path: url.pathname,
            Params: Object.fromEntries(url.searchParams.entries())
          };
        } catch {}
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
          Details: details,
          ...(note ? { Notice: note } : {})
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