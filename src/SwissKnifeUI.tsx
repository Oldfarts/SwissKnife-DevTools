import React, { useState, useEffect } from 'react';
import { Search, Play, CheckCircle, AlertCircle, Wrench, Globe, Code, Star, History, Trash2, Home, FileText, Upload, Palette } from 'lucide-react';
import { ALL_TOOLS, SwissTool, Language, getText } from './tools';

export interface HistoryItem {
  id: string;
  toolId: string;
  toolName: string;
  timestamp: string;
  inputs: Record<string, any>;
  result: any;
}

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
    tabHistory: 'Historia',
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
    tabHistory: 'History',
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

export default function SwissKnifeUI() {
  const [tools] = useState<SwissTool[]>(ALL_TOOLS);
  const [selectedTool, setSelectedTool] = useState<SwissTool>(ALL_TOOLS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [toolInputs, setToolInputs] = useState<Record<string, Record<string, any>>>({});
  const [toolResults, setToolResults] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'tools' | 'history'>('home');

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('sk_lang');
    return (saved as Language) || 'fi';
  });

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
    setToolInputs((prev) => {
      const existing = prev[selectedTool.id];
      if (existing) return prev;

      const initialValues: Record<string, any> = {};
      selectedTool.inputs.forEach((input) => {
        initialValues[input.key] = input.default !== undefined ? input.default : (input.options ? input.options[0] : '');
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
      
      setToolResults((prev) => ({
        ...prev,
        [selectedTool.id]: res
      }));

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        toolId: selectedTool.id,
        toolName: getText(selectedTool.name, lang),
        timestamp: new Date().toLocaleTimeString(),
        inputs: { ...currentInputs },
        result: res
      };
      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);
    } catch (err: any) {
      setToolResults((prev) => ({
        ...prev,
        [selectedTool.id]: { success: false, error: err.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
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
  };

  const filteredTools = tools
    .filter((tool) => {
      const name = getText(tool.name, lang).toLowerCase();
      const cat = getText(tool.category, lang).toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || cat.includes(q);
    })
    .sort((a, b) => {
      const aFav = favorites.includes(a.id) ? -1 : 1;
      const bFav = favorites.includes(b.id) ? -1 : 1;
      return aFav - bFav;
    });

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

          <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 mb-3 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex-1 py-1.5 rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'home' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" /> {t.tabHome}
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex-1 py-1.5 rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'tools' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> {t.tabTools}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'history' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" /> ({history.length})
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

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeTab === 'tools' ? (
            filteredTools.map((tool) => {
              const isSelected = tool.id === selectedTool.id;
              const isFav = favorites.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool)}
                  className={`w-full text-left p-3 rounded-lg transition flex items-start justify-between cursor-pointer group ${
                    isSelected
                      ? 'bg-cyan-950/50 border border-cyan-800/50 text-cyan-200'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {tool.type === 'rest-api' ? (
                      <Globe className="w-4 h-4 mt-1 text-purple-400 shrink-0" />
                    ) : (
                      <Code className="w-4 h-4 mt-1 text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-semibold leading-none mb-1">
                        {getText(tool.name, lang)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {getText(tool.category, lang)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(tool.id, e)}
                    className="p-1 text-slate-600 hover:text-amber-400 transition"
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </button>
              );
            })
          ) : activeTab === 'history' ? (
            <div className="space-y-2">
              {history.length > 0 ? (
                <>
                  <button
                    onClick={() => setHistory([])}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 py-1.5 border border-rose-950 rounded-md bg-rose-950/20 mb-2 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t.clearHistory}
                  </button>
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectHistoryItem(item)}
                      className="w-full text-left p-2.5 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-800/50 rounded-lg text-xs space-y-1 transition cursor-pointer group"
                    >
                      <div className="flex justify-between font-semibold text-cyan-300 group-hover:text-cyan-200">
                        <span>{item.toolName}</span>
                        <span className="text-slate-500 font-mono text-[10px]">{item.timestamp}</span>
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="text-xs text-slate-500 text-center py-4">{t.noHistory}</div>
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
                  ? 'Monipuolinen sveitsiläinen linkkuveitsi kehittäjille ja ylläpitäjille. Analysoi värejä, QR-koodeja, JSON/XML-muotoiluja ja paljon muuta.'
                  : 'A versatile Swiss Army knife for developers and sysadmins. Analyze colors, QR codes, format JSON/XML, and much more.'}
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

        ) : (

          /* TYÖKALUSIVU */
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

                  {/* TIEDOSTON LATAUS (FILE) */}
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

                  {/* VÄRIVALITSIN (COLOR) SEKÄ POINT & CLICK -PALETIT */}
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

                  {/* ALASVETOVALIKKO (SELECT) */}
                  {input.type === 'select' && (
                    <select
                      value={currentInputs[input.key] ?? input.default ?? (input.options ? input.options[0] : '')}
                      onChange={(e) => handleInputChange(input.key, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500 font-mono text-slate-200 cursor-pointer"
                    >
                      {input.options?.map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
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

              {/* TULOKSET */}
{/* TULOKSET */}
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
                  
                  {/* Pysty- ja vaakavierityspalkit salliva alue */}
                  <div className="p-4 max-h-[500px] overflow-auto">
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre leading-relaxed select-text">
                      {(() => {
                        if (currentResult.error) return currentResult.error;
                        
                        let rawData = currentResult.data;
                        
                        // Jos data on httpbin-tyylinen objekti tai merkkijono, jossa on "data"-kenttä
                        if (typeof rawData === 'string') {
                          try { rawData = JSON.parse(rawData); } catch (e) {}
                        }

                        // Jos kyseessä on httpbin-vastaus, kaivetaan sen sisällä oleva todellinen XML/sisältö esiin
                        let finalContent = rawData;
                        if (rawData && typeof rawData === 'object' && 'data' in rawData) {
                          finalContent = rawData.data;
                        }

                        // Jos sisältö on merkkijono (esim. XML), siivotaan JSON-escape-merkit pois näytöltä
                        if (typeof finalContent === 'string') {
                          // Poistetaan ylimääräiset \n ja \ tuodaksemme XML:n nätisti luettavaksi
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
        )}
      </div>
    </div>
  );
}