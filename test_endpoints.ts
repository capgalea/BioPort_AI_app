import axios from 'axios';

const IP_AU_CLIENT_ID = 'fpqOC1vyzVb7LCX89VTEAl1zzhjZE63Q';
const IP_AU_CLIENT_SECRET = 'n9LmCJ3KpHuLvU6yfPQYRbTBm4G4A46hMedKke8BiNwjLgeNapkA4BjIqSplZkZm';
const TOKEN_URL = "https://test.api.ipaustralia.gov.au/public/external-token-api/v1/access_token";

async function test() {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', IP_AU_CLIENT_ID);
    params.append('client_secret', IP_AU_CLIENT_SECRET);

    const tokenRes = await axios.post(TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const token = tokenRes.data.access_token;
    console.log("Token:", token.substring(0, 10) + "...");

    const urls = [
      "https://test.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search/quick"
    ];
    
    const payloads = [
      { q: "biotech" },
      { query: "biotech" },
      { searchText: "biotech" },
      { searchTerm: "biotech" },
      { keyword: "biotech" },
      { text: "biotech" },
      { search: "biotech" },
      { query: { text: "biotech" } },
      { query: { q: "biotech" } },
      { query: { searchText: "biotech" } },
      { query: { searchTerm: "biotech" } },
      { query: { keyword: "biotech" } },
      { query: { search: "biotech" } },
      { query: { value: "biotech" } },
      { query: { value: "biotech", field: "ANY" } },
      { query: [{ value: "biotech", field: "ANY" }] }
    ];

    for (const url of urls) {
      for (let i = 0; i < payloads.length; i++) {
        try {
          const response = await axios.get(url, {
            params: payloads[i],
            headers: { 
              Authorization: `Bearer ${token}`,
              "x-api-key": IP_AU_CLIENT_ID
            }
          });
          console.log(`URL: ${url} Payload ${i} SUCCESS:`, Object.keys(response.data));
        } catch (e: any) {
          console.log(`URL: ${url} Payload ${i} ERROR:`, e.response?.status, JSON.stringify(e.response?.data));
        }
      }
    }
  } catch (e: any) {
    console.log("error:", e.response?.data || e.message);
  }
}
test();
