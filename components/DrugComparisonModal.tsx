
import React from 'react';
import { X, Box } from 'lucide-react';
import { DrugDeepDive } from '../types';
import Tooltip from './Tooltip';

interface DrugComparisonModalProps {
  drugs: (DrugDeepDive & { id: string })[];
  onClose: () => void;
  onOpen3D: (drug: any) => void;
}

const DrugComparisonModal: React.FC<DrugComparisonModalProps> = ({ drugs, onClose, onOpen3D }) => {
  if (drugs.length === 0) return null;

  const metrics = [
    { label: 'Drug Class', key: 'drugClass' },
    { label: 'Indications', key: 'indications' },
    { label: 'Approval Date', key: 'approvalDate' },
    { label: 'Manufacturers', key: 'manufacturers' },
    { label: 'Mechanism of Action', key: 'mechanismOfAction' },
    { label: 'Side Effects', key: 'sideEffects' },
  ];

  const renderValue = (drug: DrugDeepDive, key: string) => {
    const value = (drug as any)[key];
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc list-inside space-y-1 text-xs">
          {value.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }
    return <span className="text-xs">{value}</span>;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col relative border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Drug Comparison</h2>
            <p className="text-sm text-slate-500">Side-by-side analysis of selected compounds.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-bold text-slate-600 w-[200px] bg-slate-100">Metric</th>
                {drugs.map(drug => (
                  <th key={drug.id} className="p-4 border-l border-slate-200 bg-slate-100 min-w-[200px]">
                    <div className="flex flex-col gap-2">
                       <span className="font-bold text-slate-900 text-base">{drug.name}</span>
                       <Tooltip content="Launch separate 3D Molecular Viewer window">
                         <button 
                           onClick={() => onOpen3D(drug)} 
                           className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm active:scale-95 w-full"
                         >
                           <Box className="w-3.5 h-3.5" /> 3D View
                         </button>
                       </Tooltip>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map(metric => (
                <tr key={metric.key}>
                  <td className="p-4 font-semibold text-slate-500 align-top bg-slate-50/50">{metric.label}</td>
                  {drugs.map(drug => (
                    <td key={drug.id} className="p-4 text-slate-700 align-top border-l border-slate-200">
                      {renderValue(drug, metric.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DrugComparisonModal;