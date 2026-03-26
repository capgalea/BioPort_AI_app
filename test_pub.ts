import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.PATENTSVIEW_API_KEY;
  const qParam = JSON.stringify({ "_text_all": { "publication_title": "biotech" } });
  const fParam = JSON.stringify([
    "document_number",
    "publication_title",
    "publication_date",
    "publication_abstract",
    "assignees.assignee_organization",
    "inventors.inventor_name_first",
    "inventors.inventor_name_last"
  ]);
  const oParam = JSON.stringify({ "size": 1 });
  const url = `https://search.patentsview.org/api/v1/publication/?q=${encodeURIComponent(qParam)}&f=${encodeURIComponent(fParam)}&o=${encodeURIComponent(oParam)}`;
  
  try {
    const response = await axios.get(url, { headers: { "X-Api-Key": apiKey } });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}
run();
