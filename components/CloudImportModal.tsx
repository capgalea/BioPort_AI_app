
import React, { useState, useEffect, useRef, useMemo } from 'react';
import posthog from 'posthog-js';
import { X, CloudLightning, Search, Loader2, CheckCircle2, MapPin, Building2, Calendar, Move, Filter, Download, ListFilter, Database, ChevronRight, Info } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { CompanyData } from '../types';
import MultiSelect from './MultiSelect';

interface CloudImportModalProps {
  onClose: () => void;
  onImport: (companies: CompanyData[]) => void;
  initialQuery?: string;
  limit?: number;
  availableSectors?: string[];
}

// Helper to extract country from address
const getCountry = (address?: string) => {
  if (!address) return 'Unknown';
  const parts = address.split(',');
  return parts[parts.length - 1].trim();
};

const CloudImportModal: React.FC<CloudImportModalProps> = ({ onClose, onImport, initialQuery = '', limit = 50, availableSectors }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchLimit, setSearchLimit] = useState(limit);
  const [totalDbCount, setTotalDbCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [importProgress, setImportProgress] = useState<string>('');
  
  // Virtualization / Pagination for DOM performance
  const [renderLimit, setRenderLimit] = useState(100);
  
  // Filter States - Default to TRUE so filters are immediately accessible
  const [showFilters, setShowFilters] = useState(true);
  const [filterNames, setFilterNames] = useState<string[]>([]);
  const [filterSectors, setFilterSectors] = useState<string[]>([]);
  const [filterCountries, setFilterCountries] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterDiseases, setFilterDiseases] = useState<string[]>([]);

  // Dragging logic
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Core Search Logic decoupled from event handlers
  const executeSearch = async (searchQuery: string, limitVal: number) => {
    setIsLoading(true);
    setProgress('');
    try {
      // Split query by commas/newlines to support list searching
      // Note: If using prefixes like "sector: ...", we assume the user intends a single query or a list of specific queries.
      const terms = searchQuery.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
      
      let data: any[] = [];
      if (terms.length <= 1) {
         // Single search (standard)
         data = await supabaseService.searchCompanyMetadata(searchQuery, limitVal, (curr, total) => {
             setProgress(`${curr} found...`);
         });
      } else {
         // Batch search for list with Concurrency Control
         const limitPerTerm = Math.max(5, Math.floor(limitVal / terms.length));
         const BATCH_SIZE = 5;
         const allResults: any[] = [];
         
         for (let i = 0; i < terms.length; i += BATCH_SIZE) {
            const chunk = terms.slice(i, i + BATCH_SIZE);
            setProgress(`Scanning batch ${Math.ceil((i + 1) / BATCH_SIZE)} of ${Math.ceil(terms.length / BATCH_SIZE)}...`);
            
            const chunkPromises = chunk.map(term => supabaseService.searchCompanyMetadata(term, limitPerTerm));
            const chunkData = await Promise.all(chunkPromises);
            chunkData.forEach(arr => allResults.push(...arr));
         }
         
         // Deduplicate results by ID
         const uniqueMap = new Map();
         allResults.forEach(item => {
            uniqueMap.set(item.id, item);
         });
         data = Array.from(uniqueMap.values());
      }

      setResults(data);
      // Reset selection on new search to avoid confusion
      setSelectedIds(new Set<string>());

      // Fire the event AFTER results return (confirms search completed)
      posthog.capture('patent_search_performed', {
        query_length: searchQuery.length,
        result_count: data.length,
        source: 'cloud_repository',
        has_filters: (filterNames.length + filterSectors.length + filterCountries.length + filterTypes.length + filterDiseases.length) > 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  useEffect(() => {
    setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    executeSearch(initialQuery, limit); // Auto-search on open
    supabaseService.getRecordCount().then(setTotalDbCount);
  }, []);

  // Reset filters and render limit on new search results
  useEffect(() => {
    setFilterNames([]);
    setFilterSectors([]);
    setFilterCountries([]);
    setFilterTypes([]);
    setFilterDiseases([]);
    setRenderLimit(100);
  }, [results]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(query, searchLimit);
  };

  const handleLoadAll = () => {
    setQuery('');
    setSearchLimit(100000);
    executeSearch('', 100000);
  };

  // Compute Options based on current results
  const options = useMemo(() => {
    const names = new Set<string>();
    const sectors = new Set<string>();
    const countries = new Set<string>();
    const types = new Set<string>();
    const diseases = new Set<string>();

    results.forEach(r => {
      if (r.name) names.add(r.name);
      if (r.sector) sectors.add(r.sector);
      if (r.hqAddress) countries.add(getCountry(r.hqAddress));
      if (r.type) types.add(r.type);
      if (r.fullData?.pipeline) {
        r.fullData.pipeline.forEach((p: any) => {
          if (p.indication) diseases.add(p.indication);
        });
      }
    });

    const toOption = (v: string) => ({ id: v, label: v });

    return {
      names: Array.from(names).sort().map(toOption),
      sectors: availableSectors && availableSectors.length > 0 ? availableSectors.map(toOption) : Array.from(sectors).sort().map(toOption),
      countries: Array.from(countries).sort().map(toOption),
      types: Array.from(types).sort().map(toOption),
      diseases: Array.from(diseases).sort().map(toOption),
    };
  }, [results, availableSectors]);

  // Filter Logic
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (filterNames.length && !filterNames.includes(r.name)) return false;
      if (filterSectors.length && !filterSectors.includes(r.sector)) return false;
      if (filterCountries.length) {
        const country = getCountry(r.hqAddress);
        if (!filterCountries.includes(country)) return false;
      }
      if (filterTypes.length && !filterTypes.includes(r.type)) return false;
      if (filterDiseases.length) {
        const rDiseases = r.fullData?.pipeline?.map((p: any) => p.indication) || [];
        if (!filterDiseases.some(d => rDiseases.includes(d))) return false;
      }
      return true;
    });
  }, [results, filterNames, filterSectors, filterCountries, filterTypes, filterDiseases]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAllFiltered = () => {
    const allSelected = filteredResults.length > 0 && filteredResults.every(r => selectedIds.has(r.id));
    const newSet = new Set(selectedIds);
    
    filteredResults.forEach(r => {
      if (allSelected) {
        newSet.delete(r.id);
      } else {
        newSet.add(r.id);
      }
    });
    setSelectedIds(newSet);
  };

  const handleImport = async () => {
    if (isImporting) return;
    setIsImporting(true);
    setImportProgress('');
    try {
      const idsToImport = Array.from(selectedIds) as string[];
      const fullCompanies = await supabaseService.getCompaniesByIds(idsToImport, (curr, total) => {
          setImportProgress(`${curr} / ${total}`);
      });
      onImport(fullCompanies);
      onClose();
    } catch (err) {
      console.error("Import failed", err);
      alert("Failed to retrieve full data for selected items.");
    } finally {
      setIsImporting(false);
      setImportProgress('');
    }
  };

  // Draggable logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPos({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
      };
      setIsDragging(true);
    }
  };

  const activeFilterCount = filterNames.length + filterSectors.length + filterCountries.length + filterTypes.length + filterDiseases.length;
  const displaySubset = filteredResults.slice(0, renderLimit);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        style={{ 
          left: pos.x, 
          top: pos.y, 
          transform: 'translate(-50%, -50%)',
          position: 'fixed'
        }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 select-none"
      >
        {/* Header */}
        <div 
          onMouseDown={handleDragStart}
          className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center cursor-move active:cursor-grabbing hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3 pointer-events-none">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Cloud Repository Browser</h2>
              <div className="flex items-center gap-3">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Move className="w-2.5 h-2.5" /> Hold to Move
                </div>
                {totalDbCount !== null && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 rounded-full border border-indigo-200">
                    <Database className="w-3 h-3 text-indigo-600" />
                    <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">
                      {totalDbCount.toLocaleString()} Total Records
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button 
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filter Toggle */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-4">
           <div className="flex gap-4 items-center flex-wrap">
             <form onSubmit={handleSearch} className="flex-1 flex gap-2 min-w-[200px]">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                     type="text"
                     name="cloudSearch"
                     autoComplete="on"
                     value={query}
                     onChange={(e) => setQuery(e.target.value)}
                     placeholder="Search names, or use 'sector: Biotechnology'..."
                     className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-slate-900"
                     autoFocus
                   />
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
                   <span className="text-[10px] font-black text-slate-400 uppercase mr-2 whitespace-nowrap">Fetch Limit:</span>
                   <select 
                     value={searchLimit} 
                     onChange={(e) => setSearchLimit(Number(e.target.value))}
                     className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none h-full py-2 cursor-pointer"
                   >
                     <option value={100}>100</option>
                     <option value={500}>500</option>
                     <option value={1000}>1K</option>
                     <option value={5000}>5K</option>
                     <option value={100000}>All</option>
                   </select>
                </div>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                >
                  Search
                </button>
                <button 
                  type="button" 
                  onClick={handleLoadAll}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm whitespace-nowrap flex items-center gap-2"
                >
                  <Database className="w-3.5 h-3.5" />
                  Load All
                </button>
             </form>
             <button 
               onClick={() => setShowFilters(!showFilters)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all h-10 ${showFilters || activeFilterCount > 0 ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
             >
               <ListFilter className="w-4 h-4" />
               Filters
               {activeFilterCount > 0 && <span className="bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px]">{activeFilterCount}</span>}
             </button>
           </div>

           <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium px-1">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                Search by name (default). To filter, use prefixes: <strong>sector:</strong>, <strong>country:</strong>, or <strong>companies:</strong> (e.g. "sector: Biotechnology", "companies: 360bio").
              </span>
           </div>

           {/* Filter Panel - Integrated Layout */}
           {showFilters && (
             <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar animate-in slide-in-from-top-2 fade-in">
                <MultiSelect label="Companies" options={options.names} selectedIds={filterNames} onChange={setFilterNames} placeholder="All Companies" />
                <MultiSelect label="Sectors" options={options.sectors} selectedIds={filterSectors} onChange={setFilterSectors} placeholder="All Sectors" />
                <MultiSelect label="Disease Area" options={options.diseases} selectedIds={filterDiseases} onChange={setFilterDiseases} placeholder="All Indications" />
                <MultiSelect label="Country (HQ)" options={options.countries} selectedIds={filterCountries} onChange={setFilterCountries} placeholder="All Countries" />
                <MultiSelect label="Entity Type" options={options.types} selectedIds={filterTypes} onChange={setFilterTypes} placeholder="All Types" />
             </div>
           )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 relative custom-scrollbar">
           {isLoading ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
               <p className="text-xs font-bold uppercase tracking-widest">Querying Cloud Nodes...</p>
               {progress && <p className="text-[10px] text-indigo-500 mt-2 font-mono">{progress}</p>}
             </div>
           ) : filteredResults.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400 opacity-60">
               <CloudLightning className="w-12 h-12 mb-3" />
               <p className="text-sm font-medium">No records found matching criteria.</p>
               {results.length > 0 && <p className="text-xs mt-2">Try clearing your filters.</p>}
             </div>
           ) : (
             <div className="space-y-2">
                <div className="flex items-center justify-between px-2 mb-2 sticky top-0 bg-slate-50/95 backdrop-blur py-2 z-10 border-b border-slate-200">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredResults.length} Matches Found</span>
                     {results.length !== filteredResults.length && <span className="text-[10px] text-slate-400">({results.length} total)</span>}
                   </div>
                   <button onClick={selectAllFiltered} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                     {filteredResults.length > 0 && filteredResults.every(r => selectedIds.has(r.id)) ? 'Deselect All' : 'Select All Visible'}
                   </button>
                </div>
                {displaySubset.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => toggleSelection(item.id)}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer group ${selectedIds.has(item.id) ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}
                  >
                     <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${selectedIds.has(item.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                        {selectedIds.has(item.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <h4 className={`font-bold text-sm truncate ${selectedIds.has(item.id) ? 'text-indigo-900' : 'text-slate-800'}`}>{item.name}</h4>
                           <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${item.type === 'Corporate' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                             {item.type === 'Corporate' ? 'Corp' : 'Acad'}
                           </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                           <div className="flex items-center gap-1 truncate"><Building2 className="w-3 h-3" /> {item.sector}</div>
                           <div className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {getCountry(item.hqAddress)}</div>
                        </div>
                     </div>
                     <div className="text-[9px] text-slate-400 font-mono hidden sm:block shrink-0">
                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(item.lastUpdated).toLocaleDateString()}</div>
                     </div>
                  </div>
                ))}
                
                {filteredResults.length > renderLimit && (
                  <button 
                    onClick={() => setRenderLimit(prev => prev + 100)}
                    className="w-full py-3 mt-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Show More Results ({filteredResults.length - renderLimit} remaining)
                  </button>
                )}
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
           <div className="text-xs font-medium text-slate-500">
              <span className="font-bold text-slate-900">{selectedIds.size}</span> items selected
           </div>
           <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleImport}
                disabled={selectedIds.size === 0 || isImporting}
                className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                {isImporting ? (importProgress ? `Loading ${importProgress}` : 'Retrieving Data...') : 'Import Selected'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CloudImportModal;
