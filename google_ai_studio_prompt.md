# Google AI Studio Prompt — IP Australia Patent API Integration for BioPort AI

---

## PROMPT (paste this into Google AI Studio)

---

You are an expert React and Node.js developer. I need you to write complete, production-ready code to integrate the **IP Australia Australian Patent Search API** into an existing React/TypeScript + Express app called **BioPort AI**.

The GitHub repository is: https://github.com/capgalea/BioPort_AI_app

---

## ABOUT THE APP

BioPort AI is a React + TypeScript single-page application with a Vite frontend and an Express (`server.ts`) backend. It has a **Patent Analytics Dashboard** (`components/PatentDataView.tsx`) that displays patent data in a table and charts.

The app already has partial skeleton code for IP Australia, but it is **incomplete and non-functional**. Your job is to complete or replace it so that the IP Australia data source fully works end-to-end.

---

## IP AUSTRALIA API DETAILS

### Registration & Documentation
- Developer Portal: https://portal.api.ipaustralia.gov.au/
- API documentation page: https://portal.api.ipaustralia.gov.au/s/communityapi/a082w00000TJfb7AAD/developersaustralianpatentsearchapi
- Security / OAuth details: https://portal.api.ipaustralia.gov.au/s/news/security-MCB5NFGGQOUNEFRHKPFS2J2EMFMY
- Registration is free via the developer portal. The user must create an account, create an "App", subscribe it to the **"Australian Patent Search API"**, and copy the **Client ID** and **Client Secret**.

### Environment Variables Required
```
IP_AUSTRALIA_CLIENT_ID=<your_client_id>
IP_AUSTRALIA_CLIENT_SECRET=<your_client_secret>
```

### OAuth 2.0 Authentication — Client Credentials Flow

**Token endpoint (Production):**
```
POST https://production.api.ipaustralia.gov.au/public/external-token-api/v1/access_token
```
**Request headers:**
```
Content-Type: application/x-www-form-urlencoded
```
**Request body (URL-encoded string, NOT JSON, NOT URLSearchParams object — use a raw string):**
```
grant_type=client_credentials&client_id=<URL_ENCODED_CLIENT_ID>&client_secret=<URL_ENCODED_CLIENT_SECRET>
```
**Response:**
```json
{
  "access_token": "<jwt_token>",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```
Cache the token in memory and re-use it until 60 seconds before `expires_in`.

Use `Authorization: Bearer <access_token>` header on all subsequent API calls.

### Patent Search Endpoint

**Quick Search (returns list of patents):**
```
POST https://production.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search/quick
Authorization: Bearer <access_token>
Content-Type: application/json
```
**Request body:**
```json
{
  "query": "<free-text search string>",
  "searchType": "DETAILS",
  "sort": {
    "field": "FILING_DATE",
    "direction": "DESCENDING"
  },
  "changedSinceDate": "YYYY-MM-DD"
}
```
- `query` is required. If the user's query is empty, use `"patent"` as a fallback.
- `changedSinceDate` is optional — use it to filter by start date (`filters.startDate`).
- `searchType: "DETAILS"` returns richer data per result.
- The response body has a top-level `results` array (may also appear as `patents` or `items`). Each element is a patent object.

### Patent Detail Endpoint

**Get full patent by ID:**
```
GET https://production.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/patent/{ipRightIdentifier}
Authorization: Bearer <access_token>
```
- `ipRightIdentifier` is the patent's application number from the search results (`item.applicationNumber` or `item.id` or `item.ipRightIdentifier`).
- Returns all publicly available bibliographic data for the patent.

### Known IP Australia Response Field Names
The API returns patent objects with (at least) these fields — exact names may vary per record:
```
applicationNumber, id, ipRightIdentifier  → application/patent identifier
inventionTitle, title                     → patent title
abstract                                  → patent abstract
status                                    → e.g. "Accepted", "Pending", "Lapsed", "Ceased", "Granted"
filingDate, dateFilied                    → filing date (ISO string, e.g. "2019-05-15")
publicationDate                           → publication date
priorityDate, earliestPriorityDate        → earliest priority date
grantDate, dateGranted                    → grant date
type, patentType                          → e.g. "Standard", "Innovation", "PCT"
kind, patentKind                          → document kind code
applicants[]                              → array of applicant objects: { name, applicantName }
owners[]                                  → array of owner objects: { name, ownerName }
inventors[]                               → array of inventor objects: { name, inventorName, country, state }
familyJurisdictions[]                     → array of country codes
country                                   → primary country code (typically "AU")
pctNumber, pctDocNumber                   → PCT application number
```

