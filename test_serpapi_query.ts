import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  let q = "moderna assignee:(Moderna) before:publication:20261231 after:publication:20100101";
  
  try {
    const res = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: "google_patents",
        q: q,
        api_key: process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY,
        num: 10
      }
    });
    console.log("Success:", res.data.organic_results?.length);
  } catch (e: any) {
    console.error("Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
