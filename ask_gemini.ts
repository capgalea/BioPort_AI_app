import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, fetch: fetch as any } as any);

async function run() {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'What is the correct JSON payload for the IP Australia Australian Patent Search API v1 POST /search/quick endpoint? Please provide an example.',
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  console.log(response.text);
}
run();