---

## THE EXISTING PATENT INTERFACE (do NOT change this)

Located in `types.ts`. This is the TypeScript interface all patent data must conform to:

```typescript
export interface Patent {
  applicationNumber: string;
  owners: string[];
  applicants: string[];
  inventors: string[];
  title: string;
  abstract: string;
  claim: string;
  description: string;
  status: string;
  family: string;
  familyJurisdictions: string[];
  familyId?: string;
  dateFiled: string;
  datePublished: string;
  earliestPriorityDate: string;
  dateGranted: string;
  citedWork: string[];
  url?: string;
  source?: string;          // MUST be set to "IP Australia" for IP Australia patents
  actualApplicationNumber?: string;
  patentType?: string;
  patentKind?: string;
  inventorsCountry?: string[];
  inventorsState?: string[];
  pctDocNumber?: string;
  pctKind?: string;
  pctDate?: string;
  pct371Date?: string;
  pct102Date?: string;
  publishedFiledDate?: string;
  country?: string;
  technicalFields?: string[];
  keyClaimsSummary?: string;
  noveltyOverPriorArt?: string;
  pctStatusInfo?: string;
  designatedStates?: string[];
  id?: string;
  assignees?: string[];
}
```

---

## THE PATENT ANALYTICS DASHBOARD TABLE — DO NOT CHANGE COLUMN HEADERS

The table in `components/PatentDataView.tsx` uses these exact column definitions (do NOT rename them):

```typescript
const INITIAL_COLUMNS = [
  { id: 'actualApplicationNumber', label: 'Patent Number' },
  { id: 'assignees',               label: 'Current Assignee' },
  { id: 'inventors',               label: 'Inventors' },
  { id: 'title',                   label: 'Title' },
  { id: 'abstract',                label: 'Abstract' },
  { id: 'status',                  label: 'Status' },
  { id: 'patentType',              label: 'Patent Type' },
  { id: 'patentKind',              label: 'Patent Kind' },
  { id: 'familyId',                label: 'Family ID' },
  { id: 'dateFiled',               label: 'Date Filed' },
  { id: 'earliestPriorityDate',    label: 'Earliest Priority Date' },
  { id: 'datePublished',           label: 'Publication Date' },
  { id: 'country',                 label: 'Country' },
];
```

Your data mapping MUST populate every one of these fields from IP Australia API response data:

| Table Column (Patent field)  | IP Australia API field(s) to map from                         |
|------------------------------|---------------------------------------------------------------|
| `actualApplicationNumber`    | `item.applicationNumber ?? item.id ?? item.ipRightIdentifier` |
| `assignees`                  | names extracted from `item.owners[]` or `item.applicants[]`   |
| `inventors`                  | names extracted from `item.inventors[]`                       |
| `title`                      | `item.inventionTitle ?? item.title`                           |
| `abstract`                   | `item.abstract`                                               |
| `status`                     | `item.status`                                                 |
| `patentType`                 | `item.type ?? item.patentType`                                |
| `patentKind`                 | `item.kind ?? item.patentKind`                                |
| `familyId`                   | `item.familyId ?? item.family`                                |
| `dateFiled`                  | `item.filingDate ?? item.dateFiled`                           |
| `earliestPriorityDate`       | `item.priorityDate ?? item.earliestPriorityDate`              |
| `datePublished`              | `item.publicationDate ?? item.datePublished`                  |
| `country`                    | `item.country ?? "AU"` (default "AU" — these are Aus patents) |

Also set: `source: "IP Australia"` (this is how the AusPat filter toggle identifies these patents).

---

## THE CHARTS — DATA MUST FEED THESE

The dashboard has two charts driven by the patent data array:

1. **Patent Status Distribution** — Donut/Pie chart using `patent.status` field. IP Australia `status` values include: `"Accepted"`, `"Lapsed"`, `"Pending"`, `"Ceased"`, `"Granted"`, `"Revoked"`. Map these correctly.

2. **Filing Trend by Year** — Bar chart using `patent.dateFiled` field. Dates must be ISO format strings (e.g. `"2019-05-15"`) so that the `parseISO()` call in the component can extract the year.

---

## THE DATA SOURCE FILTER TOGGLE — LINK IP AUSTRALIA TO "AusPat"

In `PatentDataView.tsx`, there is a filter toggle bar:
```tsx
{['All Sources', 'USPTO', 'EPO', 'AusPat', 'Lens'].map(src => (
  <button onClick={() => setDataSourceFilter(src)}>...</button>
))}
```

