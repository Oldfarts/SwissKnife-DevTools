export interface WorkflowStep {
  toolId: string;
  inputs: Record<string, any>;
}

export interface WorkflowRecipe {
  name: string;
  description: string;
  author?: string;
  version: string;
  steps: WorkflowStep[];
}