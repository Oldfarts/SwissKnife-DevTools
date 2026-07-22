import { SwissTool } from './types';

export const apiDiffTool: SwissTool = {
  id: 'rest-api-diff',
  name: { 
    fi: 'REST API / OpenAPI Diff', 
    en: 'REST API / OpenAPI Diff' 
  },
  category: { 
    fi: 'Kehittäjän työkalut', 
    en: 'Developer Tools' 
  },
  description: { 
    fi: 'Vertaa kahta Swagger/OpenAPI-tiedostoa ja tunnista uudet, poistetut ja muuttuneet endpointit sekä parametrit.', 
    en: 'Compare two Swagger/OpenAPI files to identify added, removed, and changed endpoints and parameters.' 
  },
  type: 'local',
  inputs: [
    {
      key: 'oldApi',
      label: { fi: 'Vanha API (OpenAPI JSON)', en: 'Old API (OpenAPI JSON)' },
      type: 'textarea',
      placeholder: { fi: 'Liitä vanha OpenAPI JSON tähän...', en: 'Paste old OpenAPI JSON here...' },
      default: JSON.stringify({
        openapi: "3.0.0",
        paths: {
          "/users": {
            get: {
              parameters: [{ name: "limit", in: "query" }],
              responses: { "200": { description: "Success" } }
            }
          },
          "/old-endpoint": {
            get: { responses: { "200": { description: "OK" } } }
          }
        }
      }, null, 2)
    },
    {
      key: 'newApi',
      label: { fi: 'Uusi API (OpenAPI JSON)', en: 'New API (OpenAPI JSON)' },
      type: 'textarea',
      placeholder: { fi: 'Liitä uusi OpenAPI JSON tähän...', en: 'Paste new OpenAPI JSON here...' },
      default: JSON.stringify({
        openapi: "3.0.0",
        paths: {
          "/users": {
            get: {
              parameters: [
                { name: "limit", in: "query" },
                { name: "offset", in: "query" }
              ],
              responses: { "200": { description: "Updated Success Response" } }
            }
          },
          "/posts": {
            get: { responses: { "200": { description: "OK" } } }
          }
        }
      }, null, 2)
    }
  ],
  execute: async (inputs, lang = 'fi') => {
    try {
      if (!inputs.oldApi || !inputs.newApi) {
        return { 
          success: false, 
          error: lang === 'fi' ? 'Molemmat API-määrittelyt vaaditaan vertailuun.' : 'Both API definitions are required for comparison.' 
        };
      }

      let oldSpec, newSpec;
      try {
        oldSpec = JSON.parse(inputs.oldApi);
        newSpec = JSON.parse(inputs.newApi);
      } catch (e: any) {
        return {
          success: false,
          error: (lang === 'fi' ? 'Virheellinen JSON-formaatti: ' : 'Invalid JSON format: ') + e.message
        };
      }

      const oldPaths = oldSpec.paths || {};
      const newPaths = newSpec.paths || {};

      const allEndpoints = Array.from(new Set([...Object.keys(oldPaths), ...Object.keys(newPaths)]));
      const diffResults: string[] = [];

      let addedCount = 0;
      let removedCount = 0;
      let modifiedCount = 0;

      for (const path of allEndpoints) {
        const oldMethods = oldPaths[path] ? Object.keys(oldPaths[path]) : [];
        const newMethods = newPaths[path] ? Object.keys(newPaths[path]) : [];

        const allMethods = Array.from(new Set([...oldMethods, ...newMethods]));

        for (const method of allMethods) {
          const upperMethod = method.toUpperCase();
          const endpointKey = `${upperMethod} ${path}`;

          // Korjattu syntaksi: käytetään turvallista valinnaista ketjutusta ?.[method]
          const oldOp = oldPaths[path]?.[method];
          const newOp = newPaths[path]?.[method];

          if (!oldOp && newOp) {
            diffResults.push(`+ [LISÄTTY] ${endpointKey}`);
            addedCount++;
          } else if (oldOp && !newOp) {
            diffResults.push(`- [POISTETTU] ${endpointKey}`);
            removedCount++;
          } else if (oldOp && newOp) {
            const changes: string[] = [];

            const oldParams = (oldOp.parameters || []).map((p: any) => p.name);
            const newParams = (newOp.parameters || []).map((p: any) => p.name);

            const addedParams = newParams.filter((p: string) => !oldParams.includes(p));
            const removedParams = oldParams.filter((p: string) => !newParams.includes(p));

            addedParams.forEach((p: string) => {
              changes.push(`  + uusi parametri: '${p}'`);
            });
            removedParams.forEach((p: string) => {
              changes.push(`  - poistettu parametri: '${p}'`);
            });

            const oldResKeys = Object.keys(oldOp.responses || {});
            const newResKeys = Object.keys(newOp.responses || {});
            if (JSON.stringify(oldOp.responses) !== JSON.stringify(newOp.responses)) {
              changes.push(`  ~ response muuttunut (koodit: vanhat [${oldResKeys.join(', ')}] -> uudet [${newResKeys.join(', ')}])`);
            }

            if (changes.length > 0) {
              diffResults.push(`~ [MUUTTUNUT] ${endpointKey}`);
              diffResults.push(...changes);
              modifiedCount++;
            }
          }
        }
      }

      return {
        success: true,
        data: {
          summary: {
            added: addedCount,
            removed: removedCount,
            modified: modifiedCount,
            totalChanges: addedCount + removedCount + modifiedCount
          },
          diffLog: diffResults.length > 0 ? diffResults : [lang === 'fi' ? 'Ei muutoksia havaittu API-määrittelyissä.' : 'No changes detected in API definitions.']
        }
      };

    } catch (e: any) {
      return { 
        success: false, 
        error: (lang === 'fi' ? 'API-vertailu epäonnistui: ' : 'API diff failed: ') + e.message 
      };
    }
  }
};