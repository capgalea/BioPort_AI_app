import axios from "axios";

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/health');
    const key = process.env.PATENTSVIEW_API_KEY; // This won't work, but let's just use a dummy key to see if it's 403 or 400
    
    const pvRes = await axios.get('https://search.patentsview.org/api/v1/patent/?q={"patent_number":"11000000"}', {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': 'dummy'
      }
    });
    console.log("PV Success:", pvRes.data);
  } catch (e: any) {
    console.error("PV Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
