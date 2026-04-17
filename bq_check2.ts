import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}');
  const bq = new BigQuery({ credentials, projectId: credentials.project_id });
  try {
    const [tables] = await bq.dataset('patents', { projectId: 'patents-public-data' }).getTables();
    for (const table of tables) {
      const [metadata] = await table.getMetadata();
      if (metadata.timePartitioning || metadata.clustering) {
        console.log(`Table: ${table.id}`);
        console.log("  Partitioning:", metadata.timePartitioning);
        console.log("  Clustering:", metadata.clustering);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
