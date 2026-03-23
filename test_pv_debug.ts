import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.PATENTSVIEW_API_KEY || '';
const BASE_URL = 'https://search.patentsview.org/api/v1';

async function testEndpoint(endpoint: string, body: any) {
  console.log(`Testing ${endpoint} with body:`, JSON.stringify(body));
  try {
    const res = await axios.post(`${BASE_URL}${endpoint}`, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY
      }
    });
    console.log(`SUCCESS ${endpoint}:`, res.data.patents?.length || 0, "results");
    if (res.data.patents && res.data.patents.length > 0) {
      console.log("First result:", JSON.stringify(res.data.patents[0], null, 2));
    }
  } catch (e: any) {
    console.error(`ERROR ${endpoint}:`, e.response?.status, e.response?.data || e.message);
  }
}

async function run() {
  console.log("Using API Key:", API_KEY ? "EXISTS" : "MISSING");
  if (!API_KEY) return;

  // Try /patent
  await testEndpoint('/patent', {
    q: { patent_title: "test" },
    f: ["patent_number", "patent_title"]
  });

  // Try /patent with _text_any
  await testEndpoint('/patent', {
    q: { _text_any: { patent_title: "test" } },
    f: ["patent_number", "patent_title"]
  });

  // Try /patents
  await testEndpoint('/patents', {
    q: { patent_title: "test" },
    f: ["patent_number", "patent_title"]
  });

  // Try /patent/query
  await testEndpoint('/patent/query', {
    q: { patent_title: "test" },
    f: ["patent_number", "patent_title"]
  });
}

run();
