import axios from 'axios';

async function test() {
  try {
    const apiKey = process.env.PATENTSVIEW_API_KEY;
    console.log("Key exists:", !!apiKey);
    if (!apiKey) {
      console.log("No key found.");
      return;
    }
    const response = await axios.get("https://search.patentsview.org/api/v1/patent/", {
      params: { q: '{"_text_any":{"patent_title":"biotech"}}', o: '{"per_page":1}' },
      headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
    });
    console.log("Success:", response.status);
    console.log(JSON.stringify(response.data).substring(0, 200));
  } catch (e) {
    console.log("Error:", e.response ? e.response.status : e.message);
    if (e.response) console.log(e.response.data);
  }
}

test();
