import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CompanyData, getEntityCategory } from '../types';
import { ChevronDown, ChevronUp, Search, Settings, Download, Trash2, RefreshCw, ExternalLink, Loader2, FileJson, FileSpreadsheet, Eye, X, Filter, Building2 } from 'lucide-react';
import Tooltip from './Tooltip';

interface ResultsTableProps {
  companies: CompanyData[];
  totalRecords: number;
  onCompanyClick: (company: CompanyData) => void;
  onDeleteCompany: (company: CompanyData, deleteFromCloud: boolean) => void;
  onDeleteCompanies: (companyIds: string[], deleteFromCloud: boolean) => void;
  onRefreshCompany: (company: CompanyData) => void;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  columnFilters: Record<string, string[]>;
  onColumnFiltersChange: (filters: Record<string, string[]>) => void;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
};

const getCellValue = (c: CompanyData, colId: string): string => {
    switch (colId) {
        case 'name': return c.name;
        case 'entityType': return getEntityCategory(c);
        case 'sector': return c.sector;
        case 'hqAddress': return c.contact?.hqAddress || '';
        case 'pipelineCount': return String(c.pipeline?.length || 0);
        case 'approvedCount': return String(c.keyApprovedDrugs?.length || 0);
        case 'lastUpdated': return formatDate(c.lastUpdated);
        case 'acquisition': return c.acquisitionStatus || 'Independent';
        default: return '';
    }
};

