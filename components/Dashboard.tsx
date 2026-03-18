
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CompanyData, PipelinePhase } from '../types.ts';
import { 
  BarChart3, Activity, Filter, Layers, FlaskConical, 
  Search, ArrowRightLeft, X, Plus, CheckCircle2, Globe2, ChevronDown, Check, Building2, SlidersHorizontal
} from 'lucide-react';
import CompanyMap from './CompanyMap.tsx';
import HelpPopup from './HelpPopup.tsx';

interface DashboardProps {
  companies: CompanyData[];
}

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

// --- Helper Tooltip Component ---
const Tooltip: React.FC<TooltipProps> = ({ content, children, className = "inline-flex items-center justify-center", align = 'center' }) => {
  return (
    <div className={`group relative ${className}`}>
      {children}
      {/* Tooltip Popup with padding bridge */}
      <div className={`absolute bottom-full pb-2 hidden group-hover:block z-[100] w-max max-w-[240px] ${
        align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
      }`}>
        <div className="bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl text-left animate-in fade-in zoom-in-95 duration-200 relative">
          {content}
          {/* Arrow */}
          <div className={`absolute top-full border-4 border-transparent border-t-slate-800 ${
             align === 'left' ? 'left-6' : align === 'right' ? 'right-6' : 'left-1/2 -translate-x-1/2'
          }`}></div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ companies }) => {
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [displayLimit, setDisplayLimit] = useState<number>(200);
  
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
  
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [multiSelectSearch, setMultiSelectSearch] = useState('');
  const [characterFilter, setCharacterFilter] = useState<string[]>([]);
  const multiSelectRef = useRef<HTMLDivElement>(null);

  // Comparison State
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (multiSelectRef.current && !multiSelectRef.current.contains(event.target as Node)) {
        setIsMultiSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getParsedSectors = (c: CompanyData) => {
    return (c.sector || '').split(/,|&|\//).map(s => s.trim()).filter(Boolean);
  };

  const uniqueSectors = useMemo(() => {
    const allSectors = new Set<string>();
    companies.forEach(c => {
      getParsedSectors(c).forEach(s => allSectors.add(s));
    });
    return ['All', ...Array.from(allSectors).sort()];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesId = selectedFilterIds.length === 0 || selectedFilterIds.includes(c.id);
      const matchesSector = sectorFilter === 'All' || getParsedSectors(c).includes(sectorFilter);
      return matchesId && matchesSector;
    });
  }, [companies, selectedFilterIds, sectorFilter]);

  const displayedCompanies = useMemo(() => {
    return filteredCompanies.slice(0, displayLimit);
  }, [filteredCompanies, displayLimit]);

  const metrics = useMemo(() => {
    const totalCompanies = displayedCompanies.length;
    
    const pipelineCounts: Record<string, number> = {
      [PipelinePhase.Preclinical]: 0,
      [PipelinePhase.Phase1]: 0,
      [PipelinePhase.Phase2]: 0,
      [PipelinePhase.Phase3]: 0,
      [PipelinePhase.Filed]: 0,
      [PipelinePhase.Approved]: 0,
    };

    let totalPipelineAssets = 0;
    let totalApproved = 0;

    displayedCompanies.forEach(c => {
      totalApproved += c.keyApprovedDrugs.length;
      c.pipeline.forEach(p => {
        totalPipelineAssets++;
        const ph = p.phase.toLowerCase();
        if (ph.includes('pre') || ph.includes('discovery')) pipelineCounts[PipelinePhase.Preclinical]++;
        else if (ph.includes('1') || (ph.includes('i') && !ph.includes('ii'))) pipelineCounts[PipelinePhase.Phase1]++;
        else if (ph.includes('2') || (ph.includes('ii') && !ph.includes('iii'))) pipelineCounts[PipelinePhase.Phase2]++;
        else if (ph.includes('3') || (ph.includes('iii'))) pipelineCounts[PipelinePhase.Phase3]++;
        else if (ph.includes('filed') || ph.includes('registration')) pipelineCounts[PipelinePhase.Filed]++;
        else if (ph.includes('approved') || ph.includes('market')) pipelineCounts[PipelinePhase.Approved]++;
      });
    });

    const sectorCounts: Record<string, number> = {};
    displayedCompanies.forEach(c => {
      getParsedSectors(c).forEach(s => {
        sectorCounts[s] = (sectorCounts[s] || 0) + 1;
      });
    });
    const sortedSectors = Object.entries(sectorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    const techCounts: Record<string, number> = {};
    displayedCompanies.forEach(c => {
      c.keyTechnologies.forEach(t => {
        techCounts[t] = (techCounts[t] || 0) + 1;
      });
    });
    const sortedTech = Object.entries(techCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
      
    const topApprovedContributors = displayedCompanies
      .map(c => ({ name: c.name, count: c.keyApprovedDrugs.length }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalCompanies,
      totalPipelineAssets,
      totalApproved,
      pipelineCounts,
      sortedSectors,
      sortedTech,
      topApprovedContributors
    };
  }, [displayedCompanies]);

  const toggleComparisonItem = (id: string) => {
    if (selectedCompIds.includes(id)) {
      setSelectedCompIds(prev => prev.filter(x => x !== id));
    } else if (selectedCompIds.length < 4) {
      setSelectedCompIds(prev => [...prev, id]);
    }
  };

  const toggleFilterId = (id: string) => {
    setSelectedFilterIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCharacterFilterToggle = (char: string) => {
    setCharacterFilter(prev => 
      prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
    );
  };

  const availableChars = useMemo(() => {
    const chars = new Set(companies.map(c => c.name[0]?.toUpperCase()).filter(Boolean));
    return Array.from(chars).sort();
  }, [companies]);

  const filteredOptions = useMemo(() => {
    return companies
      .filter(c =>
        (characterFilter.length === 0 || (c.name[0] && characterFilter.includes(c.name[0].toUpperCase()))) &&
        c.name.toLowerCase().includes(multiSelectSearch.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, multiSelectSearch, characterFilter]);

  const displayedOptions = filteredOptions.slice(0, 50);

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Building2 className="w-12 h-12 mb-4 opacity-50" />
        <p>No corporate data available. Search for biotech/pharma companies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-16 z-20">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            Corporate Dashboard
            <HelpPopup 
              title="Dashboard Guide" 
              content="This dashboard provides aggregated analytics for corporate entities in your database. View pipeline distributions, top technologies, and global presence. Use the comparison tool at the bottom to compare up to 4 companies side-by-side." 
            />
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
          
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg min-w-[200px] w-full sm:w-auto">
             <SlidersHorizontal className="w-4 h-4 text-slate-400" />
             <div className="flex flex-col flex-1">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Analytics Limit</span>
                   <span className="text-[10px] font-bold text-slate-600">{displayLimit} / {filteredCompanies.length}</span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max={Math.max(200, filteredCompanies.length)}
                  step="10"
                  value={displayLimit}
                  onChange={(e) => setDisplayLimit(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
             </div>
          </div>

          <div className="relative min-w-[280px]" ref={multiSelectRef}>
             <button 
               onClick={() => { setIsMultiSelectOpen(!isMultiSelectOpen); setCharacterFilter([]); setMultiSelectSearch(''); }}
               className="w-full flex items-center justify-between bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
             >
               <span className="truncate">
                 {selectedFilterIds.length === 0 
                    ? `All Companies (${companies.length})` 
                    : `${selectedFilterIds.length} Selected`
                 }
               </span>
               <ChevronDown className="w-4 h-4 text-slate-400" />
             </button>

             {isMultiSelectOpen && (
               <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]">
                 <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={multiSelectSearch}
                        onChange={(e) => setMultiSelectSearch(e.target.value)}
                        placeholder="Search list..." 
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                       <button 
                         onClick={() => setSelectedFilterIds(companies.map(c => c.id))}
                         className="flex-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50 py-1 rounded border border-blue-100"
                       >
                         Select All
                       </button>
                       <button 
                         onClick={() => setSelectedFilterIds([])}
                         className="flex-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 py-1 rounded border border-slate-200"
                       >
                         Clear
                       </button>
                    </div>
                 </div>
                  {availableChars.length > 10 && (
                    <div className="flex flex-wrap gap-1 p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold">
                       <button onClick={() => setCharacterFilter([])} className={`px-2 py-0.5 rounded ${characterFilter.length === 0 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>All</button>
                       {availableChars.map(char => <button key={char} onClick={() => handleCharacterFilterToggle(char)} className={`w-6 h-6 rounded ${characterFilter.includes(char) ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{char}</button>)}
                    </div>
                  )}
                 <div className="overflow-y-auto flex-1 p-1">
                   {displayedOptions.length > 0 ? (
                     <>
                       {displayedOptions.map(c => (
                         <div 
                           key={c.id} 
                           onClick={() => toggleFilterId(c.id)}
                           className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer group"
                         >
                           <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedFilterIds.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                             {selectedFilterIds.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                           </div>
                           <span className="text-sm text-slate-700 truncate">{c.name}</span>
                         </div>
                       ))}
                       {filteredOptions.length > 50 && (
                         <div className="text-[10px] text-slate-400 italic text-center py-2">
                           + {filteredOptions.length - 50} more. Refine search.
                         </div>
                       )}
                     </>
                   ) : (
                     <div className="p-4 text-center text-xs text-slate-400">No matches found</div>
                   )}
                 </div>
                 <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 text-center">
                   Showing {Math.min(filteredOptions.length, 50)} of {companies.length}
                 </div>
               </div>
             )}
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select 
              className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
            >
              {uniqueSectors.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sectors' : s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Companies Shown" 
          value={metrics.totalCompanies} 
          subtext="In active view (slider applied)"
          icon={<Layers className="w-5 h-5 text-blue-500" />}
          align="left"
          tooltip={
            <div>
              <div className="font-bold border-b border-slate-700 pb-1 mb-1">Top Sectors</div>
              {metrics.sortedSectors.slice(0, 4).map(([s, c]) => (
                <div key={s} className="flex justify-between gap-4 text-[10px] whitespace-nowrap">
                  <span>{s}:</span> <span className="font-mono text-slate-300">{c}</span>
                </div>
              ))}
              {metrics.sortedSectors.length > 4 && <div className="text-[10px] italic text-slate-400 mt-1">+ {metrics.sortedSectors.length - 4} more</div>}
            </div>
          }
        />
        <KPICard 
          title="Total Pipeline Assets" 
          value={metrics.totalPipelineAssets} 
          subtext={`Avg ${(metrics.totalPipelineAssets / (metrics.totalCompanies || 1)).toFixed(1)} per company`}
          icon={<FlaskConical className="w-5 h-5 text-indigo-500" />}
          align="center"
          tooltip={
            <div>
              <div className="font-bold border-b border-slate-700 pb-1 mb-1">Phase Breakdown</div>
              <div className="space-y-1">
                <div className="flex justify-between gap-4 text-[10px]"><span>Preclinical:</span> <span className="font-mono text-slate-300">{metrics.pipelineCounts[PipelinePhase.Preclinical]}</span></div>
                <div className="flex justify-between gap-4 text-[10px]"><span>Phase I:</span> <span className="font-mono text-slate-300">{metrics.pipelineCounts[PipelinePhase.Phase1]}</span></div>
                <div className="flex justify-between gap-4 text-[10px]"><span>Phase II:</span> <span className="font-mono text-slate-300">{metrics.pipelineCounts[PipelinePhase.Phase2]}</span></div>
                <div className="flex justify-between gap-4 text-[10px]"><span>Phase III:</span> <span className="font-mono text-slate-300">{metrics.pipelineCounts[PipelinePhase.Phase3]}</span></div>
                <div className="flex justify-between gap-4 text-[10px]"><span>Filed/Appr:</span> <span className="font-mono text-slate-300">{metrics.pipelineCounts[PipelinePhase.Filed] + metrics.pipelineCounts[PipelinePhase.Approved]}</span></div>
              </div>
            </div>
          }
        />
        <KPICard 
          title="Approved Drugs" 
          value={metrics.totalApproved} 
          subtext="Total marketed products"
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          align="right"
          tooltip={
            <div>
              <div className="font-bold border-b border-slate-700 pb-1 mb-1">Top Contributors</div>
              {metrics.topApprovedContributors.length > 0 ? (
                metrics.topApprovedContributors.map((c, i) => (
                  <div key={i} className="flex justify-between gap-4 text-[10px] whitespace-nowrap">
                    <span className="truncate max-w-[120px]">{c.name}:</span> <span className="font-mono text-slate-300">{c.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-[10px] italic text-slate-400">No approved drugs in selection</div>
              )}
            </div>
          }
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-blue-600" />
          Global Presence
        </h3>
        <CompanyMap companies={displayedCompanies} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            Pipeline Phase Distribution
          </h3>
          <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 px-2 min-h-[200px]">
            {Object.entries(metrics.pipelineCounts).map(([phase, countVal]) => {
              const count = countVal as number;
              const values = Object.values(metrics.pipelineCounts) as number[];
              const maxVal = Math.max(...values, 1);
              const heightPct = (count / maxVal) * 100;
              const pct = metrics.totalPipelineAssets > 0 ? ((count / metrics.totalPipelineAssets) * 100).toFixed(1) : 0;
              
              return (
                <div key={phase} className="flex flex-col items-center flex-1 h-full justify-end">
                  <div className="relative w-full flex justify-center items-end h-[85%]">
                    <Tooltip content={
                      <div>
                        <div className="font-bold border-b border-slate-700 pb-1 mb-1">{phase}</div>
                        <div className="flex justify-between gap-4"><span>Count:</span> <span className="font-mono">{count}</span></div>
                        <div className="flex justify-between gap-4"><span>Share:</span> <span className="font-mono">{pct}%</span></div>
                      </div>
                    } className="w-full flex justify-center h-full items-end">
                      <div 
                        style={{ height: `${heightPct}%` }} 
                        className="w-full max-w-[40px] bg-blue-500 rounded-t-sm hover:bg-blue-400 transition-all cursor-pointer relative flex items-end justify-center"
                      >
                        <span className="mb-2 text-white text-xs font-bold drop-shadow-md">
                          {count > 0 ? count : ''}
                        </span>
                      </div>
                    </Tooltip>
                  </div>
                  <div className="h-[15%] w-full flex items-center justify-center">
                     <span className="text-[10px] sm:text-xs text-slate-500 font-medium text-center leading-tight mt-2">
                       {phase.replace('Phase ', 'Ph ')}
                     </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-slate-800 font-semibold mb-6">Top Sectors</h3>
          <div className="space-y-4">
             {metrics.sortedSectors.map(([sector, count]) => {
               const maxVal = Math.max(...metrics.sortedSectors.map(([,c]) => c));
               const widthPct = (count / maxVal) * 100;
               const pct = metrics.totalCompanies > 0 ? ((count / metrics.totalCompanies) * 100).toFixed(1) : 0;

               return (
                 <div key={sector} className="group cursor-pointer">
                   <div className="flex justify-between text-sm mb-1">
                     <span className="text-slate-700 font-medium">{sector}</span>
                     <span className="text-slate-500">{count}</span>
                   </div>
                   <Tooltip content={
                      <div>
                        <div className="font-bold border-b border-slate-700 pb-1 mb-1">{sector}</div>
                        <div className="flex justify-between gap-4"><span>Companies:</span> <span className="font-mono">{count}</span></div>
                        <div className="flex justify-between gap-4"><span>Market Share:</span> <span className="font-mono">{pct}%</span></div>
                      </div>
                   } className="w-full">
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-500 h-2.5 rounded-full group-hover:bg-indigo-400 transition-colors" 
                        style={{ width: `${widthPct}%` }}
                      ></div>
                    </div>
                   </Tooltip>
                 </div>
               );
             })}
             {metrics.sortedSectors.length === 0 && <p className="text-slate-400 text-sm">No sector data available.</p>}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-slate-800 font-semibold mb-4">Trending Technologies</h3>
          <div className="flex flex-wrap gap-2">
             {metrics.sortedTech.map(([tech, count], idx) => {
               const isPopular = idx < 3;
               return (
                 <Tooltip key={tech} content={`Found in ${count} companies`}>
                   <div 
                     className={`
                       px-3 py-1.5 rounded-full border flex items-center gap-2 cursor-default
                       ${isPopular 
                         ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' 
                         : 'bg-white border-slate-200 text-slate-600 text-sm'}
                     `}
                   >
                     <span>{tech}</span>
                     <span className={`text-xs px-1.5 py-0.5 rounded-full ${isPopular ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                       {count}
                     </span>
                   </div>
                 </Tooltip>
               );
             })}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
           <div>
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <ArrowRightLeft className="w-5 h-5 text-purple-600" />
               Compare Companies
             </h2>
             <p className="text-sm text-slate-500">Select up to 4 companies to compare side-by-side</p>
           </div>
        </div>

        <div className="mb-6">
           <div className="flex flex-wrap gap-2 mb-3">
              {selectedCompIds.map(id => {
                const comp = companies.find(c => c.id === id);
                return comp ? (
                  <span key={id} className="inline-flex items-center gap-1 pl-3 pr-2 py-1 rounded-full bg-white border border-slate-300 text-sm text-slate-700 shadow-sm">
                    {comp.name}
                    <button onClick={() => toggleComparisonItem(id)} className="p-0.5 hover:bg-slate-100 rounded-full"><X className="w-3 h-3" /></button>
                  </span>
                ) : null;
              })}
              
              <div className="relative inline-block">
                <select 
                  className="appearance-none bg-blue-600 text-white pl-3 pr-8 py-1 rounded-full text-sm font-medium hover:bg-blue-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                  onChange={(e) => {
                    if(e.target.value) {
                      toggleComparisonItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={selectedCompIds.length >= 4}
                >
                  <option value="">+ Add to Compare</option>
                  {companies
                      .slice(0, 500)
                      .filter(c => !selectedCompIds.includes(c.id))
                      .sort((a,b) => a.name.localeCompare(b.name))
                      .map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)
                  }
                </select>
                <Plus className="w-3 h-3 text-white absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
           </div>
        </div>

        <div className="overflow-x-visible pb-20 bg-white rounded-lg border border-slate-200 shadow-sm">
          {selectedCompIds.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 w-48 font-medium">Metric</th>
                  {selectedCompIds.map(id => {
                     const c = companies.find(comp => comp.id === id);
                     return <th key={id} className="px-6 py-3 font-bold text-slate-800">{c?.name}</th>
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-500">HQ Location</td>
                  {selectedCompIds.map(id => <td key={id} className="px-6 py-4 text-slate-700">{companies.find(c => c.id === id)?.contact?.hqAddress}</td>)}
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-500">Sector</td>
                  {selectedCompIds.map(id => <td key={id} className="px-6 py-4 text-slate-700">{companies.find(c => c.id === id)?.sector}</td>)}
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-500">Pipeline Assets</td>
                  {selectedCompIds.map(id => {
                    const c = companies.find(c => c.id === id);
                    return (
                      <td key={id} className="px-6 py-4 text-slate-700 font-semibold cursor-help">
                        <Tooltip content={
                          <div>
                            <div className="font-bold border-b border-slate-700 pb-1 mb-1">Top Candidates</div>
                            {c?.pipeline.length ? c.pipeline.map(d => (
                              <div key={d.drugName} className="mb-0.5 text-slate-300">
                                • <a href={d.nctId ? `https://clinicaltrials.gov/study/${d.nctId}` : `https://clinicaltrials.gov/search?term=${encodeURIComponent(d.drugName + " " + c.name)}`} target="_blank" rel="noreferrer" className="hover:text-white hover:underline transition-colors">{d.drugName} ({d.phase})</a>
                              </div>
                            )) : 'No data'}
                          </div>
                        }>
                          <span className="border-b border-dashed border-slate-300">{c?.pipeline.length}</span>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-500">Approved Drugs</td>
                  {selectedCompIds.map(id => {
                     const c = companies.find(c => c.id === id);
                     return (
                      <td key={id} className="px-6 py-4 text-slate-700 font-semibold cursor-help">
                         <Tooltip content={
                            <div>
                              <div className="font-bold border-b border-slate-700 pb-1 mb-1">Approved Products</div>
                              {c?.keyApprovedDrugs.length ? c.keyApprovedDrugs.map(d => {
                                const drugBaseName = d.split('(')[0].trim();
                                return (
                                  <div key={d} className="mb-0.5 text-slate-300">
                                    • <a href={`https://www.drugs.com/search.php?searchterm=${encodeURIComponent(drugBaseName)}`} target="_blank" rel="noreferrer" className="hover:text-white hover:underline transition-colors">{d}</a>
                                  </div>
                                );
                              }) : <span className="italic text-slate-400">None listed</span>}
                            </div>
                          }>
                          <span className="border-b border-dashed border-slate-300">{c?.keyApprovedDrugs.length}</span>
                        </Tooltip>
                      </td>
                     );
                  })}
                </tr>
                <tr>
                   <td className="px-6 py-4 font-medium text-slate-500">Key Tech</td>
                   {selectedCompIds.map(id => (
                     <td key={id} className="px-6 py-4 text-slate-700">
                       <div className="flex flex-wrap gap-1">
                         {companies.find(c => c.id === id)?.keyTechnologies.slice(0,3).map(t => (
                           <span key={t} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 cursor-default">{t}</span>
                         ))}
                       </div>
                     </td>
                   ))}
                </tr>
              </tbody>
            </table>
          ) : (
             <div className="p-12 text-center text-slate-400">
                <p>Select companies from the dropdown above to start comparing.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, subtext, icon, tooltip, align }: { title: string, value: number, subtext: string, icon: React.ReactNode, tooltip?: React.ReactNode, align?: 'left'|'center'|'right' }) => (
  <Tooltip content={tooltip} className="w-full h-full" align={align}>
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-help h-full">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <p className="text-xs text-slate-400 mt-1">{subtext}</p>
    </div>
  </Tooltip>
);

export default Dashboard;
