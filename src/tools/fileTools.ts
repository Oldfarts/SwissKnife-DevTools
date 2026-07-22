import { SwissTool } from './types';

export const fileTools: SwissTool[] = [
  {
    id: 'exif-pdf-apk-analyzer',
    name: { fi: 'Tiedostorakenteen Lukija (PDF / EXIF / APK)', en: 'File Metadata Inspector' },
    category: { fi: 'Tiedostot & Forensiikka', en: 'Files & Forensics' },
    description: {
      fi: 'Lukee teksti/binäärisyötteestä metatietoja, otsakkeita ja osoitteita.',
      en: 'Reads headers, strings and basic structure from text or binary input.'
    },
    type: 'local',
    inputs: [
      {
        key: 'fileText',
        label: { fi: 'Syötä teksti / Base64 / Raakadata', en: 'Input Text / Base64 / Raw' },
        type: 'textarea',
        placeholder: { fi: 'Syötä analysoitava teksti tai koodi...', en: 'Enter text to analyze...' }
      }
    ],
    execute: async (inputs) => {
      try {
        const raw = inputs.fileText || '';
        let detectedType = 'Teksti / Tuntematon';
        if (raw.includes('PDF-')) detectedType = 'PDF-dokumentti';
        if (raw.startsWith('PK')) detectedType = 'ZIP / APK / JAR -paketti';
        if (raw.includes('Exif')) detectedType = 'JPEG (Sisältää EXIF-dataa)';

        const urls = raw.match(/https?:\/\/[^\s"']+/g) || [];

        return {
          success: true,
          data: {
            length: raw.length,
            detectedFileType: detectedType,
            foundURLs: Array.from(new Set(urls)).slice(0, 10),
            previewHeader: raw.substring(0, 200)
          }
        };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
  }
];