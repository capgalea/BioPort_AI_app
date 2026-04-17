
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  limit?: number;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selectedIds, onChange, placeholder = "Select...", limit = 50 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [characterFilter, setCharacterFilter] = useState<string[]>([]);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate position for fixed dropdown
  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close on scroll/resize
  useEffect(() => {
    const handleScrollOrResize = (e: Event) => {
      if (e.type === 'scroll' && dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      if (isOpen) setIsOpen(false);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current && 
        !wrapperRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableChars = useMemo(() => {
    const chars = new Set(options.map(opt => opt?.label?.[0]?.toUpperCase()).filter(Boolean));
    return Array.from(chars).sort();
  }, [options]);

  const filteredOptions = useMemo(() => {
    return options.filter(opt =>
      (characterFilter.length === 0 || (opt?.label?.[0] && characterFilter.includes(opt.label[0].toUpperCase()))) &&
      (opt?.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, characterFilter]);


  const displayedOptions = filteredOptions.slice(0, limit);

  const toggleOption = (id: string) => {
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onChange(newSelected);
  };

  const selectAll = () => onChange(options.map(o => o.id));
  const clearAll = () => onChange([]);

  const handleToggleOpen = () => {
    if (!isOpen) {
      setSearchTerm('');
      setCharacterFilter([]);
    }
    setIsOpen(!isOpen);
  };

  const handleCharacterFilterToggle = (char: string) => {
    setCharacterFilter(prev => 
      prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
    );
  };

  return (
    <div className="relative min-w-[180px] flex-shrink-0" ref={wrapperRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`w-full flex items-center justify-between text-xs px-3 py-2.5 rounded-lg border transition-all shadow-sm ${isOpen ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
      >
        <div className="flex flex-col items-start gap-0.5 overflow-hidden">
          <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">
            {label}
          </span>
          <span className={`truncate font-bold ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
            {selectedIds.length === 0 
              ? "All" 
              : selectedIds.length === options.length && options.length > 0
                ? "All Selected"
                : `${selectedIds.length} Selected`
            }
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[400px] animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: coords.top + 4, 
            left: coords.left, 
            minWidth: Math.max(coords.width, 220) 
          }}
        >
          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${label}...`} 
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 bg-white"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={selectAll}
                className="flex-1 text-[10px] font-bold uppercase tracking-wide text-blue-600 hover:bg-blue-50 py-1.5 rounded-md border border-blue-100 transition-colors"
              >
                Select All
              </button>
              <button 
                type="button"
                onClick={clearAll}
                className="flex-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 py-1.5 rounded-md border border-slate-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          
          {availableChars.length > 0 && (
            <div className="flex flex-wrap gap-1 p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold">
              <button onClick={() => setCharacterFilter([])} className={`px-2 py-0.5 rounded ${characterFilter.length === 0 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>All</button>
              {availableChars.map(char => <button key={char} onClick={() => handleCharacterFilterToggle(char)} className={`w-6 h-6 rounded ${characterFilter.includes(char) ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{char}</button>)}
            </div>
          )}

          <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
            {displayedOptions.length > 0 ? (
              <>
                {displayedOptions.map(option => (
                  <div 
                    key={option.id} 
                    onClick={() => toggleOption(option.id)}
                    className={`flex items-center gap-2 px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors mb-0.5 ${selectedIds.includes(option.id) ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selectedIds.includes(option.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                      {selectedIds.includes(option.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs truncate ${selectedIds.includes(option.id) ? 'font-bold text-blue-700' : 'font-medium text-slate-600'}`}>{option.label}</span>
                  </div>
                ))}
                {filteredOptions.length > limit && (
                  <div className="p-2 text-center text-[10px] text-slate-400 italic border-t border-slate-50">
                    + {filteredOptions.length - limit} more options. Refine search.
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center">
                <p className="text-xs font-medium text-slate-400">No matches found</p>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
            {selectedIds.length} of {options.length} Selected
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MultiSelect;