The filter logic for "AusPat" is:
```typescript
if (f.includes('auspat') || f.includes('australia'))
  return src.includes('ip australia') || src.includes('auspat') || c.startsWith('au');
```

This means: **you must set `source: "IP Australia"` on every mapped Patent object** so that clicking "AusPat" in the toggle correctly filters to show only IP Australia patents.

---

## THE DATA SOURCE DROPDOWN IN "SEARCH QUERY & FILTERS"

In `PatentDataView.tsx`, there is a select dropdown:
```tsx
<select value={source} onChange={(e) => setSource(e.target.value as any)}>
  <option value="ipAustralia">IP Australia</option>
  <option value="uspto">USPTO</option>
  <option value="bigquery">Google Patents</option>
</select>
```

When the user selects **"IP Australia"** and clicks the search/fetch button, `patentService.getPatentsWithStats(query, filters, limit, 'ipAustralia')` is called. This routes to `fetchPatentsFromIPAustralia()` in `services/ipAustraliaService.ts`, which POSTs to the backend `/api/patents/search` endpoint with `source: 'ip-australia'`.

The search filters that must be passed through to the IP Australia API:
- `filters.applicant` → append to query string: `query += " " + filters.applicant`
- `filters.inventor` → append to query string: `query += " " + filters.inventor`
- `filters.startDate` → set `searchBody.changedSinceDate = filters.startDate`
- `filters.status` → filter results client-side after retrieval (IP Australia API does not support server-side status filtering in the quick search)
- `filters.patentType` → filter results client-side after retrieval

The search filters in the "Search Query & Filters" section of the PatentAnalytics Dashboard that the user can interact with:
- **Search Query (Title & Abstract):** Free-text, maps to `query` in the API body
- **Inventor Name(s):** Maps to `filters.inventor`, appended to the query
- **Applicant / Assignee:** Maps to `filters.applicant`, appended to the query
- **Filing Date From/To:** Maps to `filters.startDate` / `filters.endDate` (use `changedSinceDate` on the API)
- **Patent Type:** Maps to `filters.patentType`, filter client-side after fetch
- **Status:** Maps to `filters.status`, filter client-side after fetch
- **Start Year / End Year:** Used to further filter results by `dateFiled` year client-side

---

## EXISTING FILES TO MODIFY

### 1. `server.ts` — Backend Express server

The backend must have a `POST /api/patents/search` route. When `req.body.source === 'ip-australia'`, it must:

1. Call `getAccessToken()` using OAuth 2.0 Client Credentials (see auth details above).
2. Build the IP Australia search body from `req.body.query` and `req.body.filters`.
3. POST to the IP Australia quick search endpoint.
4. For each of the top N results (default 10, up to `req.body.limit`), call the patent detail endpoint.
5. Return `res.json({ results: detailedPatentArray })`.

Handle errors:
- 401/403 from IP Australia → return `res.status(401).json({ error: "IP Australia authentication failed..." })`
- Missing credentials → return `res.status(400).json({ error: "IP_AUSTRALIA_CLIENT_ID and IP_AUSTRALIA_CLIENT_SECRET must be set." })`
- Network errors → exponential backoff retry (up to 3 attempts: 1s, 2s, 4s)

Key server constants:
```typescript
const IP_AU_CLIENT_ID = process.env.IP_AUSTRALIA_CLIENT_ID;
const IP_AU_CLIENT_SECRET = process.env.IP_AUSTRALIA_CLIENT_SECRET;
const TOKEN_URL = "https://production.api.ipaustralia.gov.au/public/external-token-api/v1/access_token";
const SEARCH_URL = "https://production.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search/quick";
const PATENT_URL = "https://production.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/patent";
```

Token caching pattern (already in codebase, keep it):
```typescript
let accessToken: string | null = null;
let tokenExpiry: number = 0;
// Re-fetch if accessToken is null or Date.now() >= tokenExpiry
// tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000
```

### 2. `services/ipAustraliaService.ts` — Frontend service

This file calls `POST /api/patents/search` with `source: 'ip-australia'` and maps the raw API response objects to the `Patent` interface.

The mapping function must:
- Extract names from complex objects using a helper:
  ```typescript
  const extractNames = (arr: any[]) =>
    (arr || []).map(a => typeof a === 'string' ? a : (a.name || a.applicantName || a.inventorName || a.ownerName || '')).filter(Boolean);
  ```
- Always set `source: "IP Australia"` on every mapped patent.
- Always set `country: item.country ?? "AU"` (default AU).
- Build a direct link: `url: \`https://search.ipaustralia.gov.au/patents/search/view.ipa?patentId=${appNum}\``

