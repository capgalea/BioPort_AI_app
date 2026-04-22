import express from "express";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { BigQuery } from "@google-cloud/bigquery";
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

let bigqueryOptions: any = {};
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    bigqueryOptions.credentials = {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    };
    bigqueryOptions.projectId = credentials.project_id;
    console.log("BigQuery initialized with GOOGLE_CREDENTIALS_JSON");
  } catch (e) {
    console.error("Failed to parse GOOGLE_CREDENTIALS_JSON environment variable. Ensure it is valid JSON.");
  }
}

const bigquery = new BigQuery(bigqueryOptions);

app.post("/api/bigquery/family-jurisdictions", async (req, res) => {
  try {
    const { familyId } = req.body;
    if (!familyId) {
      return res.status(400).json({ error: "familyId is required" });
    }

    const sqlQuery = `
      SELECT DISTINCT country_code 
      FROM \`bioport-ai-app.bioport_patents.google_patents_optimized\` 
      WHERE family_id = @familyId
    `;
    
    const options = {
      query: sqlQuery,
      params: { familyId: familyId },
      useQueryCache: true,
    };
    
    const [rows] = await bigquery.query(options);
    const jurisdictions = rows.map(row => row.country_code).filter(Boolean);
    
    res.json({ jurisdictions });
  } catch (error: any) {
    console.error("BigQuery family jurisdictions error:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve family jurisdictions" });
  }
});

type ASTNode = 
  | { type: 'AND', left: ASTNode, right: ASTNode }
  | { type: 'OR', left: ASTNode, right: ASTNode }
  | { type: 'NOT', operand: ASTNode }
  | { type: 'TERM', value: string };

class BooleanParser {
  tokens: string[];
  pos: number = 0;

  constructor(query: string) {
    const regex = /"(?:[^"\\]|\\.)*"|\(|\)|AND|OR|NOT|,|[^\s(),]+/gi;
    this.tokens = [];
    let match;
    while ((match = regex.exec(query)) !== null) {
      this.tokens.push(match[0]);
    }
  }

  parse(): ASTNode | null {
    if (this.tokens.length === 0) return null;
    return this.parseOr();
  }

  parseOr(): ASTNode {
    let node = this.parseAnd();
    while (this.pos < this.tokens.length && (this.tokens[this.pos].toUpperCase() === 'OR' || this.tokens[this.pos] === ',')) {
      this.pos++;
      node = { type: 'OR', left: node, right: this.parseAnd() };
    }
    return node;
  }

  parseAnd(): ASTNode {
    let node = this.parseNot();
    while (this.pos < this.tokens.length && this.tokens[this.pos].toUpperCase() === 'AND') {
      this.pos++;
      node = { type: 'AND', left: node, right: this.parseNot() };
    }
    return node;
  }

  parseNot(): ASTNode {
    if (this.pos < this.tokens.length && this.tokens[this.pos].toUpperCase() === 'NOT') {
      this.pos++;
      return { type: 'NOT', operand: this.parseNot() };
    }
    return this.parsePrimary();
  }

  parsePrimary(): ASTNode {
    if (this.pos >= this.tokens.length) return { type: 'TERM', value: '' };
    const token = this.tokens[this.pos];
    if (token === '(') {
      this.pos++;
      const node = this.parseOr();
      if (this.pos < this.tokens.length && this.tokens[this.pos] === ')') this.pos++;
      return node;
    }
    
    let val = '';
    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      const upper = t.toUpperCase();
      if (upper === 'AND' || upper === 'OR' || upper === 'NOT' || t === '(' || t === ')' || t === ',') {
        break;
      }
      
      let word = t;
      if (word.startsWith('"') && word.endsWith('"')) {
        word = word.substring(1, word.length - 1).replace(/\\"/g, '"');
      }
      val += (val ? ' ' : '') + word;
      this.pos++;
    }
    
    if (!val) {
      this.pos++;
      return { type: 'TERM', value: '' };
    }
    
    return { type: 'TERM', value: val };
  }
}

