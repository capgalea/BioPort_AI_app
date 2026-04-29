
import { Patent } from '../types.ts';
import { fetchPatentsFromIPAustralia } from './ipAustraliaService.ts';
import { searchPatents as searchUSPTOPatents } from './usptoService.ts';

export interface PatentFilters {
  inventor?: string;
  inventorFirstName?: string;
  applicant?: string;
  startDate?: string;
  endDate?: string;
  countries?: string[];
  status?: string;
  patentType?: string;
}

export interface BigQueryStats {
  totalBytesProcessed: number;
  estimatedCostUSD: string;
  cacheHit: boolean;
  dryRun?: boolean;
}

export interface PatentResults {
  results: Patent[];
  statistics?: BigQueryStats;
}

/**
 * PatentService handles fetching and processing patent data.
 * Integrates with IP Australia APIs and Google Patents.
 */
function deduplicatePatents(patents: Patent[]): Patent[] {
  const seenFamily = new Set<string>();
  const seenTitle = new Set<string>();
  const seenAppNum = new Set<string>();

  return patents.filter(p => {
    const family = (p.familyId || p.family || '').toString().trim();
    
    // Normalize title to ignore case and non-alphanumeric characters or small stopwords
    // e.g. "Identifying compounds modifying" vs "Identification of compounds that modify"
    // is a bit trickier, but removing spaces and non-alphanumeric helps for exact matches.
    const rawTitle = p.title || '';
    const titleKey = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const appNumKey = (p.actualApplicationNumber || p.applicationNumber || '').trim().toLowerCase();

    // If family is present and already seen, it's a duplicate
    if (family && seenFamily.has(family)) {
      return false;
    }
    
    // If title key is already seen (and not empty), it's a duplicate
    if (titleKey && seenTitle.has(titleKey)) {
      return false;
    }

    // If app number is already seen (and not empty), it's a duplicate
    if (appNumKey && seenAppNum.has(appNumKey)) {
      return false;
    }

    if (family) seenFamily.add(family);
    if (titleKey) seenTitle.add(titleKey);
    if (appNumKey) seenAppNum.add(appNumKey);
    
    return true;
  });
}

class PatentService {
  /**
   * Fetches patents for a specific company or topic.
   */
  async getPatents(
    query: string, 
    filters?: PatentFilters, 
    limit?: number, 
    source: 'ipAustralia' | 'googlePatents' | 'bigquery' | 'uspto' = 'googlePatents'
  ): Promise<Patent[]> {
    const result = await this.getPatentsWithStats(query, filters, limit, source, false);
    return (result as PatentResults).results;
  }

  /**
   * Fetches patents with additional statistics and dryRun support.
   */
  async getPatentsWithStats(
    query: string, 
    filters?: PatentFilters, 
    limit?: number, 
    source: 'ipAustralia' | 'googlePatents' | 'bigquery' | 'uspto' = 'googlePatents',
    dryRun: boolean = false
  ): Promise<Patent[] | PatentResults> {
    console.log(`Fetching patents for: ${query} from ${source}${dryRun ? ' (Dry Run)' : ''}`);
    try {
      if (source === 'uspto') {
        const usptoRes = await searchUSPTOPatents({
          query,
          inventors: filters?.inventor ? [filters.inventor] : undefined,
          assignees: filters?.applicant ? [filters.applicant] : undefined,
          status: filters?.status,
          dateFrom: filters?.startDate,
          dateTo: filters?.endDate,
          countries: filters?.countries,
          limit: limit
        });
        return { results: deduplicatePatents(usptoRes.patents) };
      } else if (source === 'ipAustralia') {
        const results = await fetchPatentsFromIPAustralia(query, filters, limit);
        return { results: deduplicatePatents(results) };
      } else if (source === 'googlePatents') {
        const response = await fetch('/api/patents/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, filters, source: 'google', limit })
        });
        if (!response.ok) {
          throw new Error('Failed to fetch from Google Patents proxy');
        }
        const results = await response.json();
        return { results: deduplicatePatents(results.results || results) };
      } else if (source === 'bigquery') {
        const response = await fetch('/api/bigquery/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query, 
            applicant: filters?.applicant, 
            inventor: filters?.inventor, 
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            countries: filters?.countries,
            status: filters?.status,
            limit,
            dryRun
          })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch from BigQuery');
        }
        const data = await response.json();
        console.log(`BigQuery search results: ${data.results ? data.results.length : 0} results found`);
        
        if (dryRun) {
          return {
            results: [],
            statistics: {
              totalBytesProcessed: data.totalBytesProcessed,
              estimatedCostUSD: data.estimatedCostUSD,
              cacheHit: data.cacheHit,
              dryRun: true
            }
          };
        }

        return {
          results: deduplicatePatents(data.results || []),
          statistics: data.statistics ? {
            totalBytesProcessed: Number(data.statistics.totalBytesProcessed),
            cacheHit: data.statistics.cacheHit,
            estimatedCostUSD: ((Number(data.statistics.totalBytesProcessed) / (1024 ** 4)) * 5).toFixed(4)
          } : undefined
        };
      }
      throw new Error(`Unsupported source: ${source}`);
    } catch (error: any) {
      console.error("PatentService Error:", error);
      throw error;
    }
  }

  /**
   * Analyzes patent landscape for a technology sector.
   */
  async analyzeLandscape(sector: string): Promise<string> {
    return `The patent landscape for ${sector} is characterized by high activity in mRNA delivery and targeted protein degradation. Major players include established biopharma and emerging biotech startups.`;
  }
}

export const patentService = new PatentService();
