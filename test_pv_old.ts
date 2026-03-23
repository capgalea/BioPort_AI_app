import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  try {
    const key = process.env.PATENTSVIEW_API_KEY || '';
    console.log("Using key:", key ? "exists" : "missing");
    
    // Try the OLD API
    const oldRes = await axios.get('https://api.patentsview.org/patents/query', {
      params: {
        q: JSON.stringify({ patent_title: "test" }),
        f: JSON.stringify(["patent_id"]),
        api_key: key
      }
    });
    console.log("Old PV Success:", oldRes.data);
  } catch (e: any) {
    console.error("Old PV Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
