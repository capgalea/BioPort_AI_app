
import React, { useState } from 'react';
import { 
  Lock, Search, Database, LayoutList, Bot, 
  ArrowRight, Info, Sparkles, CheckCircle2, 
  PlayCircle, ChevronRight, GraduationCap, Globe, ShieldCheck, Pill
} from 'lucide-react';

interface SystemTutorialViewProps {
  onStartSearch: () => void;
}

const SystemTutorialView: React.FC<SystemTutorialViewProps> = ({ onStartSearch }) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: "Authorize",
      icon: <Lock className="w-5 h-5" />,
      desc: "Secure login & cloud sync setup."
    },
    {
      id: 2,
      title: "Discover",
      icon: <Search className="w-5 h-5" />,
      desc: "Bulk search & sector identification."
    },
    {
      id: 3,
      title: "Drug Search",
      icon: <Pill className="w-5 h-5" />,
      desc: "Pharmacological deep dive."
    },
    {
      id: 4,
      title: "Verify",
      icon: <Database className="w-5 h-5" />,
      desc: "Live registry cross-referencing."
    },
    {
      id: 5,
      title: "Analyze",
      icon: <LayoutList className="w-5 h-5" />,
      desc: "Pipeline visualization & mapping."
    },
    {
      id: 6,
      title: "Strategize",
      icon: <Bot className="w-5 h-5" />,
      desc: "AI Agent reasoning & synthesis."
    }
  ];

  const getStepContent = (id: number) => {
    switch (id) {
      case 1:
        return {
          headline: "Secure Access Node",
          body: "Start by creating a profile or logging in. BioPort AI supports secure email/password auth and Google SSO. You can also connect your own private Supabase cloud project in the settings to ensure data persistence across sessions.",
          tip: "Whitelisting your redirect URL in GCP is required for seamless Google SSO if hosting privately.",
          featureIcon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
          featureText: "Encrypted Session Management"
        };
      case 2:
        return {
          headline: "Intelligence Discovery",
          body: "Use the 'Discovery' tab to input lists of entities (e.g. competitors, acquisition targets) or search entire therapeutic sectors (e.g. 'Gene Therapy'). The system will automatically build initial profiles, now supporting both global Google Patents and Australian IP Australia patent data.",
          tip: "Toggle between Google Patents and IP Australia data sources in the Prospect Generator to broaden your search scope.",
          featureIcon: <Globe className="w-8 h-8 text-blue-500" />,
          featureText: "Global & Regional Patent Search"
        };
      case 3:
        return {
          headline: "Pharmacological Intelligence",
          body: "Access the 'Drug Search' module to investigate specific compounds or disease areas. Retrieve 3D molecular structures, mechanism of action summaries, and standard-of-care comparisons.",
          tip: "You can enter a disease name (e.g. 'Breast Cancer') to find top approved therapies for that indication.",
          featureIcon: <Pill className="w-8 h-8 text-emerald-500" />,
          featureText: "Drug & Disease Analysis"
        };
      case 4:
        return {
          headline: "Grounded Synthesis",
          body: "Our system doesn't rely on stale training data. It cross-references ClinicalTrials.gov (NCT IDs) and the PubMed API in real-time to ensure every data point is current and verifiable.",
          tip: "Look for the 'Synced' timestamp on cards to see exactly how fresh your data is.",
          featureIcon: <Database className="w-8 h-8 text-indigo-500" />,
          featureText: "Real-Time Registry Sync"
        };
      case 5:
        return {
          headline: "Registry Analytics",
          body: "Click any card to open a full profile with detailed pipelines and PI bios. Use the 'Analytics' tab to visualize pipeline distribution or compare up to 4 entities side-by-side.",
          tip: "Export your curated database as a CSV for offline modeling and professional reporting.",
          featureIcon: <LayoutList className="w-8 h-8 text-purple-500" />,
          featureText: "Exportable Datasets"
        };
      case 6:
        return {
          headline: "AI Agent Orchestration",
          body: "Consult the AI Agent for complex strategic questions. It has access to your local database context. Ask it to 'Analyze the oncology competitive landscape of my current list' for grounded summaries.",
          tip: "Enable 'Academic Focus' in Agent Settings to prioritize peer-reviewed sources over general web news.",
          featureIcon: <Bot className="w-8 h-8 text-rose-500" />,
          featureText: "Context-Aware Reasoning"
        };
      default: return null;
    }
  };

  const currentContent = getStepContent(activeStep);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-32">
      
      {/* Header */}
      <div className="text-center mb-16 bg-white p-12 rounded-[3rem] border border-slate-200 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-widest mb-6">
            <PlayCircle className="w-4 h-4" /> System Walkthrough v2.0
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-6">
            Mastering <span className="text-blue-600">BioPort AI.</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
            Follow this workflow to transform raw pharmaceutical queries into 
            validated, clinical-grade intelligence.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Stepper Navigation */}
      <div className="mb-12 overflow-x-auto pb-4">
         <div className="flex justify-between items-center min-w-[700px] px-4">
            {steps.map((step, idx) => {
               const isActive = activeStep === step.id;
               const isCompleted = activeStep > step.id;
               return (
                  <div key={step.id} className="flex-1 flex flex-col items-center relative group">
                     {/* Connector Line */}
                     {idx !== steps.length - 1 && (
                        <div className={`absolute top-5 left-[50%] w-full h-1 z-0 transition-colors duration-500 ${isCompleted ? 'bg-blue-600' : 'bg-slate-100'}`} />
                     )}
                     
                     <button 
                       onClick={() => setActiveStep(step.id)}
                       className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 shadow-sm ${isActive ? 'bg-blue-600 text-white scale-110 ring-4 ring-blue-100' : isCompleted ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-200 text-slate-400 hover:border-blue-400'}`}
                     >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                     </button>
                     
                     <div className="mt-3 text-center">
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>{step.title}</div>
                     </div>
                  </div>
               );
            })}
         </div>
      </div>

      {/* Content Display Panel */}
      {currentContent && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Visual Side */}
           <div className="md:w-1/3 bg-slate-50 p-10 flex flex-col items-center justify-center text-center border-r border-slate-100">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-6">
                 {currentContent.featureIcon}
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">{currentContent.featureText}</h3>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Core Capability</div>
           </div>

           {/* Content Side */}
           <div className="flex-1 p-10 md:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-6">
                 <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm">{activeStep}</span>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">{currentContent.headline}</h2>
              </div>
              
              <p className="text-slate-600 text-sm leading-relaxed font-medium mb-8">
                 {currentContent.body}
              </p>

              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-4 items-start mb-8">
                 <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                 <div>
                    <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Pro Tip</div>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed italic">"{currentContent.tip}"</p>
                 </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-8">
                 <button 
                   disabled={activeStep === 1}
                   onClick={() => setActiveStep(prev => prev - 1)}
                   className="text-xs font-bold text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors uppercase tracking-wider"
                 >
                   Previous
                 </button>
                 
                 {activeStep < steps.length ? (
                    <button 
                      onClick={() => setActiveStep(prev => prev + 1)}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg active:scale-95"
                    >
                      Next Step <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                 ) : (
                    <button 
                      onClick={onStartSearch}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95"
                    >
                      Launch Engine <Sparkles className="w-3.5 h-3.5" />
                    </button>
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default SystemTutorialView;
