
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Newspaper, ExternalLink, Clock, Loader2, RefreshCw, Star, Zap, Search, ChevronDown, FlaskConical, Brain, Shield, Heart, Zap as Energy, Briefcase, Activity, Globe, Dna, Play, Check, Settings2, Target, Radio, Info, AlertTriangle, Filter, Calendar, ShieldCheck, Building2 } from 'lucide-react';
import { NewsItem } from '../types.ts';
import { fetchLatestNews } from '../services/geminiService.ts';
import { cacheService } from '../services/cacheService.ts';
import Tooltip from './Tooltip.tsx';

interface NewsFeedProps {
  companyName?: string;
  title?: string;
  className?: string;
}

const SECTORS = [
  { id: 'Global', label: 'Global Industry', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'Oncology', label: 'Oncology', icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { id: 'Neurology', label: 'Neurology & CNS', icon: <Brain className="w-3.5 h-3.5" /> },
  { id: 'Immunology', label: 'Immunology', icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'Rare Diseases', label: 'Rare Diseases', icon: <Energy className="w-3.5 h-3.5" /> },
  { id: 'Cell & Gene Therapy', label: 'Cell & Gene', icon: <Dna className="w-3.5 h-3.5" /> },
  { id: 'Cardiology', label: 'Cardiology', icon: <Heart className="w-3.5 h-3.5" /> }
];

const TIME_PERIODS = [
  { id: '24h', label: '24 Hours', detail: 'Breaking Only' },
  { id: '48h', label: '48 Hours', detail: 'Recent Catalysts' },
  { id: '7d', label: '7 Days', detail: 'Standard Briefing' },
  { id: '30d', label: '30 Days', detail: 'Strategic Review' }
];

const INTELLIGENCE_CATEGORIES = [
  { id: 'Clinical', label: 'Clinical Trials', color: 'blue' },
  { id: 'Regulatory', label: 'Regulatory & FDA', color: 'emerald' },
  { id: 'Financial', label: 'Financial & M&A', color: 'amber' },
  { id: 'Industry', label: 'Industry Trends', color: 'purple' },
  { id: 'Reports', label: 'Reports & Forecasts', color: 'rose' }
];

const LOADING_MESSAGES = [
  "Synchronizing grounding nodes...",
  "Querying global registries...",
  "Analyzing clinical catalysts...",
  "Synthesizing high-impact headlines...",
  "Verifying source veracity..."
];

const NewsFeed: React.FC<NewsFeedProps> = ({ companyName, title, className = "" }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedSector, setSelectedSector] = useState(companyName ? 'Global' : 'Global');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('7d');
  const [isInitialized, setIsInitialized] = useState(!!companyName);
  const [loading, setLoading] = useState(!!companyName);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const loadingIntervalRef = useRef<number | null>(null);

  const loadNews = useCallback(async (bypassCache = false) => {
    const topic = companyName || `${selectedSector}_${[...selectedCategories].sort().join("_")}_${selectedTimePeriod}`;
    
    if (!companyName && !selectedSector) return;

    if (!bypassCache) {
      const cached = await cacheService.getCachedNews(topic);
      if (cached) {
        setNews(cached.items);
        setLastRefreshed(new Date(cached.timestamp));
        setLoading(false);
        if (cacheService.isNewsFresh(cached.timestamp)) {
           return;
        }
      }
    }

    if (bypassCache || !news.length) setLoading(true);
    else setIsRevalidating(true);

    try {
      const data = await fetchLatestNews(companyName, selectedSector, selectedCategories, selectedTimePeriod);
      if (data && data.length > 0) {
        setNews(data);
        setLastRefreshed(new Date());
        cacheService.saveNewsCache(data, topic);
      } else {
        // If it's a specific company search and no news is found, explicitly set to empty
        setNews([]);
      }
    } catch (err) {
      console.warn("News revalidation failed:", err);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  }, [companyName, selectedSector, selectedCategories, selectedTimePeriod, news.length]);

  useEffect(() => {
    if (isInitialized) {
      loadNews();
    }
  }, [isInitialized, loadNews]);

  useEffect(() => {
    if (loading) {
      loadingIntervalRef.current = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500); 
    } else {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      setLoadingMsgIndex(0);
    }
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, [loading]);

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'clinical': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'regulatory': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'financial': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'industry': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'reports': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleStartProtocol = () => {
    if (selectedSector) {
      setIsInitialized(true);
      setNews([]); 
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleTemporalExpansion = () => {
    setSelectedTimePeriod('30d');
    // loadNews(true) will be triggered naturally by the dependency change or we can force it here
    loadNews(true);
  };

  const handleProfileSync = () => {
    loadNews(true);
  };

  const currentPeriodLabel = TIME_PERIODS.find(p => p.id === selectedTimePeriod)?.label || '7 Days';

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col ${className}`}>
      {/* Dynamic Header */}
      <div className={`p-6 border-b border-slate-100 transition-all ${isInitialized ? 'bg-slate-50/50' : 'bg-slate-900 text-white'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isInitialized ? 'bg-indigo-600 text-white' : 'bg-white/10 text-blue-400 border border-white/20'}`}>
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                 <h3 className={`font-black uppercase tracking-tight text-sm ${isInitialized ? 'text-slate-900' : 'text-white'}`}>
                   {title || (companyName ? `Intelligence Feed: ${companyName}` : isInitialized ? `${selectedSector} Intelligence` : "Intelligence Protocol Config")}
                 </h3>
                 {companyName && (
                   <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-200">
                     Scoped Profile Feed
                   </span>
                 )}
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5 ${isInitialized ? 'text-slate-400' : 'text-slate-400'}`}>
                {lastRefreshed ? `Synced: ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : isInitialized ? 'Sync Pending' : 'Discovery Engine Standby'}
                {isRevalidating && <span className="inline-flex items-center text-indigo-500 animate-pulse ml-2"><RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" /> Updating...</span>}
              </p>
            </div>
          </div>

          {isInitialized && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!companyName && (
                <div className="flex items-center gap-2">
                   <div className="relative group">
                    <select 
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer pr-8 shadow-sm"
                    >
                      {SECTORS.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                  
                  <div className="relative group">
                    <select 
                      value={selectedTimePeriod}
                      onChange={(e) => setSelectedTimePeriod(e.target.value)}
                      className="appearance-none bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-[10px] font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all cursor-pointer pr-8 shadow-sm"
                    >
                      {TIME_PERIODS.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400 pointer-events-none" />
                  </div>
                </div>
              )}
              
              <Tooltip content="Refresh with current filters">
                <button 
                  onClick={() => loadNews(true)}
                  disabled={loading || isRevalidating}
                  className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 rounded-xl transition-all text-slate-400 hover:text-indigo-600 disabled:opacity-50 h-10 w-10 flex items-center justify-center shrink-0 shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${(loading || isRevalidating) ? 'animate-spin' : ''}`} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Categories Bar */}
        {isInitialized && !companyName && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Focus:</span>
            {INTELLIGENCE_CATEGORIES.map(cat => {
              const isActive = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                  {isActive && <Check className="w-2.5 h-2.5" />}
                  {cat.label}
                </button>
              );
            })}
            {selectedCategories.length > 0 && (
              <button 
                onClick={() => setSelectedCategories([])}
                className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:underline ml-2"
              >
                Reset Focus
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-6 min-h-[400px] flex flex-col">
        {!isInitialized ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 animate-in fade-in duration-500">
             <div className="w-full max-w-lg bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8 sm:p-12 shadow-inner">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Settings2 className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">Intelligence Node Config</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enhanced Discovery Engine</p>
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Target className="w-3 h-3" /> Therapeutic Sector
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                         {SECTORS.map(s => (
                           <button 
                             key={s.id}
                             onClick={() => setSelectedSector(s.id)}
                             className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${selectedSector === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                           >
                             <div className={`p-1.5 rounded-lg ${selectedSector === s.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                {s.icon}
                             </div>
                             {s.label}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Temporal window
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                         {TIME_PERIODS.map(p => (
                           <button 
                             key={p.id}
                             onClick={() => setSelectedTimePeriod(p.id)}
                             className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-2xl border transition-all ${selectedTimePeriod === p.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                           >
                             <span className="text-xs font-bold">{p.label}</span>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${selectedTimePeriod === p.id ? 'text-indigo-200' : 'text-slate-400'}`}>{p.detail}</span>
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Radio className="w-3 h-3" /> Intelligence Focus
                      </label>
                      <div className="flex flex-wrap gap-2">
                         {INTELLIGENCE_CATEGORIES.map(cat => {
                           const isActive = selectedCategories.includes(cat.id);
                           return (
                             <button
                               key={cat.id}
                               onClick={() => toggleCategory(cat.id)}
                               className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${isActive ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                             >
                               {isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5 text-slate-300" />}
                               {cat.label}
                             </button>
                           );
                         })}
                      </div>
                   </div>

                   <button 
                     onClick={handleStartProtocol}
                     disabled={!selectedSector}
                     className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-30 disabled:shadow-none"
                   >
                     <Zap className="w-5 h-5 fill-white" />
                     Run Intelligence Protocol
                   </button>
                </div>
             </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 animate-in fade-in">
             <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 relative z-10" />
             </div>
             <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse text-slate-600 text-center px-4">
                {LOADING_MESSAGES[loadingMsgIndex]}
             </p>
             <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-sm">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase border border-indigo-100 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {currentPeriodLabel} Window
                </span>
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-500 border border-slate-200">{selectedSector}</span>
             </div>
          </div>
        ) : news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {news.map((item) => {
              const safeUrl = item.url.startsWith('http') ? item.url : `https://${item.url}`;
              return (
                <a 
                  key={item.id}
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-300 hover:shadow-xl transition-all flex flex-col h-full relative no-underline"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" />
                      {item.timeAgo}
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base leading-snug mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  {item.summary && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-5 font-medium leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden shrink-0">
                           <Globe className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[140px]">
                          {item.source}
                        </span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Tooltip content="Verified Source Article">
                           <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        </Tooltip>
                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                     </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
             <div className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Search className="w-10 h-10 text-slate-200" />
             </div>
             <h4 className="text-base font-black text-slate-500 uppercase tracking-widest">Zero Direct Catalysts Found</h4>
             <p className="text-xs text-slate-400 mt-2 max-w-sm text-center leading-relaxed font-medium px-6">
               {companyName 
                 ? `The intelligence engine identified zero direct milestones for "${companyName}" within the ${currentPeriodLabel.toLowerCase()} window. Entity-scoping prevents unrelated noise.`
                 : `No high-impact milestones matching this configuration were identified within the ${currentPeriodLabel.toLowerCase()} temporal window.`}
             </p>
             
             <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md w-full px-6">
                <button 
                  onClick={handleTemporalExpansion}
                  className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col items-center text-center transition-all hover:border-indigo-400 hover:shadow-md active:scale-95 group/btn"
                >
                   <Calendar className="w-5 h-5 text-indigo-500 mb-2 group-hover/btn:scale-110 transition-transform" />
                   <h5 className="text-[10px] font-black uppercase text-slate-700 mb-1">Temporal Expansion</h5>
                   <p className="text-[9px] text-slate-500 leading-tight">Switch to a 30-day window to locate historical catalysts.</p>
                </button>
                <button 
                  onClick={handleProfileSync}
                  className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col items-center text-center transition-all hover:border-blue-400 hover:shadow-md active:scale-95 group/btn"
                >
                   <Building2 className="w-5 h-5 text-blue-500 mb-2 group-hover/btn:scale-110 transition-transform" />
                   <h5 className="text-[10px] font-black uppercase text-slate-700 mb-1">Profile Sync</h5>
                   <p className="text-[9px] text-slate-500 leading-tight">Check the core profile for pipeline updates if news is quiet.</p>
                </button>
             </div>

             <div className="flex gap-3 mt-8">
                {!companyName && (
                  <button 
                    onClick={() => setIsInitialized(false)}
                    className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    Adjust Config
                  </button>
                )}
                <button 
                    onClick={() => loadNews(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Scoped Grounding
                </button>
             </div>
          </div>
        )}
      </div>
      
      <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              AI Grounded Intelligence • {currentPeriodLabel} Window
           </span>
         </div>
         {isInitialized ? (
           <div className="flex items-center gap-2">
             <span className="text-[9px] font-bold text-slate-400 uppercase">Node Activity: </span>
             <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
             <span className="text-[9px] font-black text-slate-500 uppercase">{loading ? 'Synthesizing' : 'Standby'}</span>
           </div>
         ) : (
           <div className="flex items-center gap-2">
             <Info className="w-3.5 h-3.5 text-blue-500" />
             <span className="text-[9px] font-bold text-slate-400 uppercase">Awaiting Authorization</span>
           </div>
         )}
      </div>
    </div>
  );
};

// Sub-components used as icons in configuration grid
const Plus = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
);

const CheckCircle2 = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export default NewsFeed;