const ResultsTable: React.FC<ResultsTableProps> = ({ 
  companies, 
  totalRecords,
  onCompanyClick, 
  onDeleteCompany, 
  onDeleteCompanies,
  onRefreshCompany,
  globalFilter,
  onGlobalFilterChange,
  columnFilters,
  onColumnFiltersChange
}) => {
    const initialColumnDefs: { id: string; header: string; sortable: boolean; draggable: boolean; cell: (c: CompanyData) => React.ReactNode; }[] = [
        { id: 'name', header: 'Name', sortable: true, draggable: true, cell: (c) => <span className="font-bold text-slate-800">{c.name}</span> },
        { id: 'entityType', header: 'Type', sortable: true, draggable: true, cell: (c) => <span className="text-slate-600">{getEntityCategory(c)}</span> },
        { id: 'sector', header: 'Sector', sortable: true, draggable: true, cell: (c) => <span className="text-slate-600">{c.sector}</span> },
        { 
            id: 'acquisition', 
            header: 'Status', 
            sortable: true, 
            draggable: true, 
            cell: (c) => {
                const isAcquired = c.acquisitionStatus === 'Acquired' || c.acquisitionStatus === 'Acquisition Pending';
                if (!isAcquired) return <span className="text-slate-400 text-xs font-medium italic">Independent</span>;
                return (
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${c.acquisitionStatus === 'Acquired' ? 'text-amber-600' : 'text-blue-600'}`}>
                            {c.acquisitionStatus}
                        </span>
                        {c.acquiredBy && <span className="text-[10px] font-bold text-slate-800 truncate max-w-[120px]" title={c.acquiredBy}>by {c.acquiredBy}</span>}
                    </div>
                );
            } 
        },
        { id: 'hqAddress', header: 'Region', sortable: true, draggable: true, cell: (c) => <span className="text-slate-600">{c.contact?.hqAddress || ''}</span> },
        { id: 'pipelineCount', header: 'Pipeline', sortable: true, draggable: true, cell: (c) => <div className="text-center font-mono font-bold text-slate-700">{c.pipeline?.length || 0}</div> },
        { id: 'approvedCount', header: 'Approved', sortable: true, draggable: true, cell: (c) => <div className="text-center font-mono font-bold text-slate-700">{c.keyApprovedDrugs?.length || 0}</div> },
        { id: 'lastUpdated', header: 'Synced', sortable: true, draggable: true, cell: (c) => <span className="text-slate-500 text-xs">{formatDate(c.lastUpdated)}</span> },
        { 
            id: 'actions', 
            header: 'Actions', 
            sortable: false, 
            draggable: false,
            cell: (c) => (
                <div className="flex gap-2">
                    <Tooltip content="View Details"><button onClick={() => onCompanyClick(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button></Tooltip>
                    <Tooltip content="Refresh Data"><button onClick={() => onRefreshCompany(c)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><RefreshCw className="w-4 h-4" /></button></Tooltip>
                    <Tooltip content="Delete"><button onClick={(e) => {
                        e.preventDefault();
                        console.log("Delete button clicked in table:", c.name);
                        const confirmDelete = confirm(`Delete ${c.name} from local cache? Click OK to also delete from Cloud database.`);
                        onDeleteCompany(c, confirmDelete);
                    }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></Tooltip>
                </div>
            ) 
        },
    ];

    const [tempColumnFilters, setTempColumnFilters] = useState<Record<string, string[]>>({});
    const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(initialColumnDefs.map(c => c.id)));
    const [isColMenuOpen, setIsColMenuOpen] = useState(false);
    const [openFilterMenu, setOpenFilterMenu] = useState<string | null>(null);
    const [filterSearch, setFilterSearch] = useState('');
    const [characterFilter, setCharacterFilter] = useState<string[]>([]);
    const colMenuRef = useRef<HTMLDivElement>(null);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const previousOpenFilterMenu = useRef<string | null>(null);
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [showOnlySelectedInFilter, setShowOnlySelectedInFilter] = useState(false);

    // Column Drag & Drop State
    const [columns, setColumns] = useState(initialColumnDefs);
    const draggedColumnId = useRef<string | null>(null);
    const [dragOverColId, setDragOverColId] = useState<string | null>(null);

    // Apply temporary filters when a filter menu is closed or changed
    useEffect(() => {
        if (previousOpenFilterMenu.current && previousOpenFilterMenu.current !== openFilterMenu) {
            onColumnFiltersChange(tempColumnFilters);
        }
        previousOpenFilterMenu.current = openFilterMenu;
    }, [openFilterMenu, tempColumnFilters, onColumnFiltersChange]);

    // Handle closing filter menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
                setIsColMenuOpen(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                if (openFilterMenu) {
                    setOpenFilterMenu(null); 
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openFilterMenu]);

    const columnOptions = useMemo(() => {
        const options: Record<string, string[]> = {};
        initialColumnDefs.forEach(col => {
            if (!col.sortable) return;
            const values = new Set<string>();
            companies.forEach(c => {
                const val = getCellValue(c, col.id);
                if (val) values.add(val);
            });
            options[col.id] = Array.from(values).sort((a, b) => a.localeCompare(b));
        });
        return options;
    }, [companies]);

    const sortedData = useMemo(() => {
        return [...companies].sort((a, b) => {
            const valA = getCellValue(a, sort.key);
            const valB = getCellValue(b, sort.key);
            if (sort.key === 'pipelineCount' || sort.key === 'approvedCount') {
                return sort.direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
            }
            if (sort.key === 'lastUpdated') {
                const dateA = new Date(valA).getTime() || 0;
                const dateB = new Date(valB).getTime() || 0;
                return sort.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            return sort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }, [companies, sort]);

    const displayedData = useMemo(() => {
        if (showOnlySelected) {
            return sortedData.filter(c => selectedIds.has(c.id));
        }
        return sortedData;
    }, [sortedData, showOnlySelected, selectedIds]);

    const handleSort = (key: string) => {
        setSort(prev => ({ 
            key, 
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' 
        }));
    };

    const toggleColumn = (id: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextSet = e.target.checked ? new Set(displayedData.map(c => c.id)) : new Set<string>();
        setSelectedIds(nextSet);
    };

    const handleSelectRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleExport = (format: 'csv' | 'json') => {
        const dataToExport = companies.filter(c => selectedIds.has(c.id));
        if (dataToExport.length === 0) return;
        let content = '';
        let type = '';
        let filename = `bioport_export_${new Date().toISOString().split('T')[0]}`;
        
        if (format === 'csv') {
            const headers = Object.keys(dataToExport[0]).filter(k => k !== 'found' && k !== 'id');
            content = [headers.join(','), ...dataToExport.map(row => headers.map(h => JSON.stringify((row as any)[h])).join(','))].join('\n');
            type = 'text/csv;charset=utf-8;';
            filename += '.csv';
        } else {
            content = JSON.stringify(dataToExport, null, 2);
            type = 'application/json';
            filename += '.json';
        }
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([content], { type }));
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableHeaderCellElement>, colId: string) => {
        draggedColumnId.current = colId;
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
        e.preventDefault();
    };
    const handleDragEnter = (e: React.DragEvent<HTMLTableHeaderCellElement>, colId: string) => { 
        e.preventDefault(); 
        setDragOverColId(colId); 
    };
    const handleDragLeave = (e: React.DragEvent<HTMLTableHeaderCellElement>) => { 
        e.preventDefault(); 
        setDragOverColId(null); 
    };
    const handleDrop = (e: React.DragEvent<HTMLTableHeaderCellElement>, targetColId: string) => {
        e.preventDefault();
        const sourceColId = draggedColumnId.current;
        setDragOverColId(null);
        if (!sourceColId || sourceColId === targetColId) return;
        setColumns(prev => {
            const sourceIndex = prev.findIndex(c => c.id === sourceColId);
            const targetIndex = prev.findIndex(c => c.id === targetColId);
            if (sourceIndex === -1 || targetIndex === -1) return prev;
            const reordered = [...prev];
            const [draggedItem] = reordered.splice(sourceIndex, 1);
            reordered.splice(targetIndex, 0, draggedItem);
            return reordered;
        });
        draggedColumnId.current = null;
    };

    const handleFilterIconClick = (colId: string) => {
        if (openFilterMenu === colId) {
            setOpenFilterMenu(null);
        } else {
            setTempColumnFilters(columnFilters);
            setOpenFilterMenu(colId);
            setFilterSearch('');
            setCharacterFilter([]);
            setShowOnlySelectedInFilter(false);
        }
    };
    
    const handleToggleTempColumnFilter = (colId: string, value: string) => {
        setTempColumnFilters(prev => {
            const current = prev[colId] || [];
            const newValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
            return { ...prev, [colId]: newValues };
        });
    };

    const handleSelectAllInTempFilter = (colId: string) => {
        const allOptions = columnOptions[colId] || [];
        setTempColumnFilters(prev => ({ ...prev, [colId]: allOptions }));
    };
    const handleClearInTempFilter = (colId: string) => {
        setTempColumnFilters(prev => ({ ...prev, [colId]: [] }));
    };

    const clearAllFilters = () => {
        onGlobalFilterChange('');
        onColumnFiltersChange({});
    };

    const handleCharacterFilterToggle = (char: string) => {
      setCharacterFilter(prev => 
        prev.includes(char) ? prev.filter(c => c !== char) : [...prev, char]
      );
    };

    const availableChars = useMemo(() => {
      if (!openFilterMenu) return [];
      const options = columnOptions[openFilterMenu] || [];
      const chars = new Set(options.map(opt => opt?.[0]?.toUpperCase()).filter(Boolean));
      return Array.from(chars).sort();
    }, [columnOptions, openFilterMenu]);

    const isAllSelected = selectedIds.size > 0 && selectedIds.size === displayedData.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < displayedData.length;
    const displayedColumns = columns.filter(c => visibleColumns.has(c.id));
    const hasActiveFilters = globalFilter || (Object.values(columnFilters) as string[][]).some(v => v.length > 0);
    
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={globalFilter} onChange={e => onGlobalFilterChange(e.target.value)} placeholder={`Global filter for ${totalRecords} records...`} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 shadow-sm whitespace-nowrap">
                       <input type="checkbox" checked={showOnlySelected} onChange={() => setShowOnlySelected(!showOnlySelected)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                       Show selected ({selectedIds.size})
                    </label>
                    {hasActiveFilters && (
                       <button onClick={clearAllFilters} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-50 transition-all shadow-sm">
                          <X className="w-4 h-4" /> Clear Filters
                       </button>
                    )}
                    {selectedIds.size > 0 && (
                        <button 
                            onClick={() => {
                                const confirmDelete = confirm(`Are you sure you want to delete ${selectedIds.size} companies from local cache? Click OK to also delete from Cloud database.`);
                                onDeleteCompanies(Array.from(selectedIds), confirmDelete);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <div className="relative" ref={colMenuRef}>
                       <button onClick={() => setIsColMenuOpen(!isColMenuOpen)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
                          <Settings className="w-4 h-4" /> Columns
                       </button>
                       {isColMenuOpen && (
                         <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2">
                            {initialColumnDefs.filter(c => c.id !== 'actions').map(col => (
                               <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                   <input type="checkbox" checked={visibleColumns.has(col.id)} onChange={() => toggleColumn(col.id)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                                   <span className="text-sm font-medium text-slate-700">{col.header}</span>
                               </label>
                            ))}
                         </div>
                       )}
                    </div>
                    <Tooltip content={selectedIds.size > 0 ? `Export ${selectedIds.size} selected rows` : "Select rows to export"}>
                       <div className="relative group/export">
                         <button disabled={selectedIds.size === 0} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            <Download className="w-4 h-4" /> Export
                         </button>
                         <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 invisible group-hover/export:visible disabled:invisible">
                            <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> CSV</button>
                            <button onClick={() => handleExport('json')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><FileJson className="w-4 h-4 text-amber-500" /> JSON</button>
                         </div>
                       </div>
                    </Tooltip>
                </div>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="p-4 w-12 text-center sticky left-0 bg-slate-50 z-10">
                                <input type="checkbox" checked={isAllSelected} ref={el => { if (el) { el.indeterminate = isSomeSelected; } }} onChange={handleSelectAll} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                            </th>
                            {displayedColumns.map(col => {
                                const isFiltered = ((columnFilters[col.id] as string[]) || []).length > 0;
                                return (
                                <th key={col.id} className={`p-4 transition-colors relative ${col.draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${dragOverColId === col.id ? 'bg-blue-100' : ''}`} draggable={col.draggable} onDragStart={col.draggable ? (e) => handleDragStart(e, col.id) : undefined} onDragOver={col.draggable ? (e) => handleDragOver(e) : undefined} onDrop={col.draggable ? (e) => handleDrop(e, col.id) : undefined} onDragEnter={col.draggable ? (e) => handleDragEnter(e, col.id) : undefined} onDragLeave={col.draggable ? (e) => handleDragLeave(e) : undefined}>
                                    {dragOverColId === col.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                    <div className="flex items-center justify-between gap-2">
                                        <button onClick={() => handleSort(col.id)} className="flex items-center gap-1 group font-bold">
                                            {col.header}
                                            {sort.key === col.id ? (sort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />}
                                        </button>
                                        {col.sortable && (
                                            <div className="relative">
                                                <button onClick={() => handleFilterIconClick(col.id)} className={`p-1 rounded-md ${isFiltered || openFilterMenu === col.id ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}><Filter className="w-3 h-3" /></button>
                                                {openFilterMenu === col.id && (
                                                    <div ref={filterMenuRef} onClick={e => e.stopPropagation()} className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col max-h-96">
                                                        <div className="p-2 border-b border-slate-100">
                                                            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" /><input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder={`Search ${col.header}...`} className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 rounded-md" /></div>
                                                        </div>
                                                        <div className="p-2 flex gap-2 border-b border-slate-100"><button onClick={() => handleSelectAllInTempFilter(col.id)} className="flex-1 text-[10px] text-blue-600 hover:bg-blue-50 py-1 rounded">All</button><button onClick={() => handleClearInTempFilter(col.id)} className="flex-1 text-[10px] text-slate-500 hover:bg-slate-100 py-1 rounded">Clear</button></div>
                                                        
                                                        <div className="p-2 border-b border-slate-100 bg-slate-50">
                                                            <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer p-1">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={showOnlySelectedInFilter} 
                                                                    onChange={e => setShowOnlySelectedInFilter(e.target.checked)} 
                                                                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                                                />
                                                                Show selected only ({ (tempColumnFilters[col.id] || []).length })
                                                            </label>
                                                        </div>

                                                        <div className="flex flex-wrap gap-1 p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold">
                                                          <button onClick={() => setCharacterFilter([])} className={`px-2 py-0.5 rounded ${characterFilter.length === 0 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>All</button>
                                                          {availableChars.map(char => <button key={char} onClick={() => handleCharacterFilterToggle(char)} className={`w-6 h-6 rounded ${characterFilter.includes(char) ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{char}</button>)}
                                                        </div>
                                                        <div className="overflow-y-auto flex-1 p-1">
                                                            {(columnOptions[col.id] || [])
                                                              .filter(opt => {
                                                                  if (showOnlySelectedInFilter) {
                                                                      return (tempColumnFilters[col.id] || []).includes(opt);
                                                                  }
                                                                  return true;
                                                              })
                                                              .filter(opt => characterFilter.length === 0 || (opt?.[0] && characterFilter.includes(opt[0].toUpperCase())))
                                                              .filter(opt => (opt || '').toLowerCase().includes(filterSearch.toLowerCase()))
                                                              .map(option => (
                                                                <label key={option} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer text-slate-700 normal-case font-medium">
                                                                    <input type="checkbox" checked={(tempColumnFilters[col.id] || []).includes(option)} onChange={() => handleToggleTempColumnFilter(col.id, option)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                                                                    <span className="text-xs truncate">{option}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayedData.map(c => (
                            <tr key={c.id} className={`transition-colors ${selectedIds.has(c.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 text-center sticky left-0 z-10" style={{ backgroundColor: selectedIds.has(c.id) ? '#eff6ff' : '#ffffff' }}>
                                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => handleSelectRow(c.id)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                                </td>
                                {displayedColumns.map(col => (<td key={col.id} className="p-4">{col.cell(c)}</td>))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {displayedData.length === 0 && (<div className="text-center py-16 text-slate-400 font-medium">No matching records found.</div>)}
        </div>
    );
};

export default ResultsTable;