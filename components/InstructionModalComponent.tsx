import React, { useState, useEffect, useRef } from 'react';
import { X, HelpCircle, Lightbulb, Move } from 'lucide-react';

interface InstructionModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  instructions: {
    step: string;
    description: string;
  }[];
  proTip?: string;
}

const InstructionModal: React.FC<InstructionModalProps> = ({ title, isOpen, onClose, instructions, proTip }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-none">
      <div 
        ref={modalRef}
        style={{ 
          left: pos.x, 
          top: pos.y, 
          transform: 'translate(-50%, -50%)',
          position: 'fixed'
        }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-300 select-none pointer-events-auto"
      >
        <div 
          onMouseDown={handleDragStart}
          className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center cursor-move active:cursor-grabbing hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3 pointer-events-none">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <Move className="w-2.5 h-2.5" /> Move
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

        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] select-text">
          <div className="space-y-6">
            {instructions.map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-xs font-black">
                  {idx + 1}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">{item.step}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          {proTip && (
            <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
              <Lightbulb className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-1">Intelligence Pro-Tip</span>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">{proTip}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-900/20 hover:bg-black transition-all active:scale-95"
          >
            Got it, thanks
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionModal;