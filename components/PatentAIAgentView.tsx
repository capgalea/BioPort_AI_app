import React, { useState } from 'react';
import { Bot, Search, FileText, Loader2, CheckCircle2, AlertCircle, Database, Globe, Pill, Building2, Trash2 } from 'lucide-react';
import { runPatentAIAgent } from '../services/geminiService';
import { CompanyData } from '../types';

interface PatentAIAgentViewProps {
  companies: CompanyData[];
}

const PatentAIAgentView: React.FC<PatentAIAgentViewProps> = ({ companies }) => {
  const [query, setQuery] = useState(() => localStorage.getItem('bioport_patent_ai_agent_query') || '');
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [result, setResult] = useState<{ summary: string, rating: string, feedback: string, references: { title: string, url: string }[] } | null>(() => {
    const saved = localStorage.getItem('bioport_patent_ai_agent_result');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [sources, setSources] = useState({
    patentAnalytics: true,
    googleSearch: true,
    drugSearch: true,
    companiesResults: true
  });

  React.useEffect(() => {
    localStorage.setItem('bioport_patent_ai_agent_query', query);
  }, [query]);

  React.useEffect(() => {
    if (result) {
      localStorage.setItem('bioport_patent_ai_agent_result', JSON.stringify(result));
    } else {
      localStorage.removeItem('bioport_patent_ai_agent_result');
    }
  }, [result]);

  const handleRunAgent = async () => {
    setStatus('processing');
    try {
      // Gather data from selected sources
      const contextData: any = {};
      
      if (sources.patentAnalytics) {
        const saved = localStorage.getItem('bioport_patent_analytics_results');
        contextData.patents = saved ? JSON.parse(saved) : [];
      }
      
      if (sources.drugSearch) {
        const saved = localStorage.getItem('bioport_drug_search_results');
        contextData.drugs = saved ? JSON.parse(saved) : [];
      }
      
      if (sources.companiesResults) {
        contextData.companies = companies;
      }

      const res = await runPatentAIAgent(query, {
        useGoogleSearch: sources.googleSearch,
        context: contextData
      });
      
      setResult(res);
      setStatus('completed');
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    localStorage.removeItem('bioport_patent_ai_agent_query');
    localStorage.removeItem('bioport_patent_ai_agent_result');
  };

  const toggleSource = (key: keyof typeof sources) => {
    setSources(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-xl">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Patent AI Agent</h1>
            <p className="text-slate-500 text-sm mt-1">Retrieval-Augmented Generation (RAG) model for comprehensive intelligence.</p>
          </div>
        </div>
        <button 
          onClick={handleClear}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <Trash2 size={14} /> Clear Agent
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Research Query</label>
        <textarea 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[120px] mb-6"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your research query (e.g., 'Analyze the competitive landscape for mRNA vaccines based on my recent searches.')"
        />

        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Data Sources to Include</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => toggleSource('patentAnalytics')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${sources.patentAnalytics ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            <Database size={18} className={sources.patentAnalytics ? 'text-indigo-600' : 'text-slate-400'} />
            <div className="flex-1">
              <div className="text-xs font-bold">Patent Analytics</div>
              <div className="text-[10px] opacity-70">Results from Patent Analytics page</div>
            </div>
            {sources.patentAnalytics && <CheckCircle2 size={16} />}
          </button>

          <button 
            onClick={() => toggleSource('googleSearch')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${sources.googleSearch ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            <Globe size={18} className={sources.googleSearch ? 'text-indigo-600' : 'text-slate-400'} />
            <div className="flex-1">
              <div className="text-xs font-bold">Google Search</div>
              <div className="text-[10px] opacity-70">Live web search for latest info</div>
            </div>
            {sources.googleSearch && <CheckCircle2 size={16} />}
          </button>

          <button 
            onClick={() => toggleSource('drugSearch')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${sources.drugSearch ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            <Pill size={18} className={sources.drugSearch ? 'text-indigo-600' : 'text-slate-400'} />
            <div className="flex-1">
              <div className="text-xs font-bold">Drug Search</div>
              <div className="text-[10px] opacity-70">Results from Drug Search page</div>
            </div>
            {sources.drugSearch && <CheckCircle2 size={16} />}
          </button>

          <button 
            onClick={() => toggleSource('companiesResults')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${sources.companiesResults ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            <Building2 size={18} className={sources.companiesResults ? 'text-indigo-600' : 'text-slate-400'} />
            <div className="flex-1">
              <div className="text-xs font-bold">Companies & Institutions</div>
              <div className="text-[10px] opacity-70">Current results from Companies page</div>
            </div>
            {sources.companiesResults && <CheckCircle2 size={16} />}
          </button>
        </div>

        <button 
          onClick={handleRunAgent}
          disabled={!query || status === 'processing'}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:bg-slate-300 transition-all"
        >
          {status === 'processing' ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          {status === 'processing' ? 'Agent Retrieving & Analyzing Data...' : 'Run RAG Analysis'}
        </button>
      </div>

      {result && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Analysis Summary</h2>
          <div className="prose prose-sm max-w-none text-slate-700 mb-6 whitespace-pre-wrap">
            {result.summary.split(/(\[\d+\])/).map((part, i) => {
              const match = part.match(/\[(\d+)\]/);
              if (match) {
                const refIndex = parseInt(match[1]) - 1;
                if (result.references && result.references[refIndex]) {
                  return (
                    <a 
                      key={i} 
                      href={`#ref-${match[1]}`}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer px-0.5"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`ref-${match[1]}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      {part}
                    </a>
                  );
                }
              }
              return part;
            })}
          </div>

          {result.references && result.references.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">References & Sources</h3>
              <div className="grid grid-cols-1 gap-2">
                {result.references.map((ref, idx) => (
                  <div key={idx} id={`ref-${idx + 1}`} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs transition-all">
                    <span className="font-black text-indigo-600 w-6 shrink-0">[{idx + 1}]</span>
                    <Globe size={14} className="shrink-0 text-slate-400" />
                    <a 
                      href={ref.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-bold truncate text-blue-600 hover:underline flex-1"
                    >
                      {ref.title}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Quality Rating:</span>
                <span className={`px-2 py-1 rounded-md text-xs font-black ${Number(result.rating) >= 8 ? 'bg-emerald-100 text-emerald-700' : Number(result.rating) >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {result.rating} / 10
                </span>
              </div>
            </div>
            {result.feedback && (
              <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p><strong>Agent Feedback:</strong> {result.feedback}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatentAIAgentView;
