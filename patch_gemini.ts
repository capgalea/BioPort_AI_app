import { readFileSync, writeFileSync } from 'fs';

const file = 'services/geminiService.ts';
let content = readFileSync(file, 'utf8');

const targetStr = `    if (news.length > 0) {
      try {
        // Check URLs via backend proxy`;

const replacementStr = `    if (news.length === 0 && companyName) {
      try {
        const fallbackPrompt = \`
        Search the official corporate website, "press releases" section, or "newsroom" for "\${companyName}".
        Find the most recent 5 relevant announcements or updates from the company itself in the last \${periodStr}.
        IMPORTANT: Only include results that come directly from the company's official domain, and ONLY about "\${companyName}".
        Return exactly in the same JSON format as previously requested.
        \`;
        
        const fbResponse = await withExponentialBackoff(() => 
          generateContentWithTracking(ai, {
            model: "gemini-3.1-pro-preview", 
            contents: fallbackPrompt + "\\n\\nIMPORTANT: Return a JSON object with a single property 'news' containing the array of requested items.",
            config: { 
              tools: [{ googleSearch: {} }], 
              temperature: 0.1,
              thinkingConfig: { thinkingBudget: 1024 }, 
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
          })
        );
        
        const fbRawText = fbResponse.text || "{}";
        const fbParsedData = extractJson(fbRawText) || {};
        const fbData = Array.isArray(fbParsedData) ? fbParsedData : (fbParsedData.news || []);
        const fbDataArray = Array.isArray(fbData) ? fbData : [];
        
        const fbGroundingMetadata = fbResponse.candidates?.[0]?.groundingMetadata;
        const fbChunks = fbGroundingMetadata?.groundingChunks || [];
        const fbWebChunks = fbChunks.map(chunk => chunk.web).filter(Boolean);
        const fbSupports = fbGroundingMetadata?.groundingSupports || [];

        news = fbDataArray.map((item: any, idx: number) => {
           let cleanUrl = (item.url || '').trim();
           if (fbWebChunks.length > 0) {
             let supportedUrl = null;
             if (fbSupports.length > 0) {
               const titleIndex = item.title ? fbRawText.indexOf(item.title) : -1;
               const summaryIndex = item.summary ? fbRawText.indexOf(item.summary) : -1;
               for (const support of fbSupports) {
                 const start = support.segment?.startIndex || 0;
                 const end = support.segment?.endIndex || 0;
                 const matchesTitle = titleIndex !== -1 && titleIndex >= start && titleIndex <= end;
                 const matchesSummary = summaryIndex !== -1 && summaryIndex >= start && summaryIndex <= end;
                 if ((matchesTitle || matchesSummary) && support.groundingChunkIndices?.length > 0) {
                   const chunkIndex = support.groundingChunkIndices[0];
                   if (fbChunks[chunkIndex]?.web?.uri) {
                     supportedUrl = fbChunks[chunkIndex].web.uri;
                     break;
                   }
                 }
               }
             }
             if (supportedUrl) {
               cleanUrl = supportedUrl;
             } else if (!cleanUrl.startsWith('http') && fbWebChunks[idx]?.uri) {
               cleanUrl = fbWebChunks[idx].uri;
             }
           }
           if (cleanUrl && !cleanUrl.startsWith('http')) {
              cleanUrl = 'https://' + cleanUrl;
           }
           return {
             ...item,
             url: cleanUrl,
             id: \`news-fb-\${idx}-\${Date.now()}\`
           };
        }).filter((item: any) => {
          try {
            const urlObj = new URL(item.url);
            return urlObj.pathname.length > 1 || urlObj.search.length > 0;
          } catch (e) {
            return false;
          }
        });
      } catch (fbErr) {
        console.warn("Fallback fetch failed", fbErr);
      }
    }

    if (news.length > 0) {
      try {
        // Check URLs via backend proxy`;

content = content.replace(targetStr, replacementStr);
writeFileSync(file, content, 'utf8');
console.log("Patched geminiService.ts successfully");
