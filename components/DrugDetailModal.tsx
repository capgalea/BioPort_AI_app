
import React, { useEffect, useState, useRef } from 'react';
import { X, Pill, Dna, AlertTriangle, FileText, Calendar, Building2, FlaskConical, Microscope, Users, BookOpen, Move, Box } from 'lucide-react';
import { DrugDeepDive } from '../types.ts';
import Tooltip from './Tooltip.tsx';

interface DrugDetailModalProps {
  drug: DrugDeepDive & { id: string };
  onClose: () => void;
  onOpen3D: (drug: any) => void;
}

const getStructureImageUrl = (cid?: string) => {
  if (!cid) return null;
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?record_type=2d&image_size=400x300`;
};

const DrugDetailModal: React.FC<DrugDetailModalProps> = ({ drug, onClose, onOpen3D }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, []);

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
  
  const structureUrl = getStructureImageUrl(drug.pubchemCid);

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative border border-slate-200 select-none pointer-events-auto"
      >
        <div 
          onMouseDown={handleDragStart}
          className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80 cursor-move active:cursor-grabbing hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-start gap-4 pointer-events-none">
             <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                <Pill className="w-7 h-7 text-emerald-600" />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{drug.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm font-medium text-slate-500">{drug.drugClass}</p>
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

        <div className="overflow-y-auto p-8 space-y-8 flex-1 select-text">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><FileText className="w-3 h-3" /> Summary</h3>
                <p className="text-slate-700 leading-relaxed text-sm">{drug.description}</p>
                 {drug.synonyms && drug.synonyms.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                       {drug.synonyms.map(s => <span key={s} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">{s}</span>)}
                    </div>
                 )}
              </section>
              
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Dna className="w-3 h-3" /> Mechanism of Action</h3>
                <p className="text-slate-600 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">{drug.mechanismOfAction}</p>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><BookOpen className="w-3 h-3" /> Clinical Trials Summary</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{drug.clinicalTrialsSummary}</p>
              </section>
              
              <div className="grid grid-cols-2 gap-6">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Pill className="w-3 h-3" /> Approved Indications</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {drug.indications.map((ind, i) => <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{ind}</li>)}
                  </ul>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Key Side Effects</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {drug.sideEffects.map((se, i) => <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{se}</li>)}
                  </ul>
                </section>
              </div>

            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm sticky top-0">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Chemical Structure</h3>
                    <Tooltip content="Launch interactive 3D viewer">
                      <button onClick={() => onOpen3D(drug)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                        <Box className="w-4 h-4" />
                      </button>
                    </Tooltip>
                 </div>
                 
                 <div 
                   onClick={() => onOpen3D(drug)}
                   className="bg-white h-48 rounded-lg flex items-center justify-center p-2 border border-slate-200 cursor-pointer group relative overflow-hidden"
                 >
                   {structureUrl ? (
                     <>
                        <img src={structureUrl} alt={`Structure of ${drug.name}`} className="max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                           <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0">
                              <Box className="w-3.5 h-3.5" /> View 3D
                           </div>
                        </div>
                     </>
                   ) : (
                     <div className="text-slate-400 text-xs text-center"><FlaskConical className="w-6 h-6 mx-auto mb-1" /> No Structure</div>
                   )}
                 </div>
                 {drug.molecularFormula && <div className="mt-3 text-center font-mono text-sm text-slate-600">{drug.molecularFormula}</div>}
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                 <ul className="space-y-3 text-sm">
                   <li className="flex items-center gap-3"><Calendar className="w-4 h-4 text-slate-400" /> <div><span className="text-[9px] font-bold text-slate-400 uppercase">Approval Date</span><br/><span className="text-slate-700 font-medium">{drug.approvalDate}</span></div></li>
                   <li className="flex items-start gap-3"><Building2 className="w-4 h-4 text-slate-400" /> <div><span className="text-[9px] font-bold text-slate-400 uppercase">Manufacturers</span><br/><span className="text-slate-700 font-medium">{drug.manufacturers.join(', ')}</span></div></li>
                 </ul>
              </div>

              {drug.analogues && drug.analogues.length > 0 && (
                <div className="p-5">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Users className="w-3 h-3" /> Analogues</h3>
                   <div className="space-y-2">
                     {drug.analogues.map((a, i) => (
                       <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                         <div className="text-xs font-bold text-slate-800">{a.name}</div>
                         <div className="text-[10px] text-slate-500 italic">"{a.reason}"</div>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </div>
          
          {drug.recentResearch && drug.recentResearch.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Microscope className="w-3 h-3" /> Recent Research</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {drug.recentResearch.map((r, i) => (
                   <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                      <h4 className="font-bold text-blue-600 text-sm mb-1">{r.title}</h4>
                      <div className="text-[11px] font-medium text-slate-500 mb-2">{r.source}</div>
                      <p className="text-xs text-slate-600 italic">"{r.summary}"</p>
                   </div>
                 ))}
              </div>
            </section>
          )}

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
           <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

export default DrugDetailModal;