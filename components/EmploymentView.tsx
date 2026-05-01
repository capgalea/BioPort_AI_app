
import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, Search, MapPin, Building2, Filter, 
  Sparkles, Loader2, ExternalLink, GraduationCap, 
  Clock, DollarSign, Globe, Info, Bot, CheckCircle2,
  Stethoscope, Microscope, FlaskConical, Calendar,
  ArrowLeft, ChevronRight, FileText, Send, X
} from 'lucide-react';
import { JobOpportunity } from '../types';
import { searchScienceJobs } from '../services/geminiService';
import HelpPopup from './HelpPopup';

const JOB_LEVELS = ["Any Level", "Intern", "Graduate", "PhD", "Post-Doc", "Mid-Level", "Senior", "Director"];
const WORK_TYPES = ["Any Type", "Remote", "Hybrid", "Onsite"];
const CLASSIFICATIONS = ["Any Classification", "Biotech", "Biopharma", "University", "Research Institute", "CRO", "Not-for-profit", "Government"];

const BIOTECH_HUBS = [
  "Boston, MA", "Cambridge, MA", "San Francisco, CA", "South San Francisco, CA", 
  "San Diego, CA", "New York, NY", "Philadelphia, PA", "Raleigh-Durham, NC", 
  "Seattle, WA", "Chicago, IL", "Houston, TX", "Los Angeles, CA",
  "London, UK", "Cambridge, UK", "Oxford, UK", "Basel, Switzerland", 
  "Zurich, Switzerland", "Munich, Germany", "Berlin, Germany", "Paris, France", 
  "Tokyo, Japan", "Osaka, Japan", "Shanghai, China", "Beijing, China", 
  "Singapore", "Sydney, Australia", "Melbourne, Australia", "Toronto, Canada", 
  "Vancouver, Canada", "Stockholm, Sweden", "Copenhagen, Denmark", "Dublin, Ireland"
];

