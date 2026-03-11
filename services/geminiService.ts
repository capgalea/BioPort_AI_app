import { GoogleGenAI, Type, FunctionDeclaration, Chat, GenerateContentResponse, Part, Tool } from "@google/genai";
import { withExponentialBackoff } from "../src/utils/apiUtils.ts";
import { CompanyData, ProgressCallback, ResearcherProfile, DrugProfile, PipelineDrug, JobOpportunity, DrugDeepDive, NewsItem, Patent } from "../types.ts";
import { cacheService } from "./cacheService.ts";
import { supabaseService } from "./supabaseService.ts";
import { patentService } from "./patentService.ts";

// --- HELPER FUNCTIONS ---

const slugify = (text: string): string => {
  return text.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
};

/**
 * Robustly strips common legal corporate suffixes (Inc, Ltd, LLC, etc.)
 * Handles commas, periods, and multi-word suffixes recursively.
 */
export const stripLegalSuffixes = (name: string): string => {
  if (!name) return name;
  
  let cleanName = name.trim();

  // 1. Remove "The " prefix if it exists at the start
  if (cleanName.toLowerCase().startsWith('the ')) {
    cleanName = cleanName.substring(4).trim();
  }
  
  // 2. Comprehensive list of suffixes to strip
  const suffixes = [
    'Incorporated', 'Corporation', 'Company', 'Limited', 
    'Pty Ltd', 'Co Ltd', 'Pty. Ltd.', 'Co. Ltd.', 'Co., Ltd.', 'Co.,Ltd.',
    'Inc', 'Corp', 'Ltd', 'LLC', 'PLC', 'AG', 'GmbH', 'Oyj', 'A/S', 'AB', 'SA', 'SE', 'NV', 'ASA', 'KGaA',
    'L.L.C.', 'P.L.C.', 'S.A.', 'S.E.', 'N.V.', 'A.G.', 'A.S.'
  ];
  
  let prevName;
  do {
    prevName = cleanName;
    for (const suffix of suffixes) {
      const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Matches: optional comma/period + optional space + the suffix + optional trailing period + end of string
      const regex = new RegExp(`[,.]?\\s*${escapedSuffix}\\.?$`, 'i');
      if (regex.test(cleanName)) {
        cleanName = cleanName.replace(regex, '').trim();
      }
    }
    // Final cleanup of trailing punctuation that might be left over
    cleanName = cleanName.replace(/[,.]$/, '').trim();
  } while (cleanName !== prevName);
  
  return cleanName;
};

const cleanNctId = (id?: string): string | undefined => {
  if (!id) return undefined;
  const match = id.match(/NCT\s*(\d{8})/i);
  if (match) return `NCT${match[1]}`;
  const plainMatch = id.match(/\b(\d{8})\b/);
  if (plainMatch) return `NCT${plainMatch[1]}`;
  return undefined;
};

const sanitizeCompanyData = (data: any, originalRequestedName?: string): CompanyData => {
  const aiName = stripLegalSuffixes(data.name || originalRequestedName || "Unknown Entity");
  const requestedNameClean = originalRequestedName ? stripLegalSuffixes(originalRequestedName) : aiName;
  const finalName = aiName;
  
  return {
    ...data,
    id: slugify(requestedNameClean),
    name: finalName,
    description: data.description || "",
    sector: data.sector || "Uncategorized",
    entityType: data.entityType || "Corporate", 
    keyApprovedDrugs: Array.isArray(data.keyApprovedDrugs) ? data.keyApprovedDrugs : [],
    pipeline: Array.isArray(data.pipeline) ? data.pipeline.map((p: any) => ({
      ...p,
      nctId: cleanNctId(p.nctId)
    })) : [],
    keyTechnologies: Array.isArray(data.keyTechnologies) 
        ? data.keyTechnologies.map((t: any) => typeof t === 'string' ? t : (t?.name || String(t))).filter((t: any) => typeof t === 'string' && t.length > 0)
        : [],
    partnerships: Array.isArray(data.partnerships) ? data.partnerships : [],
    scientificPublications: Array.isArray(data.scientificPublications) ? data.scientificPublications.map((p: any) => ({
      ...p,
      citations: Number(p.citations) || 0
    })) : [],
    keyResearchers: Array.isArray(data.keyResearchers) ? data.keyResearchers : [],
    contact: data.contact || { hqAddress: '', website: '', email: '', phone: '' },
    found: data.found !== undefined ? data.found : true,
    lastUpdated: new Date().toISOString(),
    acquisitionStatus: data.acquisitionStatus || 'Independent',
    acquiredBy: data.acquiredBy || null
  } as CompanyData;
};

const extractJson = (text: string): any => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    const startObj = text.indexOf('{');
    const startArr = text.indexOf('[');
    let start = -1;
    if (startObj > -1 && startArr > -1) {
      start = Math.min(startObj, startArr);
    } else if (startObj > -1) {
      start = startObj;
    } else if (startArr > -1) {
      start = startArr;
    }

    if (start > -1) {
       const endObj = text.lastIndexOf('}');
       const endArr = text.lastIndexOf(']');
       const end = Math.max(endObj, endArr);
       if (end > start) {
         const jsonStr = text.substring(start, end + 1);
         try { 
           return JSON.parse(jsonStr); 
         } catch (e2) { 
           return null; 
         }
       }
    }
    return null;
  }
};

const raceWithSignal = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new Error("Aborted"));
  
  let listener: () => void;
  const abortPromise = new Promise<T>((_, reject) => {
    listener = () => reject(new Error("Aborted"));
    signal.addEventListener('abort', listener);
  });
  
  return Promise.race([promise, abortPromise]).finally(() => {
    if (listener) signal.removeEventListener('abort', listener);
  });
};

const checkAbort = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error("Aborted");
};

