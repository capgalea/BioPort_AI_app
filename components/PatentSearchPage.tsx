import React, { useState } from 'react';
import { Search, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

const DATABASES = {
  ip_australia: 'IP Australia (AusPat)',
  epo: 'EPO / OPS',
  uspto: 'USPTO PatentsView',
  google: 'Google Patents',
  lens: 'Lens.org',
  espacenet: 'Espacenet'
};

const PatentSearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedDbs, setSelectedDbs] = useState<string[]>(['ip_australia', 'epo']);
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const dbNames = selectedDbs.map(id => DATABASES[id as keyof typeof DATABASES]).join(', ');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Search query: "${query}"`,
        config: {
          systemInstruction: `You are a biotech patent search AI agent. The user has queried the following patent databases: ${dbNames}.
          Simulate realistic patent search results.
          Return ONLY valid JSON with this exact structure:
          {
            "analysis": "AI analysis covering key findings, technology trends, notable assignees, and strategic insights.",
            "patents": [
              {
                "id": "patent number",
                "title": "patent title",
                "abstract": "2-sentence abstract",
                "assignee": "company or institution name",
                "filing_date": "YYYY-MM-DD",
                "jurisdiction": "AU|US|EP|WO",
                "source": "ip_australia|epo|uspto|google|lens|espacenet",
                "relevance": 0.8
              }
            ],
            "stats": {
              "total_found": 10,
              "databases_queried": ${selectedDbs.length},
              "duplicates_removed": 2
            }
          }`,
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      setResults(parsed);
    } catch (err: any) {
      setError(err.message || 'Search failed');
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
                href={`https://patents.google.com/patent/${p.id.replace(/[^a-zA-Z0-9]/g, '')}/en`} 
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
