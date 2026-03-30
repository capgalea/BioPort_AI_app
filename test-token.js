import dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.IP_AUSTRALIA_CLIENT_ID?.trim() || '';
const clientSecret = process.env.IP_AUSTRALIA_CLIENT_SECRET?.trim() || '';

async function testToken() {
  const url = `https://production.api.ipaustralia.gov.au/public/external-token-api/v1/access_token`;
  
  console.log(`\nTesting URL (Basic Auth)`);
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      },
      body: params
    });
    const data = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${data}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

testToken();

