import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function ask() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "I am getting an 'invalid_request' error when calling the IP Australia API token endpoint https://production.api.ipaustralia.gov.au/public/external-token-api/v1/access_token. I am sending grant_type=client_credentials, client_id, and client_secret in the body as application/x-www-form-urlencoded. What could be the cause of 'invalid_request' for this specific API? Is there a specific format or parameter I am missing?",
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true }
    }
  });
  console.log(response.text);
}

ask();
