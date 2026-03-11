
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService.ts';
import { History, Calendar, Loader2, Info, ArrowLeft, Terminal, Sparkles, Code } from 'lucide-react';

interface ChangelogEntry {
  developer_comments: string;
  comments_updated_at: string;
}

const ChangelogView: React.FC = () => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChangelog = async () => {
      setIsLoading(true);
      const data = await supabaseService.getChangelog();
      setEntries(data || []);
      setIsLoading(false);
    };
    fetchChangelog();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-10 sm:p-12 text-white relative">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              <History className="w-3.5 h-3.5" /> Platform Development Log
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">Changelog.</h1>
            <p className="text-slate-400 font-medium">Tracking the evolution of the BioPort AI intelligence engine.</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>

        <div className="p-8 sm:p-12 space-y-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
              <p className="text-sm font-black uppercase tracking-widest">Retrieving logic logs...</p>
            </div>
          ) : entries.length > 0 ? (
            <div className="relative pl-8">
              {/* Vertical line for the timeline - Moved to the left */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100"></div>
              
              <div className="space-y-12">
                {entries.map((entry, idx) => (
                  <div key={idx} className="relative flex flex-col items-start">
                    {/* Timeline Node - Moved to the left */}
                    <div className="absolute left-[-35px] top-0 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm z-10"></div>
                    
                    <div className="w-full">
                       <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:border-blue-400 transition-all group text-left">
                          <div className="flex items-center gap-2 mb-3 text-blue-600 justify-start">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(entry.comments_updated_at)}</span>
                          </div>
                          {/* Correctly rendering HTML content stored in database */}
                          <div 
                            className="text-slate-700 text-sm leading-relaxed font-medium changelog-content"
                            dangerouslySetInnerHTML={{ __html: entry.developer_comments }}
                          />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">No Logs Identified</h3>
              <p className="text-slate-500 text-sm font-medium">Developer updates will appear here as they are deployed.</p>
            </div>
          )}

          <div className="mt-12 p-8 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col items-center text-center">
             <Code className="w-12 h-12 text-blue-600 mb-4" />
             <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Continuous Integration</h3>
             <p className="text-sm text-blue-700 font-medium max-w-lg leading-relaxed">
               BioPort AI is developed using rapid iteration protocols. These updates represent verified logic improvements, UI enhancements, and clinical database synchronization tasks.
             </p>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
             BioPort AI • System Integrity History
           </p>
        </div>
      </div>
      <style>{`
        .changelog-content ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .changelog-content li {
          margin-bottom: 0.25rem;
        }
        .changelog-content b, .changelog-content strong {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default ChangelogView;
