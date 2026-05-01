
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Building2, Telescope, Globe, AlignLeft, Cloud, CloudOff, Settings, XCircle, Check, ListOrdered, Sparkles, MousePointerClick, Bot, Database, FileText, Activity, History, Trash2, Clock, RotateCcw } from 'lucide-react';
import HelpPopup from './HelpPopup';
import { supabaseService } from '../services/supabaseService';
import { cacheService } from '../services/cacheService';
import Tooltip from './Tooltip';
import { SearchHistoryItem } from '../types';

export type SearchMode = 'names' | 'sector' | 'agent';

interface InputSectionProps {
  onSearch: (query: string, mode: SearchMode, region: string, filters?: string[], limit?: number) => void;
  onStop?: () => void;
  isLoading: boolean;
  onOpenSettings: () => void; 
}

const REGIONS = [
  "Global",
  "United States",
  "Europe",
  "United Kingdom",
  "Asia Pacific",
  "Australia",
  "Canada",
  "China",
  "Japan",
  "Switzerland",
  "Germany",
  "France",
  "India"
];

const ENTITY_TYPES = ["Corporate", "University", "Research Institute", "Government"];

const AGENT_SOURCES = [
  { id: 'google_search', label: 'Google Search', icon: <Search className="w-3 h-3" /> },
  { id: 'pubmed', label: 'PubMed / Lit', icon: <FileText className="w-3 h-3" /> },
  { id: 'clinical_trials', label: 'ClinicalTrials.gov', icon: <Activity className="w-3 h-3" /> },
  { id: 'internal_db', label: 'Internal Cloud DB', icon: <Database className="w-3 h-3" /> }
];

