import axios from "axios";

async function test() {
  try {
    const res = await axios.get('http://localhost:3000/api/health');
    const key = res.data.hasPatentsViewKey ? "has key" : "no key";
    console.log("Health check:", key);
    
    // Now try to call PatentsView directly with the key from process.env
    const pvRes = await axios.post('https://search.patentsview.org/api/v1/patent', {
      q: { _text_any: { patent_title: "test" } },
      f: ["patent_number"]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.PATENTSVIEW_API_KEY || ''
      }
    });
    console.log("PV Success:", pvRes.data);
  } catch (e: any) {
    console.error("PV Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