// Optimized Promise Pool implementation for maximum throughput
async function processBatchesWithConcurrency<T>(
  items: string[], 
  batchSize: number, 
  concurrencyLimit: number,
  processor: (batch: string[]) => Promise<T[]>,
  onProgress?: (count: number) => void,
  signal?: AbortSignal
): Promise<T[]> {
  checkAbort(signal);

  const chunks: string[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }
  
  const results: T[] = [];
  const executing = new Set<Promise<void>>();
  let processedCount = 0;

  for (const chunk of chunks) {
    checkAbort(signal);
    
    // Wrap processor to handle results and pool cleanup
    const p = processor(chunk).then(batchResults => {
      if (signal?.aborted) return;
      results.push(...batchResults);
      processedCount += chunk.length;
      if (onProgress) onProgress(processedCount);
    }).catch(err => {
       if (err.message === 'Aborted' || signal?.aborted) throw new Error("Aborted");
       // Swallow individual batch errors to prevent failing the whole job, unless it's an abort
       console.error("Batch error:", err);
    });

    executing.add(p);
    
    p.finally(() => {
      executing.delete(p);
    });

    // If pool is full, wait for the fastest one to finish
    if (executing.size >= concurrencyLimit) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining tasks
  await Promise.all(Array.from(executing));
  
  checkAbort(signal);
  return results;
}

// --- API INTEGRATION ---

export const fetchAllClinicalTrials = async (companyName: string): Promise<PipelineDrug[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return [];
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
  Perform a Comprehensive Clinical Pipeline Audit for "${companyName}".
  
  GOAL:
  List ALL active drug candidates and development programs found in the public domain. Do not summarize or truncate.
  
  SOURCES TO CHECK:
  1. Official Corporate Pipeline Pages (Latest).
  2. ClinicalTrials.gov Registry entries.
  3. Recent Press Releases (2024-2025).
  
  EXECUTION STRATEGY:
  1. Identify all program codes (e.g. mRNA-1273, V940) and generic names.
  2. Map each to its current Indication and Phase.
  3. Find specific NCT IDs (ClinicalTrials.gov identifiers) where available.
  
  Return a JSON object with key "trials" containing an array of objects with: drugName, indication, phase, nctId, status.
  `;
  
  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() => 
      ai.models.generateContent({
        model: "gemini-3.1-pro-preview", 
        contents: prompt,
        config: { 
          tools: [{ googleSearch: {} }], 
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 }
        },
      })
    );
    const text = response.text || "";
    const data = extractJson(text);
    return (data?.trials || []).map((t: any) => ({
      ...t,
      nctId: cleanNctId(t.nctId)
    }));
  } catch (error: any) {
    return [];
  }
};

/**
 * RE-OPTIMIZED: fetchLatestNews
 * - Dynamic time period support.
 * - 2k thinking budget for grounding reliability.
 * - Improved query expansion for "Global" sector to avoid empty results.
 * - Returns exactly 20 top articles with STRICT adherence to selected categories.
 * - FIXED: Strict Entity Scoping when companyName is provided.
 * - FIXED: Enhanced Scoping Constraint to prevent news bleed-in.
 */
export const fetchLatestNews = async (
  companyName?: string, 
  sector?: string, 
  categories: string[] = [], 
  timePeriod: string = '7d'
): Promise<NewsItem[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return [];
  
  const ai = new GoogleGenAI({ apiKey });
  
  const categoriesStr = categories.length > 0 
    ? categories.join(", ") 
    : "major clinical trial results, FDA/EMA regulatory approvals, high-impact M&A, strategic industry partnerships, and market analysis reports/forecasts";
  
  // Format period for natural language prompt
  let periodStr = "last 7 days";
  if (timePeriod === '24h') periodStr = "last 24 hours";
  else if (timePeriod === '48h') periodStr = "last 48 hours";
  else if (timePeriod === '30d') periodStr = "last 30 days";

  const targetLabel = companyName 
    ? `Target Entity: "${companyName}"` 
    : `Target Sector: "${sector === 'Global' ? 'Global Biotech and Pharmaceutical Industry' : sector}"`;

  // Define strict constraint for individual company views
  const strictFilterInstruction = companyName
    ? `STRICT ENTITY SCOPING (ZERO NOISE PROTOCOL): Every single news item MUST be specifically and explicitly about "${companyName}". 
       DO NOT include general industry news, news about competitors, or market-wide trends UNLESS "${companyName}" is a lead subject. 
       If NO direct news for "${companyName}" exists in the search results for this time window, return an EMPTY ARRAY []. 
       It is better to return nothing than to return unrelated industry news.`
    : (categories.length > 0 
        ? `STRICT CATEGORY FILTERING: ONLY include articles that strictly qualify as one of the following categories: ${categories.join(", ")}. Do NOT include generic news that falls outside these buckets.`
        : "Include a diverse mix of high-impact industry news.");

  const prompt = `
  Synthesize a comprehensive briefing of the TOP 20 high-impact biotech and pharmaceutical headlines from the ${periodStr}.
  ${targetLabel}
  SELECTED FOCUS CATEGORIES: ${categoriesStr}
  
  INSTRUCTIONS:
  1. Use Google Search to find verified, professional news from authoritative sources (Endpoints News, Stat News, BioSpace, Reuters, GlobeNewswire, BioWorld).
  2. ${strictFilterInstruction}
  3. DATE VERIFICATION (CRITICAL): Only include articles published within the ${periodStr}. Verify timestamps.
  4. Map each news item into one of these categories: Industry, Regulatory, Clinical, Financial, Reports (use 'Reports' for market forecasts, whitepapers, and future projections).
  5. Provide exactly 20 results if the data exists.
  
  LINK REQUIREMENTS (CRITICAL):
  6. COPY THE REAL URL: You must provide the EXACT, FULL source URL for every article from the search results. 
  7. ABSOLUTE URLS: Every URL must start with "https://". 
  8. NO HALLUCINATIONS: Do NOT invent plausible-sounding URLs. If a specific direct link to a headline is not confirmed in the search data, do not include that headline in the JSON.
  
  FORMAT: JSON array of objects with keys: title, source, timeAgo (e.g. '2h ago'), url, category, summary (max 15 words).
  `;
  
  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() => 
      ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { 
          tools: [{ googleSearch: {} }], 
          temperature: 0.05, // Lower temperature for higher factual precision
          thinkingConfig: { thinkingBudget: 2048 }, 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                source: { type: Type.STRING },
                timeAgo: { type: Type.STRING },
                url: { 
                  type: Type.STRING,
                  description: "Full absolute URL starting with https://"
                },
                category: { 
                  type: Type.STRING,
                  description: "Must be: Industry | Regulatory | Clinical | Financial | Reports"
                },
                summary: { type: Type.STRING }
              },
              required: ["title", "source", "timeAgo", "url", "category", "summary"]
            }
          }
        },
      })
    );
    
    const rawText = response.text || "";
    const data = extractJson(rawText);
    
    // Extract URLs from grounding metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const chunks = groundingMetadata?.groundingChunks || [];
    const webChunks = chunks.map(chunk => chunk.web).filter(Boolean);
    const supports = groundingMetadata?.groundingSupports || [];

    const news = (data || []).map((item: any, idx: number) => {
       let cleanUrl = (item.url || '').trim();
       
       if (webChunks.length > 0) {
         let supportedUrl = null;
         
         // 1. Try to find the URL using groundingSupports
         if (supports.length > 0) {
           // Find where the title or summary appears in the raw text
           const titleIndex = item.title ? rawText.indexOf(item.title) : -1;
           const summaryIndex = item.summary ? rawText.indexOf(item.summary) : -1;
           
           // Find a support that overlaps with the title or summary
           for (const support of supports) {
             const start = support.segment?.startIndex || 0;
             const end = support.segment?.endIndex || 0;
             
             const matchesTitle = titleIndex !== -1 && titleIndex >= start && titleIndex <= end;
             const matchesSummary = summaryIndex !== -1 && summaryIndex >= start && summaryIndex <= end;
             
             if ((matchesTitle || matchesSummary) && support.groundingChunkIndices?.length > 0) {
               const chunkIndex = support.groundingChunkIndices[0];
               if (chunks[chunkIndex]?.web?.uri) {
                 supportedUrl = chunks[chunkIndex].web.uri;
                 break;
               }
             }
           }
         }

         // 2. Fallback to scoring if groundingSupports didn't find anything
         let bestMatch = null;
         let maxScore = 0;

         if (!supportedUrl) {
           const itemTitle = (item.title || '').toLowerCase();
           // Filter out common words that cause false positive matches
           const stopWords = ['report', 'market', 'forecast', 'global', 'industry', 'analysis', 'size', 'share', 'growth', 'trends', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034'];
           const itemWords = itemTitle.split(/[\s\W]+/).filter((w: string) => w.length > 3 && !stopWords.includes(w));
           
           for (const chunk of webChunks) {
             if (!chunk.uri) continue;
             const chunkTitle = (chunk.title || '').toLowerCase();
             const chunkUri = chunk.uri.toLowerCase();
             
             let score = 0;
             for (const word of itemWords) {
               if (chunkTitle.includes(word)) score += 3;
               else if (chunkUri.includes(word)) score += 1;
             }
             
             if (score > maxScore) {
               maxScore = score;
               bestMatch = chunk.uri;
             }
           }
         }
         
         const isGenericUrl = cleanUrl.split('/').length <= 4; // e.g., https://www.globenewswire.com/
         const isUrlInChunks = webChunks.some(c => c.uri === cleanUrl);

         // Apply the best URL we found
         if (supportedUrl) {
           cleanUrl = supportedUrl;
         } else if (!isUrlInChunks || isGenericUrl) {
           if (bestMatch && maxScore >= 3) {
             cleanUrl = bestMatch;
           } else if (!cleanUrl.startsWith('http') && webChunks[idx]?.uri) {
             cleanUrl = webChunks[idx].uri;
           }
         }
       }

       if (cleanUrl && !cleanUrl.startsWith('http')) {
          cleanUrl = 'https://' + cleanUrl;
       }
       
       return {
         ...item,
         url: cleanUrl,
         id: `news-${idx}-${Date.now()}`
       };
    }).filter((item: any) => {
      // Filter out generic URLs (e.g., just the homepage)
      // A specific article URL typically has a path (more than 3 slashes: https://domain.com/path)
      // or query parameters.
      try {
        const urlObj = new URL(item.url);
        return urlObj.pathname.length > 1 || urlObj.search.length > 0;
      } catch (e) {
        // If URL parsing fails, it's probably not a valid URL, so filter it out
        return false;
      }
    });

    if (news.length > 0) {
      const cacheTopic = companyName || `${sector || "Global"}_${[...categories].sort().join("_")}_${timePeriod}`;
      cacheService.saveNewsCache(news, cacheTopic);
    }

    return news;
  } catch (error: any) {
    console.error("Intelligence fetch error:", error);
    return [];
  }
};

export const analyzeCompanies = async (
  companyNames: string[], 
  region: string = "Global", 
  onProgress?: ProgressCallback, 
  signal?: AbortSignal,
  focusContext?: string,
  forceRefresh?: boolean
): Promise<CompanyData[]> => {
  if (companyNames.length === 0) return [];
  const bypassCache = !!forceRefresh;
  
  checkAbort(signal);

  let mergedCache: CompanyData[] = [];
  const foundNamesSet = new Set<string>();

  if (!bypassCache) {
    try {
      const localCachedData = await raceWithSignal(cacheService.getBatchCompanies(companyNames, region), signal);
      localCachedData.forEach(c => {
        const k = stripLegalSuffixes(c.name).toLowerCase().trim();
        if (!foundNamesSet.has(k)) {
          foundNamesSet.add(k);
          mergedCache.push(c);
        }
      });

      checkAbort(signal);

      let missingNames = companyNames.filter(name => !foundNamesSet.has(stripLegalSuffixes(name).toLowerCase().trim()));

      if (missingNames.length > 0 && supabaseService.isConfigured()) {
        const cloudCachedDataResult = await raceWithSignal(supabaseService.getBatchCompanies(missingNames, region), signal);
        cloudCachedDataResult.forEach(c => {
          const k = stripLegalSuffixes(c.name).toLowerCase().trim();
          if (!foundNamesSet.has(k)) {
            foundNamesSet.add(k);
            mergedCache.push(c);
          }
        });
      }
    } catch (e: any) {
      if (e.message === 'Aborted') throw e;
    }
  }

  const finalMissingNames = bypassCache 
    ? companyNames 
    : companyNames.filter(name => !foundNamesSet.has(stripLegalSuffixes(name).toLowerCase().trim()));

  if (finalMissingNames.length === 0) {
    if (onProgress) onProgress(companyNames.length, companyNames.length, "Ready.");
    return mergedCache;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Intelligence Node Authorization Required (API Key missing).");
  }

  const BATCH_SIZE = 4;
  const CONCURRENCY = 8;

  const fetchBatch = async (batch: string[]): Promise<CompanyData[]> => {
    checkAbort(signal);
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      ROLE: High-Fidelity Biopharma Intelligence Analyst.
      TARGETS: ${JSON.stringify(batch)}
      
      ANALYSIS PROTOCOL:
      1. DEEP DIVE: Search for headquarters, pipeline, and key personnel.
      2. ACQUISITION CHECK (CRITICAL): verify current status of entity (Acquired/Acquisition Pending/Independent).
      3. COMPILATION: Clean Brand Name ONLY.
      4. CONSTRAINTS: Keep description under 40 words. Max 6 items for lists.
      5. ZERO HALLUCINATION POLICY: DO NOT invent, guess, or create dummy data. If specific information (like a pipeline drug, a key researcher, or an address) cannot be found in the search results, return an empty array [] or null for that field. ONLY return factual data backed by the search results.
      
      JSON Schema:
      [
        {
          "name": "string",
          "entityType": "Corporate" | "Academic" | "Research Institute" | "Government",
          "description": "string",
          "sector": "string",
          "acquisitionStatus": "Acquired" | "Acquisition Pending" | "Independent",
          "acquiredBy": "string | null",
          "contact": { "hqAddress": "string", "website": "url", "email": "string", "phone": "string" },
          "keyApprovedDrugs": ["string"],
          "pipeline": [{ "drugName": "string", "indication": "string", "phase": "string", "nctId": "string", "status": "string" }],
          "keyTechnologies": ["string"],
          "partnerships": ["string"],
          "scientificPublications": [{ "title": "string", "source": "string", "year": "string", "citations": number }],
          "keyResearchers": [{ "name": "string", "title": "string", "bio": "string" }],
          "found": true
        }
      ]
    `;
    try {
      const response: GenerateContentResponse = await withExponentialBackoff(() => 
        raceWithSignal(
          ai.models.generateContent({
            model: "gemini-3-flash-preview", 
            contents: prompt,
            config: { 
              tools: [{ googleSearch: {} }], 
              temperature: 0.0,
              thinkingConfig: { thinkingBudget: 0 } 
            },
          }), 
          signal
        )
      );
      
      const text = response.text || "";
      const data = extractJson(text);
      if (!Array.isArray(data)) {
        return batch.map(name => ({ name, found: false } as any));
      }
      return data.map((item, idx) => sanitizeCompanyData(item, batch[idx])); 
    } catch (error: any) {
      if (error.message === 'Aborted' || signal?.aborted) throw new Error("Aborted");
      return batch.map(name => ({ name, found: false } as any)); 
    }
  };

  const newCompanies = await processBatchesWithConcurrency(finalMissingNames, BATCH_SIZE, CONCURRENCY, fetchBatch, (count) => {
      const lastBatched = finalMissingNames.slice(Math.max(0, count - BATCH_SIZE), count);
      if (onProgress) onProgress(mergedCache.length + count, companyNames.length, `Analyzed batch: ${lastBatched.join(', ')}...`);
  }, signal);

  if (newCompanies.length > 0) {
    const validResults = newCompanies.filter(c => c.found !== false);
    if (validResults.length > 0) {
      if (!signal?.aborted) {
        await cacheService.saveBatchCompanies(validResults, region);
        if (supabaseService.isConfigured()) await supabaseService.saveBatchCompanies(validResults, region);
      }
    }
  }

  return [...mergedCache, ...newCompanies];
};