### 3. `services/patentService.ts` — Routes source to the right fetcher

Already correctly routes `source === 'ipAustralia'` to `fetchPatentsFromIPAustralia`. Do not change the routing logic.

---

## WHAT TO GENERATE

Please produce the following complete, working code:

### A. Updated `server.ts` section — the `POST /api/patents/search` route

Write the complete route handler. It must:
1. Detect `source === 'ip-australia'` (or route all non-BigQuery/non-Google requests through IP Australia).
2. Fetch an OAuth token (with caching).
3. Build and send the quick search request.
4. Fetch full details for top results.
5. Return `{ results: [...] }`.
6. Handle all error cases with appropriate HTTP status codes.

### B. Complete `services/ipAustraliaService.ts`

Write the full file, including:
1. The `fetchPatentsFromIPAustralia(query, filters, limit)` function.
2. Complete field mapping from raw IP Australia response → `Patent` interface.
3. All 13 table-column fields populated (see mapping table above).
4. `source: "IP Australia"` always set.
5. Error handling that propagates backend error messages.

### C. `.env.example` additions

Append these to the existing `.env.example` (or state clearly what env vars to add):
```
# IP Australia API credentials (register at https://portal.api.ipaustralia.gov.au/)
IP_AUSTRALIA_CLIENT_ID=your_client_id_here
IP_AUSTRALIA_CLIENT_SECRET=your_client_secret_here
```

### D. Setup instructions

Provide a brief numbered guide:
1. How to register at the IP Australia Developer Portal.
2. How to create an App and subscribe to "Australian Patent Search API".
3. Where to find the Client ID and Client Secret.
4. How to add them to the `.env` file.
5. How to verify the token endpoint works (e.g. `GET /api/test-token`).

---

## CONSTRAINTS — CRITICAL

- **DO NOT change any table column headers** (`INITIAL_COLUMNS` labels in `PatentDataView.tsx`).
- **DO NOT change the `Patent` TypeScript interface** in `types.ts`.
- **DO NOT change the routing in `patentService.ts`** — it already correctly routes `ipAustralia` to `fetchPatentsFromIPAustralia`.
- **DO NOT change the UI components** — `PatentDataView.tsx` and `PatentSearchPage.tsx` UI must remain unchanged.
- **DO NOT add new npm packages** unless absolutely necessary. The codebase already uses `axios`, `express`, and standard `fetch`.
- All IP Australia data must map to the existing `Patent` interface fields.
- The `source` field on every IP Australia patent object MUST be exactly `"IP Australia"` (this is how the "AusPat" toggle filter works in the dashboard).
- Dates must be ISO format strings (`"YYYY-MM-DD"` or `"YYYY-MM-DDTHH:MM:SSZ"`) so that `parseISO()` from `date-fns` can parse them for the Filing Trend by Year chart.

---

## SUMMARY OF WHAT THE INTEGRATION MUST DO

1. User opens Patent Analytics Dashboard (`PatentDataView.tsx`).
2. In the **Search Query & Filters** section, user selects **"IP Australia"** from the **Data Source** dropdown.
3. User enters a search query (e.g. "mRNA vaccine") and/or filters (inventor, applicant, date range, status, patent type).
4. User clicks the fetch button → `patentService.getPatentsWithStats(query, filters, limit, 'ipAustralia')` is called.
5. Frontend `fetchPatentsFromIPAustralia()` POSTs to backend `/api/patents/search` with `source: 'ip-australia'`.
6. Backend authenticates with IP Australia OAuth, calls the quick search API, fetches details for top results, returns them.
7. Frontend maps results to the `Patent` interface with `source: "IP Australia"`.
8. Table populates with all 13 columns, charts update (Status Distribution pie, Filing Trend by Year bar).
9. The **"AusPat"** button in the Data Source filter toggle (above the table) correctly filters to show only IP Australia patents.
10. All filter inputs (query, inventor, applicant, date, status, patent type) function correctly — server-side where supported by the API, client-side otherwise.

---

*API reference URLs provided for context:*
- *Developer portal: https://portal.api.ipaustralia.gov.au/*
- *API docs: https://portal.api.ipaustralia.gov.au/s/communityapi/a082w00000TJfb7AAD/developersaustralianpatentsearchapi*
- *Security/OAuth: https://portal.api.ipaustralia.gov.au/s/news/security-MCB5NFGGQOUNEFRHKPFS2J2EMFMY*
