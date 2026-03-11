import React from 'react';
import { 
  Search, Database, PieChart, FileSpreadsheet, Zap, 
  CheckCircle2, Bot, Sparkles, GraduationCap, 
  ShieldCheck, Link2, Microscope, Cloud, 
  Lock, BarChart4, Globe2, Scale, Workflow
} from 'lucide-react';

const AboutView = () => {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 mb-20">
      {/* Main Container */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modern Hero Section */}
        <div className="bg-slate-900 p-12 sm:p-20 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Sparkles className="w-3.5 h-3.5" /> Intelligence Protocol v2.5
            </div>
            <h1 className="text-5xl sm:text-6xl font-black mb-8 tracking-tighter leading-[1.1]">
              Advanced Biopharma <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Intelligence.</span>
            </h1>
            <p className="text-slate-400 text-xl leading-relaxed font-medium">
              The premier research engine for cross-referencing industry pipelines 
              with academic breakthroughs. High-fidelity data for professional analysts.
            </p>
            
            <div className="flex flex-wrap gap-4 mt-10">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                 <ShieldCheck className="w-4 h-4 text-emerald-400" /> Grounded in Primary Sources
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                 <Lock className="w-4 h-4 text-blue-400" /> SECURE-NODE AUTH
              </div>
            </div>
          </div>
          
          {/* Decorative Gradient Blurs */}
          <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="p-10 sm:p-16 space-y-24">
          
          {/* Core Architecture Section */}
          <section>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">The Three Pillars</h2>
              <p className="text-slate-500 mt-2 font-medium">Engineered for accuracy, scale, and insight.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
               <FeatureItem 
                 icon={<Database className="w-7 h-7" />}
                 title="Hybrid Discovery"
                 desc="Merge corporate clinical registries with deep academic grant data into a unified knowledge graph."
                 color="text-blue-600"
                 bg="bg-blue-50"
               />
               <FeatureItem 
                 icon={<BarChart4 className="w-7 h-7" />}
                 title="Clinical Analytics"
                 desc="Visualize pipeline attrition and phase distribution across therapeutic areas instantly."
                 color="text-emerald-600"
                 bg="bg-emerald-50"
               />
               <FeatureItem 
                 icon={<Cloud className="w-7 h-7" />}
                 title="Cloud Persistence"
                 desc="Synchronize your research database across sessions with dedicated Supabase integration."
                 color="text-indigo-600"
                 bg="bg-indigo-50"
               />
            </div>
          </section>

          {/* AI Reasoning Spotlight */}
          <section className="bg-slate-50 rounded-[2rem] p-10 sm:p-14 border border-slate-100 relative overflow-hidden">
             <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
               <div>
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
                    <Bot className="w-8 h-8 text-slate-900" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-6">BioPort AI Agent</h2>
                  <p className="text-slate-600 text-lg leading-relaxed mb-8">
                    Unlike standard LLMs, the BioPort AI Agent uses <strong>Grounding Technology</strong>. 
                    AI-generated output is fact-checked using Google Search and cross-referenced against 
                    real-time clinical, drug, and academic registries.
                  </p>
                  
                  <div className="space-y-4">
                    <Capability icon={<Globe2 />} label="Live Web Fact-Checking" />
                    <Capability icon={<GraduationCap />} label="PubMed Literature Retrieval" />
                    <Capability icon={<Database />} label="Database-Aware Context" />
                  </div>
               </div>
               
               <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
                  <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                     <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-auto">Terminal Session</span>
                  </div>
                  <div className="space-y-4 font-mono text-xs leading-relaxed text-slate-700">
                    <p className="text-blue-600 font-bold">$ bioport --analyze "HER2+ Oncology"</p>
                    <p className="text-slate-400">Analyzing clinical landscape...</p>
                    <p className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      "Current HER2+ pipeline contains 14 Phase III candidates. Top competitor: Enhertu (AstraZeneca). 3 Academic trials identified at DFCI."
                    </p>
                    <div className="flex gap-2">
                       <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">PUBMED</span>
                       <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold">NCT-GND</span>
                    </div>
                  </div>
               </div>
             </div>
          </section>

          {/* Compliance & Verification Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
             <div>
                <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                   <Scale className="w-6 h-6 text-blue-600" /> 
                   Professional Compliance
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                   BioPort AI is strictly a <strong>research intelligence platform</strong>. 
                   Access is reserved for qualified researchers, analysts, and healthcare 
                   professionals who acknowledge the mandatory use-wrap terms.
                </p>
                <ul className="space-y-4">
                   <li className="flex gap-3 text-sm text-slate-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>Zero medical diagnosis or treatment advice</span>
                   </li>
                   <li className="flex gap-3 text-sm text-slate-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>Data must be independently verified via primary sources</span>
                   </li>
                   <li className="flex gap-3 text-sm text-slate-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>Intended for business and academic intelligence only</span>
                   </li>
                </ul>
             </div>
             
             <div className="p-8 bg-blue-600 rounded-[2rem] text-white">
                <h4 className="font-black text-xl mb-4">Data Integrity Protocol</h4>
                <p className="text-blue-100 text-sm leading-relaxed mb-8">
                   We utilize multi-step verification for every entity. 
                   Corporate data is bridged directly to <strong>ClinicalTrials.gov</strong> via 
                   NCT identifiers, while Academic pipelines leverage the <strong>PubMed API</strong> for 
                   real-time grant and publication tracking.
                </p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black uppercase opacity-60 mb-1">Corporate</p>
                      <p className="font-bold">AACT Grounded</p>
                   </div>
                   <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black uppercase opacity-60 mb-1">Academic</p>
                      <p className="font-bold">PubMed Sync</p>
                   </div>
                </div>
             </div>
          </section>

          {/* Future Vision Section */}
          <section className="relative p-10 sm:p-14 bg-gradient-to-br from-blue-900 to-slate-900 rounded-[2.5rem] text-white overflow-hidden shadow-2xl">
             <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[9px] font-black uppercase tracking-widest mb-6">
                   <Workflow className="w-3 h-3" /> Roadmap v3.0
                </div>
                <h2 className="text-3xl font-black mb-6 tracking-tight">Future Vision: The Knowledge Graph</h2>
                <p className="text-blue-100 text-lg leading-relaxed mb-8">
                   Future versions of BioPort AI will move beyond text generation. We are engineering a system that will 
                   <strong> dynamically build a "Scientific Knowledge Graph"</strong> by autonomously synthesizing 
                   complex relationships across clinical trials, drug registries, and global patent databases.
                </p>
                <div className="flex flex-wrap gap-6">
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="text-sm font-bold text-blue-200">Autonomous Synthesis</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-sm font-bold text-blue-200">Patent Intelligence</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-sm font-bold text-blue-200">Cross-Domain Mapping</span>
                   </div>
                </div>
             </div>
             
             {/* Decorative Background Element */}
             <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                   <path fill="#FFFFFF" d="M44.7,-76.4C58.1,-69.2,69.2,-58.1,76.4,-44.7C83.6,-31.3,86.9,-15.7,85.3,-0.9C83.7,13.8,77.3,27.7,68.1,39.1C58.9,50.5,46.9,59.4,33.7,66.1C20.5,72.8,6.1,77.3,-8.9,76.8C-23.9,76.3,-39.5,70.8,-52.1,61.8C-64.7,52.8,-74.3,40.3,-79.1,26.3C-83.9,12.3,-83.9,-3.2,-79.7,-17.7C-75.5,-32.2,-67.1,-45.7,-55.5,-53.9C-43.9,-62.1,-29.1,-65,-15.1,-70.6C-1.1,-76.2,12.1,-84.5,26.3,-84.5C40.5,-84.5,55.7,-76.2,44.7,-76.4Z" transform="translate(100 100)" />
                </svg>
             </div>
          </section>

          {/* Final Footer Label */}
          <div className="pt-12 border-t border-slate-100 text-center">
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
               BioPort AI Research Intelligence Node • 2026
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, title, desc, color, bg }: any) => (
  <div className="group cursor-default">
    <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-lg font-black text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

// Fix for React.cloneElement type error by casting to element with className prop
const Capability = ({ icon, label }: any) => (
  <div className="flex items-center gap-3 text-sm font-bold text-slate-800">
    <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-blue-600">
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
    </div>
    {label}
  </div>
);

export default AboutView;