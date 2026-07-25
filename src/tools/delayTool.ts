import { SwissTool } from './types';

export const delayTool: SwissTool = {
  id: 'util-delay',
  version: '1.0.0',
  author: 'Jani Ärväs',
  name: {
    fi: 'Odotus / Viive',
    en: 'Delay / Wait'
  },
  description: {
    fi: 'Odottaa määritetyn ajan ennen seuraavaa vaihetta (esim. ZAP-tuonnin valmistumiseen).',
    en: 'Waits for a specified time before the next step (e.g. for ZAP import to finish).'
  },
  category: {
    fi: 'APUVÄLINEET',
    en: 'UTILITIES'
  },
  type: 'local',
  inputs: [
    {
      key: 'seconds',
      type: 'text',
      label: {
        fi: 'Odotusaika sekunteina',
        en: 'Wait time in seconds'
      },
      default: '5'
    }
  ],
  execute: async (inputs: Record<string, any>, lang: string) => {
    const sec = parseInt(inputs.seconds || '5', 10) * 1000;
    await new Promise(resolve => setTimeout(resolve, sec));
    return {
      success: true,
      data: { 
        message: lang === 'fi' 
          ? `Odotettu ${inputs.seconds} sekuntia.` 
          : `Waited for ${inputs.seconds} seconds.` 
      }
    };
  }
};