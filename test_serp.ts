import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  try {
    const res = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: "PatentsView API v1 documentation endpoints fields",
        api_key: process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY
      }
    });
    console.log(res.data.organic_results.slice(0, 3).map((r: any) => r.snippet).join('\n\n'));
  } catch (e: any) {
    console.error(e.message);
  }
}
test();
