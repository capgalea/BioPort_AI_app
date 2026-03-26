
import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Loader2, ExternalLink, ShieldCheck, Calendar, Hash } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { fetchPatentsFromPatentsView } from '../services/patentsViewService.ts';
import { Patent } from '../types.ts';

interface PatentSectionProps {
  companyName: string;
  onPatentSearchClick: (companyName: string) => void;
}

const PatentSection: React.FC<PatentSectionProps> = ({ companyName, onPatentSearchClick }) => {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatents = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use PatentsView directly to search by assignee
        const data: Patent[] = await fetchPatentsFromPatentsView("", { applicant: companyName }, 10);
        setPatents(data);
      } catch (err: any) {
        console.error("Failed to fetch patents:", err);
        setError(err.message || "Patent service unavailable");
      } finally {
        setLoading(false);
      }
    };

    fetchPatents();
  }, [companyName]);

  const dateRange = useMemo(() => {
    if (patents.length === 0) return 'No patents found';
    const dates = patents.map(p => new Date(p.dateFiled)).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return 'Date range unknown';
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
  }, [patents]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Recent Patents</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dateRange}</p>
          </div>
        </div>
        <button 
          onClick={() => onPatentSearchClick(companyName)}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
        >
          Comprehensive Patent Search
        </button>
      </div>

      {loading ? (
        <div className="h-40 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-100 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Scanning USPTO...
          </span>
        </div>
      ) : error ? (
        <div className="h-40 flex flex-col items-center justify-center bg-red-50 rounded-3xl border border-red-100 text-red-600 p-6 text-center">
          <ShieldCheck className="w-6 h-6 mb-2 opacity-50" />
          <span className="text-xs font-bold mb-1">
            Registry Connection Issue
          </span>
          <span className="text-[10px] font-medium opacity-70">{error}</span>
        </div>
      ) : patents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {patents.map((patent, idx) => {
            return (
              <a 
              key={idx} 
              href={patent.url}
              target="_blank"
              rel="noreferrer"
              className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-md transition-all group block"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-tight border border-slate-100">
                    <Hash className="w-2.5 h-2.5" />
                    {patent.actualApplicationNumber || patent.applicationNumber}
                  </div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                    USPTO
                  </div>
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
                  {patent.dateFiled && isValid(parseISO(patent.dateFiled)) 
                    ? format(parseISO(patent.dateFiled), 'MMM d, yyyy') 
                    : patent.dateFiled || 'N/A'}
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
