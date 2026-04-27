// src/components/USPTOPatentDetailModal.tsx
import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Activity, Info, FileText } from 'lucide-react';
import { getApplicationData, getContinuityData, getAssignments, getForeignPriority, getTransactions, getTermAdjustment } from '../services/usptoService';
import { Patent } from '../types';

interface USPTOPatentDetailModalProps {
  patent: Patent;
  onClose: () => void;
}

const USPTOPatentDetailModal: React.FC<USPTOPatentDetailModalProps> = ({ patent, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!patent.applicationNumber) {
        setError("Invalid application number");
        setLoading(false);
        return;
      }
      try {
        const num = patent.applicationNumber;
        const [
          meta,
          continuity,
          assignments,
          foreignPriority,
          transactions,
          adjustment
        ] = await Promise.allSettled([
          getApplicationData(num),
          getContinuityData(num),
          getAssignments(num),
          getForeignPriority(num),
          getTransactions(num),
          getTermAdjustment(num),
        ]);

        const extractBag = (res: any) => {
           const bag = res?.patentFileWrapperDataBag?.[0];
           if (!bag) return null;
           const key = Object.keys(bag).find(k => k !== 'applicationNumberText');
           return key ? bag[key] : null;
        };

        setData({
          meta: meta.status === 'fulfilled' ? extractBag(meta.value) : null,
          continuity: continuity.status === 'fulfilled' ? extractBag(continuity.value) : null,
          assignments: assignments.status === 'fulfilled' ? extractBag(assignments.value) : null,
          foreignPriority: foreignPriority.status === 'fulfilled' ? extractBag(foreignPriority.value) : null,
          transactions: transactions.status === 'fulfilled' ? extractBag(transactions.value) : null,
          adjustment: adjustment.status === 'fulfilled' ? extractBag(adjustment.value) : null,
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [patent]);

  if (!patent) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900">USPTO PFW Record</h2>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase px-2 py-1 rounded-full">
              {patent.applicationNumber}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="mb-6">
             <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2">{patent.title}</h3>
             <a 
               href={patent.url} 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
             >
                <ExternalLink className="w-4 h-4" /> View full text on Google Patents
             </a>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 font-medium text-sm">
               Error loading data from USPTO PFW API: {error}
            </div>
          )}

          {data && (
            <div className="space-y-6">
               
              {data.meta && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                     <Info className="w-4 h-4 text-blue-600" /> Application Details
                  </h4>
                  <div className="grid grid-cols-2 text-sm gap-4">
                     <div><span className="font-bold text-slate-400">Class:</span> {data.meta.uspcSymbolText || data.meta.patentClassificationObject?.[0]?.nationalClass || 'N/A'}</div>
                     <div><span className="font-bold text-slate-400">Group Art Unit:</span> {data.meta.groupArtUnitNumber || 'N/A'}</div>
                     <div><span className="font-bold text-slate-400">Confirmation No:</span> {data.meta.applicationConfirmationNumber || 'N/A'}</div>
                     <div><span className="font-bold text-slate-400">Examiner:</span> {data.meta.examinerNameText || data.meta.primaryExaminerName || 'N/A'}</div>
                  </div>
                </div>
              )}

              {data.continuity && data.continuity.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                     <Activity className="w-4 h-4 text-indigo-600" /> Continuity Data
                  </h4>
                  <ul className="text-sm space-y-2">
                    {data.continuity.map((item: any, i: number) => (
                       <li key={i} className="flex gap-2">
                         <span className="font-bold text-slate-500">{item.continuityTypeDescriptionText || item.claimDescriptionText}:</span>
                         <span>{item.childApplicationNumberText} &rarr; {item.parentApplicationNumberText}</span>
                       </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.transactions && data.transactions.length > 0 && (
                 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                   <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                      <FileText className="w-4 h-4 text-emerald-600" /> Recent Transactions (Last 5)
                   </h4>
                   <ul className="text-sm space-y-3">
                     {data.transactions.slice(0, 5).map((item: any, i: number) => (
                        <li key={i} className="flex flex-col">
                           <span className="font-bold text-slate-700">{item.eventDate || item.recordDate}</span>
                           <span className="text-slate-600">{item.eventDescriptionText || item.transactionDescriptionText}</span>
                        </li>
                     ))}
                   </ul>
                 </div>
              )}

              {data.assignments && data.assignments.length > 0 && (
                 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                   <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                      <Info className="w-4 h-4 text-amber-600" /> Assignments
                   </h4>
                   <ul className="text-sm space-y-2">
                     {data.assignments.map((item: any, i: number) => (
                        <li key={i} className="flex flex-col">
                           <span className="font-bold text-slate-700">{item.assignorBag?.[0]?.assignorName} &rarr; {item.assigneeBag?.[0]?.assigneeNameText}</span>
                           <span className="text-slate-500 text-xs">{item.assignorBag?.[0]?.executionDate || item.assignmentRecordedDate}</span>
                        </li>
                     ))}
                   </ul>
                 </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default USPTOPatentDetailModal;
