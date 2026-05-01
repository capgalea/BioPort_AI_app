import { GoogleGenAI, Type } from "@google/genai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, fetch: fetch as any } as any);
  
  const companyName = "Pfizer";
  const strictFilterInstruction = `STRICT ENTITY SCOPING (ZERO NOISE PROTOCOL): Every single news item MUST be specifically and explicitly about "${companyName}". 
DO NOT include general industry news, news about competitors, or market-wide trends UNLESS "${companyName}" is a lead subject. 
If NO direct news for "${companyName}" exists in the search results for this time window, return an EMPTY ARRAY []. 
It is better to return nothing than to return unrelated industry news.`;

  const prompt = `
  Synthesize a comprehensive briefing of the TOP 20 high-impact biotech and pharmaceutical headlines from the last 7 days.
  Target Entity: "${companyName}"
  SELECTED FOCUS CATEGORIES: major clinical trial results, FDA/EMA regulatory approvals, high-impact M&A, strategic industry partnerships, and market analysis reports/forecasts
  
  INSTRUCTIONS:
  1. Use Google Search to find verified, professional news from authoritative sources (Endpoints News, Stat News, BioSpace, Reuters, GlobeNewswire, BioWorld).
  2. ${strictFilterInstruction}
  3. DATE VERIFICATION (CRITICAL): Only include articles published within the last 7 days. Verify timestamps.
  4. Map each news item into one of these categories: Industry, Regulatory, Clinical, Financial, Reports (use 'Reports' for market forecasts, whitepapers, and future projections).
  5. Provide exactly 20 results if the data exists.
  
  LINK REQUIREMENTS (CRITICAL):
  6. COPY THE REAL URL: You must provide the EXACT, FULL source URL for every article from the search results. 
  7. ABSOLUTE URLS: Every URL must start with "https://". 
  8. NO HALLUCINATIONS: Do NOT invent plausible-sounding URLs. If a specific direct link to a headline is not confirmed in the search data, do not include that headline in the JSON.
  
  FORMAT: JSON array of objects with keys: title, source, timeAgo (e.g. '2h ago'), url, category, summary (max 15 words).
  `;

  console.log("Sending prompt to model");
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview", 
    contents: prompt + "\n\nIMPORTANT: Return a JSON object with a single property 'news' containing the array of requested items.",
    config: { 
      tools: [{ googleSearch: {} }], 
      temperature: 0.05, 
      thinkingConfig: { thinkingBudget: 2048 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          news: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                source: { type: Type.STRING },
                timeAgo: { type: Type.STRING },
                url: { type: Type.STRING },
                category: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["title", "source", "timeAgo", "url", "category", "summary"]
            }
          }
        }
      }
    },
  });

  console.log("Response:", response.text);
  console.log("GroundingChunks:", response.candidates?.[0]?.groundingMetadata?.groundingChunks?.length);
}
main();
