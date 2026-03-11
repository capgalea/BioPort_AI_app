import React, { useEffect, useRef, useState } from 'react';
import { X, Bot, Sparkles, Workflow, ExternalLink, Download, Code, Loader2, AlertTriangle } from 'lucide-react';

interface MermaidWorkflowModalProps {
  onClose: () => void;
}

const MermaidWorkflowModal: React.FC<MermaidWorkflowModalProps> = ({ onClose }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  const chart = `
graph TD
    User([User Query]) --> Auth{Session Check}
    Auth -->|Guest/User| Context[Context Injection]
    
    subgraph Context_Layer [Intelligence Context]
        DB[(Database Context)] --- History[Chat History]
        DB -.-> Summary[Company Pipeline Summaries]
    end

    Context_Layer --> Agent[Gemini 3.1 Pro Orchestrator]

    subgraph Reasoning_Loop [Multi-Agent Reasoning Loop]
        Agent --> Plan[Determine Search Intent]
        Plan --> Tools{Need External Data?}
        
        Tools -->|Google Search| Search[Google Grounding Tool]
        Tools -->|Registry Query| SQL[AACT Virtual SQL Agent]
        Tools -->|Literature| PubMed[PubMed API Call]
        Tools -->|Drug Data| DrugDB[Drug Registry API]
        
        Search --> Synthesis[Data Aggregation]
        SQL --> Synthesis
        PubMed --> Synthesis
        DrugDB --> Synthesis
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
           const { svg } = await mermaid.render(renderId.current, chart);
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
      <div className="bg-slate-200 rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-300">
        
        <div className="p-6 border-b border-slate-300 bg-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
                <Workflow className="w-7 h-7" />
             </div>
             <div>
               <h2 className="text-xl font-black text-slate-900 tracking-tight">AI Agent Logic Schematic</h2>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Mermaid Engine v10.0</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Architecture Mapping</span>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:text-slate-800 transition-colors" title="Copy Source Code"><Code className="w-5 h-5" /></button>
            <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition-all text-slate-600 hover:text-slate-900 shadow-sm">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-8 sm:p-16 scrollbar-thin scrollbar-thumb-slate-300 relative">
           <div className="max-w-4xl mx-auto flex flex-col items-center min-h-[400px] justify-center">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm">
                   <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-4">Compiling Logic Visualization...</p>
                </div>
              )}
              
              {error ? (
                <div className="text-red-500 font-bold flex flex-col items-center gap-2">
                   <AlertTriangle className="w-8 h-8" />
                   <span>{error}</span>
                </div>
              ) : (
                <div ref={mermaidRef} className="w-full flex justify-center animate-in fade-in duration-500" />
              )}
           </div>
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

export default MermaidWorkflowModal;