import { WorkflowRecipe } from '../tools/workflow';

export async function executeWorkflow(
  recipe: WorkflowRecipe, 
  initialInput: any, 
  toolsRegistry: Record<string, any>
) {
  let currentData = initialInput;
  const executionLog = [];

  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    const tool = toolsRegistry[step.toolId];
    
    if (!tool) {
      throw new Error(`Työkalua ID:llä "${step.toolId}" ei löytynyt järjestelmästä.`);
    }

    const executionInputs = {
      ...step.inputs,
      inputContent: currentData 
    };

    const startTime = Date.now();
    
    let result;
    if (typeof tool.executeWithPolling === 'function') {
      result = await tool.executeWithPolling(executionInputs);
    } else if (typeof tool.execute === 'function') {
      result = await tool.execute(executionInputs);
    } else if (tool.endpoint || tool.type === 'rest-api') {
      try {
        let targetEndpoint = tool.endpoint || '';
        
        // Vite proxy -tuki ZAP-kutsuille CORS-virheiden välttämiseksi
        if (targetEndpoint.startsWith('http://localhost:8080')) {
          targetEndpoint = targetEndpoint.replace('http://localhost:8080', '/zap-api');
        } else if (targetEndpoint && !targetEndpoint.startsWith('/zap-api') && !targetEndpoint.startsWith('http')) {
          targetEndpoint = `/zap-api${targetEndpoint.startsWith('/') ? '' : '/'}${targetEndpoint}`;
        }

        const queryParamsObj: Record<string, string> = {};
        Object.entries(executionInputs).forEach(([k, v]) => {
          if (k !== 'inputContent' && v !== '' && v !== null && v !== undefined) {
            queryParamsObj[k] = String(v);
          }
        });
        
        const queryParams = new URLSearchParams(queryParamsObj).toString();
        const finalUrl = queryParams && targetEndpoint ? `${targetEndpoint}?${queryParams}` : targetEndpoint;

        const response = await fetch(finalUrl);
        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = { rawText: text };
        }

        result = {
          success: response.ok,
          data: data || { message: "Suoritettu onnistuneesti" }
        };
      } catch (err: any) {
        result = {
          success: false,
          error: err.message
        };
      }
    } else {
      throw new Error(`Työkalulla "${tool.name?.fi || step.toolId}" ei ole määritelty suoritustapaa (execute tai endpoint).`);
    }

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

    currentData = result.data;
  }

  return {
    success: true,
    finalData: currentData,
    log: executionLog
  };
}