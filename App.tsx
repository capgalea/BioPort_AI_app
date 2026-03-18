
import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { Download, LayoutGrid, List as ListIcon, AlertCircle, FileSpreadsheet, Trash2, PieChart, Database, ChevronDown, Search, Dna, HelpCircle, RefreshCw, GraduationCap, BookOpen, Microscope, ExternalLink, User as UserIcon, Filter, Bot, Loader2, LogOut, Settings, Cloud, Network, EyeOff, X, AlertTriangle, Calendar, CloudDownload, Info, MousePointerClick, Sparkles, Briefcase, Home, Layers, Lock, UserPlus, Plus, Clock, CloudLightning, Workflow, Cpu, ShieldCheck, Map as MapIcon, LayoutList, PlayCircle, HelpCircle as HelpIcon, History, Pill, Building2, Newspaper, Fingerprint, FileText } from 'lucide-react';
import { CompanyData, AnalysisStatus, isAcademicEntity, ViewMode, PipelineDrug, Publication, ResearcherSummary, getEntityCategory } from './types.ts';
import { analyzeCompanies, discoverCompaniesBySector, discoverWithAgent } from './services/geminiService.ts';
import { cacheService } from './services/cacheService.ts';
import { supabaseService } from './services/supabaseService.ts';
import MultiSelect from './components/MultiSelect.tsx';
import InputSection, { SearchMode } from './components/InputSection.tsx';
import CompanyLogo from './components/CompanyLogo.tsx';
import HomeView from './components/HomeView.tsx';
import Tooltip from './components/Tooltip.tsx';
import LoginView from './components/LoginView.tsx';
import ProspectGenerator from "./components/ProspectGenerator";
import posthog from 'posthog-js';

// Lazy load heavy components to speed up initial boot and prevent workspace timeouts
const DetailModal = lazy(() => import('./components/DetailModal'));
const AboutView = lazy(() => import('./components/AboutView'));
const AboutUsView = lazy(() => import('./components/AboutUsView'));
const OverviewView = lazy(() => import('./components/OverviewView'));
const AgentView = lazy(() => import('./components/AgentView'));
const ResearcherModal = lazy(() => import('./components/ResearcherModal'));
const ProductModal = lazy(() => import('./components/ProductModal'));
const CloudSettingsModal = lazy(() => import('./components/CloudSettingsModal'));
const FeedbackPopup = lazy(() => import('./components/FeedbackPopup'));
const DisclaimerOverlay = lazy(() => import('./components/DisclaimerOverlay'));
const ArchitectureView = lazy(() => import('./components/ArchitectureView'));
const EmploymentView = lazy(() => import('./components/EmploymentView'));
const AnalyticsView = lazy(() => import('./components/AnalyticsView'));
const InstructionModal = lazy(() => import('./components/InstructionModal'));
const SystemInfoView = lazy(() => import('./components/SystemInfoView'));
const SystemTutorialView = lazy(() => import('./components/SystemTutorialView'));
const ChangelogView = lazy(() => import('./components/ChangelogView'));
const PromotionalPamphlet = lazy(() => import('./components/PromotionalPamphlet'));
const CloudImportModal = lazy(() => import('./components/CloudImportModal'));
const DrugSearchView = lazy(() => import('./components/DrugSearchView'));
const ResultsTable = lazy(() => import('./components/ResultsTable'));
const NewsFeed = lazy(() => import('./components/NewsFeed'));
const PatentsView = lazy(() => import('./components/PatentsView'));
const PatentAnalyticsView = lazy(() => import('./components/PatentAnalyticsView'));

const slugify = (text: string): string => {
  return text.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
};

const mergeCompanyData = (existing: CompanyData, newData: CompanyData): CompanyData => {
  const merged = { ...existing };
  merged.description = newData.description || merged.description;
  merged.sector = newData.sector || merged.sector;
  merged.entityType = newData.entityType || merged.entityType;
  merged.customerBase = newData.customerBase || merged.customerBase;
  merged.researchersUrl = newData.researchersUrl || merged.researchersUrl;
  merged.acquisitionStatus = newData.acquisitionStatus || merged.acquisitionStatus;
  merged.acquiredBy = newData.acquiredBy || merged.acquiredBy;
  merged.contact = { ...existing.contact, ...newData.contact };
  merged.lastUpdated = new Date().toISOString();
  const mergeSimpleArray = (arr1: string[] = [], arr2: string[] = []) => Array.from(new Set([...arr1, ...arr2]));
  const mergeObjectArray = <T extends Record<string, any>>(arr1: T[] = [], arr2: T[] = [], key: keyof T): T[] => {
    const map = new Map<any, T>();
    arr1.forEach(item => map.set(item[key], item));
    arr2.forEach(item => map.set(item[key], item));
    return Array.from(map.values());
  };
  merged.keyApprovedDrugs = mergeSimpleArray(existing.keyApprovedDrugs, newData.keyApprovedDrugs);
  merged.pipeline = mergeObjectArray<PipelineDrug>(existing.pipeline, newData.pipeline, 'drugName');
  merged.keyTechnologies = mergeSimpleArray(existing.keyTechnologies, newData.keyTechnologies);
  merged.partnerships = mergeSimpleArray(existing.partnerships, newData.partnerships);
  merged.scientificPublications = mergeObjectArray<Publication>(existing.scientificPublications, newData.scientificPublications, 'title');
  merged.keyResearchers = mergeObjectArray<ResearcherSummary>(existing.keyResearchers || [], newData.keyResearchers || [], 'name');
  return merged;
};

