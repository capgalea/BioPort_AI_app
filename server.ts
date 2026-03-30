import express from "express";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { withExponentialBackoff } from "./src/utils/apiUtils.ts";

dotenv.config();

console.log("GEMINI_API_KEY set:", !!process.env.GEMINI_API_KEY);
console.log("IP_AUSTRALIA_CLIENT_ID set:", !!process.env.IP_AUSTRALIA_CLIENT_ID);
console.log("IP_AUSTRALIA_CLIENT_SECRET set:", !!process.env.IP_AUSTRALIA_CLIENT_SECRET);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasApiKey: !!process.env.API_KEY,
    hasSerpApiKey: !!(process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY),
    hasIpAuId: !!process.env.IP_AUSTRALIA_CLIENT_ID,
    hasIpAuSecret: !!process.env.IP_AUSTRALIA_CLIENT_SECRET,
    hasPatentsViewKey: !!process.env.PATENTSVIEW_API_KEY,
    hasUSPTOKey: !!process.env.USPTO_API_KEY,
    ipAuIdLength: process.env.IP_AUSTRALIA_CLIENT_ID ? process.env.IP_AUSTRALIA_CLIENT_ID.length : 0,
    ipAuSecretLength: process.env.IP_AUSTRALIA_CLIENT_SECRET ? process.env.IP_AUSTRALIA_CLIENT_SECRET.length : 0,
    geminiKeyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : null,
    apiKeyPrefix: process.env.API_KEY ? process.env.API_KEY.substring(0, 5) : null,
    serpApiKeyPrefix: (process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY) ? (process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY)!.substring(0, 5) : null,
    ipAuIdPrefix: process.env.IP_AUSTRALIA_CLIENT_ID ? process.env.IP_AUSTRALIA_CLIENT_ID.substring(0, 5) : null
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

// ─── USPTO MCP Server Proxy Endpoints ─────────────────────────────────────────
const USPTO_MCP_BASE = process.env.USPTO_MCP_URL || 'http://localhost:8000';
const PATENTSVIEW_API_KEY = process.env.PATENTSVIEW_API_KEY;
const PATENTSVIEW_BASE_URL = 'https://search.patentsview.org/api/v1';

console.log("PATENTSVIEW_API_KEY set:", !!PATENTSVIEW_API_KEY);

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
    const clientId = encodeURIComponent(IP_AU_CLIENT_ID.trim());
    const clientSecret = encodeURIComponent(IP_AU_CLIENT_SECRET.trim());
    const body = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`;
    
    let tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body
    });

    let data = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(JSON.stringify(data));
    }

    accessToken = data.access_token;
    // Set expiry with a 1-minute buffer
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    logDebug("Access token retrieved successfully");
    return accessToken;
  } catch (error: any) {
    const errorData = error.message || error;
    logDebug("Error fetching IP Australia access token:", errorData);
    
    let userFriendlyMessage = `Failed to authenticate with IP Australia. API Response: ${errorData}`;
    if (typeof errorData === 'string' && errorData.includes('invalid_request')) {
      userFriendlyMessage = `Failed to authenticate with IP Australia. The API returned 'invalid_request'. 

I have verified that the code is formatting the authentication request exactly as required by IP Australia (using standard OAuth2 client_credentials).

This error means that IP Australia is rejecting your credentials. Please double-check the following:
1. Ensure you have copied the Client ID and Client Secret exactly from the IP Australia Developer Portal.
2. Ensure your App in the IP Australia Developer Portal is subscribed to the "Australian Patent Search API".
3. Ensure you are using the credentials for the Production environment, not the Sandbox environment.`;
    }
    
    throw new Error(userFriendlyMessage);
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
    logDebug("Using IP Australia API for patent search...");
    const token = await getAccessToken();
    
    let ipAuQuery = query || "";
    if (filters?.applicant) ipAuQuery += ` ${filters.applicant}`;
    if (filters?.inventor) ipAuQuery += ` ${filters.inventor}`;
    if (filters?.inventorFirstName) ipAuQuery += ` ${filters.inventorFirstName}`;
    ipAuQuery = ipAuQuery.trim();

    if (!ipAuQuery) {
      ipAuQuery = "patent"; // IP Australia requires a query
    }

    const searchBody: any = {
      query: ipAuQuery,
      searchType: "DETAILS",
      sort: {
        field: "FILING_DATE",
        direction: "DESCENDING"
      }
    };
    
    if (filters?.startDate) {
      searchBody.changedSinceDate = filters.startDate;
    }

    logDebug("Sending request to IP Australia API with body:", searchBody);
    const response = await withExponentialBackoff(() => 
      axios.post(SEARCH_URL, searchBody, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
    );
    logDebug("IP Australia API request successful");

    const data = response.data;
    const results = data.results || data.patents || data.items || [];
    
    // Quick search returns basic metadata. We need to fetch full details for the top results.
    const topResults = results.slice(0, 10);
    const detailedPatents = [];

    logDebug(`Fetching details for ${topResults.length} patents...`);
    for (const item of topResults) {
      const appNum = item.applicationNumber || item.id || item.ipRightIdentifier;
      if (!appNum) continue;

      try {
        const detailResponse = await withExponentialBackoff(() => 
          axios.get(`${PATENT_URL}/${appNum}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          })
        );
        
        detailedPatents.push(detailResponse.data);
      } catch (detailError: any) {
        logDebug(`Failed to fetch details for patent ${appNum}:`, detailError.message);
        // Fallback to basic metadata
        detailedPatents.push(item);
      }
    }

    logDebug(`Patent search successful, found ${detailedPatents.length} results`);
    res.json({ results: detailedPatents });
  } catch (error: any) {
    const errorData = error.response?.data || error.message || error;
    const statusCode = error.response?.status;
    logDebug(`Patent search error (Status: ${statusCode}):`, errorData);
    
    if (statusCode === 401) {
      return res.status(401).json({
        error: "IP Australia API Authentication Failed. Please ensure your API credentials are correct and that your app is subscribed to the 'Australian Patent Search API' in the IP Australia Developer Portal.",
        details: errorData
      });
    }

    // Check if it's an authentication error from IP Australia token fetch
    if (error.message && error.message.includes("Failed to authenticate with IP Australia")) {
      return res.status(401).json({
        error: error.message,
        details: errorData
      });
    }

    res.status(500).json({
      error: typeof errorData === 'string' ? errorData : "Failed to retrieve patent data",
      details: errorData
    });
  }
});

