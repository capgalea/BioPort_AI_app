import React, { useState } from 'react';
import { Search, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import axios from 'axios';

const DATABASES = {
  ip_australia: 'IP Australia (AusPat)',
  epo: 'EPO / OPS',
  uspto: 'USPTO (via Google Patents)',
  google: 'Google Patents',
  lens: 'Lens.org',
  espacenet: 'Espacenet'
};

const PatentSearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedDbs, setSelectedDbs] = useState<string[]>(['uspto']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleDb = (id: string) => {
    setSelectedDbs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const runSearch = async () => {
    if (!query || selectedDbs.length === 0) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      if (selectedDbs.includes('uspto')) {
        const response = await axios.get('/api/patents/patentsview', {
          params: {
            q: query,
            size: 10
          }
        });
        
        const patents = (response.data.patents || []).map((p: any) => {
          const owners = p.assignees?.map((a: any) => a.assignee_organization).filter(Boolean) || [];
          return {
            id: p.patent_id || "",
            title: p.patent_title || "",
            abstract: p.patent_abstract || "",
            assignee: owners.join(", ") || "Unknown",
            filing_date: p.application?.filing_date || "",
            jurisdiction: "US",
            source: "uspto",
            relevance: 1.0
          };
        });

        setResults({
          analysis: `Found ${response.data.total_hits || patents.length} results from USPTO (via Google Patents).`,
          patents: patents,
          stats: {
            total_found: response.data.total_hits || patents.length,
            databases_queried: 1,
            duplicates_removed: 0
          }
        });
      } else {
        // Mock response for other databases until implemented
        setResults({
          analysis: `Search for other databases is coming soon.`,
          patents: [],
          stats: {
            total_found: 0,
            databases_queried: selectedDbs.length,
            duplicates_removed: 0
          }
        });
      }
    } catch (err: any) {
      const backendError = err.response?.data?.error;
      const backendDetails = err.response?.data?.details?.error;
      let displayError = err.message || 'Search failed';
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        displayError = `Authentication error with Google Patents (SerpApi). Please ensure you have added a valid SERPAPI_KEY to your environment variables. (${backendDetails || backendError || err.message})`;
      } else if (backendError) {
        displayError = `${backendError} ${backendDetails ? `(${backendDetails})` : ''}`;
      }
      
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">BioPort AI Patent Search</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Search Query</label>
        <textarea 
          className="w-full p-3 border rounded-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. CRISPR gene editing..."
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Databases</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DATABASES).map(([id, name]) => (
            <button
              key={id}
              onClick={() => toggleDb(id)}
              className={`p-2 border rounded ${selectedDbs.includes(id) ? 'bg-blue-100 border-blue-500' : ''}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <button 
        onClick={runSearch}
        disabled={loading || !query || selectedDbs.length === 0}
        className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold disabled:bg-gray-400"
      >
        {loading ? 'Searching...' : 'Run Search'}
      </button>

      {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      {results && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Results</h2>
          <div className="bg-gray-50 p-4 rounded mb-6">{results.analysis}</div>
          {results.patents.map((p: any) => (
            <div key={p.id} className="border p-4 mb-4 rounded">
              <h4 className="font-bold">{p.title}</h4>
              <p className="text-sm text-gray-600">{p.id} - {p.assignee}</p>
              <p className="mt-2">{p.abstract}</p>
              <a 
                href={`https://patents.google.com/patent/US${p.id.replace(/[^a-zA-Z0-9]/g, '')}/en`} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-600 hover:underline mt-2 block font-medium"
              >
                View Patent on Google Patents
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatentSearchPage;
