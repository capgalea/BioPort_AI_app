import React, { useState, useMemo, useEffect } from 'react';
import { 
  PieChart as RePieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { 
  Search, Download, Filter, ChevronDown, ChevronUp, CheckSquare, Square, 
  Eye, EyeOff, FileText, Loader2, AlertCircle, Info, ExternalLink, PieChart, X
} from 'lucide-react';
import { Patent } from '../types';
import { patentService } from '../services/patentService';

const COLUMNS = [
  { id: 'applicationNumber', label: 'Application Number' },
  { id: 'owners', label: 'Owners' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'inventors', label: 'Inventors' },
  { id: 'title', label: 'Title' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'claim', label: 'Claim' },
  { id: 'description', label: 'Description' },
  { id: 'status', label: 'Status' },
  { id: 'family', label: 'Family' },
  { id: 'familyJurisdictions', label: 'Family Jurisdictions' },
  { id: 'dateFiled', label: 'Date Filed' },
  { id: 'datePublished', label: 'Date Published' },
  { id: 'earliestPriorityDate', label: 'Earliest Priority Date' },
  { id: 'dateGranted', label: 'Date Granted' },
  { id: 'citedWork', label: 'Cited Work' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function PatentAnalyticsView() {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('biotech');
  const [inventor, setInventor] = useState('');
  const [applicant, setApplicant] = useState('');
  const [startYear, setStartYear] = useState(2010);
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  // Table State
  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMNS.map(c => c.id));
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [firstCharFilters, setFirstCharFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ rowId: string, colId: string, content: string, x: number, y: number } | null>(null);
  const [displayLimit, setDisplayLimit] = useState(10);

  const fetchPatents = async (overrides?: any) => {
    setLoading(true);
    setError(null);

    const q = overrides?.searchQuery !== undefined ? overrides.searchQuery : searchQuery;
    const inv = overrides?.inventor !== undefined ? overrides.inventor : inventor;
    const app = overrides?.applicant !== undefined ? overrides.applicant : applicant;
    const sYear = overrides?.startYear !== undefined ? overrides.startYear : startYear;
    const eYear = overrides?.endYear !== undefined ? overrides.endYear : endYear;

    try {
      const result = await patentService.getPatents(q, {
        inventor: inv || undefined,
        applicant: app || undefined,
        startDate: `${sYear}-01-01`,
        endDate: `${eYear}-12-31`
      });
      setPatents(result);
      setSelectedRows(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch patent data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatents();
  }, []);

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

  const handleFilterChange = (colId: string, value: string) => {
    setFilters(prev => ({ ...prev, [colId]: value }));
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
      const headers = COLUMNS.filter(c => visibleColumns.includes(c.id)).map(c => c.label);
      const csvRows = dataToExport.map(p => {
        return COLUMNS.filter(c => visibleColumns.includes(c.id)).map(c => {
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

  const processedPatents = useMemo(() => {
    let result = [...patents];

    // Show only selected
    if (showOnlySelected) {
      result = result.filter(p => selectedRows.has(p.applicationNumber));
    }

    // Apply text filters
    Object.entries(filters).forEach(([colId, filterValue]) => {
      if (!filterValue) return;
      const lowerFilter = String(filterValue).toLowerCase();
      result = result.filter(p => {
        const val = (p as any)[colId];
        const strVal = Array.isArray(val) ? val.join(' ') : String(val || '');
        return strVal.toLowerCase().includes(lowerFilter);
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
  }, [patents, filters, firstCharFilters, sortConfig, showOnlySelected, selectedRows]);

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
                setSearchQuery('biotech');
                setInventor('');
                setApplicant('');
                setStartYear(2010);
                setEndYear(currentYear);
                fetchPatents({
                  searchQuery: 'biotech',
                  inventor: '',
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
                  {COLUMNS.map(c => (
                    <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.includes(c.id)}
                        onChange={() => toggleColumn(c.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-slate-700">{c.label}</span>
                    </label>
                  ))}
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
                onClick={() => { setFilters({}); setFirstCharFilters({}); }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Clear Table Filters
              </button>
              
              {selectedRows.size > 0 && (
                <button 
                  onClick={() => setSelectedRows(new Set())}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Deselect All
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
                    {COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
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
                          <div className="flex gap-1">
                            <div className="relative flex items-center w-full">
                              <input 
                                type="text" 
                                placeholder="Filter..." 
                                value={filters[col.id] || ''}
                                onChange={(e) => handleFilterChange(col.id, e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                              />
                              {filters[col.id] && (
                                <button onClick={() => handleFilterChange(col.id, '')} className="absolute right-1 text-slate-400 hover:text-slate-600">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
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
                          </div>
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
                      {COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => {
                        const val = (patent as any)[col.id];
                        const displayVal = Array.isArray(val) ? val.join(', ') : String(val || '');
                        
                        return (
                          <td 
                            key={col.id} 
                            className="p-3 text-sm text-slate-600 max-w-[200px] truncate"
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
                          >
                            {col.id === 'applicationNumber' ? (
                              <a 
                                href={`https://pericles.ipaustralia.gov.au/ols/auspat/applicationDetails.do?applicationNo=${patent.applicationNumber.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                              >
                                {displayVal} <ExternalLink className="w-3 h-3" />
                              </a>
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
                      <td colSpan={visibleColumns.length + 1} className="p-8 text-center text-slate-500">
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
              <div className="font-bold text-slate-400 mb-1">{COLUMNS.find(c => c.id === hoveredCell.colId)?.label}</div>
              <div className="break-words whitespace-pre-wrap">{hoveredCell.content}</div>
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
