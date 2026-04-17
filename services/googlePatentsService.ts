import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Patent } from "../types.ts";
import { withExponentialBackoff } from "../src/utils/apiUtils.ts";
import { PatentFilters } from "./patentService.ts";

export const fetchPatentsFromGooglePatents = async (
  query: string,
  filters?: PatentFilters,
  limit: number = 20
): Promise<Patent[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return [];

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
  4. ZERO HALLUCINATION POLICY: DO NOT invent patents. Only return factual data backed by the search results.
  `;

  try {
    const response: GenerateContentResponse = await withExponentialBackoff(() =>
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 1024 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                applicationNumber: { type: Type.STRING },
                title: { type: Type.STRING },
                abstract: { type: Type.STRING },
                dateFiled: { type: Type.STRING },
                dateGranted: { type: Type.STRING },
                url: { type: Type.STRING },
                status: { type: Type.STRING },
                applicants: { type: Type.ARRAY, items: { type: Type.STRING } },
                inventors: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["applicationNumber", "title", "dateFiled", "url", "status", "applicants", "inventors"]
            }
          }
        }
      })
    );

    const text = response.text || "[]";
    let data: any[] = [];
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Google Patents JSON:", e);
    }

    return data.map((p: any) => ({
      applicationNumber: p.applicationNumber || "Unknown",
      title: p.title || "Untitled Patent",
      abstract: p.abstract || "",
      dateFiled: p.dateFiled || "",
      dateGranted: p.dateGranted || "",
      url: p.url || `https://patents.google.com/patent/${p.applicationNumber}`,
      status: p.status || "Granted",
      owners: p.applicants || (filters?.applicant ? [filters.applicant] : []),
      applicants: p.applicants || (filters?.applicant ? [filters.applicant] : []),
      inventors: p.inventors || [],
      claim: "",
      description: "",
      family: "",
      familyJurisdictions: [],
      datePublished: p.dateGranted || "",
      earliestPriorityDate: "",
      citedWork: [],
      source: "Google Patents"
    }));
  } catch (error) {
    console.error("Error fetching from Google Patents:", error);
    return [];
  }
};
