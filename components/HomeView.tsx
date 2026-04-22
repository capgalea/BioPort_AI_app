
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Dna, ArrowRight, ShieldCheck, Zap, 
  Search, Sparkles, Briefcase, Bot, Lock, UserPlus, Shield, Workflow, Cpu, Map as MapIcon, FileText, Globe, PieChart, Pill, Activity, AlertTriangle, CheckCircle2, Loader2, DollarSign
} from 'lucide-react';
import { checkGeminiHealth } from '../services/geminiService';
import { costTracker } from '../services/costTracker';

const CostTrackerIndicator = () => {
  const [cost, setCost] = useState(0);

  useEffect(() => {
    return costTracker.subscribe(setCost);
  }, []);

  if (cost === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm mb-8 ml-2">
      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
        Session LLM Cost: ${cost.toFixed(4)}
      </span>
    </div>
  );
};

const GeminiStatusIndicator = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      const isHealthy = await checkGeminiHealth();
      setStatus(isHealthy ? 'online' : 'offline');
    };
    checkStatus();
    // Optional: check periodically every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm mb-8">
      {status === 'checking' && (
        <>
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Checking Gemini API...</span>
        </>
      )}
      {status === 'online' && (
        <>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Gemini API Online</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Gemini API Offline / Quota Exceeded</span>
        </>
      )}
    </div>
  );
};

