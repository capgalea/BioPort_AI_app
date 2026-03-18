
import React, { useState } from 'react';
import { FileText, Search, Loader2, ExternalLink, ShieldCheck, Calendar, User, Hash, Sparkles, Info } from 'lucide-react';
import { patentService } from '../services/patentService.ts';
import { intelligentPatentSearch } from '../services/geminiService.ts';
import { Patent } from '../types.ts';

const PatentsView: React.FC = () => {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchSource, setSearchSource] = useState<'ip_au' | 'google' | 'epo' | 'both'>('ip_au');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchPatents = async (searchQuery: string) => {
    setLoading(true);
    setHasSearched(true);
    setError(null);
    setLastSearchedQuery(searchQuery);
    try {
      let sources: ('ip_au' | 'google' | 'epo')[];
      if (searchSource === 'both') {
        sources = ['ip_au', 'google', 'epo'];
      } else {
        sources = [searchSource as ('ip_au' | 'google' | 'epo')];
      }
      const data = await intelligentPatentSearch(searchQuery, sources);
      setPatents(data);
    } catch (err: any) {
      console.error("Failed to fetch patents:", err);
      setError(err.message || `Failed to perform intelligent patent search.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      fetchPatents(query);
    }
  };

  const [testStatus, setTestStatus] = useState<{ status: string, message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const testSerpApi = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const response = await fetch('/api/test-serpapi');
      const data = await response.json();
      setTestStatus({
        status: response.ok ? 'success' : 'error',
        message: data.message || data.error || "Unknown error"
      });
    } catch (err) {
      setTestStatus({ status: 'error', message: "Failed to reach test endpoint." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" /> 
            IP Intelligence
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            Global patent database search and intellectual property landscape analysis.
          </p>
        </div>
        <button 
          onClick={testSerpApi}
          disabled={testing}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            testStatus?.status === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
            testStatus?.status === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
          {testStatus ? testStatus.message : "Test SerpApi Key"}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setSearchSource('ip_au')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchSource === 'ip_au' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            IP Australia
          </button>
          <button 
            onClick={() => setSearchSource('google')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchSource === 'google' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Google Patents (Global)
          </button>
          <button 
            onClick={() => setSearchSource('epo')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchSource === 'epo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            EPO (European)
          </button>
          <button 
            onClick={() => setSearchSource('both')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchSource === 'both' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            All Sources
          </button>
        </div>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchSource === 'ip_au' ? "Search by company, technology, or patent number..." : searchSource === 'google' ? "Search by technology or use 'assignee:\"Company Name\"' for specific firms..." : "Search across both IP Australia and Google Patents..."}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Search
          </button>
        </form>
      </div>

      {(searchSource === 'google' || searchSource === 'both') && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8 flex flex-col md:flex-row gap-6 items-start animate-in fade-in zoom-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-sm border border-amber-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-2 flex items-center gap-2">
              Google Patents (Easiest / Global)
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-[8px] rounded-full">Pro Tip</span>
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed mb-4 font-medium">
              Google Patents is the fastest way to get a global snapshot across 100+ patent offices.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">How to search:</p>
                <div className="bg-white/50 p-3 rounded-xl border border-amber-200/50">
                  <p className="text-xs text-amber-900">
                    Use the <code className="bg-amber-200/50 px-1.5 py-0.5 rounded font-bold text-amber-950">assignee:</code> prefix.
                  </p>
                  <p className="text-[10px] mt-2 text-amber-600 font-bold">Example:</p>
                  <code className="text-xs block mt-1 bg-amber-200/50 p-1.5 rounded font-bold text-amber-950">assignee:"Apple Inc"</code>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Refining Results:</p>
                <div className="bg-white/50 p-3 rounded-xl border border-amber-200/50">
                  <p className="text-xs text-amber-900 italic leading-relaxed">
                    "Click the <strong>Assignee</strong> filter on the official Google Patents sidebar after your initial search to see a list of related legal entities and subsidiaries you might have missed."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
          <p className="text-sm font-black uppercase tracking-widest">
            {searchSource === 'ip_au' ? 'Scanning IP Australia Registry...' : 'Searching Google Patents Database...'}
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-red-50 rounded-3xl border border-red-100">
          <ShieldCheck className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">
            {searchSource === 'ip_au' ? 'Registry Connection Error' : 'Search Service Error'}
          </h3>
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => fetchPatents(query)}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
          >
            Retry {searchSource === 'ip_au' ? 'Connection' : 'Search'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {patents.map((patent, idx) => {
            const cleanQuery = lastSearchedQuery.replace('assignee:', '').replace(/"/g, '');
            const cleanAppNum = patent.appNum ? patent.appNum.replace(/[^a-zA-Z0-9]/g, '') : '';
            const googleUrl = patent.url && patent.url.includes('patents.google.com') 
              ? patent.url 
              : `https://patents.google.com/patent/${cleanAppNum}/en?q=(${encodeURIComponent(cleanQuery)})&oq=${encodeURIComponent(cleanQuery)}`;
            
            return (
            <a 
              key={idx} 
              href={patent.source === 'Google Patents' ? googleUrl : (patent.source === 'EPO' ? `https://worldwide.espacenet.com/patent/search?q=pn%3D${patent.appNum ? patent.appNum.replace(/[^a-zA-Z0-9]/g, '') : ''}` : (patent.url || `https://pericles.ipaustralia.gov.au/ols/auspat/applicationDetails.do?applicationNo=${patent.appNum ? patent.appNum.replace(/[^0-9]/g, '') : ''}`))}
              target="_blank"
              rel="noreferrer"
              className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl transition-all group cursor-pointer block"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                    <Hash className="w-3 h-3" />
                    {patent.appNum}
                  </div>
                  {patent.source && (
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Source: {patent.source}
                    </div>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  patent.status === 'Granted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                  patent.status === 'Published' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {patent.status}
                </div>
              </div>
              
              <h3 className="text-lg font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                {patent.title}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{patent.source === 'Google Patents' ? 'Assignee' : 'Applicant'}</p>
                    <p className="text-sm font-bold text-slate-700">{patent.applicant}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Filing Date</p>
                    <p className="text-sm font-bold text-slate-700">{patent.filed}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  Verified IP Record
                </div>
                <div className="text-blue-600 group-hover:text-blue-700 text-sm font-bold flex items-center gap-1">
                  Full Text <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </a>
          )})}
        </div>
      )}

      {!loading && !error && patents.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          {!hasSearched ? (
            <p className="text-slate-500 font-medium">Enter a query above to start searching patent records.</p>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-blue-600 font-bold text-lg mb-2">No results found for query {lastSearchedQuery}</p>
              <p className="text-slate-500 font-medium">No patent records found for this query.</p>
              {lastSearchedQuery.toLowerCase().includes('assignee:') && (
                <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 max-w-md mx-auto">
                   <p className="text-xs text-blue-700 font-bold flex items-center justify-center gap-2">
                     <Info className="w-4 h-4" /> Search results do not match the input query
                   </p>
                   <p className="text-[10px] text-blue-500 mt-2">
                     Try searching for the full legal entity name (e.g. "GlaxoSmithKline" instead of "GSK") or check the "Assignee" filter on the official Google Patents sidebar.
                   </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatentsView;
