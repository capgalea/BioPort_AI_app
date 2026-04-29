// src/services/usptoService.ts

import { Patent } from '../types';

export interface USPTOSearchParams {
  query?: string;       // free-text / Boolean search string
  inventors?: string[]; // maps to inventorName filter
  assignees?: string[]; // maps to assigneeName filter
  countries?: string[]; // maps to firstInventorCountryCode filter
  patentType?: string;  // maps to applicationType filter
  status?: string;      // maps to applicationStatusDescriptionText filter
  dateFrom?: string;    // ISO date — filingDate range start
  dateTo?: string;      // ISO date — filingDate range end
  keywords?: string[];  // searched across patentTitle
  limit?: number;       // default 25, max 100
  offset?: number;      // pagination offset, default 0
}

export const searchPatents = async (params: USPTOSearchParams): Promise<{ patents: Patent[], total: number }> => {
  const filters: any[] = [];
  const rangeFilters: any[] = [];

  const qParts: string[] = [];

  // We remove the crude term text-search for dates because it breaks the queries.
  // USPTO Open Data API Solr doesn't easily support date range without the exact field name and format,
  // and searching text for "(2010 OR 2026)" filters out almost all valid patents.
  // We will let the front-end or BigQuery handle date filtering natively if possible, or omit it from text Q.
  if (params.dateFrom || params.dateTo) {
     // Intentionally blank - we skip passing this to USPTO textual Q
  }

  let q = params.query || '';
  if (q) qParts.push(`(${q})`);

  if (params.inventors && params.inventors.length > 0) {
    qParts.push(`(${params.inventors.join(' OR ')})`);
  }
  if (params.assignees && params.assignees.length > 0) {
    qParts.push(`(${params.assignees.join(' OR ')})`);
  }
  if (params.status && params.status !== 'All') {
    qParts.push(`(${params.status})`);
  }
  if (params.patentType && params.patentType !== 'All') {
    qParts.push(`(${params.patentType})`);
  }
  if (params.countries && params.countries.length > 0) {
    qParts.push(`(${params.countries.join(' OR ')})`);
  }

  const finalQ = qParts.length > 0 ? qParts.join(' AND ') : undefined;
  const targetLimit = params.limit || 25;
  const chunkSize = 25; // Keep payload small to avoid 413 errors
  let allPatents: Patent[] = [];
  let totalCount = 0;
  
  // We'll fetch in chunks until we hit the target limit or run out of results
  // For 'ALL' we might receive a massive targetLimit (e.g., 10000). We cap it at 200 to prevent long hangs or rate limits.
  const maxLimit = Math.min(targetLimit, 200);

  for (let offset = params.offset || 0; offset < (params.offset || 0) + maxLimit; offset += chunkSize) {
    const fetchLimit = Math.min(chunkSize, (params.offset || 0) + maxLimit - offset);
    
    const bodyToSend: any = {
      q: finalQ || '*:*',
      pagination: { offset: offset, limit: fetchLimit }
    };

    console.log("USPTO search:", bodyToSend);

    const response = await fetch('/api/uspto/applications/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyToSend)
    });

    if (response.status === 404 || response.status === 400) {
      // No more results or bad request (maybe offset too high)
      break;
    }

    if (!response.ok) {
      if (allPatents.length > 0) break; // If we got some data, just return it
      throw new Error(`USPTO API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    totalCount = data.count || 0;
    
    if (!data || !data.patentFileWrapperDataBag || data.patentFileWrapperDataBag.length === 0) {
      break;
    }

    const mappedChunk: Patent[] = await Promise.all(data.patentFileWrapperDataBag.map(async (r: any) => {
      const meta = r.applicationMetaData || {};
      let familyId = '';
      const continuity = [...(r.childContinuityBag || []), ...(r.parentContinuityBag || [])];
      if (continuity.length > 0) {
        const familyMembers = continuity.map((c: any) => c.childApplicationNumberText || c.parentApplicationNumberText).filter(Boolean);
        familyId = [...new Set(familyMembers)].join(', ');
      }

      let abstract = 'Not available via USPTO metadata API';
      const xmlUrl = r.grantDocumentMetaData?.fileLocationURI || r.pgpubDocumentMetaData?.fileLocationURI;
      if (xmlUrl) {
        try {
          const absResponse = await fetch(`/api/uspto/abstract?url=${encodeURIComponent(xmlUrl)}`);
          if (absResponse.ok) {
            const absData = await absResponse.json();
            if (absData.abstract) {
              abstract = absData.abstract;
            }
          }
        } catch (err) { }
      }

      let inventorsList: string[] = [];
      if (meta.inventorBag && Array.isArray(meta.inventorBag)) {
        inventorsList = meta.inventorBag.map((inv: any) => inv.inventorNameText || `${inv.firstName || ''} ${inv.lastName || ''}`.trim()).filter(Boolean);
      } else if (meta.firstInventorName) {
        inventorsList = [meta.firstInventorName];
      }

      let applicantsList: string[] = [];
      if (meta.applicantBag && Array.isArray(meta.applicantBag)) {
         applicantsList = meta.applicantBag.map((app: any) => app.applicantNameText).filter(Boolean);
      } else if (meta.firstApplicantName) {
         applicantsList = [meta.firstApplicantName];
      }

      return {
      applicationNumber    : r.applicationNumberText      ?? '',
      owners               : applicantsList,
      applicants           : applicantsList,
      inventors            : inventorsList,
      title                : meta.inventionTitle                ?? '',
      abstract             : abstract,
      claim                : '',
      description          : '',
      status               : meta.applicationStatusDescriptionText ?? '',
      family               : familyId,
      familyJurisdictions  : ['US'],
      dateFiled            : meta.filingDate                 ?? '',
      datePublished        : meta.earliestPublicationDate          ?? '',
      earliestPriorityDate : meta.effectiveFilingDate                 ?? '',
      dateGranted          : meta.grantDate                  ?? '',
      citedWork            : [],
      url                  : `https://patentcenter.uspto.gov/applications/${r.applicationNumberText ?? ''}`,
      source               : 'USPTO',
      country              : 'US',
      actualApplicationNumber : meta.patentNumber || meta.earliestPublicationNumber || '',
      patentType           : meta.applicationTypeLabelName            ?? '',
      patentKind           : meta.applicationTypeCode            ?? '',
    }}));

    allPatents = allPatents.concat(mappedChunk);
    
    // Stop if we got fewer results than chunk size, natural end of results
    if (data.patentFileWrapperDataBag.length < fetchLimit) {
      break;
    }
  }

  return { patents: allPatents, total: totalCount };
};

