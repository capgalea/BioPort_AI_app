import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        q: "site:ipaustralia.gov.au \"ipright-search-api\"",
        api_key: process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY
      }
    });
    console.log(JSON.stringify(response.data.organic_results?.slice(0, 5), null, 2));
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}

test();