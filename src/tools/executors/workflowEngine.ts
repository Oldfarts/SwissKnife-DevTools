import { WorkflowStep, WorkflowProgress } from '../types.ts';
import { executeSwissTool, hydratePlugin } from '../index.ts';

export async function runWorkflow(
  steps: WorkflowStep[],
  initialInput: any,
  lang: 'fi' | 'en',
  allTools: any[],
  onWorkflowProgress?: (progress: WorkflowProgress) => void
) {
  let currentData = initialInput;
  const executionLog = [];

  for (let i = 0; i < steps.length; i++) {

    const step = steps[i];

    const rawTool = allTools.find(t => t.id === step.toolId);

    if (!rawTool) {
      return {
        success: false,
        error: `Työkalua ID:llä ${step.toolId} ei löytynyt.`
      };
    }

    const tool = hydratePlugin(rawTool);

    const toolNameStr =
      typeof tool.name === "object"
        ? (tool.name[lang] || tool.name.fi || tool.name.en)
        : tool.name;

    const inputs = {
      ...step.customInputs,
      inputData: currentData,
      inputContent: currentData
    };

    //--------------------------------------------------
    // Aloitus
    //--------------------------------------------------

    onWorkflowProgress?.({
      currentStep: i + 1,
      totalSteps: steps.length,
      toolId: tool.id,
      toolName: toolNameStr,
      progress: 0,
      message: "Starting"
    });

    const startTime = Date.now();

    //--------------------------------------------------
    // Työkalun suoritus
    //--------------------------------------------------

    const result = await executeSwissTool(
      tool,
      inputs,
      lang,
      (toolProgress, message) => {

        onWorkflowProgress?.({
          currentStep: i + 1,
          totalSteps: steps.length,
          toolId: tool.id,
          toolName: toolNameStr,
          progress: toolProgress,
          message
        });

      }
    );

    const finishedTime = Date.now();
    const duration = finishedTime - startTime;

    executionLog.push({
      stepIndex: i,
      toolId: tool.id,
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

      onWorkflowProgress?.({
        currentStep: i + 1,
        totalSteps: steps.length,
        toolId: tool.id,
        toolName: toolNameStr,
        progress: 100,
        message: "Error"
      });

      return {
        success: false,
        error: `Ketju katkesi vaiheessa ${i + 1} (${toolNameStr}): ${result.error}`,
        log: executionLog
      };
    }

    currentData = result.data;

    //--------------------------------------------------
    // Valmis
    //--------------------------------------------------

    onWorkflowProgress?.({
      currentStep: i + 1,
      totalSteps: steps.length,
      toolId: tool.id,
      toolName: toolNameStr,
      progress: 100,
      message: "Completed"
    });

  }

  return {
    success: true,
    finalData: currentData,
    log: executionLog
  };
}