
import React, { useState, useEffect } from 'react';
import { Info, Code, MapPin, User, Calendar, ShieldCheck, Zap, Globe, Github, Cpu, Database, Fingerprint, Activity, BarChart, Users, Clock } from 'lucide-react';
import { supabaseService } from '../services/supabaseService.ts';

const SystemInfoView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'specs' | 'usage'>('specs');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  useEffect(() => {
    if (activeTab === 'usage') {
      const loadAnalytics = async () => {
        setLoadingUsage(true);
        const data = await supabaseService.getUsageAnalytics();
        setAnalytics(data);
        setLoadingUsage(false);
      };
      loadAnalytics();
    }
  }, [activeTab]);

  const techStack = [
    { name: 'Core Engine', detail: 'React 19.2.1 (Concurrent Mode)', icon: <Cpu className="w-4 h-4" /> },
    { name: 'Intelligence', detail: 'Google Gemini 3.0 Pro & Flash', icon: <Zap className="w-4 h-4" /> },
    { name: 'Persistence', detail: 'Supabase Cloud (PostgreSQL)', icon: <Database className="w-4 h-4" /> },
    { name: 'Interface', detail: 'Tailwind CSS v4-alpha', icon: <Code className="w-4 h-4" /> },
    { name: 'Mapping', detail: 'Leaflet.js + Google Tiles', icon: <Globe className="w-4 h-4" /> }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-10 sm:p-12 text-white relative">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified System Node
                </div>
                <h1 className="text-4xl font-black mb-2 tracking-tight">System Metadata.</h1>
                <p className="text-slate-400 font-medium">Technical specifications and telemetry.</p>
              </div>
              
              {/* Tab Toggle */}
              <div className="flex bg-slate-800 p-1 rounded-xl">
                 <button 
                   onClick={() => setActiveTab('specs')}
                   className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'specs' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                 >
                   Specs
                 </button>
                 <button 
                   onClick={() => setActiveTab('usage')}
                   className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'usage' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                 >
                   Usage Telemetry
                 </button>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>

        {activeTab === 'specs' ? (
          <div className="p-8 sm:p-12 space-y-12 animate-in fade-in slide-in-from-right-4">
            
            {/* Core Identity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" /> Software versioning
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-slate-600">Release Build</span>
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-black">v1.0.12-Beta</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-600">Architecture</span>
                      <span className="text-slate-500 font-mono text-xs">Node-Alpha-7</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-600">Last Major Update</span>
                      <span className="text-slate-500">{currentDate}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> IP & Innovation
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase">Lead Architect / Inventor</div>
                        <div className="text-lg font-black text-slate-900">Charles Galea</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase">Organization</div>
                        <div className="text-sm font-bold text-slate-700">BioPort AI Intelligence Labs</div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Global Headquarters
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 h-full">
                    <div className="mb-6">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Registered Address</div>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed">
                        Melbourne, VIC 3000<br />
                        Australia
                      </p>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Regional Hubs</div>
                      <ul className="text-xs font-bold text-slate-600 space-y-1">
                        {/* Empty as per request */}
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Tech Stack Summary */}
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 text-center justify-center">
                <Code className="w-4 h-4" /> Technology Integration Stack
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {techStack.map((tech, i) => (
                  <div key={i} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      {tech.icon}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{tech.name}</div>
                    <div className="text-xs font-bold text-slate-800 leading-tight">{tech.detail}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Legal / Compliance Badge */}
            <div className="mt-12 p-8 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col items-center text-center">
               <ShieldCheck className="w-12 h-12 text-blue-600 mb-4" />
               <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Enterprise Compliance Node</h3>
               <p className="text-sm text-blue-700 font-medium max-w-lg leading-relaxed">
                 This instance of BioPort AI is registered and verified for professional use. All intelligence retrieval protocols comply with the End-User License Agreement version 1.2.0.
               </p>
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-12 space-y-12 animate-in fade-in slide-in-from-right-4">
             {loadingUsage ? (
               <div className="text-center py-20 text-slate-400">Loading Telemetry...</div>
             ) : analytics ? (
               <>
                 {/* Top Metrics */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl">
                       <div className="flex items-center gap-3 mb-4 text-emerald-600">
                          <Activity className="w-5 h-5" />
                          <h4 className="text-xs font-black uppercase tracking-widest">Total Actions</h4>
                       </div>
                       <div className="text-3xl font-black text-slate-900">{analytics.totalLogs.toLocaleString()}</div>
                       <div className="text-[10px] text-slate-400 font-bold mt-2">Verified Interactions</div>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl">
                       <div className="flex items-center gap-3 mb-4 text-blue-600">
                          <Users className="w-5 h-5" />
                          <h4 className="text-xs font-black uppercase tracking-widest">Unique Users</h4>
                       </div>
                       <div className="text-3xl font-black text-slate-900">{analytics.uniqueUsers.toLocaleString()}</div>
                       <div className="text-[10px] text-slate-400 font-bold mt-2">Active Accounts</div>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl">
                       <div className="flex items-center gap-3 mb-4 text-indigo-600">
                          <Clock className="w-5 h-5" />
                          <h4 className="text-xs font-black uppercase tracking-widest">Platform Status</h4>
                       </div>
                       <div className="text-3xl font-black text-slate-900">Live</div>
                       <div className="text-[10px] text-slate-400 font-bold mt-2">Telemetry Online</div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Actions Chart */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <BarChart className="w-4 h-4 text-slate-400" /> Top System Actions
                       </h3>
                       <div className="space-y-4">
                          {analytics.topActions.map((action: any, idx: number) => {
                             const maxVal = Math.max(...analytics.topActions.map((a: any) => a.count));
                             const widthPct = (action.count / maxVal) * 100;
                             return (
                               <div key={idx}>
                                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                                     <span>{action.type}</span>
                                     <span className="text-slate-400">{action.count}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                     <div className="bg-blue-600 h-full rounded-full" style={{ width: `${widthPct}%` }}></div>
                                  </div>
                               </div>
                             );
                          })}
                       </div>
                    </div>

                    {/* Recent Activity Stream */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col h-[400px]">
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Database className="w-4 h-4 text-slate-400" /> Recent Stream
                       </h3>
                       <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                          {analytics.recentLogs.map((log: any) => (
                             <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex justify-between items-start mb-1">
                                   <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 rounded">{log.action_type}</span>
                                   <span className="text-[10px] font-mono text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                                <div className="text-xs text-slate-600 font-medium truncate">
                                   {log.user_email || 'Guest'}
                                </div>
                                {log.details && Object.keys(log.details).length > 0 && (
                                   <div className="mt-1.5 text-[9px] text-slate-400 font-mono bg-white p-1.5 rounded border border-slate-100 truncate">
                                      {JSON.stringify(log.details)}
                                   </div>
                                )}
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
               </>
             ) : (
               <div className="text-center py-20 text-slate-400">
                 <p className="font-bold">No telemetry data found.</p>
                 <p className="text-xs mt-2">Connect a database to enable analytics.</p>
               </div>
             )}
          </div>
        )}

        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
             BioPort AI • Registered System ID: 0x7E3-NODE-2026
           </p>
        </div>
      </div>
    </div>
  );
};

export default SystemInfoView;
