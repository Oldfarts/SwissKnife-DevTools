import React, { useState, useEffect } from 'react';
import { Search, Play, CheckCircle, AlertCircle, Wrench, Globe, Code, Star, History, Trash2, Home, FileText, Upload, Palette, ChevronDown, ChevronRight, Layers, Plus, ShoppingBag } from 'lucide-react';
import { Language, getText } from './tools';
import { WorkflowBuilder } from './WorkflowBuilder';
import { WorkflowManager } from "./tools/workflowStorage";
import { ALL_TOOLS, AVAILABLE_PLUGINS, executeSwissTool } from '../src/tools/index';

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

interface SwissKnifeUIProps {
  initialLang?: Language;
  onSaveData?: (key: string, data: any) => void;
  loadData?: (key: string) => any;
}

const BUILT_IN_TOOLS = [{}];

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

const UI_TRANSLATIONS = {
  fi: {
    title: 'SwissKnife Alusta',
    searchPlaceholder: 'Etsi työkalua...',
    tabHome: 'Koti',
    tabTools: 'Työkalut',
    tabWorkflows: 'Työnkulut',
    tabHistory: 'Historia',
    tabPlugins: 'Pluginit',
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
    tabPlugins: 'Plugins',
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

export function SwissKnifeUI({ initialLang = 'fi', onSaveData, loadData }: SwissKnifeUIProps) {
  const [lang, setLang] = useState<Language>(() => {
    if (loadData) {
      const savedLang = loadData('sk_lang');
      if (savedLang) return savedLang;
    }
    const saved = localStorage.getItem('sk_lang');
    return (saved as Language) || initialLang;
  });

  const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.fi;

  const [installedPluginIds, setInstalledPluginIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sk_installed_plugins');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sk_installed_plugins', JSON.stringify(installedPluginIds));
  }, [installedPluginIds]);

  const activeExternalPlugins = AVAILABLE_PLUGINS.filter(p => installedPluginIds.includes(p.id));
  const tools = [...BUILT_IN_TOOLS, ...ALL_TOOLS, ...activeExternalPlugins];

  const [selectedTool, setSelectedTool] = useState<any>(tools[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Kehittäjän työkalut': true,
    'Developer Tools': true,
    'Pilvipalvelut': true,
    'Cloud Services': true
  });
  
  const [toolInputs, setToolInputs] = useState<Record<string, Record<string, any>>>({});
  const [toolResults, setToolResults] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'tools' | 'workflows' | 'history' | 'plugins'>('home');

  const [workflowsList, setWorkflowsList] = useState<Array<{ id: string; name: string; steps: any[] }>>(() => {
    if (loadData) {
      const savedWf = loadData('sk_saved_workflows');
      if (savedWf) return savedWf;
    }
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
          if (!content) throw new Error("Tiedosto on tyhjä");
          
          const recipe = WorkflowManager.parseAndValidateRecipe(content);
          WorkflowManager.saveWorkflowLocally(recipe);
          alert(`Resepti "${recipe.name}" tuotu ja tallennettu!`);
          setWorkflowsList(prev => [...prev.filter(w => w.name !== recipe.name), { id: Date.now().toString(), name: recipe.name, steps: recipe.steps || [] }]);
        } catch (error: any) {
          console.error("Virhe työnkulun tuonnissa:", error);
          alert(`Tuonti epäonnistui: ${error.message || 'Tuntematon virhe'}`);
        }
      };
    }
  };

  const [favorites, setFavorites] = useState<string[]>(() => {
    if (loadData) {
      const savedFav = loadData('sk_favorites');
      if (savedFav) return savedFav;
    }
    const saved = localStorage.getItem('sk_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (loadData) {
      const savedHist = loadData('sk_history');
      if (savedHist) return savedHist;
    }
    const saved = localStorage.getItem('sk_history');
    return saved ? JSON.parse(saved) : [];
  });

  const saveDataToStorage = (key: string, data: any) => {
    if (onSaveData) {
      onSaveData(key, data);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn(`LocalStorage quota exceeded for key "${key}". Clearing storage space...`);
        try {
          localStorage.removeItem('sk_history');
          localStorage.setItem(key, JSON.stringify(data));
        } catch (innerErr) {
          console.error('LocalStorage is completely full. Cannot save data:', innerErr);
        }
      }
    }
  };
  
  useEffect(() => {
    saveDataToStorage('sk_lang', lang);
  }, [lang]);

  useEffect(() => {
    saveDataToStorage('sk_favorites', favorites);
  }, [favorites]);

  useEffect(() => {
    saveDataToStorage('sk_history', history);
  }, [history]);

  useEffect(() => {
    saveDataToStorage('sk_saved_workflows', workflowsList);
  }, [workflowsList]);

  useEffect(() => {
    if (!selectedTool && tools.length > 0) {
      setSelectedTool(tools[0]);
      return;
    }
    if (selectedTool) {
      setToolInputs((prev) => {
        const existing = prev[selectedTool.id];
        if (existing) return prev;

        const initialValues: Record<string, any> = {};
        selectedTool.inputs?.forEach((input: any) => {
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
    }
  }, [selectedTool, tools]);

  const currentInputs = selectedTool ? (toolInputs[selectedTool.id] || {}) : {};
  const currentResult = selectedTool ? (toolResults[selectedTool.id] || null) : null;

  const toggleFavorite = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const handleInputChange = (key: string, value: any) => {
    if (!selectedTool) return;
    setToolInputs((prev) => ({
      ...prev,
      [selectedTool.id]: {
        ...(prev[selectedTool.id] || {}),
        [key]: value
      }
    }));
  };

  const handleRunTool = async () => {
    if (!selectedTool) return;
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
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
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
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
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

  const toggleInstallPlugin = (pluginId: string) => {
    const updated = installedPluginIds.includes(pluginId)
      ? installedPluginIds.filter(id => id !== pluginId)
      : [...installedPluginIds, pluginId];

    setInstalledPluginIds(updated);
  };

  const handleSaveWorkflowHistory = (steps: any[], result: any) => {
    const newHistoryItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
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

  const removeHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const removeWorkflowItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkflowsList((prev) => prev.filter((wf) => wf.id !== id));
  };

  const filteredTools = tools.filter((tool) => {
    const name = getText(tool.name, lang).toLowerCase();
    const cat = getText(tool.category, lang).toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || cat.includes(q);
  });

  const groupedTools = filteredTools.reduce((acc, tool, index) => {
    const categoryName = getText(tool.category, lang) || (lang === 'fi' ? 'Muut' : 'Other');
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push({ ...tool, uniqueKey: `${tool.id || 'tool'}-${index}` });
    return acc;
  }, {} as Record<string, any[]>);

  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catName]: prev[catName] === undefined ? true : !prev[catName]
    }));
  };

  const workflowTools = tools.map((t, idx) => ({
    id: t.id || `workflow-tool-${idx}`,
    name: getText(t.name, lang),
    description: getText(t.description, lang),
    inputs: t.inputs,
    type: t.type,
    endpoint: t.endpoint,
    execute: t.execute
  }));

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-hidden m-0 p-0 box-border">
      
      {/* SIVUPALKKI */}
      <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 h-full">
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
              onClick={() => setActiveTab('plugins')}
              title={t.tabPlugins}
              className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center relative ${
                activeTab === 'plugins' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {AVAILABLE_PLUGINS.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-bold px-1 rounded-full">
                  {AVAILABLE_PLUGINS.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              title={t.tabHistory}
              className={`py-1.5 rounded-md transition cursor-pointer flex items-center justify-center gap-0.5 ${
                activeTab === 'history' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" /> 
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
              {workflowsList.map((wf, idx) => (
                <div
                  key={wf.id || `workflow-${idx}`}
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
                      title={lang === 'fi' ? 'Poista työnkulku' : 'Remove workflow'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {workflowsList.length === 0 && (
                <div className="text-[11px] text-slate-500 text-center py-2">
                  {lang === 'fi' ? 'Ei tallennettuja työnkulkuja.' : 'No saved workflows.'}
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-800 my-2" />

          {activeTab === 'tools' ? (
            Object.keys(groupedTools).length > 0 ? (
              Object.entries(groupedTools).map(([categoryName, categoryTools]) => {
                const isOpen = searchQuery ? true : (openCategories[categoryName] ?? true);

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
                          const isSelected = selectedTool && tool.id === selectedTool.id;
                          const isFav = favorites.includes(tool.id);
                          return (
                            <div
                              key={tool.uniqueKey}
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
              <p className="text-[11px] text-slate-500">{lang === 'fi' ? 'Muokkaa vaiheita oikealla olevassa näkymässä.' : 'Edit steps in the main view.'}</p>
            </div>
          ) : activeTab === 'plugins' ? (
            <div className="p-2 text-xs text-slate-400">
              <p className="font-semibold text-cyan-400 mb-1">{lang === 'fi' ? 'Plugin Kauppa' : 'Plugin Store'}</p>
              <p className="text-[11px] text-slate-500">{lang === 'fi' ? 'Asenna uusia lisäosia käyttöön.' : 'Install new extensions.'}</p>
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-2 p-1">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {lang === 'fi' ? 'Historia' : 'History'} ({history.length})
                </span>
                {history.length > 0 && (
                  <button
                    onClick={() => setHistory([])}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> {lang === 'fi' ? 'Tyhjennä kaikki' : 'Clear all'}
                  </button>
                )}
              </div>

              {history.length > 0 ? (
                history.map((item, idx) => (
                  <div
                    key={item.id || `history-${idx}`}
                    onClick={() => handleSelectHistoryItem(item)}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-800/50 transition cursor-pointer space-y-1 group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate flex items-center gap-1.5 pr-6">
                        {item.isWorkflow ? <Layers className="w-3 h-3 text-cyan-400 shrink-0" /> : <Wrench className="w-3 h-3 text-emerald-400 shrink-0" />}
                        {item.toolName}
                      </span>
                      <button
                        onClick={(e) => removeHistoryItem(item.id, e)}
                        className="absolute right-2 top-2.5 p-1 text-slate-500 hover:text-rose-400 transition rounded"
                        title={lang === 'fi' ? 'Poista rivi' : 'Remove item'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="truncate max-w-[150px]">
                        {item.isWorkflow ? `${item.inputs.stepsCount} vaihetta` : JSON.stringify(item.inputs)}
                      </span>
                      <span>{item.timestamp}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">
                  {t.noHistory}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-xs text-slate-400 space-y-3 text-center">
              <p>{lang === 'fi' ? 'Olet aloitussivulla.' : 'You are on the home page.'}</p>
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
              <h1 className="text-4xl font-extrabold text-slate-100 mb-4">
                SwissKnife DevTools
              </h1>
              <p className="text-slate-400 text-base max-w-2xl mx-auto mb-6 leading-relaxed">
                {lang === 'fi' 
                  ? 'Monipuolinen sveitsiläinen linkkuveitsi kehittäjille ja ylläpitäjille. Analysoi värejä, QR-koodeja, JSON/XML-muotoiluja ja automatisoituja työnkulkuja.'
                  : 'A versatile Swiss Army knife for developers and sysadmins. Analyze colors, QR codes, format JSON/XML, and automated workflows.'}
              </p>
              <button
                onClick={() => setActiveTab('tools')}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-8 py-3 rounded-xl transition duration-200 shadow-lg hover:shadow-cyan-500/20 cursor-pointer text-base"
              >
                {t.openTools}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4 text-cyan-400">
                  <Code className="w-6 h-6" />
                  <h2 className="text-lg font-bold text-slate-100">
                    {lang === 'fi' ? 'Tekijätiedot' : 'Author Info'}
                  </h2>
                </div>
                <div className="text-slate-300 space-y-2 text-sm font-sans">
                  <p><strong>{lang === 'fi' ? 'Kehittäjä' : 'Developer'}:</strong> Jani Ärväs 2026 (with help of Gemini AI)</p>
                  <p><strong>GitHub:</strong> <a href="https://github.com/oldfarts" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">https://github.com/oldfarts</a></p>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4 text-emerald-400">
                  <FileText className="w-6 h-6" />
                  <h2 className="text-lg font-bold text-slate-100">
                    {lang === 'fi' ? 'Käyttöoikeudet & Lisenssi' : 'License & Rights'}
                  </h2>
                </div>
                <div className="text-slate-300 space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/50 text-xs font-semibold px-2.5 py-1 rounded">
                      GNU GPL v3.0
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {lang === 'fi' 
                      ? 'Lisensoitu GNU General Public License v3.0 -lisenssillä. Vapaa ohjelmisto.'
                      : 'Licensed under GNU General Public License v3.0. Open Source.'}
                  </p>
                </div>
              </div>
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

        ) : activeTab === 'plugins' ? (

          <div className="p-8 max-w-4xl mx-auto space-y-6 w-full">
            <div className="border-b border-slate-800 pb-4">
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-cyan-400" />
                {lang === 'fi' ? 'Plugin Kauppa & Hallinta' : 'Plugin Store & Management'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {lang === 'fi' ? 'Asenna tai poista lisäosia registry.json tiedostosta.' : 'Install or remove extensions from registry.json.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {AVAILABLE_PLUGINS.map((plugin, idx) => {
                const isInstalled = installedPluginIds.includes(plugin.id);
                return (
                  <div key={plugin.id || `plugin-${idx}`} className="p-5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-100 text-base">{getText(plugin.name, lang)}</h3>
                        <span className="text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">v{plugin.version}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{getText(plugin.description, lang)}</p>
                      <p className="text-slate-500 text-[11px]">{lang === 'fi' ? 'Tekijä' : 'Author'}: {plugin.author}</p>
                    </div>

                    <button
                      onClick={() => toggleInstallPlugin(plugin.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isInstalled 
                          ? 'bg-rose-950/40 text-rose-400 border border-rose-900/50 hover:bg-rose-900/40' 
                          : 'bg-cyan-600 text-slate-950 hover:bg-cyan-500'
                      }`}
                    >
                      {isInstalled 
                        ? (lang === 'fi' ? 'Poista asennus' : 'Uninstall') 
                        : (lang === 'fi' ? 'Asenna plugin 🚀' : 'Install Plugin 🚀')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        ) : activeTab === 'history' ? (

          <div className="p-8 max-w-4xl mx-auto space-y-6 w-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <History className="w-6 h-6 text-cyan-400" />
                  {lang === 'fi' ? 'Suoritushistoria' : 'Execution History'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {lang === 'fi' ? 'Valitse sivupalkin historiasta tai tarkastele laajemmin alta.' : 'Select from history in the sidebar or view details below.'}
                </p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 px-3 py-2 border border-rose-950 rounded-lg bg-rose-950/20 cursor-pointer transition"
                >
                  <Trash2 className="w-4 h-4" /> {t.clearHistory}
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={item.id || `history-card-${idx}`}
                    className="p-4 bg-slate-950 border border-slate-800 hover:border-cyan-800/50 rounded-xl space-y-3 transition group relative"
                  >
                    <div className="flex items-center justify-between pr-12">
                      <div className="flex items-center gap-3">
                        <span className="p-2 bg-cyan-950/50 border border-cyan-800/50 rounded-lg text-cyan-400">
                          {item.isWorkflow ? <Layers className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                        </span>
                        <div>
                          <h3 className="font-semibold text-slate-200 text-sm group-hover:text-cyan-300 transition">
                            {item.toolName}
                          </h3>
                          <span className="text-slate-500 font-mono text-xs">{item.timestamp}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectHistoryItem(item)}
                          className="px-4 py-2 bg-slate-900 hover:bg-cyan-600 hover:text-slate-950 text-slate-300 border border-slate-800 hover:border-cyan-600 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          {item.isWorkflow ? (lang === 'fi' ? 'Avaa työnkulku' : 'Open workflow') : (lang === 'fi' ? 'Avaa työkalu' : 'Open tool')}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={(e) => removeHistoryItem(item.id, e)}
                      className="absolute right-4 top-4 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 rounded-lg transition cursor-pointer"
                      title={lang === 'fi' ? 'Poista historiasta' : 'Remove from history'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-slate-400 max-h-32 overflow-y-auto">
                      <span className="text-slate-500 block mb-1">
                        {item.isWorkflow ? (lang === 'fi' ? 'Työnkulun vaiheet:' : 'Workflow steps:') : (lang === 'fi' ? 'Syötteet:' : 'Inputs:')}
                      </span>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(item.isWorkflow ? item.workflowSteps : item.inputs, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 space-y-3">
                <History className="w-12 h-12 mx-auto opacity-40 text-slate-400" />
                <p>{t.noHistory}</p>
              </div>
            )}
          </div>

        ) : activeTab === 'tools' && selectedTool ? (

          <>
            <div className="p-6 border-b border-slate-800 bg-slate-950/30">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-2 uppercase tracking-wider">
                <span>{getText(selectedTool.category, lang)}</span>
                <span>•</span>
                <span className={(selectedTool.type || '').toLowerCase() === 'rest-api' ? 'text-purple-400' : 'text-emerald-400'}>
                  {(selectedTool.type || 'unknown').toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-1">{getText(selectedTool.name, lang)}</h1>
              <p className="text-slate-400 text-sm">{getText(selectedTool.description, lang)}</p>
            </div>

            <div className="p-6 space-y-4 max-w-3xl">
              {selectedTool.inputs?.map((input: any, inputIdx: number) => (
                <div key={input.key || `input-${inputIdx}`} className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {getText(input.label, lang)}
                  </label>

                  {input.type === 'file' && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer transition">
                        <Upload className="w-4 h-4 text-cyan-400" />
                        <span>{t.chooseFile}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                handleInputChange(input.key, event.target?.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-xs text-slate-500 font-mono">
                        {currentInputs[input.key] ? '✓ Kuva valittu' : 'Ei tiedostoa'}
                      </span>
                    </div>
                  )}

                  {input.type === 'color' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={currentInputs[input.key] || '#3b82f6'}
                          onChange={(e) => handleInputChange(input.key, e.target.value)}
                          className="w-12 h-10 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer p-1"
                        />
                        <input
                          type="text"
                          value={currentInputs[input.key] || ''}
                          onChange={(e) => handleInputChange(input.key, e.target.value)}
                          placeholder="#3b82f6"
                          className="w-48 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                          <Palette className="w-3.5 h-3.5 text-cyan-400" /> Paletti:
                        </span>
                        {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff', '#000000', '#64748b'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => handleInputChange(input.key, hex)}
                            className="w-7 h-7 rounded-md border border-slate-700 shadow transition hover:scale-110 cursor-pointer"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {input.type === 'select' && (
                    <select
                      value={
                        currentInputs[input.key] ?? 
                        input.default ?? 
                        (input.options && input.options.length > 0 
                          ? (typeof input.options[0] === 'object' && input.options[0] !== null ? (input.options[0] as any).value : input.options[0]) 
                          : '')
                      }
                      onChange={(e) => handleInputChange(input.key, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono text-slate-200 cursor-pointer"
                    >
                      {input.options?.map((opt: any, optIdx: number) => {
                        const isObj = typeof opt === 'object' && opt !== null;
                        const optValue = isObj ? opt.value : opt;
                        const optLabel = isObj ? getText(opt.label, lang) : opt;

                        return (
                          <option key={`${optValue}-${optIdx}`} value={optValue}>
                            {optLabel}
                          </option>
                        );
                      })}
                    </select>
                  )}

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
                      rows={5}
                      placeholder={input.placeholder ? getText(input.placeholder, lang) : ''}
                      value={currentInputs[input.key] ?? ''}
                      onChange={(e) => handleInputChange(input.key, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono text-slate-200"
                    />
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
                    {currentResult.data?.status && (
                      <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                        Status: {currentResult.data.status} {currentResult.data.statusText}
                      </span>
                    )}
                  </div>
                  
                  <div className="p-4 max-h-[500px] overflow-auto">
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre leading-relaxed select-text">
                      {(() => {
                        if (currentResult.error) return currentResult.error;
                        
                        let rawData = currentResult.data;
                        
                        if (typeof rawData === 'string') {
                          try { rawData = JSON.parse(rawData); } catch (e) {}
                        }

                        let finalContent = rawData;
                        if (rawData && typeof rawData === 'object' && 'data' in rawData) {
                          finalContent = rawData.data;
                        }

                        if (typeof finalContent === 'string') {
                          return finalContent
                            .replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"');
                        }

                        return JSON.stringify(finalContent, null, 2);
                      })()}
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