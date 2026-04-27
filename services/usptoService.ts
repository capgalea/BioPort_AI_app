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

  if (params.inventors && params.inventors.length > 0) {
    filters.push({ name: 'inventorName', value: params.inventors });
  }
  if (params.assignees && params.assignees.length > 0) {
    filters.push({ name: 'assigneeName', value: params.assignees });
  }
  if (params.countries && params.countries.length > 0) {
    filters.push({ name: 'firstInventorCountryCode', value: params.countries });
  }
  if (params.patentType) {
    filters.push({ name: 'applicationType', value: [params.patentType] });
  }
  if (params.status) {
    filters.push({ name: 'applicationStatusDescriptionText', value: [params.status] });
  }

  if (params.dateFrom || params.dateTo) {
    rangeFilters.push({
      field: 'filingDate',
      valueFrom: params.dateFrom ?? '2001-01-01',
      valueTo: params.dateTo ?? new Date().toISOString().slice(0, 10)
    });
  }

  let q = params.query || '';
  const qParts: string[] = [];
  if (q) qParts.push(`(${q})`);

  if (params.inventors && params.inventors.length > 0) {
    qParts.push(`(${params.inventors.join(' OR ')})`);
  }
  if (params.assignees && params.assignees.length > 0) {
    qParts.push(`(${params.assignees.join(' OR ')})`);
  }
  if (params.status) {
    qParts.push(`(${params.status})`);
  }

  const finalQ = qParts.length > 0 ? qParts.join(' AND ') : undefined;

  const bodyToSend = {
    q: finalQ
  };
  console.log("USPTO search:", bodyToSend, params);

  const response = await fetch('/api/uspto/applications/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyToSend)
  });

  if (response.status === 404) {
    return { patents: [], total: 0 };
  }

  if (!response.ok) {
    throw new Error(`USPTO API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data || !data.patentFileWrapperDataBag) {
    return { patents: [], total: 0 };
  }

  const mappedPatents: Patent[] = data.patentFileWrapperDataBag.map((r: any) => {
    const meta = r.applicationMetaData || {};
    return {
    applicationNumber    : r.applicationNumberText      ?? '',
    owners               : meta.firstApplicantName ? [meta.firstApplicantName] : [],
    applicants           : meta.firstApplicantName ? [meta.firstApplicantName] : [],
    inventors            : meta.firstInventorName ? [meta.firstInventorName] : [],
    title                : meta.inventionTitle                ?? '',
    abstract             : '',
    claim                : '',
    description          : '',
    status               : meta.applicationStatusDescriptionText ?? '',
    family               : '',
    familyJurisdictions  : ['US'],
    dateFiled            : meta.filingDate                 ?? '',
    datePublished        : meta.earliestPublicationDate          ?? '',
    earliestPriorityDate : meta.effectiveFilingDate                 ?? '',
    dateGranted          : meta.grantDate                  ?? '',
    citedWork            : [],
    url                  : `https://patentcenter.uspto.gov/applications/${r.applicationNumberText ?? ''}`,
    source               : 'USPTO',
    country              : 'US',
    actualApplicationNumber : meta.earliestPublicationNumber            ?? '',
    patentType           : meta.applicationTypeLabelName            ?? '',
    patentKind           : '',
  }});

  return { patents: mappedPatents, total: data.count || 0 };
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
