import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');
  const bq = new BigQuery({ credentials, projectId: credentials.project_id });
  
  const query = `
    SELECT 
      COUNT(*) as total,
      COUNTIF(r.title IS NULL) as missing_title,
      COUNTIF(r.abstract IS NULL) as missing_abstract
    FROM \`patents-public-data.google_patents_research.publications\` r
  `;

  try {
    const [rows] = await bq.query(query);
    console.log(rows[0]);
  } catch (e) {
    console.error(e);
  }
}
run();
