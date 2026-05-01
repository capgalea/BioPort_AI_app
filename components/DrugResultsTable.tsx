
import React from 'react';
import { DrugDeepDive } from '../types';
import { CheckCircle2, Box } from 'lucide-react';
import Tooltip from './Tooltip';

interface DrugResultsTableProps {
  drugs: (DrugDeepDive & { id: string })[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onOpen3D?: (drug: any) => void;
}

const DrugResultsTable: React.FC<DrugResultsTableProps> = ({ drugs, selectedIds, onSelectionChange, onOpen3D }) => {
    
    const handleSelectRow = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        onSelectionChange(newSet);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSelectionChange(e.target.checked ? new Set(drugs.map(d => d.id)) : new Set());
    };
    
    const isAllSelected = selectedIds.size > 0 && selectedIds.size === drugs.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < drugs.length;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="p-4 w-12 text-center sticky left-0 bg-slate-50 z-10">
                                {/* FIX: Explicitly checking el existence and setting indeterminate via side effect to avoid return-value assignment error */}
                                <input 
                                    type="checkbox" 
                                    checked={isAllSelected} 
                                    ref={el => { if (el) el.indeterminate = isSomeSelected; }} 
                                    onChange={handleSelectAll} 
                                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" 
                                />
                            </th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Drug Class</th>
                            <th className="p-4">Indications</th>
                            <th className="p-4">Approval Date</th>
                            <th className="p-4">Manufacturers</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {drugs.map(drug => {
                            const isSelected = selectedIds.has(drug.id);
                            return (
                                <tr key={drug.id} className={`transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`} onClick={() => handleSelectRow(drug.id)}>
                                    <td className="p-4 text-center sticky left-0 z-10" style={{ backgroundColor: isSelected ? '#eef2ff' : '#ffffff' }}>
                                        <div 
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}
                                        >
                                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">{drug.name}</td>
                                    <td className="p-4 text-slate-600">{drug.drugClass}</td>
                                    <td className="p-4 text-slate-600 text-xs">{drug.indications.join(', ')}</td>
                                    <td className="p-4 text-slate-600">{drug.approvalDate}</td>
                                    <td className="p-4 text-slate-600 text-xs">{drug.manufacturers.join(', ')}</td>
                                    <td className="p-4 text-right">
                                       {onOpen3D && (
                                         <Tooltip content="Launch 3D Viewer">
                                           <button 
                                             onClick={(e) => { e.stopPropagation(); onOpen3D(drug); }}
                                             className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                                           >
                                             <Box className="w-4 h-4" />
                                           </button>
                                         </Tooltip>
                                       )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DrugResultsTable;
