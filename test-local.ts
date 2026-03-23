import axios from 'axios';

async function test() {
  try {
    const response = await axios.post("http://localhost:3000/api/patentsview/query", {
      endpoint: "patent",
      query: '{"_text_any":{"patent_title":"biotech"}}',
      options: '{"per_page":1}'
    });
    console.log("Success:", response.status);
    console.log(JSON.stringify(response.data).substring(0, 200));
  } catch (e) {
    console.log("Error:", e.response ? e.response.status : e.message);
    if (e.response) console.log(e.response.data);
  }
}

test();
