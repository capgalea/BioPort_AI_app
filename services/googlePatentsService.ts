import { GoogleGenAI, Type } from "@google/genai";
import { Patent } from '../types';

export const fetchPatentsFromGooglePatents = async (query: string): Promise<Patent[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Search Google Patents for recent patents assigned to "${query}". For each patent found, provide the official Google Patents URL (must start with https://patents.google.com/), title, filing date, application number, and status. Return the results as a JSON array of Patent objects.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            applicationNumber: { type: Type.STRING },
            title: { type: Type.STRING },
            dateFiled: { type: Type.STRING },
            url: { type: Type.STRING, description: "Must be a full URL starting with https://patents.google.com/" },
            status: { type: Type.STRING },
          },
          required: ["applicationNumber", "title", "dateFiled", "url", "status"],
        },
      },
    },
  });

  const patents = JSON.parse(response.text || "[]");
  return patents.map((p: any) => ({
    ...p,
    url: p.url.startsWith('http') ? p.url : `https://${p.url}`,
    owners: [query],
    applicants: [query],
    inventors: [],
    abstract: "",
    claim: "",
    description: "",
    family: "",
    familyJurisdictions: ["US"],
    datePublished: "",
    earliestPriorityDate: "",
    dateGranted: "",
    citedWork: [],
    source: "Google Patents",
    actualApplicationNumber: p.applicationNumber,
  }));
};
