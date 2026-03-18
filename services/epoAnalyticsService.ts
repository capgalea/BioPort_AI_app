import axios from 'axios';

export interface EPOPatent {
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
  source?: string;
}

export interface SearchResult {
  patents: EPOPatent[];
  isMock: boolean;
}

export const searchEPOPatents = async (query: string, filters: Record<string, any> = {}): Promise<SearchResult> => {
  if (!query || query.trim() === '') {
    return { patents: [], isMock: false };
  }
  try {
    // Call the backend endpoint that wraps the EPO API
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const response = await axios.get(`${baseUrl}/api/patents/search`, {
      params: { q: query }
    });

    // The EPO OPS API returns data in a specific format.
    // We'll try to parse it, but if it's not in the expected format or if the API fails,
    // we'll fall back to mock data.
    if (response.data && response.data['ops:world-patent-data']) {
      const searchResult = response.data['ops:world-patent-data']['ops:biblio-search'];
      const results = searchResult['ops:search-result']['exchange-documents'];
      
      if (results && Array.isArray(results)) {
        let parsedResults = results.map((item: any) => {
          const doc = item['exchange-document'];
          const biblio = doc['bibliographic-data'];
            
            // Extract title
            let title = '';
            if (biblio['invention-title']) {
              const titles = Array.isArray(biblio['invention-title']) ? biblio['invention-title'] : [biblio['invention-title']];
              title = titles[0]['$'] || '';
            }

            // Extract applicants
            let applicants: string[] = [];
            if (biblio['parties'] && biblio['parties']['applicants']) {
              const apps = biblio['parties']['applicants']['applicant'];
              const appArray = Array.isArray(apps) ? apps : [apps];
              applicants = appArray.map((a: any) => a['applicant-name']?.['name']?.['$'] || '');
            }

            // Extract inventors
            let inventors: string[] = [];
            if (biblio['parties'] && biblio['parties']['inventors']) {
              const invs = biblio['parties']['inventors']['inventor'];
              const invArray = Array.isArray(invs) ? invs : [invs];
              inventors = invArray.map((i: any) => i['inventor-name']?.['name']?.['$'] || '');
            }

            // Extract abstract
            let abstract = '';
            if (doc['abstract']) {
              const abstracts = Array.isArray(doc['abstract']) ? doc['abstract'] : [doc['abstract']];
              // Find English abstract if available
              const enAbstract = abstracts.find((a: any) => a['@lang'] === 'en');
              abstract = (enAbstract ? enAbstract['p']['$'] : abstracts[0]['p']['$']) || '';
            }

            // Extract publication date
            let datePublished = '';
            if (biblio['publication-reference'] && biblio['publication-reference']['document-id']) {
              const docIds = Array.isArray(biblio['publication-reference']['document-id']) ? biblio['publication-reference']['document-id'] : [biblio['publication-reference']['document-id']];
              const docDbId = docIds.find((d: any) => d['@document-id-type'] === 'docdb');
              datePublished = docDbId?.['date']?.['$'] || '';
            }

            return {
              applicationNumber: doc['@doc-number'] || '',
              owners: applicants,
              applicants: applicants,
              inventors: inventors,
              title: title,
              abstract: abstract,
              claim: '',
              description: '',
              status: doc['@kind']?.includes('B') ? 'Granted' : 'Published', // Basic heuristic
              family: doc['@family-id'] || '',
              familyJurisdictions: [],
              dateFiled: '',
              datePublished: datePublished,
              earliestPriorityDate: '',
              dateGranted: doc['@kind']?.includes('B') ? datePublished : '',
              citedWork: []
            };
          });

          if (filters.status && filters.status.length > 0) {
            parsedResults = parsedResults.filter((p: EPOPatent) => filters.status.includes(p.status));
          }

          return {
            patents: parsedResults,
            isMock: false
          };
        }
      }
    
    // Fallback to mock data if parsing fails or no results
    let mockPatents = getMockModernaPatents();
    if (filters.status && filters.status.length > 0) {
      mockPatents = mockPatents.filter((p: EPOPatent) => filters.status.includes(p.status));
    }
    return { patents: mockPatents, isMock: true };
  } catch (error) {
    console.error("Error fetching from EPO API, falling back to mock data", error);
    let mockPatents = getMockModernaPatents();
    if (filters.status && filters.status.length > 0) {
      mockPatents = mockPatents.filter((p: EPOPatent) => filters.status.includes(p.status));
    }
    return { patents: mockPatents, isMock: true };
  }
};

