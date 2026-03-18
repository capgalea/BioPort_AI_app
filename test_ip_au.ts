import axios from 'axios';

async function test() {
  const clientId = 'fpqOC1vyzVb7LCX89VTEAl1zzhjZE63Q';
  const clientSecret = 'n9LmCJ3KpHuLvU6yfPQYRbTBm4G4A46hMedKke8BiNwjLgeNapkA4BjIqSplZkZm';
  const url = 'https://test.api.ipaustralia.gov.au/public/external-token-api/v1/access_token';

  const combinations = [
    {
      name: 'grant_type=client_credentials, body credentials, string body',
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    },
    {
      name: 'grant_type=client_credentials, basic auth, string body',
      body: `grant_type=client_credentials`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` }
    },
    {
      name: 'grant_type=client_credentials, body credentials, scope=read',
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=read`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    },
    {
      name: 'grant_type=client_credentials, basic auth, scope=read',
      body: `grant_type=client_credentials&scope=read`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` }
    }
  ];

  for (const combo of combinations) {
    console.log(`\nTesting: ${combo.name}`);
    try {
      const res = await axios.post(url, combo.body, { headers: combo.headers });
      console.log('SUCCESS!');
      console.log(res.data);
      return;
    } catch (e: any) {
      console.log('FAILED:', e.response?.status, e.response?.data || e.message);
    }
  }
}

test();