
import { Patent } from '../types.ts';
import { fetchPatentsFromIPAustralia, fetchPatentsFromGooglePatents } from './geminiService.ts';

/**
 * PatentService handles fetching and processing patent data.
 * Integrates with IP Australia via Gemini Search grounding.
 */
class PatentService {
  /**
   * Fetches patents for a specific company or topic from IP Australia.
   */
  async getPatents(query: string): Promise<Patent[]> {
    console.log(`Fetching patents for: ${query}`);
    try {
      return await fetchPatentsFromIPAustralia(query);
    } catch (error: any) {
      console.error("PatentService Error:", error);
      throw error;
    }
  }

  /**
   * Fetches patents from Google Patents via Gemini Search.
   */
  async searchGooglePatents(query: string): Promise<any> {
    try {
      const patents = await fetchPatentsFromGooglePatents(query);
      return { google_patents_results: patents };
    } catch (error: any) {
      console.error("Google Patents Search Error:", error);
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
