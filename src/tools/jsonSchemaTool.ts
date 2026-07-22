import { SwissTool, getText } from './tools';

export const jsonSchemaTool: SwissTool = {
  id: 'json-schema-generator',
  category: { fi: 'Kehitys & Data', en: 'Dev & Data' },
  name: { fi: 'JSON Schema Generator', en: 'JSON Schema Generator' },
  description: { 
    fi: 'Muunna JSON-data JSON Schemaksi tai generoi JSON-skeemasta esimerkkidata.', 
    en: 'Convert JSON data to JSON Schema or generate sample JSON from a schema.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'mode',
      label: { fi: 'Suunta / Toiminto', en: 'Direction / Action' },
      type: 'select',
      default: 'json-to-schema',
      options: [
        { value: 'json-to-schema', label: { fi: 'JSON -> JSON Schema', en: 'JSON -> JSON Schema' } },
        { value: 'schema-to-json', label: { fi: 'JSON Schema -> Esimerkki-JSON', en: 'Schema -> JSON Example' } }
      ]
    },
    {
      key: 'inputData',
      label: { fi: 'Syötetieto (JSON tai Schema)', en: 'Input Data (JSON or Schema)' },
      type: 'textarea',
      placeholder: { fi: 'Liitä JSON tai Schema tähän...', en: 'Paste JSON or Schema here...' },
      default: '{\n  "id": 1,\n  "name": "Matti Meikäläinen",\n  "isActive": true,\n  "tags": ["admin", "user"]\n}'
    }
  ],
  execute: async (inputs, lang) => {
    const { mode, inputData } = inputs;

    if (!inputData || !inputData.trim()) {
      return { 
        success: false, 
        error: lang === 'fi' ? 'Syöte ei voi olla tyhjä.' : 'Input cannot be empty.' 
      };
    }

    try {
      const parsed = JSON.parse(inputData);

      // A) JSON -> JSON SCHEMA
      if (mode === 'json-to-schema') {
        const generateSchema = (obj: any): any => {
          if (obj === null) return { type: 'null' };
          
          const type = Array.isArray(obj) ? 'array' : typeof obj;

          if (type === 'object') {
            const properties: Record<string, any> = {};
            const required: string[] = [];

            for (const [key, val] of Object.entries(obj)) {
              properties[key] = generateSchema(val);
              required.push(key);
            }

            return {
              type: 'object',
              properties,
              required: required.length > 0 ? required : undefined
            };
          }

          if (type === 'array') {
            const itemSchema = obj.length > 0 ? generateSchema(obj[0]) : { type: 'string' };
            return {
              type: 'array',
              items: itemSchema
            };
          }

          return { type };
        };

        const schema = {
          $schema: 'http://json-schema.org/draft-07/schema#',
          ...generateSchema(parsed)
        };

        return { success: true, data: schema };
      } 
      
      // B) SCHEMA -> JSON EXAMPLE
      else if (mode === 'schema-to-json') {
        const generateExample = (schema: any): any => {
          if (!schema || typeof schema !== 'object') return null;

          if (schema.example !== undefined) return schema.example;

          const type = schema.type;

          if (type === 'object' && schema.properties) {
            const obj: Record<string, any> = {};
            for (const [key, propSchema] of Object.entries(schema.properties)) {
              obj[key] = generateExample(propSchema);
            }
            return obj;
          }

          if (type === 'array' && schema.items) {
            return [generateExample(schema.items)];
          }

          if (type === 'string') return 'string';
          if (type === 'number' || type === 'integer') return 0;
          if (type === 'boolean') return true;

          return null;
        };

        const example = generateExample(parsed);
        return { success: true, data: example };
      }

      return { 
        success: false, 
        error: lang === 'fi' ? 'Tuntematon tila.' : 'Unknown mode.' 
      };

    } catch (err: any) {
      return { 
        success: false, 
        error: lang === 'fi' 
          ? 'Virhe JSON-jäsennyksessä (tarkista syntaksi): ' + err.message 
          : 'JSON parsing error (check syntax): ' + err.message 
      };
    }
  }
};