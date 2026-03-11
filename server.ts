import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { withExponentialBackoff } from "./src/utils/apiUtils.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasApiKey: !!process.env.API_KEY,
    hasSerpApiKey: !!(process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY),
    geminiKeyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : null,
    apiKeyPrefix: process.env.API_KEY ? process.env.API_KEY.substring(0, 5) : null,
    serpApiKeyPrefix: (process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY) ? (process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY)!.substring(0, 5) : null
  });
});

// IP Australia API Configuration
const IP_AU_CLIENT_ID = process.env.IP_AUSTRALIA_CLIENT_ID;
const IP_AU_CLIENT_SECRET = process.env.IP_AUSTRALIA_CLIENT_SECRET;
const TOKEN_URL = "https://production.api.ipaustralia.gov.au/public/external-token-api/v1/access_token";
const SEARCH_URL = "https://production.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search/quick";
const PATENT_URL = "https://production.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/patent";
const SERPAPI_KEY = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY;
const SERPAPI_URL = "https://serpapi.com/search.json";

let accessToken: string | null = null;
let tokenExpiry: number = 0;

import fs from "fs";

function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ""}\n`;
  fs.appendFileSync("debug.log", logEntry);
  console.log(message, data || "");
}

async function getAccessToken() {
  logDebug("IP_AU_CLIENT_ID:", IP_AU_CLIENT_ID ? "set" : "not set");
  logDebug("IP_AU_CLIENT_SECRET:", IP_AU_CLIENT_SECRET ? "set" : "not set");
  if (!IP_AU_CLIENT_ID || !IP_AU_CLIENT_SECRET) {
    throw new Error("IP Australia API credentials are not configured.");
  }
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  logDebug("Fetching new IP Australia access token...");
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', IP_AU_CLIENT_ID);
    params.append('client_secret', IP_AU_CLIENT_SECRET);

    const response = await withExponentialBackoff(() => 
      axios.post(TOKEN_URL, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
      })
    );

    accessToken = response.data.access_token;
    // Set expiry with a 1-minute buffer
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    logDebug("Access token retrieved successfully");
    return accessToken;
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    logDebug("Error fetching IP Australia access token:", errorData);
    throw new Error(`Failed to authenticate with IP Australia: ${JSON.stringify(errorData)}`);
  }
}

// API Routes
import { fetchDetailedPatentsFromIPAustralia } from "./services/geminiService.ts";

app.post("/api/patents/search", async (req, res) => {
  const { query, filters, source } = req.body;
  logDebug(`Patent search request for: ${query} (Source: ${source})`);
  
  // If source is Google Patents, try SerpApi first if key is available
  if (source === 'google' && SERPAPI_KEY) {
    try {
      logDebug("Prioritizing SerpApi for Google Patents search...");
      const serpResponse = await axios.get(SERPAPI_URL, {
        params: {
          engine: "google_patents",
          q: query,
          api_key: SERPAPI_KEY,
          num: 10
        }
      });
      
      const serpResults = serpResponse.data.organic_results || serpResponse.data.results;
      
      if (serpResults && Array.isArray(serpResults)) {
        logDebug(`SerpApi search successful, found ${serpResults.length} results`);
        const mappedResults = serpResults.map((item: any) => ({
          applicationNumber: item.publication_number || item.patent_id || "",
          title: item.title || "",
          applicants: [item.assignee || item.company || ""],
          status: "Published",
          dateFiled: item.filing_date || item.date || "",
          id: item.publication_number || item.patent_id || ""
        }));
        return res.json({ results: mappedResults });
      }
    } catch (serpError: any) {
      logDebug("Initial SerpApi attempt failed, will try IP Australia or fallback:", serpError.message);
    }
  }

  try {
    logDebug("Using Gemini to fetch detailed patents from IP Australia...");
    const patents = await fetchDetailedPatentsFromIPAustralia(query);
    logDebug(`Patent search successful, found ${patents.length} results`);
    res.json({ results: patents });
  } catch (error: any) {
    const errorData = error.message || error;
    logDebug("Patent search error, attempting SerpApi fallback:", errorData);
    
    // SerpApi Fallback
    if (SERPAPI_KEY) {
      try {
        logDebug("Using SerpApi for patent search fallback...");
        const serpResponse = await axios.get(SERPAPI_URL, {
          params: {
            engine: "google_patents",
            q: query,
            api_key: SERPAPI_KEY,
            num: 10
          }
        });
        
        const serpResults = serpResponse.data.organic_results || serpResponse.data.results;
        
        if (serpResults && Array.isArray(serpResults)) {
          logDebug(`SerpApi search successful, found ${serpResults.length} results`);
          // Map SerpApi results to a structure similar to what the app expects
          const mappedResults = serpResults.map((item: any) => ({
            applicationNumber: item.publication_number || item.patent_id || "",
            title: item.title || "",
            applicants: [item.assignee || item.company || ""],
            status: "Published",
            dateFiled: item.filing_date || item.date || "",
            id: item.publication_number || item.patent_id || ""
          }));
          return res.json({ results: mappedResults });
        } else {
          logDebug("SerpApi returned no results or unexpected structure", serpResponse.data);
        }
      } catch (serpError: any) {
        logDebug("SerpApi fallback failed:", serpError.message);
      }
    }

    res.status(500).json({
      error: typeof errorData === 'string' ? errorData : "Failed to retrieve patent data",
      details: errorData
    });
  }
});

// ...
app.post("/api/log-error", (req, res) => {
  fs.appendFileSync("error.log", JSON.stringify(req.body) + "\n");
  res.status(200).send("Logged");
});

app.get("/api/test-serpapi", async (req, res) => {
  if (!SERPAPI_KEY) {
    return res.status(400).json({ error: "SERPAPI_API_KEY is not set in environment variables." });
  }

  try {
    logDebug("Testing SerpApi connection...");
    const response = await axios.get(SERPAPI_URL, {
      params: {
        engine: "google_patents",
        q: "biotech",
        api_key: SERPAPI_KEY,
        num: 10
      }
    });

    if (response.data && response.data.search_metadata && response.data.search_metadata.status === "Success") {
      logDebug("SerpApi test successful");
      return res.json({ 
        status: "success", 
        message: "SerpApi key is working correctly.",
        results_count: response.data.results?.length || 0
      });
    } else {
      logDebug("SerpApi test failed: Unexpected response structure", response.data);
      return res.status(500).json({ 
        status: "error", 
        message: "SerpApi returned an unexpected response.",
        details: response.data
      });
    }
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    logDebug("SerpApi test failed:", errorData);
    return res.status(error.response?.status || 500).json({ 
      status: "error", 
      message: "Failed to connect to SerpApi.",
      details: errorData
    });
  }
});



app.get("/api/test-token", async (req, res) => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', IP_AU_CLIENT_ID || '');
    params.append('client_secret', IP_AU_CLIENT_SECRET || '');

    const response = await axios.post(TOKEN_URL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.get("/api/test-token-env", async (req, res) => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', IP_AU_CLIENT_ID || '');
    params.append('client_secret', IP_AU_CLIENT_SECRET || '');

    const response = await axios.post("https://test.api.ipaustralia.gov.au/public/external-token-api/v1/access_token", params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.get("/api/test-token-basic", async (req, res) => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const auth = Buffer.from(`${IP_AU_CLIENT_ID}:${IP_AU_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(TOKEN_URL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${auth}`
      }
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.get("/api/ask-gemini", async (req, res) => {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "What is the correct JSON payload for the IP Australia Australian Patent Search API v1 POST /search/quick endpoint? Please provide an example.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    res.json({ answer: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/ask-gemini", async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "What is the correct JSON payload for the IP Australia Australian Patent Search API v1 POST /search/quick endpoint? Please provide an example. I need the exact properties it expects.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    res.json({ answer: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.get("/api/test-swagger", async (req, res) => {
  try {
    const token = await getAccessToken();
    const url = "https://test.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search/quick";
    
    const payloads = [
      { query: "biotech" },
      { searchText: "biotech" },
      { searchTerm: "biotech" },
      { keyword: "biotech" },
      { text: "biotech" },
      { q: "biotech" },
      { search: "biotech" },
      "biotech"
    ];

    const results: any = {};
    for (let i = 0; i < payloads.length; i++) {
      try {
        const response = await axios.post(url, payloads[i], {
          headers: { Authorization: `Bearer ${token}` }
        });
        results[`payload_${i}`] = { status: response.status, data: response.data };
      } catch (e: any) {
        results[`payload_${i}`] = { status: e.response?.status, error: e.response?.data || e.message };
      }
    }
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.get("/api/test-serp", async (req, res) => {
  try {
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        q: "\"australian-patent-search-api\" \"search/quick\" request",
        api_key: process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY
      }
    });
    res.json(response.data.organic_results?.slice(0, 5) || response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, falling back to static serving");
      const distPath = path.join(__dirname, "dist");
      app.use(express.static(distPath));
      app.get(/.*/, (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
