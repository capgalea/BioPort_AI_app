import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, Download } from 'lucide-react';
import axios from 'axios';
import posthog from 'posthog-js';
import { Patent } from '../types';
import { patentService } from '../services/patentService';
import { searchPatents, USPTOSearchParams } from '../services/usptoService';
import USPTOPatentDetailModal from './USPTOPatentDetailModal';

interface PatentSearchPageProps {
  onPatentsRetrieved: (patents: Patent[]) => void;
}

const DATABASES = {
  ip_australia: 'IP Australia (AusPat)',
  uspto: 'USPTO',
  epo: 'EPO / OPS',
  google: 'Google Patents',
  lens: 'Lens.org',
  espacenet: 'Espacenet'
};

const PatentSearchPage: React.FC<PatentSearchPageProps> = (props) => {
  const [dataSource, setDataSource] = useState<string>('USPTO');

  // USPTO Parameters
  const [usptoParams, setUsptoParams] = useState<USPTOSearchParams>({
    query: '',
    inventors: [],
    assignees: [],
    countries: [],
    patentType: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: '',
    keywords: [],
    limit: 25,
    offset: 0
  });

  const [usptoResults, setUsptoResults] = useState<Patent[]>([]);
  const [usptoTotal, setUsptoTotal] = useState(0);
  const [usptoLoading, setUsptoLoading] = useState(false);
  const [usptoError, setUsptoError] = useState<string | null>(null);
  const [usptoOffset, setUsptoOffset] = useState(0);
  const [usptoLimit, setUsptoLimit] = useState(25);
  
  const [selectedPatent, setSelectedPatent] = useState<Patent | null>(null);

  // Existing parameters
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(() => {
    const saved = localStorage.getItem('bioport_psp_results');
    return saved ? JSON.parse(saved) : null;
  });

  React.useEffect(() => {
    if (results) {
      localStorage.setItem('bioport_psp_results', JSON.stringify(results));
    } else {
      localStorage.removeItem('bioport_psp_results');
    }
  }, [results]);

  const handleUSPTOSearch = async (params: USPTOSearchParams, newOffset = 0) => {
    setUsptoLoading(true);
    setUsptoError(null);
    setUsptoOffset(newOffset);
    
    // Clean up params before sending
    const searchParams = { ...params, offset: newOffset, limit: usptoLimit };
    if (searchParams.patentType === 'All') delete searchParams.patentType;
    if (searchParams.status === 'All') delete searchParams.status;
    if (!searchParams.query) delete searchParams.query;
    if (!searchParams.dateFrom) delete searchParams.dateFrom;
    if (!searchParams.dateTo) delete searchParams.dateTo;
    if (!searchParams.inventors?.length) delete searchParams.inventors;
    if (!searchParams.assignees?.length) delete searchParams.assignees;
    if (!searchParams.countries?.length) delete searchParams.countries;
    if (!searchParams.keywords?.length) delete searchParams.keywords;

    try {
      const { patents, total } = await searchPatents(searchParams);
      setUsptoResults(patents);
      setUsptoTotal(total);
      props.onPatentsRetrieved(patents); // feeds PatentAnalyticsView
      posthog.capture('uspto_search_performed', {
        query: params.query,
        filters_used: Object.keys(searchParams).filter(k => !!(searchParams as any)[k]),
        result_count: patents.length,
      });
    } catch (err: any) {
      setUsptoError(err.message);
    } finally {
      setUsptoLoading(false);
    }
  };

  const handlePageChange = (newOffset: number) => {
    if (dataSource === 'USPTO') {
      handleUSPTOSearch(usptoParams, newOffset);
    }
    // We don't implement offset change network fetches for other sources right now
    // as it's not supported by their API bridges yet.
  };

  const runSearch = async () => {
    if (dataSource === 'USPTO') {
      handleUSPTOSearch(usptoParams, 0);
      return;
    }

    if (!usptoParams.query && (!usptoParams.assignees || usptoParams.assignees.length === 0) && (!usptoParams.inventors || usptoParams.inventors.length === 0)) return;

    setLoading(true);
    setError(null);
    setResults(null);

    const mappedFilters = {
       applicant: usptoParams.assignees?.[0] || undefined,
       inventor: usptoParams.inventors?.[0] || undefined,
       startDate: usptoParams.dateFrom || undefined,
       endDate: usptoParams.dateTo || undefined,
       countries: usptoParams.countries?.length ? usptoParams.countries : undefined,
       status: usptoParams.status !== 'All' ? usptoParams.status : undefined
    };

    try {
      if (dataSource === 'Google Patents') {
        const patents = await patentService.getPatents(usptoParams.query || '', mappedFilters, usptoLimit, 'bigquery');
        
        setUsptoResults(patents);
        setUsptoTotal(patents.length);
        props.onPatentsRetrieved(patents);

        posthog.capture('patent_search_performed', {
          query_length: (usptoParams.query || '').length,
          result_count: patents.length,
          source: dataSource
        });
      } else if (dataSource === 'IP Australia') {
        const patents = await patentService.getPatents(usptoParams.query || '', mappedFilters, usptoLimit, 'ipAustralia');
        
        setUsptoResults(patents);
        setUsptoTotal(patents.length);
        props.onPatentsRetrieved(patents);

        posthog.capture('patent_search_performed', {
          query_length: (usptoParams.query || '').length,
          result_count: patents.length,
          source: dataSource
        });
      } else if (dataSource === 'BigQuery' || dataSource === 'Lens.org' || dataSource === 'EPO' || dataSource === 'PatentsView') {
        // Fallback or explicit routing to BigQuery internally right now
        const patents = await patentService.getPatents(usptoParams.query || '', mappedFilters, usptoLimit, 'bigquery');
        
        setUsptoResults(patents);
        setUsptoTotal(patents.length);
        props.onPatentsRetrieved(patents);

        posthog.capture('patent_search_performed', {
          query_length: (usptoParams.query || '').length,
          result_count: patents.length,
          source: dataSource
        });
      } else {
        // Mock response for other databases until implemented
        setUsptoResults([]);
        setUsptoTotal(0);
        props.onPatentsRetrieved([]);
        
        posthog.capture('patent_search_performed', {
           query_length: (usptoParams.query || '').length,
           result_count: 0,
           source: dataSource
        });
      }
    } catch (err: any) {
      const backendError = err.response?.data?.error;
      const backendDetails = err.response?.data?.details?.error;
      let displayError = err.message || 'Search failed';
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        displayError = `Authentication error. Please check your config. (${backendDetails || backendError || err.message})`;
      } else if (backendError) {
        displayError = `${backendError} ${backendDetails ? `(${backendDetails})` : ''}`;
      }
      
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (usptoResults.length === 0) return;
    
    posthog.capture('uspto_export_csv', { count: usptoResults.length });
    
    const headers = [
      'Current Assignee', 'Inventors', 'Title', 'Abstract',
      'Status', 'Patent Type', 'Patent Kind', 'Family ID', 'Date Filed',
      'Earliest Priority Date', 'Publication Date', 'Country'
    ];

    const csvRows = usptoResults.map(p => {
      const row = [
        p.owners.join('; '),
        p.inventors.join('; '),
        p.title,
        p.abstract,
        p.status,
        p.patentType ?? '',
        p.patentKind ?? '',
        p.family ?? '',
        p.dateFiled,
        p.earliestPriorityDate,
        p.datePublished,
        p.country ?? ''
      ];
      return row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uspto_patents.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper for comma-separated inputs
  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>, field: 'inventors' | 'assignees' | 'keywords') => {
    const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setUsptoParams({ ...usptoParams, [field]: vals });
  };
  
  const getTagValue = (field: 'inventors' | 'assignees' | 'keywords') => {
    return usptoParams[field]?.join(', ') || '';
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">BioPort AI Patent Search</h1>

      <div className="mb-6 bg-white p-6 inset-shadow-sm border border-slate-200 rounded-2xl">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Data Source</h3>
        <div className="flex flex-wrap gap-2">
          {['IP Australia', 'USPTO', 'EPO', 'PatentsView', 'Google Patents', 'Lens.org'].map((src) => (
            <button
              key={src}
              onClick={() => setDataSource(src)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                dataSource === src 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">{dataSource} Search Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Free-Text Query</label>
            <textarea 
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              value={usptoParams.query || ''}
              onChange={(e) => setUsptoParams({ ...usptoParams, query: e.target.value })}
              placeholder="Supports AND/OR/NOT (e.g. CRISPR AND gene)"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Inventor Name(s)</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm" placeholder="Comma-separated" value={getTagValue('inventors')} onChange={(e) => handleTagInput(e, 'inventors')} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Applicant / Assignee</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm" placeholder="Comma-separated" value={getTagValue('assignees')} onChange={(e) => handleTagInput(e, 'assignees')} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Filing Date From</label>
            <input type="date" className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm cursor-text" value={usptoParams.dateFrom || ''} onChange={(e) => setUsptoParams({ ...usptoParams, dateFrom: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Filing Date To</label>
            <input type="date" className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm cursor-text" value={usptoParams.dateTo || ''} onChange={(e) => setUsptoParams({ ...usptoParams, dateTo: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Patent Type</label>
            <select className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm" value={usptoParams.patentType} onChange={(e) => setUsptoParams({ ...usptoParams, patentType: e.target.value })}>
              <option value="All">All types</option>
              <option value="Utility">Utility</option>
              <option value="Design">Design</option>
              <option value="Plant">Plant</option>
              <option value="Reissue">Reissue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Application Status</label>
            <select className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm" value={usptoParams.status} onChange={(e) => setUsptoParams({ ...usptoParams, status: e.target.value })}>
              <option value="All">All statuses</option>
              <option value="Patented">Patented</option>
              <option value="Pending">Pending</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Published">Published</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Keywords (Title)</label>
            <input type="text" className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm" placeholder="Comma-separated" value={getTagValue('keywords')} onChange={(e) => handleTagInput(e, 'keywords')} />
          </div>
          
          <div>
             <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Countries</label>
             <input type="text" className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm" placeholder="e.g. US, EP" value={usptoParams.countries?.join(', ') || ''} onChange={(e) => setUsptoParams({...usptoParams, countries: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)})} />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Results Per Page</label>
            <input type="number" min={1} max={100} className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm" value={usptoLimit} onChange={(e) => setUsptoLimit(parseInt(e.target.value) || 25)} />
          </div>

        </div>
      </div>

      <button 
        onClick={runSearch}
        disabled={(dataSource === 'USPTO' ? usptoLoading : loading)}
        className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-md hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none flex justify-center items-center gap-2 transition-colors duration-200"
      >
        {(dataSource === 'USPTO' ? usptoLoading : loading) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        {(dataSource === 'USPTO' ? usptoLoading : loading) ? 'Searching...' : 'Search Grants & Applications'}
      </button>

      {(usptoError || error) && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {usptoError || error}
        </div>
      )}

      {/* Results */}
      {usptoResults.length > 0 && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-2xl font-black text-slate-900">Search Results</h2>
             <button 
               onClick={downloadCSV}
               className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2 flex items-center gap-2 text-sm shadow-sm transition-colors"
             >
                <Download className="w-4 h-4" /> Export CSV
             </button>
          </div>
          
          <div className="bg-slate-50 text-slate-600 font-medium p-4 border border-slate-200 rounded-xl mb-6 shadow-sm">
            Showing {usptoOffset + 1}–{Math.min(usptoOffset + usptoLimit, usptoTotal)} of {usptoTotal} results
          </div>

          <div className="space-y-4">
            {usptoResults.map((p) => (
              <div 
                key={p.applicationNumber} 
                onClick={() => setSelectedPatent(p)}
                className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h4 className="font-black text-lg text-slate-900 leading-tight">{p.title}</h4>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap">
                    {p.patentType || 'Unknown'}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  App No: {p.applicationNumber} {p.owners.length > 0 && `• ${p.owners[0]}`}
                </p>
                {p.status && (
                  <div className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-600 mb-4">
                    {p.status}
                  </div>
                )}
                {p.url && (
                    <div className="text-blue-600 font-bold text-sm flex items-center gap-1">
                        View Details →
                    </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <button 
              onClick={() => handlePageChange(Math.max(0, usptoOffset - usptoLimit))}
              disabled={usptoOffset === 0 || loading || usptoLoading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2 disabled:bg-slate-50 disabled:text-slate-300 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-bold text-slate-500">
              Page {Math.floor(usptoOffset / usptoLimit) + 1} of {Math.ceil(usptoTotal / usptoLimit) || 1}
            </span>
            <button 
              onClick={() => handlePageChange(usptoOffset + usptoLimit)}
              disabled={usptoOffset + usptoLimit >= usptoTotal || loading || usptoLoading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2 disabled:bg-slate-50 disabled:text-slate-300 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedPatent && (
        <USPTOPatentDetailModal 
          patent={selectedPatent} 
          onClose={() => setSelectedPatent(null)} 
        />
      )}
    </div>
  );
};

export default PatentSearchPage;
