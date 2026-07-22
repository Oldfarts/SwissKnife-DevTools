import { WorkflowStep } from './types';
import { ALL_TOOLS, executeSwissTool } from './index';

export async function runWorkflow(
  steps: WorkflowStep[],
  initialInput: any,
  lang: 'fi' | 'en'
) {
  let currentData = initialInput;
  const executionLog = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    // Etsitään työkalu sen ID:n perusteella
    // (Oletetaan että ALL_TOOLS on tuotavissa tai välitetään mukana)
    const tool = ALL_TOOLS.find(t => t.id === step.toolId);
    
    if (!tool) {
      return { success: false, error: `Työkalua ID:llä ${step.toolId} ei löytynyt.` };
    }

    // Muodostetaan syötteet: Otetaan työkalun oletukset, yhdistetään 
    // edellisen stepin data (esim. inputData-kenttään) ja mahdolliset käyttäjän omat säädöt.
    const inputs = {
      ...step.customInputs,
      inputData: currentData // Tässä taika: edellinen tulos syötetään tänne
    };

    const startTime = Date.now();
    const result = await executeSwissTool(tool, inputs, lang);
    const duration = Date.now() - startTime;

    executionLog.push({
      stepIndex: i,
      toolName: tool.name[lang],
      inputs,
      result,
      duration
    });

    if (!result.success) {
      return {
        success: false,
        error: `Ketju katkesi vaiheessa ${i + 1} (${tool.name[lang]}): ${result.error}`,
        log: executionLog
      };
    }

    // Siirretään tämän stepin tulos dataksi seuraavalle
    currentData = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
  }

  return {
    success: true,
    finalData: currentData,
    log: executionLog
  };
}