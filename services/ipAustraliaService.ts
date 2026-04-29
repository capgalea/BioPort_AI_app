import axios from 'axios';
import { Patent } from '../types';
import { PatentFilters } from './patentService';

const SEARCH_API_URL = '/api/patents/search';

export const fetchPatentsFromIPAustralia = async (query: string, filters?: PatentFilters, limit?: number): Promise<Patent[]> => {
  try {
    const response = await axios.post(SEARCH_API_URL, {
      query,
      filters,
      source: 'ip-australia'
    });

    return (response.data.results || []).map((p: any) => {
      // Helper to extract names from complex objects or strings
      const extractNames = (arr: any[]) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(a => {
          if (typeof a === 'string') return a;
          return a.name || a.inventorName || a.applicantName || a.ownerName || "";
        }).filter(Boolean);
      };

      return {
        applicationNumber: p.applicationNumber || p.id || p.ipRightIdentifier || "",
        actualApplicationNumber: p.id || p.applicationNumber || p.ipRightIdentifier || "",
        owners: extractNames(p.owners || p.applicants),
        applicants: extractNames(p.applicants),
        assignees: extractNames(p.owners || p.applicants),
        inventors: extractNames(p.inventors),
        title: p.title || p.inventionTitle || "",
        abstract: p.abstract || "",
        claim: "",
        description: "",
        status: p.status || "",
        family: "",
        familyJurisdictions: p.familyJurisdictions || [],
        dateFiled: p.filingDate || p.dateFiled || "",
        datePublished: p.publicationDate || "",
        earliestPriorityDate: p.priorityDate || p.earliestPriorityDate || "",
        dateGranted: p.grantDate || p.dateGranted || "",
        citedWork: [],
        url: `https://search.ipaustralia.gov.au/patents/search/view.ipa?patentId=${p.applicationNumber || p.id || p.ipRightIdentifier || ""}`,
        source: "IP Australia",
        patentType: p.type || p.patentType || "",
        patentKind: p.kind || p.patentKind || "",
        inventorsCountry: Array.isArray(p.inventors) ? p.inventors.map((i: any) => i.country || i.inventorCountry).filter(Boolean) : [],
        inventorsState: Array.isArray(p.inventors) ? p.inventors.map((i: any) => i.state || i.inventorState).filter(Boolean) : [],
        pctDocNumber: p.pctNumber || p.pctDocNumber || "",
        pctKind: p.pctKind || "",
        pctDate: p.pctDate || "",
        pct371Date: p.pct371Date || "",
        pct102Date: p.pct102Date || "",
        publishedFiledDate: p.publishedFiledDate || ""
      };
    });
  } catch (error: any) {
    console.error("IP Australia API Error:", error);
    // Re-throw the error with the message from the backend if available
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};
