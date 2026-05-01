import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Patent } from "../types.ts";
import { withExponentialBackoff } from "../src/utils/apiUtils.ts";
import { PatentFilters } from "./patentService.ts";

export const fetchPatentsFromGooglePatents = async (
  query: string,
  filters?: PatentFilters,
  limit: number = 20
): Promise<Patent[]> => {
  let apiKey = '';
  if (typeof process !== 'undefined' && process.env) {
    apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  }
  // Try import.meta.env if available (Vite)
  if (!apiKey && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';
  }
  // Fallback to the globally defined process.env.API_KEY injected by Vite
  if (!apiKey) {
    try {
      apiKey = process.env.API_KEY as string;
    } catch (e) {
      // ignore
    }
  }

  if (!apiKey) return [];
  console.log("googlePatentsService apiKey length:", apiKey.length);

  const ai = new GoogleGenAI({ apiKey, fetch: fetch as any } as any);

  const assigneePrompt = filters?.applicant ? `where the assignee/applicant is exactly or closely matching "${filters.applicant}"` : '';
  const queryPrompt = query ? `related to the technology domain or keywords: "${query}"` : '';
  const countriesPrompt = filters?.countries && filters.countries.length > 0 ? `in the following jurisdictions: ${filters.countries.join(', ')}` : '';
  
  const prompt = `
  Search Google Patents for the most recently granted patents ${queryPrompt} ${assigneePrompt} ${countriesPrompt}.
  
  INSTRUCTIONS:
  1. Find up to ${limit} recently GRANTED patents ${queryPrompt} ${assigneePrompt} ${countriesPrompt}.
  2. Only include patents that have been granted (status: "Granted").
  3. Return a JSON array of objects with the following keys:
     - applicationNumber (string, e.g., "US-1234567-B2")
     - title (string)
     - abstract (string, keep it brief)
     - dateFiled (string, YYYY-MM-DD or similar)
     - dateGranted (string, YYYY-MM-DD or similar)
     - url (string, full Google Patents URL starting with https://patents.google.com/patent/)
     - status (string, must be "Granted")
     - applicants (array of strings, the companies or institutions that applied for/own the patent)
     - inventors (array of strings, the people who invented the patent)
     - patentKind (string, e.g., "A", "B1", "B2")
     - familyId (string, the patent family ID)
  4. ZERO HALLUCINATION POLICY: DO NOT invent patents. Only return factual data backed by the search results.
  `;

  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() =>
      ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt + "\n\nIMPORTANT: Return a JSON object with a single property 'patents' containing the array of requested items.",
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 1024 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              patents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    applicationNumber: { type: Type.STRING },
                    title: { type: Type.STRING },
                    abstract: { type: Type.STRING },
                    patentKind: { type: Type.STRING },
                    familyId: { type: Type.STRING },
                    dateFiled: { type: Type.STRING },
                    dateGranted: { type: Type.STRING },
                    url: { type: Type.STRING },
                    status: { type: Type.STRING },
                    applicants: { type: Type.ARRAY, items: { type: Type.STRING } },
                    inventors: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["applicationNumber", "title", "dateFiled", "url", "status", "applicants", "inventors", "abstract", "patentKind", "familyId"]
                }
              },
              answer: { type: Type.STRING },
              summary: { type: Type.STRING },
              references: { type: Type.ARRAY, items: { type: Type.STRING } },
              rating: { type: Type.STRING },
              feedback: { type: Type.STRING },
              technicalFields: { type: Type.ARRAY, items: { type: Type.STRING } },
              keyClaimsSummary: { type: Type.STRING },
              noveltyOverPriorArt: { type: Type.STRING },
              pctStatusInfo: { type: Type.STRING },
              designatedStates: { type: Type.ARRAY, items: { type: Type.STRING } },
              assignees: { type: Type.ARRAY, items: { type: Type.STRING } },
              names: { type: Type.ARRAY, items: { type: Type.STRING } },
              companies: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      })
    );

    const text = response.text || "{}";
    console.log("Model response text length:", text.length);
    let data: any[] = [];
    try {
      const parsed = JSON.parse(text);
      if (parsed.patents && Array.isArray(parsed.patents)) {
         data = parsed.patents;
      }
    } catch (e) {
      console.error("Failed to parse Google Patents JSON:", e);
      console.log("Raw text was:", text);
    }

    return data.map((p: any) => ({
      applicationNumber: p.applicationNumber || "Unknown",
      actualApplicationNumber: p.applicationNumber || "Unknown",
      title: p.title || "Untitled Patent",
      abstract: p.abstract || "",
      patentKind: p.patentKind || "",
      familyId: p.familyId || "",
      dateFiled: p.dateFiled || "",
      dateGranted: p.dateGranted || "",
      url: p.url || `https://patents.google.com/patent/${p.applicationNumber}`,
      status: p.status || "Granted",
      owners: p.applicants || (filters?.applicant ? [filters.applicant] : []),
      applicants: p.applicants || (filters?.applicant ? [filters.applicant] : []),
      inventors: p.inventors || [],
      claim: "",
      description: "",
      family: p.familyId || "",
      familyJurisdictions: [],
      datePublished: p.dateGranted || "",
      earliestPriorityDate: "",
      citedWork: [],
      source: "Google Patents"
    }));
  } catch (error: any) {
    console.error("Error fetching from Google Patents:", error.message || error);
    if (error.stack) console.error(error.stack);
    return [];
  }
};
