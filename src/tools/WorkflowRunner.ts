import { WorkflowRecipe } from '../types/workflow';

export async function executeWorkflow(
  recipe: WorkflowRecipe, 
  initialInput: any, 
  toolsRegistry: Record<string, any>
) {
  let currentData = initialInput;

  for (const step of recipe.steps) {
    const tool = toolsRegistry[step.toolId];
    if (!tool) {
      throw new Error(`Työkalua ID:llä "${step.toolId}" ei löytynyt järjestelmästä.`);
    }

    const executionInputs = {
      ...step.inputs,
      inputContent: currentData 
    };

    const result = await tool.execute(executionInputs);

    if (!result.success) {
      throw new Error(`Työkalu "${tool.name?.fi || step.toolId}" epäonnistui: ${result.error}`);
    }

    currentData = result.data?.testCode || result.data;
  }

  return currentData;
}