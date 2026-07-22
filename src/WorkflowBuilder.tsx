import React, { useState, useEffect } from 'react';
import { Play, Plus, Trash2, CheckCircle, AlertCircle, History, Clock } from 'lucide-react';

interface ToolInputDef {
  key: string;
  label: any;
  type: string;
  default?: any;
  options?: any[];
  placeholder?: any;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  inputs?: ToolInputDef[];
  type?: string;
  endpoint?: string;
  execute?: (inputs: Record<string, any>, lang: string) => Promise<any>;
}

interface WorkflowStep {
  id: string; // Uniikki ID jokaiselle vaiheelle, estää key-konfliktit
  toolId: string;
  inputs: Record<string, any>;
}

interface WorkflowResultItem {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  stepsCount: number;
  results: WorkflowResultItem[];
}

interface WorkflowBuilderProps {
  tools: Tool[];
  lang: 'fi' | 'en';
  initialWorkflowSteps?: WorkflowStep[] | any[] | null;
  onSaveHistory?: (steps: any[], result: any) => void;
  t: any;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ 
  tools, 
  lang, 
  initialWorkflowSteps, 
  onSaveHistory, 
  t 
}) => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<WorkflowResultItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Synkronoidaan esiasetetut vaiheet (esim. sivupalkista tai historiasta valitut)
  useEffect(() => {
    if (initialWorkflowSteps && Array.isArray(initialWorkflowSteps)) {
      const formatted = initialWorkflowSteps.map((step, idx) => ({
        id: step.id || `step-${Date.now()}-${idx}`,
        toolId: step.toolId || (tools[0] ? tools[0].id : ''),
        inputs: step.inputs || {}
      }));
      setWorkflowSteps(formatted);
    } else {
      setWorkflowSteps([]);
    }
  }, [initialWorkflowSteps, tools]);

  const addStep = () => {
    if (tools.length > 0) {
      const firstTool = tools[0];
      const initialInputs: Record<string, any> = {};
      
      firstTool.inputs?.forEach((input) => {
        if (input.default !== undefined) {
          initialInputs[input.key] = input.default;
        } else if (input.options && input.options.length > 0) {
          const firstOpt = input.options[0];
          initialInputs[input.key] = typeof firstOpt === 'object' && firstOpt !== null ? (firstOpt as any).value : firstOpt;
        } else {
          initialInputs[input.key] = '';
        }
      });

      setWorkflowSteps((prev) => [
        ...prev, 
        { 
          id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          toolId: firstTool.id, 
          inputs: initialInputs 
        }
      ]);
    }
  };

  const updateStepTool = (index: number, toolId: string) => {
    const selectedTool = tools.find((t) => t.id === toolId);
    const initialInputs: Record<string, any> = {};

    selectedTool?.inputs?.forEach((input) => {
      if (input.default !== undefined) {
        initialInputs[input.key] = input.default;
      } else if (input.options && input.options.length > 0) {
        const firstOpt = input.options[0];
        initialInputs[input.key] = typeof firstOpt === 'object' && firstOpt !== null ? (firstOpt as any).value : firstOpt;
      } else {
        initialInputs[input.key] = '';
      }
    });

    const updated = [...workflowSteps];
    updated[index] = { 
      ...updated[index],
      toolId, 
      inputs: initialInputs 
    };
    setWorkflowSteps(updated);
  };

  const updateStepInput = (index: number, inputKey: string, value: any) => {
    const updated = [...workflowSteps];
    updated[index] = {
      ...updated[index],
      inputs: {
        ...updated[index].inputs,
        [inputKey]: value
      }
    };
    setWorkflowSteps(updated);
  };

  const removeStep = (index: number) => {
    setWorkflowSteps(workflowSteps.filter((_, i) => i !== index));
  };

  const runWorkflow = async () => {
    setIsRunning(true);
    setResults([]);
    const executionResults: WorkflowResultItem[] = [];

    try {
      let previousOutput: any = '';

      for (const step of workflowSteps) {
        const tool = tools.find(t => t.id === step.toolId);
        if (!tool) continue;

        const currentInputs = { ...step.inputs };
        
        if (previousOutput && tool.inputs) {
          const textInput = tool.inputs.find(i => i.type === 'text' || i.type === 'textarea');
          if (textInput && !currentInputs[textInput.key]) {
            currentInputs[textInput.key] = typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput);
          }
        }

        let res: any = { success: false, error: 'Tuntematon suoritustapa' };

        if (tool.type === 'local' && tool.execute) {
          res = await tool.execute(currentInputs, lang);
        } else if (tool.type === 'rest-api' && tool.endpoint) {
          try {
            const queryParams = new URLSearchParams(currentInputs).toString();
            const response = await fetch(`${tool.endpoint}?${queryParams}`);
            const data = await response.json();
            res = { success: response.ok, data };
          } catch (err: any) {
            res = { success: false, error: err.message };
          }
        } else {
          res = { success: true, data: `Simuloitu ajo työkaluun ${tool.name}` };
        }

        executionResults.push({
          toolName: tool.name,
          success: res.success ?? true,
          data: res.data ?? res,
          error: res.error
        });

        previousOutput = res.data ?? res;
      }
    } catch (error: any) {
      executionResults.push({
        toolName: 'Yleinen virhe',
        success: false,
        error: error.message
      });
    } finally {
      setResults(executionResults);
      setIsRunning(false);

      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        stepsCount: workflowSteps.length,
        results: executionResults
      };
      setHistory(prev => [newHistoryItem, ...prev]);

      if (onSaveHistory) {
        onSaveHistory(workflowSteps, executionResults);
      }
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 w-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold text-cyan-400">{t?.workflowTitle || 'Workflows'}</h2>
        <button
          onClick={addStep}
          className="flex items-center gap-1 bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {t?.addStep || '+ Add Step'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {workflowSteps.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            {lang === 'fi' ? 'Ei vaiheita lisätty. Aloita lisäämällä ensimmäinen vaihe.' : 'No steps added. Start by adding a step.'}
          </p>
        ) : (
          workflowSteps.map((step, index) => {
            const currentTool = tools.find((t) => t.id === step.toolId);

            return (
              <div key={step.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-sm">#{index + 1}</span>
                  <select
                    value={step.toolId}
                    onChange={(e) => updateStepTool(index, e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {tools.map((tool) => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeStep(index)}
                    className="text-red-400 hover:text-red-300 p-2 transition cursor-pointer"
                    title={lang === 'fi' ? 'Poista vaihe' : 'Remove step'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {currentTool && currentTool.inputs && currentTool.inputs.length > 0 && (
                  <div className="pl-6 border-l-2 border-slate-800 space-y-2 pt-2">
                    {currentTool.inputs.map((input) => (
                      <div key={input.key} className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {typeof input.label === 'object' ? (input.label[lang] || input.label.fi || input.label.en) : input.label}
                        </label>
                        
                        {input.type === 'select' ? (
                          <select
                            value={step.inputs[input.key] ?? ''}
                            onChange={(e) => updateStepInput(index, input.key, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            {input.options?.map((opt: any) => {
                              const isObj = typeof opt === 'object' && opt !== null;
                              const optValue = isObj ? opt.value : opt;
                              const optLabel = isObj ? (opt.label[lang] || opt.label.fi || opt.label.en) : opt;
                              return (
                                <option key={optValue} value={optValue}>
                                  {optLabel}
                                </option>
                              );
                            })}
                          </select>
                        ) : input.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={step.inputs[input.key] ?? ''}
                            onChange={(e) => updateStepInput(index, input.key, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={step.inputs[input.key] ?? ''}
                            onChange={(e) => updateStepInput(index, input.key, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
        <button
          onClick={runWorkflow}
          disabled={workflowSteps.length === 0 || isRunning}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium py-2.5 rounded-lg transition cursor-pointer"
        >
          <Play className="w-4 h-4" /> {isRunning ? (lang === 'fi' ? 'Ajetaan...' : 'Running...') : (t?.runWorkflow || 'Run Workflow 🚀')}
        </button>

        {results.length > 0 && (
          <div className="space-y-2 mt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === 'fi' ? 'Viimeisin suoritus:' : 'Latest Execution:'}
            </h3>
            {results.map((res, idx) => (
              <div key={idx} className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <div className={`p-2.5 flex items-center justify-between text-xs font-semibold ${
                  res.success ? 'text-emerald-400 bg-emerald-950/20 border-b border-slate-800' : 'text-rose-400 bg-rose-950/20 border-b border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {res.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>Vaihe #{idx + 1}: {res.toolName}</span>
                  </div>
                  <span>{res.success ? (lang === 'fi' ? 'Onnistui' : 'Success') : (lang === 'fi' ? 'Virhe' : 'Failed')}</span>
                </div>
                <div className="p-3 max-h-40 overflow-auto">
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {res.error ? res.error : JSON.stringify(res.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> {lang === 'fi' ? 'Ajo historia' : 'Execution History'} ({history.length})
              </h3>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {lang === 'fi' ? 'Tyhjennä historia' : 'Clear history'}
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map((item) => (
                <div key={item.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono text-slate-400">{item.timestamp}</span>
                    <span>•</span>
                    <span>{item.stepsCount} {lang === 'fi' ? 'vaihetta' : 'steps'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.results.every(r => r.success) ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {lang === 'fi' ? 'Kaikki OK' : 'All OK'}</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {lang === 'fi' ? 'Virheitä' : 'Errors'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowBuilder;