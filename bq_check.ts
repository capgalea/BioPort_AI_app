import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');
  const bq = new BigQuery({ credentials, projectId: credentials.project_id });
  try {
    const [metadata] = await bq.dataset('patents', { projectId: 'patents-public-data' }).table('publications').getMetadata();
    console.log("Partitioning:", metadata.timePartitioning);
    console.log("Clustering:", metadata.clustering);
  } catch (e) {
    console.error(e);
  }
}
run();
