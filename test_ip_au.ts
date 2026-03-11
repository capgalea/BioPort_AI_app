import axios from 'axios';

async function test() {
  try {
    const tokenResponse = await axios.post(
      'https://test.api.ipaustralia.gov.au/public/external-token-api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.IP_AUSTRALIA_CLIENT_ID}:${process.env.IP_AUSTRALIA_CLIENT_SECRET}`).toString('base64')}`
        }
      }
    );
    const token = tokenResponse.data.access_token;
    console.log("Token:", token.substring(0, 10) + "...");

    const response = await axios.post(
      'https://test.api.ipaustralia.gov.au/public/australian-patent-search-api/v1/search/quick',
      {
        "query": "biotech"
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(response.data);
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}

test();