import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: "What are the exact field names for the PatentsView API v1 endpoint for pregrant publications (e.g. publication_id, publication_title, etc)? And what is the exact endpoint URL path (e.g. /api/v1/pregrant_publication/ or /api/v1/publication/)?",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  console.log(response.text);
}
run();