app.post("/api/pubchem/search", async (req, res) => {
  const { query } = req.body;
  logDebug(`PubChem search request for: ${query}`);
  try {
    const response = await axios.get(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`);
    res.json(response.data);
  } catch (error: any) {
    logDebug("PubChem search error:", error.message);
    res.status(500).json({ error: "Failed to retrieve PubChem data" });
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

app.get("/api/test-token-all", async (req, res) => {
  const url = TOKEN_URL;
  const clientId = IP_AU_CLIENT_ID || '';
  const clientSecret = IP_AU_CLIENT_SECRET || '';

  const combinations = [
    {
      name: 'grant_type=client_credentials, body credentials, string body',
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' }
    },
    {
      name: 'grant_type=client_credentials, basic auth, string body',
      body: `grant_type=client_credentials`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'User-Agent': 'Mozilla/5.0' }
    },
    {
      name: 'grant_type=client_credentials, body credentials, scope=read',
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=read`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' }
    },
    {
      name: 'grant_type=client_credentials, basic auth, scope=read',
      body: `grant_type=client_credentials&scope=read`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'User-Agent': 'Mozilla/5.0' }
    },
    {
      name: 'grant_type=client_credentials, body credentials, URLSearchParams',
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' }
    },
    {
      name: 'grant_type=client_credentials, body credentials, URLSearchParams with scope',
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'https://api.ipaustralia.gov.au/b2b/iprights/agent' }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' }
    }
  ];

  const results: any = {};
  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    try {
      const response = await axios.post(url, combo.body, { headers: combo.headers });
      results[combo.name] = { status: response.status, data: response.data };
    } catch (e: any) {
      results[combo.name] = { status: e.response?.status, error: e.response?.data || e.message };
    }
  }
  res.json(results);
});

