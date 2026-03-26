import React, { useState, useCallback } from 'react';
import { Bot, FileText, Loader2, Search, Check, AlertCircle } from 'lucide-react';
import { patentService } from '../services/patentService';

interface Database {
  id: string;
  name: string;
  desc: string;
  badge: 'AU' | 'EU' | 'US' | 'GL';
}

const DATABASES: Database[] = [
  { id: 'uspto', name: 'USPTO PatentsView', desc: 'US patent grants & applications', badge: 'US' },
  { id: 'google', name: 'Google Patents', desc: '120+ patent offices incl. WIPO PCT', badge: 'GL' },
];

const PatentSearchAgent: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedDbs, setSelectedDbs] = useState<string[]>(['uspto', 'google']);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleDb = (id: string) => {
    setSelectedDbs(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedDbs(DATABASES.map(db => db.id));
  const clearAll = () => setSelectedDbs([]);

  const runSearch = async () => {
    if (!query || selectedDbs.length === 0) return;

    setIsRunning(true);
    setError(null);
    setResults([]);

    try {
      let allResults: any[] = [];
      
      // USPTO Search
      if (selectedDbs.includes('uspto')) {
        const usptoResults = await patentService.getPatents(query, {}, 10);
        allResults = [...allResults, ...usptoResults.map(r => ({ ...r, source: 'USPTO' }))];
      }

      // Google Patents Search (Placeholder)
      if (selectedDbs.includes('google')) {
        // Placeholder for Google Patents Search
        allResults = [...allResults, { 
          id: 'GOOGLE-123', 
          title: `Google Patent Search for: ${query}`, 
          assignee: 'Various', 
          relevance: 0.9 
        }];
      }

      setResults(allResults);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <Bot size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Patent Search Agent</h1>
        </div>
        <p className="text-slate-500">Orchestrate multi-database patent searches with AI analysis.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Search Query</label>
        <textarea 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[100px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. CRISPR gene editing for treating monogenic liver diseases..."
        />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Patent Databases</label>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs font-bold text-blue-600 hover:text-blue-800">Select All</button>
            <button onClick={clearAll} className="text-xs font-bold text-slate-500 hover:text-slate-700">Clear</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DATABASES.map(db => (
            <div 
              key={db.id}
              onClick={() => toggleDb(db.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedDbs.includes(db.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center ${selectedDbs.includes(db.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {selectedDbs.includes(db.id) && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">{db.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{db.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={runSearch}
        disabled={!query || selectedDbs.length === 0 || isRunning}
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-slate-300 transition-all"
      >
        {isRunning ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
        {isRunning ? 'Running Agent...' : `Search ${selectedDbs.length} Databases`}
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-200">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Results</h2>
          {results.map(r => (
            <div key={r.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-900">{r.title}</h3>
                <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{r.id}</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">Assignee: {r.assignee}</p>
              <div className="mt-4 text-xs font-bold text-blue-600">Relevance: {Math.round(r.relevance * 100)}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatentSearchAgent;
