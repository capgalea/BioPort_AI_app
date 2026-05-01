
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
// Added Loader2 to lucide-react imports to resolve "Cannot find name 'Loader2'" error
import { X, Globe, Mail, Phone, MapPin, CheckCircle2, FlaskConical, Users, BookOpen, ExternalLink, GraduationCap, Search, Microscope, Pill, Activity, ArrowRight, User, Move, Cpu, Star, Download, FileSpreadsheet, FileJson, FileText, File, Building2, Loader2, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { CompanyData, isAcademicEntity } from '../types';
import PipelineVisualizer from './PipelineVisualizer';
import CompanyLogo from './CompanyLogo';
import ClinicalTrialsModal from './ClinicalTrialsModal';
import HelpPopup from './HelpPopup';
import Tooltip from './Tooltip';

// Lazy load news feed and patent section for performance
const NewsFeed = lazy(() => import('./NewsFeed'));
const PatentSection = lazy(() => import('./PatentSection'));

interface DetailModalProps {
  company: CompanyData | null;
  onClose: () => void;
  onResearcherClick?: (name: string, institution: string, bio?: string) => void;
  onProductClick?: (productName: string) => void;
  onPatentSearchClick?: (companyName: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ company, onClose, onResearcherClick, onProductClick, onPatentSearchClick }) => {
  const [showTrialsModal, setShowTrialsModal] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // ... (rest of the file)
  // Inside the render, find PatentSection and pass the prop
  // <PatentSection companyName={company.name} onPatentSearchClick={onPatentSearchClick || (() => {})} />

  useEffect(() => {
    if (company) {
      setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
  }, [company]);

  useEffect(() => {
    let isMounted = true;
    return () => { isMounted = false; };
  }, [company?.name]);

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

  // Click outside to close export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportOpen]);

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

  const handleExport = (format: 'csv' | 'json' | 'txt' | 'pdf') => {
    if (!company) return;
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${company.id}_profile_${timestamp}`;
    
    if (format === 'pdf') {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(33, 41, 54); // Slate 800
        doc.text(company.name, 20, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(`${company.sector} | ${company.entityType || (isAcademicEntity(company) ? 'Academic' : 'Corporate')}`, 20, 28);
        
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);
        
        let y = 50;
        const pageHeight = doc.internal.pageSize.height;
        
        const checkPageBreak = (heightNeeded: number) => {
            if (y + heightNeeded > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }
        };

        // Status
        if (company.acquisitionStatus && company.acquisitionStatus !== 'Independent') {
           doc.setFontSize(12);
           doc.setTextColor(180, 83, 9); // Amber 700
           doc.text(`Status: ${company.acquisitionStatus}${company.acquiredBy ? ` by ${company.acquiredBy}` : ''}`, 20, y);
           y += 10;
        }

        // About
        doc.setFontSize(14);
        doc.setTextColor(33, 41, 54);
        doc.text("Executive Summary", 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105); // Slate 600
        const descLines = doc.splitTextToSize(company.description, 170);
        checkPageBreak(descLines.length * 5);
        doc.text(descLines, 20, y);
        y += (descLines.length * 5) + 10;

        // Contact
        checkPageBreak(40);
        doc.setFontSize(14);
        doc.setTextColor(33, 41, 54);
        doc.text("Contact Information", 20, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(`Headquarters: ${company.contact.hqAddress}`, 20, y); y += 7;
        doc.text(`Website: ${company.contact.website}`, 20, y); y += 7;
        if (company.contact.email) { doc.text(`Email: ${company.contact.email}`, 20, y); y += 7; }
        if (company.contact.phone) { doc.text(`Phone: ${company.contact.phone}`, 20, y); y += 7; }
        y += 5;

        // Tech
        if (company.keyTechnologies.length > 0) {
            checkPageBreak(20 + (company.keyTechnologies.length * 5));
            doc.setFontSize(14);
            doc.setTextColor(33, 41, 54);
            doc.text("Key Technologies", 20, y);
            y += 10;
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(doc.splitTextToSize(company.keyTechnologies.join(', '), 170), 20, y);
            y += 20;
        }

        // Metrics
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setTextColor(33, 41, 54);
        doc.text("Key Metrics", 20, y);
        y += 10;
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(`Pipeline Assets: ${company.pipeline.length}`, 20, y); y += 7;
        doc.text(`Approved Drugs: ${company.keyApprovedDrugs.length}`, 20, y); y += 7;
        
        // Footer
        const pageCount = doc.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated by BioPort AI - ${timestamp} - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        }

        doc.save(`${baseFilename}.pdf`);
        setIsExportOpen(false);
        return;
    }

    let content = '';
    let type = '';
    let filename = `${baseFilename}.${format}`;

    if (format === 'json') {
        content = JSON.stringify(company, null, 2);
        type = 'application/json';
    } else if (format === 'csv') {
        const headers = ["Name", "Type", "Sector", "Acquisition Status", "Acquired By", "Description", "Website", "HQ Address", "Email", "Phone", "Pipeline Count", "Approved Drugs Count", "Key Tech"];
        const row = [
            `"${company.name}"`,
            `"${company.entityType || (isAcademicEntity(company) ? 'Academic' : 'Corporate')}"`,
            `"${company.sector}"`,
            `"${company.acquisitionStatus || 'Independent'}"`,
            `"${company.acquiredBy || 'N/A'}"`,
            `"${company.description.replace(/"/g, '""')}"`,
            company.contact.website,
            `"${company.contact.hqAddress}"`,
            company.contact.email,
            company.contact.phone,
            company.pipeline.length,
            company.keyApprovedDrugs.length,
            `"${company.keyTechnologies.join('; ')}"`
        ];
        content = headers.join(',') + '\n' + row.join(',');
        type = 'text/csv';
    } else if (format === 'txt') {
        content = `INTELLIGENCE REPORT: ${company.name}\n` +
                  `----------------------------------------\n` +
                  `SECTOR: ${company.sector}\n` +
                  `TYPE: ${company.entityType || (isAcademicEntity(company) ? 'Academic' : 'Corporate')}\n` +
                  `STATUS: ${company.acquisitionStatus || 'Independent'}${company.acquiredBy ? ` (by ${company.acquiredBy})` : ''}\n\n` +
                  `DESCRIPTION:\n${company.description}\n\n` +
                  `CONTACT DETAILS:\n` +
                  `HQ: ${company.contact.hqAddress}\n` +
                  `Web: ${company.contact.website}\n` +
                  `Email: ${company.contact.email}\n\n` +
                  `KEY METRICS:\n` +
                  `Pipeline Assets: ${company.pipeline.length}\n` +
                  `Approved Drugs: ${company.keyApprovedDrugs.length}\n` +
                  `Key Technologies: ${company.keyTechnologies.join(', ')}\n`;
        type = 'text/plain';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  if (!company) return null;

  const isAcademic = isAcademicEntity(company);
  const isAcquired = company.acquisitionStatus === 'Acquired' || company.acquisitionStatus === 'Acquisition Pending';

  const getSafeUrl = (url?: string) => {
    if (!url || url.toLowerCase() === 'n/a' || url.trim() === '') return undefined;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const safeWebsiteUrl = getSafeUrl(company.contact.website);
  const safeResearchersUrl = getSafeUrl(company.researchersUrl);

  const showAustralianLocation = company.contact.auAddress && 
    company.contact.auAddress.toLowerCase() !== 'n/a' && 
    company.contact.auAddress.trim() !== '' &&
    company.contact.auAddress.trim() !== company.contact.hqAddress.trim();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-none">
        <div 
          ref={modalRef}
          style={{ 
            left: pos.x, 
            top: pos.y, 
            transform: 'translate(-50%, -50%)',
            position: 'fixed'
          }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col select-none pointer-events-auto"
        >
          {/* Header */}
          <div 
            onMouseDown={handleDragStart}
            className={`p-6 border-b border-slate-100 flex justify-between items-start cursor-move active:cursor-grabbing transition-colors ${isAcademic ? 'bg-emerald-50/30 hover:bg-emerald-50' : 'bg-slate-50/50 hover:bg-slate-100/50'}`}
          >
            <div>
              <div className="flex items-center gap-4 pointer-events-none">
                 <CompanyLogo 
                   name={company.name} 
                   website={company.contact.website} 
                   className="w-16 h-16 text-2xl" 
                 />
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900">{company.name}</h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAcademic ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                        {company.sector}
                      </span>
                      {isAcquired && (
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-widest ${company.acquisitionStatus === 'Acquired' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                           {company.acquisitionStatus}
                         </span>
                      )}
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Move className="w-2.5 h-2.5" /> Hold to Move
                      </div>
                    </div>
                 </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Export Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                  <Tooltip content="Download profile data." position="left">
                    <button 
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => setIsExportOpen(!isExportOpen)}
                        className={`p-2 rounded-full transition-colors ${isExportOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-200 text-slate-500 hover:text-blue-600'}`}
                    >
                        <Download className="w-6 h-6" />
                    </button>
                  </Tooltip>
                  
                  {isExportOpen && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                          <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Export As</div>
                          <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                              <File className="w-4 h-4 text-red-500" /> PDF Document
                          </button>
                          <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> CSV Data
                          </button>
                          <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                              <FileJson className="w-4 h-4 text-amber-500" /> JSON Object
                          </button>
                          <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors">
                              <FileText className="w-4 h-4 text-slate-500" /> Text Report
                          </button>
                      </div>
                  )}
              </div>

              <Tooltip content="Close this intelligence profile." position="left">
                <button 
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={onClose}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-6 space-y-12 select-text custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                {isAcquired && (
                  <section className={`p-5 rounded-2xl border flex items-center gap-4 ${company.acquisitionStatus === 'Acquired' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${company.acquisitionStatus === 'Acquired' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-widest ${company.acquisitionStatus === 'Acquired' ? 'text-amber-800' : 'text-blue-800'}`}>
                        {company.acquisitionStatus === 'Acquired' ? 'Corporate Acquisition Recorded' : 'Acquisition Protocol Initialized'}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {company.name} is {company.acquisitionStatus === 'Acquired' ? 'operating as a subsidiary of' : 'currently in negotiations to be acquired by'}{' '}
                        <strong className="text-slate-900">{company.acquiredBy || 'a parent entity'}.</strong>
                      </p>
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                    About
                    <HelpPopup 
                      title="Company Overview" 
                      content="A brief description of the entity's primary business focus, classification, and key technological tags." 
                      placement="left" 
                    />
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-6">{company.description}</p>
                  
                  {company.keyTechnologies && company.keyTechnologies.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Technological Pillars</span>
                        <HelpPopup 
                          title="Key Technologies" 
                          content="These represent the core scientific platforms, methodologies, or technical competencies that define the organization's research approach."
                          placement="right"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {company.keyTechnologies.map((tech, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700">
                            <Cpu className="w-3.5 h-3.5 text-blue-500" />
                            {tech}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {isAcademic ? 'Research Pipeline' : 'Clinical Pipeline'}
                      <HelpPopup 
                        title="Pipeline Data" 
                        content="A snapshot of key assets currently in development. Phase status is derived from clinical registries and corporate disclosures." 
                        placement="right" 
                      />
                    </h3>
                    <button 
                      onClick={() => setShowTrialsModal(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      View Full Registry <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <PipelineVisualizer pipeline={company.pipeline.slice(0, 5)} companyName={company.name} isAcademic={isAcademic} />
                    {company.pipeline.length > 5 && (
                      <div className="text-center mt-4">
                        <button 
                          onClick={() => setShowTrialsModal(true)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                          + {company.pipeline.length - 5} more assets
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {company.keyApprovedDrugs && company.keyApprovedDrugs.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Approved Products
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {company.keyApprovedDrugs.map((drug, idx) => {
                        const cleanDrugName = drug.split('(')[0].trim();
                        return (
                          <div 
                            key={idx} 
                            onClick={() => onProductClick?.(cleanDrugName)}
                            className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-900 cursor-pointer hover:bg-emerald-100 transition-colors"
                          >
                            <Pill className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="truncate">{drug}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Contact & Location</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-900">{company.contact.hqAddress}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Global Headquarters</div>
                      </div>
                    </div>
                    
                    {showAustralianLocation && (
                      <div className="flex items-start gap-3 pt-3 border-t border-slate-200/50">
                        <Globe className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-medium text-slate-900">{company.contact.auAddress}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Australian Office</div>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-200/50 space-y-3">
                      {safeWebsiteUrl && (
                        <a href={safeWebsiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-blue-600 hover:underline">
                          <Globe className="w-4 h-4 shrink-0" />
                          <span className="truncate">Visit Website</span>
                        </a>
                      )}
                      
                      {company.contact.email && (
                        <div className="flex items-center gap-3 text-slate-600">
                          <Mail className="w-4 h-4 shrink-0" />
                          <span className="truncate">{company.contact.email}</span>
                        </div>
                      )}
                      
                      {company.contact.phone && (
                        <div className="flex items-center gap-3 text-slate-600">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{company.contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span>{isAcademic ? 'Key Researchers' : 'Key Leadership'}</span>
                    {safeResearchersUrl && (
                      <a href={safeResearchersUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </h3>
                  
                  <div className="space-y-3">
                    {company.keyResearchers && company.keyResearchers.length > 0 ? (
                      company.keyResearchers.slice(0, 5).map((person, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group"
                          onClick={() => onResearcherClick?.(person.name, company.name, person.bio)}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            {person.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{person.name}</div>
                            <div className="text-xs text-slate-500 truncate">{person.title}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-400 italic">No key personnel listed.</div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Latest Publications</h3>
                  <div className="space-y-3">
                    {company.scientificPublications && company.scientificPublications.length > 0 ? (
                      company.scientificPublications.slice(0, 3).map((pub, idx) => (
                        <a 
                          key={idx} 
                          href={pub.url || `https://scholar.google.com/scholar?q=${encodeURIComponent(pub.title)}`}
                          target="_blank"
                          rel="noreferrer" 
                          className="block p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all group"
                        >
                          <div className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-600 line-clamp-2 mb-1">
                            {pub.title}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{pub.source}</span>
                            <span>{pub.year}</span>
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="text-sm text-slate-400 italic">No recent publications found.</div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Added Patent Section */}
              <div className="pt-12 border-t border-slate-100">
                 <Suspense fallback={<div className="h-40 flex items-center justify-center bg-slate-50 rounded-3xl text-slate-400"><Loader2 className="animate-spin mr-2" /> Loading IP node...</div>}>
                    <PatentSection companyName={company.name} onPatentSearchClick={onPatentSearchClick || (() => {})} />
                 </Suspense>
              </div>

            {/* Added News Section at the bottom of the modal as per screenshot arrow */}
            <div className="pt-12 border-t border-slate-100">
               <Suspense fallback={<div className="h-40 flex items-center justify-center bg-slate-50 rounded-3xl text-slate-400"><Loader2 className="animate-spin mr-2" /> Loading news node...</div>}>
                  <NewsFeed companyName={company.name} />
               </Suspense>
            </div>
          </div>
        </div>
      </div>

      {showTrialsModal && (
        <ClinicalTrialsModal 
          companyName={company.name} 
          initialPipeline={company.pipeline}
          onClose={() => setShowTrialsModal(false)}
          isAcademic={isAcademic}
        />
      )}
    </>
  );
};

export default DetailModal;
