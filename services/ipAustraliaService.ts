import axios from 'axios';

export interface IPAustraliaPatent {
  applicationNumber: string;
  owners: string[];
  applicants: string[];
  inventors: string[];
  title: string;
  abstract: string;
  claim: string;
  description: string;
  status: string;
  family: string;
  familyJurisdictions: string[];
  dateFiled: string;
  datePublished: string;
  earliestPriorityDate: string;
  dateGranted: string;
  citedWork: string[];
}

export interface SearchResult {
  patents: IPAustraliaPatent[];
  isMock: boolean;
}

export const searchIPAustraliaPatents = async (query: string, filters: Record<string, any> = {}): Promise<SearchResult> => {
  try {
    const response = await axios.post('/api/patents/search', {
      query: query,
      filters: filters
    });
    
    if (response.data && response.data.results) {
       return {
         patents: response.data.results.map((item: any) => ({
           applicationNumber: item.applicationNumber || item.id || '',
           owners: item.owners || [],
           applicants: item.applicants || [],
           inventors: item.inventors || [],
           title: item.title || '',
           abstract: item.abstract || '',
           claim: item.claim || '',
           description: item.description || '',
           status: item.status || '',
           family: item.family || '',
           familyJurisdictions: item.familyJurisdictions || [],
           dateFiled: item.dateFiled || '',
           datePublished: item.datePublished || '',
           earliestPriorityDate: item.earliestPriorityDate || '',
           dateGranted: item.dateGranted || '',
           citedWork: item.citedWork || []
         })),
         isMock: false
       };
    }
    return { patents: getMockPatents(query), isMock: true };
  } catch (error) {
    console.error("Error fetching from IP Australia API, falling back to mock data", error);
    return { patents: getMockPatents(query), isMock: true };
  }
};

const getMockPatents = (query: string): IPAustraliaPatent[] => {
  return [
    {
      applicationNumber: "AU2023100123",
      owners: ["BioPharma Innovations Pty Ltd"],
      applicants: ["BioPharma Innovations Pty Ltd"],
      inventors: ["Dr. Jane Smith", "Dr. John Doe"],
      title: `Novel mRNA Delivery System for ${query}`,
      abstract: "A novel lipid nanoparticle formulation for targeted mRNA delivery to hepatic cells...",
      claim: "1. A lipid nanoparticle comprising...",
      description: "Detailed description of the lipid nanoparticle...",
      status: "Granted",
      family: "FAM12345",
      familyJurisdictions: ["AU", "US", "EP"],
      dateFiled: "2023-01-15",
      datePublished: "2023-07-15",
      earliestPriorityDate: "2022-01-15",
      dateGranted: "2024-02-20",
      citedWork: ["US20200123456A1", "WO2021098765A1"]
    },
    {
      applicationNumber: "AU2023200456",
      owners: ["TechMed Solutions"],
      applicants: ["TechMed Solutions"],
      inventors: ["Alice Johnson"],
      title: `Targeted Protein Degradation for ${query}`,
      abstract: "A PROTAC molecule designed to degrade specific oncogenic proteins...",
      claim: "1. A compound of formula I...",
      description: "Synthesis and biological evaluation of the PROTAC...",
      status: "Under Examination",
      family: "FAM67890",
      familyJurisdictions: ["AU", "US"],
      dateFiled: "2023-03-10",
      datePublished: "2023-09-10",
      earliestPriorityDate: "2022-03-10",
      dateGranted: "",
      citedWork: ["US10123456B2"]
    },
    {
      applicationNumber: "AU2022300789",
      owners: ["Genomic Therapeutics"],
      applicants: ["Genomic Therapeutics"],
      inventors: ["Bob Williams", "Charlie Brown"],
      title: `CRISPR-Cas9 Gene Editing for ${query}`,
      abstract: "Methods and compositions for treating genetic disorders using CRISPR-Cas9...",
      claim: "1. A method of treating a genetic disorder comprising...",
      description: "In vivo and ex vivo applications of the gene editing system...",
      status: "Published",
      family: "FAM13579",
      familyJurisdictions: ["AU", "EP", "JP", "CN"],
      dateFiled: "2022-05-20",
      datePublished: "2022-11-20",
      earliestPriorityDate: "2021-05-20",
      dateGranted: "",
      citedWork: ["WO2019123456A1", "US20210987654A1"]
    }
  ];
};
