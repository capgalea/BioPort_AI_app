
import React, { useState, useEffect, useRef } from 'react';
import { Pill, Search, Loader2, FlaskConical, Dna, Activity, Building2, BookOpen, ExternalLink, Microscope, AlertTriangle, CheckCircle2, AlertCircle, FileText, Calendar, LayoutGrid, List as ListIcon, Columns, X, MousePointerClick, BoxSelect, Box, Trash2 } from 'lucide-react';
import { performDrugDeepSearch } from '../services/geminiService';
import { DrugDeepDive } from '../types';
import Tooltip from './Tooltip';
import DrugResultsTable from "./DrugResultsTable";
import DrugComparisonModal from './DrugComparisonModal';
import DrugDetailModal from './DrugDetailModal';
import MolecularViewerModal from './MolecularViewerModal';

const DrugSearchView: React.FC = () => {
  const [query, setQuery] = useState(() => localStorage.getItem('bioport_drug_search_query') || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<(DrugDeepDive & { id: string })[]>(() => {
    const saved = localStorage.getItem('bioport_drug_search_results');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('bioport_drug_search_results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    localStorage.setItem('bioport_drug_search_query', query);
  }, [query]);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [selectedDrugForDetail, setSelectedDrugForDetail] = useState<(DrugDeepDive & { id: string }) | null>(null);
  const [progress, setProgress] = useState<{current: number, total: number, message: string} | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // State for active 3D molecular viewers
  const [active3DViewers, setActive3DViewers] = useState<(DrugDeepDive & { id: string; zIndex: number })[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(100);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Improved parsing logic to handle common bullet points (*, -, •) and various delimiters
    const drugNames = query
      .split(/[\n,;*•]+/)
      .map(name => name.trim().replace(/^[*•-]\s*/, ''))
      .filter(Boolean);

    if (drugNames.length === 0) {
      setError("Please enter one or more drug names or disease conditions.");
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setResults([]);
    setSelectedIds(new Set());
    setProgress({ current: 0, total: drugNames.length, message: 'Initializing parallel research nodes...' });
    
    try {
      // Use parallel search with incremental updates
      const searchResults = await performDrugDeepSearch(
        drugNames, 
        (curr, total, msg) => {
          setProgress({ current: curr, total, message: msg });
        },
        controller.signal
      );
      
      const validResults = searchResults.filter((r): r is DrugDeepDive => r !== null && !!r.name);
      
      // Identify specifically which names failed for clearer feedback
      const failedNames = drugNames.filter(inputQuery => {
         const q = inputQuery.toLowerCase();
         return !validResults.some(res => {
            if (res.name.toLowerCase().includes(q)) return true;
            if (res.synonyms?.some(s => s.toLowerCase().includes(q))) return true;
            if (res.indications?.some(ind => ind.toLowerCase().includes(q))) return true; 
            return false;
         });
      });

      const resultsWithIds = validResults.map(r => ({ 
        ...r, 
        id: (r as any).id || r.name + (r.pubchemCid || Math.random().toString()) 
      }));

      if (resultsWithIds.length === 0) {
        setError("Unable to retrieve comprehensive profiles. Please verify your inputs.");
      } else if (failedNames.length > 0) {
        setError(
          <div className="space-y-3">
             <p>Results retrieved. <span className="font-black text-slate-900">{resultsWithIds.length}</span> profiles generated from <span className="font-black text-slate-900">{drugNames.length}</span> queries.</p>
             <div className="flex flex-wrap justify-center gap-2 mt-2">
                <span className="text-[10px] font-black uppercase text-slate-400 w-full mb-1">Unresolved Inputs:</span>
                {failedNames.map(f => (
                  <span key={f} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-md border border-red-100 text-[10px] font-bold">{f}</span>
                ))}
             </div>
          </div>
        );
      }
      
      setResults(resultsWithIds as any);
    } catch (err: any) {
      if (err.message !== 'Aborted') {
        setError("An unexpected error occurred during analysis. The intelligence protocol may be temporarily throttled.");
      }
    } finally {
      setLoading(false);
      setProgress(null);
      abortControllerRef.current = null;
    }
  };
  
  const getStructureImageUrl = (name?: string) => {
    if (!name) return null;
    const cleanName = name.split(' (')[0].trim();
    return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cleanName)}/PNG?record_type=2d&image_size=300x200`;
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };
  
  const open3DViewer = (drug: DrugDeepDive & { id: string }) => {
    let toOpen: any[] = [];
    
    if (drug.components && drug.components.length > 0) {
       toOpen = drug.components.map((comp, idx) => ({
          id: `${drug.id}_comp_${idx}`,
          name: `${drug.name} (${comp.name})`,
          pubchemCid: comp.pubchemCid,
          smiles: comp.smiles,
          zIndex: 0 
       })).filter(c => c.pubchemCid || c.smiles);
    } 
    
    if (toOpen.length === 0) {
       if (drug.pubchemCid || drug.smiles) {
          toOpen.push({
             id: drug.id,
             name: drug.name,
             pubchemCid: drug.pubchemCid,
             smiles: drug.smiles,
             zIndex: 0 
          });
       }
    }

    if (toOpen.length === 0) return;

    setActive3DViewers(prev => {
        const currentMaxZ = prev.length > 0 ? Math.max(...prev.map(p => p.zIndex)) : 100;
        let nextZ = Math.max(currentMaxZ, maxZIndex); 
        const nextViewers = [...prev];
        
        toOpen.forEach(item => {
            const existingIdx = nextViewers.findIndex(v => v.id === item.id);
            nextZ++;
            if (existingIdx >= 0) {
                nextViewers[existingIdx] = { ...nextViewers[existingIdx], zIndex: nextZ };
            } else {
                nextViewers.push({ ...item, zIndex: nextZ });
            }
        });
        
        setMaxZIndex(nextZ);
        return nextViewers;
    });
  };

  const close3DViewer = (id: string) => {
    setActive3DViewers(prev => prev.filter(v => v.id !== id));
  };

  const bringToFront = (id: string) => {
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    setActive3DViewers(prev => prev.map(v => v.id === id ? { ...v, zIndex: newZ } : v));
  };

  const openSelected3D = () => {
    const selected = results.filter(r => selectedIds.has(r.id));
    selected.forEach(open3DViewer);
  };
  
  const comparisonDrugs = results.filter(r => selectedIds.has(r.id));
  
  const handleLoadSample = () => {
    setQuery("Aspirin\nBreast Cancer\nOzempic\nDiabetes");
  };

  const handleClearAll = () => {
    setQuery('');
    setResults([]);
    setSelectedIds(new Set());
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="bg-slate-900 rounded-[2.5rem] p-10 sm:p-14 text-white mb-12 relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <Pill className="w-3.5 h-3.5" /> Pharmacological Intelligence
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tighter leading-tight">
            Drug Discovery <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Engine.</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium mb-8 max-w-2xl leading-relaxed">
            Deep-dive analysis of pharmaceutical compounds and therapeutic areas. 
            Enter drugs to get profiles, or enter diseases to identify standard-of-care treatments.
          </p>

          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <textarea 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Drug Names or Diseases (e.g. Aspirin, Breast Cancer)..." 
              className="w-full h-40 p-4 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all font-medium shadow-xl text-sm"
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
               <Tooltip content="Load Sample Data">
                 <button type="button" onClick={handleLoadSample} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-colors">
                    <MousePointerClick className="w-4 h-4" />
                 </button>
               </Tooltip>
               <Tooltip content="Clear All Search and Results">
                 <button type="button" onClick={handleClearAll} className="px-4 py-2 bg-slate-100 text-red-600 rounded-xl text-[10px] font-black uppercase hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                 </button>
               </Tooltip>
               <button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all shadow-lg active:scale-95 flex items-center gap-2"
               >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                 <span className="font-bold">Analyze</span>
               </button>
            </div>
          </form>
        </div>
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {loading && progress && (
        <div className="max-w-xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-2">
           <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{progress.message}</span>
              </div>
              <span className="text-xs font-bold text-emerald-600">{Math.round((progress.current / progress.total) * 100)}%</span>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
             <div className="bg-emerald-500 h-full transition-all duration-500 shadow-sm" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
           </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50/30 p-8 rounded-3xl border border-red-100 shadow-sm text-center mb-12 animate-in zoom-in-95 max-w-4xl mx-auto">
           <div className="w-16 h-16 bg-white border border-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
             <AlertTriangle className="w-8 h-8 text-red-500" />
           </div>
           <h3 className="text-lg font-black text-slate-900 mb-2">Analysis Feedback</h3>
           <div className="text-slate-500 text-sm max-w-2xl mx-auto leading-relaxed font-medium">{error}</div>
        </div>
      )}

      {results.length > 0 && (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-black text-slate-900">Analysis Results ({results.length})</h2>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-slate-100 rounded-lg flex items-center border border-slate-200">
                 <Tooltip content="Grid View"><button onClick={() => setView('grid')} className={`p-2 rounded-md ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button></Tooltip>
                 <Tooltip content="Table View"><button onClick={() => setView('table')} className={`p-2 rounded-md ${view === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon className="w-4 h-4" /></button></Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip content="Select 2-4 drugs to compare">
                  <button 
                    onClick={() => setShowComparison(true)}
                    disabled={comparisonDrugs.length < 2 || comparisonDrugs.length > 4}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    Compare ({selectedIds.size})
                  </button>
                </Tooltip>
                <Tooltip content="View selected chemical structures in 3D">
                  <button 
                    onClick={openSelected3D}
                    disabled={selectedIds.size === 0}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Box className="w-4 h-4" />
                    3D View ({selectedIds.size})
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map(drug => {
                const isSelected = selectedIds.has(drug.id);
                return (
                  <div key={drug.id} onClick={() => setSelectedDrugForDetail(drug)} className={`bg-white rounded-3xl border transition-all cursor-pointer flex flex-col h-full ${isSelected ? 'border-indigo-400 shadow-2xl' : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300'}`}>
                    <div className="p-6 pb-2 flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 min-w-0">
                          <Tooltip content={drug.name}><h3 className="font-black text-slate-900 text-lg truncate leading-tight">{drug.name}</h3></Tooltip>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Tooltip content="Open 3D Molecular Viewer">
                            <button 
                              onClick={(e) => { e.stopPropagation(); open3DViewer(drug); }}
                              className="p-1.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-100 rounded-lg transition-all"
                            >
                              <Box className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Select/deselect for comparison or 3D view.">
                            <div 
                              onClick={(e) => { e.stopPropagation(); toggleSelection(drug.id); }}
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white hover:border-indigo-400'}`}
                            >
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                          </Tooltip>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <Tooltip content={`Pharmacological class: ${drug.drugClass}`}>
                          <p className="text-[10px] font-black text-blue-600 text-left uppercase tracking-tight leading-snug">
                            {drug.drugClass}
                          </p>
                        </Tooltip>
                      </div>
                      <Tooltip content={drug.description}>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 font-medium h-16">
                          {drug.description}
                        </p>
                      </Tooltip>
                    </div>
                    
                    <Tooltip content="2D Chemical Structure from PubChem">
                      <div className="bg-slate-50 h-60 rounded-b-3xl flex items-center justify-center p-4 border-t border-slate-100 shrink-0">
                        <img 
                          src={getStructureImageUrl(drug.name) || ''} 
                          alt={`Structure of ${drug.name}`} 
                          className="max-h-full object-contain mix-blend-multiply" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                        <div className="text-slate-400 text-xs text-center hidden">
                          <FlaskConical className="w-6 h-6 mx-auto mb-1" /> No Structure
                        </div>
                      </div>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          ) : (
            <DrugResultsTable 
              drugs={results} 
              selectedIds={selectedIds} 
              onSelectionChange={setSelectedIds} 
              onOpen3D={open3DViewer}
            />
          )}
        </div>
      )}

      {showComparison && (
        <DrugComparisonModal 
          drugs={comparisonDrugs} 
          onClose={() => setShowComparison(false)} 
          onOpen3D={open3DViewer}
        />
      )}
      
      {selectedDrugForDetail && (
        <DrugDetailModal 
          drug={selectedDrugForDetail} 
          onClose={() => setSelectedDrugForDetail(null)} 
          onOpen3D={open3DViewer}
        />
      )}
      
      {active3DViewers.map(drug => (
        <MolecularViewerModal 
          key={drug.id} 
          drug={drug} 
          zIndex={drug.zIndex}
          onClose={close3DViewer} 
          onFocus={bringToFront}
        />
      ))}
    </div>
  );
};

export default DrugSearchView;
