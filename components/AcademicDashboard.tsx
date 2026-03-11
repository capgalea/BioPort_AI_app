
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CompanyData, Publication } from '../types.ts';
import { 
  Activity, Layers, 
  Search, ArrowRightLeft, X, Plus, GraduationCap, BookOpen, Users, MapPin, ChevronDown, Check, ExternalLink, Star, Award, TrendingUp, FlaskConical, Beaker, Pill, SlidersHorizontal
} from 'lucide-react';
import CompanyMap from './CompanyMap.tsx';
import HelpPopup from './HelpPopup.tsx';

interface DashboardProps {
  institutes: CompanyData[];
}

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  className = "inline-flex items-center justify-center", 
  align = 'center', 
  side = 'top' 
}) => {
  const getPositionClasses = () => {
    let classes = 'absolute ';
    
    if (side === 'top') classes += 'bottom-full pb-2 ';
    else if (side === 'bottom') classes += 'top-full pt-2 ';
    else if (side === 'left') classes += 'right-full pr-2 ';
    else if (side === 'right') classes += 'left-full pl-2 ';

    if (side === 'top' || side === 'bottom') {
      if (align === 'left') classes += 'left-0';
      else if (align === 'right') classes += 'right-0';
      else classes += 'left-1/2 -translate-x-1/2';
    } else {
      classes += 'top-1/2 -translate-y-1/2';
    }

    return classes;
  };

  const getArrowClasses = () => {
    let arrow = 'absolute border-4 border-transparent ';
    
    if (side === 'top') {
      arrow += 'top-full border-t-slate-800 ';
      if (align === 'left') arrow += 'left-6';
      else if (align === 'right') arrow += 'right-6';
      else arrow += 'left-1/2 -translate-x-1/2';
    } else if (side === 'bottom') {
      arrow += 'bottom-full border-b-slate-800 ';
      if (align === 'left') arrow += 'left-6';
      else if (align === 'right') arrow += 'right-6';
      else arrow += 'left-1/2 -translate-x-1/2';
    } else if (side === 'left') {
      arrow += 'left-full border-l-slate-800 top-1/2 -translate-y-1/2';
    } else if (side === 'right') {
      arrow += 'right-full border-r-slate-800 top-1/2 -translate-y-1/2';
    }

    return arrow;
  };

  return (
    <div className={`group relative ${className}`}>
      {children}
      <div className={`${getPositionClasses()} hidden group-hover:block z-[100] w-max max-w-[280px]`}>
        <div className="bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl text-left animate-in fade-in zoom-in-95 duration-200 relative">
          {content}
          <div className="absolute border-4 border-transparent border-t-slate-800"></div>
        </div>
      </div>
    </div>
  );
};

