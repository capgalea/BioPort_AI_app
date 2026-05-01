import React, { useState, useMemo, useEffect } from 'react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import posthog from 'posthog-js';
import { 
  PieChart as RePieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { 
  Search, Download, Filter, ChevronDown, ChevronUp, CheckSquare, Square, 
  Eye, EyeOff, FileText, Loader2, AlertCircle, Info, ExternalLink, PieChart, X, Maximize2, Copy, Database
} from 'lucide-react';
import { Patent } from '../types';
import { patentService, PatentResults } from '../services/patentService';
import { generatePatentComparisonSummary, enrichPatentDetails, runAssigneeAnalysisPipeline } from '../services/geminiService';
import { GripVertical } from 'lucide-react';
import { getCountryName, countryNames } from '../src/constants/countryCodes';
import USPTOPatentDetailModal from './USPTOPatentDetailModal';

const INITIAL_COLUMNS = [
  { id: 'actualApplicationNumber', label: 'Patent Number' },
  { id: 'assignees', label: 'Current Assignee' },
  { id: 'inventors', label: 'Inventors' },
  { id: 'title', label: 'Title' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'status', label: 'Status' },
  { id: 'patentType', label: 'Patent Type' },
  { id: 'patentKind', label: 'Patent Kind' },
  { id: 'familyId', label: 'Family ID' },
  { id: 'dateFiled', label: 'Date Filed' },
  { id: 'earliestPriorityDate', label: 'Earliest Priority Date' },
  { id: 'datePublished', label: 'Publication Date' },
  { id: 'country', label: 'Country' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const PATENT_TYPE_DEFINITIONS: Record<string, string> = {
  'A': 'Patent (Standard/Utility): The most common type. This represents a standard patent application or a granted regular patent.',
  'W': 'PCT (International Application): An international patent application filed under the Patent Cooperation Treaty (managed by WIPO).',
  'P': 'Provisional: A provisional application (most commonly used in the US system to secure an early filing date without formal patent claims).',
  'U': 'Utility Model: Often called a "petty patent" or "innovation patent" (like what Australia used to issue). It is a faster, cheaper patent for minor improvements, common in countries like Germany, China, and Japan.',
  'F': 'Design: An industrial design patent, which protects the visual appearance, shape, or ornamentation of an object rather than how it functions.',
  'T': 'Translation: Typically used when a foreign or international application has been formally translated to enter a specific national phase.'
};

const PATENT_KIND_CATEGORIES: Record<string, string[]> = {
  'Applications': ['A', 'U'],
  'Grants': ['B', 'Y'],
  'Corrections/Translations': ['C', 'T'],
  'Extensions (Biotech)': ['M']
};

const getPatentKindCategory = (kind: string) => {
  const baseKind = kind.charAt(0);
  for (const [category, codes] of Object.entries(PATENT_KIND_CATEGORIES)) {
    if (codes.includes(baseKind)) return category;
  }
  return 'Other';
};

const PATENT_KIND_DEFINITIONS: Record<string, string> = {
  'Applications': 'Applications: Documents made public but not yet granted (A, U).',
  'Grants': 'Grants: Patent office has examined the claims and officially granted the legal monopoly (B, Y).',
  'Corrections/Translations': 'Corrections/Translations: Amended, Corrected, or Re-examined patents (C, T).',
  'Extensions (Biotech)': 'Extensions (Biotech): Biotech extensions (M).'
};

const SortableColumnItem = ({ column, isVisible, onToggle }: { column: any, isVisible: boolean, onToggle: () => void }) => {
  return (
    <div className="flex items-center gap-1 p-1.5 hover:bg-slate-50 rounded bg-white">
      <div className="text-slate-400 hover:text-slate-700">
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

export default function PatentDataView({ initialCompany, patents: passedPatents }: { initialCompany?: string, patents?: Patent[] }) {
  const [patents, setPatents] = useState<Patent[]>(() => {
    if (passedPatents && passedPatents.length > 0) return passedPatents;
    const saved = localStorage.getItem('bioport_patent_analytics_results');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (passedPatents && passedPatents.length > 0) {
      setPatents(passedPatents);
    }
  }, [passedPatents]);
  
  const displayPatents = patents;
  const tableData = displayPatents;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('bioport_patent_search_query') || '');
  const [source, setSource] = useState<'ipAustralia' | 'bigquery' | 'uspto'>(() => {
    const saved = localStorage.getItem('bioport_patent_source');
    return (saved === 'ipAustralia' || saved === 'bigquery' || saved === 'uspto') ? saved : 'bigquery';
  });
  const [inventorName, setInventorName] = useState(() => localStorage.getItem('bioport_patent_inventor_name') || '');
  const [applicant, setApplicant] = useState(() => localStorage.getItem('bioport_patent_applicant') || initialCompany || '');
  const [startYear, setStartYear] = useState(() => Number(localStorage.getItem('bioport_patent_start_year')) || 2010);
  const [endYear, setEndYear] = useState(() => Number(localStorage.getItem('bioport_patent_end_year')) || new Date().getFullYear());
  const [selectedCountries, setSelectedCountries] = useState<string[]>(() => {
    const saved = localStorage.getItem('bioport_patent_selected_countries');
    return saved ? JSON.parse(saved) : ['WO'];
  });
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [patentTypeFilter, setPatentTypeFilter] = useState<string>('All');
  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('bioport_patent_analytics_results', JSON.stringify(patents));
    localStorage.setItem('bioport_patent_search_query', searchQuery);
    localStorage.setItem('bioport_patent_source', source);
    localStorage.setItem('bioport_patent_inventor_name', inventorName);
    localStorage.setItem('bioport_patent_applicant', applicant);
    localStorage.setItem('bioport_patent_start_year', startYear.toString());
    localStorage.setItem('bioport_patent_end_year', endYear.toString());
    localStorage.setItem('bioport_patent_selected_countries', JSON.stringify(selectedCountries));
  }, [patents, searchQuery, source, inventorName, applicant, startYear, endYear, selectedCountries]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [comparisonPopup, setComparisonPopup] = useState<Patent[] | null>(null);
  const [comparisonModalSize, setComparisonModalSize] = useState({ width: 1000, height: 600 });
  const [compVisibleRows, setCompVisibleRows] = useState<string[]>(INITIAL_COLUMNS.map(c => c.id));
  const [compColWidths, setCompColWidths] = useState<Record<string, number>>({ attribute: 200 });
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeOffset, setResizeOffset] = useState({ x: 0, y: 0 });
  const [aiResponsePopup, setAiResponsePopup] = useState<{ summary: string, references: { title: string, url: string }[] } | null>(null);
  const [aiResponsePopupPosition, setAiResponsePopupPosition] = useState({ x: 0, y: 0 });
  const [fullTextPopup, setFullTextPopup] = useState<{ content: string, title: string } | null>(null);
  const [assigneeAnalysisResult, setAssigneeAnalysisResult] = useState<any>(null);
  const [isAssigneeAnalysisLoading, setIsAssigneeAnalysisLoading] = useState(false);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [assigneeModalSize, setAssigneeModalSize] = useState({ width: 900, height: 700 });
  const [preMaximizedAssigneeSize, setPreMaximizedAssigneeSize] = useState({ width: 900, height: 700 });
  const [isAssigneeMaximized, setIsAssigneeMaximized] = useState(false);
  const [isAssigneeResizing, setIsAssigneeResizing] = useState(false);
  const [bqStats, setBqStats] = useState<any>(null);
  const [dataSourceFilter, setDataSourceFilter] = useState<string>('All Sources');
  const [usptoDetailPatent, setUsptoDetailPatent] = useState<Patent | null>(null);

  const toggleAssigneeMaximize = () => {
    if (isAssigneeMaximized) {
      setAssigneeModalSize(preMaximizedAssigneeSize);
      setIsAssigneeMaximized(false);
    } else {
      setPreMaximizedAssigneeSize(assigneeModalSize);
      setAssigneeModalSize({ width: window.innerWidth * 0.95, height: window.innerHeight * 0.95 });
      setIsAssigneeMaximized(true);
    }
  };
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggingModal, setDraggingModal] = useState<'preview' | 'ai' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = parseISO(dateString);
    if (isNaN(date.getTime())) return dateString;
    return format(date, 'yyyy/MM/dd');
  };

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
    const handleColMouseMove = (e: MouseEvent) => {
      if (resizingCol) {
        setCompColWidths(prev => ({
          ...prev,
          [resizingCol]: Math.max(50, e.clientX - resizeOffset.x)
        }));
      }
    };
    const handleColMouseUp = () => {
      setResizingCol(null);
    };

    if (resizingCol) {
      window.addEventListener('mousemove', handleColMouseMove);
      window.addEventListener('mouseup', handleColMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleColMouseMove);
      window.removeEventListener('mouseup', handleColMouseUp);
    };
  }, [resizingCol, resizeOffset]);

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
      } else if (isAssigneeResizing) {
        setAssigneeModalSize({
          width: Math.max(400, e.clientX - resizeOffset.x),
          height: Math.max(300, e.clientY - resizeOffset.y)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggingModal(null);
      setIsResizing(false);
      setIsAssigneeResizing(false);
    };

    if (isDragging || isResizing || isAssigneeResizing) {
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
    setBqStats(null);

    const q = overrides?.searchQuery !== undefined ? overrides.searchQuery : searchQuery;
    const invName = overrides?.inventorName !== undefined ? overrides.inventorName : inventorName;
    const app = overrides?.applicant !== undefined ? overrides.applicant : applicant;
    const sYear = overrides?.startYear !== undefined ? overrides.startYear : startYear;
    const eYear = overrides?.endYear !== undefined ? overrides.endYear : endYear;
    const src = overrides?.source !== undefined ? overrides.source : source;
    const countries = overrides?.countries !== undefined ? overrides.countries : selectedCountries;
    const status = overrides?.status !== undefined ? overrides.status : statusFilter;
    const patentType = overrides?.patentType !== undefined ? overrides.patentType : patentTypeFilter;
    const dryRun = overrides?.dryRun || false;

    if (dryRun) setIsDryRunning(true);

    try {
      posthog.capture('patent_search_performed', {
        query: q,
        source: src,
        inventor: invName,
        applicant: app,
        country_count: countries?.length || 0,
        limit_requested: downloadLimit
      });
      const result = await patentService.getPatentsWithStats(q, {
        inventor: invName || undefined,
        applicant: app || undefined,
        startDate: `${sYear}-01-01`,
        endDate: `${eYear}-12-31`,
        countries: countries.length > 0 ? countries : undefined,
        status: status === 'All' ? undefined : status,
        patentType: patentType === 'All' ? undefined : patentType
      }, downloadLimit === 'ALL' ? 10000 : downloadLimit, src, dryRun);
      
      const patentResults = result as PatentResults;
      if (dryRun) {
        setBqStats(patentResults.statistics);
      } else {
        setPatents(patentResults.results);
        setBqStats(patentResults.statistics);
      }
      setSelectedRows(new Set());
    } catch (err: any) {
      const backendError = err.response?.data?.error;
      const backendDetails = err.response?.data?.details?.error;
      let displayError = err.message || 'Failed to fetch patent data';
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        displayError = `Authentication error with Google Patents (SerpApi). Please ensure you have added a valid SERPAPI_KEY to your environment variables. (${backendDetails || backendError || err.message})`;
      } else if (backendError) {
        displayError = `${backendError} ${backendDetails ? `(${backendDetails})` : ''}`;
      }
      
      setError(displayError);
    } finally {
      setLoading(false);
      setIsDryRunning(false);
    }
  };

  const handlePreviewPatent = async (patent: Patent) => {
    setPreviewPatent(patent);
    setPreviewLoading(true);

    try {
      const familyPromise = patent.family ? fetch('/api/bigquery/family-jurisdictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: patent.family })
      }).then(res => res.json()).catch(e => {
        console.error("Failed to fetch family jurisdictions:", e);
        return null;
      }) : Promise.resolve(null);

      const insightsPromise = enrichPatentDetails(patent).catch(e => {
        console.error("Failed to enrich patent details:", e);
        return {};
      });

      const [familyData, insightsData] = await Promise.all([familyPromise, insightsPromise]);

      setPreviewPatent(prev => prev ? { 
        ...prev, 
        ...(familyData ? { familyJurisdictions: familyData.jurisdictions } : {}),
        ...insightsData
      } : null);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (initialCompany) {
      fetchPatents({ applicant: initialCompany });
    } else if (patents.length === 0) {
      fetchPatents();
    }
  }, [initialCompany]);

  // Drag and drop removed for React 19 compatibility
  const onDragEnd = () => {};

  const generateAssigneeAnalysis = async () => {
    setIsAssigneeAnalysisLoading(true);
    setShowAssigneeModal(true);
    try {
      const topic = searchQuery || applicant || inventorName || "Selected Patents";
      const result = await runAssigneeAnalysisPipeline(processedPatents, topic);
      setAssigneeAnalysisResult(result);
    } catch (e: any) {
      console.error(e);
      setAssigneeAnalysisResult({ summary: "Analysis failed due to error: " + e.message, assignees: [] });
    } finally {
      setIsAssigneeAnalysisLoading(false);
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
    displayPatents.forEach(p => {
      ['dateFiled', 'earliestPriorityDate', 'dateGranted', 'pctDate', 'pct371Date', 'pct102Date', 'publishedFiledDate', 'datePublished'].forEach(colId => {
        const val = (p as any)[colId];
        if (val) {
          years.add(parseISO(val).getFullYear().toString());
        }
      });
    });
    return Array.from(years).sort().reverse();
  }, [displayPatents]);

  const processedPatents = useMemo(() => {
    let result = [...displayPatents];

    if (dataSourceFilter !== 'All Sources') {
      result = result.filter(p => {
        const src = (p.source || '').toLowerCase();
        const f = dataSourceFilter.toLowerCase();
        const c = String(p.country || p.applicationNumber || p.actualApplicationNumber || '').toLowerCase();

        if (f.includes('uspto')) return src.includes('uspto') || c.startsWith('us');
        if (f.includes('epo')) return src.includes('epo') || src.includes('ops') || c.startsWith('ep');
        if (f.includes('auspat') || f.includes('australia')) return src.includes('ip australia') || src.includes('auspat') || c.startsWith('au');
        if (f.includes('lens')) return src.includes('lens');
        return true;
      });
    }

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
        let strVal;
        if (colId === 'patentKind') {
          strVal = getPatentKindCategory(String(val || ''));
        } else {
          strVal = Array.isArray(val) ? val.join(' ') : String(val || '');
        }
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
  }, [displayPatents, filters, firstCharFilters, dateFilters, sortConfig, showOnlySelected, selectedRows, dataSourceFilter]);

  useEffect(() => {
    setDisplayLimit(10);
  }, [processedPatents]);

  const displayedPatents = useMemo(() => {
    return processedPatents.slice(0, displayLimit);
  }, [processedPatents, displayLimit]);

  // Analytics Data
  const statusData = useMemo(() => {
    const counts: Record<string, { count: number, original_status: string }> = {};
    processedPatents.forEach(p => {
      let originalStatus = p.status || 'Unknown';
      let status = originalStatus;
      // Truncate overly long status names for the pie chart
      if (status.length > 35) {
        status = status.substring(0, 35) + '...';
      }
      if (!counts[status]) {
        counts[status] = { count: 0, original_status: originalStatus };
      }
      counts[status].count += 1;
    });
    return Object.entries(counts)
      .map(([name, data]) => ({ name, value: data.count, original_status: data.original_status }))
      .sort((a, b) => b.value - a.value);
  }, [processedPatents]);

  const uniqueColumnValues = useMemo(() => {
    const unique: Record<string, string[]> = {};
    tableColumns.forEach(col => {
      const values = new Set<string>();
      processedPatents.forEach(p => {
        const val = (p as any)[col.id];
        if (col.id === 'patentKind') {
          values.add(getPatentKindCategory(String(val || '')));
        } else if (Array.isArray(val)) {
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
      const date = p.dateFiled || p.earliestPriorityDate || p.datePublished;
      if (date) {
        const year = date.substring(0, 4);
        counts[year] = (counts[year] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [processedPatents]);

  const kpis = {
    total: processedPatents.length,
    granted: processedPatents.filter(p => (p.status || '').toLowerCase().includes('grant')).length,
    uniqueOwners: new Set(processedPatents.flatMap(p => p.owners || p.applicants || (p as any).assignees || [])).size,
    uniqueJurisdictions: new Set(processedPatents.flatMap(p => p.familyJurisdictions || p.inventorsCountry || [(p as any).country, (p as any).jurisdiction]).filter(Boolean)).size
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

      {/* Data Source Toggle */}
      {tableData.length > 0 && (
        <div className="mb-6 flex overflow-x-auto gap-2 bg-slate-100 p-2 rounded-2xl w-fit border border-slate-200">
          {['All Sources', 'USPTO', 'EPO', 'AusPat', 'Lens'].map(src => (
            <button
              key={src}
              onClick={() => setDataSourceFilter(src)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                dataSourceFilter === src 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      )}

      {/* Search & Filter Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Search Query & Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-5 flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Query (Title & Abstract)</label>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., CRISPR AND (Cas9 OR mRNA)"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="lg:col-span-1 min-w-[200px]">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Source</label>
              <select 
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              >
                <option value="ipAustralia">IP Australia</option>
                <option value="uspto">USPTO</option>
                <option value="bigquery">Google Patents</option>
              </select>
            </div>
            <div className="lg:col-span-1 min-w-[150px]">
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
          </div>
          
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inventor Name(s)</label>
            <input 
              type="text" 
              value={inventorName}
              onChange={(e) => setInventorName(e.target.value)}
              placeholder='e.g., "Jennifer Doudna" OR "Feng Zhang"'
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Applicant / Assignee</label>
            <input 
              type="text" 
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              placeholder="e.g., Moderna"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Patent Type</label>
            <select 
              value={patentTypeFilter || 'All'}
              onChange={(e) => setPatentTypeFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Utility">Utility</option>
              <option value="Design">Design</option>
              <option value="Plant">Plant</option>
            </select>
          </div>

          {source !== 'ipAustralia' && (
            <div className="lg:col-span-1 relative" ref={countryDropdownRef}>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Countries</label>
              <div className="relative">
                <button 
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-left flex justify-between items-center"
                >
                  <span className="truncate">
                    {selectedCountries.length > 0 
                      ? selectedCountries.length === 1
                        ? `${selectedCountries[0]} - ${getCountryName(selectedCountries[0])}`
                        : `${selectedCountries.length} Selected (${selectedCountries.join(', ')})`
                      : 'All Countries'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                
                {isCountryDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-100">
                      <input 
                        type="text" 
                        placeholder="Search countries..." 
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="overflow-y-auto p-2 flex-1">
                      {Object.entries(countryNames)
                        .filter(([code, name]) => 
                          name.toLowerCase().includes(countrySearch.toLowerCase()) || 
                          code.toLowerCase().includes(countrySearch.toLowerCase())
                        )
                        .map(([code, name]) => (
                          <label key={code} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer text-sm">
                            <input 
                              type="checkbox" 
                              checked={selectedCountries.includes(code)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCountries(prev => [...prev, code]);
                                } else {
                                  setSelectedCountries(prev => prev.filter(c => c !== code));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-mono text-slate-400 text-xs">{code}</span>
                            <span className="truncate">{name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grant Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Granted">Granted</option>
              <option value="Application">Application</option>
            </select>
          </div>

          <div className="lg:col-span-3 flex gap-4">
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

          <div className="lg:col-span-5 flex items-end gap-2 mt-2">
            <button 
              onClick={() => fetchPatents()}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Search
            </button>
            {source === 'bigquery' && process.env.NODE_ENV !== 'production' && (
              <button 
                onClick={() => fetchPatents({ dryRun: true })}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center gap-2 border border-slate-200"
                disabled={loading}
              >
                {isDryRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Estimate Cost
              </button>
            )}
            <button 
              onClick={() => {
                const currentYear = new Date().getFullYear();
                setSearchQuery('');
                setInventorName('');
                setApplicant('');
                setSelectedCountries([]);
                setStatusFilter('All');
                setStartYear(2010);
                setEndYear(currentYear);
                fetchPatents({
                  searchQuery: '',
                  inventorName: '',
                  applicant: '',
                  countries: [],
                  status: 'All',
                  startYear: 2010,
                  endYear: currentYear
                });
              }}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center gap-2"
            >
              Clear Filters
            </button>
            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all results?')) {
                  setPatents([]);
                  setSelectedRows(new Set());
                }
              }}
              className="px-6 py-2 bg-red-50 text-red-700 rounded-xl font-bold hover:bg-red-100 flex items-center gap-2 border border-red-100"
            >
              <X className="w-4 h-4" /> Delete All Results
            </button>
          </div>
        </div>
      </div>

      {bqStats && (
        <div className={`mb-8 p-4 rounded-2xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 ${bqStats.dryRun ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${bqStats.dryRun ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {bqStats.dryRun ? 'BigQuery Cost Estimate' : 'BigQuery Query Statistics'}
              </h4>
              <div className="flex gap-4 mt-1">
                <p className="text-xs text-slate-500 font-medium">
                  Processed: <span className="font-bold text-slate-900">{(bqStats.totalBytesProcessed / (1024 * 1024)).toFixed(2)} MB</span>
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Est. Cost: <span className="font-bold text-slate-900">${bqStats.estimatedCostUSD}</span>
                </p>
                {bqStats.cacheHit && (
                  <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" /> Cached Result (Free)
                  </p>
                )}
              </div>
            </div>
          </div>
          {bqStats.dryRun && (
            <button 
              onClick={() => fetchPatents()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm"
            >
              Run Query Now
            </button>
          )}
        </div>
      )}

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

      {!loading && !error && displayPatents.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-900">Analysis Results</h3>
            <button 
              onClick={() => {
                // Implement click handler
                generateAssigneeAnalysis();
              }}
              className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2 shadow-sm transition-colors"
            >
               Who's filing in this space?
            </button>
          </div>

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
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Patent Status Distribution</h3>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Click to Filter</span>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          className="cursor-pointer hover:opacity-80 transition-all focus:outline-none"
                          onClick={() => {
                            const originalStatus = (entry as any).original_status || entry.name;
                            setFilters(prev => ({ ...prev, status: [originalStatus] }));
                            setDraftFilters(prev => ({ ...prev, status: [originalStatus] }));
                            setTimeout(() => {
                              document.getElementById('patent-table-section')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Filing Trend by Year</h3>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Click to Filter</span>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={yearData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar 
                      dataKey="count" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]} 
                      className="cursor-pointer hover:opacity-80 transition-all"
                      onClick={(data) => {
                        if (data && data.name) {
                          const year = data.name;
                          setDateFilters(prev => ({
                            ...prev,
                            // Apply to dateFiled as the primary mapping for 'Filing Trend'
                            dateFiled: [year]
                          }));
                          setTimeout(() => {
                            document.getElementById('patent-table-section')?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }
                      }}
                    />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Interactive Table Controls */}
          <div id="patent-table-section" className="scroll-mt-24 bg-white rounded-t-3xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative group">
                <button className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-200">
                  <Eye className="w-4 h-4" /> Columns
                </button>
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 hidden group-hover:block z-20 max-h-64 overflow-y-auto">
                      {tableColumns.map((c) => (
                        <SortableColumnItem 
                          key={c.id} 
                          column={c} 
                          isVisible={visibleColumns.includes(c.id)}
                          onToggle={() => toggleColumn(c.id)}
                        />
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
            <div className="overflow-auto max-h-[800px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 shadow-sm bg-slate-50">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-center w-12 bg-slate-50">
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
                    <th className="p-3 text-center w-12">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">DELETE</span>
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
                          {['dateFiled', 'earliestPriorityDate', 'dateGranted', 'pctDate', 'pct371Date', 'pct102Date', 'publishedFiledDate', 'datePublished'].includes(col.id) ? (
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
                                    {col.id === 'country' ? getCountryName(val) : val}
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
                          onClick={() => handlePreviewPatent(patent)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview Patent"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setPatents(prev => prev.filter(p => p.applicationNumber !== patent.applicationNumber));
                            setSelectedRows(prev => {
                              const next = new Set(prev);
                              next.delete(patent.applicationNumber);
                              return next;
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Result"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                      {tableColumns.filter(c => visibleColumns.includes(c.id)).map(col => {
                        let val = (patent as any)[col.id];
                        if (col.id === 'assignees' && !val) val = patent.owners || patent.applicants;
                        if (col.id === 'country' && !val) val = patent.inventorsCountry?.[0] || patent.familyJurisdictions?.[0] || (patent as any).jurisdiction;
                        if (col.id === 'familyId' && !val) val = patent.family;
                        
                        const isDateCol = ['earliestPriorityDate', 'datePublished', 'dateFiled', 'dateGranted', 'pctDate', 'pct371Date', 'pct102Date', 'publishedFiledDate'].includes(col.id);
                        const displayVal = isDateCol ? formatDate(val) : (Array.isArray(val) ? val.join(', ') : String(val || ''));
                        
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
                            onClick={() => {
                              if (col.id === 'patentType') {
                                const def = PATENT_TYPE_DEFINITIONS[displayVal] || 'No definition available for this patent type.';
                                setFullTextPopup({ content: def, title: `Patent Type: ${displayVal}` });
                              } else if (col.id === 'patentKind') {
                                const category = getPatentKindCategory(displayVal);
                                const def = PATENT_KIND_DEFINITIONS[category] || 'No definition available for this patent kind.';
                                setFullTextPopup({ content: def, title: `Patent Kind: ${displayVal} (${category})` });
                              } else {
                                setFullTextPopup({ content: displayVal, title: col.label });
                              }
                            }}
                          >
                            {col.id === 'actualApplicationNumber' ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{displayVal}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(displayVal); }}
                                  className="text-slate-400 hover:text-blue-600 transition-colors"
                                  title="Copy Patent Number"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {(patent.source || '').toLowerCase().includes('uspto') && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setUsptoDetailPatent(patent); }}
                                    className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full hover:bg-blue-200 transition-colors ml-2"
                                  >
                                    USPTO Record
                                  </button>
                                )}
                              </div>
                            ) : (col.id === 'jurisdiction' || col.id === 'country') ? (
                              getCountryName(displayVal)
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
                      <td colSpan={visibleColumns.length + 3} className="p-8 text-center text-slate-500">
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
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Current Assignee</h4>
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
                      <p className="text-sm font-bold text-slate-700">{formatDate(previewPatent.dateFiled)}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Publication Date</h4>
                      <p className="text-sm font-bold text-slate-700">{formatDate(previewPatent.datePublished)}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority Date</h4>
                      <p className="text-sm font-bold text-slate-700">{formatDate(previewPatent.earliestPriorityDate)}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grant Date</h4>
                      <p className="text-sm font-bold text-slate-700">{formatDate(previewPatent.dateGranted)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Country</h4>
                      <p className="text-sm font-bold text-slate-700">{getCountryName(previewPatent.country || 'N/A')}</p>
                    </div>
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
                      <p className="text-sm font-bold text-slate-700">{formatDate(previewPatent.pctDate)}</p>
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Family Jurisdictions</h4>
                      <p className="text-sm font-bold text-slate-700">
                        {previewPatent.familyJurisdictions && previewPatent.familyJurisdictions.length > 0 
                          ? previewPatent.familyJurisdictions.map(getCountryName).join(', ') 
                          : 'N/A'}
                      </p>
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

                  {/* AI Enhanced Insights Block */}
                  <div className="mt-8 border-t border-slate-100 pt-8 relative min-h-[100px]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">AI Deep Analysis</h3>
                    </div>

                    {previewLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                        <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="mt-3 text-sm font-bold text-slate-500 animate-pulse">Extracting insights from the actual patent...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {previewPatent.technicalFields && previewPatent.technicalFields.length > 0 && (
                          <div>
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Technical Fields</h4>
                            <div className="flex flex-wrap gap-2">
                              {previewPatent.technicalFields.map((field, idx) => (
                                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{field}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {previewPatent.keyClaimsSummary && (
                          <div>
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Key Claims Summary</h4>
                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                              {previewPatent.keyClaimsSummary}
                            </p>
                          </div>
                        )}

                        {previewPatent.noveltyOverPriorArt && (
                          <div>
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Novelty Over Prior Art</h4>
                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                              {previewPatent.noveltyOverPriorArt}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {previewPatent.pctStatusInfo && (
                            <div>
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">PCT Status</h4>
                              <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                {previewPatent.pctStatusInfo}
                              </p>
                            </div>
                          )}

                          {previewPatent.designatedStates && previewPatent.designatedStates.length > 0 && (
                            <div>
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Designated States</h4>
                              <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                {previewPatent.designatedStates.join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <a 
                    href={`https://patents.google.com/?q=${encodeURIComponent(previewPatent.title ? `"${previewPatent.title}"` : previewPatent.applicationNumber)}`}
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
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th 
                          style={{ width: compColWidths['attribute'] || 200 }} 
                          className="p-3 border-b border-slate-200 text-xs font-black text-slate-400 uppercase relative align-top"
                        >
                          Attribute
                          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto font-medium normal-case">
                            {INITIAL_COLUMNS.map(col => (
                              <label key={col.id} className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer hover:bg-slate-50 p-0.5 rounded">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  checked={compVisibleRows.includes(col.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setCompVisibleRows([...compVisibleRows, col.id]);
                                    else setCompVisibleRows(compVisibleRows.filter(id => id !== col.id));
                                  }}
                                />
                                {col.label}
                              </label>
                            ))}
                          </div>
                          <div 
                            onMouseDown={e => { setResizingCol('attribute'); setResizeOffset({ x: e.clientX - (compColWidths['attribute'] || 200), y: 0 }); }} 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 hit-area z-10" 
                          />
                        </th>
                        {comparisonPopup.map(p => (
                          <th 
                            key={p.applicationNumber} 
                            style={{ width: compColWidths[p.applicationNumber] || 250 }} 
                            className="p-3 border-b border-slate-200 text-xs font-black text-slate-900 uppercase relative align-top"
                          >
                            <div className="truncate" title={p.applicationNumber}>{p.applicationNumber}</div>
                            <div 
                              onMouseDown={e => { setResizingCol(p.applicationNumber); setResizeOffset({ x: e.clientX - (compColWidths[p.applicationNumber] || 250), y: 0 }); }} 
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 hit-area z-10" 
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {INITIAL_COLUMNS.filter(c => compVisibleRows.includes(c.id)).map(col => (
                        <tr key={col.id} className="hover:bg-slate-50">
                          <td className="p-3 border-b border-slate-100 text-sm font-bold text-slate-700 align-top">
                            {col.label}
                          </td>
                          {comparisonPopup.map(p => (
                            <td key={p.applicationNumber} className="p-3 border-b border-slate-100 text-sm text-slate-600 align-top break-words">
                              <div className="line-clamp-6" title={String(p[col.id as keyof Patent] || 'N/A')}>
                                {String(p[col.id as keyof Patent] || 'N/A')}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Resize Handle */}
                <div 
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize bg-slate-200 rounded-tl-lg flex items-center justify-center hover:bg-slate-300 transition-colors"
                  onMouseDown={(e) => {
                    setIsResizing(true);
                    setResizeOffset({
                      x: e.clientX - comparisonModalSize.width,
                      y: e.clientY - comparisonModalSize.height
                    });
                  }}
                >
                  <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-500"></div>
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
          {/* Assignee Analysis Modal */}
          {showAssigneeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div 
                className="bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
                style={{
                  width: isAssigneeMaximized ? '95vw' : assigneeModalSize.width,
                  height: isAssigneeMaximized ? '95vh' : assigneeModalSize.height,
                  maxHeight: isAssigneeMaximized ? '95vh' : '90vh'
                }}
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 shrink-0">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">IP Landscape Analysis</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Assignee Filing Activity</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleAssigneeMaximize}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowAssigneeModal(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                  {isAssigneeAnalysisLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-600" />
                      <p className="text-sm font-black uppercase tracking-widest text-purple-600 animate-pulse">Running IP Intelligence Agents...</p>
                      <p className="text-xs font-medium text-slate-500 mt-2">Scoring assignees, evaluating jurisdictions, and synthesizing summary.</p>
                    </div>
                  ) : assigneeAnalysisResult ? (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-black text-slate-900 mb-2">Business Relevance & Synthesis</h3>
                        <p className="text-sm text-slate-700 leading-relaxed">{assigneeAnalysisResult.summary}</p>
                      </div>

                      {assigneeAnalysisResult.assignees && assigneeAnalysisResult.assignees.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                             <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                               <h3 className="text-sm font-black text-slate-900 uppercase">Top Assignees</h3>
                             </div>
                             <div className="overflow-x-auto">
                               <table className="w-full text-left border-collapse min-w-[600px]">
                                 <thead>
                                   <tr>
                                     <th className="p-3 border-b border-slate-200 text-xs font-black text-slate-400 uppercase">Assignee</th>
                                     <th className="p-3 border-b border-slate-200 text-xs font-black text-slate-400 uppercase text-center">Score</th>
                                     <th className="p-3 border-b border-slate-200 text-xs font-black text-slate-400 uppercase text-center">Patents</th>
                                     <th className="p-3 border-b border-slate-200 text-xs font-black text-slate-400 uppercase">Recency</th>
                                     <th className="p-3 border-b border-slate-200 text-xs font-black text-slate-400 uppercase">Jurisdictions</th>
                                   </tr>
                                 </thead>
                                 <tbody>
                                   {assigneeAnalysisResult.assignees.sort((a: any, b: any) => b.score - a.score).map((assignee: any, idx: number) => (
                                     <tr 
                                       key={idx} 
                                       className="hover:bg-slate-100 cursor-pointer transition-colors"
                                       onClick={() => {
                                         // Filter the main patent table by exactly this assignee name
                                         const assigneeFilterKey = 'assignees'; // Key used in the table filtering logic
                                         
                                         // Update draft filters
                                         setDraftFilters(prev => ({ 
                                           ...prev, 
                                           [assigneeFilterKey]: [assignee.name] 
                                         }));
                                         
                                         // Automatically apply the filter so the table updates immediately
                                         setFilters(prev => ({ 
                                           ...prev, 
                                           [assigneeFilterKey]: [assignee.name] 
                                         }));
                                         
                                         // Close the modal
                                         setShowAssigneeModal(false);
                                       }}
                                     >
                                       <td className="p-3 border-b border-slate-100 text-sm font-bold text-slate-700">{assignee.name}</td>
                                       <td className="p-3 border-b border-slate-100 text-sm text-center">
                                         <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-black">{assignee.score}</span>
                                       </td>
                                       <td className="p-3 border-b border-slate-100 text-sm font-semibold text-slate-600 text-center">{assignee.patentCount}</td>
                                       <td className="p-3 border-b border-slate-100 text-xs text-slate-600">{assignee.recentActivity}</td>
                                       <td className="p-3 border-b border-slate-100 text-xs text-slate-600">{assignee.jurisdictionSpread}</td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                          </div>
                          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col items-center justify-center min-h-[300px]">
                             <h3 className="text-sm font-black text-slate-900 uppercase mb-4 w-full text-left">Filing Activity Score</h3>
                             <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                               <ReBarChart data={assigneeAnalysisResult.assignees.sort((a: any, b: any) => b.score - a.score).slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                 <XAxis type="number" hide />
                                 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} width={80} />
                                 <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                 <Bar dataKey="score" fill="#9333ea" radius={[0, 4, 4, 0]} barSize={24} />
                               </ReBarChart>
                             </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                
                {/* Resize Handle */}
                {!isAssigneeMaximized && (
                  <div 
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize bg-slate-200 rounded-tl-lg flex items-center justify-center hover:bg-slate-300 transition-colors z-50"
                    onMouseDown={(e) => {
                      setIsAssigneeResizing(true);
                      setResizeOffset({
                        x: e.clientX - assigneeModalSize.width,
                        y: e.clientY - assigneeModalSize.height
                      });
                    }}
                  >
                    <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-500"></div>
                  </div>
                )}
              </div>
            </div>
          )}

        </>
      )}

      {!loading && !error && displayPatents.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No patent data found.</p>
        </div>
      )}

      {usptoDetailPatent && (
        <USPTOPatentDetailModal 
          patent={usptoDetailPatent} 
          onClose={() => setUsptoDetailPatent(null)} 
        />
      )}
    </div>
  );
}
