
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { CompanyData } from '../types.ts';
import { ZoomIn, ZoomOut, Maximize2, Network, Sun, Moon, Search, X, Eye, EyeOff, Sliders, RotateCcw, Globe, ArrowRight, Expand, Minimize, Filter, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import Tooltip from './Tooltip.tsx';
import MultiSelect from './MultiSelect.tsx';

interface NetworkGraphProps {
  companies: CompanyData[];
  onCompanyClick?: (company: CompanyData) => void;
}

// --- Helpers ---
const getCountry = (address?: string) => {
  if (!address) return 'Unknown';
  const parts = address.split(',');
  return parts[parts.length - 1].trim();
};

const getEntityCategory = (c: CompanyData): string => {
  const name = c.name.toLowerCase();
  if (name.includes('university') || name.includes('college') || name.includes('school of')) return 'University';
  if (name.includes('institute') || name.includes('foundation') || name.includes('research center') || name.includes('clinic')) return 'Research Institute';
  
  if (c.entityType) {
    const et = c.entityType.toLowerCase();
    if (et === 'university' || et === 'academic') return 'University';
    if (et === 'research institute' || et === 'non-profit') return 'Research Institute';
    if (et === 'government') return 'Government';
  }
  return 'Corporate';
};

// Adjusted to 5,000 nodes for optimal performance balance
const MAX_NODES_PERFORMANCE_CAP = 5000;

const NetworkGraph: React.FC<NetworkGraphProps> = ({ companies, onCompanyClick }) => {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Interaction State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isCapped, setIsCapped] = useState(false);
  
  // Filtering & Search State
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(1500);
  const [visibleTypes, setVisibleTypes] = useState({
    company: true,
    technology: true,
    sector: true
  });
  const [connectionThreshold, setConnectionThreshold] = useState(1);

  // New Structured Filters
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);

  // --- Dynamic Filter Options ---
  const countryOptions = useMemo(() => {
    const s = new Set<string>();
    companies.forEach(c => s.add(getCountry(c.contact?.hqAddress)));
    return Array.from(s).sort().filter(Boolean).map(x => ({ id: x, label: x }));
  }, [companies]);

  const typeOptions = [
    { id: 'Corporate', label: 'Corporate' },
    { id: 'University', label: 'University' },
    { id: 'Research Institute', label: 'Research Institute' },
    { id: 'Government', label: 'Government' }
  ];

  const diseaseOptions = useMemo(() => {
    const s = new Set<string>();
    companies.forEach(c => c.pipeline.forEach(p => s.add(p.indication)));
    return Array.from(s).sort().filter(x => x && x.length < 40).map(x => ({ id: x, label: x }));
  }, [companies]);

  // --- Dimension Management ---
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  // Sync dimensions when FullScreen toggles
  useEffect(() => {
    updateDimensions();
    // Use a short delay to ensure the layout engine has settled after the class change
    const timer = setTimeout(updateDimensions, 100);
    return () => clearTimeout(timer);
  }, [isFullScreen, updateDimensions]);

  // Use ResizeObserver for responsive resizing
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    observer.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  // Sync Full Screen State with Browser Events (e.g. Escape key)
  useEffect(() => {
    const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // --- Active Data Calculation ---
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (selectedEntityTypes.length > 0) {
        const cat = getEntityCategory(c);
        if (!selectedEntityTypes.includes(cat)) return false;
      }
      if (selectedCountries.length > 0) {
        const country = getCountry(c.contact?.hqAddress);
        if (!selectedCountries.includes(country)) return false;
      }
      if (selectedDiseases.length > 0) {
        const hasDisease = c.pipeline.some(p => selectedDiseases.includes(p.indication));
        if (!hasDisease) return false;
      }
      return true;
    });
  }, [companies, selectedEntityTypes, selectedCountries, selectedDiseases]);

  const activeCompanies = useMemo(() => {
    return filteredCompanies.slice(0, displayLimit);
  }, [filteredCompanies, displayLimit]);

  const fullGraphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const nodeIds = new Set();

    activeCompanies.forEach(c => {
      if (!nodeIds.has(c.id)) {
        nodes.push({
          id: c.id,
          name: c.name,
          type: 'company',
          val: 20 + (c.pipeline.length * 2),
          color: isDarkMode ? '#3b82f6' : '#2563eb'
        });
        nodeIds.add(c.id);
      }

      if (c.keyTechnologies && Array.isArray(c.keyTechnologies)) {
        c.keyTechnologies.forEach(tech => {
          // Safety check for non-string data
          if (typeof tech !== 'string') return;
          
          const tClean = tech.trim();
          if (!tClean) return;

          const tId = `tech-${tClean.toLowerCase()}`;
          if (!nodeIds.has(tId)) {
            nodes.push({
              id: tId,
              name: tClean,
              type: 'technology',
              val: 8,
              color: isDarkMode ? '#10b981' : '#059669'
            });
            nodeIds.add(tId);
          }
          links.push({ source: c.id, target: tId, type: 'uses_tech' });
        });
      }

      const sectors = (c.sector || 'Uncategorized').split(/,|&|\//).map(s => s.trim()).filter(Boolean);
      sectors.forEach(sec => {
        const sId = `sec-${sec.toLowerCase()}`;
        if (!nodeIds.has(sId)) {
          nodes.push({
            id: sId,
            name: sec,
            type: 'sector',
            val: 15,
            color: isDarkMode ? '#8b5cf6' : '#7c3aed'
          });
          nodeIds.add(sId);
        }
        links.push({ source: c.id, target: sId, type: 'in_sector' });
      });
    });

    return { nodes, links };
  }, [activeCompanies, isDarkMode]);

  const filteredData = useMemo(() => {
    const getId = (node: any) => (typeof node === 'object' ? node.id : node);
    const degrees: Record<string, number> = {};
    fullGraphData.links.forEach(l => {
        const s = getId(l.source);
        const t = getId(l.target);
        degrees[s] = (degrees[s] || 0) + 1;
        degrees[t] = (degrees[t] || 0) + 1;
    });

    let activeNodes = fullGraphData.nodes.filter(node => {
        if (!visibleTypes[node.type as keyof typeof visibleTypes]) return false;
        if (node.type !== 'company' && (degrees[node.id] || 0) < connectionThreshold) return false;
        return true;
    });

    let capped = false;
    // We only trigger the cap if nodes exceed the limit of 5,000
    if (activeNodes.length > MAX_NODES_PERFORMANCE_CAP) {
       activeNodes.sort((a, b) => (degrees[b.id] || 0) - (degrees[a.id] || 0));
       activeNodes = activeNodes.slice(0, MAX_NODES_PERFORMANCE_CAP);
       capped = true;
    }
    setIsCapped(capped);

    const activeNodeIds = new Set(activeNodes.map(n => n.id));
    const activeLinks = fullGraphData.links.filter(l => 
        activeNodeIds.has(getId(l.source)) && activeNodeIds.has(getId(l.target))
    );

    return { nodes: activeNodes, links: activeLinks };
  }, [fullGraphData, visibleTypes, connectionThreshold]);

  // Update highlights based on Selection (Priority) or Hover
  useEffect(() => {
    const targetId = selectedNodeId || (hoverNode ? hoverNode.id : null);
    const newHighlightNodes = new Set();
    const newHighlightLinks = new Set();

    if (targetId) {
      newHighlightNodes.add(targetId);
      filteredData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const targetIdRef = typeof link.target === 'object' ? (link.target as any).id : link.target;
        if (sourceId === targetId || targetIdRef === targetId) {
          newHighlightLinks.add(link);
          newHighlightNodes.add(sourceId);
          newHighlightNodes.add(targetIdRef);
        }
      });
    }
    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
  }, [selectedNodeId, hoverNode, filteredData]);

  // --- RENDERING ORDER OPTIMIZATION (Z-Indexing) ---
  const displayData = useMemo(() => {
    const sortedNodes = [...filteredData.nodes].sort((a, b) => {
      const aH = highlightNodes.has(a.id) ? 1 : 0;
      const bH = highlightNodes.has(b.id) ? 1 : 0;
      return aH - bH;
    });

    const sortedLinks = [...filteredData.links].sort((a, b) => {
      const aH = highlightLinks.has(a) ? 1 : 0;
      const bH = highlightLinks.has(b) ? 1 : 0;
      return aH - bH;
    });

    return { nodes: sortedNodes, links: sortedLinks };
  }, [filteredData, highlightNodes, highlightLinks]);

  // --- STABILITY CONTROL ---
  const prevFilteredDataRef = useRef<any>(null);
  const isTopologyChange = prevFilteredDataRef.current !== filteredData;

  useEffect(() => {
    prevFilteredDataRef.current = filteredData;
  }, [filteredData]);

  const hasHighlights = highlightNodes.size > 0;
  
  const isMassive = filteredData.nodes.length > 2000;
  const cooldownTicks = (isTopologyChange || !hasHighlights) ? (isMassive ? 50 : 100) : 0;

  const handleNodeHover = useCallback((node: any) => {
    if (node) setHoverNode(node);
    else setTimeout(() => setHoverNode(null), 50); 
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (selectedNodeId === node.id) {
        setSelectedNodeId(null);
    } else {
        setSelectedNodeId(node.id);
        fgRef.current?.centerAt(node.x, node.y, 1000);
        fgRef.current?.zoom(4, 1000);
    }
  }, [selectedNodeId]);

  const nodeColorAccessor = useCallback((node: any) => 
    (highlightNodes.size > 0 && !highlightNodes.has(node.id))
      ? (isDarkMode ? '#334155' : '#cbd5e1')
      : node.color
  , [highlightNodes, isDarkMode]);

  const linkColorAccessor = useCallback((link: any) => {
     if (highlightLinks.has(link)) return isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)';
     if (highlightLinks.size > 0) return 'rgba(0,0,0,0.05)';
     return isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)';
  }, [highlightLinks, isDarkMode]);

  const linkWidthAccessor = useCallback((link: any) => highlightLinks.has(link) ? 3 : 1, [highlightLinks]);

  const handleSearchSelect = (nodeId: string) => {
    const node = filteredData.nodes.find(n => n.id === nodeId);
    if (node && fgRef.current) {
        setSelectedNodeId(node.id);
        const x = node.x || 0;
        const y = node.y || 0;
        fgRef.current.centerAt(x, y, 1000);
        fgRef.current.zoom(4, 2000);
        setSearchQuery(''); 
    }
  };

  const searchOptions = useMemo(() => {
      if (!searchQuery.trim()) return [];
      return filteredData.nodes
        .filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 8);
  }, [searchQuery, filteredData]);

  const selectedNodeData = selectedNodeId ? filteredData.nodes.find(n => n.id === selectedNodeId) : null;
  const originalCompany = selectedNodeData?.type === 'company' ? companies.find(c => c.id === selectedNodeData.id) : null;

  return (
    <div 
      ref={rootRef}
      className={`flex flex-col ${isFullScreen ? 'fixed inset-0 z-[9999] rounded-none h-screen w-screen' : 'h-[700px] rounded-3xl'} bg-white border border-slate-200 shadow-sm overflow-hidden relative group transition-all duration-300`}
    >
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row justify-between items-start gap-4 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg pointer-events-auto min-w-[320px] max-w-[360px] max-h-[80vh] overflow-y-auto custom-scrollbar">
           <div className="flex items-center justify-between gap-4 mb-2">
             <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Ecosystem Graph</h3>
             </div>
             <div className="flex items-center gap-1">
               {selectedNodeId && (
                 <Tooltip content="Reset Selection">
                   <button onClick={() => setSelectedNodeId(null)} className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors">
                      <RotateCcw className="w-4 h-4" />
                   </button>
                 </Tooltip>
               )}
               <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded-lg transition-colors ${showFilters ? 'bg-indigo-100 text-indigo-600 shadow-sm' : 'hover:bg-slate-100 text-slate-400'}`}>
                  <Sliders className="w-4 h-4" />
               </button>
             </div>
           </div>
           
           <div className="flex flex-wrap gap-2 mt-3">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                 <div className="w-2 h-2 rounded-full bg-blue-500"></div> {filteredData.nodes.filter(n => n.type === 'company').length}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {filteredData.nodes.filter(n => n.type === 'technology').length}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                 <div className="w-2 h-2 rounded-full bg-violet-500"></div> {filteredData.nodes.filter(n => n.type === 'sector').length}
              </div>
           </div>

           {isCapped && (
             <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-[9px] font-bold text-amber-700">
               <AlertTriangle className="w-3 h-3" />
               Performance Cap Active (Top {MAX_NODES_PERFORMANCE_CAP} nodes)
             </div>
           )}

           {showFilters && (
             <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 space-y-5">
                <div>
                   <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3 h-3" /> Graph Density
                      </label>
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 rounded">{displayLimit} / {filteredCompanies.length}</span>
                   </div>
                   <input type="range" min="10" max={Math.max(200, filteredCompanies.length)} step="10" value={displayLimit} onChange={(e) => setDisplayLimit(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                   <p className="text-[9px] text-slate-400 mt-1">Adjust maximum company nodes rendered.</p>
                </div>
                <hr className="border-slate-100" />
                <div className="space-y-3">
                   <div className="flex items-center gap-2 mb-1">
                      <Filter className="w-3 h-3 text-slate-400" />
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Filters</label>
                   </div>
                   <div className="space-y-2">
                      <MultiSelect label="Entity Type" options={typeOptions} selectedIds={selectedEntityTypes} onChange={setSelectedEntityTypes} placeholder="All Types" />
                      <MultiSelect label="Country / Region" options={countryOptions} selectedIds={selectedCountries} onChange={setSelectedCountries} placeholder="All Countries" />
                      <MultiSelect label="Disease Area" options={diseaseOptions} selectedIds={selectedDiseases} onChange={setSelectedDiseases} placeholder="All Diseases" />
                   </div>
                </div>
                <hr className="border-slate-100" />
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Node Visibility</label>
                   <div className="flex gap-2">
                      {(['company', 'technology', 'sector'] as const).map(type => (
                        <button key={type} onClick={() => setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }))} className={`flex-1 flex items-center justify-center p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${visibleTypes[type] ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}>
                          {visibleTypes[type] ? <Eye className="w-3 h-3 mr-1.5" /> : <EyeOff className="w-3 h-3 mr-1.5" />}
                          {type.slice(0,4)}
                        </button>
                      ))}
                   </div>
                </div>
                <div>
                   <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata Noise Filter</label>
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 rounded">{connectionThreshold} links</span>
                   </div>
                   <input type="range" min="1" max="10" value={connectionThreshold} onChange={(e) => setConnectionThreshold(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
             </div>
           )}
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
           <div className="relative group/search">
              <div className={`flex items-center bg-white/90 backdrop-blur rounded-xl border border-slate-200 shadow-lg transition-all ${searchQuery ? 'w-64' : 'w-10 hover:w-64'} overflow-hidden h-10`}>
                 <div className="w-10 h-10 flex items-center justify-center shrink-0 text-slate-500"><Search className="w-4 h-4" /></div>
                 <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find node..." className="w-full bg-transparent border-none outline-none text-xs font-medium text-slate-700 h-full pr-4" />
                 {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-3 h-3" /></button>}
              </div>
              {searchOptions.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                   {searchOptions.map(node => (
                     <button key={node.id} onClick={() => handleSearchSelect(node.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between group/item">
                       <span className="font-medium text-slate-700 truncate">{node.name}</span>
                       <span className="text-[9px] font-black uppercase text-slate-400 group-hover/item:text-indigo-400">{node.type}</span>
                     </button>
                   ))}
                </div>
              )}
           </div>

           <div className="bg-white/90 backdrop-blur p-1.5 rounded-xl border border-slate-200 shadow-lg flex flex-col gap-1">
              <Tooltip content="Zoom In" position="left"><button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.2, 400)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ZoomIn className="w-4 h-4" /></button></Tooltip>
              <Tooltip content="Zoom Out" position="left"><button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.2, 400)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ZoomOut className="w-4 h-4" /></button></Tooltip>
              <Tooltip content="Fit Graph to View" position="left"><button onClick={() => fgRef.current?.zoomToFit(400, 50)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><Maximize2 className="w-4 h-4" /></button></Tooltip>
              <Tooltip content={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"} position="left">
                <button onClick={toggleFullScreen} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                  {isFullScreen ? <Minimize className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                </button>
              </Tooltip>
           </div>
           
           <div className="bg-white/90 backdrop-blur p-1.5 rounded-xl border border-slate-200 shadow-lg">
              <Tooltip content={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} position="left">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </Tooltip>
           </div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div ref={containerRef} className={`flex-1 w-full h-full cursor-move ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={displayData}
          nodeLabel="name"
          nodeColor={nodeColorAccessor}
          linkColor={linkColorAccessor}
          linkWidth={linkWidthAccessor}
          nodeRelSize={4}
          backgroundColor={isDarkMode ? '#0f172a' : '#f8fafc'}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedNodeId(null)}
          cooldownTicks={cooldownTicks}
          d3AlphaDecay={0.05}
          d3VelocityDecay={0.4}
        />
      </div>
      
      {/* Selected Node Details Panel */}
      {selectedNodeData && (
        <div className="absolute top-20 right-6 z-20 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
           <div className="h-2 w-full" style={{ backgroundColor: selectedNodeData.color }}></div>
           <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{selectedNodeData.type}</div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedNodeData.name}</h3>
                 </div>
                 <button onClick={() => setSelectedNodeId(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              {selectedNodeData.type === 'company' && originalCompany ? (
                 <div className="space-y-4">
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{originalCompany.description}</p>
                    <div className="flex flex-col gap-2">
                       {originalCompany.contact.website && (
                          <a href={originalCompany.contact.website.startsWith('http') ? originalCompany.contact.website : `https://${originalCompany.contact.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"><Globe className="w-3.5 h-3.5" /> Website</a>
                       )}
                       <a href={`https://www.google.com/search?q=${encodeURIComponent(originalCompany.name + " biotech")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:underline"><Search className="w-3.5 h-3.5" /> Google Search</a>
                    </div>
                    <button onClick={() => onCompanyClick?.(originalCompany)} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">View Full Profile <ArrowRight className="w-3.5 h-3.5" /></button>
                 </div>
              ) : (
                 <div className="space-y-4">
                    <p className="text-xs text-slate-500">{selectedNodeData.type === 'technology' ? 'Key Technology Platform' : 'Industry Sector'} connected entities.</p>
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(selectedNodeData.name + " biotechnology")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:underline"><Search className="w-3.5 h-3.5" /> Research Topic</a>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
