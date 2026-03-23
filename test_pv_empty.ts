import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  try {
    const res = await axios.get('https://search.patentsview.org/api/v1/patent/', {
      headers: {
        'X-Api-Key': process.env.PATENTSVIEW_API_KEY || ''
      }
    });
    console.log("Success:", res.data);
  } catch (e: any) {
    console.error("Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
