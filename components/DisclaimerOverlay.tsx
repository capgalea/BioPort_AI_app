import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Scale, AlertTriangle, Info, ShieldCheck, FileText, ScrollText } from 'lucide-react';

// Versioning allows forcing re-acceptance after significant app updates
const DISCLAIMER_VERSION = '1.2.0';
const STORAGE_KEY = 'bioport_disclaimer_accepted_v1_2';

interface DisclaimerOverlayProps {
  onAccept: () => void;
}

const DisclaimerOverlay: React.FC<DisclaimerOverlayProps> = ({ onAccept }) => {
  const [hasAccepted, setHasAccepted] = useState(true); 
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (accepted !== DISCLAIMER_VERSION) {
        setHasAccepted(false);
      }
    } catch (e) {
      // If localStorage is blocked, we must show the disclaimer
      setHasAccepted(false);
    }
    setIsChecking(false);
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, DISCLAIMER_VERSION);
    } catch (e) {
      console.warn("Could not save disclaimer acceptance to localStorage", e);
    }
    setHasAccepted(true);
    onAccept();
  };

  if (isChecking || hasAccepted) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/98 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-8 sm:p-10 text-white flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-4 shadow-sm border border-blue-400/30 relative z-10">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight relative z-10">Professional Use Acknowledgment</h2>
          <p className="text-slate-400 text-sm mt-2 font-medium relative z-10">Compliance Protocol v{DISCLAIMER_VERSION}</p>
          
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>

        {/* Content Section - Enforced Click-Wrap Phrasing */}
        <div className="p-8 sm:p-10 space-y-8 overflow-y-auto max-h-[60vh] bg-white custom-scrollbar">
          
          {/* Key Compliance Points */}
          <div className="space-y-6">
            <div className="flex gap-4">
               <div className="mt-1 shrink-0 p-2 bg-amber-50 rounded-lg">
                 <AlertTriangle className="w-5 h-5 text-amber-600" />
               </div>
               <div>
                 <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-1.5">No Medical Advice</h3>
                 <p className="text-slate-600 text-sm leading-relaxed">
                   This software is a <strong>research tool</strong> and does not provide medical advice, diagnosis, or treatment recommendations. The information displayed is for analytical purposes only.
                 </p>
               </div>
            </div>

            <div className="flex gap-4">
               <div className="mt-1 shrink-0 p-2 bg-blue-50 rounded-lg">
                 <Info className="w-5 h-5 text-blue-600" />
               </div>
               <div>
                 <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-1.5">Qualified Users Only</h3>
                 <p className="text-slate-600 text-sm leading-relaxed font-medium">
                   Intended for use by <strong>qualified researchers and healthcare professionals only</strong>. This application is NOT for use by patients or the general public.
                 </p>
               </div>
            </div>

            <div className="flex gap-4">
               <div className="mt-1 shrink-0 p-2 bg-emerald-50 rounded-lg">
                 <ShieldCheck className="w-5 h-5 text-emerald-600" />
               </div>
               <div>
                 <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-1.5">No Clinician Overrule</h3>
                 <p className="text-slate-600 text-sm leading-relaxed">
                   Information provided should <strong>not be used to override the clinical judgment</strong> of a healthcare professional.
                 </p>
               </div>
            </div>
          </div>

          {/* EULA SCROLLABLE WINDOW */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <ScrollText className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End-User License Agreement (EULA)</span>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 h-64 overflow-y-auto text-[11px] text-slate-600 leading-relaxed font-mono custom-scrollbar">
              <p className="font-bold mb-4 text-slate-900">Last Updated: January 12, 2026<br/>Company: BioPort AI ("Licensor")</p>
              
              <p className="mb-4 text-slate-900 font-bold uppercase">PLEASE READ THIS AGREEMENT CAREFULLY. BY CLICKING "I AGREE" OR USING THE BIOPORT AI APPLICATION ("THE SOFTWARE"), YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT INSTALL OR USE THE SOFTWARE.</p>

              <h4 className="font-bold text-slate-800 mt-4 mb-2">1. GRANT OF LICENSE</h4>
              <p className="mb-4">BioPort AI grants you a personal, non-exclusive, non-transferable, and revocable license to use the Software solely for internal business, academic research, or corporate analytical purposes. This license is granted to you as an individual or to the entity you represent; it is not a sale of the Software or any copy thereof.</p>

              <h4 className="font-bold text-slate-800 mt-4 mb-2">2. RESTRICTIONS ON USE (PROPRIETARY PROTECTION)</h4>
              <p className="mb-4">You acknowledge that the Software contains trade secrets and proprietary AI logic belonging to BioPort AI. You shall not, and shall not permit others to:</p>
              <ul className="list-disc ml-4 space-y-2 mb-4">
                <li><strong>Decompile or Reverse Engineer:</strong> Attempt to derive the source code, underlying algorithms, or structure of the Software.</li>
                <li><strong>Redistribute:</strong> Rent, lease, lend, sell, sublicense, or otherwise transfer the Software to any third party.</li>
                <li><strong>Derivative Works:</strong> Modify, adapt, or create derivative works based upon the Software.</li>
                <li><strong>Remove Notices:</strong> Remove or alter any copyright, trademark, or proprietary notices.</li>
              </ul>

              <h4 className="font-bold text-slate-800 mt-4 mb-2">3. FORMAL MEDICAL DISCLAIMER (AUSTRALIAN TGA COMPLIANCE)</h4>
              <p className="mb-2"><strong>3.1 Intended Audience:</strong> The Software is a research tool intended strictly for use by qualified healthcare researchers and corporate professionals. It is NOT intended for use by consumers, patients, or for clinical diagnosis.</p>
              <p className="mb-2"><strong>3.2 Not a Medical Device:</strong> In accordance with the Therapeutic Goods (Excluded Goods) Determination 2018 (Australia), this Software is excluded from TGA regulation. It is a "Class 1" information tool designed to provide access to medical literature and clinical trial data for educational and research purposes.</p>
              <p className="mb-4"><strong>3.3 No Medical Advice:</strong><br/>
                &bull; <strong>No Diagnosis:</strong> The Software does not provide medical diagnoses, treatment recommendations, or clinical "alerts" for specific patient cases.<br/>
                &bull; <strong>No Clinician Overrule:</strong> Any insights generated by BioPort AI are for research support and must never override the independent clinical judgment of a qualified medical practitioner.<br/>
                &bull; <strong>Data Accuracy:</strong> AI-generated summaries may contain errors. Users must verify all clinical trial data, drug dosages, and treatment protocols against original peer-reviewed source documents (e.g., via DOI or official registries).</p>

              <h4 className="font-bold text-slate-800 mt-4 mb-2">4. INTELLECTUAL PROPERTY</h4>
              <p className="mb-4">All title and intellectual property rights in and to the Software (including but not limited to AI models, code, images, and documentation) are owned by BioPort AI. Your use of the Software does not grant you any ownership rights.</p>

              <h4 className="font-bold text-slate-800 mt-4 mb-2">5. DATA PRIVACY</h4>
              <p className="mb-4">Your use of the Software is subject to the BioPort AI Privacy Policy, which complies with the Privacy Act 1988 (Cth). We do not process patient-identifiable data; you agree not to input any "Protected Health Information" (PHI) into the AI agents.</p>

              <h4 className="font-bold text-slate-800 mt-4 mb-2">6. LIMITATION OF LIABILITY</h4>
              <p className="mb-4">To the maximum extent permitted by the Australian Consumer Law (ACL), BioPort AI’s liability for breach of any mandatory guarantee is limited to the resupply of the services or the cost of resupply. BioPort AI shall not be liable for any indirect, incidental, or consequential damages arising from the use of research data provided by the Software.</p>

              <h4 className="font-bold text-slate-800 mt-4 mb-2">7. TERMINATION</h4>
              <p className="mb-4">This license is effective until terminated. Your rights under this license will terminate automatically without notice if you fail to comply with any term(s) of this EULA. Upon termination, you must cease all use of the Software and destroy all copies.</p>

              <h4 className="font-bold text-slate-800 mt-4 mb-2">8. GOVERNING LAW</h4>
              <p className="mb-4">This Agreement is governed by the laws of Queensland, Australia (or your specific state). You consent to the exclusive jurisdiction of the courts located within that jurisdiction.</p>
            </div>
            {/* Fade effect to encourage scrolling */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none rounded-b-2xl"></div>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
             <p className="text-[11px] text-slate-500 italic leading-relaxed text-center">
               By clicking below, you attest that you meet the professional requirements for access and understand that the AI-generated data is subject to verification as per the EULA above.
             </p>
          </div>
        </div>

        {/* Action Section */}
        <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col gap-4">
          <button
            onClick={handleAccept}
            className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl py-4.5 font-bold transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            I Agree to EULA & Terms
          </button>
          
          <div className="flex justify-center items-center gap-4">
            <span className="h-px bg-slate-200 flex-1"></span>
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em] whitespace-nowrap">
              BioPort AI • Intelligence Node
            </p>
            <span className="h-px bg-slate-200 flex-1"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerOverlay;