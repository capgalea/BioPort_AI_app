
import { Patent } from '../types.ts';
import { fetchPatentsFromPatentsView } from './patentsViewService.ts';
import { fetchPatentsFromIPAustralia } from './ipAustraliaService.ts';

export interface PatentFilters {
  inventor?: string;
  inventorFirstName?: string;
  applicant?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * PatentService handles fetching and processing patent data.
 * Integrates with PatentView and IP Australia APIs.
 */
class PatentService {
  /**
   * Fetches patents for a specific company or topic.
   */
  async getPatents(query: string, filters?: PatentFilters, limit?: number, source: 'patentsView' | 'ipAustralia' = 'patentsView'): Promise<Patent[]> {
    console.log(`Fetching patents for: ${query} from ${source}`);
    try {
      if (source === 'ipAustralia') {
        return await fetchPatentsFromIPAustralia(query, filters, limit);
      }
      return await fetchPatentsFromPatentsView(query, filters, limit);
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
