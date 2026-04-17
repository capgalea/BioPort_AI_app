import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');
  const bq = new BigQuery({ credentials, projectId: credentials.project_id });
  
  const queryWithLocalized = `
    SELECT p.application_number
    FROM \`patents-public-data.patents.publications\` p
    LEFT JOIN \`patents-public-data.google_patents_research.publications\` r
      ON p.publication_number = r.publication_number
    WHERE SEARCH(r.title, 'cancer') OR SEARCH(r.abstract, 'cancer') OR SEARCH(p.title_localized, 'cancer') OR SEARCH(p.abstract_localized, 'cancer')
    LIMIT 10
  `;
  
  const queryWithoutLocalized = `
    SELECT p.application_number
    FROM \`patents-public-data.patents.publications\` p
    LEFT JOIN \`patents-public-data.google_patents_research.publications\` r
      ON p.publication_number = r.publication_number
    WHERE SEARCH(r.title, 'cancer') OR SEARCH(r.abstract, 'cancer')
    LIMIT 10
  `;

  try {
    const [job1] = await bq.createQueryJob({ query: queryWithLocalized, dryRun: true });
    console.log("Search With Localized MB:", parseInt(job1.metadata.statistics.totalBytesProcessed) / (1024*1024));
    
    const [job2] = await bq.createQueryJob({ query: queryWithoutLocalized, dryRun: true });
    console.log("Search Without Localized MB:", parseInt(job2.metadata.statistics.totalBytesProcessed) / (1024*1024));
  } catch (e) {
    console.error(e);
  }
}
run();