const getMockModernaPatents = (): EPOPatent[] => {
  return [
    {
      applicationNumber: "EP3718565B1",
      owners: ["ModernaTX, Inc."],
      applicants: ["ModernaTX, Inc."],
      inventors: ["Bancel, Stephane", "Hoge, Stephen", "Huang, Eric", "Presnyak, Vladimir"],
      title: "Ribonucleic Acids Containing N1-Methyl-Pseudouridine And Uses Thereof",
      abstract: "The invention relates to ribonucleic acids (RNAs) comprising N1-methyl-pseudouridine, and methods of using the same for delivering a therapeutic protein to a subject.",
      claim: "1. A messenger ribonucleic acid (mRNA) comprising an open reading frame encoding a polypeptide, wherein the mRNA comprises N1-methyl-pseudouridine.",
      description: "Detailed description of the mRNA formulation and its applications in vaccines and therapeutics...",
      status: "Granted",
      family: "65432109",
      familyJurisdictions: ["EP", "US", "JP", "AU", "CA"],
      dateFiled: "2018-10-15",
      datePublished: "2020-10-07",
      earliestPriorityDate: "2017-10-16",
      dateGranted: "2023-05-10",
      citedWork: ["US9051567B2", "WO2012019168A1"]
    },
    {
      applicationNumber: "EP3824055B1",
      owners: ["ModernaTX, Inc."],
      applicants: ["ModernaTX, Inc."],
      inventors: ["Benenato, Kerry", "Kumarasinghe, Ellalahewage Sathyajith", "Cornebise, Mark"],
      title: "Lipid Nanoparticle Formulations For mRNA Delivery",
      abstract: "Lipid nanoparticle (LNP) formulations comprising an ionizable lipid, a structural lipid, a phospholipid, and a PEG lipid, optimized for the delivery of mRNA.",
      claim: "1. A lipid nanoparticle comprising: (a) an ionizable lipid; (b) a structural lipid; (c) a phospholipid; and (d) a PEG lipid, wherein the molar ratio of the ionizable lipid is between 40% and 60%.",
      description: "The present disclosure provides optimized LNP formulations for the efficient delivery of nucleic acids in vivo...",
      status: "Granted",
      family: "76543210",
      familyJurisdictions: ["EP", "US", "WO"],
      dateFiled: "2019-07-20",
      datePublished: "2021-05-26",
      earliestPriorityDate: "2018-07-21",
      dateGranted: "2024-01-15",
      citedWork: ["US8058069B2"]
    },
    {
      applicationNumber: "EP3912642B1",
      owners: ["ModernaTX, Inc."],
      applicants: ["ModernaTX, Inc."],
      inventors: ["Ciaramella, Giuseppe", "Himansu, Shinu"],
      title: "Respiratory Syncytial Virus (RSV) RNA Vaccines",
      abstract: "RNA vaccines against Respiratory Syncytial Virus (RSV) comprising an mRNA encoding an RSV F protein.",
      claim: "1. An RNA vaccine comprising at least one RNA polynucleotide having an open reading frame encoding a Respiratory Syncytial Virus (RSV) F protein.",
      description: "The invention provides RNA vaccines and combination vaccines against RSV...",
      status: "Granted",
      family: "87654321",
      familyJurisdictions: ["EP", "US", "AU"],
      dateFiled: "2020-01-10",
      datePublished: "2021-11-24",
      earliestPriorityDate: "2019-01-11",
      dateGranted: "2023-11-08",
      citedWork: ["WO2015024098A1"]
    },
    {
      applicationNumber: "EP4015521B1",
      owners: ["ModernaTX, Inc."],
      applicants: ["ModernaTX, Inc."],
      inventors: ["Carfi, Andrea", "Stewart-Jones, Guillaume"],
      title: "Betacoronavirus mRNA Vaccines",
      abstract: "Vaccines comprising mRNA encoding a SARS-CoV-2 spike protein or fragment thereof, formulated in lipid nanoparticles.",
      claim: "1. A vaccine composition comprising an mRNA encoding a SARS-CoV-2 spike protein, wherein the mRNA is encapsulated in a lipid nanoparticle.",
      description: "The present disclosure relates to vaccines for preventing or treating COVID-19...",
      status: "Granted",
      family: "98765432",
      familyJurisdictions: ["EP", "US", "JP", "CN"],
      dateFiled: "2020-08-05",
      datePublished: "2022-06-22",
      earliestPriorityDate: "2020-01-28",
      dateGranted: "2024-03-01",
      citedWork: ["WO2017070626A1"]
    },
    {
      applicationNumber: "EP3658172B1",
      owners: ["ModernaTX, Inc."],
      applicants: ["ModernaTX, Inc."],
      inventors: ["Chakraborty, Tirtha", "Anton, Christopher"],
      title: "Engineered Polynucleotides For Enhanced Protein Expression",
      abstract: "Engineered polynucleotides comprising optimized untranslated regions (UTRs) for enhanced translation and stability in mammalian cells.",
      claim: "1. An engineered polynucleotide comprising a 5' UTR, an open reading frame, and a 3' UTR, wherein the 3' UTR comprises the sequence of SEQ ID NO: 1.",
      description: "The invention provides methods and compositions for enhancing the expression of therapeutic proteins...",
      status: "Granted",
      family: "54321098",
      familyJurisdictions: ["EP", "US"],
      dateFiled: "2018-05-12",
      datePublished: "2020-06-03",
      earliestPriorityDate: "2017-05-13",
      dateGranted: "2022-09-14",
      citedWork: ["US8278036B2"]
    }
  ];
};