export const discoverWithAgent = async (
  query: string,
  sources: string[],
  region: string = "Global",
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<CompanyData[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key required.");

  checkAbort(signal);

  const internalSearchPromise = (sources.includes('internal_db') && supabaseService.isConfigured()) 
    ? supabaseService.searchCompanyMetadata(query, 20).catch(e => {
        if (e.message === 'Aborted') throw e;
        return [];
      })
    : (async () => [] as any[])();

  const externalSearchPromise = (sources.filter(s => s !== 'internal_db').length > 0)
    ? (async () => {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Identify top 8 biotech/pharma entities for: "${query}" in "${region}". Use common brand names. Return JSON { "names": ["Name1", "Name2", ...] }.`;
        try {
          const response: GenerateContentResponse = await withExponentialBackoff(() => 
            raceWithSignal(
              ai.models.generateContent({
                  model: "gemini-3-flash-preview",
                  contents: prompt,
                  config: {
                      tools: [{ googleSearch: {} }],
                      thinkingConfig: { thinkingBudget: 0 },
                      responseMimeType: "application/json",
                      responseSchema: {
                        type: Type.OBJECT,
                        properties: { 
                          names: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                          } 
                        } 
                      }
                  }
              }),
              signal
            )
          );
          const json = extractJson(response.text || "");
          return json && json.names ? json.names : [];
        } catch (e: any) {
            if (e.message === 'Aborted' || signal?.aborted) throw new Error("Aborted");
            return [];
        }
    })()
    : (async () => [] as any[])();

  const [internalResultsData, aiNames] = await Promise.all([internalSearchPromise, externalSearchPromise]);
  checkAbort(signal);

  const internalResults = internalResultsData.map((d: any) => d.name);
  const allNames = Array.from(new Set([...internalResults, ...aiNames]));
  
  if (allNames.length === 0) return [];

  return await analyzeCompanies(allNames, region, onProgress, signal, undefined);
};

export const performDrugDeepSearch = async (
  queries: string[], 
  onProgress?: ProgressCallback, 
  signal?: AbortSignal
): Promise<DrugDeepDive[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || queries.length === 0) return [];
  
  checkAbort(signal);

  const cachedResults = await cacheService.getBatchDrugs(queries);
  const foundNames = new Set(cachedResults.map(r => r.name.toLowerCase()));
  cachedResults.forEach(r => r.synonyms?.forEach(s => foundNames.add(s.toLowerCase())));
  const missingQueries = queries.filter(q => !foundNames.has(q.toLowerCase()));

  if (missingQueries.length === 0) {
    if (onProgress) onProgress(queries.length, queries.length, "All retrieved from local node.");
    return cachedResults;
  }

  const BATCH_SIZE = 4;
  const CONCURRENCY = 10; 

  const fetchBatch = async (batch: string[]): Promise<DrugDeepDive[]> => {
    checkAbort(signal);
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Conduct deep pharmaceutical analysis for these queries: ${JSON.stringify(batch)}. 
    
    INSTRUCTIONS:
    1. Each query can be a **Drug Name** OR a **Disease/Medical Condition**.
    2. If it is a DRUG: Return its specific profile.
    3. If it is a DISEASE: Identify top 1-2 standard-of-care approved drugs for this condition and return a profile for EACH drug.
    4. ZERO HALLUCINATION POLICY: DO NOT invent, guess, or create dummy data. If specific information (like a SMILES string, a PubChem CID, or recent research) cannot be found in the search results, return an empty string, null, or an empty array [] for that field. ONLY return factual data backed by the search results.
    
    Return a flat JSON array of drug profiles.`;

    const executeWithRetry = async (retryCount = 0): Promise<DrugDeepDive[]> => {
        try {
          const response: GenerateContentResponse = await withExponentialBackoff(() => 
            raceWithSignal(
              ai.models.generateContent({
                model: "gemini-3-flash-preview", 
                contents: prompt,
                config: { 
                  tools: [{ googleSearch: {} }], 
                  temperature: 0.0,
                  thinkingConfig: { thinkingBudget: 0 },
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              name: { type: Type.STRING },
                              synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                              description: { type: Type.STRING },
                              mechanismOfAction: { type: Type.STRING },
                              drugClass: { type: Type.STRING },
                              indications: { type: Type.ARRAY, items: { type: Type.STRING } },
                              sideEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
                              approvalDate: { type: Type.STRING },
                              pubchemCid: { type: Type.STRING },
                              smiles: { type: Type.STRING },
                              molecularFormula: { type: Type.STRING },
                              manufacturers: { type: Type.ARRAY, items: { type: Type.STRING } },
                              analogues: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, reason: { type: Type.STRING } } } },
                              recentResearch: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, source: { type: Type.STRING }, summary: { type: Type.STRING } } } },
                              clinicalTrialsSummary: { type: Type.STRING },
                              lastUpdated: { type: Type.STRING },
                              components: {
                                  type: Type.ARRAY,
                                  items: {
                                      type: Type.OBJECT,
                                      properties: {
                                          name: { type: Type.STRING },
                                          pubchemCid: { type: Type.STRING },
                                          smiles: { type: Type.STRING }
                                      }
                                  }
                              }
                          },
                          required: ['name', 'description', 'mechanismOfAction', 'drugClass', 'indications', 'sideEffects', 'approvalDate', 'manufacturers', 'clinicalTrialsSummary']
                      }
                  }
                },
              }),
              signal
            )
          );
          const results = extractJson(response.text || "");
          if (results) {
              const valid = Array.isArray(results) ? results : [results];
              cacheService.saveBatchDrugs(valid);
              return valid;
          }
          throw new Error("Empty response");
        } catch (error: any) { 
          if (error.message === 'Aborted' || signal?.aborted) throw new Error("Aborted");
          if (retryCount < 1) {
              await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
              return executeWithRetry(retryCount + 1);
          }
          return []; 
        }
    };

    return await executeWithRetry();
  };

  const newResults = await processBatchesWithConcurrency(
    missingQueries, 
    BATCH_SIZE, 
    CONCURRENCY, 
    fetchBatch, 
    (count) => {
      const totalProcessed = cachedResults.length + count;
      if (onProgress) onProgress(totalProcessed, queries.length, `Researching: ${totalProcessed}/${queries.length} completed...`);
    },
    signal
  );

  return [...cachedResults, ...newResults];
};

