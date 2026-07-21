import { SwissTool } from '../types';

export const xmlTools: SwissTool[] = [
  {
    id: 'xml-to-json',
    name: { fi: 'XML -> JSON Muunnin', en: 'XML to JSON Converter' },
    category: { fi: 'Kehitys & Data', en: 'Dev & Data' },
    description: { fi: 'Muuntaa XML-rakenteen JSON-muotoon.', en: 'Converts XML string into JSON object.' },
    type: 'local',
    inputs: [
      {
        key: 'xmlInput',
        label: { fi: 'Syötä XML-teksti', en: 'Input XML Text' },
        type: 'textarea',
        placeholder: { fi: '<root><item>Arvo</item></root>', en: '<root><item>Value</item></root>' }
      }
    ],
    execute: async (inputs) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(inputs.xmlInput || '', 'text/xml');
        
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
          return { success: false, error: 'XML-jäsennysvirhe: ' + parseError[0].textContent };
        }

        const xmlToJson = (node: Node): any => {
          const obj: any = {};
          if (node.nodeType === 1) {
            const elem = node as Element;
            if (elem.attributes && elem.attributes.length > 0) {
              obj['@attributes'] = {};
              for (let j = 0; j < elem.attributes.length; j++) {
                const attr = elem.attributes.item(j);
                if (attr) obj['@attributes'][attr.nodeName] = attr.nodeValue;
              }
            }
          }

          if (node.hasChildNodes()) {
            for (let i = 0; i < node.childNodes.length; i++) {
              const item = node.childNodes.item(i);
              if (!item) continue;
              const nodeName = item.nodeName;
              if (nodeName === '#text') {
                const text = item.nodeValue?.trim();
                if (text) return text;
              } else {
                if (typeof obj[nodeName] === 'undefined') {
                  obj[nodeName] = xmlToJson(item);
                } else {
                  if (!Array.isArray(obj[nodeName])) {
                    obj[nodeName] = [obj[nodeName]];
                  }
                  obj[nodeName].push(xmlToJson(item));
                }
              }
            }
          }
          return obj;
        };

        return { success: true, data: xmlToJson(xmlDoc.documentElement) };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
  }
];