const EmploymentView: React.FC = () => {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null);
  
  // Filters
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('Global');
  const [level, setLevel] = useState('Any Level');
  const [workType, setWorkType] = useState('Any Type');
  const [classification, setClassification] = useState('Any Classification');

  // Suggestions State
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationChange = (val: string) => {
    setLocation(val);
    if (val.trim().length > 1) {
      const filtered = BIOTECH_HUBS.filter(hub => 
        hub.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setLocationSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (hub: string) => {
    setLocation(hub);
    setShowSuggestions(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);
    setSelectedJob(null);
    setShowSuggestions(false);
    
    const results = await searchScienceJobs({
      keywords: keywords || 'Biotechnology',
      location,
      level,
      workType,
      classification
    });
    
    setJobs(results);
    setIsLoading(false);
  };

  const loadSample = () => {
    setKeywords("Clinical Research Associate");
    setLocation("United States");
    setLevel("PhD");
    setWorkType("Hybrid");
  };

  if (selectedJob) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
        <button 
          onClick={() => setSelectedJob(null)}
          className="flex items-center gap-2 text-sm font-black text-slate-500 hover:text-blue-600 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          BACK TO OPPORTUNITIES
        </button>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
           {/* Header Cover */}
           <div className="bg-slate-900 p-10 sm:p-12 text-white relative">
              <div className="relative z-10">
                <div className="flex flex-wrap gap-2 mb-6">
                   <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-400/20">
                      {selectedJob.classification}
                   </span>
                   <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-400/20">
                      {selectedJob.workType}
                   </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">{selectedJob.title}</h1>
                <div className="flex flex-wrap items-center gap-6 text-slate-400 font-bold">
                   <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-400" /> {selectedJob.company}</div>
                   <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-400" /> {selectedJob.location}</div>
                   <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" /> Posted {selectedJob.postedDate}</div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
           </div>

           <div className="p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                 <section>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <FileText className="w-4 h-4" /> Role Description
                    </h3>
                    <div className="text-slate-700 leading-relaxed space-y-4 font-medium">
                       {selectedJob.description.split('\n').map((para, i) => (
                         <p key={i}>{para}</p>
                       ))}
                    </div>
                 </section>

                 <section>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4" /> Key Requirements
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {selectedJob.requirements.map((req, i) => (
                         <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-xs font-bold text-slate-600 leading-snug">{req}</span>
                         </div>
                       ))}
                    </div>
                 </section>

                 {selectedJob.howToApply && (
                   <section className="p-8 bg-blue-50 rounded-3xl border border-blue-100">
                      <h3 className="text-xs font-black text-blue-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Send className="w-4 h-4" /> How to Apply
                      </h3>
                      <p className="text-blue-800 text-sm font-medium leading-relaxed mb-6">
                        {selectedJob.howToApply}
                      </p>
                      <a 
                        href={selectedJob.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                      >
                        Navigate to Careers Portal
                        <ExternalLink className="w-4 h-4" />
                      </a>
                   </section>
                 )}
              </div>

              <div className="space-y-6">
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Opportunity Metadata</h4>
                    <div className="space-y-4">
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase">Estimated Salary</div>
                          <div className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                             <DollarSign className="w-4 h-4 text-emerald-500" />
                             {selectedJob.salaryRange || "N/A"}
                          </div>
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase">Experience Level</div>
                          <div className="text-sm font-bold text-slate-700">{selectedJob.level}</div>
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase">Organization</div>
                          <div className="text-sm font-bold text-slate-700">{selectedJob.company}</div>
                       </div>
                    </div>
                 </div>

                 <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl">
                    <div className="flex items-center gap-2 mb-3 text-indigo-900">
                       <Bot className="w-4 h-4" />
                       <span className="text-xs font-black uppercase tracking-wider">AI Assistant Tip</span>
                    </div>
                    <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                       Tailor your research statement to emphasize your {keywords || 'scientific'} background. The {selectedJob.classification} sector highly values domain-specific publications.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* Hero Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 sm:p-16 text-white mb-12 relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Opportunity Intelligence Node
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tighter leading-tight">
            Science Sector <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Career Discovery.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed font-medium">
            AI-grounded job search across biotech, academia, and pharmaceutical research. 
            Find roles matching your specific scientific expertise.
          </p>
        </div>
        
        {/* Visual Decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/4 translate-x-1/4" />
      </div>

      {/* Filter Sidebar & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6 sticky top-24">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" /> Filters
                </h3>
                <button 
                  onClick={loadSample}
                  className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                >
                  Sample Search
                </button>
             </div>
             
             <form onSubmit={handleSearch} className="space-y-5">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Expertise</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      value={keywords} 
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="e.g. mRNA, Oncology" 
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all" 
                    />
                  </div>
               </div>

               <div className="space-y-1.5" ref={suggestionRef}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      value={location} 
                      onChange={(e) => handleLocationChange(e.target.value)}
                      onFocus={() => location.trim().length > 1 && locationSuggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="City or Region" 
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all" 
                    />
                    
                    {showSuggestions && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                        {locationSuggestions.map((hub, idx) => (
                          <button
                            key={hub}
                            type="button"
                            onClick={() => selectSuggestion(hub)}
                            className={`w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors ${idx !== locationSuggestions.length - 1 ? 'border-b border-slate-50' : ''}`}
                          >
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {hub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Experience Level</label>
                  <select 
                    value={level} 
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {JOB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Type</label>
                  <select 
                    value={workType} 
                    onChange={(e) => setWorkType(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution Type</label>
                  <select 
                    value={classification} 
                    onChange={(e) => setClassification(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>

               <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                 Search Opportunities
               </button>
             </form>
          </div>

          <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl">
             <h4 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
               <Bot className="w-3.5 h-3.5" /> Discovery Method
             </h4>
             <p className="text-[10px] text-blue-700 leading-relaxed">
               BioPort AI uses <strong>Search Grounding</strong> to identify live vacancies directly from institutional careers portals.
             </p>
          </div>
        </div>

        {/* Results Grid */}
        <div className="lg:col-span-3 space-y-6">
          {!hasSearched ? (
            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 py-24 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Briefcase className="w-10 h-10 text-slate-200" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 mb-2">Find Your Next Scientific Milestone</h3>
               <p className="text-slate-500 max-w-md mx-auto font-medium">Use the filters to discover roles in the world's leading biotech labs and pharma hubs.</p>
            </div>
          ) : isLoading ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 py-24 text-center">
               <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-6" />
               <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-widest">Grounded Discovery in Progress</h3>
               <p className="text-slate-500 font-medium">Querying global institutional career nodes...</p>
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
               {jobs.map((job) => (
                 <div key={job.id} className="group bg-white rounded-3xl border border-slate-200 p-8 hover:shadow-2xl hover:border-blue-400 transition-all flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                       <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100">
                            {job.classification}
                          </span>
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                            {job.workType}
                          </span>
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                            {job.level}
                          </span>
                       </div>
                       
                       <h2 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                         {job.title}
                       </h2>
                       
                       <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-500 mb-6">
                          <div className="flex items-center gap-1.5">
                             <Building2 className="w-4 h-4 text-slate-400" />
                             {job.company}
                          </div>
                          <div className="flex items-center gap-1.5">
                             <MapPin className="w-4 h-4 text-slate-400" />
                             {job.location}
                          </div>
                          <div className="flex items-center gap-1.5">
                             <Calendar className="w-4 h-4 text-slate-400" />
                             {job.postedDate}
                          </div>
                       </div>

                       <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3 font-medium">
                         {job.description}
                       </p>

                       <div className="flex flex-wrap gap-2">
                          {job.requirements.slice(0, 4).map((req, i) => (
                            <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-500 border border-slate-100">
                               <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                               {req}
                            </span>
                          ))}
                       </div>
                    </div>

                    <div className="md:w-64 flex flex-col justify-between items-end gap-6 shrink-0 pt-2">
                       <div className="text-right">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Comp</div>
                          <div className="text-xl font-black text-slate-900 flex items-center justify-end gap-1">
                             <DollarSign className="w-5 h-5 text-emerald-500" />
                             {job.salaryRange || "N/A"}
                          </div>
                       </div>
                       
                       <button 
                         onClick={() => setSelectedJob(job)}
                         className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl active:scale-95 group/btn"
                       >
                         View Details
                         <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 py-24 text-center">
               <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <h3 className="text-xl font-black text-slate-900">No vacancies matched your criteria</h3>
               <p className="text-slate-500 mt-2 font-medium">Try broadening your level or location requirements.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmploymentView;
