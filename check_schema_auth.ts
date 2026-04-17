import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
dotenv.config();

let bigqueryOptions: any = {};
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    bigqueryOptions.credentials = {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    };
    bigqueryOptions.projectId = credentials.project_id;
  } catch (e) {
    console.error("Failed to parse GOOGLE_CREDENTIALS_JSON");
  }
}

const bigquery = new BigQuery(bigqueryOptions);

async function run() {
  try {
    const [metadata] = await bigquery.dataset('bioport_patents').table('google_patents_optimized').getMetadata();
    console.log(JSON.stringify(metadata.schema.fields.map((f: any) => ({name: f.name, type: f.type})), null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
