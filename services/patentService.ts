
import { Patent } from '../types.ts';
import { fetchPatentsFromPatentsView } from './patentsViewService.ts';

export interface PatentFilters {
  inventor?: string;
  inventorFirstName?: string;
  applicant?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * PatentService handles fetching and processing patent data.
 * Integrates with PatentView API.
 */
class PatentService {
  /**
   * Fetches patents for a specific company or topic from PatentView.
   */
  async getPatents(query: string, filters?: PatentFilters, limit?: number): Promise<Patent[]> {
    console.log(`Fetching patents for: ${query}`);
    try {
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
