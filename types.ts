
export const PipelinePhase = {
  Preclinical: "Preclinical",
  Phase1: "Phase I",
  Phase2: "Phase II",
  Phase3: "Phase III",
  Filed: "Filed",
  Approved: "Approved"
} as const;

export type PipelinePhase = typeof PipelinePhase[keyof typeof PipelinePhase];

export interface PipelineDrug {
  drugName: string;
  indication: string;
  phase: PipelinePhase | string;
  nctId?: string; // Optional ClinicalTrials.gov Identifier
  status?: string; // e.g., Recruiting, Active, Completed
}

export interface CompanyContact {
  hqAddress: string;
  auAddress?: string; // Australian Location detail
  website: string;
  email: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

export interface Publication {
  title: string;
  source: string;
  year: string;
  url?: string;
  citations?: number; // Number of citations for the article
}

export interface ResearcherSummary {
  name: string;
  title: string; // e.g., "Professor of Immunology"
  bio?: string; // Short bio snippet
}

export interface ResearcherProfile {
  name: string;
  institution: string;
  bio: string;
  workDescription: string;
  projects: string[];
  publications: Publication[];
}

export interface DrugProfile {
  name: string;
  description: string;
  mechanismOfAction: string;
  indications: string[];
  approvalDate: string;
  drugClass: string;
  sideEffects: string[];
}

export interface DrugDeepDive {
  // FIX: Added id property to match usage in DrugSearchView mapping logic
  id?: string;
  name: string;
  synonyms: string[]; // Generic, Brand, Research Codes
  description: string;
  mechanismOfAction: string;
  drugClass: string;
  indications: string[]; // Approved Indications
  sideEffects: string[]; // Key Side Effects
  approvalDate: string; // First approval date or 'Investigational'
  pubchemCid?: string; // For structure image
  smiles?: string; // Chemical structure string
  components?: { name: string; pubchemCid?: string; smiles?: string }[]; // For combination drugs
  molecularFormula?: string;
  manufacturers: string[];
  analogues: { name: string; reason: string }[]; // Mechanism-based analogues
  recentResearch: { title: string; source: string; summary: string }[];
  clinicalTrialsSummary: string;
  lastUpdated: string;
}

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  workType: 'Remote' | 'Hybrid' | 'Onsite' | string;
  level: 'Intern' | 'Graduate' | 'PhD' | 'Post-Doc' | 'Mid-Level' | 'Senior' | 'Director' | string;
  classification: 'Biotech' | 'Biopharma' | 'University' | 'Research Institute' | 'CRO' | string;
  description: string;
  salaryRange?: string;
  postedDate: string;
  requirements: string[];
  url: string;
  howToApply?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  url: string;
  category: 'Industry' | 'Regulatory' | 'Clinical' | 'Financial' | 'Reports';
  summary?: string;
}

export interface CompanyData {
  id: string; // generated client-side for keys
  name: string;
  entityType?: string; // 'Corporate' | 'Academic' | 'Non-Profit' | 'Government'
  description: string;
  sector: string;
  customerBase: string; // e.g., "Hospitals, Clinics, Direct to Consumer"
  contact: CompanyContact;
  keyApprovedDrugs: string[];
  pipeline: PipelineDrug[];
  keyTechnologies: string[];
  partnerships: string[];
  scientificPublications: Publication[];
  researchersUrl?: string; // New field for University/Institute faculty pages
  keyResearchers?: ResearcherSummary[]; // New list of names/titles for academic entities
  found: boolean; // helper to track if AI successfully found info
  lastUpdated?: string; // ISO date string
  acquisitionStatus?: 'Acquired' | 'Acquisition Pending' | 'Independent' | string;
  acquiredBy?: string;
}

export interface SearchHistoryItem {
  id: string;
  timestamp: number;
  mode: 'names' | 'sector' | 'agent';
  query: string;
  region: string;
  filters?: string[];
  limit?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  sources?: any[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  lastUpdated: number;
  messages: ChatMessage[];
}

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export type ProgressCallback = (current: number, total: number, message: string) => void;

export function isAcademicEntity(c: CompanyData): boolean {
  if (!c) return false;

  const n = c.name.toLowerCase();
  const s = c.sector ? c.sector.toLowerCase() : '';
  const et = c.entityType ? c.entityType.toLowerCase() : '';

  // 1. STRONGEST INDICATORS: Name keywords override entityType
  if (
    n.includes('university') || 
    n.includes('college') || 
    n.includes('school of') || 
    n.includes('institute') || 
    n.includes('foundation') || 
    n.includes('research center') ||
    n.includes('hospital') ||
    n.includes('medical center') ||
    n.includes('clinic')
  ) return true;

  // 2. Sector keywords
  if (s.includes('university') || s.includes('academic') || s.includes('higher education') || s.includes('non-profit')) return true;

  // 3. AI classification (if not overridden by generic keywords above)
  if (et) {
    return et === 'academic' || et === 'non-profit' || et === 'government' || et === 'research institute' || et === 'university';
  }

  // 4. Presence of specific academic URLs or data
  if (!!c.researchersUrl && c.researchersUrl.length > 5 && c.researchersUrl.toLowerCase() !== 'n/a') return true;
  if (c.keyResearchers && c.keyResearchers.length > 0) return true;

  return false;
}

// FIX: Moved getEntityCategory here from App.tsx to be a shared utility and fix import errors.
export function getEntityCategory(c: CompanyData): string {
  const name = c.name.toLowerCase();
  
  // High-priority name checks
  if (name.includes('university') || name.includes('college') || name.includes('school of')) return 'University';
  if (name.includes('institute') || name.includes('foundation') || name.includes('research center') || name.includes('clinic')) return 'Research Institute';

  // Fallback to AI-provided entityType
  if (c.entityType) {
    const et = c.entityType.toLowerCase();
    if (et === 'university' || et === 'college' || et === 'academic') return 'University';
    if (et === 'research institute' || et === 'foundation' || et === 'institute' || et === 'non-profit') return 'Research Institute';
    if (et === 'government') return 'Government';
    if (et === 'corporate' || et === 'company') return 'Corporate';
  }

  // Final heuristic fallback
  if (isAcademicEntity(c)) {
    return 'Research Institute'; 
  }
  
  return 'Corporate';
}

export interface Patent {
  applicationNumber: string;
  owners: string[];
  applicants: string[];
  inventors: string[];
  title: string;
  abstract: string;
  claim: string;
  description: string;
  status: string;
  family: string;
  familyJurisdictions: string[];
  dateFiled: string;
  datePublished: string;
  earliestPriorityDate: string;
  dateGranted: string;
  citedWork: string[];
  url?: string;
  source?: string;
  actualApplicationNumber?: string;
  patentType?: string;
  patentKind?: string;
  inventorsCountry?: string[];
  inventorsState?: string[];
  pctDocNumber?: string;
  pctKind?: string;
  pctDate?: string;
  pct371Date?: string;
  pct102Date?: string;
  publishedFiledDate?: string;
}

export type ViewMode = 'home' | 'overview' | 'discovery' | 'results' | 'analytics' | 'about' | 'aboutUs' | 'agent' | 'architecture' | 'employment' | 'login' | 'systemInfo' | 'howToNavigate' | 'changelog' | 'pamphlet' | 'drugSearch' | 'intelligence' | 'patents' | 'patentAnalytics' | 'prospectGenerator';
