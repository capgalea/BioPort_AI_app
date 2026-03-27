
import React from 'react';
import { 
  Target, ShieldCheck, Database, 
  Bot, Globe, LayoutGrid,
  ChevronRight, Fingerprint, Users, Activity, Briefcase, Pill
} from 'lucide-react';

interface OverviewViewProps {
  onNavigateToSystemInfo?: () => void;
}

const OverviewView: React.FC<OverviewViewProps> = ({ onNavigateToSystemInfo }) => {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* Hero Section */}
      <div className="bg-slate-900 rounded-[2.5rem] p-12 sm:p-20 text-white relative overflow-hidden mb-16 shadow-2xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest mb-6">
             <ShieldCheck className="w-3.5 h-3.5" /> High Fidelity Data
          </div>
          <h1 className="text-5xl sm:text-6xl font-black mb-6 tracking-tighter leading-[1.1]">
            Unified Research <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Intelligence.</span>
          </h1>
          <p className="text-slate-400 text-xl leading-relaxed font-medium">
            BioPort AI is a professional intelligence engine designed to bridge the gap between 
            biotech innovation and academic research.
          </p>
        </div>
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
      </div>

      <div className="space-y-20">
        
        {/* Target Audience Section */}
        <section>
           <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Built For Professionals</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AudienceCard 
                title="Analysts"
                desc="Equity researchers tracking pipeline catalysts and corporate health."
                icon={<Activity className="w-6 h-6 text-indigo-600" />}
                bg="bg-indigo-50"
              />
              <AudienceCard 
                title="Researchers"
                desc="Scientists cross-referencing therapeutic areas with active trials."
                icon={<Fingerprint className="w-6 h-6 text-emerald-600" />}
                bg="bg-emerald-50"
              />
              <AudienceCard 
                title="Business Dev"
                desc="Identifying partnerships and M&A targets in specific sectors."
                icon={<Briefcase className="w-6 h-6 text-blue-600" />}
                bg="bg-blue-50"
              />
              <AudienceCard 
                title="Academic Faculty"
                desc="PIs monitoring industrial translation and grant alignment."
                icon={<Globe className="w-6 h-6 text-purple-600" />}
                bg="bg-purple-50"
              />
           </div>
        </section>

        {/* System Capabilities - Bento Grid Style */}
        <section>
           <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-slate-100 rounded-lg"><LayoutGrid className="w-5 h-5 text-slate-600" /></div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Capabilities</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px]">
              {/* Large Card */}
              <div className="md:col-span-2 row-span-2 bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 relative overflow-hidden group hover:shadow-xl transition-all">
                 <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                       <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                          <Bot className="w-7 h-7 text-indigo-600" />
                       </div>
                       <h3 className="text-2xl font-black text-slate-900 mb-4">AI Strategy Agent</h3>
                       <p className="text-slate-600 font-medium leading-relaxed max-w-md">
                          Conversational intelligence with tool-access to Google Search, PubMed, and our internal database. 
                          Generate competitive landscape reviews and SWOT analyses in seconds.
                       </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 mt-4">
                       Try the Agent <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                 </div>
                 <div className="absolute right-0 bottom-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl translate-y-1/4 translate-x-1/4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Smaller Cards */}
               <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:border-blue-400 transition-colors flex flex-col justify-between group">
                 <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <Database className="w-6 h-6 text-blue-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Bulk Analysis</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       Input lists of entities to build instant, comprehensive profiles with HQ & pipeline data.
                    </p>
                 </div>
              </div>

              <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:border-emerald-400 transition-colors flex flex-col justify-between group">
                 <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                    <Pill className="w-6 h-6 text-emerald-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Pharmacology</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       Deep-dive into specific drugs or disease areas to find approved therapies and mechanism of action.
                    </p>
                 </div>
              </div>

              <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:border-purple-400 transition-colors flex flex-col justify-between group">
                 <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                    <LayoutGrid className="w-6 h-6 text-purple-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Unified Analytics</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       Visual dashboards tracking pipeline distribution, global presence, and publication metrics.
                    </p>
                 </div>
              </div>

              <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:border-blue-400 transition-colors flex flex-col justify-between group">
                 <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <Globe className="w-6 h-6 text-blue-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Patent Intelligence</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       Search global patent databases, including IP Australia, to identify innovation trends and prospects.
                    </p>
                 </div>
              </div>
           </div>
        </section>

        {/* Data Integrity */}
        <section className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden">
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                 <h2 className="text-3xl font-black mb-6">Data Integrity Protocol</h2>
                 <p className="text-slate-400 font-medium leading-relaxed mb-8">
                    We leverage <strong>Search Grounding</strong> to eliminate hallucinations. Every data point is cross-verified across four primary silos in real-time.
                 </p>
                 <div className="space-y-4">
                    <IntegrityItem title="AACT / CTG Registry" desc="Clinical trial grounding via NCT identifiers." />
                    <IntegrityItem title="PubMed API" desc="Academic publication verification and grant tracking." />
                    <IntegrityItem title="PubChem Structure" desc="3D Molecular rendering and chemical properties." />
                    <IntegrityItem title="IP Australia API" desc="Australian patent data integration for prospect generation." />
                 </div>
              </div>
              <div className="relative h-64 lg:h-full min-h-[300px] bg-slate-800 rounded-3xl border border-slate-700 p-8 flex items-center justify-center">
                 <div className="text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/50">
                       <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-2xl font-black">Zero Hallucination</div>
                    <div className="text-sm text-slate-400 font-medium mt-1">Verification Layer Active</div>
                 </div>
              </div>
           </div>
        </section>

        {/* Technical Specs CTA */}
        <div className="flex justify-center pt-8">
           <button 
             onClick={onNavigateToSystemInfo}
             className="group flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
           >
             <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
               <Fingerprint className="w-5 h-5" />
             </div>
             <div className="text-left">
               <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technical</div>
               <div className="text-sm font-black text-slate-900">View System Specifications</div>
             </div>
             <ChevronRight className="w-5 h-5 text-slate-300 ml-2 group-hover:text-slate-900 transition-colors" />
           </button>
        </div>

      </div>

      <div className="mt-20 pt-12 border-t border-slate-100 text-center">
         <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
           BioPort AI Node • 2026
         </p>
      </div>
    </div>
  );
};

const AudienceCard = ({ title, desc, icon, bg }: any) => (
  <div className="p-6 bg-white border border-slate-200 rounded-3xl hover:shadow-lg transition-all group">
     <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center mb-4`}>
        {icon}
     </div>
     <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
     <p className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</p>
  </div>
);

const IntegrityItem = ({ title, desc }: { title: string, desc: string }) => (
  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
     <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
     <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-slate-400 font-medium">{desc}</div>
     </div>
  </div>
);

export default OverviewView;
