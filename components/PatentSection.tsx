
import React, { useState, useEffect } from 'react';
import { FileText, Loader2, ExternalLink, ShieldCheck, Calendar, Hash, Filter, Clock, Sparkles } from 'lucide-react';
import { intelligentPatentSearch } from '../services/geminiService.ts';
import { Patent } from '../types.ts';

interface PatentSectionProps {
  companyName: string;
}

const PatentSection: React.FC<PatentSectionProps> = ({ companyName }) => {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timescale, setTimescale] = useState<'1y' | '5y' | 'all'>('all');
  const [source, setSource] = useState<'ip_au' | 'google' | 'epo'>('ip_au');

  useEffect(() => {
    const fetchPatents = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: Patent[] = await intelligentPatentSearch(companyName, [source]);
        
        // Filter by timescale and assignee
        const now = new Date();
        const normalizeName = (name: string) => {
          return name.toLowerCase()
            .replace(/inc\.?|llc|ltd\.?|corp\.?|corporation|pty|limited|se|sa|ag|gmbh/g, '')
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]/g, '')
            .trim();
        };
        
        const companyNameNormalized = normalizeName(companyName);
        
        const filtered = data.filter(p => {
          // Check assignee
          const applicantNormalized = normalizeName(p.applicant || '');
          
          // We consider it a match if one string is a substring of the other
          const isAssignee = applicantNormalized.includes(companyNameNormalized) || 
                             companyNameNormalized.includes(applicantNormalized);
          
          if (!isAssignee) return false;

          // Check timescale
          if (timescale === 'all') return true;
          const filedDate = new Date(p.filed);
          if (isNaN(filedDate.getTime())) return true; // Keep if date is unparseable
          const diffYears = (now.getTime() - filedDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          if (timescale === '1y') return diffYears <= 1;
          if (timescale === '5y') return diffYears <= 5;
          return true;
        });

        setPatents(filtered);
      } catch (err: any) {
        console.error("Failed to fetch patents:", err);
        setError(err.message || "Patent service unavailable");
      } finally {
        setLoading(false);
      }
    };

    fetchPatents();
  }, [companyName, timescale, source]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Recent Patents</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IP Portfolio Node</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
            <button 
              onClick={() => setSource('ip_au')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${source === 'ip_au' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              IP AU
            </button>
            <button 
              onClick={() => setSource('google')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${source === 'google' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Google
            </button>
            <button 
              onClick={() => setSource('epo')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${source === 'epo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              EPO
            </button>
          </div>
          <button 
            onClick={() => setTimescale('1y')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timescale === '1y' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Last 12M
          </button>
          <button 
            onClick={() => setTimescale('5y')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timescale === '5y' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Last 5Y
          </button>
          <button 
            onClick={() => setTimescale('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timescale === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All Time
          </button>
        </div>
      </div>

      {source === 'google' && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-[10px] text-amber-800 leading-tight">
            <span className="font-black uppercase tracking-tight mr-1">Global Snapshot:</span>
            Searching across 100+ patent offices using <code className="bg-amber-100 px-1 rounded font-bold">assignee:"{companyName}"</code>. 
            For deeper analysis, use the <strong>Assignee</strong> filter on the official record page.
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-40 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-100 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {source === 'ip_au' ? 'Scanning IP Australia...' : source === 'google' ? 'Searching Google Patents...' : 'Searching EPO Patents...'}
          </span>
        </div>
      ) : error ? (
        <div className="h-40 flex flex-col items-center justify-center bg-red-50 rounded-3xl border border-red-100 text-red-600 p-6 text-center">
          <ShieldCheck className="w-6 h-6 mb-2 opacity-50" />
          <span className="text-xs font-bold mb-1">
            {source === 'ip_au' ? 'IP Australia Connection Issue' : source === 'google' ? 'Google Patents Search Issue' : 'EPO Patents Search Issue'}
          </span>
          <span className="text-[10px] font-medium opacity-70">{error}</span>
        </div>
      ) : patents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {patents.map((patent, idx) => {
            const cleanAppNum = patent.appNum ? patent.appNum.replace(/[^a-zA-Z0-9]/g, '') : '';
            const googleUrl = patent.url && patent.url.includes('patents.google.com') 
              ? patent.url 
              : `https://patents.google.com/patent/${cleanAppNum}/en?q=(assignee:${encodeURIComponent(`"${companyName}"`)})&oq=assignee:${encodeURIComponent(`"${companyName}"`)}`;
            
            return (
            <a 
              key={idx} 
              href={patent.source === 'Google Patents' ? googleUrl : (patent.source === 'EPO' ? `https://worldwide.espacenet.com/patent/search?q=pn%3D${patent.appNum ? patent.appNum.replace(/[^a-zA-Z0-9]/g, '') : ''}` : (patent.url || `https://pericles.ipaustralia.gov.au/ols/auspat/applicationDetails.do?applicationNo=${patent.appNum ? patent.appNum.replace(/[^0-9]/g, '') : ''}`))}
              target="_blank"
              rel="noreferrer"
              className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-md transition-all group block"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-tight border border-slate-100">
                    <Hash className="w-2.5 h-2.5" />
                    {patent.appNum}
                  </div>
                  {patent.source && (
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                      {patent.source}
                    </div>
                  )}
                </div>
                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight border ${
                  patent.status === 'Granted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                  patent.status === 'Published' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {patent.status}
                </div>
              </div>
              <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
                {patent.title}
              </h4>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <Calendar className="w-3 h-3" />
                  {patent.filed}
                </div>
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 group-hover:underline">
                  View <ExternalLink className="w-2.5 h-2.5" />
                </div>
              </div>
            </a>
          )})}
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400">
          <FileText className="w-8 h-8 mb-2 opacity-20" />
          <span className="text-xs font-medium">No data available.</span>
        </div>
      )}
    </section>
  );
};

export default PatentSection;
