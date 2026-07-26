import { WorkflowStep } from './types';
import { executeSwissTool, hydratePlugin } from './index';

export async function runWorkflow(
  steps: WorkflowStep[],
  initialInput: any,
  lang: 'fi' | 'en',
  allTools: any[]
) {
  let currentData = initialInput;
  const executionLog = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const rawTool = allTools.find(t => t.id === step.toolId);
    
    if (!rawTool) {
      return { success: false, error: `Työkalua ID:llä ${step.toolId} ei löytynyt.` };
    }

    const tool = hydratePlugin(rawTool);

    const inputs = {
      ...step.customInputs,
      inputData: currentData,
      inputContent: currentData
    };

    const startTime = Date.now();
    const result = await executeSwissTool(tool, inputs, lang);
    const finishedTime = Date.now();
    const duration = finishedTime - startTime;

    const toolNameStr = typeof tool.name === 'object' ? (tool.name[lang] || tool.name.fi || tool.name.en) : tool.name;

    executionLog.push({
      stepIndex: i,
      toolName: toolNameStr,
      state: result.success ? "Finished" : "Error",
      progress: 100,
      started: startTime,
      finished: finishedTime,
      duration,
      inputs,
      result
    });

    if (!result.success) {
      return {
        success: false,
        error: `Ketju katkesi vaiheessa ${i + 1} (${toolNameStr}): ${result.error}`,
        log: executionLog
      };
    }

    // Siirretään raakadata sellaisenaan eteenpäin seuraavalle askeleelle
    currentData = result.data;
  }

  return {
    success: true,
    finalData: currentData,
    log: executionLog
  };
}