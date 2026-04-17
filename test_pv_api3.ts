import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const res = await axios.get('https://search.patentsview.org/api/v1/patent/', {
      params: {
        q: JSON.stringify({ _text_any: { patent_title: "moderna" } }),
        f: JSON.stringify(["patent_id", "patent_title"])
      },
      headers: {
        'X-Api-Key': process.env.PATENTSVIEW_API_KEY || '',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    console.log("New API Success:", res.data.patents?.length);
  } catch (e: any) {
    console.error("New API Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
