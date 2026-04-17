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
    const [rows] = await bigquery.query({
      query: 'SELECT owners_and_applicants, inventors, inventor_countries FROM `bioport-ai-app.bioport_patents.google_patents_optimized` LIMIT 5'
    });
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