export const searchScienceJobs = async (filters: {
  keywords: string;
  location: string;
  level: string;
  workType: string;
  classification: string;
}): Promise<JobOpportunity[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return [];
  const ai = new GoogleGenAI({ apiKey });
  const query = `Find 5 real science job openings: Query="${filters.keywords}", Loc="${filters.location}". Return JSON.`;
  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() => 
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    );
    const data = extractJson(response.text || "");
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    return [];
  }
};

export const analyzeResearcher = async (name: string, institution: string): Promise<ResearcherProfile | null> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Generate a profile for Researcher: ${name}, Institution: ${institution}. Return JSON {bio, workDescription, projects:[], publications:[{title, source, year}]}. DO NOT invent dummy data. If specific information is missing, return null or empty arrays.`;
  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() => 
      ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], temperature: 0.0, thinkingConfig: { thinkingBudget: 0 } },
      })
    );
    return extractJson(response.text || "") as ResearcherProfile;
  } catch (error) { return null; }
};

export const analyzeDrug = async (drugName: string): Promise<DrugProfile | null> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Create a comprehensive pharmacological profile for "${drugName}". Return JSON {name, description, mechanismOfAction, indications:[], approvalDate, drugClass, sideEffects:[]}. DO NOT invent dummy data. If specific information is missing, return null or empty arrays.`;
  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() => 
      ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], temperature: 0.0, thinkingConfig: { thinkingBudget: 0 } },
      })
    );
    return extractJson(response.text || "") as DrugProfile;
  } catch (error) { return null; }
};