interface HomeViewProps {
  session: any;
  isGuest: boolean;
  onLoginSuccess: () => void;
  onGuestAccess: () => void;
  onNavigate: (view: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ session, isGuest, onNavigate }) => {
  const isAuthenticated = !!session || isGuest;
  const isPreviewMode = useMemo(() => window.self !== window.top, []);
  
  const userEmail = session?.email?.toLowerCase();
  const isArchitect = userEmail === 'charles.galea@bioport.ai';

  const portalLinks = [
    {
      title: "Discovery Engine",
      description: "Search companies, analyze sectors, and build instant intelligence profiles.",
      icon: <Search className="w-5 h-5 text-white" />,
      action: () => onNavigate('search'),
      btnText: "Start Searching",
      color: "from-blue-500 to-blue-600",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "Drug Intelligence",
      description: "Deep pharmacological profiles, mechanism of action, and 3D molecular structures.",
      icon: <Pill className="w-5 h-5 text-white" />,
      action: () => onNavigate('drugSearch'),
      btnText: "Analyze Drugs",
      color: "from-emerald-500 to-teal-500",
      image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "Market Analytics",
      description: "Visualize global pipelines, academic output, and competitive landscapes.",
      icon: <PieChart className="w-5 h-5 text-white" />,
      action: () => onNavigate('analytics'),
      btnText: "View Dashboards",
      color: "from-violet-500 to-purple-600",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "AI Strategist",
      description: "Conversational agent grounded in real-time clinical and academic data.",
      icon: <Bot className="w-5 h-5 text-white" />,
      action: () => onNavigate('agent'),
      btnText: "Consult Agent",
      color: "from-indigo-500 to-indigo-600",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "Prospect Generator",
      description: "Generate and manage customer prospects for your biotech outreach. Now supporting US (Google Patents) and Australian (IP Australia) patent data.",
      icon: <UserPlus className="w-5 h-5 text-white" />,
      action: () => onNavigate('prospectGenerator'),
      btnText: "Generate Prospects",
      color: "from-pink-500 to-rose-500",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop"
    },
    {
      title: "Patents Intelligence",
      description: "Analyze patent landscapes, inventor networks, and technological trajectories.",
      icon: <FileText className="w-5 h-5 text-white" />,
      action: () => onNavigate('patentAnalytics'),
      btnText: "Explore Patents",
      color: "from-orange-500 to-amber-500",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop"
    }
  ];

  if (isPreviewMode || isArchitect) {
    portalLinks.push({
      title: "Architecture",
      description: "View the system schematics and reasoning engine protocols.",
      icon: <Cpu className="w-5 h-5 text-white" />,
      action: () => onNavigate('architecture'),
      btnText: "View Specs",
      color: "from-slate-600 to-slate-700",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop"
    });
  }

  return (
    <div className="animate-in fade-in duration-700 bg-white">
      {/* Hero Section */}
      <section className="relative pt-10 pb-32 px-4 sm:px-6 lg:px-8 border-b border-slate-100 overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           <div className="absolute -top-[20%] left-[20%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] opacity-60 mix-blend-multiply"></div>
           <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[100px] opacity-60 mix-blend-multiply"></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="flex justify-center items-center flex-wrap">
            <GeminiStatusIndicator />
            <CostTrackerIndicator />
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-900 mb-6 tracking-tighter leading-[1.1]">
            Accelerate <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Biotech Intelligence.</span>
          </h1>

          <p className="text-slate-500 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Next-generation research engine utilizing <span className="text-slate-900 font-bold">Gemini 3 Pro</span> for advanced <span className="text-slate-900 font-bold">multi-agent orchestration</span> across corporate pipelines, clinical trials, and academic breakthroughs.
          </p>

          {/* Mock Search Interaction */}
          <div className="max-w-2xl mx-auto mb-12 relative group cursor-pointer" onClick={() => onNavigate('search')}>
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
             <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 p-4 flex items-center gap-4">
                <Search className="w-5 h-5 text-slate-400" />
                <div className="flex-1 text-left">
                   <span className="text-slate-400 text-sm font-medium">Search for "mRNA Oncology" or "Pfizer"...</span>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                   <div className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 border border-slate-200">⌘K</div>
                </div>
                <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors">
                   <ArrowRight className="w-4 h-4" />
                </button>
             </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {!isAuthenticated ? (
              <>
                <button 
                  onClick={() => onNavigate('register')}
                  className="px-8 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 hover:-translate-y-0.5 transition-all shadow-lg active:scale-95"
                >
                  Create Account
                </button>
                <button 
                  onClick={() => onNavigate('login')}
                  className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                >
                  Log In
                </button>
              </>
            ) : (
              <button 
                onClick={() => onNavigate('search')}
                className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Launch Discovery
              </button>
            )}
            
            <button 
              onClick={() => onNavigate('howToNavigate')}
              className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 active:scale-95"
            >
              <MapIcon className="w-4 h-4" />
              System Tour
            </button>
          </div>

          {/* Learn More Section */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            <button onClick={() => onNavigate('overview')} className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest">Product Overview</button>
            <button onClick={() => onNavigate('aboutUs')} className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest">Our Mission</button>
            <button onClick={() => onNavigate('overview')} className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest">Target Audience</button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {portalLinks.map((portal, idx) => (
            <div 
              key={idx}
              onClick={portal.action}
              className={`group relative rounded-3xl border border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer bg-white overflow-hidden flex flex-col h-full`}
            >
              {/* Image Section */}
              <div className="h-48 w-full overflow-hidden relative shrink-0">
                 <div className={`absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-10`} />
                 <img src={portal.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={portal.title} />
                 
                 {/* Icon Overlay */}
                 <div className="absolute bottom-4 left-4 z-20">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center shadow-lg text-white border border-white/20 backdrop-blur-sm`}>
                        {portal.icon}
                    </div>
                 </div>
              </div>

              {/* Content Section */}
              <div className="p-6 pt-5 flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 mb-2">{portal.title}</h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6 flex-1">
                    {portal.description}
                  </p>
                  
                  <div className="flex items-center text-sm font-bold text-blue-600 group-hover:translate-x-2 transition-transform">
                    {portal.btnText}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grounding Technology Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
         <div className="bg-slate-900 rounded-[3rem] p-8 sm:p-16 relative overflow-hidden shadow-2xl">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
               <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
                     <ShieldCheck className="w-3.5 h-3.5" /> Data Integrity Protocol
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-6">
                     BioPort AI Agent uses <br/>
                     <span className="text-blue-400">Grounding Technology.</span>
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed mb-8">
                     Unlike standard LLMs, AI-generated output is <span className="text-white font-bold">fact-checked using Google Search</span> and cross-referenced against real-time clinical, drug, academic registries, and intellectual property databases like Google Patents and PubChem. We bridge the gap between AI reasoning and primary source verification.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="text-blue-400 font-black text-xs uppercase tracking-widest mb-1">Clinical</div>
                        <div className="text-white text-sm font-bold">NCT Registry Sync</div>
                     </div>
                     <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-1">Academic</div>
                        <div className="text-white text-sm font-bold">PubMed Literature GND</div>
                     </div>
                     <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="text-amber-400 font-black text-xs uppercase tracking-widest mb-1">IP & Patents</div>
                        <div className="text-white text-sm font-bold">Google Patents Search</div>
                     </div>
                     <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="text-purple-400 font-black text-xs uppercase tracking-widest mb-1">Compounds</div>
                        <div className="text-white text-sm font-bold">PubChem Database</div>
                     </div>
                  </div>
               </div>
               
               <div className="relative">
                  <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full"></div>
                  <div className="relative bg-slate-800/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
                     <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="ml-auto text-[10px] font-black text-slate-500 uppercase tracking-widest">Verification Engine</span>
                     </div>
                     <div className="space-y-4 font-mono text-xs">
                        <div className="flex gap-3">
                           <span className="text-blue-400 shrink-0">$</span>
                           <span className="text-slate-300">agent --verify "Phase III Oncology Pipeline"</span>
                        </div>
                        <div className="text-slate-500 italic">Connecting to ClinicalTrials.gov, PubMed, and Google Patents...</div>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-slate-300 leading-relaxed">
                           "Verification successful. Cross-referenced 14 candidates with NCT identifiers. Academic citations confirmed via PubMed API. Patent priority dates validated."
                        </div>
                        <div className="flex flex-wrap gap-2">
                           <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[9px] font-bold border border-blue-500/30">AACT-SYNC</span>
                           <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold border border-emerald-500/30">PUBMED-GND</span>
                           <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-bold border border-amber-500/30">PATENT-API</span>
                           <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[9px] font-bold border border-purple-500/30">CHEM-SYNC</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/5 to-transparent pointer-events-none"></div>
         </div>
      </section>

      {/* Trust & Stats */}
      <section className="bg-slate-50 border-y border-slate-200 py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
               <div>
                  <div className="text-3xl font-black text-slate-900 mb-1">150k+</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Trials</div>
               </div>
               <div>
                  <div className="text-3xl font-black text-slate-900 mb-1">24/7</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registry Sync</div>
               </div>
               <div>
                  <div className="text-3xl font-black text-slate-900 mb-1">Global</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">University Coverage</div>
               </div>
               <div>
                  <div className="text-3xl font-black text-slate-900 mb-1">99.9%</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Uptime</div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-slate-900">
            <Dna className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-black tracking-tighter">BioPort AI</span>
          </div>
          <button 
            onClick={() => onNavigate('pamphlet')}
            className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            Download System Pamphlet
          </button>
          <button 
            onClick={() => onNavigate('about')}
            className="px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest flex items-center gap-2"
          >
            <Workflow className="w-3 h-3 text-blue-500" />
            View v3.0 Roadmap: Scientific Knowledge Graph
          </button>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            &copy; 2026 BioPort Intelligence Labs
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeView;
