
import React, { useEffect, useState, useRef } from 'react';
import { X, User, BookOpen, FlaskConical, ExternalLink, Loader2, GraduationCap, Search, Sparkles, Move } from 'lucide-react';
import { ResearcherProfile } from '../types.ts';
import { analyzeResearcher } from '../services/geminiService.ts';

interface ResearcherModalProps {
  name: string;
  institution: string;
  initialBio?: string;
  onClose: () => void;
}

const ResearcherModal: React.FC<ResearcherModalProps> = ({ name, institution, initialBio, onClose }) => {
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const fetchProfile = async () => {
      setLoading(true);
      const data = await analyzeResearcher(name, institution);
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [name, institution]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPos({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
      };
      setIsDragging(true);
    }
  };

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + " " + institution)}`;

  const getPubLink = (pub: { title: string, url?: string }) => {
    if (pub.url && pub.url.length > 5 && pub.url.toLowerCase() !== 'n/a') {
       return pub.url.startsWith('http') ? pub.url : `https://${pub.url}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(pub.title)}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-none">
      <div 
        ref={modalRef}
        style={{ 
          left: pos.x, 
          top: pos.y, 
          transform: 'translate(-50%, -50%)',
          position: 'fixed'
        }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col relative border border-slate-200 select-none pointer-events-auto"
      >
        {/* Header */}
        <div 
          onMouseDown={handleDragStart}
          className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80 cursor-move active:cursor-grabbing hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-start gap-4 pointer-events-none">
             <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                <User className="w-7 h-7 text-emerald-600" />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{name}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-500">{institution}</p>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Move className="w-2.5 h-2.5" /> Move
                  </div>
                </div>
             </div>
          </div>
          <button 
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1 select-text">
          {initialBio && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl relative overflow-hidden">
               <Sparkles className="absolute top-2 right-2 w-4 h-4 text-emerald-300 opacity-50" />
               <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Intelligence Snippet</h3>
               <p className="text-sm text-emerald-800 italic leading-relaxed">"{initialBio}"</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
              <p className="text-sm font-medium">Generating deep profile...</p>
              <p className="text-xs mt-1">Analyzing bio, projects, and academic output</p>
            </div>
          ) : profile ? (
            <>
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3 h-3" /> Full Biography
                </h3>
                <p className="text-slate-700 leading-relaxed text-sm">{profile.bio}</p>
              </section>

              <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Scientific Contributions</h3>
                <p className="text-sm text-slate-600 italic">"{profile.workDescription}"</p>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                   <FlaskConical className="w-3 h-3" /> Key Research Initiatives
                </h3>
                <ul className="space-y-2">
                  {profile.projects.map((project, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{project}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                   <BookOpen className="w-3 h-3" /> Notable Publications
                </h3>
                <div className="space-y-3">
                  {profile.publications.map((pub, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group">
                      <a 
                        href={getPubLink(pub)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block group-hover:text-blue-600 transition-colors"
                      >
                         <h4 className="font-medium text-slate-900 text-sm mb-1 group-hover:text-blue-600 flex items-start gap-1">
                           {pub.title}
                           <ExternalLink className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </h4>
                      </a>
                      <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                        <span className="font-medium">{pub.source}</span>
                        <span>{pub.year}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
             <div className="text-center py-12 text-slate-500">
               <p>Deep profile retrieval failed. Use search below for primary verification.</p>
             </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex gap-4 w-full sm:w-auto">
              <a 
                href={googleSearchUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-bold hover:underline transition-colors"
              >
                <Search className="w-4 h-4" />
                Google Search
                <ExternalLink className="w-3 h-3" />
              </a>
              <a 
                href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(name + " " + institution)}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 text-sm font-bold hover:underline transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                PubMed
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
           <button 
             onClick={onClose}
             className="w-full sm:w-auto px-6 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors text-sm"
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

export default ResearcherModal;