export const discoverCompaniesBySector = async (
  sectorQuery: string, 
  region: string = "Global", 
  filters: string[] = [], 
  limit: number = 15,
  onProgress?: ProgressCallback, 
  signal?: AbortSignal
): Promise<CompanyData[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key required.");
  checkAbort(signal);
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Identify top ${limit} entities for: "${sectorQuery}" in "${region}". Return JSON { "companies": ["Brand1", "Brand2"] }.`;
  try {
     const res: GenerateContentResponse = await withExponentialBackoff(() => 
       raceWithSignal(
           ai.models.generateContent({
              model: "gemini-3-flash-preview", 
              contents: prompt,
              config: { 
                responseMimeType: "application/json", 
                temperature: 0.6,
                thinkingConfig: { thinkingBudget: 0 },
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { companies: { type: Type.ARRAY, items: { type: Type.STRING } } }
                }
              }
          }),
          signal
       )
     );
     const names = (extractJson(res.text || ""))?.companies || [];
     return await analyzeCompanies(names, region, onProgress, signal, sectorQuery);
  } catch(e: any) { 
     if (e.message === 'Aborted' || signal?.aborted) throw new Error("Aborted");
     throw e; 
  }
};

export const fetchDetailedPatentsFromIPAustralia = async (query: string): Promise<any[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return [];
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
  Search the IP Australia Patent Registry for patents related to "${query}".
  
  GOAL:
  Retrieve a list of up to 20 real, verified, recently filed, pending, and current patents filed in Australia or by Australian entities.
  
  INSTRUCTIONS:
  1. Use Google Search to find patent records on the official IP Australia website (search.ipaustralia.gov.au).
  2. IMPORTANT: The "title" MUST exactly match the official "Invention Title" as listed in the IP Australia registry. 
  3. Try to retrieve up to 20 of the most recent patents.
  4. If no data is found, return an empty array [].
  5. ZERO HALLUCINATION POLICY: DO NOT invent dummy patents.
  
  FORMAT:
  Return a JSON object with key "patents" containing an array of objects with the following fields:
  - applicationNumber (string)
  - owners (array of strings)
  - applicants (array of strings)
  - inventors (array of strings)
  - title (string)
  - abstract (string)
  - claim (string)
  - description (string)
  - status (string)
  - family (string)
  - familyJurisdictions (array of strings)
  - dateFiled (string)
  - datePublished (string)
  - earliestPriorityDate (string)
  - dateGranted (string)
  - citedWork (array of strings)
  
  If there's a system error, include "error": "IP Australia service unavailable".
  `;
  
  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() => 
      ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { 
          tools: [{ googleSearch: {} }], 
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json"
        },
      })
    );
    const data = extractJson(response.text || "");
    if (data?.error) {
       const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error) || 'Failed to fetch patents');
       throw new Error(errorMsg);
    }
    
    return data?.patents || [];
  } catch (error: any) {
    console.error("Patent fetch error:", error);
    throw error;
  }
};

