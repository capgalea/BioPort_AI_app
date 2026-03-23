import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PATENTSVIEW_API_KEY = process.env.PATENTSVIEW_API_KEY;
const PATENTSVIEW_BASE_URL = 'https://search.patentsview.org/api/v1';

async function testSearch() {
  console.log("Testing PatentsView API...");
  console.log("API Key exists:", !!PATENTSVIEW_API_KEY);

  try {
    const searchBody = {
      q: { patent_id: "11000000" },
      f: ["patent_id", "patent_title"],
      o: { per_page: 1 }
    };

    console.log("Sending POST request to /patent...");
    const response = await axios.post(`${PATENTSVIEW_BASE_URL}/patent`, searchBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': PATENTSVIEW_API_KEY
      }
    });

    console.log("Response Status:", response.status);
    console.log("Results count:", response.data.patents?.length);
    if (response.data.patents?.length > 0) {
      console.log("First result:", response.data.patents[0]);
    }
  } catch (error: any) {
    console.error("Error:", error.response?.status, error.response?.data || error.message);
  }
}

testSearch();
