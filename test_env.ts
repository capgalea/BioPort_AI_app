import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const IP_AU_CLIENT_ID = process.env.IP_AUSTRALIA_CLIENT_ID;
const IP_AU_CLIENT_SECRET = process.env.IP_AUSTRALIA_CLIENT_SECRET;
const TOKEN_URL = "https://test.api.ipaustralia.gov.au/public/external-token-api/v1/access_token";

async function test() {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', IP_AU_CLIENT_ID || '');
    params.append('client_secret', IP_AU_CLIENT_SECRET || '');

    const tokenRes = await axios.post(TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const token = tokenRes.data.access_token;
    console.log("Token:", token.substring(0, 10) + "...");

    const url = "https://test.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search";
    
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

    for (let i = 0; i < payloads.length; i++) {
      try {
        const response = await axios.post(url, payloads[i], {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-api-key": IP_AU_CLIENT_ID
          }
        });
        console.log(`Payload ${i} SUCCESS:`, Object.keys(response.data));
      } catch (e: any) {
        console.log(`Payload ${i} ERROR:`, e.response?.status, JSON.stringify(e.response?.data));
      }
    }
  } catch (e: any) {
    console.log("error:", e.response?.data || e.message);
  }
}
test();
