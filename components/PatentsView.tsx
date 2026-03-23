
import React, { useState } from 'react';
import { FileText, Search, Loader2, ExternalLink, ShieldCheck, Calendar, User, Hash, Info } from 'lucide-react';
import { patentService } from '../services/patentService.ts';
import { Patent } from '../types.ts';

const PatentsView: React.FC = () => {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchPatents = async (searchQuery: string) => {
    setLoading(true);
    setHasSearched(true);
    setError(null);
    setLastSearchedQuery(searchQuery);
    try {
      const data = await patentService.getPatents(searchQuery);
      setPatents(data);
    } catch (err: any) {
      console.error("Failed to fetch patents:", err);
      setError(err.message || `Failed to fetch patents from USPTO.`);
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" /> 
            IP Intelligence
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            USPTO patent database search and intellectual property landscape analysis.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-8 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company, technology, or patent number..."
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
          <p className="text-sm font-black uppercase tracking-widest">
            Scanning USPTO Registry...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-red-50 rounded-3xl border border-red-100">
          <ShieldCheck className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">
            Registry Connection Error
          </h3>
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => fetchPatents(query)}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {patents.map((patent, idx) => {
            return (
            <a 
              key={idx} 
              href={patent.url}
              target="_blank"
              rel="noreferrer"
              className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl transition-all group cursor-pointer block"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                    <Hash className="w-3 h-3" />
                    {patent.applicationNumber}
                  </div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Source: USPTO
                  </div>
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Applicant</p>
                    <p className="text-sm font-bold text-slate-700">{patent.applicants.join(', ')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Filing Date</p>
                    <p className="text-sm font-bold text-slate-700">{patent.dateFiled}</p>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatentsView;
