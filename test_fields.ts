import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.PATENTSVIEW_API_KEY;
const BASE_URL = 'https://search.patentsview.org/api/v1/patent';

async function testFields() {
    if (!API_KEY) {
        console.error("No API key");
        return;
    }

    const testCases = [
        {
            name: "Basic fields",
            f: ["patent_id", "patent_title"]
        },
        {
            name: "With patent_number",
            f: ["patent_number", "patent_title"]
        },
        {
            name: "With assignees",
            f: ["patent_id", "assignees.assignee_organization"]
        },
        {
            name: "With inventors",
            f: ["patent_id", "inventors.inventor_last_name"]
        }
    ];

    for (const tc of testCases) {
        console.log(`Testing: ${tc.name}`);
        try {
            const response = await axios.post(BASE_URL, {
                q: { patent_id: "11000000" },
                f: tc.f
            }, {
                headers: { 'X-Api-Key': API_KEY }
            });
            console.log(`  Success! Fields: ${tc.f.join(', ')}`);
        } catch (error: any) {
            console.log(`  Failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
        }
    }
}

testFields();