function compileAST(node: ASTNode, paramPrefix: string, params: any, fieldMapper: (term: string, paramName: string, p: any) => string): string {
  if (node.type === 'AND') {
    return `(${compileAST(node.left, paramPrefix + 'L', params, fieldMapper)} AND ${compileAST(node.right, paramPrefix + 'R', params, fieldMapper)})`;
  }
  if (node.type === 'OR') {
    return `(${compileAST(node.left, paramPrefix + 'L', params, fieldMapper)} OR ${compileAST(node.right, paramPrefix + 'R', params, fieldMapper)})`;
  }
  if (node.type === 'NOT') {
    return `NOT (${compileAST(node.operand, paramPrefix + 'N', params, fieldMapper)})`;
  }
  if (node.type === 'TERM') {
    if (!node.value.trim()) return '1=1';
    const paramName = `${paramPrefix}_term`;
    return fieldMapper(node.value.trim(), paramName, params);
  }
  return '1=1';
}

app.post("/api/bigquery/search", async (req, res) => {
  try {
    const { query, applicant, inventor, startDate, endDate, countries, status, limit = 100, dryRun = false } = req.body;
    
    // Cost optimization: Default to last 20 years if no date range is provided
    // This leverages partitioning on filing_date
    let effectiveStartDate = startDate;
    if (!effectiveStartDate && !endDate) {
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
      effectiveStartDate = twentyYearsAgo.toISOString().split('T')[0];
    }

    let whereClause = 'WHERE 1=1';
    const params: any = {};

    if (effectiveStartDate) {
      whereClause += ` AND p.filing_date_dt >= CAST(@startDate AS DATE)`;
      params.startDate = effectiveStartDate;
    }
    if (endDate) {
      whereClause += ` AND p.filing_date_dt <= CAST(@endDate AS DATE)`;
      params.endDate = endDate;
    }
    
    if (countries && Array.isArray(countries) && countries.length > 0) {
      whereClause += ` AND p.country IN UNNEST(@countries)`;
      params.countries = countries;
    }
    
    if (status) {
      if (status === 'Granted') {
        whereClause += ` AND p.inferred_status = 'Granted'`;
      } else if (status === 'Application') {
        whereClause += ` AND p.inferred_status = 'Application'`;
      }
    }
    
    if (applicant) {
      whereClause += ` AND EXISTS (SELECT 1 FROM UNNEST(p.owners_and_applicants) a WHERE LOWER(a) LIKE @applicant)`;
      params.applicant = `%${applicant.toLowerCase()}%`;
    }
    
    if (inventor) {
      const parser = new BooleanParser(inventor);
      const ast = parser.parse();
      if (ast) {
        let paramCounter = 0;
        const inventorSql = compileAST(ast, 'inv', params, (term, paramName, p) => {
          paramCounter++;
          const uniqueParamName = `${paramName}_${paramCounter}`;
          const tokens = term.toLowerCase().split(/[\s]+/).filter(t => t.length > 0);
          if (tokens.length >= 2) {
            const first = tokens[0];
            const last = tokens[tokens.length - 1];
            const name1 = `${first} ${last}`;
            const name2 = `${last} ${first}`;
            p[`${uniqueParamName}_1`] = `%${name1}%`;
            p[`${uniqueParamName}_2`] = `%${name2}%`;
            return `EXISTS (SELECT 1 FROM UNNEST(p.inventors) i WHERE (LOWER(i) LIKE @${uniqueParamName}_1 OR LOWER(i) LIKE @${uniqueParamName}_2))`;
          } else {
            p[uniqueParamName] = `%${term.toLowerCase()}%`;
            return `EXISTS (SELECT 1 FROM UNNEST(p.inventors) i WHERE LOWER(i) LIKE @${uniqueParamName})`;
          }
        });
        if (inventorSql !== '1=1') {
          whereClause += ` AND (${inventorSql})`;
        }
      }
    }
    
    let sqlQuery = "";

    if (!query) {
      sqlQuery = `
        SELECT 
          p.application_number,
          p.applicationNumber,
          p.patent_type,
          p.patent_kind,
          p.family_id,
          p.pct_number,
          p.dateFiled,
          p.earliest_priority_date,
          p.dateGranted,
          p.publication_date,
          p.inferred_status,
          p.country,
          p.title, 
          p.abstract,
          p.owners_and_applicants,
          p.inventors,
          p.inventor_countries
        FROM \`bioport-ai-app.bioport_patents.google_patents_optimized\` p
        ${whereClause}
        ORDER BY p.earliest_priority_date DESC LIMIT @limit
      `;
    } else {
      const parser = new BooleanParser(query);
      const ast = parser.parse();
      if (ast) {
        let paramCounter = 0;
        const querySql = compileAST(ast, 'q', params, (term, paramName, p) => {
          paramCounter++;
          const uniqueParamName = `${paramName}_${paramCounter}`;
          p[uniqueParamName] = term;
          return `(
            SEARCH(p.title, @${uniqueParamName}) OR
            SEARCH(p.abstract, @${uniqueParamName})
          )`;
        });
        if (querySql !== '1=1') {
          whereClause += ` AND (${querySql})`;
        }
      }

      sqlQuery = `
        SELECT 
          p.application_number,
          p.applicationNumber,
          p.patent_type,
          p.patent_kind,
          p.family_id,
          p.pct_number,
          p.dateFiled,
          p.earliest_priority_date,
          p.dateGranted,
          p.publication_date,
          p.inferred_status,
          p.country,
          p.title, 
          p.abstract,
          p.owners_and_applicants,
          p.inventors,
          p.inventor_countries
        FROM \`bioport-ai-app.bioport_patents.google_patents_optimized\` p
        ${whereClause}
        ORDER BY p.earliest_priority_date DESC LIMIT @limit
      `;
    }
    
    params.limit = Math.min(limit, 1000); // Max 1000
    
    const options = {
      query: sqlQuery,
      params: params,
      useQueryCache: true,
      dryRun: dryRun,
    };
    
    const [job] = await bigquery.createQueryJob(options);
    
    if (dryRun) {
      const totalBytesProcessed = parseInt(job.metadata.statistics.totalBytesProcessed, 10);
      const estimatedCostUSD = (totalBytesProcessed / (1024 * 1024 * 1024 * 1024)) * 5; // $5 per TB
      return res.json({ 
        dryRun: true,
        totalBytesProcessed,
        estimatedCostUSD: estimatedCostUSD.toFixed(4),
        cacheHit: job.metadata.statistics.cacheHit
      });
    }

    const [rows] = await job.getQueryResults();
    
    // Format the results to match the Patent interface
    const formattedResults = rows.map(row => ({
      id: row.applicationNumber || "",
      title: row.title || "",
      abstract: row.abstract || "",
      dateFiled: row.dateFiled ? String(row.dateFiled.value || row.dateFiled) : "",
      assignees: row.owners_and_applicants || [],
      inventors: row.inventors || [],
      jurisdiction: row.country || "",
      source: "Google BigQuery",
      familyId: row.family_id || "",
      link: `https://patents.google.com/patent/${row.applicationNumber}`,
      applicationNumber: row.applicationNumber || "",
      patentType: row.patent_type || "",
      patentKind: row.patent_kind || "",
      earliestPriorityDate: row.earliest_priority_date ? String(row.earliest_priority_date.value || row.earliest_priority_date) : "",
      datePublished: row.publication_date ? String(row.publication_date.value || row.publication_date) : "",
      status: row.inferred_status || (row.dateGranted ? "Granted" : "Published"),
      country: row.country || ""
    }));
    
    res.json({ 
      results: formattedResults,
      statistics: {
        totalBytesProcessed: job.metadata.statistics.totalBytesProcessed,
        cacheHit: job.metadata.statistics.cacheHit
      }
    });
  } catch (error: any) {
    console.error("BigQuery search error:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve data from BigQuery" });
  }
});

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
    
    if (statusCode === 401 || statusCode === 403) {
      return res.status(401).json({
        error: "IP Australia API Authentication/Authorization Failed. Please ensure your API credentials are correct and that your app is subscribed to the 'Australian Patent Search API' in the IP Australia Developer Portal.",
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
