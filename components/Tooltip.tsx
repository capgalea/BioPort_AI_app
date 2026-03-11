
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  align = 'center',
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number, bottom: number, left: number, right: number, width: number, height: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      setCoords(wrapperRef.current.getBoundingClientRect());
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };
  
  const getTooltipStyles = (): React.CSSProperties => {
    if (!coords) return { opacity: 0 };

    // FIX: Using any type for styles object to allow dynamic assignment of CSS properties
    const styles: any = {};
    const margin = 8;

    switch (position) {
      case 'bottom':
        styles.top = coords.bottom + margin;
        break;
      case 'left':
        styles.left = coords.left - margin;
        styles.transform = 'translateX(-100%)';
        break;
      case 'right':
        styles.left = coords.right + margin;
        break;
      case 'top':
      default:
        styles.top = coords.top - margin;
        styles.transform = 'translateY(-100%)';
        break;
    }

    if (position === 'top' || position === 'bottom') {
      switch (align) {
        case 'start':
          styles.left = coords.left;
          break;
        case 'end':
          styles.left = coords.right;
          styles.transform = `${styles.transform || ''} translateX(-100%)`.trim();
          break;
        case 'center':
        default:
          styles.left = coords.left + coords.width / 2;
          styles.transform = `${styles.transform || ''} translateX(-50%)`.trim();
          break;
      }
    } else { // left or right
       switch (align) {
        case 'start':
          styles.top = coords.top;
          break;
        case 'end':
          styles.top = coords.bottom;
          styles.transform = `${styles.transform || ''} translateY(-100%)`.trim();
          break;
        case 'center':
        default:
          styles.top = coords.top + coords.height / 2;
          styles.transform = `${styles.transform || ''} translateY(-50%)`.trim();
          break;
      }
    }
    
    return styles as React.CSSProperties;
  };

  const getArrowStyles = (): React.CSSProperties => {
     if (!coords) return {};
     // FIX: Using any type for styles object to allow dynamic assignment of CSS properties
     const styles: any = { borderColor: 'transparent' };
     const arrowColor = '#1e293b'; // slate-800

     switch(position) {
         case 'bottom':
             styles.bottom = '100%';
             styles.borderBottomColor = arrowColor;
             if(align === 'start') styles.left = '1rem';
             else if(align === 'end') styles.right = '1rem';
             else { styles.left = '50%'; styles.transform = 'translateX(-50%)'; }
             break;
         case 'left':
             styles.left = '100%';
             styles.borderLeftColor = arrowColor;
             if(align === 'start') styles.top = '0.5rem';
             else if(align === 'end') styles.bottom = '0.5rem';
             else { styles.top = '50%'; styles.transform = 'translateY(-50%)'; }
             break;
         case 'right':
             styles.right = '100%';
             styles.borderRightColor = arrowColor;
             if(align === 'start') styles.top = '0.5rem';
             else if(align === 'end') styles.bottom = '0.5rem';
             else { styles.top = '50%'; styles.transform = 'translateY(-50%)'; }
             break;
         case 'top':
         default:
             styles.top = '100%';
             styles.borderTopColor = arrowColor;
             if(align === 'start') styles.left = '1rem';
             else if(align === 'end') styles.right = '1rem';
             else { styles.left = '50%'; styles.transform = 'translateX(-50%)'; }
             break;
     }
     return styles as React.CSSProperties;
  };
  
  const tooltipContent = (
    <div
      className="fixed z-[9999] px-3 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-200 whitespace-normal max-w-[200px] break-words text-center leading-tight"
      style={getTooltipStyles()}
    >
      {content}
      <div style={getArrowStyles()} className="absolute border-4" />
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && coords && createPortal(tooltipContent, document.body)}
    </div>
  );
};

export default Tooltip;