const AcademicDashboard: React.FC<DashboardProps> = ({ institutes = [] }) => {
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState<number>(200);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [multiSelectSearch, setMultiSelectSearch] = useState('');
  const [characterFilter, setCharacterFilter] = useState<string[]>([]);
  const multiSelectRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (multiSelectRef.current && !multiSelectRef.current.contains(event.target as Node)) {
        setIsMultiSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredInstitutes = useMemo(() => {
    return (institutes || []).filter(c => 
      selectedFilterIds.length === 0 || selectedFilterIds.includes(c.id)
    );
  }, [institutes, selectedFilterIds]);

  const displayedInstitutes = useMemo(() => {
    return filteredInstitutes.slice(0, displayLimit);
  }, [filteredInstitutes, displayLimit]);

  const metrics = useMemo(() => {
    const totalInstitutes = displayedInstitutes.length;
    let totalPublications = 0;
    let totalFaculty = 0;
    const facultySample: {name: string, title: string, bio?: string, institution: string}[] = [];
    
    const highImpactKeywords = ['nature', 'science', 'cell', 'lancet', 'nejm', 'jama', 'new england journal', 'pnas', 'blood', 'cancer', 'immunity', 'neuron', 'clinical oncology', 'chem'];
    let highImpactCount = 0;
    const allPubs: (Publication & { isHighImpact: boolean })[] = [];

    const areaCounts: Record<string, number> = {};
    
    displayedInstitutes.forEach(inst => {
      const pubs = inst.scientificPublications || [];
      totalPublications += pubs.length;
      
      if (inst.keyResearchers) {
        totalFaculty += inst.keyResearchers.length;
        inst.keyResearchers.forEach(r => facultySample.push({ ...r, institution: inst.name }));
      }
      
      pubs.forEach(pub => {
         const sourceLower = pub.source ? pub.source.toLowerCase() : '';
         const isHighImpact = highImpactKeywords.some(k => sourceLower.includes(k));
         if (isHighImpact) {
             highImpactCount++;
         }
         allPubs.push({ ...pub, isHighImpact });
      });

      (inst.keyTechnologies || []).forEach(tech => {
        areaCounts[tech] = (areaCounts[tech] || 0) + 1;
      });
    });

    const sortedAreas = Object.entries(areaCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    const topPipelineLeaders = displayedInstitutes
      .map(i => {
        const total = (i.keyApprovedDrugs?.length || 0) + (i.pipeline?.length || 0);
        return { name: i.name, count: total, company: i };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    const highImpactPercentage = totalPublications > 0 ? ((highImpactCount / totalPublications) * 100).toFixed(1) : "0.0";

    const displayPubs = allPubs
      .sort((a, b) => {
        if (a.isHighImpact !== b.isHighImpact) return a.isHighImpact ? -1 : 1;
        return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      })
      .slice(0, 25);

    return {
      totalInstitutes,
      totalPublications,
      totalFaculty,
      sortedAreas,
      topPipelineLeaders,
      highImpactCount,
      highImpactPercentage,
      displayPubs,
      facultySample: facultySample.sort(() => 0.5 - Math.random()).slice(0, 8),
      institutesList: displayedInstitutes.slice(0, 10).map(i => i.name)
    };
  }, [displayedInstitutes]);

  const toggleComparisonItem = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds(prev => [...prev, id]);
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
    const chars = new Set((institutes || []).map(c => c.name[0]?.toUpperCase()).filter(Boolean));
    return Array.from(chars).sort();
  }, [institutes]);

  const filteredOptions = useMemo(() => {
    return (institutes || [])
      .filter(c =>
        (characterFilter.length === 0 || (c.name[0] && characterFilter.includes(c.name[0].toUpperCase()))) &&
        c.name.toLowerCase().includes(multiSelectSearch.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [institutes, multiSelectSearch, characterFilter]);

  const displayedOptions = filteredOptions.slice(0, 50);

  if (!institutes || institutes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <GraduationCap className="w-12 h-12 mb-4 opacity-50" />
        <p>No academic institutions found. Search for universities to generate the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-16 z-20">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            Academic Dashboard
            <HelpPopup 
              title="Academic Insights" 
              content="Track research output, key faculty members, and publication trends across universities and institutes. Use the multi-select dropdown to isolate specific institutions." 
            />
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
           
           <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg min-w-[200px] w-full sm:w-auto">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col flex-1">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Analytics Limit</span>
                    <span className="text-[10px] font-bold text-slate-600">{displayLimit} / {filteredInstitutes.length}</span>
                 </div>
                 <input 
                   type="range"
                   min="10"
                   max={Math.max(200, filteredInstitutes.length)}
                   step="10"
                   value={displayLimit}
                   onChange={(e) => setDisplayLimit(parseInt(e.target.value))}
                   className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                 />
              </div>
           </div>

           <div className="relative min-w-[280px]" ref={multiSelectRef}>
             <button 
               onClick={() => { setIsMultiSelectOpen(!isMultiSelectOpen); setCharacterFilter([]); setMultiSelectSearch(''); }}
               className="w-full flex items-center justify-between bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 hover:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm"
             >
               <span className="truncate">
                 {selectedFilterIds.length === 0 
                    ? `All Institutes (${institutes.length})` 
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
                        placeholder="Search..." 
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                       <button 
                         onClick={() => setSelectedFilterIds(institutes.map(c => c.id))}
                         className="flex-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 py-1 rounded border border-emerald-100"
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
                       <button onClick={() => setCharacterFilter([])} className={`px-2 py-0.5 rounded ${characterFilter.length === 0 ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>All</button>
                       {availableChars.map(char => <button key={char} onClick={() => handleCharacterFilterToggle(char)} className={`w-6 h-6 rounded ${characterFilter.includes(char) ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{char}</button>)}
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
                           <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedFilterIds.includes(c.id) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white group-hover:border-emerald-400'}`}>
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
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Institutions" 
          value={metrics.totalInstitutes} 
          subtext="Tracked Centers (Limited View)" 
          icon={<Layers className="w-5 h-5 text-emerald-500" />} 
          align="left" 
          tooltip={
            <div>
              <div className="font-bold border-b border-slate-600 pb-1 mb-2 text-emerald-400">Database Institutes</div>
              <div className="space-y-1">
                {metrics.institutesList.map((name, i) => (
                  <div key={i} className="text-[10px] text-slate-200 truncate flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    {name}
                  </div>
                ))}
                {metrics.totalInstitutes > 10 && (
                  <div className="text-[9px] text-slate-400 mt-1 italic">
                    + {metrics.totalInstitutes - 10} more in view
                  </div>
                )}
              </div>
            </div>
          }
        />
        <KPICard 
          title="Tracked Faculty" 
          value={metrics.totalFaculty} 
          subtext="Principal Investigators" 
          icon={<Users className="w-5 h-5 text-blue-500" />} 
          align="center" 
          tooltip={
            <div>
              <div className="font-bold border-b border-slate-600 pb-1 mb-2 text-blue-300">Sample Principal Investigators</div>
              <div className="space-y-2">
                {metrics.facultySample.map((f, i) => {
                  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(f.name + " " + f.institution)}`;
                  return (
                    <div key={i} className="group/item">
                      <a 
                        href={searchUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="block hover:bg-slate-700 p-1.5 rounded -mx-1.5 border border-transparent hover:border-slate-600"
                      >
                        <div className="text-[10px] font-bold text-slate-100 group-hover/item:text-blue-300 transition-colors flex items-center justify-between">
                          {f.name}
                          <ExternalLink className="w-2.5 h-2.5 opacity-30 group-hover/item:opacity-100" />
                        </div>
                        <div className="text-[9px] text-slate-400 truncate mb-1">{f.institution}</div>
                        {f.bio && (
                          <div className="text-[8px] text-slate-300 leading-tight italic opacity-70 group-hover/item:opacity-100 line-clamp-2">
                             "{f.bio}"
                          </div>
                        )}
                      </a>
                    </div>
                  );
                })}
                {metrics.totalFaculty > 8 && (
                   <div className="text-[9px] text-slate-500 mt-1 text-center">Random sample shown</div>
                )}
              </div>
            </div>
          }
        />
        <KPICard 
          title="Recent Publications" 
          value={metrics.totalPublications} 
          subtext={
            <Tooltip 
              side="left" 
              content="High impact is defined as publications in top-tier journals (Nature, Science, Cell, NEJM, Lancet, etc.) signifying global scientific leadership."
            >
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 flex items-center gap-1 text-[10px] cursor-help transition-colors hover:bg-emerald-100">
                <Star className="w-3 h-3 fill-emerald-600" /> {metrics.highImpactPercentage}% High Impact
              </span>
            </Tooltip>
          }
          icon={<BookOpen className="w-5 h-5 text-purple-500" />}
          align="right"
          side="bottom" 
          tooltip={
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="font-bold border-b border-slate-600 pb-1 mb-2 text-purple-300 flex items-center justify-between">
                <span>Recent Output</span>
                <span className="text-[8px] opacity-60">High impact highlighted</span>
              </div>
              <div className="space-y-3">
                {metrics.displayPubs.map((pub, i) => {
                    const source = pub.source || '';
                    const isNews = /news|press|wire|daily|times|post|herald|gazette|reuters|bloomberg|forbes|cnbc|techcrunch|fierce|biospace|stat|endpoints|marketwatch|yahoo|seeking alpha|fool|biocentury|bioworld|wsj|wall street|website|release|blog|report|update|announcement|statement|\.com|\.org|\.edu|\.gov|http|popular/i.test(source);
                    const isScientific = /journal|nature|cell|lancet|nejm|jama|pnas|blood|cancer|neuron|immunity|chem|bio|med|clin|phys|pharm|rev|proc|annals|arch|trans|letter|frontiers|bmc|plos/i.test(source);
                    
                    const usePubMed = isScientific && !isNews;
                    const safeUrl = pub.url && pub.url.length > 5 ? (pub.url.startsWith('http') ? pub.url : `https://${pub.url}`) : (usePubMed ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(pub.title)}` : `https://www.google.com/search?q=${encodeURIComponent(pub.title + " " + source)}`);
                    
                    return (
                      <div key={i} className={`group/item p-2 rounded -mx-1 border flex flex-col gap-1 transition-colors ${pub.isHighImpact ? 'bg-emerald-900/40 border-emerald-500/30' : 'bg-slate-700/30 border-transparent hover:bg-slate-700'}`}>
                        <a href={safeUrl} target="_blank" rel="noreferrer" className="block flex-1 group cursor-pointer">
                          <div className={`text-[10px] font-bold leading-tight transition-colors ${pub.isHighImpact ? 'text-emerald-200' : 'text-slate-100 group-hover:text-purple-300'}`}>
                            {pub.title}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className={`text-[9px] font-medium ${pub.isHighImpact ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {pub.source} ({pub.year})
                            </div>
                            {pub.citations !== undefined && (
                               <div className={`text-[9px] font-black px-1.5 py-0.5 rounded border flex items-center gap-1 transition-colors ${pub.isHighImpact ? 'bg-emerald-800/50 border-emerald-400 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
                                  <Star className={`w-2.5 h-2.5 ${pub.isHighImpact ? 'fill-emerald-400' : 'fill-current'}`} />
                                  {pub.citations} citations
                               </div>
                            )}
                          </div>
                        </a>
                      </div>
                    );
                })}
                {metrics.totalPublications > metrics.displayPubs.length && (
                  <div className="text-[9px] text-slate-500 text-center py-1">
                    + {metrics.totalPublications - metrics.displayPubs.length} more publications
                  </div>
                )}
              </div>
            </div>
          }
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-slate-800 font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" /> Network Map</h3>
        <CompanyMap companies={displayedInstitutes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
             <Activity className="w-4 h-4 text-slate-400" />
             Research Focus Areas
          </h3>
          <div className="space-y-4">
             {metrics.sortedAreas.map(([area, count]) => {
               const maxVal = Math.max(...metrics.sortedAreas.map(([,c]) => c));
               const widthPct = (count / maxVal) * 100;
               return (
                 <div key={area} className="group cursor-pointer">
                   <div className="flex justify-between text-sm mb-1">
                     <span className="text-slate-700 font-medium">{area}</span>
                     <span className="text-slate-500">{count}</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div 
                        className="bg-emerald-500 h-2.5 rounded-full group-hover:bg-emerald-400 transition-colors" 
                        style={{ width: `${widthPct}%` }}
                      ></div>
                   </div>
                 </div>
               );
             })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="text-slate-800 font-semibold mb-6 flex items-center gap-2">
             <Beaker className="w-4 h-4 text-emerald-600" />
             Translational Pipelines
           </h3>
           <div className="space-y-3">
              {metrics.topPipelineLeaders.map((item, idx) => {
                const c = item.company;
                return (
                  <Tooltip 
                    key={idx}
                    side="left"
                    align="center"
                    content={
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        <div className="font-bold border-b border-slate-700 pb-1 mb-2 text-emerald-400">Active Therapies</div>
                        {c?.keyApprovedDrugs && c.keyApprovedDrugs.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[9px] font-black uppercase text-emerald-500 mb-1">Developed / Marketed</div>
                            {c.keyApprovedDrugs.map((d, idx) => (
                              <div key={idx} className="text-[10px] text-slate-200 mb-0.5 flex items-center gap-1.5">
                                 <Pill className="w-2.5 h-2.5 shrink-0 opacity-50" />
                                 <a href={`https://www.google.com/search?q=${encodeURIComponent(d + " " + c.name)}`} target="_blank" rel="noreferrer" className="hover:text-emerald-300 hover:underline transition-all truncate">{d}</a>
                              </div>
                            ))}
                          </div>
                        )}
                        {c?.pipeline && c.pipeline.length > 0 ? (
                          <div>
                            <div className="text-[9px] font-black uppercase text-blue-400 mb-1">Clinical Pipeline</div>
                            {c.pipeline.map((p, idx) => {
                              const displayId = p.nctId ? p.nctId.trim().toUpperCase() : null;
                              const registryUrl = displayId 
                                 ? `https://clinicaltrials.gov/study/${displayId}` 
                                 : `https://clinicaltrials.gov/search?term=${encodeURIComponent(p.drugName + " " + c.name)}`;
                              return (
                                <div key={idx} className="text-[10px] text-slate-200 mb-1 group/p">
                                   <div className="flex items-center gap-1.5 font-bold">
                                      <Beaker className="w-2.5 h-2.5 shrink-0 opacity-50" />
                                      <a href={registryUrl} target="_blank" rel="noreferrer" className="hover:text-blue-300 hover:underline transition-all truncate">{p.drugName}</a>
                                   </div>
                                   <div className="text-[9px] text-slate-400 ml-4 italic">{p.indication} ({p.phase})</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          !c?.keyApprovedDrugs?.length && <div className="text-[10px] italic text-slate-500">No therapy data tracked</div>
                        )}
                      </div>
                    }
                  >
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-emerald-200 transition-colors w-full cursor-help">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                             {idx + 1}
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{item.name}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          <span className="text-sm font-bold text-slate-700">{item.count}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Assets</span>
                       </div>
                    </div>
                  </Tooltip>
                );
              })}
              {metrics.topPipelineLeaders.length === 0 && (
                <div className="p-12 text-center text-xs text-slate-400 italic">No pipeline or therapy data identified for these institutions.</div>
              )}
           </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
           <div>
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
               Compare Institutes
             </h2>
             <p className="text-sm text-slate-500">Select up to 4 institutes to compare side-by-side</p>
           </div>
        </div>

        <div className="mb-6">
           <div className="flex flex-wrap gap-2 mb-3">
              {selectedIds.map(id => {
                  const inst = (institutes || []).find(c => c.id === id);
                  return inst ? (
                    <span key={id} className="inline-flex items-center gap-1 pl-3 pr-2 py-1 rounded-full bg-white border border-slate-300 text-sm text-slate-700 shadow-sm">
                      {inst.name}
                      <button onClick={() => toggleComparisonItem(id)} className="p-0.5 hover:bg-slate-100 rounded-full"><X className="w-3 h-3" /></button>
                    </span>
                  ) : null;
              })}
              
              <div className="relative inline-block">
                <select 
                  className="appearance-none bg-emerald-600 text-white pl-3 pr-8 py-1 rounded-full text-sm font-medium hover:bg-emerald-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500"
                  onChange={(e) => {
                    if(e.target.value) {
                      toggleComparisonItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={selectedIds.length >= 4}
                >
                  <option value="">+ Add to Compare</option>
                  {(institutes || [])
                    .slice(0, 500)
                    .filter(c => !selectedIds.includes(c.id))
                    .sort((a,b) => a.name.localeCompare(b.name))
                    .map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)
                  }
                </select>
                <Plus className="w-3 h-3 text-white absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
           </div>
        </div>

        <div className="overflow-x-visible pb-12 bg-white rounded-lg border border-slate-200 shadow-sm">
          {selectedIds.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 w-48 font-medium">Metric</th>
                  {selectedIds.map(id => {
                     const i = (institutes || []).find(inst => inst.id === id);
                     return <th key={id} className="px-6 py-3 font-bold text-slate-800">{i?.name}</th>
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-500">Location</td>
                  {selectedIds.map(id => <td key={id} className="px-6 py-4 text-slate-700">{(institutes || []).find(c => c.id === id)?.contact.hqAddress}</td>)}
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-500">Tracked Faculty</td>
                  {selectedIds.map(id => {
                     const c = (institutes || []).find(inst => inst.id === id);
                     const researcherCount = c?.keyResearchers ? c.keyResearchers.length : 0;
                     return (
                      <td key={id} className="px-6 py-4 text-slate-700 font-semibold cursor-help">
                         <Tooltip content={
                            <div>
                              <div className="font-bold border-b border-slate-700 pb-1 mb-1">Key Faculty</div>
                              {c?.keyResearchers && c.keyResearchers.length > 0 ? (
                                c.keyResearchers.map((r, idx) => (
                                  <div key={idx} className="mb-2 text-slate-300 truncate max-w-[200px]">
                                     <div className="font-bold">• {r.name}</div>
                                     {r.bio && <div className="text-[9px] italic ml-3 opacity-80 leading-snug">"{r.bio}"</div>}
                                  </div>
                                ))
                              ) : (
                                <span className="italic text-slate-400">None listed</span>
                              )}
                            </div>
                         }>
                           <span className="border-b border-dashed border-slate-300">{researcherCount}</span>
                         </Tooltip>
                      </td>
                     );
                  })}
                </tr>
                <tr>
                   <td className="px-6 py-4 font-medium text-slate-500">Translational Pipelines</td>
                   {selectedIds.map(id => {
                     const c = (institutes || []).find(inst => inst.id === id);
                     const total = (c?.keyApprovedDrugs?.length || 0) + (c?.pipeline?.length || 0);
                     return (
                       <td key={id} className="px-6 py-4 text-slate-700 font-semibold cursor-help">
                         <Tooltip content={
                           <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                             <div className="font-bold border-b border-slate-700 pb-1 mb-2 text-emerald-400">Active Therapies</div>
                             {c?.keyApprovedDrugs && c.keyApprovedDrugs.length > 0 && (
                               <div className="mb-3">
                                 <div className="text-[9px] font-black uppercase text-emerald-500 mb-1">Developed / Marketed</div>
                                 {c.keyApprovedDrugs.map((d, idx) => (
                                   <div key={idx} className="text-[10px] text-slate-200 mb-0.5 flex items-center gap-1.5">
                                      <Pill className="w-2.5 h-2.5 shrink-0 opacity-50" />
                                      <a href={`https://www.google.com/search?q=${encodeURIComponent(d + " " + c.name)}`} target="_blank" rel="noreferrer" className="hover:text-emerald-300 hover:underline transition-all truncate">{d}</a>
                                   </div>
                                 ))}
                               </div>
                             )}
                             {c?.pipeline && c.pipeline.length > 0 ? (
                               <div>
                                 <div className="text-[9px] font-black uppercase text-blue-400 mb-1">Clinical Pipeline</div>
                                 {c.pipeline.map((p, idx) => {
                                   const displayId = p.nctId ? p.nctId.trim().toUpperCase() : null;
                                   const registryUrl = displayId 
                                      ? `https://clinicaltrials.gov/study/${displayId}` 
                                      : `https://clinicaltrials.gov/search?term=${encodeURIComponent(p.drugName + " " + c.name)}`;
                                   return (
                                     <div key={idx} className="text-[10px] text-slate-200 mb-1 group/p">
                                        <div className="flex items-center gap-1.5 font-bold">
                                           <Beaker className="w-2.5 h-2.5 shrink-0 opacity-50" />
                                           <a href={registryUrl} target="_blank" rel="noreferrer" className="hover:text-blue-300 hover:underline transition-all truncate">{p.drugName}</a>
                                        </div>
                                        <div className="text-[9px] text-slate-400 ml-4 italic">{p.indication} ({p.phase})</div>
                                     </div>
                                   );
                                 })}
                               </div>
                             ) : (
                               !c?.keyApprovedDrugs?.length && <div className="text-[10px] italic text-slate-500">No therapy data tracked</div>
                             )}
                           </div>
                         }>
                           <span className="border-b border-dashed border-slate-300">{total} Assets</span>
                         </Tooltip>
                       </td>
                     );
                   })}
                </tr>
                <tr>
                   <td className="px-6 py-4 font-medium text-slate-500">Research Focus</td>
                   {selectedIds.map(id => (
                     <td key={id} className="px-6 py-4 text-slate-700">
                       <div className="flex flex-wrap gap-1">
                         {(institutes || []).find(c => c.id === id)?.keyTechnologies.slice(0,4).map(t => (
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
                <p>Select institutes from the dropdown above to start comparing.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, subtext, icon, tooltip, align, side = 'bottom' }: { title: string, value: number, subtext: React.ReactNode, icon: React.ReactNode, tooltip?: React.ReactNode, align?: 'left'|'center'|'right', side?: 'top'|'bottom'|'left'|'right' }) => (
  <Tooltip content={tooltip} className="w-full h-full" align={align} side={side}>
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-help h-full flex flex-col justify-between">
      <div><div className="flex justify-between items-start mb-2"><h3 className="text-slate-500 text-sm font-medium">{title}</h3>{icon}</div><div className="text-3xl font-bold text-slate-900">{value}</div></div>
      <div className="text-xs text-slate-400 mt-1">{subtext}</div>
    </div>
  </Tooltip>
);

export default AcademicDashboard;
