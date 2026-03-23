import axios from 'axios';
import { Patent } from '../types';

const PATENTSVIEW_API_URL = 'https://search.patentsview.org/api/v1/query';

export const fetchPatentsFromPatentsView = async (query: string): Promise<Patent[]> => {
  const apiKey = process.env.PATENTSVIEW_API_KEY;
  if (!apiKey) {
    throw new Error("PATENTSVIEW_API_KEY is not configured.");
  }

  try {
    // PatentsView query language:
    // q: {"_text_all": query}
    // f: ["patent_number", "patent_title", "assignee_organization", "patent_date"]
    const response = await axios.post(PATENTSVIEW_API_URL, {
      q: { "_text_all": query },
      f: ["patent_number", "patent_title", "assignee_organization", "patent_date"],
      o: { "per_page": 10 }
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    // Map to Patent type
    // Assuming response.data.patents is the structure
    return (response.data.patents || []).map((p: any) => ({
      applicationNumber: p.patent_number,
      owners: p.assignee_organization ? [p.assignee_organization] : [],
      applicants: p.assignee_organization ? [p.assignee_organization] : [],
      inventors: [],
      title: p.patent_title,
      abstract: "",
      claim: "",
      description: "",
      status: "Published",
      family: "",
      familyJurisdictions: [],
      dateFiled: p.patent_date,
      datePublished: "",
      earliestPriorityDate: "",
      dateGranted: "",
      citedWork: [],
      source: "PatentsView"
    }));
  } catch (error: any) {
    console.error("PatentsView API Error:", error);
    throw error;
  }
};
