import axios from 'axios';

async function test() {
  const clientId = process.env.IP_AUSTRALIA_CLIENT_ID;
  const clientSecret = process.env.IP_AUSTRALIA_CLIENT_SECRET;
  const tokenUrl = 'https://production.api.ipaustralia.gov.au/public/external-token-api/v1/access_token';
  const searchUrl = 'https://production.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search/quick';

  try {
    const tokenRes = await axios.post(tokenUrl, `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const token = tokenRes.data.access_token;
    console.log('Got token');

    const bodies = [
      { "query": "CRISPR", "searchType": "DETAILS" },
      { "query": "CRISPR", "searchType": "ID" }
    ];

    for (const body of bodies) {
      console.log(`\nTesting body:`, body);
      try {
        const res = await axios.post(searchUrl, body, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('SUCCESS!');
        console.log(res.data);
        return;
      } catch (e: any) {
        console.log('FAILED:', e.response?.status, e.response?.data || e.message);
      }
    }
  } catch (e: any) {
    console.log('Token failed:', e.message);
  }
}

test();
