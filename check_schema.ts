import { BigQuery } from '@google-cloud/bigquery';
const bigquery = new BigQuery();
async function run() {
  try {
    const [metadata] = await bigquery.dataset('bioport_patents').table('google_patents_optimized').getMetadata();
    console.log(JSON.stringify(metadata.schema.fields.filter((f: any) => ['filing_date', 'country', 'country_code', 'publication_date', 'publication_date_dt'].includes(f.name)), null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