const InputSection: React.FC<InputSectionProps> = ({ onSearch, onStop, isLoading, onOpenSettings }) => {
  const [mode, setMode] = useState<SearchMode>(() => (localStorage.getItem('bioport_input_mode') as SearchMode) || 'names');
  const [inputText, setInputText] = useState(() => localStorage.getItem('bioport_input_text') || '');
  const [region, setRegion] = useState(() => localStorage.getItem('bioport_input_region') || 'Global');
  const [entityFilters, setEntityFilters] = useState<string[]>(() => {
    const saved = localStorage.getItem('bioport_input_filters');
    return saved ? JSON.parse(saved) : [];
  });
  const [agentSources, setAgentSources] = useState<string[]>(() => {
    const saved = localStorage.getItem('bioport_input_agent_sources');
    return saved ? JSON.parse(saved) : ['google_search', 'internal_db'];
  });
  const [limitStr, setLimitStr] = useState<string>(() => localStorage.getItem('bioport_input_limit') || "15");
  
  const [isCloudConfigured, setIsCloudConfigured] = useState(supabaseService.isConfigured());
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    localStorage.setItem('bioport_input_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('bioport_input_text', inputText);
  }, [inputText]);

  useEffect(() => {
    localStorage.setItem('bioport_input_region', region);
  }, [region]);

  useEffect(() => {
    localStorage.setItem('bioport_input_filters', JSON.stringify(entityFilters));
  }, [entityFilters]);

  useEffect(() => {
    localStorage.setItem('bioport_input_agent_sources', JSON.stringify(agentSources));
  }, [agentSources]);

  useEffect(() => {
    localStorage.setItem('bioport_input_limit', limitStr);
  }, [limitStr]);

  useEffect(() => {
    const check = () => setIsCloudConfigured(supabaseService.isConfigured());
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async () => {
    const items = await cacheService.getSearchHistory();
    setHistoryItems(items);
  };

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim().length > 0) {
      const parsedLimit = Math.min(500, Math.max(1, parseInt(limitStr) || 15));
      
      let searchFilters: string[] | undefined = undefined;
      if (mode === 'sector') searchFilters = entityFilters;
      if (mode === 'agent') searchFilters = agentSources;

      // Save to History
      const historyItem: SearchHistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        mode,
        query: inputText,
        region,
        filters: searchFilters,
        limit: mode === 'sector' ? parsedLimit : undefined
      };
      cacheService.saveSearchHistory(historyItem);

      onSearch(
        inputText, 
        mode, 
        region, 
        searchFilters,
        mode === 'sector' ? parsedLimit : undefined
      );
    }
  };

  const restoreHistory = (item: SearchHistoryItem) => {
    setMode(item.mode);
    setInputText(item.query);
    setRegion(item.region);
    
    if (item.mode === 'sector') {
      setEntityFilters(item.filters || []);
      setLimitStr(item.limit?.toString() || "15");
    } else if (item.mode === 'agent') {
      setAgentSources(item.filters || ['google_search']);
    }
    
    setShowHistory(false);
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await cacheService.deleteSearchHistoryItem(id);
    loadHistory();
  };

  const handleSample = () => {
    if (mode === 'names') {
      setInputText("Moderna\nPfizer\nStanford University\nBroad Institute\nVertex Pharmaceuticals");
    } else if (mode === 'sector') {
      setInputText("Gene Therapy");
      setEntityFilters([]); 
      setLimitStr("15");
    } else {
      setInputText("Find startups in Boston working on tRNA therapeutics");
      setAgentSources(['google_search', 'internal_db']);
    }
  };

  const toggleFilter = (type: string) => {
    setEntityFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleAgentSource = (sourceId: string) => {
    setAgentSources(prev => 
      prev.includes(sourceId) ? prev.filter(s => s !== sourceId) : [...prev, sourceId]
    );
  };

  const lineCount = inputText.split(/\n/).filter(l => l.trim().length > 0).length;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  const handleStopClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onStop) onStop();
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden mb-8 transition-all relative">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => { setMode('names'); setInputText(''); }}
          className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-[120px] ${
            mode === 'names' 
              ? 'bg-white text-blue-600 border-b-4 border-blue-600' 
              : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Bulk Analysis
        </button>
        <button
          type="button"
          onClick={() => { setMode('sector'); setInputText(''); }}
          className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-[120px] ${
            mode === 'sector' 
              ? 'bg-white text-blue-600 border-b-4 border-blue-600' 
              : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Telescope className="w-4 h-4" />
          Sector Discovery
        </button>
        <button
          type="button"
          onClick={() => { setMode('agent'); setInputText(''); }}
          className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-[120px] ${
            mode === 'agent' 
              ? 'bg-white text-indigo-600 border-b-4 border-indigo-600' 
              : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bot className="w-4 h-4" />
          AI Agent Search
        </button>
      </div>

      <div className="p-8">
        <div className="mb-8 flex justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center">
              {mode === 'names' ? 'Analyze Intelligence Nodes' : mode === 'sector' ? 'Therapeutic Sector Discovery' : 'Agent-Led Discovery'}
              <HelpPopup 
                title={mode === 'names' ? 'Bulk Analysis' : mode === 'sector' ? 'Sector Discovery' : 'AI Agent Search'} 
                content={mode === 'names' 
                  ? "Enter a list of company names (one per line). The AI will research each entity and build a comprehensive database profile including pipeline and contact info."
                  : mode === 'sector'
                  ? "Enter a therapeutic area (e.g. 'Oncology') or industry vertical. The AI will identify key market leaders, universities, and research institutes in that space."
                  : "Ask the AI to find companies, drugs, or treatments using natural language. It can search PubMed, ClinicalTrials.gov, and your internal database simultaneously."
                } 
              />
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              {mode === 'names' 
                ? 'Batch process clinical registries and academic output for multiple entities.'
                : mode === 'sector'
                ? 'Identify top performers and emerging researchers in specific biotech fields.'
                : 'Use natural language to find entities (e.g. "Competitors of Keytruda" or "Startups in Boston").'
              }
            </p>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <Tooltip content={isCloudConfigured ? "Connected to Supabase Cloud." : "Cloud cache is offline."}>
              <button 
                 onClick={onOpenSettings}
                 className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 shrink-0 ${
                   isCloudConfigured 
                     ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 shadow-sm' 
                     : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700 shadow-sm'
                 }`} 
              >
                 {isCloudConfigured ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                 <span className="hidden sm:inline">{isCloudConfigured ? "Cloud Active" : "Local Sync Only"}</span>
                 <Settings className="w-3.5 h-3.5 ml-1 opacity-50" />
              </button>
            </Tooltip>

            <Tooltip content="View previous search queries.">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 shrink-0 ${
                  showHistory 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                    : 'bg-white text-slate-500 border-slate-200 hover:text-blue-600'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            </Tooltip>
          </div>
        </div>

        {showHistory && (
          <div className="mb-8 bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-in slide-in-from-top-2 fade-in">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Recent Queries
                </h3>
                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-4 h-4" />
                </button>
             </div>
             <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
               {historyItems.length > 0 ? (
                 historyItems.map(item => (
                   <div key={item.id} onClick={() => restoreHistory(item)} className="bg-white border border-slate-200 p-3 rounded-xl hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              item.mode === 'names' ? 'bg-blue-100 text-blue-700' :
                              item.mode === 'sector' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              {item.mode}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{formatDate(item.timestamp)}</span>
                            {item.region && <span className="text-[10px] text-slate-400 border border-slate-100 px-1 rounded">{item.region}</span>}
                         </div>
                         <div className="text-xs font-bold text-slate-700 truncate">{item.query.replace(/\n/g, ', ')}</div>
                      </div>
                      <div className="flex items-center gap-2">
                         <button onClick={(e) => deleteHistoryItem(e, item.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                         <RotateCcw className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center text-xs text-slate-400 py-4 italic">No search history found.</div>
               )}
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex flex-col gap-6">
            
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip content="Focus intelligence gathering on a specific geographic hub.">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 w-full sm:w-fit group">
                  <Globe className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <label htmlFor="region-select" className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Target Region:</label>
                  <select 
                    id="region-select"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold text-black focus:ring-0 cursor-pointer hover:text-blue-600"
                  >
                    {REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </Tooltip>

              {mode === 'sector' && (
                <Tooltip content="Set the maximum number of ecosystem nodes to retrieve.">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 w-full sm:w-fit group">
                    <ListOrdered className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <label htmlFor="limit-input" className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Node Count:</label>
                    <input 
                      id="limit-input"
                      type="number" 
                      min={1} 
                      max={500}
                      value={limitStr}
                      onChange={(e) => setLimitStr(e.target.value)}
                      onBlur={() => {
                          const val = parseInt(limitStr);
                          if (isNaN(val) || val < 1) setLimitStr("1");
                          else if (val > 500) setLimitStr("500");
                      }}
                      className="w-16 bg-transparent border-b border-slate-300 text-sm font-black text-black focus:border-blue-500 focus:outline-none text-center"
                    />
                  </div>
                </Tooltip>
              )}

              {mode === 'sector' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Include:</span>
                  {ENTITY_TYPES.map(type => {
                    const isSelected = entityFilters.includes(type);
                    return (
                      <Tooltip key={type} content={`Toggle ${type} results.`}>
                        <button
                          type="button"
                          onClick={() => toggleFilter(type)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                            isSelected 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {type}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              )}

              {mode === 'agent' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Search Sources:</span>
                  {AGENT_SOURCES.map(source => {
                    const isSelected = agentSources.includes(source.id);
                    return (
                      <Tooltip key={source.id} content={`Include ${source.label} in search.`}>
                        <button
                          type="button"
                          onClick={() => toggleAgentSource(source.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {source.icon}
                          {source.label}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </div>

            {mode === 'names' ? (
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter company names, drug names, etc. separated by lines (Carriage Return) or commas..."
                  className="w-full h-56 p-5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-black font-bold bg-white placeholder:text-slate-300 text-sm leading-relaxed shadow-inner"
                  disabled={isLoading}
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/90 px-3 py-1.5 rounded-lg backdrop-blur border border-slate-100 shadow-sm">
                  {lineCount} identifiers
                </div>
              </div>
            ) : mode === 'sector' ? (
               <div className="relative">
                 <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Search sector (e.g. mRNA Vaccine Technology, ADC Oncology...)"
                  className="w-full p-5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-black font-bold bg-white placeholder:text-slate-300 text-base shadow-inner"
                  disabled={isLoading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   <div className="h-8 w-px bg-slate-100 mx-2" />
                   <div className="w-5 h-5 flex items-center justify-center">
                     <Sparkles className="w-5 h-5 text-blue-300 animate-pulse" />
                   </div>
                </div>
               </div>
            ) : (
              // Agent Mode Input
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask the AI to find entities (e.g. 'Find all major competitors of Humira' or 'List startups in Cambridge working on CRISPR')..."
                  className="w-full h-40 p-5 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all text-black font-bold bg-white placeholder:text-slate-300 text-sm leading-relaxed shadow-inner"
                  disabled={isLoading}
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-white/90 px-3 py-1.5 rounded-lg backdrop-blur border border-indigo-100 shadow-sm flex items-center gap-1.5">
                  <Bot className="w-3 h-3" />
                  Agent Active
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={handleSample}
              disabled={isLoading}
              className="text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all flex items-center gap-2"
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              Load Sample Database
            </button>

            {isLoading && onStop ? (
               <button
                type="button"
                onClick={handleStopClick}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/30 active:scale-95 transition-all animate-in fade-in"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Abort Session
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white transition-all
                  ${!inputText.trim() 
                    ? 'bg-slate-200 cursor-not-allowed text-slate-400' 
                    : mode === 'agent' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 active:scale-95 hover:scale-105'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/30 active:scale-95 hover:scale-105'
                  }`}
              >
                {mode === 'agent' ? <Bot className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                {mode === 'names' 
                  ? `Verify ${lineCount > 1 ? lineCount + ' Nodes' : 'Intelligence'}` 
                  : mode === 'agent' 
                    ? 'Run Agent Discovery' 
                    : 'Retrieve Ecosystem'
                }
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputSection;
