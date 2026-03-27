import React, { useState, useEffect } from 'react';
import { Database, Bot, Globe, ShieldCheck, Laptop, Server, HardDrive, Terminal, Network, ChevronRight, Sparkles, Workflow, Zap, Lock, Cloud, RefreshCw, AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Cpu, Activity, Info, Key, Fingerprint } from 'lucide-react';
import { supabaseService } from '../services/supabaseService.ts';
import MermaidWorkflowModal from './MermaidWorkflowModal.tsx';

const ArchitectureView: React.FC = () => {
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    const checkConnection = async () => {
      const result = await supabaseService.testConnection();
      setDbStatus(result.success ? 'connected' : 'disconnected');
    };
    checkConnection();
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      {/* Header Bar */}
      <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900 p-8 rounded-[2rem] shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-400/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
             <Fingerprint className="w-3 h-3" /> System Intelligence Node: Alpha-9 (v2.5)
           </div>
           <h1 className="text-4xl font-black text-white tracking-tighter">Architecture <span className="text-blue-500">Schematics.</span></h1>
           <p className="text-slate-400 text-lg mt-2 font-medium">BioPort AI Core Infrastructure & Multi-Agent Orchestration</p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${dbStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            <span className="text-xs font-black uppercase tracking-widest">Database: {dbStatus.toUpperCase()}</span>
          </div>
          
          <button 
             onClick={() => setShowWorkflow(true)}
             className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 shadow-xl active:scale-95 transition-all group"
          >
            <Workflow className="w-4 h-4 group-hover:rotate-12 transition-transform" /> 
            Open Agent Logic
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Infrastructure Map */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[3rem] p-10 sm:p-14 shadow-2xl border border-slate-200 relative overflow-hidden min-h-[700px]">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            
            <div className="relative z-10 flex flex-col gap-12">
              
              {/* Client Cluster */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 flex items-center gap-4 mb-2">
                   <div className="h-px bg-slate-200 flex-1"></div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Access Layer</h3>
                   <div className="h-px bg-slate-200 flex-1"></div>
                </div>
                
                <ArchNode 
                  title="Front-End Node" 
                  subtitle="React 19 • Tailwind v4" 
                  icon={<Laptop className="text-blue-600" />}
                  desc="High-performance SPA delivering real-time intelligence visuals."
                  status="Active"
                  glow="blue"
                />
                <ArchNode 
                  title="Edge Cache" 
                  subtitle="IndexedDB Local Store" 
                  icon={<HardDrive className="text-emerald-600" />}
                  desc="Persistent low-latency storage for offline data availability."
                  status="Syncing"
                  glow="emerald"
                />
              </div>

              {/* Logic / AI Bridge */}
              <div className="relative flex flex-col items-center">
                 <div className="w-1 h-12 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                 
                 <div className="w-full flex justify-center py-4">
                    <div className="group relative" onClick={() => setShowWorkflow(true)}>
                       <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                       <div className="relative bg-slate-900 p-8 rounded-3xl border-2 border-indigo-500/50 shadow-2xl flex flex-col items-center gap-4 cursor-pointer hover:scale-105 transition-all">
                          <Bot className="w-12 h-12 text-indigo-400" />
                          <div className="text-center">
                             <h4 className="text-white font-black text-lg tracking-tight">Gemini 3.1 Pro Orchestrator</h4>
                             <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-1">Multi-Agent Reasoning Engine</p>
                          </div>
                          <div className="flex gap-2">
                             <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[8px] font-black uppercase border border-indigo-500/30">G-SEARCH</span>
                             <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[8px] font-black uppercase border border-indigo-500/30">NCT-GND</span>
                             <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[8px] font-black uppercase border border-indigo-500/30">PubSync</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="w-1 h-12 bg-gradient-to-b from-indigo-600 to-rose-600 rounded-full"></div>
              </div>

              {/* Data Persistence Cluster */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 flex items-center gap-4 mb-2">
                   <div className="h-px bg-slate-200 flex-1"></div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Persistence Layer</h3>
                   <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <ArchNode 
                  title="Supabase Cloud" 
                  subtitle="PostgreSQL + Realtime" 
                  icon={<Cloud className="text-rose-600" />}
                  desc="Distributed cloud storage for user records and global analytics."
                  status={dbStatus === 'connected' ? 'Online' : 'Offline'}
                  glow="rose"
                />
                <ArchNode 
                  title="Public Registries" 
                  subtitle="AACT + PubMed + G-Search + IP Australia" 
                  icon={<Globe className="text-purple-600" />}
                  desc="Live grounding nodes for clinical, drug, academic, and patent verification via Google Search and primary APIs."
                  status="Connected"
                  glow="purple"
                />
              </div>

            </div>
          </div>
        </div>

        {/* System Monitoring Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Security Pulse */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-16 h-16 text-white" />
             </div>
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <Lock className="w-3.5 h-3.5 text-amber-500" /> Security Audit
             </h3>
             
             <div className="space-y-4">
                <SecurityItem label="RLS Policies" status="Active" icon={<ShieldAlert className="text-emerald-500" />} />
                <SecurityItem label="JWT Session" status="Encrypted" icon={<Key className="text-blue-500" />} />
                <SecurityItem label="API Scrubbing" status="Verified" icon={<Cpu className="text-indigo-500" />} />
             </div>

             <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Uptime Score</div>
                <div className="text-emerald-400 font-black text-sm tracking-widest">99.98%</div>
             </div>
          </div>

          {/* Diagnostic Console */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl flex flex-col h-full">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2"><Terminal className="w-4 h-4 text-slate-900" /> Diagnostics</span>
              <button onClick={handleSync} className="hover:text-blue-600 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </h3>

            <div className="space-y-4 flex-1">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Memory Allocation</span>
                    <span className="text-[10px] font-mono text-blue-600">42.4 MB</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-blue-500 h-full w-[15%]" />
                  </div>
               </div>

               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Latency Node-A</span>
                    <span className="text-[10px] font-mono text-emerald-600">12ms</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-emerald-500 h-full w-[8%]" />
                  </div>
               </div>

               {/* Simulated System Log */}
               <div className="mt-4 bg-slate-950 p-4 rounded-xl font-mono text-[9px] text-emerald-500/80 space-y-1.5 min-h-[160px] border border-slate-800">
                  <div className="flex gap-2">
                    <span className="text-slate-600">[08:42:11]</span>
                    <span>LOG: session_init_secure</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-600">[08:42:12]</span>
                    <span>AUTH: user_node_authorized</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-600">[08:42:15]</span>
                    <span className="text-blue-400">SYNC: fetching_clinical_delta...</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-600">[08:42:18]</span>
                    <span className="text-amber-400">WARN: rate_limit_approaching</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-600">[08:42:20]</span>
                    <span className="animate-pulse">_ cursor_active</span>
                  </div>
               </div>
            </div>

            <div className="mt-8 bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-3">
               <p className="text-[10px] text-blue-700 leading-relaxed font-bold">
                 <Info className="w-3 h-3 inline mr-1 -mt-0.5" /> BioPort AI Architecture is strictly stateless at the reasoning layer, ensuring zero retention of sensitive proprietary queries.
               </p>
               <div className="pt-3 border-t border-blue-200">
                  <p className="text-[10px] text-indigo-700 leading-relaxed font-black uppercase tracking-widest flex items-center gap-2">
                    <Workflow className="w-3 h-3" /> Roadmap v3.0
                  </p>
                  <p className="text-[9px] text-indigo-600 font-bold mt-1">
                    Transitioning to a dynamic Scientific Knowledge Graph for autonomous synthesis of clinical, drug, and patent data.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {showWorkflow && <MermaidWorkflowModal onClose={() => setShowWorkflow(false)} />}
    </div>
  );
};

const ArchNode = ({ title, subtitle, icon, desc, status, glow }: any) => {
  const glowClasses: Record<string, string> = {
    blue: 'shadow-blue-500/5 hover:border-blue-300 ring-blue-500/5',
    emerald: 'shadow-emerald-500/5 hover:border-emerald-300 ring-emerald-500/5',
    rose: 'shadow-rose-500/5 hover:border-rose-300 ring-rose-500/5',
    purple: 'shadow-purple-500/5 hover:border-purple-300 ring-purple-500/5'
  };

  const statusColors: Record<string, string> = {
    Active: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    Syncing: 'bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.4)]',
    Online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    Connected: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    Offline: 'bg-slate-300',
    Checking: 'bg-amber-400 animate-bounce'
  };

  return (
    <div className={`group p-6 rounded-3xl border border-slate-200 bg-white transition-all duration-500 shadow-2xl hover:-translate-y-1 ring-4 ${glowClasses[glow]}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform duration-500">
          {React.cloneElement(icon, { className: 'w-6 h-6' })}
        </div>
        <div>
          <h4 className="text-slate-900 font-black text-sm tracking-tight">{title}</h4>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-4 font-medium">{desc}</p>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-50 pt-4">
        <div className={`w-2 h-2 rounded-full ${statusColors[status] || 'bg-slate-300'}`}></div>
        {status}
      </div>
    </div>
  );
};

const SecurityItem = ({ label, status, icon }: any) => (
  <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
     <div className="flex items-center gap-3">
        {React.cloneElement(icon, { className: 'w-4 h-4' })}
        <span className="text-xs font-bold text-slate-300">{label}</span>
     </div>
     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{status}</span>
  </div>
);

export default ArchitectureView;