const triggerFallbackDownload = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadCSV = async (data: CompanyData[]) => {
  posthog.capture('export_initiated', { format: 'csv', count: data.length });
  const headers = ["Name", "Type", "Sector", "Acquisition Status", "Acquired By", "Description", "Website", "Global HQ Address", "Australian Address", "Email", "Phone", "Researchers URL", "Key Approved Drugs", "Pipeline Example", "Key Technologies", "Strategic Partnerships", "Key Publications", "Key Researchers"];
  const rows = data.map(c => [
    `"${c.name}"`,
    `"${c.entityType || (isAcademicEntity(c) ? 'Academic' : 'Corporate')}"`,
    `"${c.sector}"`,
    `"${c.acquisitionStatus || 'Independent'}"`,
    `"${c.acquiredBy || 'N/A'}"`,
    `"${c.description.replace(/"/g, '""')}"`,
    c.contact.website,
    `"${c.contact.hqAddress}"`,
    `"${c.contact.auAddress || ''}"`,
    c.contact.email,
    c.contact.phone,
    c.researchersUrl || "",
    `"${c.keyApprovedDrugs.join(', ')}"`,
    `"${c.pipeline.map(p => `${p.drugName} (${p.phase})`).join('; ')}"`,
    `"${(c.keyTechnologies || []).join('; ')}"`,
    `"${(c.partnerships || []).join('; ')}"`,
    `"${(c.scientificPublications || []).map(p => {
      const link = p.url ? ` [Link: ${p.url}]` : '';
      return `${p.title} (${p.source}, ${p.year})${link}`;
    }).join('; ')}"`,
    `"${(c.keyResearchers || []).map(r => `${r.name} (${r.title})`).join('; ')}"`
  ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'bioport_database_export.csv',
        types: [{ description: 'CSV File', accept: { 'text/csv': ['.csv'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(csvContent);
      await writable.close();
      posthog.capture('export_completed', { method: 'file_system_api' });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        triggerFallbackDownload(csvContent, 'bioport_database_export.csv', 'text/csv;charset=utf-8;');
        posthog.capture('export_completed', { method: 'anchor_fallback' });
      }
    }
  } else {
    triggerFallbackDownload(csvContent, 'bioport_database_export.csv', 'text/csv;charset=utf-8;');
    posthog.capture('export_completed', { method: 'standard_download' });
  }
};

const getRegion = (hqAddress?: string) => {
  if (!hqAddress) return 'Unknown';
  const { country, region } = parseAddress(hqAddress);
  return country === 'USA' ? region : country;
};

const getMacroRegion = (country: string): string => {
  if (!country || country === 'Unknown') return 'Unknown';
  
  const c = country.toLowerCase();
  
  const northAmerica = ['usa', 'canada', 'mexico', 'bermuda', 'cayman islands', 'british virgin islands'];
  const europe = ['uk', 'germany', 'france', 'switzerland', 'bulgaria', 'monaco', 'luxembourg', 'andorra', 'ireland', 'spain', 'italy', 'netherlands', 'belgium', 'sweden', 'denmark', 'norway', 'finland', 'austria', 'poland', 'portugal', 'greece', 'czech republic', 'hungary', 'romania', 'russia', 'ukraine', 'belarus', 'serbia', 'croatia', 'slovakia', 'slovenia', 'estonia', 'latvia', 'lithuania', 'cyprus', 'malta', 'iceland', 'liechtenstein', 'san marino', 'vatican city'];
  const asiaPacific = ['australia', 'japan', 'china', 'india', 'south korea', 'singapore', 'new zealand', 'taiwan', 'hong kong', 'malaysia', 'indonesia', 'thailand', 'vietnam', 'philippines', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'myanmar', 'cambodia', 'laos', 'brunei', 'macau', 'mongolia', 'fiji', 'papua new guinea'];
  const middleEast = ['israel', 'uae', 'saudi arabia', 'turkey', 'egypt', 'qatar', 'jordan', 'lebanon', 'oman', 'kuwait', 'bahrain', 'iraq', 'iran', 'syria', 'yemen', 'palestine', 'armenia', 'azerbaijan', 'georgia'];
  const southAmerica = ['brazil', 'argentina', 'chile', 'colombia', 'peru', 'venezuela', 'ecuador', 'bolivia', 'paraguay', 'uruguay', 'guyana', 'suriname', 'french guiana'];
  const africa = ['south africa', 'nigeria', 'kenya', 'morocco', 'algeria', 'tunisia', 'ghana', 'ethiopia', 'tanzania', 'uganda', 'senegal', 'ivory coast', 'cameroon', 'zimbabwe', 'zambia', 'angola', 'mozambique', 'botswana', 'namibia', 'rwanda', 'madagascar', 'mauritius', 'seychelles'];

  if (northAmerica.includes(c)) return 'North America';
  if (europe.includes(c)) return 'Europe';
  if (asiaPacific.includes(c)) return 'Asia-Pacific';
  if (middleEast.includes(c)) return 'Middle East';
  if (southAmerica.includes(c)) return 'South America';
  if (africa.includes(c)) return 'Africa';
  
  return 'Other';
};

const parseAddress = (hqAddress?: string) => {
  if (!hqAddress) return { country: 'Unknown', region: 'Unknown' };
  const parts = hqAddress.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return { country: 'Unknown', region: 'Unknown' };
  
  let country = parts[parts.length - 1];

  // If last part is purely numeric (postal code), take the previous part as country
  if (/^[\d\s\-\/]+$/.test(country) && parts.length > 1) {
    country = parts[parts.length - 2];
  }

  // If last part is a Canadian postal code (e.g., "B3J 3M5"), take the previous part
  if (/^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i.test(country) && parts.length > 1) {
    country = parts[parts.length - 2];
  }

  // If last part is a UK postal code (e.g., "BT41 4FL"), take the previous part
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(country) && parts.length > 1) {
    country = parts[parts.length - 2];
  }

  // Strip leading postal codes/numbers (e.g., "2314 Luxembourg", "251-8555 Japan")
  country = country.replace(/^[\d\s\-\/]+/, '').trim();

  // Strip trailing postal codes/numbers (e.g., "India - 560099", "India 560099")
  country = country.replace(/[\s\-\u2013\u2014]+\d+$/, '').trim();

  // Strip trailing Canadian postal codes (e.g., "Canada L3R 2Z3")
  country = country.replace(/\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i, '').trim();

  // Strip trailing UK postal codes (e.g., "UK SW1A 1AA")
  country = country.replace(/\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, '').trim();

  // Strip parenthetical remarks like "(R&D)"
  country = country.replace(/\s*\(.*?\)\s*/g, '').trim();

  // US state/zip heuristic (e.g., "CA 92130")
  const usStateZipRegex = /^[A-Z]{2}\s\d{5}(-\d{4})?$/;
  const usStates = new Set(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']);
  
  if (usStateZipRegex.test(country) || /^[A-Z]{2}\s\d{5}/.test(country) || usStates.has(country.toUpperCase())) {
    country = 'USA';
  }

  // Normalize common country names
  const lowerCountry = country.toLowerCase();
  if (lowerCountry === 'united states' || lowerCountry === 'united states of america' || lowerCountry === 'us' || lowerCountry === 'usa') {
    country = 'USA';
  } else if (lowerCountry === 'united kingdom' || lowerCountry === 'uk' || lowerCountry === 'great britain' || lowerCountry === 'england') {
    country = 'UK';
  } else if (lowerCountry === 'australia') {
    country = 'Australia';
  } else if (lowerCountry === 'canada') {
    country = 'Canada';
  } else if (lowerCountry === 'germany') {
    country = 'Germany';
  } else if (lowerCountry === 'france') {
    country = 'France';
  } else if (lowerCountry === 'switzerland') {
    country = 'Switzerland';
  } else if (lowerCountry === 'bulgaria') {
    country = 'Bulgaria';
  } else if (lowerCountry === 'british virgin islands' || lowerCountry === 'bvi') {
    country = 'British Virgin Islands';
  } else if (lowerCountry === 'japan') {
    country = 'Japan';
  } else if (lowerCountry === 'israel') {
    country = 'Israel';
  } else if (lowerCountry === 'monaco') {
    country = 'Monaco';
  } else if (lowerCountry === 'luxembourg') {
    country = 'Luxembourg';
  } else if (lowerCountry === 'andorra') {
    country = 'Andorra';
  } else if (lowerCountry === 'india') {
    country = 'India';
  } else if (lowerCountry === 'p.r. china' || lowerCountry === 'prc' || lowerCountry === 'china' || lowerCountry === 'p.r.china') {
    country = 'China';
  } else if (lowerCountry === 'not publicly listed' || lowerCountry === 'not applicable') {
    country = 'Unknown';
  }

  // If it's still just numbers or empty, fallback to 'Unknown'
  if (!country || /^\d+$/.test(country)) {
    country = 'Unknown';
  }

  const region = getMacroRegion(country);

  return { country, region };
};

const sanitizeCompanyData = (data: any): CompanyData => {
  const name = data.name || "Unknown Entity";
  return {
    ...data,
    id: data.id || slugify(name), 
    name: name,
    description: data.description || "",
    sector: data.sector || "Uncategorized",
    entityType: data.entityType || "Corporate",
    keyApprovedDrugs: Array.isArray(data.keyApprovedDrugs) ? data.keyApprovedDrugs : [],
    pipeline: Array.isArray(data.pipeline) ? data.pipeline : [],
    keyTechnologies: Array.isArray(data.keyTechnologies) 
        ? data.keyTechnologies.map((t: any) => typeof t === 'string' ? t : (t?.name || String(t))).filter((t: any) => typeof t === 'string' && t.length > 0)
        : [],
    partnerships: Array.isArray(data.partnerships) ? data.partnerships : [],
    scientificPublications: Array.isArray(data.scientificPublications) ? data.scientificPublications : [],
    keyResearchers: Array.isArray(data.keyResearchers) ? data.keyResearchers : [],
    contact: data.contact || { hqAddress: '', website: '', email: '', phone: '' },
    lastUpdated: data.lastUpdated,
    acquisitionStatus: data.acquisitionStatus || 'Independent',
    acquiredBy: data.acquiredBy || null
  } as CompanyData;
};

// Reduced initial hydration to speed up first paint
const INITIAL_LOAD_COUNT = 12;

const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
};

const ViewLoading = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
    <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
    <p className="text-sm font-black uppercase tracking-widest">Loading Module...</p>
  </div>
);

const KeywordFilter = ({ selected, onChange }: any) => {
  const [input, setInput] = useState('');

  const addKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      if (!selected.includes(input.trim())) {
        onChange([...selected, input.trim()]);
      }
      setInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    onChange(selected.filter((k: string) => k !== kw));
  };

  return (
    <div className="flex flex-wrap gap-2 items-center p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[42px] flex-1">
      <Search className="w-4 h-4 text-slate-400 ml-1" />
      {selected.map((kw: string) => (
        <span key={kw} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
          {kw}
          <button onClick={() => removeKeyword(kw)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input 
        type="text" 
        value={input} 
        onChange={e => setInput(e.target.value)} 
        onKeyDown={addKeyword}
        placeholder={selected.length === 0 ? "Filter by keywords..." : ""}
        className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 flex-1 min-w-[120px]"
      />
    </div>
  );
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allCompanies, setAllCompanies] = useState<CompanyData[]>([]);
  const [totalCacheCount, setTotalCacheCount] = useState(0);
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState<{ current: number, total: number, message: string } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const [selectedResearcher, setSelectedResearcher] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('home');
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudImportOpen, setIsCloudImportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchIdRef = useRef<number>(0);
  const isPreviewMode = useMemo(() => window.self !== window.top, []);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyData | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [registryView, setRegistryView] = useState<'grid' | 'table'>('grid');
  const [lastSynced, setLastSynced] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bioport_last_synced');
    } catch (e) {
      return null;
    }
  });
  const [isReSyncing, setIsReSyncing] = useState(false);

  const isAdmin = useMemo(() => {
    const email = session?.email?.toLowerCase();
    return email === 'charles.galea@bioport.ai' || email === 'galea.charlesa@gmail.com' || email === 'analyst@bioport.ai';
  }, [session]);

  // Auth & Identity Tracking
  useEffect(() => {
    // Initialize PostHog
    const phKey = process.env.POSTHOG_KEY;
    const phHost = process.env.POSTHOG_HOST;
    
    if (!phKey || !phHost) {
      console.warn("PostHog environment variables not set. Skipping initialization.");
      return;
    }

    try {
      posthog.init(phKey, {
        api_host: phHost,
        autocapture: false, // Disable autocapture to prevent noise in dev
        capture_pageview: false, // We handle it manually
        session_recording: {}
      });
    } catch (e) {
      console.warn("PostHog init failed:", e);
    }

    const checkAuth = async () => {
      try {
        const user = await supabaseService.auth.getUser();
        setSession(user);
        if (user) {
          supabaseService.logActivity('SESSION_HEARTBEAT', { email: user.email }, user);
          posthog.identify(user.id, { email: user.email });
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setAuthLoading(false);
      }
    };
    const { data: { subscription } } = supabaseService.auth.onAuthStateChange((authEvent, session) => {
      const user = session?.user ?? null;
      setSession(user);
      if (user) {
        posthog.identify(user.id, { email: user.email, last_event: authEvent });
      } else if (authEvent === 'SIGNED_OUT') {
        posthog.reset();
      }
    });
    checkAuth();
    return () => subscription.unsubscribe();
  }, []);

  // Handle Redirects
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('access_token=') || search.includes('code=')) {
      const hashParams = new URLSearchParams(hash.replace('#', '?'));
      const searchParams = new URLSearchParams(search);
      
      const access_token = hashParams.get('access_token') || searchParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');

      if (window.opener && window.opener !== window) {
        // We are in a popup.
        setTimeout(() => {
          window.opener.postMessage({ 
            type: 'OAUTH_AUTH_SUCCESS', 
            payload: { access_token, refresh_token } 
          }, '*');
          window.close();
        }, 1500);
      } else {
        // We are in the main window (published version)
        if (access_token && refresh_token) {
          supabaseService.auth.setSession(access_token, refresh_token).then(() => {
            supabaseService.auth.getUser().then(user => {
              setSession(user);
              setView('home');
              window.history.replaceState(null, '', window.location.pathname);
            });
          });
        } else {
          setView('home');
          setTimeout(() => window.history.replaceState(null, '', window.location.pathname), 1000);
        }
      }
    }
  }, []);

  // Listen for OAuth success from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { access_token, refresh_token } = event.data.payload || {};
        if (access_token && refresh_token) {
          await supabaseService.auth.setSession(access_token, refresh_token);
        }
        const user = await supabaseService.auth.getUser();
        setSession(user);
        if (user) {
          setView('home');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // View Navigation Tracking
  useEffect(() => {
    if (session) supabaseService.logActivity('VIEW_CHANGE', { view }, session);
    // PostHog Pageview tracking for SPA navigation
    posthog.capture('$pageview', { 
        $current_url: window.location.href, 
        view: view,
        is_authenticated: !!session
    });
  }, [view, session]);

  // Optimized Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      try {
        // Parallelize count check and first page load
        const countPromise = cacheService.getCompanyCount();
        
        const count = await countPromise;
        setTotalCacheCount(count);
        
        if (count > 0) {
          const cached = await cacheService.getPaginatedCompanies(INITIAL_LOAD_COUNT);
          setAllCompanies(cached);
        } else if (supabaseService.isConfigured()) {
          const cloudData = await supabaseService.getAllCompanies(INITIAL_LOAD_COUNT);
          if (cloudData && cloudData.length > 0) {
            const sanitized = cloudData.map(sanitizeCompanyData);
            await cacheService.saveBatchCompanies(sanitized, "Global");
            setAllCompanies(sanitized);
            setTotalCacheCount(sanitized.length);
            const now = new Date().toISOString();
            localStorage.setItem('bioport_last_synced', now);
            setLastSynced(now);
          }
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setIsInitializing(false);
      }
    };
    loadData();
  }, []);

  const filteredCompanies = useMemo(() => {
    // Return early if no filter to save CPU during initial render
    if (!globalFilter && Object.keys(columnFilters).length === 0 && selectedCompanyIds.length === 0 && selectedSectors.length === 0 && selectedCountries.length === 0 && selectedRegions.length === 0 && selectedKeywords.length === 0) {
       return allCompanies.sort((a, b) => a.name.localeCompare(b.name));
    }

    const getCellValue = (c: CompanyData, colId: string): string => {
        switch (colId) {
            case 'name': return c.name;
            case 'entityType': return getEntityCategory(c);
            case 'sector': return c.sector;
            case 'hqAddress': return c.contact.hqAddress || '';
            case 'pipelineCount': return String(c.pipeline?.length || 0);
            case 'approvedCount': return String(c.keyApprovedDrugs?.length || 0);
            case 'lastUpdated': return formatDate(c.lastUpdated);
            case 'acquisition': return c.acquisitionStatus || 'Independent';
            default: return '';
        }
    };
    const lowerGlobalFilter = globalFilter.toLowerCase().trim();
    const activeColumnFilters = Object.entries(columnFilters).filter(([, values]) => Array.isArray(values) && values.length > 0);
    return allCompanies.filter(c => {
      const matchesId = selectedCompanyIds.length === 0 || selectedCompanyIds.includes(c.id);
      if(!matchesId) return false;
      const matchesGlobal = !lowerGlobalFilter || 
        c.name.toLowerCase().includes(lowerGlobalFilter) ||
        c.sector.toLowerCase().includes(lowerGlobalFilter) ||
        c.description.toLowerCase().includes(lowerGlobalFilter) ||
        (c.contact.hqAddress || '').toLowerCase().includes(lowerGlobalFilter) ||
        (c.acquiredBy || '').toLowerCase().includes(lowerGlobalFilter) ||
        (c.acquisitionStatus || '').toLowerCase().includes(lowerGlobalFilter) ||
        getEntityCategory(c).toLowerCase().includes(lowerGlobalFilter);
      if (!matchesGlobal) return false;

      const matchesColumnFilters = activeColumnFilters.every(([colId, selectedValues]) => {
          const cellValue = getCellValue(c, colId);
          return Array.isArray(selectedValues) && selectedValues.includes(cellValue);
      });
      if (!matchesColumnFilters) return false;

      // New multi-select filters
      if (selectedSectors.length > 0 && !selectedSectors.includes(c.sector)) return false;
      
      const { country, region } = parseAddress(c.contact.hqAddress);
      if (selectedCountries.length > 0 && !selectedCountries.includes(country)) return false;
      if (selectedRegions.length > 0 && !selectedRegions.includes(region)) return false;

      if (selectedKeywords.length > 0) {
        const companyText = `${c.name} ${c.description} ${c.sector} ${c.contact.hqAddress} ${c.keyTechnologies.join(' ')}`.toLowerCase();
        const matchesAnyKeyword = selectedKeywords.some(kw => companyText.includes(kw.toLowerCase()));
        if (!matchesAnyKeyword) return false;
      }

      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [allCompanies, globalFilter, columnFilters, selectedCompanyIds, selectedSectors, selectedCountries, selectedRegions, selectedKeywords]);

  const sectorOptions = useMemo(() => {
    const sectors = new Set(allCompanies.map(c => c.sector));
    return Array.from(sectors).sort();
  }, [allCompanies]);

  const countryOptions = useMemo(() => {
    const countries = new Set(allCompanies.map(c => parseAddress(c.contact.hqAddress).country));
    return Array.from(countries).sort();
  }, [allCompanies]);

  const regionOptions = useMemo(() => {
    const regions = new Set(allCompanies.map(c => parseAddress(c.contact.hqAddress).region));
    return Array.from(regions).sort();
  }, [allCompanies]);

  const clearAllFilters = () => {
    setGlobalFilter('');
    setColumnFilters({});
    setSelectedSectors([]);
    setSelectedCountries([]);
    setSelectedRegions([]);
    setSelectedKeywords([]);
    setSelectedCompanyIds([]);
  };

  const hasAnyFilter = globalFilter || Object.keys(columnFilters).length > 0 || selectedSectors.length > 0 || selectedCountries.length > 0 || selectedRegions.length > 0 || selectedKeywords.length > 0 || selectedCompanyIds.length > 0;

  const typeOptions = [{ id: 'Corporate', label: 'Corporate' }, { id: 'University', label: 'University' }, { id: 'Research Institute', label: 'Research Institute' }, { id: 'Government', label: 'Government' }];

  const handleSearch = async (query: string, mode: SearchMode, region: string, filters?: string[], limit?: number) => {
    posthog.capture('search_initiated', { query, mode, region, limit });
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const currentSearchId = ++searchIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus('loading');
    setErrorMsg(null);
    setProgress({ current: 0, total: 100, message: 'Initializing Intelligence Engine...' });
    try {
      let results: CompanyData[] = [];
      if (mode === 'names') {
        const names = query.split(/[\n,]+/).map(name => name.trim()).filter(name => name.length > 0);
        if (names.length === 0) { 
          setStatus('idle'); 
          setProgress(null); 
          return; 
        }
        results = await analyzeCompanies(names, region, (c, t, m) => setProgress({ current: c, total: t, message: m }), controller.signal);
      } else if (mode === 'sector') {
        results = await discoverCompaniesBySector(query, region, filters, limit, (c, t, m) => setProgress({ current: c, total: t, message: m }), controller.signal);
      } else if (mode === 'agent') {
        results = await discoverWithAgent(query, filters || [], region, (c, t, m) => setProgress({ current: c, total: t, message: m }), controller.signal);
      }
      if (searchIdRef.current !== currentSearchId || controller.signal.aborted) return;
      const existingMap = new Map<string, CompanyData>();
      allCompanies.forEach(c => existingMap.set(c.id, c));
      results.forEach(newCompany => {
        if (newCompany.found === false) return;
        const existingCompany = existingMap.get(newCompany.id);
        existingMap.set(newCompany.id, existingCompany ? mergeCompanyData(existingCompany, newCompany) : newCompany);
      });
      setAllCompanies(Array.from(existingMap.values()));
      setSelectedCompanyIds(results.filter(c => c.found !== false).map(c => c.id));
      setGlobalFilter(''); 
      setColumnFilters({}); 
      setVisibleCount(12); 
      setStatus('success'); 
      setView('results');
      posthog.capture('search_success', { mode, results_count: results.length });
    } catch (err: any) {
      if (searchIdRef.current === currentSearchId && err.name !== 'AbortError') {
        setErrorMsg(err.message || "Intelligence retrieval failed."); 
        setStatus('error');
        posthog.capture('search_failed', { error: err.message });
      }
    } finally {
      if (searchIdRef.current === currentSearchId) setProgress(null);
    }
  };

  const handleStopSearch = useCallback(() => {
    posthog.capture('search_aborted');
    searchIdRef.current++;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setStatus('idle'); 
    setProgress(null); 
    setErrorMsg(null);
  }, []);

  const handleRefreshCompany = async (company: CompanyData) => {
    if (refreshingIds.has(company.id)) return;
    setRefreshingIds(prev => {
      const next = new Set(prev);
      next.add(company.id);
      return next;
    });
    posthog.capture('refresh_company', { company_name: company.name });
    try {
      const region = getRegion(company.contact.hqAddress) || "Global";
      const results = await analyzeCompanies([company.name], region, undefined, undefined, undefined, true);
      if (results.length > 0) {
        setAllCompanies(prev => prev.map(c => c.id === company.id ? { ...results[0], id: company.id } : c));
      }
    } catch (err) {
      alert(`Update failed for "${company.name}".`);
    } finally {
      setRefreshingIds(prev => { 
        const next = new Set(prev); 
        next.delete(company.id); 
        return next; 
      });
    }
  };

  const handleClearAllFilters = () => { 
    setGlobalFilter(''); 
    setColumnFilters({}); 
    setSelectedCompanyIds([]); 
  };

  const handleClearLocalHistory = async () => {
    if (confirm("Wipe local cache? (Cloud data stays).")) {
      posthog.capture('clear_local_cache');
      await cacheService.clearAllCompanies();
      setAllCompanies([]); 
      setTotalCacheCount(0); 
      handleClearAllFilters(); 
      setLastSearchQuery(null);
      try {
        localStorage.removeItem('bioport_last_synced');
      } catch (e) {}
      setLastSynced(null);
    }
  };

  const handleCloudImport = async (selectedCompanies: CompanyData[]) => {
    posthog.capture('cloud_import_initiated', { count: selectedCompanies.length });
    if (selectedCompanies.length > 10) setImportCount(selectedCompanies.length);
    try {
      setAllCompanies(prev => {
         const uniqueMap = new Map();
         prev.forEach(c => uniqueMap.set(c.id, c));
         selectedCompanies.forEach(c => uniqueMap.set(c.id, c));
         return Array.from(uniqueMap.values());
      });
      await cacheService.saveBatchCompanies(selectedCompanies, "Global");
      const currentCount = await cacheService.getCompanyCount();
      setTotalCacheCount(currentCount);
      const now = new Date().toISOString();
      try {
        localStorage.setItem('bioport_last_synced', now);
      } catch (e) {}
      setLastSynced(now);
      posthog.capture('cloud_import_success');
    } catch (e) {
      posthog.capture('cloud_import_failed');
    } finally { setImportCount(null); }
  };

  const handleReSync = async () => {
    if (!supabaseService.isConfigured()) {
      alert("Cloud database is not configured.");
      return;
    }
    setIsReSyncing(true);
    posthog.capture('resync_initiated');
    try {
      const totalCount = await supabaseService.getRecordCount();
      const cloudData = await supabaseService.getAllCompanies(totalCount || 10000);
      if (cloudData && cloudData.length > 0) {
        const sanitized = cloudData.map(sanitizeCompanyData);
        await cacheService.saveBatchCompanies(sanitized, "Global");
        setAllCompanies(sanitized);
        setTotalCacheCount(sanitized.length);
        const now = new Date().toISOString();
        try {
          localStorage.setItem('bioport_last_synced', now);
        } catch (e) {}
        setLastSynced(now);
        posthog.capture('resync_success');
      }
    } catch (err) {
      console.error("Re-sync failed", err);
      alert("Re-sync failed.");
      posthog.capture('resync_failed');
    } finally {
      setIsReSyncing(false);
    }
  };

  const executePermanentDelete = async (company: CompanyData) => {
    posthog.capture('delete_company', { company_name: company.name });
    try {
      if (supabaseService.isConfigured()) {
        await supabaseService.deleteCompanyById(company.id);
      }
      await cacheService.deleteCompanyById(company.id);
      setAllCompanies(prev => prev.filter(c => c.id !== company.id));
      setTotalCacheCount(prev => Math.max(0, prev - 1));
    } finally { setCompanyToDelete(null); }
  };

  const loadMore = async () => {
    const newVisibleCount = visibleCount + 12;
    if (!isLazyLoading && allCompanies.length < newVisibleCount && allCompanies.length < totalCacheCount) {
      setIsLazyLoading(true);
      try {
        const newItems = await cacheService.getPaginatedCompanies(12, allCompanies.length);
        if (newItems.length > 0) {
          setAllCompanies(prev => [...prev, ...newItems.filter(n => !prev.some(p => p.id === n.id))]);
        }
      } finally { setIsLazyLoading(false); }
    }
    setVisibleCount(newVisibleCount);
  };

  const handleSignOut = async () => { 
    posthog.capture('sign_out');
    await supabaseService.auth.signOut(); 
    setSession(null); 
    setView('home'); 
  };

  const navigateTo = (v: ViewMode, mode: 'login' | 'register' = 'login') => {
    if (!['home', 'login', 'overview', 'systemInfo', 'howToNavigate', 'changelog', 'pamphlet', 'intelligence'].includes(v) && !session) {
      setLoginMode(mode); 
      setView('login');
    } else {
      if (v === 'login') {
        setLoginMode(mode);
      }
      setView(v);
    }
  };

  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20 animate-bounce">
            <Dna className="w-8 h-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-black text-slate-900 uppercase tracking-widest">BioPort AI Node</span>
            <span className="text-xs font-medium text-slate-400">Initializing Intelligence Engine...</span>
          </div>
        </div>
      </div>
    );
  }

  const pageHelp = (() => {
    if (view === 'discovery') return { title: "Discovery", instructions: [{ step: "Analysis", description: "Deep profiles." }, { step: "Sector", description: "Market data." }, { step: "Agent", description: "AI queries." }] };
    if (view === 'results') return { title: "Registry", instructions: [{ step: "Filter", description: "Live data." }, { step: "Cloud", description: "Sync nodes." }] };
    return null;
  })();

  return (
    <div className="min-h-screen pb-20 bg-slate-50/50 flex flex-col">
      <Suspense fallback={null}>
        {session && <DisclaimerOverlay onAccept={() => {
            posthog.capture('disclaimer_accepted');
        }} />}
      </Suspense>

      {importCount !== null && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
           <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-3xl shadow-2xl">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <div className="text-center">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Integrating {importCount} Records</h3>
              </div>
           </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigateTo('home')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm"><Dna className="w-5 h-5" /></div>
            <span className="text-xl font-bold text-slate-900 tracking-tight hidden sm:inline">BioPort AI</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 sm:gap-2">
               <button onClick={() => navigateTo('home')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'home' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><Home className="w-4 h-4" /> <span className="hidden lg:inline">Home</span></button>
               
               <div className="relative group/sys">
                  <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${['about', 'aboutUs', 'overview', 'howToNavigate', 'changelog', 'pamphlet', 'systemInfo'].includes(view) ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><HelpIcon className="w-4 h-4" /> <span className="hidden lg:inline">About</span> <ChevronDown className="w-3 h-3 opacity-50" /></button>
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 invisible group-hover/sys:visible opacity-0 group-hover/sys:opacity-100 transition-all z-50">
                    <button onClick={() => navigateTo('aboutUs')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><UserIcon className="w-4 h-4" /> About Us</button>
                    <button onClick={() => navigateTo('about')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><Sparkles className="w-4 h-4" /> Project Vision</button>
                    <button onClick={() => navigateTo('overview')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><Info className="w-4 h-4" /> Overview</button>
                    <button onClick={() => navigateTo('howToNavigate')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><PlayCircle className="w-4 h-4" /> System Tutorial</button>
                    <button onClick={() => navigateTo('changelog')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><History className="w-4 h-4" /> Changelog</button>
                    <button onClick={() => navigateTo('systemInfo')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><Fingerprint className="w-4 h-4" /> Specifications</button>
                    <button onClick={() => navigateTo('pamphlet')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><FileText className="w-4 h-4" /> System Pamphlet</button>
                    {(isAdmin || isPreviewMode) && (
                      <button onClick={() => navigateTo('architecture')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 border-t border-slate-100 mt-1 pt-2"><Workflow className="w-4 h-4" /> Architecture</button>
                    )}
                    <div className="px-4 pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Build v2.5</span>
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                  </div>
               </div>

               {session && (
                 <>
                   <div className="relative group/nav">
                     <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${['discovery', 'results', 'analytics', 'drugSearch', 'intelligence', 'patents', 'patentAnalytics'].includes(view) ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><Layers className="w-4 h-4" /> <span className="hidden lg:inline">Discovery</span> <ChevronDown className="w-3 h-3 opacity-50" /></button>
                     <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 invisible group-hover/nav:visible opacity-0 group-hover/nav:opacity-100 transition-all z-50">
                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Companies & Institutions</div>
                           <button onClick={() => navigateTo('discovery')} className="w-full text-left text-sm font-black text-slate-900 flex items-center gap-3 hover:text-blue-600 transition-colors"><Search className="w-4 h-4" /> Search</button>
                           <div className="mt-2 ml-7 flex flex-col gap-1">
                              <button onClick={() => navigateTo('results')} className="w-full text-left text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2"><Database className="w-3 h-3" /> Results</button>
                              <button onClick={() => navigateTo('analytics')} className="w-full text-left text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2"><PieChart className="w-3 h-3" /> Analytics</button>
                              <button onClick={() => navigateTo('intelligence')} className="w-full text-left text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2"><Newspaper className="w-3 h-3" /> Company Intel Agent</button>
                           </div>
                        </div>
                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Drugs</div>
                           <button onClick={() => navigateTo('drugSearch')} className="w-full text-left text-sm font-black text-slate-900 flex items-center gap-3 hover:text-blue-600 transition-colors"><Pill className="w-4 h-4" /> Search</button>
                        </div>
                        <div className="px-4 py-2">
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Patents</div>
                           <button onClick={() => navigateTo('patents')} className="w-full text-left text-sm font-black text-slate-900 flex items-center gap-3 hover:text-blue-600 transition-colors"><FileText className="w-4 h-4" /> Search</button>
                           <div className="mt-2 ml-7 flex flex-col gap-1">
                              <button onClick={() => navigateTo('patentAnalytics')} className="w-full text-left text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2"><PieChart className="w-3 h-3" /> Analytics</button>
                           </div>
                           <button onClick={() => navigateTo('prospectGenerator')} className="w-full text-left text-sm font-black text-slate-900 flex items-center gap-3 hover:text-blue-600 transition-colors mt-4"><UserPlus className="w-4 h-4" /> Prospect Generator</button>
                        </div>
                     </div>
                   </div>
                   
                   <div className="relative group/biotech">
                     <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all text-slate-500 hover:bg-slate-50`}>
                       <Microscope className="w-4 h-4" /> <span className="hidden lg:inline">Biotech Search</span> <ChevronDown className="w-3 h-3 opacity-50" />
                     </button>
                     <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 invisible group-hover/biotech:visible opacity-0 group-hover/biotech:opacity-100 transition-all z-50">
                       <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><BookOpen className="w-4 h-4" /> PubMed</a>
                       <a href="https://clinicaltrials.gov/" target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><Calendar className="w-4 h-4" /> ClinicalTrials.gov</a>
                       <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><Dna className="w-4 h-4" /> PubChem</a>
                       <a href="https://openalex.org/" target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"><Search className="w-4 h-4" /> OpenAlex</a>
                     </div>
                   </div>
                   <button onClick={() => navigateTo('agent')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'agent' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Bot className="w-4 h-4" /> <span className="hidden lg:inline">AI Agent</span></button>
                 </>
               )}
            </nav>
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-200">
              {session ? (
                <>
                  <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full text-slate-400 hover:bg-slate-50"><Settings className="w-5 h-5" /></button>
                  <button onClick={handleSignOut} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><LogOut className="w-5 h-5" /></button>
                </>
              ) : (
                 <button onClick={() => navigateTo('login', 'login')} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md">Login</button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <Suspense fallback={<ViewLoading />}>
          {view === 'prospectGenerator' && <ProspectGenerator />}
          {view === 'home' && <HomeView session={session} isGuest={false} onLoginSuccess={() => {}} onGuestAccess={() => {}} onNavigate={(v) => navigateTo(v === 'search' ? 'discovery' : v as any)} />}
          {view === 'about' && <AboutView />}
          {view === 'aboutUs' && <AboutUsView />}
          {view === 'login' && <div className="max-w-md mx-auto pt-12"><LoginView initialMode={loginMode} onLoginSuccess={() => setView('home')} onGuestAccess={() => {}} onBack={() => setView('home')} /></div>}
          {view === 'overview' && <OverviewView onNavigateToSystemInfo={() => setView('systemInfo')} />}
          {view === 'discovery' && (
            <div className="max-w-3xl mx-auto">
               <div className="text-center mb-8"><h1 className="text-3xl font-bold text-slate-900">Intelligence Engine</h1></div>
               <InputSection onSearch={handleSearch} onStop={handleStopSearch} isLoading={status === 'loading'} onOpenSettings={() => setIsSettingsOpen(true)} />
               {status === 'loading' && progress && (
                 <div className="mt-6 bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-black text-slate-900 uppercase">{progress.message}</span>
                      <span className="text-sm font-bold text-blue-600">{Math.round((progress.current / progress.total) * 100)}%</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                     <div className="bg-blue-600 h-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                   </div>
                 </div>
               )}
            </div>
          )}
              {view === 'results' && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3"><Database className="w-7 h-7 text-blue-600" /> Registry ({filteredCompanies.length})</h2>
                  {lastSynced && (
                    <span className="text-xs text-slate-500 font-medium mt-1">
                      Last synced: {new Date(lastSynced).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={handleReSync} disabled={isReSyncing} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${isReSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isReSyncing ? 'Syncing...' : 'Re-sync'}</span>
                  </button>
                  <button onClick={() => setRegistryView(registryView === 'grid' ? 'table' : 'grid')} className="p-2 bg-white border rounded-lg text-slate-600 hover:bg-slate-50 transition-colors" title={registryView === 'grid' ? "Switch to Table View" : "Switch to Grid View"}>
                    {registryView === 'grid' ? <LayoutList className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setIsCloudImportOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">Cloud Import</button>
                  <button onClick={() => downloadCSV(filteredCompanies)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors"><FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Export</span></button>
                </div>
              </div>

              {/* Enhanced Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-sm flex flex-col lg:flex-row gap-4 items-start lg:items-center animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-wrap gap-2 items-center flex-1 w-full">
                  <MultiSelect 
                    label="Sector" 
                    options={sectorOptions.map(s => ({ id: s, label: s }))} 
                    selectedIds={selectedSectors} 
                    onChange={setSelectedSectors} 
                  />
                  <MultiSelect 
                    label="Country" 
                    options={countryOptions.map(c => ({ id: c, label: c }))} 
                    selectedIds={selectedCountries} 
                    onChange={setSelectedCountries} 
                  />
                  <MultiSelect 
                    label="Region" 
                    options={regionOptions.map(r => ({ id: r, label: r }))} 
                    selectedIds={selectedRegions} 
                    onChange={setSelectedRegions} 
                  />
                  <KeywordFilter 
                    selected={selectedKeywords} 
                    onChange={setSelectedKeywords} 
                  />
                </div>
                
                {hasAnyFilter && (
                  <button 
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>

              {registryView === 'grid' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredCompanies.slice(0, visibleCount).map(c => {
                    const isAcquired = c.acquisitionStatus === 'Acquired' || c.acquisitionStatus === 'Acquisition Pending';
                    return (
                      <div key={c.id} onClick={() => {
                          setSelectedCompany(c);
                          posthog.capture('view_company_detail', { company_name: c.name });
                      }} className="bg-white rounded-3xl border border-slate-200 p-4 hover:shadow-xl cursor-pointer relative overflow-hidden group flex flex-col justify-between h-full">
                        <div className="relative">
                          {isAcquired && (
                            <div className={`absolute -top-1 -right-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest z-10 shadow-md flex items-center gap-1.5 border ${c.acquisitionStatus === 'Acquired' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-blue-100 text-blue-700 border-blue-300'}`}>
                               <Lock className="w-2.5 h-2.5" />
                               {c.acquisitionStatus === 'Acquired' ? 'Acquired' : 'Pending'}
                            </div>
                          )}
                          <CompanyLogo name={c.name} website={c.contact.website} className="w-12 h-12 mb-3 shadow-sm" />
                          <h3 className="text-base font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors leading-tight">{c.name}</h3>
                          <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed font-medium">{c.description}</p>
                        </div>
                        
                        {isAcquired && c.acquiredBy && (
                          <div className="mt-4 pt-3 border-t border-slate-100">
                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Parent Entity</div>
                             <div className="text-[11px] font-black text-slate-800 truncate">{c.acquiredBy}</div>
                          </div>
                        )}
                        <div className={`mt-4 pt-3 border-t border-slate-100 flex items-center justify-between ${!(isAcquired && c.acquiredBy) ? 'mt-auto' : ''}`}>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-medium">{formatDate(c.lastUpdated)}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefreshCompany(c);
                            }}
                            disabled={refreshingIds.has(c.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                            title="Update Data"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingIds.has(c.id) ? 'animate-spin text-blue-600' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredCompanies.length > visibleCount && (
                  <div className="mt-12 flex justify-center">
                    <button 
                      onClick={loadMore} 
                      disabled={isLazyLoading}
                      className="px-8 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm flex items-center gap-3 disabled:opacity-50"
                    >
                      {isLazyLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <Plus className="w-4 h-4 text-blue-600" />
                      )}
                      {isLazyLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
                </>
              ) : (
                <ResultsTable companies={filteredCompanies} totalRecords={allCompanies.length} onCompanyClick={(c) => {
                    setSelectedCompany(c);
                    posthog.capture('view_company_detail', { company_name: c.name });
                }} onDeleteCompany={executePermanentDelete} onRefreshCompany={handleRefreshCompany} globalFilter={globalFilter} onGlobalFilterChange={setGlobalFilter} columnFilters={columnFilters} onColumnFiltersChange={setColumnFilters} />
              )}
            </>
          )}
          {view === 'analytics' && <AnalyticsView companies={filteredCompanies} onNavigateToAgent={() => setView('agent')} onCompanyClick={(c) => {
              setSelectedCompany(c);
              posthog.capture('view_company_from_analytics', { company_name: c.name });
          }} />}
          {view === 'drugSearch' && <DrugSearchView />}
          {view === 'agent' && <AgentView companies={allCompanies} />}
          {view === 'intelligence' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <NewsFeed />
             </div>
          )}
          {view === 'patents' && <PatentsView />}
          {view === 'patentAnalytics' && <PatentAnalyticsView />}
          {view === 'employment' && <EmploymentView />}
          {view === 'systemInfo' && <SystemInfoView />}
          {view === 'howToNavigate' && <SystemTutorialView onStartSearch={() => setView('discovery')} />}
          {view === 'changelog' && <ChangelogView />}
          {view === 'pamphlet' && <PromotionalPamphlet />}
          {view === 'architecture' && <ArchitectureView />}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {selectedCompany && <DetailModal company={selectedCompany} onClose={() => setSelectedCompany(null)} onResearcherClick={(n, i, b) => {
            setSelectedResearcher({name: n, institution: i, bio: b});
            posthog.capture('view_researcher_detail', { researcher_name: n });
        }} onProductClick={(p) => {
            setSelectedProduct(p);
            posthog.capture('view_product_detail', { product_name: p });
        }} />}
        {selectedResearcher && <ResearcherModal name={selectedResearcher.name} institution={selectedResearcher.institution} initialBio={selectedResearcher.bio} onClose={() => setSelectedResearcher(null)} />}
        {selectedProduct && <ProductModal productName={selectedProduct} onClose={() => setSelectedProduct(null)} />}
        {isSettingsOpen && <CloudSettingsModal onClose={() => setIsSettingsOpen(false)} onConfigured={() => {
            posthog.capture('cloud_reconfigured');
        }} />}
        {isCloudImportOpen && <CloudImportModal onClose={() => setIsCloudImportOpen(false)} onImport={handleCloudImport} initialQuery={globalFilter} limit={100} />}
        {pageHelp && <InstructionModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title={pageHelp.title} instructions={pageHelp.instructions} />}
        <FeedbackPopup />
      </Suspense>
    </div>
  );
}

export default App;
