import React, { useState, useCallback } from "react";
import { fetchPatentsFromPatentsView } from "../services/patentsViewService";
import { Patent as GlobalPatent } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patent {
  applicationNumber: string;
  title: string;
  inventors: string[];
  applicants: string[];
  owners: string[];
  dateFiled: string;
  status: string;
  abstract: string;
}

interface Prospect {
  id: string;
  name: string;
  institution: string;
  role: string;
  segment: "TTO" | "Researcher" | "Startup" | "CRC/MRI";
  patentCount: number;
  recentPatents: { title: string; appNum: string; filed: string }[];
  linkedInQuery: string;
  emailHint: string;
  score: number; // engagement likelihood 1-10
}

// ─── Segment config ───────────────────────────────────────────────────────────

const SEGMENT_META: Record<
  Prospect["segment"],
  { color: string; bg: string; icon: string; description: string }
> = {
  TTO: {
    color: "#00d4aa",
    bg: "rgba(0,212,170,0.12)",
    icon: "🏛️",
    description: "Technology Transfer Office",
  },
  Researcher: {
    color: "#7c9eff",
    bg: "rgba(124,158,255,0.12)",
    icon: "🔬",
    description: "Active Research Scientist",
  },
  Startup: {
    color: "#ff8c42",
    bg: "rgba(255,140,66,0.12)",
    icon: "🚀",
    description: "Biotech Startup / SME",
  },
  "CRC/MRI": {
    color: "#d4a0ff",
    bg: "rgba(212,160,255,0.12)",
    icon: "🧬",
    description: "Cooperative Research Centre / MRI",
  },
};

// ─── Institution classification heuristics ───────────────────────────────────

const UNIVERSITY_KEYWORDS = [
  "university",
  "univ",
  "mit",
  "stanford",
  "harvard",
  "caltech",
  "berkeley",
  "yale",
  "princeton",
  "columbia",
  "johns hopkins",
  "upenn",
  "cornell",
  "monash",
  "melbourne",
];
const CRC_KEYWORDS = [
  "nih",
  "mayo clinic",
  "cleveland clinic",
  "dana-farber",
  "memorial sloan kettering",
  "csiro",
  "crc",
  "walter",
  "eliza",
  "garvan",
  "wehi",
];
const STARTUP_KEYWORDS = [
  "pty",
  "ltd",
  "inc",
  "corp",
  "therapeutics",
  "biosciences",
  "biotech",
  "pharma",
  "genomics",
  "diagnostics",
  "moderna",
  "pfizer",
  "amgen",
  "genentech",
];

function classifyApplicant(name: string): Prospect["segment"] {
  const lower = name.toLowerCase();
  if (UNIVERSITY_KEYWORDS.some((k) => lower.includes(k))) return "TTO";
  if (CRC_KEYWORDS.some((k) => lower.includes(k))) return "CRC/MRI";
  if (STARTUP_KEYWORDS.some((k) => lower.includes(k))) return "Startup";
  return "Researcher";
}

function guessRole(segment: Prospect["segment"], institution: string): string {
  switch (segment) {
    case "TTO":
      return "Technology Transfer / Commercialisation Manager";
    case "CRC/MRI":
      return "Principal Research Scientist";
    case "Startup":
      return "Founder / Chief Scientific Officer";
    default:
      return "Research Scientist / Inventor";
  }
}

function scoreProspect(p: Partial<Prospect>): number {
  let score = 5;
  if ((p.patentCount ?? 0) >= 3) score += 2;
  if ((p.patentCount ?? 0) >= 6) score += 1;
  if (p.segment === "TTO") score += 1;
  if (p.segment === "Startup") score += 1;
  const recent = p.recentPatents ?? [];
  if (recent.some((r) => new Date(r.filed) > new Date("2022-01-01"))) score += 1;
  return Math.min(score, 10);
}