export const fetchPatentsFromIPAustralia = async (query: string): Promise<Patent[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return [];
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
  Search the IP Australia Patent Registry for patents related to "${query}".
  
  GOAL:
  Retrieve a list of up to 50 real, verified, recently filed, pending, and current patents filed in Australia or by Australian entities.
  
  INSTRUCTIONS:
  1. Use Google Search to find patent records on the official IP Australia website (search.ipaustralia.gov.au).
  2. IMPORTANT: The "title" MUST exactly match the official "Invention Title" as listed in the IP Australia registry. 
     - Do not summarize, truncate, or paraphrase the title.
     - Do not include prefixes like "Title: " or "Invention Title: ".
     - Use the exact casing and punctuation found in the registry.
  3. IMPORTANT: Use the correct IP Australia direct link format (AusPat): https://pericles.ipaustralia.gov.au/ols/auspat/applicationDetails.do?applicationNo=[PATENT_ID]
     Example: https://pericles.ipaustralia.gov.au/ols/auspat/applicationDetails.do?applicationNo=2025205632
  4. Try to retrieve up to 50 of the most recent patents.
  5. If no data is found, return an empty array [].
  6. If the search fails or IP Australia appears to be down/unreachable, return an object with an error indicator.
  7. ZERO HALLUCINATION POLICY: DO NOT invent dummy patents.
  
  FORMAT:
  Return a JSON object with key "patents" containing an array of objects with: appNum, title, applicant, status, filed, url.
  If there's a system error, include "error": "IP Australia service unavailable".
  `;
  
  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() => 
      ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { 
          tools: [{ googleSearch: {} }], 
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json"
        },
      })
    );
    const data = extractJson(response.text || "");
    if (data?.error) {
       const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error) || 'Failed to fetch patents');
       throw new Error(errorMsg);
    }
    
    const patents = (data?.patents || []).map((p: any) => {
      let cleanUrl = (p.url || '').trim();
      
      // Fix incorrect IP Australia URL structure
      if (cleanUrl.includes('ipaustralia.gov.au')) {
        const idMatch = cleanUrl.match(/\/patents\/(\d+)/) || cleanUrl.match(/q=(\d+)/) || cleanUrl.match(/\/view\/(\d+)/) || cleanUrl.match(/applicationNo=(\d+)/);
        const id = idMatch ? idMatch[1] : '';
        if (id) {
          cleanUrl = `https://pericles.ipaustralia.gov.au/ols/auspat/applicationDetails.do?applicationNo=${id}`;
        }
      }

      if (cleanUrl && !cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      let cleanTitle = (p.title || '').trim();
      // Remove common prefixes if the model accidentally includes them
      cleanTitle = cleanTitle.replace(/^(Invention\s+)?Title:\s*/i, '');
      
      return { ...p, title: cleanTitle, url: cleanUrl, source: 'IP Australia' };
    });

    return patents;
  } catch (error: any) {
    console.error("Patent fetch error:", error);
    throw error;
  }
};

