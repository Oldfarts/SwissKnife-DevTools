import { WorkflowRecipe } from './workflow';
import { executeSwissTool } from '../index'; // tai mistä tiedostosta executeSwissTool löytyykään
import { Language } from '../types';

export async function executeWorkflow(
  recipe: WorkflowRecipe, 
  initialInput: any, 
  toolsRegistry: Record<string, any>,
  lang: Language = "fi",
  onStepProgress?: (stepIndex: number, progress: number, message?: string) => void
) {
  let currentData = initialInput;
  const executionLog = [];

  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    const tool = toolsRegistry[step.toolId];
    
    if (!tool) {
      throw new Error(`Työkalua ID:llä "${step.toolId}" ei löytynyt järjestelmästä.`);
    }

    // Yhdistetään askelman omat syötteet ja edelliseltä askeleelta saatu inputContent
    const executionInputs = {
      ...step.inputs,
      inputContent: currentData 
    };

    const startTime = Date.now();
    
    // Suoritetaan työkalu keskitetyn executeSwissTool-moottorin kautta (tukee local, rest, polling & progress)
    const result = await executeSwissTool(
      tool,
      executionInputs,
      lang,
      (progress, message) => {
          console.log(`Askel ${i} (${step.toolId}): ${progress}% - ${message}`);
          onStepProgress?.(i, progress, message);
      }
    );

    const finishedTime = Date.now();
    const duration = finishedTime - startTime;

    executionLog.push({
      stepIndex: i,
      toolId: step.toolId,
      toolName: tool.name?.fi || tool.name || step.toolId,
      state: result.success ? "Finished" : "Error",
      progress: 100,
      started: startTime,
      finished: finishedTime,
      duration,
      inputs: executionInputs,
      result
    });

    if (!result.success) {
      throw new Error(`Työkalu "${tool.name?.fi || tool.name || step.toolId}" epäonnistui: ${result.error}`);
    }

    // Siirretään tulos data seuraavalle askeleelle
    currentData = result.data;
  }

  return {
    success: true,
    finalData: currentData,
    log: executionLog
  };
}