function buildLinkedInQuery(name: string, institution: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    name + " " + institution
  )}&origin=GLOBAL_SEARCH_HEADER`;
}

function guessEmailHint(institution: string): string {
  const lower = institution.toLowerCase();
  if (lower.includes("mit")) return "@mit.edu";
  if (lower.includes("stanford")) return "@stanford.edu";
  if (lower.includes("harvard")) return "@harvard.edu";
  if (lower.includes("nih")) return "@nih.gov";
  if (lower.includes("csiro")) return "@csiro.au";
  if (lower.includes("monash")) return "@monash.edu";
  if (lower.includes("melbourne") || lower.includes("unimelb"))
    return "@unimelb.edu.au";
  return "@[institution domain]";
}

// ─── Transform raw patent data → prospects ───────────────────────────────────

function patentsToProspects(patents: Patent[]): Prospect[] {
  const map = new Map<string, Prospect>();

  for (const patent of patents) {
    const entities = [
      ...patent.applicants,
      ...patent.owners,
      ...patent.inventors,
    ].filter(Boolean);

    for (const entity of entities) {
      const key = entity.toLowerCase().trim();
      if (!key || key.length < 3) continue;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.patentCount++;
        if (existing.recentPatents.length < 5) {
          existing.recentPatents.push({
            title: patent.title,
            appNum: patent.applicationNumber,
            filed: patent.dateFiled,
          });
        }
        existing.score = scoreProspect(existing);
      } else {
        const isInventor = patent.inventors.map((i) => i.toLowerCase()).includes(key);
        const segment = isInventor
          ? "Researcher"
          : classifyApplicant(entity);
        const institution =
          segment !== "Researcher"
            ? entity
            : patent.applicants[0] || patent.owners[0] || "Unknown Institution";

        const prospect: Prospect = {
          id: key,
          name: entity,
          institution,
          role: guessRole(segment, entity),
          segment,
          patentCount: 1,
          recentPatents: [
            {
              title: patent.title,
              appNum: patent.applicationNumber,
              filed: patent.dateFiled,
            },
          ],
          linkedInQuery: buildLinkedInQuery(entity, institution),
          emailHint: guessEmailHint(institution),
          score: 5,
        };
        prospect.score = scoreProspect(prospect);
        map.set(key, prospect);
      }
    }
  }

  return Array.from(map.values())
    .filter((p) => p.name.length > 2)
    .sort((a, b) => b.score - a.score || b.patentCount - a.patentCount);
}

// ─── Mock data for demo / when API unavailable ───────────────────────────────

const MOCK_PROSPECTS: Prospect[] = [
  {
    id: "1",
    name: "Massachusetts Institute of Technology",
    institution: "MIT",
    role: "Technology Transfer / Commercialisation Manager",
    segment: "TTO",
    patentCount: 15,
    recentPatents: [
      { title: "CRISPR-based gene editing for therapeutic applications", appNum: "11000001", filed: "2023-03-15" },
      { title: "Novel mRNA delivery nanoparticle formulation", appNum: "11000002", filed: "2023-06-22" },
    ],
    linkedInQuery: buildLinkedInQuery("Technology Transfer Manager", "MIT"),
    emailHint: "@mit.edu",
    score: 10,
  },
  {
    id: "2",
    name: "National Institutes of Health",
    institution: "NIH",
    role: "Principal Research Scientist",
    segment: "CRC/MRI",
    patentCount: 22,
    recentPatents: [
      { title: "Synthetic biology platform for biomanufacturing", appNum: "11000003", filed: "2022-11-08" },
      { title: "AI-driven protein structure prediction pipeline", appNum: "11000004", filed: "2023-01-30" },
    ],
    linkedInQuery: buildLinkedInQuery("Research Scientist", "NIH"),
    emailHint: "@nih.gov",
    score: 10,
  },
  {
    id: "3",
    name: "ModernaTX, Inc.",
    institution: "ModernaTX, Inc.",
    role: "Founder / Chief Scientific Officer",
    segment: "Startup",
    patentCount: 12,
    recentPatents: [
      { title: "Bispecific antibody targeting tumour microenvironment", appNum: "11000005", filed: "2023-07-14" },
    ],
    linkedInQuery: buildLinkedInQuery("CSO Founder", "Moderna"),
    emailHint: "@modernatx.com",
    score: 9,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const SEARCH_TERMS = [
  "CRISPR gene therapy",
  "mRNA vaccine",
  "cancer immunotherapy",
  "biomanufacturing synthetic biology",
  "protein therapeutics antibody",
  "diagnostic biosensor",
  "stem cell regenerative",
  "microbiome therapeutics",
];

export default function ProspectGenerator() {
  const [query, setQuery] = useState("cancer immunotherapy");
  const [customQuery, setCustomQuery] = useState("");
  const [source, setSource] = useState<"patentsview" | "ipaustralia">("patentsview");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedMock, setUsedMock] = useState(false);
  const [activeSegment, setActiveSegment] = useState<Prospect["segment"] | "All">("All");
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchComplete, setSearchComplete] = useState(false);
  const [outreachDraft, setOutreachDraft] = useState<string | null>(null);
  const [draftTarget, setDraftTarget] = useState<Prospect | null>(null);

  const effectiveQuery = customQuery.trim() || query;

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProspects([]);
    setSearchComplete(false);
    setSelectedProspects(new Set());
    setOutreachDraft(null);

    try {
      let raw: Patent[] = [];
      if (source === "patentsview") {
        raw = await fetchPatentsFromPatentsView(effectiveQuery, undefined, 40) as any;
      } else {
        const response = await fetch("/api/patents/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: effectiveQuery, source: "ipaustralia" }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        raw = data.results || [];
      }

      if (raw.length === 0) throw new Error("No patents found");

      const generated = patentsToProspects(raw as any);
      setProspects(generated.slice(0, 40));
      setUsedMock(false);
    } catch (err: any) {
      if (source === "ipaustralia") {
        // Fallback to mock data for IP Australia if API fails
        const mockRaw = [
          {
            id: "AU2023100123",
            applicationNumber: "AU2023100123",
            title: `Australian Innovation in ${effectiveQuery}`,
            abstract: `A novel approach to ${effectiveQuery} developed in Australia.`,
            status: "Granted",
            dateFiled: "2023-01-15",
            dateGranted: "2024-02-20",
            inventors: ["Dr. Sarah Smith", "Prof. John Doe"],
            applicants: ["University of Melbourne", "CSIRO"],
            owners: ["University of Melbourne"],
            familyJurisdictions: ["AU", "US", "EP"]
          },
          {
            id: "AU2022200456",
            applicationNumber: "AU2022200456",
            title: `System and Method for ${effectiveQuery}`,
            abstract: `An advanced system for improving ${effectiveQuery} outcomes.`,
            status: "Published",
            dateFiled: "2022-05-10",
            inventors: ["Dr. Emily Chen"],
            applicants: ["Monash University"],
            owners: ["Monash University"],
            familyJurisdictions: ["AU", "NZ"]
          },
          {
            id: "AU2024100789",
            applicationNumber: "AU2024100789",
            title: `Next Generation ${effectiveQuery} Technology`,
            abstract: `Next generation technology utilizing ${effectiveQuery}.`,
            status: "Granted",
            dateFiled: "2024-03-01",
            dateGranted: "2025-01-10",
            inventors: ["Dr. Michael Brown"],
            applicants: ["Garvan Institute of Medical Research"],
            owners: ["Garvan Institute of Medical Research"],
            familyJurisdictions: ["AU", "US", "JP"]
          }
        ];
        const generated = patentsToProspects(mockRaw as any);
        setProspects(generated);
        setUsedMock(true);
        setError(`IP Australia API unavailable (${err.message}). Showing mock Australian data for demonstration.`);
      } else {
        setProspects([]);
        setUsedMock(false);
        
        let errorMessage = err.message;
        if (err.message.includes("401") || err.message.includes("403")) {
          errorMessage = `Authentication error. Please verify your ${source === 'patentsview' ? 'PATENTSVIEW_API_KEY' : 'IP_AU_CLIENT_ID/SECRET'} in the .env file.`;
        } else if (err.message.includes("429")) {
          errorMessage = "Rate limit exceeded. Please wait 60 seconds and try again.";
        } else if (err.message.includes("500")) {
          errorMessage = `${source === 'patentsview' ? 'PatentsView' : 'IP Australia'} API error. Please check the API status page.`;
        } else if (err.message === "No patents found") {
          errorMessage = `Zero results returned from the live ${source === 'patentsview' ? 'PatentsView' : 'IP Australia'} database. Please try refining your query.`;
        } else {
          errorMessage = `Live API unavailable (${err.message}). Please verify your API keys.`;
        }
        
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setSearchComplete(true);
    }
  }, [effectiveQuery, source]);

  const toggleSelect = (id: string) => {
    setSelectedProspects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const visible = filtered.map((p) => p.id);
    setSelectedProspects(new Set(visible));
  };

  const exportCSV = () => {
    const toExport = prospects.filter(
      (p) => selectedProspects.size === 0 || selectedProspects.has(p.id)
    );
    const header = "Name,Institution,Role,Segment,Patent Count,Score,LinkedIn Search,Email Hint,Recent Patent";
    const rows = toExport.map((p) =>
      [
        `"${p.name}"`,
        `"${p.institution}"`,
        `"${p.role}"`,
        p.segment,
        p.patentCount,
        p.score,
        `"${p.linkedInQuery}"`,
        p.emailHint,
        `"${p.recentPatents[0]?.title || ""}"`,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bioscout-prospects-${effectiveQuery.replace(/\s+/g, "-")}.csv`;
    a.click();
  };

  const generateOutreach = (p: Prospect) => {
    setDraftTarget(p);
    const templates: Record<Prospect["segment"], string> = {
      TTO: `Subject: BioPort AI — Patent Intelligence Tool for Your Commercialisation Pipeline

Hi [Name],

I noticed ${p.institution} has been active in the ${effectiveQuery} space — you've filed ${p.patentCount} patent applications recently, including "${p.recentPatents[0]?.title || "recent work"}".

I'm building BioPort AI, a free patent analytics platform designed specifically for Australian technology transfer offices. It lets you instantly map the competitive IP landscape, identify collaboration opportunities, and track competitor filings — all powered by the IP Australia database.

I'd love to get your feedback as an early user. Would you be open to a 20-minute call?

Best,
[Your name]
BioPort AI | bioscout.ai`,

      Researcher: `Subject: Free IP Analytics Tool for Your Research Group

Hi [Name],

I came across your patent work in ${effectiveQuery} (including "${p.recentPatents[0]?.title || "your recent filing"}") and wanted to reach out.

I'm developing BioPort AI — a free tool that helps Australian researchers track the global patent landscape in their field, find potential collaborators, and prepare for commercialisation conversations. It's built on the IP Australia API with AI-powered analysis.

Would you be willing to try it out and share some feedback? I'm looking for 10–15 researchers to shape the early roadmap.

Best,
[Your name]`,

      Startup: `Subject: Competitive Patent Intelligence for ${p.institution}

Hi [Name],

Congrats on the IP activity at ${p.institution} — your work on "${p.recentPatents[0]?.title || "recent filings"}" caught my attention.

I'm building BioPort AI, a patent analytics tool purpose-built for Australian biotech startups. It gives you real-time visibility into competitor filings, freedom-to-operate signals, and collaboration leads — without the $50k/year price tag of Derwent or PatSnap.

Happy to give you free access in exchange for 30 minutes of feedback. Interested?

[Your name]`,

      "CRC/MRI": `Subject: BioPort AI — Patent Analytics for ${p.institution}

Hi [Name],

I've been tracking IP activity at ${p.institution} in the ${effectiveQuery} space — impressive work on "${p.recentPatents[0]?.title || "recent filings"}".

I'm building BioPort AI, a free Australian-focused patent intelligence platform. For MRIs and CRCs it's particularly useful for identifying translation opportunities and tracking the IP landscape before spinning out or licensing.

I'd love your input as an early user. Would a brief call work for you?

[Your name]`,
    };

    setOutreachDraft(templates[p.segment]);
  };

  const filtered =
    activeSegment === "All"
      ? prospects
      : prospects.filter((p) => p.segment === activeSegment);

  const segmentCounts = prospects.reduce(
    (acc, p) => {
      acc[p.segment] = (acc[p.segment] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl text-blue-600">⬡</span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">BioPort AI</h1>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">Prospect Engine</span>
          </div>
          <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
            Mine USPTO PatentsView filings to surface researchers, TTO staff,
            and startup founders for your beta outreach.
          </p>
        </div>
      </div>

      {/* Search Panel */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Technology domain</label>
            <div className="flex flex-wrap gap-2">
              {SEARCH_TERMS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setQuery(t); setCustomQuery(""); }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${query === t && !customQuery ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 items-end">
            <div className="w-56">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Data Source</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={source}
                onChange={(e) => setSource(e.target.value as "patentsview" | "ipaustralia")}
              >
                <option value="patentsview">US Patents (PatentsView)</option>
                <option value="ipaustralia">AU Patents (IP Australia)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Or enter custom search</label>
              <input
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="e.g. lipid nanoparticle drug delivery"
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
            </div>
            <button
              className={`px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${loading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              onClick={runSearch}
              disabled={loading}
            >
              {loading ? (
                <span className="animate-spin inline-block">⟳</span>
              ) : (
                "Find Prospects"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-8 mb-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
            <span className="text-lg">⚠</span>
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {searchComplete && prospects.length > 0 && (
        <>
          {/* Stats bar */}
          <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-slate-900">{prospects.length}</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">prospects found</span>
              {usedMock && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200">SAMPLE DATA</span>
              )}
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50" onClick={selectAll}>
                Select All
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-bold ${selectedProspects.size === 0 ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                onClick={exportCSV}
                disabled={selectedProspects.size === 0}
              >
                ↓ Export CSV ({selectedProspects.size})
              </button>
            </div>
          </div>

          {/* Segment filter */}
          <div className="max-w-7xl mx-auto px-8 py-4 flex gap-2 flex-wrap">
            {(["All", "TTO", "Researcher", "Startup", "CRC/MRI"] as const).map(
              (seg) => {
                const count =
                  seg === "All"
                    ? prospects.length
                    : segmentCounts[seg] || 0;
                const meta = seg !== "All" ? SEGMENT_META[seg] : null;
                const isActive = activeSegment === seg;
                return (
                  <button
                    key={seg}
                    onClick={() => setActiveSegment(seg)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {meta?.icon && <span>{meta.icon} </span>}
                    {seg}
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">{count}</span>
                  </button>
                );
              }
            )}
          </div>

          {/* Prospect cards */}
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => {
              const meta = SEGMENT_META[p.segment];
              const isExpanded = expandedId === p.id;
              const isSelected = selectedProspects.has(p.id);

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border p-6 transition-all ${isSelected ? 'border-blue-500 shadow-lg' : 'border-slate-200 hover:shadow-md'}`}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.icon} {p.segment}
                    </div>
                    <div className="ml-auto flex items-baseline gap-1">
                      <span className="text-lg font-bold" style={{ color: meta.color }}>{p.score}</span>
                      <span className="text-xs text-slate-400">/10</span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="mb-4">
                    <div className="text-base font-bold text-slate-900 mb-1">{p.name}</div>
                    <div className="text-xs font-bold text-slate-500 mb-2">{p.role}</div>
                    {p.institution !== p.name && (
                      <div className="text-sm text-slate-600">{p.institution}</div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        📋 {p.patentCount} patent{p.patentCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">✉ {p.emailHint}</span>
                    </div>

                    {/* Recent patents */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Recent Filings</div>
                        {p.recentPatents.map((r, i) => (
                          <div key={i} className="mb-3">
                            <div className="text-sm text-slate-800 font-medium leading-snug">{r.title || "Untitled"}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {r.appNum} · {r.filed || "Date unknown"}
                            </div>
                          </div>
                        ))}
                        {outreachDraft && draftTarget?.id === p.id && (
                          <div className="mt-4">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Outreach Draft</div>
                            <textarea
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs p-3 text-slate-700 outline-none focus:border-blue-500"
                              value={outreachDraft}
                              onChange={(e) => setOutreachDraft(e.target.value)}
                              rows={8}
                            />
                            <button
                              className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100"
                              onClick={() => {
                                navigator.clipboard.writeText(outreachDraft);
                              }}
                            >
                              Copy to Clipboard
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card actions */}
                  <div className="pt-4 border-t border-slate-100 flex gap-2">
                    <button
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    >
                      {isExpanded ? "▲ Less" : "▼ Details"}
                    </button>
                    <a
                      href={p.linkedInQuery}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100"
                    >
                      LinkedIn ↗
                    </a>
                    <button
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 ml-auto"
                      onClick={() => {
                        setExpandedId(p.id);
                        generateOutreach(p);
                      }}
                    >
                      ✉ Draft
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !searchComplete && (
        <div className="max-w-md mx-auto my-20 text-center px-8">
          <div className="text-6xl text-blue-200 mb-6">⬡</div>
          <div className="text-sm text-slate-500 leading-relaxed">
            Select a technology domain and click{" "}
            <strong className="text-slate-900">Find Prospects</strong> to mine USPTO PatentsView filings
            for potential BioPort users.
          </div>
        </div>
      )}
    </div>
  );
}