export const fetchPatentsFromGooglePatents = async (query: string): Promise<Patent[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API key missing");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
  Search Google Patents for patents related to "${query}".
  
  GOAL:
  Retrieve a list of up to 50 real, verified, recently filed, pending, and current patents.
  
  INSTRUCTIONS:
  1. Use Google Search to find patent records on Google Patents (patents.google.com).
  2. IMPORTANT: The "title" MUST exactly match the official "Invention Title" as listed in the Google Patents registry. 
     - Do not summarize, truncate, or paraphrase the title.
     - Do not include prefixes like "Title: " or "Invention Title: ".
     - Use the exact casing and punctuation found in the registry.
  3. IMPORTANT: Use the correct Google Patents direct link format: https://patents.google.com/patent/[PATENT_ID]/en
     Example: https://patents.google.com/patent/US10000000B2/en
  4. Try to retrieve up to 50 of the most recent patents.
  5. If no data is found, return an empty array [].
  6. If the search fails, return an object with an error indicator.
  7. ZERO HALLUCINATION POLICY: DO NOT invent dummy patents.
  
  FORMAT:
  Return a JSON object with key "patents" containing an array of objects with: appNum, title, applicant, status, filed, url.
  If there's a system error, include "error": "Google Patents service unavailable".
  `;
  
  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() => 
      ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { 
          tools: [{ googleSearch: {} }], 
          temperature: 0.0,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json"
        },
      })
    );
    const data = extractJson(response.text || "");
    if (data?.error) {
       const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error) || 'Failed to fetch patents');
       throw new Error(errorMsg);
    }
    
    const patents = (data?.patents || []).map((p: any) => {
      let cleanUrl = (p.url || '').trim();
      
      if (cleanUrl && !cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      let cleanTitle = (p.title || '').trim();
      // Remove common prefixes if the model accidentally includes them
      cleanTitle = cleanTitle.replace(/^(Invention\s+)?Title:\s*/i, '');
      
      return { ...p, title: cleanTitle, url: cleanUrl, source: 'Google Patents' };
    });

    return patents;
  } catch (error: any) {
    console.error("Google Patents fetch error:", error);
    throw error;
  }
};

export const chatWithAgent = async (
  history: { role: string; content: string }[],
  newMessage: string,
  config: any,
  existingChat?: Chat
) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("Authorization key missing.");
  const ai = new GoogleGenAI({ apiKey });
  
  let chat = existingChat;

  if (!chat) {
    // Consolidate tool configuration to prevent conflicts
    const googleSearchTool: Tool = {};
    if (config.useGoogleSearch) {
      googleSearchTool.googleSearch = {};
    }

    const searchGooglePatentsTool: FunctionDeclaration = {
      name: "searchGooglePatents",
      description: "Search for global patents using Google Patents via Gemini Search. Returns detailed patent records including titles, snippets, and links.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "The search query for patents (e.g., 'mRNA delivery systems', 'CRISPR-Cas9 therapeutics')."
          }
        },
        required: ["query"]
      }
    };

    const activeTools: Tool[] = [];
    if (config.useGoogleSearch) {
      activeTools.push(googleSearchTool);
    }
    activeTools.push({ functionDeclarations: [searchGooglePatentsTool] });

    // Refined system instruction to handle API failures gracefully
    const systemInstruction = `
## Role
You are the "Dynamic Data Acquisition Engine" for a biotech research platform. Your goal is to fulfill complex data queries by autonomously discovering and interacting with external data sources.

## Operational Protocol
When a user query is received, you must follow these steps in a continuous loop:

1. **Intent Analysis**: Determine if the request requires real-time data or information not currently in your internal knowledge base (e.g., recent clinical trial phases, patent data, or company-specific information).
2. **Source Discovery**: If external data is needed, identify the most suitable interface. You have access to specialized tools like \`googleSearch\` and \`searchGooglePatents\`. Use \`searchGooglePatents\` specifically for global patent landscape analysis or when IP Australia data is insufficient. For company-specific patent searches on Google Patents, ALWAYS use the \`assignee:"Company Name"\` filter to avoid irrelevant results from other sectors.
3. **Execution & Validation**: Use the available tools to fetch data. Inspect the returned data. If the data is incomplete, refine your search.
4. **Final Delivery**: Synthesize the retrieved data into a concise, structured answer for the user.

## Constraints & Safety
- **Data Privacy**: Never transmit PII (Personally Identifiable Information) to an external API or MCP server.
- **Read-Only**: Unless explicitly authorized, only perform read operations.
- **Error Handling**: If a tool call returns an error object (e.g. CORS or Network Error), DO NOT hallucinate data. Explicitly inform the user that the tool failed due to network/browser restrictions and suggest they may need a backend environment for that specific feature.

## Contextual Focus
Focus specifically on biotech-related entities: Australian and global biotechnology companies, venture capital funding rounds, academic research grants, and intellectual property.

${config.contextData ? `\n\n## DATABASE CONTEXT\nUse the following user-loaded company data to answer specific questions if applicable:\n${config.contextData}` : ''}
`;

    // Context Caching Logic: If the system instruction is large, we could use ai.caches.create
    // For now, we'll use the standard chat creation, but we'll ensure the model is configured correctly.
    // Note: Context Caching is typically for contexts > 32k tokens.
    
    chat = ai.chats.create({
      model: config.model || 'gemini-3.1-pro-preview', 
      config: { 
        systemInstruction: systemInstruction,
        tools: activeTools,
        // Optional: cachedContent: 'name-of-cache' if we were using the caches API
      },
      history: history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] }))
    });
  }

  try {
    let result: GenerateContentResponse = await withExponentialBackoff(() => chat!.sendMessage({ message: newMessage }));
    
    // Tool Execution Loop
    let functionCalls = result.functionCalls;
    
    // Max turns to prevent infinite loops
    let turns = 0;
    while (functionCalls && functionCalls.length > 0 && turns < 5) {
      turns++;
      const functionResponses = await Promise.all(functionCalls.map(async (call) => {
        if (call.name === "searchGooglePatents") {
          try {
            const data = await patentService.searchGooglePatents(call.args.query as string);
            return {
              id: call.id,
              name: call.name,
              response: data
            };
          } catch (error: any) {
            return {
              id: call.id,
              name: call.name,
              response: { error: error.message }
            };
          }
        }
        
        // Handle unknown tools
        return {
          id: call.id,
          name: call.name,
          response: { error: `Unknown tool: ${call.name}` }
        };
      }));

      // Send tool outputs back to the model. 
      // Important: Provide the response parts as an array for the 'message' argument.
      result = await withExponentialBackoff(() => chat!.sendMessage({
        message: functionResponses.map((response) => ({
          functionResponse: response,
        })),
      }));
      functionCalls = result.functionCalls;
    }

    return { 
      text: result.text, 
      groundingMetadata: result.candidates?.[0]?.groundingMetadata,
      chatInstance: chat
    };
  } catch (err: any) {
    throw err;
  }
};

export const intelligentPatentSearch = async (
  query: string,
  sources: ('ip_au' | 'google')[]
): Promise<Patent[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API key missing");
  const ai = new GoogleGenAI({ apiKey });

  // Agent 1: Parse Query (Patent Attorney)
  const parsePrompt = `
  You are an experienced patent attorney. A client has asked you to search for patents based on the following query:
  "${query}"

  The client wants to search the following databases: ${sources.join(', ')}.
  
  Please analyze the query and determine the optimal search strings for each database.
  - For 'ip_au' (IP Australia), the search string should be optimized for Google Search grounding (e.g., specific keywords, company names).
  - For 'google' (Google Patents), the search string should be optimized for Google Patents (e.g., using assignee:"Company Name" or specific boolean operators if helpful).

  Return a JSON object with the optimized queries.
  `;

  const parseResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: parsePrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ip_au_query: { type: Type.STRING, description: "Optimized query for IP Australia" },
          google_query: { type: Type.STRING, description: "Optimized query for Google Patents" }
        }
      }
    }
  });

  const parsedQueries = JSON.parse(parseResponse.text || "{}");
  
  // Step 2: Perform Search
  let rawResults: Patent[] = [];
  const searchPromises: Promise<void>[] = [];
  
  if (sources.includes('ip_au') && parsedQueries.ip_au_query) {
    searchPromises.push((async () => {
      try {
        const ipAuResults = await fetchPatentsFromIPAustralia(parsedQueries.ip_au_query);
        rawResults.push(...ipAuResults.map(p => ({...p, source: 'IP Australia'})));
      } catch (e) {
        console.error("IP AU search failed", e);
      }
    })());
  }

  if (sources.includes('google') && parsedQueries.google_query) {
    searchPromises.push((async () => {
      try {
        const googleResults = await fetchPatentsFromGooglePatents(parsedQueries.google_query);
        rawResults.push(...googleResults.map(p => ({...p, source: 'Google Patents'})));
      } catch (e) {
        console.error("Google Patents search failed", e);
      }
    })());
  }

  await Promise.all(searchPromises);

  // Step 3: Check Accuracy (Reviewer Agent)
  if (rawResults.length === 0) return [];

  const reviewPrompt = `
  You are an expert patent reviewer.
  Original user query: "${query}"
  
  Here are the search results retrieved from the databases:
  ${JSON.stringify(rawResults, null, 2)}

  Please review these results and filter out any that are clearly irrelevant or do not match the user's original intent.
  CRITICAL RULE: If the user's query is a specific company name (e.g., "Pfizer", "Moderna"), you MUST ONLY return patents where that company is explicitly listed as the 'applicant' or 'assignee'. Do not return patents that merely mention the company in the title if they are not the assignee.
  
  Return a JSON array containing ONLY the 'appNum' (application numbers) of the patents that are accurate and relevant. You can return up to 50 results.
  `;

  const reviewResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: reviewPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const validAppNums: string[] = JSON.parse(reviewResponse.text || "[]");
  
  // Step 4: Output Results
  const finalResults = rawResults.filter(p => validAppNums.includes(p.appNum));
  
  return finalResults.length > 0 ? finalResults : rawResults;
};
