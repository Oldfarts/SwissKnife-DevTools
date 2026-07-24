// types/workflow.ts tai osana hallintalogiikkaa
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

// Tallennus ja paikallinen hallinta
const STORAGE_KEY = 'swissknife_saved_workflows';

export const WorkflowManager = {
  // 1. & 2. Tallenna työnkulku paikallisesti
  saveWorkflowLocally(recipe: WorkflowRecipe): void {
    const saved = WorkflowManager.getLocalWorkflows();
    saved[recipe.name] = recipe;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  },

  getLocalWorkflows(): Record<string, WorkflowRecipe> {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  },

  // 3. Export työnkulku levylle (.json-tiedostona)
  exportWorkflowToFile(recipe: WorkflowRecipe): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recipe, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${recipe.name.toLowerCase().replace(/\s+/g, '-')}.recipe.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  // 5. Import mikä tahansa resepti (tiedostosta tai GitHub-raakadatan tekstistä)
  parseAndValidateRecipe(jsonString: string): WorkflowRecipe {
    const recipe = JSON.parse(jsonString);
    if (!recipe.name || !Array.isArray(recipe.steps)) {
      throw new Error('Virheellinen reseptitiedosto: nimi ja steps-taulukko vaaditaan.');
    }
    return recipe as WorkflowRecipe;
  }
};