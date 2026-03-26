import React, { useState, useMemo, useEffect } from 'react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { 
  PieChart as RePieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { 
  Search, Download, Filter, ChevronDown, ChevronUp, CheckSquare, Square, 
  Eye, EyeOff, FileText, Loader2, AlertCircle, Info, ExternalLink, PieChart, X, Maximize2, Copy
} from 'lucide-react';
import { Patent } from '../types';
import { patentService } from '../services/patentService';
import { generatePatentComparisonSummary } from '../services/geminiService';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const INITIAL_COLUMNS = [
  { id: 'applicationNumber', label: 'Application Number' },
  { id: 'owners', label: 'Owners' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'inventors', label: 'Inventors' },
  { id: 'title', label: 'Title' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'status', label: 'Status' },
  { id: 'patentType', label: 'Patent Type' },
  { id: 'patentKind', label: 'Patent Kind' },
  { id: 'familyJurisdictions', label: 'Family Jurisdictions' },
  { id: 'inventorsCountry', label: 'Inventor Country' },
  { id: 'inventorsState', label: 'Inventor State' },
  { id: 'dateFiled', label: 'Date Filed' },
  { id: 'earliestPriorityDate', label: 'Earliest Priority Date' },
  { id: 'dateGranted', label: 'Date Granted' },
  { id: 'pctDocNumber', label: 'PCT Doc Number' },
  { id: 'pctKind', label: 'PCT Kind' },
  { id: 'pctDate', label: 'PCT Date' },
  { id: 'pct371Date', label: 'PCT 371 Date' },
  { id: 'pct102Date', label: 'PCT 102 Date' },
  { id: 'publishedFiledDate', label: 'Published Filed Date' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SortableColumnItem = ({ column, isVisible, onToggle }: { column: any, isVisible: boolean, onToggle: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 p-1.5 hover:bg-slate-50 rounded bg-white">
      <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-700">
        <GripVertical className="w-4 h-4" />
      </div>
      <label className="flex items-center gap-2 flex-1 cursor-pointer">
        <input 
          type="checkbox" 
          checked={isVisible}
          onChange={onToggle}
          className="rounded text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs font-medium text-slate-700">{column.label}</span>
      </label>
    </div>
  );
};

export default function PatentAnalyticsView({ initialCompany }: { initialCompany?: string }) {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [inventor, setInventor] = useState('');
  const [inventorFirstName, setInventorFirstName] = useState('');
  const [applicant, setApplicant] = useState(initialCompany || '');
  const [startYear, setStartYear] = useState(2010);
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  // Table State
  const [tableColumns, setTableColumns] = useState(INITIAL_COLUMNS);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(INITIAL_COLUMNS.map(c => c.id));
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [draftFilters, setDraftFilters] = useState<Record<string, string[]>>({});
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  const [dateFilters, setDateFilters] = useState<Record<string, string[]>>({});
  const [firstCharFilters, setFirstCharFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ rowId: string, colId: string, content: string, x: number, y: number } | null>(null);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [downloadLimit, setDownloadLimit] = useState<number | 'ALL'>(25);
  const [previewPatent, setPreviewPatent] = useState<Patent | null>(null);
  const [comparisonPopup, setComparisonPopup] = useState<Patent[] | null>(null);
  const [comparisonModalSize, setComparisonModalSize] = useState({ width: 1000, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeOffset, setResizeOffset] = useState({ x: 0, y: 0 });
  const [aiResponsePopup, setAiResponsePopup] = useState<{ summary: string, references: { title: string, url: string }[] } | null>(null);
  const [aiResponsePopupPosition, setAiResponsePopupPosition] = useState({ x: 0, y: 0 });
  const [fullTextPopup, setFullTextPopup] = useState<{ content: string, title: string } | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggingModal, setDraggingModal] = useState<'preview' | 'ai' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDraggingModal('preview');
    setDragOffset({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
  };

  const handleAiMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDraggingModal('ai');
    setDragOffset({
      x: e.clientX - aiResponsePopupPosition.x,
      y: e.clientY - aiResponsePopupPosition.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        if (draggingModal === 'preview') {
          setModalPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y
          });
        } else if (draggingModal === 'ai') {
          setAiResponsePopupPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y
          });
        }
      } else if (isResizing) {
        setComparisonModalSize({
          width: Math.max(300, e.clientX - resizeOffset.x),
          height: Math.max(200, e.clientY - resizeOffset.y)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggingModal(null);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, draggingModal, dragOffset, isResizing, resizeOffset]);

  const fetchPatents = async (overrides?: any) => {
    setLoading(true);
    setError(null);

    const q = overrides?.searchQuery !== undefined ? overrides.searchQuery : searchQuery;
    const inv = overrides?.inventor !== undefined ? overrides.inventor : inventor;
    const invFirstName = overrides?.inventorFirstName !== undefined ? overrides.inventorFirstName : inventorFirstName;
    const app = overrides?.applicant !== undefined ? overrides.applicant : applicant;
    const sYear = overrides?.startYear !== undefined ? overrides.startYear : startYear;
    const eYear = overrides?.endYear !== undefined ? overrides.endYear : endYear;

    try {
      const result = await patentService.getPatents(q, {
        inventor: inv || undefined,
        inventorFirstName: invFirstName || undefined,
        applicant: app || undefined,
        startDate: `${sYear}-01-01`,
        endDate: `${eYear}-12-31`
      }, downloadLimit === 'ALL' ? 10000 : downloadLimit);
      setPatents(result);
      setSelectedRows(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch patent data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCompany) {
      fetchPatents({ applicant: initialCompany });
    } else {
      fetchPatents();
    }
  }, [initialCompany]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setTableColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFirstCharFilterChange = (colId: string, char: string) => {
    setFirstCharFilters(prev => {
      if (prev[colId] === char) {
        const newFilters = { ...prev };
        delete newFilters[colId];
        return newFilters;
      }
      return { ...prev, [colId]: char };
    });
  };

  const toggleRowSelection = (appNum: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(appNum)) next.delete(appNum);
      else next.add(appNum);
      return next;
    });
  };

  const selectAllRows = () => {
    if (selectedRows.size === processedPatents.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(processedPatents.map(p => p.applicationNumber)));
    }
  };

  const downloadData = (format: 'csv' | 'json') => {
    const dataToExport = showOnlySelected 
      ? patents.filter(p => selectedRows.has(p.applicationNumber))
      : processedPatents;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'patent_analytics.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = tableColumns.filter(c => visibleColumns.includes(c.id)).map(c => c.label);
      const csvRows = dataToExport.map(p => {
        return tableColumns.filter(c => visibleColumns.includes(c.id)).map(c => {
          const val = (p as any)[c.id];
          const strVal = Array.isArray(val) ? val.join('; ') : String(val || '');
          return `"${strVal.replace(/"/g, '""')}"`;
        }).join(',');
      });
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'patent_analytics.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    patents.forEach(p => {
      ['dateFiled', 'earliestPriorityDate', 'dateGranted', 'pctDate', 'pct371Date', 'pct102Date', 'publishedFiledDate'].forEach(colId => {
        const val = (p as any)[colId];
        if (val) {
          years.add(parseISO(val).getFullYear().toString());
        }
      });
    });
    return Array.from(years).sort().reverse();
  }, [patents]);

  const processedPatents = useMemo(() => {
    let result = [...patents];

    // Show only selected
    if (showOnlySelected) {
      result = result.filter(p => selectedRows.has(p.applicationNumber));
    }

    // Apply year filters
    Object.entries(dateFilters).forEach(([colId, selectedYears]) => {
      if (!selectedYears || selectedYears.length === 0) return;
      result = result.filter(p => {
        const val = (p as any)[colId];
        if (!val) return false;
        
        // Try parsing as ISO, then fallback to Date constructor
        let date = parseISO(val);
        if (isNaN(date.getTime())) {
          date = new Date(val);
        }
        
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date format for ${colId}: ${val}`);
          return false;
        }
        const year = date.getFullYear().toString();
        return selectedYears.includes(year);
      });
    });

    // Apply text filters
    Object.entries(filters).forEach(([colId, filterValues]) => {
      if (!filterValues || filterValues.length === 0) return;
      result = result.filter(p => {
        const val = (p as any)[colId];
        const strVal = Array.isArray(val) ? val.join(' ') : String(val || '');
        return filterValues.some(f => strVal.toLowerCase().includes(f.toLowerCase()));
      });
    });

    // Apply first char filters
    Object.entries(firstCharFilters).forEach(([colId, char]) => {
      if (!char) return;
      const lowerChar = String(char).toLowerCase();
      result = result.filter(p => {
        const val = (p as any)[colId];
        const strVal = Array.isArray(val) ? val[0] || '' : String(val || '');
        return strVal.toLowerCase().startsWith(lowerChar);
      });
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = (a as any)[sortConfig.key];
        const bVal = (b as any)[sortConfig.key];
        const aStr = Array.isArray(aVal) ? aVal.join(' ') : String(aVal || '');
        const bStr = Array.isArray(bVal) ? bVal.join(' ') : String(bVal || '');
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [patents, filters, firstCharFilters, dateFilters, sortConfig, showOnlySelected, selectedRows]);

  useEffect(() => {
    setDisplayLimit(10);
  }, [processedPatents]);

  const displayedPatents = useMemo(() => {
    return processedPatents.slice(0, displayLimit);
  }, [processedPatents, displayLimit]);

  // Analytics Data
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    processedPatents.forEach(p => {
      const status = p.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [processedPatents]);

  const uniqueColumnValues = useMemo(() => {
    const unique: Record<string, string[]> = {};
    tableColumns.forEach(col => {
      const values = new Set<string>();
      processedPatents.forEach(p => {
        const val = (p as any)[col.id];
        if (Array.isArray(val)) {
          val.forEach(v => v && values.add(String(v)));
        } else if (val) {
          values.add(String(val));
        }
      });
      unique[col.id] = Array.from(values).sort();
    });
    return unique;
  }, [processedPatents, tableColumns]);

  const yearData = useMemo(() => {
    const counts: Record<string, number> = {};
    processedPatents.forEach(p => {
      if (p.dateFiled) {
        const year = p.dateFiled.substring(0, 4);
        counts[year] = (counts[year] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [processedPatents]);

  const kpis = {
    total: processedPatents.length,
    granted: processedPatents.filter(p => p.status.toLowerCase().includes('grant')).length,
    uniqueOwners: new Set(processedPatents.flatMap(p => p.owners)).size,
    uniqueJurisdictions: new Set(processedPatents.flatMap(p => p.familyJurisdictions)).size
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <PieChart className="w-8 h-8 text-blue-600" /> 
            Patent Analytics Dashboard
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            Analyze patent landscapes, filter records, and export data.
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 bg-emerald-100 text-emerald-800`}>
          <div className={`w-2 h-2 rounded-full bg-emerald-500`} />
          API Connected
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Retrieve Data from USPTO</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Query (Title)</label>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patent titles (e.g., CRISPR, mRNA)..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Download Limit</label>
            <select 
              value={downloadLimit}
              onChange={(e) => setDownloadLimit(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="ALL">ALL</option>
            </select>
          </div>
          
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inventor (First Name)</label>
            <input 
              type="text" 
              value={inventorFirstName}
              onChange={(e) => setInventorFirstName(e.target.value)}
              placeholder="e.g., Jennifer"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inventor (Last Name)</label>
            <input 
              type="text" 
              value={inventor}
              onChange={(e) => setInventor(e.target.value)}
              placeholder="e.g., Doudna"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Applicant / Assignee</label>
            <input 
              type="text" 
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              placeholder="e.g., Moderna"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="lg:col-span-2 flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Year: {startYear}</label>
              <input 
                type="range" 
                min="1990" 
                max={new Date().getFullYear()} 
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Year: {endYear}</label>
              <input 
                type="range" 
                min="1990" 
                max={new Date().getFullYear()} 
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex items-end gap-2 mt-2">
            <button 
              onClick={() => fetchPatents()}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Search
            </button>
            <button 
              onClick={() => {
                const currentYear = new Date().getFullYear();
                setSearchQuery('');
                setInventor('');
                setInventorFirstName('');
                setApplicant('');
                setStartYear(2010);
                setEndYear(currentYear);
                fetchPatents({
                  searchQuery: '',
                  inventor: '',
                  inventorFirstName: '',
                  applicant: '',
                  startYear: 2010,
                  endYear: currentYear
                });
              }}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center gap-2"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
          <p className="text-sm font-black uppercase tracking-widest">Retrieving and Analyzing Data...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-10 bg-red-50 rounded-3xl border border-red-100 mb-8">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-900 mb-1">Analysis Failed</h3>
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && patents.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Patents</p>
              <p className="text-3xl font-black text-slate-900">{kpis.total}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Granted</p>
              <p className="text-3xl font-black text-emerald-600">{kpis.granted}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Unique Owners</p>
              <p className="text-3xl font-black text-blue-600">{kpis.uniqueOwners}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Jurisdictions</p>
              <p className="text-3xl font-black text-indigo-600">{kpis.uniqueJurisdictions}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Patent Status Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Filing Trend by Year</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Interactive Table Controls */}
          <div className="bg-white rounded-t-3xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative group">
                <button className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-200">
                  <Eye className="w-4 h-4" /> Columns
                </button>
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 hidden group-hover:block z-20 max-h-64 overflow-y-auto">
                  <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={tableColumns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      {tableColumns.map((c) => (
                        <SortableColumnItem 
                          key={c.id} 
                          column={c} 
                          isVisible={visibleColumns.includes(c.id)}
                          onToggle={() => toggleColumn(c.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
              
              <button 
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${showOnlySelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {showOnlySelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                Show Selected ({selectedRows.size})
              </button>
              
              <button 
                onClick={() => { setFilters({}); setFirstCharFilters({}); setDateFilters({}); }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Clear Table Filters
              </button>
              
              {selectedRows.size > 0 && (
                <button 
                  onClick={() => {
                    setSelectedRows(new Set());
                    setShowOnlySelected(false);
                  }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Deselect All
                </button>
              )}
              {selectedRows.size > 1 && (
                <button 
                  onClick={() => {
                    const selectedPatents = patents.filter(p => selectedRows.has(p.applicationNumber));
                    setComparisonPopup(selectedPatents);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                >
                  Compare Selected ({selectedRows.size})
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => downloadData('csv')} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-800">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={() => downloadData('json')} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-800">
                <Download className="w-4 h-4" /> JSON
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border-x border-b border-slate-200 rounded-b-3xl shadow-sm overflow-hidden relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-center w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedRows.size === processedPatents.length && processedPatents.length > 0}
                        onChange={selectAllRows}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="p-3 text-center w-12">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">PREVIEW</span>
                    </th>
                    {tableColumns.filter(c => visibleColumns.includes(c.id)).map(col => (
                      <th key={col.id} className="p-3 align-top min-w-[150px]">
                        <div className="flex flex-col gap-2">
                          <div 
                            className="flex items-center justify-between cursor-pointer group"
                            onClick={() => handleSort(col.id)}
                          >
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{col.label}</span>
                            <span className="text-slate-400 group-hover:text-slate-600">
                              {sortConfig?.key === col.id ? (
                                sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                              ) : <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                            </span>
                          </div>
                          {['dateFiled', 'earliestPriorityDate', 'dateGranted', 'pctDate', 'pct371Date', 'pct102Date', 'publishedFiledDate'].includes(col.id) ? (
                            <div className="relative group/date">
                              <button className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 font-mono w-full text-left truncate">
                                {dateFilters[col.id]?.length ? `${dateFilters[col.id].length} Years` : 'Select Years'}
                              </button>
                              <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded shadow-xl p-2 hidden group-hover/date:block z-30 w-48 max-h-64 overflow-y-auto">
                                {availableYears.map(year => (
                                  <label key={year} className="flex items-center gap-2 text-xs p-1 hover:bg-slate-100 cursor-pointer">
                                    <input 
                                      type="checkbox"
                                      checked={dateFilters[col.id]?.includes(year) || false}
                                      onChange={(e) => {
                                        const years = dateFilters[col.id] || [];
                                        setDateFilters(prev => ({
                                          ...prev,
                                          [col.id]: e.target.checked 
                                            ? [...years, year] 
                                            : years.filter(y => y !== year)
                                        }));
                                      }}
                                    />
                                    {year}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                            <div className="relative group/filter w-full">
                              <button 
                                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-50 font-mono w-full text-left truncate"
                                onFocus={() => setDraftFilters(prev => ({...prev, [col.id]: filters[col.id] || []}))}
                              >
                                {filters[col.id]?.length ? `${filters[col.id].length} Selected` : 'Select...'}
                              </button>
                              <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded shadow-xl p-2 hidden group-focus-within/filter:block z-30 w-48 max-h-64 overflow-y-auto">
                                <input 
                                  type="text"
                                  placeholder="Search..."
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2"
                                  value={filterSearch[col.id] || ''}
                                  onChange={(e) => setFilterSearch(prev => ({ ...prev, [col.id]: e.target.value }))}
                                />
                                {uniqueColumnValues[col.id]?.filter(val => val.toLowerCase().includes((filterSearch[col.id] || '').toLowerCase())).map(val => (
                                  <label key={val} className="flex items-center gap-2 text-xs p-1 hover:bg-slate-100 cursor-pointer">
                                    <input 
                                      type="checkbox"
                                      checked={draftFilters[col.id]?.includes(val) || false}
                                      onChange={() => {
                                        const current = draftFilters[col.id] || [];
                                        const updated = current.includes(val) 
                                          ? current.filter(v => v !== val) 
                                          : [...current, val];
                                        setDraftFilters(prev => ({ ...prev, [col.id]: updated }));
                                      }}
                                    />
                                    {val}
                                  </label>
                                ))}
                                <button 
                                  onClick={() => {
                                    setFilters(prev => ({ ...prev, [col.id]: draftFilters[col.id] || [] }));
                                    setFilterSearch(prev => ({ ...prev, [col.id]: '' }));
                                  }}
                                  className="w-full mt-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Apply
                                </button>
                              </div>
                            </div>
                              {col.id !== 'applicationNumber' && (
                                <div className="relative group/char">
                                  <button className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 font-mono">
                                    {firstCharFilters[col.id] || '*'}
                                  </button>
                                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded shadow-xl p-2 hidden group-hover/char:flex flex-wrap gap-1 z-30">
                                    <button 
                                      onClick={() => handleFirstCharFilterChange(col.id, '')}
                                      className="w-full text-[10px] font-bold rounded flex items-center justify-center bg-red-100 text-red-700 hover:bg-red-200 mb-1"
                                    >
                                      Clear
                                    </button>
                                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').map(char => (
                                      <button 
                                        key={char}
                                        onClick={() => handleFirstCharFilterChange(col.id, char)}
                                        className={`w-6 h-6 text-[10px] font-bold rounded flex items-center justify-center ${firstCharFilters[col.id] === char ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                      >
                                        {char}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedPatents.map((patent, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedRows.has(patent.applicationNumber)}
                          onChange={() => toggleRowSelection(patent.applicationNumber)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setPreviewPatent(patent)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview Patent"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                      {tableColumns.filter(c => visibleColumns.includes(c.id)).map(col => {
                        const val = (patent as any)[col.id];
                        const displayVal = Array.isArray(val) ? val.join(', ') : String(val || '');
                        
                        return (
                          <td 
                            key={col.id} 
                            className="p-3 text-sm text-slate-600 max-w-[200px] truncate cursor-pointer hover:bg-slate-100"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredCell({
                                rowId: patent.applicationNumber,
                                colId: col.id,
                                content: displayVal,
                                x: rect.left + window.scrollX,
                                y: rect.bottom + window.scrollY
                              });
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => setFullTextPopup({ content: displayVal, title: col.label })}
                          >
                            {col.id === 'applicationNumber' ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{displayVal}</span>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(displayVal)}
                                  className="text-slate-400 hover:text-blue-600 transition-colors"
                                  title="Copy Application Number"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {processedPatents.length === 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length + 2} className="p-8 text-center text-slate-500">
                        No patents match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {displayLimit < processedPatents.length && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                <button 
                  onClick={() => setDisplayLimit(prev => prev + 10)}
                  className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 shadow-sm transition-colors"
                >
                  Show More ({processedPatents.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </div>

          {/* Hover Popup */}
          {hoveredCell && hoveredCell.content && (
            <div 
              className="fixed z-50 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl max-w-xs pointer-events-none"
              style={{ 
                left: Math.min(hoveredCell.x, window.innerWidth - 320), 
                top: hoveredCell.y + 10 
              }}
            >
              <div className="font-bold text-slate-400 mb-1">{tableColumns.find(c => c.id === hoveredCell.colId)?.label}</div>
              <div className="break-words whitespace-pre-wrap">{hoveredCell.content}</div>
            </div>
          )}

          {/* Preview Modal */}
          {previewPatent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 cursor-move"
                style={{
                  transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`,
                }}
              >
                <div 
                  className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 cursor-move"
                  onMouseDown={handleMouseDown}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                        {previewPatent.status || 'Unknown Status'}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {previewPatent.applicationNumber}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">
                      {previewPatent.title || 'Untitled Patent'}
                    </h2>
                  </div>
                  <button 
                    onClick={() => {
                      setPreviewPatent(null);
                      setModalPosition({ x: 0, y: 0 });
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Assignees / Applicants</h4>
                      <p className="text-sm font-medium text-slate-800">
                        {previewPatent.applicants?.length ? previewPatent.applicants.join(', ') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Inventors</h4>
                      <p className="text-sm font-medium text-slate-800">
                        {previewPatent.inventors?.length ? previewPatent.inventors.join(', ') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filing Date</h4>
                      <p className="text-sm font-bold text-slate-700">{previewPatent.dateFiled || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Publication Date</h4>
                      <p className="text-sm font-bold text-slate-700">{previewPatent.datePublished || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority Date</h4>
                      <p className="text-sm font-bold text-slate-700">{previewPatent.earliestPriorityDate || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grant Date</h4>
                      <p className="text-sm font-bold text-slate-700">{previewPatent.dateGranted || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patent Type</h4>
                      <p className="text-sm font-bold text-slate-700">{previewPatent.patentType || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patent Kind</h4>
                      <p className="text-sm font-bold text-slate-700">{previewPatent.patentKind || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PCT Doc Number</h4>
                      <p className="text-sm font-bold text-slate-700">{previewPatent.pctDocNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PCT Date</h4>
                      <p className="text-sm font-bold text-slate-700">{previewPatent.pctDate || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Abstract</h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {previewPatent.abstract || 'No abstract available.'}
                    </p>
                  </div>
                  
                  {previewPatent.claim && (
                    <div className="mb-8">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Claims</h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {previewPatent.claim}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <a 
                    href={`https://patents.google.com/?q=${encodeURIComponent(`(${previewPatent.title || ''}) AND ${previewPatent.applicationNumber}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 transition-colors"
                  >
                    Google Patent Search <Search className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Full Text Popup Modal */}
          {fullTextPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-lg font-black text-slate-900">{fullTextPopup.title}</h3>
                  <button 
                    onClick={() => setFullTextPopup(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{fullTextPopup.content}</p>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Modal */}
          {comparisonPopup && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            >
              <div 
                className="bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"
                style={{ 
                  width: `${comparisonModalSize.width}px`, 
                  height: `${comparisonModalSize.height}px`,
                  transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`
                }}
              >
                <div 
                  className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 cursor-move"
                  onMouseDown={handleMouseDown}
                >
                  <h3 className="text-lg font-black text-slate-900">Patent Comparison ({comparisonPopup.length})</h3>
                  <button 
                    onClick={() => setComparisonPopup(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 overflow-x-auto flex-1">
                  <div className="mb-6 flex gap-2">
                    <input 
                      type="text" 
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Ask AI about these patents..."
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      onClick={async () => {
                        if (!aiQuery) return;
                        setIsAiLoading(true);
                        try {
                          const result = await generatePatentComparisonSummary(comparisonPopup, aiQuery);
                          setAiResponsePopup(result);
                        } finally {
                          setIsAiLoading(false);
                        }
                      }}
                      disabled={isAiLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:bg-slate-400"
                    >
                      {isAiLoading ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="p-3 border-b border-slate-200 text-xs font-black text-slate-400 uppercase">Attribute</th>
                        {comparisonPopup.map(p => (
                          <th key={p.applicationNumber} className="p-3 border-b border-slate-200 text-xs font-black text-slate-900 uppercase">{p.applicationNumber}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableColumns.map(col => (
                        <tr key={col.id} className="hover:bg-slate-50">
                          <td className="p-3 border-b border-slate-100 text-sm font-bold text-slate-700">{col.label}</td>
                          {comparisonPopup.map(p => (
                            <td key={p.applicationNumber} className="p-3 border-b border-slate-100 text-sm text-slate-600">
                              {String(p[col.id as keyof Patent] || 'N/A')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Resize Handle */}
                <div 
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize bg-slate-200 rounded-tl-lg flex items-center justify-center"
                  onMouseDown={(e) => {
                    setIsResizing(true);
                    setResizeOffset({
                      x: e.clientX - comparisonModalSize.width,
                      y: e.clientY - comparisonModalSize.height
                    });
                  }}
                >
                  <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400"></div>
                </div>
              </div>
            </div>
          )}

          {/* AI Response Popup */}
          {aiResponsePopup && (
            <div 
              className="fixed z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm cursor-move"
              style={{
                transform: `translate(${aiResponsePopupPosition.x}px, ${aiResponsePopupPosition.y}px)`,
                width: '600px',
                height: '400px',
                top: '100px',
                left: '100px'
              }}
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div 
                  className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 cursor-move"
                  onMouseDown={handleAiMouseDown}
                >
                  <h3 className="text-lg font-black text-slate-900">AI Analysis</h3>
                  <button 
                    onClick={() => setAiResponsePopup(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  <p className="text-sm text-slate-700 leading-relaxed mb-4">{aiResponsePopup.summary}</p>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">References</h4>
                  <ul className="space-y-2">
                    {aiResponsePopup.references.map((ref, idx) => (
                      <li key={idx}>
                        <a href={ref.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{ref.title}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && patents.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No patent data found.</p>
        </div>
      )}
    </div>
  );
}
