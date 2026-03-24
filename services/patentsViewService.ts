import axios from 'axios';
import { Patent } from '../types';
import { PatentFilters } from './patentService';

const PATENTSVIEW_API_URL = '/api/patents/patentsview';

export const fetchPatentsFromPatentsView = async (query: string, filters?: PatentFilters): Promise<Patent[]> => {
  try {
    const response = await axios.get(PATENTSVIEW_API_URL, {
      params: {
        q: query,
        size: 25,
        ...filters
      }
    });

    return (response.data.patents || []).map((p: any) => {
      const owners = p.assignees?.map((a: any) => a.assignee_organization).filter(Boolean) || [];
      const inventors = p.inventors?.map((i: any) => `${i.inventor_name_first || ''} ${i.inventor_name_last || ''}`.trim()).filter(Boolean) || [];
      
      return {
        applicationNumber: p.patent_id || "",
        owners: owners,
        applicants: owners, // Same as owners for PatentsView
        inventors: inventors,
        title: p.patent_title || "",
        abstract: p.patent_abstract || "",
        claim: "",
        description: "",
        status: "Granted", // All patents/ endpoint results are granted
        family: "",
        familyJurisdictions: ["US"],
        dateFiled: p.application?.filing_date || "",
        datePublished: "",
        earliestPriorityDate: p.patent_earliest_application_date || "",
        dateGranted: p.patent_date || "",
        citedWork: [],
        url: p.patent_id ? `https://patents.google.com/patent/US${p.patent_id}/en` : undefined,
        source: "PatentsView"
      };
    });
  } catch (error: any) {
    console.error("PatentsView API Error:", error);
    throw error;
  }
};
