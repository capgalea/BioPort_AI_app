import axios from 'axios';

async function test() {
  const clientId = 'fpqOC1vyzVb7LCX89VTEAl1zzhjZE63Q';
  const clientSecret = 'n9LmCJ3KpHuLvU6yfPQYRbTBm4G4A46hMedKke8BiNwjLgeNapkA4BjIqSplZkZm';
  const tokenUrl = 'https://test.api.ipaustralia.gov.au/public/external-token-api/v1/access_token';
  const searchUrl = 'https://test.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search/quick';

  try {
    const tokenRes = await axios.post(tokenUrl, `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const token = tokenRes.data.access_token;
    console.log('Got token');

    const bodies = [
      { "query": "CRISPR", "filters": {} },
      { "query": "CRISPR", "sort": { "field": "NUMBER", "direction": "ASCENDING" } },
      { "query": "CRISPR", "filters": { "status": ["REGISTERED"] } },
      { "query": "CRISPR", "filters": { "quickSearchType": ["WORD"] } },
      { "searchText": "CRISPR", "filters": {} },
      { "keyword": "CRISPR", "filters": {} },
      { "query": "CRISPR", "changedSinceDate": "2019-01-15" }
    ];

    console.log('\nTesting GET:');
    try {
      const res = await axios.get(`${searchUrl}?query=CRISPR`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('SUCCESS GET!');
      console.log(Object.keys(res.data));
      return;
    } catch (e: any) {
      console.log('FAILED GET:', e.response?.status, e.response?.data || e.message);
    }
    
    console.log('\nTesting URL Encoded:');
    try {
      const res = await axios.post(searchUrl, 'query=CRISPR', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log('SUCCESS URL ENCODED!');
      console.log(Object.keys(res.data));
      return;
    } catch (e: any) {
      console.log('FAILED URL ENCODED:', e.response?.status, e.response?.data || e.message);
    }

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
        console.log(Object.keys(res.data));
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
