
import React, { useState, useEffect, useMemo } from 'react';

interface CompanyLogoProps {
  name: string;
  website: string;
  className?: string;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ name, website, className = "w-12 h-12" }) => {
  // Priority Order:
  // 0: Google (Fastest/Most Reliable)
  // 1: Clearbit (High Quality, but strict CORS/Rate limits)
  // 2: DuckDuckGo (Fallback)
  const [sourceIndex, setSourceIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Reset state when website changes
  useEffect(() => {
    setSourceIndex(0);
    setHasError(false);
  }, [website]);

  const hostname = useMemo(() => {
    if (!website || website.toLowerCase() === "n/a" || website.trim() === "") return null;
    try {
      let domain = website.trim();
      if (!domain.startsWith('http')) {
        domain = `https://${domain}`;
      }
      const host = new URL(domain).hostname;
      // Strip www. prefix for better hit rates on logo services
      return host.replace(/^www\./, '');
    } catch (e) {
      return null;
    }
  }, [website]);

  // Determine current image source based on index
  const getSrc = (index: number, host: string) => {
    switch(index) {
      case 0: return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
      case 1: return `https://logo.clearbit.com/${host}`;
      case 2: return `https://icons.duckduckgo.com/ip3/${host}.ico`;
      default: return null;
    }
  };

  const imgSrc = hostname ? getSrc(sourceIndex, hostname) : null;

  // Render Fallback Initials if:
  // 1. No hostname extracted
  // 2. We've exhausted all image sources (imgSrc is null)
  // 3. We encountered an error state (explicit failure)
  if (!hostname || !imgSrc || hasError) {
    return (
      <div className={`${className} shrink-0 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md select-none`}>
        {name ? name.substring(0, 2).toUpperCase() : "??"}
      </div>
    );
  }

  const handleError = () => {
    if (sourceIndex < 2) {
      setSourceIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className={`${className} shrink-0 bg-white rounded-lg p-1.5 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden select-none`}>
        <img
          key={`${hostname}-${sourceIndex}`} // Force re-mount on source change to ensure onError fires correctly
          src={imgSrc}
          alt={`${name} logo`}
          className="w-full h-full object-contain"
          onError={handleError}
          loading="lazy"
        />
    </div>
  );
};

export default CompanyLogo;
