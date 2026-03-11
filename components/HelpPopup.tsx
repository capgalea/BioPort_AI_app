import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpPopupProps {
  title?: string;
  content: string;
  placement?: 'left' | 'center' | 'right';
}

const HelpPopup: React.FC<HelpPopupProps> = ({ title, content, placement = 'center' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let positionClasses = 'left-1/2 -translate-x-1/2';
  let arrowClasses = 'left-1/2 -translate-x-1/2';

  if (placement === 'left') {
    positionClasses = 'left-0'; 
    arrowClasses = 'left-3';
  } else if (placement === 'right') {
    positionClasses = 'right-0';
    arrowClasses = 'right-3';
  }

  return (
    <div className="relative inline-flex items-center ml-2 align-middle" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-300 hover:text-blue-500'}`}
        aria-label="Help"
        title="View instructions"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className={`absolute z-[100] w-64 p-4 mt-2 bg-slate-800 text-white rounded-xl shadow-xl border border-slate-700 top-full animate-in fade-in zoom-in-95 duration-200 ${positionClasses}`}>
           {title && <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-1">{title}</h4>}
           {/* Added normal-case to reset any inherited uppercase style */}
           <p className="text-xs leading-relaxed text-slate-200 normal-case break-words">{content}</p>
           {/* Triangle Arrow */}
           <div className={`absolute -top-1.5 w-3 h-3 bg-slate-800 border-t border-l border-slate-700 rotate-45 transform ${arrowClasses}`}></div>
        </div>
      )}
    </div>
  );
};

export default HelpPopup;