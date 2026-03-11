import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

async function run() {
  const prompt = `Search for the official API documentation for "IP Australia Australian Patent Search API". 
  Specifically, I need to know the exact JSON payload structure for the POST request to the /v1/search/quick endpoint or /v1/search endpoint.
  What are the required fields? Provide an example JSON payload.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0
    }
  });
  
  console.log(response.text);
}

run();
