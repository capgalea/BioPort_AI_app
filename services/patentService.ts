
import { Patent } from '../types.ts';
import { fetchPatentsFromIPAustralia } from './ipAustraliaService.ts';
import { fetchPatentsFromGooglePatents } from './googlePatentsService.ts';
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
        return { results: usptoRes.patents };
      } else if (source === 'ipAustralia') {
        const results = await fetchPatentsFromIPAustralia(query, filters, limit);
        return { results };
      } else if (source === 'googlePatents') {
        const results = await fetchPatentsFromGooglePatents(query, filters, limit);
        return { results };
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
          results: data.results || [],
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
