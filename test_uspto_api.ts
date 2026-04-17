import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://data.uspto.gov/api/v1/patent/', {
      params: {
        q: JSON.stringify({ _text_any: { patent_title: "moderna" } }),
        f: JSON.stringify(["patent_id", "patent_title"])
      }
    });
    console.log("Success:", res.data);
  } catch (e: any) {
    console.error("Error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
