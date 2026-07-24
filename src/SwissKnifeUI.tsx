import { WorkflowManager } from "./tools/WorkflowStorage";
import React, { useState, useEffect } from 'react';
import { Search, Play, CheckCircle, AlertCircle, Wrench, Globe, Code, Star, History, Trash2, Home, Upload, ChevronDown, ChevronRight, Layers, Plus, Download } from 'lucide-react';
import { ALL_TOOLS, SwissTool, Language, getText} from './tools';
import { WorkflowBuilder } from './WorkflowBuilder';

export interface HistoryItem {
  id: string;
  toolId: string;
  toolName: string;
  timestamp: string;
  inputs: Record<string, any>;
  result: any;
  isWorkflow?: boolean;
  workflowSteps?: any[];
}

const handleExportWorkflow = (workflowName: string, steps: any[]) => {
  const recipe = {
    name: workflowName || 'Työnkulku',
    steps: steps
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recipe, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `${workflowName.toLowerCase().replace(/\s+/g, '-')}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

const executeSwissTool = async (
  tool: SwissTool,
  inputs: Record<string, any>,
  lang: Language = 'fi'
) => {
  if (tool.type === 'local' && tool.execute) {
    return await tool.execute(inputs, lang);
  }

  if (tool.type === 'rest-api' && tool.endpoint) {
    try {
      const queryParams = new URLSearchParams(inputs).toString();
      const response = await fetch(`${tool.endpoint}?${queryParams}`);
      const data = await response.json();
      return { success: response.ok, data };
    } catch (err: any) {
      return {
        success: false,
        error: lang === 'fi' ? 'REST API virhe: ' + err.message : 'REST API error: ' + err.message
      };
    }
  }

  return { 
    success: false, 
    error: lang === 'fi' ? 'Työkalun suoritustapaa ei löydetty.' : 'Tool execution method not found.' 
  };
};

const UI_TRANSLATIONS = {
  fi: {
    title: 'SwissKnife Alusta',
    searchPlaceholder: 'Etsi työkalua...',
    tabHome: 'Koti',
    tabTools: 'Työkalut',
    tabWorkflows: 'Työnkulut',
    tabHistory: 'Historia',
    tabMarketplace: 'Marketplace',
    runTool: 'Suorita Työkalu',
    running: 'Ajetaan...',
    clearHistory: 'Tyhjennä historia',
    success: 'Suoritus onnistui',
    error: 'Virhe suorituksessa',
    noHistory: 'Ei suoritushistoriaa.',
    openTools: 'Avaa työkalut 🚀',
    chooseFile: 'Valitse tiedosto...'
  },
  en: {
    title: 'SwissKnife Platform',
    searchPlaceholder: 'Search tools...',
    tabHome: 'Home',
    tabTools: 'Tools',
    tabWorkflows: 'Workflows',
    tabHistory: 'History',
    tabMarketplace: 'Marketplace',
    runTool: 'Run Tool',
    running: 'Running...',
    clearHistory: 'Clear history',
    success: 'Execution succeeded',
    error: 'Execution failed',
    noHistory: 'No execution history.',
    openTools: 'Open Tools 🚀',
    chooseFile: 'Choose file...'
  }
};

export function SwissKnifeUI() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('sk_lang');
    return (saved as Language) || 'fi';
  });

  const [tools, setTools] = useState<SwissTool[]>(() => {
    const baseTools = ALL_TOOLS;
    const savedPlugins = localStorage.getItem('sk_installed_plugins');
    if (savedPlugins) {
      try {
        const parsed = JSON.parse(savedPlugins);
        return [...baseTools, ...parsed];
      } catch (e) {
        return baseTools;
      }
    }
    return baseTools;
  });

  const [selectedTool, setSelectedTool] = useState<SwissTool>(tools[0] || ALL_TOOLS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  
  const [toolInputs, setToolInputs] = useState<Record<string, Record<string, any>>>({});
  const [toolResults, setToolResults] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'tools' | 'workflows' | 'history' | 'marketplace'>('home');

  const [availablePlugins, setAvailablePlugins] = useState<any[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<any[]>(() => {
    const saved = localStorage.getItem('sk_installed_plugins');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/oldfarts/swissknife-plugins/main/registry.json')
      .then(res => res.json())
      .then(data => setAvailablePlugins(data))
      .catch(() => {
        setAvailablePlugins([
          {
            id: 'aws-s3-checker',
            version: '1.0.0',
            author: 'Jani Ärväs',
            name: { fi: 'AWS S3 Tarkistin', en: 'AWS S3 Checker' },
            description: { fi: 'Tarkistaa AWS S3 bucketin tilan.', en: 'Checks AWS S3 bucket status.' },
            category: { fi: 'Pilvipalvelut', en: 'Cloud Services' },
            type: 'rest-api',
            endpoint: 'https://httpbin.org/get',
            inputs: [
              { key: 'bucketName', type: 'text', label: { fi: 'Bucket nimi', en: 'Bucket Name' }, placeholder: 'my-bucket' }
            ]
          }
        ]);
      });
  }, []);

  const handleInstallPlugin = (plugin: any) => {
    const updated = [...installedPlugins, plugin];
    setInstalledPlugins(updated);
    localStorage.setItem('sk_installed_plugins', JSON.stringify(updated));
    setTools([...ALL_TOOLS, ...updated]);
  };

  const handleUninstallPlugin = (pluginId: string) => {
    const updated = installedPlugins.filter(p => p.id !== pluginId);
    setInstalledPlugins(updated);
    localStorage.setItem('sk_installed_plugins', JSON.stringify(updated));
    setTools([...ALL_TOOLS, ...updated]);
    
    if (selectedTool.id === pluginId) {
      setSelectedTool(ALL_TOOLS[0]);
    }
  };

  const [workflowsList, setWorkflowsList] = useState<Array<{ id: string; name: string; steps: any[] }>>(() => {
    const saved = localStorage.getItem('sk_saved_workflows');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedWorkflowSteps, setSelectedWorkflowSteps] = useState<any[] | null>([]);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const recipe = WorkflowManager.parseAndValidateRecipe(content);
          WorkflowManager.saveWorkflowLocally(recipe);
          alert(`Resepti "${recipe.name}" tuotu ja tallennettu!`);
          setWorkflowsList(prev => [...prev.filter(w => w.name !== recipe.name), { id: Date.now().toString(), name: recipe.name, steps: recipe.steps || [] }]);
        } catch (error: any) {
          alert(`Tuonti epäonnistui: ${error.message}`);
        }
      };
    }
  };

  const t = UI_TRANSLATIONS[lang];

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('sk_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('sk_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sk_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('sk_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('sk_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('sk_saved_workflows', JSON.stringify(workflowsList));
  }, [workflowsList]);

  useEffect(() => {
    setToolInputs((prev) => {
      const existing = prev[selectedTool.id];
      if (existing) return prev;

      const initialValues: Record<string, any> = {};
      selectedTool.inputs.forEach((input) => {
        if (input.default !== undefined) {
          initialValues[input.key] = input.default;
        } else if (input.options && input.options.length > 0) {
          const firstOpt = input.options[0];
          initialValues[input.key] = typeof firstOpt === 'object' && firstOpt !== null ? (firstOpt as any).value : firstOpt;
        } else {
          initialValues[input.key] = '';
        }
      });

      return {
        ...prev,
        [selectedTool.id]: initialValues
      };
    });
  }, [selectedTool]);

  const currentInputs = toolInputs[selectedTool.id] || {};
  const currentResult = toolResults[selectedTool.id] || null;

  const toggleFavorite = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const handleInputChange = (key: string, value: any) => {
    setToolInputs((prev) => ({
      ...prev,
      [selectedTool.id]: {
        ...(prev[selectedTool.id] || {}),
        [key]: value
      }
    }));
  };

  const handleRunTool = async () => {
    setLoading(true);
    try {
      const res = await executeSwissTool(selectedTool, currentInputs, lang);
      
      const formattedRes = typeof res === 'object' && res !== null && 'success' in res 
        ? res 
        : { success: true, data: res };

      setToolResults((prev) => ({
        ...prev,
        [selectedTool.id]: formattedRes
      }));

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        toolId: selectedTool.id,
        toolName: getText(selectedTool.name, lang),
        timestamp: new Date().toLocaleTimeString(),
        inputs: { ...currentInputs },
        result: formattedRes,
        isWorkflow: false
      };
      
      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);
    } catch (err: any) {
      const errorRes = { success: false, error: err.message };
      setToolResults((prev) => ({
        ...prev,
        [selectedTool.id]: errorRes
      }));

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        toolId: selectedTool.id,
        toolName: getText(selectedTool.name, lang),
        timestamp: new Date().toLocaleTimeString(),
        inputs: { ...currentInputs },
        result: errorRes,
        isWorkflow: false
      };
      
      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkflowHistory = (steps: any[], result: any) => {
    const newHistoryItem: HistoryItem = {
      id: Date.now().toString(),
      toolId: 'workflow-run',
      toolName: lang === 'fi' ? 'Ketjutettu Työnkulku' : 'Chained Workflow',
      timestamp: new Date().toLocaleTimeString(),
      inputs: { stepsCount: steps.length, stepsSummary: steps.map(s => s.toolName) },
      result: result,
      isWorkflow: true,
      workflowSteps: steps
    };
    setHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    if (item.isWorkflow) {
      setSelectedWorkflowSteps(item.workflowSteps || []);
      setActiveTab('workflows');
    } else {
      const targetTool = tools.find((t) => t.id === item.toolId || getText(t.name, lang) === item.toolName);
      
      if (targetTool) {
        setToolInputs((prev) => ({
          ...prev,
          [targetTool.id]: item.inputs
        }));

        setToolResults((prev) => ({
          ...prev,
          [targetTool.id]: item.result
        }));

        setSelectedTool(targetTool);
        setActiveTab('tools');
      }
    }
  };

  const removeWorkflowItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkflowsList((prev) => {
      const updated = prev.filter((wf) => wf.id !== id);
      localStorage.setItem('sk_saved_workflows', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredTools = tools.filter((tool) => {
    const name = getText(tool.name, lang).toLowerCase();
    const cat = getText(tool.category, lang).toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || cat.includes(q);
  });

  const groupedTools = filteredTools.reduce((acc, tool) => {
    const categoryName = getText(tool.category, lang) || (lang === 'fi' ? 'Muut' : 'Other');
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(tool);
    return acc;
  }, {} as Record<string, SwissTool[]>);

  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catName]: prev[catName] === undefined ? false : !prev[catName]
    }));
  };

  const workflowTools = tools.map(t => ({
    id: t.id,
    name: getText(t.name, lang),
    description: getText(t.description, lang),
    inputs: t.inputs,
    type: t.type,
    endpoint: t.endpoint,
    execute: t.execute
  }));

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-hidden">
      
      {/* SIVUPALKKI */}
      <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 text-cyan-400 font-bold text-lg hover:opacity-80 transition cursor-pointer text-left"
            >
              <Wrench className="w-5 h-5 shrink-0" />
              <span>{t.title}</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setLang('fi')}
                className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                  lang === 'fi' ? 'bg-cyan-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                FI
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                  lang === 'en' ? 'bg-cyan-600 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 mb-3 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('home')}
              title={t.tabHome}
              className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
                activeTab === 'home' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              title={t.tabTools}
              className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
                activeTab === 'tools' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              title={t.tabWorkflows}
              className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
                activeTab === 'workflows' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              title={t.tabMarketplace}
              className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
                activeTab === 'marketplace' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('history')}
              title={t.tabHistory}
              className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center gap-0.5 ${
                activeTab === 'history' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" /> 
              <span className="text-[10px]">{history.length}</span>
            </button>
          </div>

          {activeTab === 'tools' && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-500"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> {lang === 'fi' ? 'Työnkulut' : 'Workflows'}
              </span>
              <div className="flex items-center gap-1">
                <label className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2 py-1 rounded transition cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" /> {lang === 'fi' ? 'Tuo' : 'Import'}
                  <input type="file" accept=".json" className="hidden" onChange={handleFileImport} />
                </label>
                
                <button
                  onClick={() => {
                    const activeWf = workflowsList[0];
                    handleExportWorkflow(activeWf ? activeWf.name : 'Työnkulku', selectedWorkflowSteps || activeWf?.steps || []);
                  }}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                >
                  📤 {lang === 'fi' ? 'Vie' : 'Export'}
                </button>

                <button
                  onClick={() => {
                    setSelectedWorkflowSteps([]);
                    setActiveTab('workflows');
                  }}
                  className="text-[10px] bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-2 py-1 rounded transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3 h-3 stroke-[3]" /> {lang === 'fi' ? 'Uusi' : 'New'}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              {workflowsList.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => {
                    setSelectedWorkflowSteps(wf.steps);
                    setActiveTab('workflows');
                  }}
                  className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between cursor-pointer group text-xs relative pr-7 ${
                    activeTab === 'workflows' 
                      ? 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-200' 
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="truncate font-medium flex items-center gap-1.5">
                    <span className="truncate">{wf.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {wf.steps.length}
                    </span>
                    <button
                      onClick={(e) => removeWorkflowItem(wf.id, e)}
                      className="absolute right-1.5 top-1.5 p-1 text-slate-500 hover:text-rose-400 transition rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-800 my-2" />

          {activeTab === 'tools' ? (
            Object.keys(groupedTools).length > 0 ? (
              Object.entries(groupedTools).map(([categoryName, categoryTools]) => {
                const isOpen = searchQuery ? true : (openCategories[categoryName] ?? false);

                return (
                  <div key={categoryName} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(categoryName)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                        {categoryName} ({categoryTools.length})
                      </span>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </button>

                    {isOpen && (
                      <div className="pl-2 space-y-1 border-l border-slate-800 ml-2">
                        {categoryTools.map((tool) => {
                          const isSelected = tool.id === selectedTool.id;
                          const isFav = favorites.includes(tool.id);
                          return (
                            <div
                              key={tool.id}
                              onClick={() => setSelectedTool(tool)}
                              className={`w-full text-left p-2.5 rounded-lg transition flex items-center justify-between cursor-pointer group ${
                                isSelected
                                  ? 'bg-cyan-950/50 border border-cyan-800/50 text-cyan-200'
                                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                {tool.type === 'rest-api' ? (
                                  <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                                ) : (
                                  <Code className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                                <span className="text-sm font-medium truncate">
                                  {getText(tool.name, lang)}
                                </span>
                              </div>

                              <button
                                onClick={(e) => toggleFavorite(tool.id, e)}
                                className="p-1 text-slate-600 hover:text-amber-400 transition shrink-0 cursor-pointer"
                              >
                                <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-500 text-center py-4">Ei löytynyt työkaluja.</div>
            )
          ) : activeTab === 'workflows' ? (
            <div className="p-2 text-xs text-slate-400">
              <p className="font-semibold text-cyan-400 mb-1">{lang === 'fi' ? 'Työnkulun hallinta' : 'Workflow management'}</p>
            </div>
          ) : activeTab === 'marketplace' ? (
            <div className="p-2 text-xs text-slate-400">
              <p className="font-semibold text-cyan-400 mb-1">Marketplace</p>
              <p className="text-[11px] text-slate-500">{lang === 'fi' ? 'Asenna yhteisön plugineja pääruudulta.' : 'Install community plugins from the main view.'}</p>
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-2 p-1">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {lang === 'fi' ? 'Historia' : 'History'} ({history.length})
                </span>
              </div>
              {history.length > 0 ? (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistoryItem(item)}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800 transition cursor-pointer space-y-1 group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 truncate pr-6">{item.toolName}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">{t.noHistory}</div>
              )}
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400 space-y-3 text-center">
              <button 
                onClick={() => setActiveTab('tools')}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2 rounded-lg transition cursor-pointer"
              >
                {t.openTools}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PÄÄALUE */}
      <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto">
        {activeTab === 'home' ? (
          
          <div className="max-w-4xl mx-auto p-8 space-y-8 my-auto">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
              <div className="inline-flex p-3 bg-cyan-950/50 border border-cyan-800/50 rounded-2xl text-cyan-400 mb-4">
                <Wrench className="w-10 h-10" />
              </div>
              <h1 className="text-4xl font-extrabold text-slate-100 mb-4">SwissKnife DevTools</h1>
              <p className="text-slate-400 text-base max-w-2xl mx-auto mb-6">
                {lang === 'fi' ? 'Modulaarinen kehittäjän alusta työkaluille ja plugineille.' : 'A modular developer platform for tools and plugins.'}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setActiveTab('tools')}
                  className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-6 py-3 rounded-xl transition cursor-pointer"
                >
                  {t.openTools}
                </button>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold px-6 py-3 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Plugin Marketplace
                </button>
              </div>
            </div>
          </div>

        ) : activeTab === 'marketplace' ? (

          <div className="p-8 max-w-4xl mx-auto space-y-6 w-full">
            <div className="border-b border-slate-800 pb-4">
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <Download className="w-6 h-6 text-cyan-400" />
                Plugin Marketplace
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {lang === 'fi' 
                  ? 'Asenna yhteisön luomia JSON-pohjaisia lisäosia (AWS, Elastic, Nmap jne.) yhdellä klikkauksella.' 
                  : 'Install community-created JSON plugins with a single click.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availablePlugins.map((plugin) => {
                const isInstalled = installedPlugins.some(p => p.id === plugin.id);

                return (
                  <div key={plugin.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-200 text-base">
                          {plugin.name[lang] || plugin.name.en}
                        </h3>
                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                          v{plugin.version}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {plugin.description[lang] || plugin.description.en}
                      </p>
                      <span className="text-[11px] text-cyan-400 font-mono block pt-1">
                        By {plugin.author}
                      </span>
                    </div>

                    <div>
                      {isInstalled ? (
                        <button
                          onClick={() => handleUninstallPlugin(plugin.id)}
                          className="w-full flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 text-rose-300 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {lang === 'fi' ? 'Poista asennus' : 'Uninstall'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInstallPlugin(plugin)}
                          className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-md"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {lang === 'fi' ? 'Asenna plugini' : 'Install Plugin'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        ) : activeTab === 'workflows' ? (
          
          <div className="p-6 h-full flex flex-col">
            <WorkflowBuilder 
              tools={workflowTools} 
              lang={lang} 
              initialWorkflowSteps={selectedWorkflowSteps}
              onSaveHistory={handleSaveWorkflowHistory}
              t={{
                workflowTitle: lang === 'fi' ? 'Automatisoidut Työnkulut' : 'Automated Workflows',
                addStep: lang === 'fi' ? 'Lisää vaihe' : 'Add Step',
                runWorkflow: lang === 'fi' ? 'Suorita Työnkulku 🚀' : 'Run Workflow 🚀'
              }} 
            />
          </div>

        ) : activeTab === 'history' ? (

          <div className="p-8 max-w-4xl mx-auto space-y-6 w-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <History className="w-6 h-6 text-cyan-400" />
                {lang === 'fi' ? 'Suoritushistoria' : 'Execution History'}
              </h1>
            </div>
          </div>

        ) : activeTab === 'tools' ? (

          <>
            <div className="p-6 border-b border-slate-800 bg-slate-950/30">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-2 uppercase tracking-wider">
                <span>{getText(selectedTool.category, lang)}</span>
                <span>•</span>
                <span className={selectedTool.type === 'rest-api' ? 'text-purple-400' : 'text-emerald-400'}>
                  {selectedTool.type.toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-1">{getText(selectedTool.name, lang)}</h1>
              <p className="text-slate-400 text-sm">{getText(selectedTool.description, lang)}</p>
            </div>

            <div className="p-6 space-y-4 max-w-3xl">
              {selectedTool.inputs.map((input) => (
                <div key={input.key} className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {getText(input.label, lang)}
                  </label>

                  {input.type === 'text' && (
                    <input
                      type="text"
                      placeholder={input.placeholder ? getText(input.placeholder, lang) : ''}
                      value={currentInputs[input.key] ?? ''}
                      onChange={(e) => handleInputChange(input.key, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono text-slate-200"
                    />
                  )}

                  {input.type === 'textarea' && (
                    <textarea
                      placeholder={input.placeholder ? getText(input.placeholder, lang) : ''}
                      value={currentInputs[input.key] ?? ''}
                      onChange={(e) => handleInputChange(input.key, e.target.value)}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono text-slate-200"
                    />
                  )}

                  {input.type === 'number' && (
                    <input
                      type="number"
                      value={currentInputs[input.key] ?? ''}
                      onChange={(e) => handleInputChange(input.key, e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono text-slate-200"
                    />
                  )}

                  {input.type === 'select' && input.options && (
                    <select
                      value={currentInputs[input.key] ?? ''}
                      onChange={(e) => handleInputChange(input.key, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono text-slate-200"
                    >
                      {input.options.map((opt: any, idx: number) => {
                        const val = typeof opt === 'object' ? opt.value : opt;
                        const label = typeof opt === 'object' ? getText(opt.label, lang) : opt;
                        return (
                          <option key={idx} value={val}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  )}

                  {input.type === 'color' && (
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={currentInputs[input.key] || '#000000'}
                        onChange={(e) => handleInputChange(input.key, e.target.value)}
                        className="w-10 h-10 bg-slate-950 border border-slate-800 rounded cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={currentInputs[input.key] ?? ''}
                        onChange={(e) => handleInputChange(input.key, e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono text-slate-200"
                      />
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={handleRunTool}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-5 py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{loading ? t.running : t.runTool}</span>
              </button>

              {currentResult && (
                <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-xl">
                  <div className={`p-3 border-b border-slate-800 flex items-center justify-between text-sm font-semibold ${
                    currentResult.success ? 'text-emerald-400 bg-emerald-950/20' : 'text-rose-400 bg-rose-950/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      {currentResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{currentResult.success ? t.success : t.error}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 max-h-[500px] overflow-auto">
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre leading-relaxed select-text">
                      {JSON.stringify(currentResult.data || currentResult.error, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default SwissKnifeUI;