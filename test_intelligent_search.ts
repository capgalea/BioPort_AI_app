import axios from 'axios';

async function run() {
  try {
    console.log("Testing IP Australia...");
    const ipau = await axios.post("http://localhost:3000/api/patents/search", { query: "mRNA delivery", source: "ip_au" });
    console.log("IP AU:", ipau.data.results?.length || ipau.data.patents?.length);
    
    console.log("Testing Google Patents...");
    const gp = await axios.post("http://localhost:3000/api/patents/search", { query: "mRNA delivery", source: "google" });
    console.log("GP:", gp.data.results?.length || gp.data.patents?.length);
    
    console.log("Testing EPO...");
    const epo = await axios.get("http://localhost:3000/api/patents/search?q=mRNA%20delivery");
    console.log("EPO:", epo.data.results?.length || epo.data.patents?.length);
    
    console.log("Testing USPTO...");
    const uspto = await axios.post("http://localhost:3000/api/patentsview/query", {
        endpoint: 'patent',
        query: JSON.stringify({
          "_text_any": { "assignees.assignee_organization": "mRNA delivery" }
        }),
        fields: [
          "patent_number",
          "patent_title",
          "patent_date",
          "assignees"
        ],
        options: JSON.stringify({ per_page: 50 })
    });
    console.log("USPTO:", uspto.data.patents?.length);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) {
      console.error(e.response.data);
    }
  }
}

run();
