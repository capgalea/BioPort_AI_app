import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const qParam = JSON.stringify({ "_text_all": { "patent_title": "biotech" } });
  const fParam = JSON.stringify([
    "patent_id",
    "patent_title",
    "patent_date",
    "patent_abstract",
    "patent_earliest_application_date",
    "assignees.assignee_organization",
    "assignees.assignee_individual_name_first",
    "assignees.assignee_individual_name_last",
    "assignees.assignee_country",
    "inventors.inventor_name_first",
    "inventors.inventor_name_last",
    "inventors.inventor_country",
    "inventors.inventor_state",
    "application.filing_date",
    "application.application_id",
    "pct_data.pct_docnumber",
    "pct_data.pct_kind",
    "pct_data.pct_date",
    "pct_data.pct_371_date",
    "pct_data.pct_102_date",
    "pct_data.published_filed_date"
  ]);
  const oParam = JSON.stringify({ "size": 1 });

  const url = `https://search.patentsview.org/api/v1/patent/?q=${encodeURIComponent(qParam)}&f=${encodeURIComponent(fParam)}&o=${encodeURIComponent(oParam)}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "X-Api-Key": process.env.PATENTSVIEW_API_KEY
      }
    });
    console.log("Success:", JSON.stringify(response.data.patents[0], null, 2));
  } catch (error: any) {
    console.error("Error:", error.response?.status, error.response?.data || error.message);
  }
}

test();
