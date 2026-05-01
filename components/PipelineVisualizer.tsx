
import React from 'react';
import { PipelineDrug, PipelinePhase } from '../types';
import { Search, FlaskConical, GraduationCap } from 'lucide-react';
import Tooltip from './Tooltip';

interface PipelineVisualizerProps {
  pipeline: PipelineDrug[];
  companyName?: string;
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
  return 0; // Default
};

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ pipeline, companyName, isAcademic = false }) => {
  if (!pipeline || pipeline.length === 0) return <div className="text-slate-400 italic text-sm">No pipeline data available.</div>;

  return (
    <div className="space-y-4">
      {pipeline.map((drug, idx) => {
        const currentPhaseIdx = getPhaseIndex(drug.phase);
        const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(drug.drugName)}`;
        const searchTerm = companyName 
          ? `${drug.drugName} ${drug.indication} ${companyName}`
          : `${drug.drugName} ${drug.indication}`;
        const searchUrl = isAcademic
          ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`
          : `https://clinicaltrials.gov/search?term=${encodeURIComponent(searchTerm)}`;
        const displayNct = drug.nctId ? drug.nctId.trim().toUpperCase() : null;
        const directUrl = displayNct ? `https://clinicaltrials.gov/study/${displayNct}` : searchUrl;

        return (
          <div key={idx} className="group">
            <div className="flex justify-between items-start mb-1 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                 <a 
                   href={pubchemUrl} 
                   target="_blank" 
                   rel="noreferrer"
                   className="font-semibold text-slate-800 text-sm hover:text-blue-600 transition-colors"
                 >
                   {drug.drugName}
                 </a>
                 
                 <div className="flex items-center gap-1">
                   <Tooltip content="View molecular data on PubChem.">
                     <a 
                       href={pubchemUrl}
                       target="_blank"
                       rel="noreferrer"
                       className="p-0.5 rounded text-slate-400 hover:text-blue-600 transition-all opacity-50 group-hover:opacity-100"
                     >
                       <FlaskConical className="w-3.5 h-3.5" />
                     </a>
                   </Tooltip>

                   {displayNct ? (
                     <a 
                       href={directUrl}
                       target="_blank"
                       rel="noreferrer"
                       className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                       title="View Study Details"
                     >
                       {displayNct}
                     </a>
                   ) : null}
                   
                   <a 
                     href={searchUrl}
                     target="_blank"
                     rel="noreferrer"
                     className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors opacity-50 group-hover:opacity-100"
                     title={isAcademic ? `Search PubMed for ${drug.drugName}` : `Search Registry for ${drug.drugName}`}
                   >
                     {isAcademic ? <GraduationCap className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                   </a>
                 </div>
              </div>
              <span className="text-xs text-slate-500 text-right shrink-0">{drug.indication}</span>
            </div>
            
            <div 
              className="block relative h-2 bg-slate-100 rounded-full overflow-hidden"
              title={`Current Phase: ${drug.phase}`}
            >
              <div className="absolute inset-0 flex">
                {PHASES.map((_, i) => (
                  <div key={i} className={`flex-1 border-r border-white/50 last:border-0 ${i <= currentPhaseIdx ? (isAcademic ? 'bg-emerald-500' : 'bg-blue-500') : 'bg-transparent'}`} />
                ))}
              </div>
            </div>
            
            <div className="flex justify-between mt-1 text-[10px] text-slate-400 uppercase tracking-wider font-medium">
               <span>Pre-Clin</span>
               <span>Ph I</span>
               <span>Ph II</span>
               <span>Ph III</span>
               <span>Appr</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineVisualizer;
