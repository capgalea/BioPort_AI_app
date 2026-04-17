import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');
  const bq = new BigQuery({ credentials, projectId: credentials.project_id });
  try {
    const [metadata] = await bq.dataset('google_patents_research', { projectId: 'patents-public-data' }).table('publications').getMetadata();
    console.log("Research Table Partitioning:", metadata.timePartitioning);
    console.log("Research Table Clustering:", metadata.clustering);
  } catch (e) {
    console.error(e);
  }
}
run();
