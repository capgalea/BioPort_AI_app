
import React, { useEffect, useState, useRef } from 'react';
import { X, Pill, Activity, AlertTriangle, FileText, Calendar, Loader2, ExternalLink, Dna, Move } from 'lucide-react';
import { DrugProfile } from '../types';
import { analyzeDrug } from '../services/geminiService';
import Tooltip from './Tooltip';

interface ProductModalProps {
  productName: string;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ productName, onClose }) => {
  const [profile, setProfile] = useState<DrugProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const fetchProfile = async () => {
      setLoading(true);
      const data = await analyzeDrug(productName);
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [productName]);

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

  const cleanName = productName.split('(')[0].trim();
  const fdaSearchUrl = `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=BasicSearch.process&SearchTerm=${encodeURIComponent(cleanName)}`;
  const drugsComUrl = `https://www.drugs.com/search.php?searchterm=${encodeURIComponent(cleanName)}`;
  const dailyMedUrl = `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(cleanName)}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-none">
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
          className="p-6 border-b border-slate-100 flex justify-between items-start bg-blue-50/50 cursor-move active:cursor-grabbing hover:bg-blue-50 transition-colors"
        >
          <div className="flex items-start gap-4 pointer-events-none">
             <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                <Pill className="w-7 h-7 text-blue-600" />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{productName}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-500">Pharmaceutical Product Profile</p>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Move className="w-2.5 h-2.5" /> Move Window
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
              <p className="text-sm font-medium">Analyzing product details...</p>
              <p className="text-xs mt-1">Retrieving mechanism, indications, and safety data</p>
            </div>
          ) : profile ? (
            <>
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Description
                </h3>
                <p className="text-slate-700 leading-relaxed text-sm">{profile.description}</p>
              </section>

              <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                   <Dna className="w-4 h-4 text-purple-500" /> Mechanism of Action
                </h3>
                <p className="text-sm text-slate-600">{profile.mechanismOfAction}</p>
                <div className="mt-3 flex items-center gap-2">
                   <span className="text-xs font-semibold text-slate-500 uppercase">Class:</span>
                   <span className="inline-block bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-medium text-slate-700">{profile.drugClass}</span>
                </div>
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <section>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Approved Indications
                   </h3>
                   <ul className="space-y-2">
                     {profile.indications.map((ind, i) => (
                       <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                         <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                         <span>{ind}</span>
                       </li>
                     ))}
                   </ul>
                 </section>

                 <section>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" /> Key Side Effects
                   </h3>
                   <ul className="space-y-2">
                     {profile.sideEffects.map((se, i) => (
                       <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                         <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                         <span>{se}</span>
                       </li>
                     ))}
                   </ul>
                 </section>
              </div>

              <section className="flex items-center gap-3 text-sm text-slate-500 border-t border-slate-100 pt-4">
                 <Calendar className="w-4 h-4" />
                 <span>First Approval: <strong className="text-slate-700">{profile.approvalDate}</strong></span>
              </section>
            </>
          ) : (
             <div className="text-center py-12 text-slate-500">
               <p>Could not retrieve product details.</p>
             </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
            {!loading && (
              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                 <Tooltip content="Official FDA approved prescribing information and safety data.">
                   <a 
                     href={fdaSearchUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors whitespace-nowrap"
                   >
                     FDA Label <ExternalLink className="w-3 h-3" />
                   </a>
                 </Tooltip>
                 <Tooltip content="NIH archive of official package inserts and drug labels.">
                   <a 
                     href={dailyMedUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors whitespace-nowrap"
                   >
                     DailyMed (NIH) <ExternalLink className="w-3 h-3" />
                   </a>
                 </Tooltip>
                 <Tooltip content="Consumer-friendly drug information and interaction checker.">
                   <a 
                     href={drugsComUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors whitespace-nowrap"
                   >
                     Drugs.com <ExternalLink className="w-3 h-3" />
                   </a>
                 </Tooltip>
              </div>
            )}
           <button 
             onClick={onClose}
             className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors text-sm"
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
