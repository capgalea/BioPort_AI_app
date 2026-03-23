import axios from 'axios';

async function test() {
  try {
    const apiKey = process.env.PATENTSVIEW_API_KEY;
    const response = await axios.get("https://search.patentsview.org/api/v1/patent/", {
      params: {
        q: '{"_or":[{"_text_any":{"patent_title":"biotech"}},{"_text_any":{"patent_abstract":"biotech"}}]}',
        f: '["patent_id","patent_title","patent_abstract","patent_date","patent_type","app_date","earliest_claim_date","assignees","inventors","cited_patents"]',
        o: '{"per_page":50}'
      },
      headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
    });
    console.log("Success:", response.status);
  } catch (e) {
    console.log("Error:", e.response ? e.response.status : e.message);
    if (e.response) console.log(e.response.data);
  }
}

test();