const getMethod = async (url: string) => {
  const response = await fetch(url);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    console.error(`USPTO API error: ${response.status} ${response.statusText}`);
    return null;
  }
  return response.json();
};

export const getApplicationData = (appNum: string): Promise<any> => {
  return getMethod(`/api/uspto/applications/${encodeURIComponent(appNum)}/meta-data`);
};

export const getContinuityData = (appNum: string): Promise<any> => {
  return getMethod(`/api/uspto/applications/${encodeURIComponent(appNum)}/continuity`);
};

export const getDocuments = (appNum: string): Promise<any> => {
  return getMethod(`/api/uspto/applications/${encodeURIComponent(appNum)}/documents`);
};

export const getAssignments = (appNum: string): Promise<any> => {
  return getMethod(`/api/uspto/applications/${encodeURIComponent(appNum)}/assignment`);
};

export const getForeignPriority = (appNum: string): Promise<any> => {
  return getMethod(`/api/uspto/applications/${encodeURIComponent(appNum)}/foreign-priority`);
};

export const getTransactions = (appNum: string): Promise<any> => {
  return getMethod(`/api/uspto/applications/${encodeURIComponent(appNum)}/transactions`);
};

export const getAssociatedDocuments = (appNum: string): Promise<any> => {
  return getMethod(`/api/uspto/applications/${encodeURIComponent(appNum)}/associated-documents`);
};

export const getTermAdjustment = (appNum: string): Promise<any> => {
  return getMethod(`/api/uspto/applications/${encodeURIComponent(appNum)}/adjustment`);
};
