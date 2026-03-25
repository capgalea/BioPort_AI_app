export interface Patent {
  id: string;
  title: string;
  abstract: string;
  claims: string[];
  inventors: string[];
  assignees: string[];
  filingDate: string;
  jurisdiction: string;
  source: string;
  familyId?: string;
  link?: string;
  pdfUrl?: string;
}
