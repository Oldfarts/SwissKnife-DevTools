import { SwissTool, Language } from '../types';

function parseToHex(colorInput: string): string | null {
  if (!colorInput) return null;
  const str = colorInput.trim();

  if (/^[0-9A-Fa-f]{3}$/.test(str)) {
    return `#${str[0]}${str[0]}${str[1]}${str[1]}${str[2]}${str[2]}`.toUpperCase();
  }
  if (/^[0-9A-Fa-f]{6}$/.test(str)) {
    return `#${str}`.toUpperCase();
  }

  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = str;
  const computed = ctx.fillStyle;

  if (computed.startsWith('#')) {
    return computed.toUpperCase();
  }

  const match = computed.match(/\d+/g);
  if (match && match.length >= 3) {
    const r = parseInt(match[0], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[2], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  return null;
}

export const colorConverterTool: SwissTool = {
  id: 'color-converter',
  name: { fi: 'Värimuunnin & Valitsin', en: 'Color Converter & Picker' },
  category: { fi: 'Muotoilu', en: 'Design' },
  description: {
    fi: 'Valitse väri paletista (Point & Click) tai syötä HEX/RGB-koodi / nimi.',
    en: 'Pick a color from the palette (Point & Click) or enter a HEX/RGB code / name.'
  },
  type: 'local',
  inputs: [
    {
      key: 'colorPicker',
      label: { fi: 'Visuaalinen värivalitsin', en: 'Visual Color Picker' },
      type: 'color',
      default: '#3b82f6'
    },
    {
      key: 'colorText',
      label: { fi: 'Tai kirjoita värikoodi / nimi', en: 'Or type color code / name' },
      type: 'text',
      placeholder: { fi: 'esim. #3b82f6 tai red', en: 'e.g. #3b82f6 or red' }
    }
  ],
  execute: async (inputs: Record<string, any>, lang: Language = 'fi') => {
    try {
      const rawInput = (inputs.colorText && inputs.colorText.trim() !== '') 
        ? inputs.colorText 
        : (inputs.colorPicker || '#3b82f6');

      const hexFull = parseToHex(rawInput);

      if (!hexFull) {
        return {
          success: false,
          error: lang === 'fi' 
            ? `Tuntematon värikoodi tai nimi: "${rawInput}".` 
            : `Unknown color code or name: "${rawInput}".`
        };
      }

      const cleanHex = hexFull.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);

      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      const max = Math.max(rNorm, gNorm, bNorm);
      const min = Math.min(rNorm, gNorm, bNorm);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
          case gNorm: h = (bNorm - rNorm) / d + 2; break;
          case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;
      }

      return {
        success: true,
        data: {
          Esikatselu: `🎨 Väri: ${hexFull}`,
          HEX: hexFull,
          RGB: `rgb(${r}, ${g}, ${b})`,
          HSL: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
          CSS_Var: `--color: ${hexFull};`
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || (lang === 'fi' ? 'Värin muunnos epäonnistui.' : 'Color conversion failed.')
      };
    }
  }
};