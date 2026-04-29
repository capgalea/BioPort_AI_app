
import React, { useState, useEffect, useRef } from 'react';
import { X, Move, ExternalLink, Maximize2, Minimize2, FlaskConical, Globe, Box } from 'lucide-react';
import Tooltip from './Tooltip.tsx';

interface MolecularViewerModalProps {
  drug: { name: string; id: string; pubchemCid?: string; smiles?: string; zIndex: number };
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  zIndex: number;
}

const MolecularViewerModal: React.FC<MolecularViewerModalProps> = ({ drug, onClose, onFocus, zIndex }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Initial positioning - staggered based on index
  useEffect(() => {
    const offset = (zIndex - 100) * 30;
    setPos({ 
        x: (window.innerWidth / 2) + offset, 
        y: (window.innerHeight / 2) + offset 
    });
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
    onFocus(drug.id);
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
      };
      setIsDragging(true);
    }
  };

  /**
   * For better reliability in iframes, we prioritize PubChem's official 3D embed
   * when a CID is available. If not, we fallback to MolView.
   */
  const getViewerUrl = () => {
    // Avoid hallucinatory pubchemCids by LLM which cause wrong structures to load.
    // Use the primary drug name without synonyms in parentheses to improve resolution.
    const cleanName = drug.name.split(' (')[0].trim();
    return `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(cleanName)}#section=3D-Conformer&embed=true`;
  };

  const viewerUrl = getViewerUrl();
  const isPubChem = viewerUrl.includes('pubchem');

  return (
    <div 
      ref={modalRef}
      onMouseDown={() => onFocus(drug.id)}
      style={{ 
        left: pos.x, 
        top: pos.y, 
        zIndex: zIndex,
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      }}
      className={`bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 select-none ${isMinimized ? 'w-64 h-14' : 'w-[600px] h-[600px]'}`}
    >
      {/* Header */}
      <div 
        onMouseDown={handleDragStart}
        className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center cursor-move active:cursor-grabbing hover:bg-slate-50 transition-colors ${isDragging ? 'bg-slate-50' : ''}`}
      >
        <div className="flex items-center gap-3 pointer-events-none min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
            <FlaskConical className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="truncate">
            <h3 className="font-black text-slate-900 text-base truncate">{drug.name}</h3>
            {!isMinimized && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">3D Molecular Structure</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
           <Tooltip content={isMinimized ? "Restore Viewer" : "Minimize Viewer"}>
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
              >
                {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </button>
           </Tooltip>
           <Tooltip content="Close Viewer">
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onClose(drug.id)}
                className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
           </Tooltip>
        </div>
      </div>

      {/* Viewer Content */}
      <div className={`flex-1 bg-slate-50 relative ${isMinimized ? 'hidden' : 'block'} ${isDragging ? 'pointer-events-none' : ''}`}>
        <iframe 
          src={viewerUrl}
          className="w-full h-full border-none"
          title={`3D Structure of ${drug.name}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        
        {/* Attribution / Deep Link */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center pointer-events-none">
           <div className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg text-[10px] font-black text-slate-500 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              {isPubChem ? 'pubchem.ncbi.nlm.nih.gov' : 'molview.org'}
           </div>
           <a 
              href={viewerUrl.replace('&embed=true', '')} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-4 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg text-[10px] font-black text-blue-600 flex items-center gap-2 pointer-events-auto hover:bg-slate-50 transition-colors"
           >
              Open in Full Tab
              <ExternalLink className="w-3.5 h-3.5" />
           </a>
        </div>
      </div>
      
      {/* Drag handle hint when minimized */}
      {isMinimized && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
           <Move className="w-5 h-5 text-slate-300" />
        </div>
      )}
    </div>
  );
};

export default MolecularViewerModal;