
import React, { useEffect, useState, useRef } from 'react';
import { X, Activity, Loader2, FlaskConical, ExternalLink, Search, GraduationCap, Move } from 'lucide-react';
import { PipelineDrug, PipelinePhase } from '../types';
import { fetchAllClinicalTrials } from '../services/geminiService';
import Tooltip from './Tooltip';

interface ClinicalTrialsModalProps {
  companyName: string;
  initialPipeline?: PipelineDrug[];
  onClose: () => void;
  isAcademic?: boolean;
}

const PHASES = [
  PipelinePhase.Preclinical,
  PipelinePhase.Phase1,
  PipelinePhase.Phase2,
  PipelinePhase.Phase3,
  PipelinePhase.Filed,
  PipelinePhase.Approved
];

const getPhaseIndex = (phaseStr: string) => {
  const p = phaseStr.toLowerCase();
  if (p.includes('pre') || p.includes('discovery')) return 0;
  if (p.includes('1') || p.includes('i') && !p.includes('ii') && !p.includes('iii')) return 1;
  if (p.includes('2') || p.includes('ii') && !p.includes('iii')) return 2;
  if (p.includes('3') || p.includes('iii')) return 3;
  if (p.includes('filed') || p.includes('registration')) return 4;
  if (p.includes('approved') || p.includes('market')) return 5;
  return 0;
};

const ClinicalTrialsModal: React.FC<ClinicalTrialsModalProps> = ({ companyName, initialPipeline = [], onClose, isAcademic = false }) => {
  const [trials, setTrials] = useState<PipelineDrug[]>([]);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    let isMounted = true;
    const fetchTrials = async () => {
      setLoading(true);
      const fetchedData = await fetchAllClinicalTrials(companyName);
      if (!isMounted) return;
      const newDrugNames = new Set((fetchedData || []).map(d => d.drugName.toLowerCase()));
      const uniqueExisting = initialPipeline.filter(old => {
        const oldName = old.drugName.toLowerCase();
        return !Array.from(newDrugNames).some(n => n.includes(oldName) || oldName.includes(n));
      });
      setTrials([...(fetchedData || []), ...uniqueExisting]);
      setLoading(false);
    };
    fetchTrials();
    return () => { isMounted = false; };
  }, [companyName, initialPipeline]);

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative border border-slate-200 select-none pointer-events-auto"
      >
        {/* Header */}
        <div 
          onMouseDown={handleDragStart}
          className={`p-6 border-b border-slate-100 flex justify-between items-start cursor-move active:cursor-grabbing hover:bg-slate-100 transition-colors ${isAcademic ? 'bg-emerald-50' : 'bg-slate-50'}`}
        >
          <div className="flex items-start gap-4 pointer-events-none">
             <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0 ${isAcademic ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {isAcademic ? <GraduationCap className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
             </div>
             <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                  {isAcademic ? 'Research & Clinical Pipeline' : 'Clinical Trials Landscape'}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                   <p className="text-sm font-medium text-slate-500">Expanded Pipeline for {companyName}</p>
                   <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                     <Move className="w-2.5 h-2.5" /> Hold to Move
                   </div>
                </div>
             </div>
          </div>
          <Tooltip content="Exit pipeline view.">
            <button 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30 select-text">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <Loader2 className={`w-10 h-10 animate-spin mb-4 ${isAcademic ? 'text-emerald-500' : 'text-blue-500'}`} />
               <p className="text-sm font-medium">Scanning clinical registries...</p>
               <p className="text-xs mt-1">Verifying NCT IDs and aggregating sources</p>
             </div>
          ) : trials.length > 0 ? (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                 {trials.map((drug, idx) => {
                    const currentPhaseIdx = getPhaseIndex(drug.phase);
                    const searchTerm = `${drug.drugName} ${drug.indication} ${companyName}`;
                    const searchUrl = isAcademic
                      ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`
                      : `https://clinicaltrials.gov/search?term=${encodeURIComponent(searchTerm)}`;
                    const displayNct = drug.nctId ? drug.nctId.trim().toUpperCase() : null;
                    const directUrl = displayNct ? `https://clinicaltrials.gov/study/${displayNct}` : searchUrl;
                    const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(drug.drugName)}`;
                    return (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <a 
                                 href={pubchemUrl}
                                 target="_blank"
                                 rel="noreferrer"
                                 className="font-bold text-slate-800 text-base hover:text-blue-600 transition-colors"
                               >
                                 {drug.drugName}
                               </a>
                               <Tooltip content="View molecular data on PubChem.">
                                 <a 
                                   href={pubchemUrl}
                                   target="_blank"
                                   rel="noreferrer"
                                   className="p-1 rounded text-slate-300 hover:text-blue-500 transition-colors"
                                 >
                                   <FlaskConical className="w-3.5 h-3.5" />
                                 </a>
                               </Tooltip>
                               <div className="flex items-center gap-1 ml-1">
                                 {displayNct ? (
                                   <Tooltip content="View study protocols on ClinicalTrials.gov.">
                                     <a 
                                       href={directUrl}
                                       target="_blank"
                                       rel="noreferrer"
                                       className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                     >
                                       {displayNct}
                                     </a>
                                   </Tooltip>
                                 ) : (
                                   <span className="text-[9px] text-slate-400 font-medium px-1.5 py-0.5 border border-slate-100 rounded bg-slate-50">
                                     ID PENDING
                                   </span>
                                 )}
                                 <Tooltip content={isAcademic ? "Search PubMed for evidence." : "Search registries for this candidate."}>
                                   <a 
                                     href={searchUrl}
                                     target="_blank"
                                     rel="noreferrer"
                                     className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                                   >
                                     {isAcademic ? <GraduationCap className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                                   </a>
                                 </Tooltip>
                               </div>
                            </div>
                            <div className="text-sm text-slate-500 font-medium">{drug.indication}</div>
                          </div>
                          {drug.status && (
                             <span className="text-[10px] font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 whitespace-nowrap">
                               {drug.status}
                             </span>
                          )}
                        </div>
                        <div className="block relative h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2" title={`Current Phase: ${drug.phase}`}>
                          <div className="absolute inset-0 flex">
                            {PHASES.map((_, i) => (
                              <div key={i} className={`flex-1 border-r border-white/50 last:border-0 ${i <= currentPhaseIdx ? (isAcademic ? 'bg-emerald-500' : 'bg-blue-500') : 'bg-transparent'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider font-medium px-0.5">
                           <span>Pre-Clin</span><span>Ph I</span><span>Ph II</span><span>Ph III</span><span>Appr</span>
                        </div>
                      </div>
                    );
                 })}
               </div>
            </div>
          ) : (
             <div className="text-center py-12 text-slate-500">
               <p>No active trials or pipeline data found for this entity.</p>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
             <div className="text-xs text-slate-400 hidden sm:block">
               Data aggregated via AI analysis of public registries. Verify on ClinicalTrials.gov.
             </div>
             <div className="flex gap-3 ml-auto">
               <Tooltip content="Navigate to the primary registry for full metadata.">
                 <a 
                   href={isAcademic ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(companyName)}` : `https://clinicaltrials.gov/search?term=${encodeURIComponent(companyName)}`}
                   target="_blank"
                   rel="noreferrer"
                   className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                 >
                   {isAcademic ? 'Search PubMed' : 'Go to Registry'} 
                   <ExternalLink className="w-3 h-3" />
                 </a>
               </Tooltip>
               <button 
                 onClick={onClose}
                 className={`px-4 py-2 text-white rounded-lg font-medium transition-colors text-sm shadow-sm ${isAcademic ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
               >
                 Close
               </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalTrialsModal;
