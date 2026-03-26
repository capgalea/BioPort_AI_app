import React, { useEffect, useRef, useState } from 'react';
import { X, Bot, Sparkles, Workflow, ExternalLink, Download, Code, Loader2, ShieldCheck, Database, Globe, Terminal, MessageSquare, User, FileText, Move, ArrowDown } from 'lucide-react';

interface SchematicModalProps {
  onClose: () => void;
}

const SchematicModal: React.FC<SchematicModalProps> = ({ onClose }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

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

  const chart = `
graph TD
    User([User Query]) --> Auth{Session Check}
    Auth -->|Guest/User| Context[Context Injection]
    
    subgraph Context_Layer [Intelligence Context]
        DB[(Database Context)] --- History[Chat History]
        DB -.-> Summary[Company Pipeline Summaries]
    end

    Context_Layer --> Agent[Gemini 3.0 Pro Orchestrator]

    subgraph Reasoning_Loop [Dynamic Reasoning Loop]
        Agent --> Plan[Determine Search Intent]
        Plan --> Tools{Need External Data?}
        
        Tools -->|Google Search| Search[Google Grounding Tool]
        Tools -->|Registry Query| SQL[AACT Virtual SQL Agent]
        Tools -->|Literature| PubMed[PubMed API Call]
        Tools -->|Patent Search| Patents[USPTO & Google Patents]
        
        Search --> Synthesis[Data Aggregation]
        SQL --> Synthesis
        PubMed --> Synthesis
        Patents --> Synthesis
    end

    Synthesis --> Verification{Source Integrity Check}
    Verification -->|Confidence High| Response[Final Markdown Generation]
    Verification -->|Ambiguous| Plan

    Response --> Output([Final Insight to UI])

    classDef primary fill:#eef2ff,stroke:#4f46e5,color:#1e1b4b,stroke-width:2.5px;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,color:#334155,stroke-width:1.5px;
    classDef success fill:#ecfdf5,stroke:#059669,color:#064e3b,stroke-width:2.5px;
    class Agent,Reasoning_Loop primary;
    class Context_Layer,DB,History secondary;
    class Output success;
  `;

  useEffect(() => {
    const loadAndRender = async () => {
      try {
        if (!(window as any).mermaid) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Mermaid library"));
            document.head.appendChild(script);
          });
        }

        const mermaid = (window as any).mermaid;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          themeVariables: {
            primaryColor: '#4f46e5',
            lineColor: '#64748b',
            nodeBorder: '#94a3b8',
            mainBkg: '#ffffff',
            clusterBkg: '#f1f5f9',
            clusterBorder: '#cbd5e1'
          }
        });
        
        if (mermaidRef.current) {
           const { svg } = await mermaid.render('mermaid-svg', chart);
           mermaidRef.current.innerHTML = svg;
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to render flowchart");
        setIsLoading(false);
      }
    };

    loadAndRender();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        ref={modalRef}
        style={{ 
          left: pos.x, 
          top: pos.y, 
          transform: 'translate(-50%, -50%)',
          position: 'fixed'
        }}
        className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative border border-slate-200 select-none"
      >
        <div 
          onMouseDown={handleDragStart}
          className="p-6 border-b border-slate-200 bg-white flex justify-between items-center cursor-move active:cursor-grabbing hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3 pointer-events-none">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
                <Workflow className="w-7 h-7" />
             </div>
             <div>
               <h2 className="text-xl font-black text-slate-900 tracking-tight">AI Agent Logic Schematic</h2>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Mermaid Engine v10.0</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Architecture Mapping</span>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 ml-2">
                    <Move className="w-2.5 h-2.5" /> Move
                  </div>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:text-slate-800 transition-colors" title="Copy Source Code"><Code className="w-5 h-5" /></button>
            <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition-all text-slate-600 hover:text-slate-900 shadow-sm">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-8 sm:p-16 scrollbar-thin scrollbar-thumb-slate-300 select-text">
           <div className="max-w-4xl mx-auto flex flex-col items-center min-h-[400px] justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                   <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">Compiling Logic Visualization...</p>
                </div>
              ) : error ? (
                <div className="text-red-500 font-bold">{error}</div>
              ) : (
                <div ref={mermaidRef} className="w-full flex justify-center animate-in fade-in duration-500" />
              )}
           </div>

           {/* Visual Node Representation - Synced with updated chart */}
           {!isLoading && !error && (
             <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 py-8 mt-8 border-t border-slate-200/50 pt-12">
                <div className="text-center mb-4">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Functional Components</h3>
                   <p className="text-xs text-slate-500">Visual breakdown of active tool nodes</p>
                </div>
                
                <Node 
                  icon={<User className="w-6 h-6 text-blue-600" />} 
                  title="User Input" 
                  subtitle="Natural Language Query"
                  bg="bg-blue-50" 
                  border="border-blue-200" 
                />
                <Arrow />
                <div className="flex gap-4 w-full justify-center">
                   <div className="flex-1 max-w-[200px]">
                      <Node 
                        icon={<MessageSquare className="w-5 h-5 text-slate-500" />} 
                        title="Chat History" 
                        subtitle="Last 10 turns" 
                        bg="bg-white" 
                        border="border-slate-300" 
                        small 
                      />
                   </div>
                   <div className="flex-1 max-w-[200px]">
                      <Node 
                        icon={<Database className="w-5 h-5 text-emerald-500" />} 
                        title="Database Context" 
                        subtitle="Company Summaries" 
                        bg="bg-emerald-50" 
                        border="border-emerald-200" 
                        small 
                      />
                   </div>
                </div>
                <Arrow label="INJECT" />
                <Node 
                  icon={<Bot className="w-8 h-8 text-indigo-600" />} 
                  title="Gemini 3.0 Pro" 
                  subtitle="Reasoning Engine & Orchestrator" 
                  bg="bg-indigo-50" 
                  border="border-indigo-200" 
                  glow 
                />
                
                <div className="grid grid-cols-3 gap-6 w-full max-w-2xl relative mt-2 px-4">
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-8 -z-10 border-x-2 border-t-2 border-slate-300 rounded-t-xl"></div>
                   
                   <div className="flex flex-col items-center mt-6">
                      <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 rounded">Tool Call</div>
                      <Node 
                        icon={<Globe className="w-5 h-5 text-purple-600" />} 
                        title="Google Search" 
                        subtitle="Grounding & Fact Check" 
                        bg="bg-purple-50" 
                        border="border-purple-200" 
                        small 
                      />
                   </div>
                   <div className="flex flex-col items-center mt-6">
                      <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 rounded">Function</div>
                      <Node 
                        icon={<Terminal className="w-5 h-5 text-amber-600" />} 
                        title="SQL Agent" 
                        subtitle="AACT Clinical Queries" 
                        bg="bg-amber-50" 
                        border="border-amber-200" 
                        small 
                      />
                   </div>
                   <div className="flex flex-col items-center mt-6">
                      <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 rounded">API</div>
                      <Node 
                        icon={<ShieldCheck className="w-5 h-5 text-teal-600" />} 
                        title="Patent API" 
                        subtitle="USPTO & Google Patents" 
                        bg="bg-teal-50" 
                        border="border-teal-200" 
                        small 
                      />
                   </div>
                </div>

                <div className="h-12 w-full max-w-2xl relative flex justify-center mt-2">
                   <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[85%] h-8 border-b-2 border-x-2 border-slate-300 rounded-b-xl -z-10"></div>
                   <div className="absolute top-full h-4 w-0.5 bg-slate-300">
                      <ArrowDown className="w-4 h-4 text-slate-300 absolute -bottom-1.5 -left-[7px]" />
                   </div>
                </div>
                <div className="mt-4">
                  <Node 
                    icon={<FileText className="w-6 h-6 text-slate-700" />} 
                    title="Final Response" 
                    subtitle="Markdown + Smart Citations" 
                    bg="bg-white" 
                    border="border-slate-300" 
                  />
                </div>
             </div>
           )}
        </div>

        <div className="p-6 bg-slate-200 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-4">
           <p className="text-[11px] text-slate-700 font-bold max-w-md leading-relaxed">
             Technical protocol visualizing the multi-stage reasoning and grounding loop used by the BioPort AI Gemini Agent to synthesize clinical data.
           </p>
           <div className="flex gap-3">
             <button className="px-5 py-2.5 bg-white text-slate-800 rounded-xl text-xs font-black hover:bg-slate-100 transition-all flex items-center gap-2 border border-slate-300 shadow-sm active:scale-95">
               <Download className="w-4 h-4" /> EXPORT PDF
             </button>
             <button onClick={onClose} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 uppercase tracking-wider">
               Close Documentation
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const Node = ({ icon, title, subtitle, bg, border, small, glow }: any) => (
  <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${bg} ${border} ${small ? 'w-full py-3' : 'w-64'} ${glow ? 'shadow-[0_0_20px_rgba(79,70,229,0.2)] ring-2 ring-indigo-100' : 'shadow-sm'} transition-all hover:scale-105 z-10 relative`}>
    <div className="mb-2">{icon}</div>
    <div className="text-sm font-bold text-slate-800">{title}</div>
    {subtitle && <div className="text-xs text-slate-500 text-center">{subtitle}</div>}
  </div>
);

const Arrow = ({ label }: { label?: string }) => (
  <div className="h-8 w-0.5 bg-slate-300 relative flex items-center justify-center">
    {label && (
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-200 text-[10px] px-2 rounded-full text-slate-500 font-mono font-bold tracking-wider border border-slate-300 z-20">
         {label}
       </div>
    )}
    <ArrowDown className="w-4 h-4 text-slate-300 absolute -bottom-1.5 -left-[7px]" />
  </div>
);

export default SchematicModal;