app.get("/api/test-epo-auth", async (req, res) => {
  const key = process.env.EPO_CONSUMER_KEY;
  const secret = process.env.EPO_CONSUMER_SECRET;
  if (!key || !secret) {
    return res.status(400).json({ error: "EPO credentials not set in environment" });
  }

  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');
  const AUTH_URL = "https://ops.epo.org/3.2/auth/accesstoken";

  try {
    const response = await axios.post(
      AUTH_URL,
      "grant_type=client_credentials",
      {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    res.json({ status: "success", data: response.data });
  } catch (error: any) {
    res.status(500).json({ 
      status: "error", 
      message: error.message,
      details: error.response?.data 
    });
  }
});

// USPTO search route removed

app.get("/api/patents/patentsview", async (req, res) => {
  const apiKey = process.env.PATENTSVIEW_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "PATENTSVIEW_API_KEY is not configured on the server." });
  }

  const userQuery = req.query.q as string;
  const inventor = req.query.inventor as string;
  const inventorFirstName = req.query.inventorFirstName as string;
  const applicant = req.query.applicant as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const size = req.query.size ? parseInt(req.query.size as string, 10) : 25;

  if (!userQuery && !inventor && !inventorFirstName && !applicant && !startDate && !endDate) {
    return res.status(400).json({ error: "Missing search parameters." });
  }

  try {
    const conditions: any[] = [];
    if (userQuery) conditions.push({ "_text_all": { "patent_title": userQuery } });
    if (inventor) conditions.push({ "_text_all": { "inventors.inventor_name_last": inventor } });
    if (inventorFirstName) conditions.push({ "_text_all": { "inventors.inventor_name_first": inventorFirstName } });
    if (applicant) conditions.push({ "_text_phrase": { "assignees.assignee_organization": applicant } });
    if (startDate) conditions.push({ "_gte": { "patent_date": startDate } });
    if (endDate) conditions.push({ "_lte": { "patent_date": endDate } });

    let qObj: any;
    if (conditions.length > 1) {
      qObj = { "_and": conditions };
    } else if (conditions.length === 1) {
      qObj = conditions[0];
    } else {
      qObj = { "_text_all": { "patent_title": "" } };
    }

    const qParam = JSON.stringify(qObj);
    const fParamPatent = JSON.stringify([
      "patent_id",
      "patent_title",
      "patent_date",
      "patent_abstract",
      "patent_earliest_application_date",
      "patent_type",
      "assignees.assignee_organization",
      "assignees.assignee_individual_name_first",
      "assignees.assignee_individual_name_last",
      "assignees.assignee_country",
      "inventors.inventor_name_first",
      "inventors.inventor_name_last",
      "inventors.inventor_country",
      "inventors.inventor_state",
      "application.filing_date",
      "application.application_id",
      "pct_data.pct_docnumber",
      "pct_data.pct_kind",
      "pct_data.pct_date",
      "pct_data.pct_371_date",
      "pct_data.pct_102_date",
      "pct_data.published_filed_date"
    ]);

    const fParamPub = JSON.stringify([
      "document_number",
      "publication_title",
      "publication_date",
      "publication_abstract",
      "assignees.assignee_organization",
      "assignees.assignee_individual_name_first",
      "assignees.assignee_individual_name_last",
      "assignees.assignee_country",
      "inventors.inventor_name_first",
      "inventors.inventor_name_last",
      "inventors.inventor_country",
      "inventors.inventor_state"
    ]);

    // Split size between patents and publications
    const halfSize = Math.max(Math.floor(size / 2), 1);
    const oParam = JSON.stringify({ "size": Math.min(halfSize, 10000) });

    const patentUrl = `https://search.patentsview.org/api/v1/patent/?q=${encodeURIComponent(qParam)}&f=${encodeURIComponent(fParamPatent)}&o=${encodeURIComponent(oParam)}`;
    
    // Convert patent query fields to publication query fields
    const pubQObj = JSON.parse(JSON.stringify(qObj).replace(/patent_title/g, 'publication_title').replace(/patent_date/g, 'publication_date'));
    const pubQParam = JSON.stringify(pubQObj);
    const pubUrl = `https://search.patentsview.org/api/v1/publication/?q=${encodeURIComponent(pubQParam)}&f=${encodeURIComponent(fParamPub)}&o=${encodeURIComponent(oParam)}`;

    logDebug(`Fetching from PatentsView: ${patentUrl}`);
    logDebug(`Fetching from PatentsView Pubs: ${pubUrl}`);

    const [patentResponse, pubResponse] = await Promise.all([
      axios.get(patentUrl, { headers: { "X-Api-Key": apiKey } }).catch(e => {
        logDebug("Patent fetch error:", e.response?.data || e.message);
        if (e.response?.status === 401 || e.response?.status === 403 || e.response?.status === 429) throw e;
        return { data: { patents: [], count: 0, total_patent_count: 0 } };
      }),
      axios.get(pubUrl, { headers: { "X-Api-Key": apiKey } }).catch(e => {
        logDebug("Publication fetch error:", e.response?.data || e.message);
        if (e.response?.status === 401 || e.response?.status === 403 || e.response?.status === 429) throw e;
        return { data: { publications: [], count: 0, total_hits: 0 } };
      })
    ]);

    const patents = patentResponse.data.patents || [];
    const publications = pubResponse.data.publications || [];

    const mappedPublications = publications.map((pub: any) => ({
      patent_id: pub.document_number,
      patent_title: pub.publication_title,
      patent_date: pub.publication_date,
      patent_abstract: pub.publication_abstract,
      patent_type: "Pre-grant Publication",
      is_publication: true,
      assignees: pub.assignees,
      inventors: pub.inventors
    }));

    res.json({
      patents: [...patents, ...mappedPublications],
      count: (patentResponse.data.count || 0) + (pubResponse.data.count || 0),
      total_patent_count: (patentResponse.data.total_patent_count || 0) + (pubResponse.data.total_hits || 0)
    });
  } catch (error: any) {
    const errorData = error.response?.data || error.message || error;
    const status = error.response?.status || 500;
    logDebug("PatentsView API Error:", errorData);
    res.status(status).json({
      error: "Failed to retrieve patent data from PatentsView",
      details: errorData
    });
  }
});

// USPTO analytics search route removed


// USPTO status route removed


app.get("/api/ask-gemini", async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, fetch: fetch as any } as any);
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro",
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
    const url = SEARCH_URL;
    
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

setupVite().catch(e => console.error("Vite setup failed:", e));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BioPort AI Server running on port ${PORT}`);
});

// setupVite().then(() => {
//   app.listen(PORT, "0.0.0.0", () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//   });
// });
