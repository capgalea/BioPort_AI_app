import axios from 'axios';
import { Patent } from '../types';
import { PatentFilters } from './patentService';

const PATENTSVIEW_API_URL = '/api/patents/patentsview';

export const fetchPatentsFromPatentsView = async (query: string, filters?: PatentFilters, limit?: number): Promise<Patent[]> => {
  try {
    const response = await axios.get(PATENTSVIEW_API_URL, {
      params: {
        q: query,
        size: limit || 25,
        ...filters
      }
    });

    return (response.data.patents || []).map((p: any) => {
      const owners = p.assignees?.map((a: any) => a.assignee_organization).filter(Boolean) || [];
      const inventors = p.inventors?.map((i: any) => `${i.inventor_name_first || ''} ${i.inventor_name_last || ''}`.trim()).filter(Boolean) || [];
      
      // Determine status
      let status = "Granted";
      if (p.is_publication) {
        status = "Pre-grant Publication";
      } else if (p.patent_type) {
        status = `Granted (${p.patent_type})`;
      } else if (p.patent_kind) {
        status = `Granted (Kind: ${p.patent_kind})`;
      }

      // Determine family jurisdictions
      const jurisdictions = new Set<string>(['US']);
      if (p.pct_data && p.pct_data.length > 0 && p.pct_data.some((pct: any) => pct.pct_docnumber)) {
        jurisdictions.add('WO'); // PCT
      }
      p.assignees?.forEach((a: any) => {
        if (a.assignee_country && a.assignee_country !== 'US') jurisdictions.add(a.assignee_country);
      });
      p.inventors?.forEach((i: any) => {
        if (i.inventor_country && i.inventor_country !== 'US') jurisdictions.add(i.inventor_country);
      });
      
      return {
        applicationNumber: p.patent_id || "",
        owners: owners,
        applicants: owners, // Same as owners for PatentsView
        inventors: inventors,
        title: p.patent_title || "",
        abstract: p.patent_abstract || "",
        claim: "",
        description: "",
        status: status,
        family: "",
        familyJurisdictions: Array.from(jurisdictions),
        dateFiled: p.application?.[0]?.filing_date || "",
        datePublished: p.is_publication ? (p.patent_date || "") : "",
        earliestPriorityDate: p.patent_earliest_application_date || "",
        dateGranted: p.is_publication ? "" : (p.patent_date || ""),
        citedWork: [],
        url: `https://patents.google.com/patent/US${p.patent_id}`,
        source: "PatentsView",
        actualApplicationNumber: p.application?.[0]?.application_id?.replace(/[^0-9]/g, '') || "",
        patentType: p.patent_type || "",
        patentKind: p.patent_kind || "",
        inventorsCountry: p.inventors?.map((i: any) => i.inventor_country).filter(Boolean) || [],
        inventorsState: p.inventors?.map((i: any) => i.inventor_state).filter(Boolean) || [],
        pctDocNumber: p.pct_data?.[0]?.pct_docnumber || "",
        pctKind: p.pct_data?.[0]?.pct_kind || "",
        pctDate: p.pct_data?.[0]?.pct_date || "",
        pct371Date: p.pct_data?.[0]?.pct_371_date || "",
        pct102Date: p.pct_data?.[0]?.pct_102_date || "",
        publishedFiledDate: p.pct_data?.[0]?.published_filed_date || ""
      };
    });
  } catch (error: any) {
    console.error("PatentsView API Error:", error);
    throw error;
  }
};
