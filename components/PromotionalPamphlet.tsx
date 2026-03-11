
import React, { useRef, useState } from 'react';
import { 
  Download, Dna, Search, Bot, Database, 
  ShieldCheck, Globe, Zap, CheckCircle2, XCircle, ArrowRightLeft, Pill, Briefcase
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PromotionalPamphlet: React.FC = () => {
  const pamphletRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!pamphletRef.current) return;
    setIsGenerating(true);

    try {
      // Small delay to ensure render
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(pamphletRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // FIX 1: Remove bg-clip-text which often renders as a solid block in html2canvas
          const gradientTexts = clonedDoc.querySelectorAll('.bg-clip-text');
          gradientTexts.forEach((el) => {
            el.classList.remove('text-transparent', 'bg-clip-text', 'bg-gradient-to-r', 'from-blue-600', 'to-indigo-600');
            el.classList.add('text-blue-600');
          });

          // FIX 2: Remove heavy blurred backgrounds which can render as solid artifacts
          // Select elements with large blur classes
          const blurredElements = clonedDoc.querySelectorAll('[class*="blur-"]');
          blurredElements.forEach((el) => {
             // Only hide the background decorations, not functional UI if any
             if (el.classList.contains('absolute') && el.classList.contains('z-0')) {
                (el as HTMLElement).style.display = 'none';
             }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      
      // A4 dimensions in mm
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfImgHeight);
      pdf.save('BioPort_AI_Brochure.pdf');
    } catch (err) {
      console.error("PDF Generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
      
      {/* Control Bar */}
      <div className="sticky top-20 z-50 flex justify-end mb-8 px-4">
        <button
          onClick={handleDownloadPdf}
          disabled={isGenerating}
          className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">Generating PDF...</span>
          ) : (
            <>
              <Download className="w-5 h-5" /> Download Brochure
            </>
          )}
        </button>
      </div>

      {/* Pamphlet Container - A4 Ratio Constraint */}
      <div className="flex justify-center">
        <div 
          ref={pamphletRef}
          className="w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl relative overflow-hidden"
          style={{ transformOrigin: 'top center' }}
        >
          {/* Background Elements - Marked z-0 for easy identification in onclone */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 z-0" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 z-0" />

          {/* Header */}
          <div className="relative z-10 px-16 pt-16 pb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Dna className="w-7 h-7" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900">
                BioPort <span className="text-blue-600">AI</span>
              </h1>
            </div>
            <div className="h-2 w-24 bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full mb-6" />
            <h2 className="text-5xl font-black leading-[1.1] mb-6 text-slate-800">
              The Professional Intelligence Engine for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Biopharma.</span>
            </h2>
            <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-2xl">
              Bridge the gap between corporate development and academic research. 
              Real-time, grounded intelligence for high-stakes decision making.
            </p>
          </div>

          {/* Main Visual/Feature Grid */}
          <div className="relative z-10 px-16 py-8">
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Discovery Node</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Perform bulk analysis on hundreds of entities instantly. Input a list of company names or search a therapeutic sector to build deep, verified profiles in seconds.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">AI Strategy Agent</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Consult a grounded AI reasoning engine capable of synthesizing competitive landscapes, finding clinical trial gaps, and summarizing PI activity.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                  <Pill className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Drug Intelligence</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Deep-dive pharmacological analysis. Retrieve mechanism of action, side effects, and 3D molecular structures for approved and investigational drugs.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Unified Analytics</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Visualize global pipelines. Track drug development phases from Preclinical to Approval across corporate and academic sectors side-by-side.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Talent Node</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Scan global career portals for specialized scientific roles. Filter opportunities by expertise (e.g. mRNA, Oncology) and institution type.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Clinical Veracity</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Zero hallucination protocol. All data is grounded via live API connections to ClinicalTrials.gov (AACT) and PubMed for absolute integrity.
                </p>
              </div>
            </div>

            {/* Competitive Comparison Section */}
            <div className="mb-12">
               <div className="flex items-center gap-3 mb-6">
                  <ArrowRightLeft className="w-6 h-6 text-slate-400" />
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Competitive Advantage</h3>
               </div>
               
               <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200">
                     <div className="col-span-4 p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Feature</div>
                     <div className="col-span-4 p-4 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 border-x border-slate-200">BioPort AI</div>
                     <div className="col-span-4 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Legacy Suites (e.g. Cortellis)</div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-slate-100 items-center">
                     <div className="col-span-4 p-4 text-sm font-bold text-slate-800">Data Freshness</div>
                     <div className="col-span-4 p-4 bg-blue-50/30 border-x border-slate-100 text-sm font-bold text-blue-700 flex items-center gap-2">
                        <Zap className="w-4 h-4 fill-blue-600 text-blue-600" /> Real-Time API Sync
                     </div>
                     <div className="col-span-4 p-4 text-sm text-slate-500 font-medium">
                        Manual Curation (Weekly/Monthly)
                     </div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-slate-100 items-center">
                     <div className="col-span-4 p-4 text-sm font-bold text-slate-800">Intelligence Engine</div>
                     <div className="col-span-4 p-4 bg-blue-50/30 border-x border-slate-100 text-sm font-bold text-blue-700 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-blue-600" /> Generative AI Agent
                     </div>
                     <div className="col-span-4 p-4 text-sm text-slate-500 font-medium">
                        Boolean Keyword Search
                     </div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-slate-100 items-center">
                     <div className="col-span-4 p-4 text-sm font-bold text-slate-800">Silo Integration</div>
                     <div className="col-span-4 p-4 bg-blue-50/30 border-x border-slate-100 text-sm font-bold text-blue-700 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" /> Pharma + Academic + Clinical
                     </div>
                     <div className="col-span-4 p-4 text-sm text-slate-500 font-medium">
                        Separate Licenses Required
                     </div>
                  </div>

                  <div className="grid grid-cols-12 items-center">
                     <div className="col-span-4 p-4 text-sm font-bold text-slate-800">Accessibility</div>
                     <div className="col-span-4 p-4 bg-blue-50/30 border-x border-slate-100 text-sm font-bold text-blue-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Cloud Access
                     </div>
                     <div className="col-span-4 p-4 text-sm text-slate-500 font-medium flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-slate-300" /> Enterprise Sales Cycle
                     </div>
                  </div>
               </div>
            </div>

            {/* Footer / Contact */}
            <div className="flex justify-between items-end border-t border-slate-200 pt-8">
              <div>
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-sm mb-2">System Access</h4>
                <p className="text-sm text-slate-600 font-medium">bioport.ai</p>
                <p className="text-sm text-slate-600 font-medium">enterprise@bioport.ai</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500">Global Coverage</span>
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                  BioPort Intelligence Labs &copy; 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionalPamphlet;
